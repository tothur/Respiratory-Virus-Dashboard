"""Monitor NNGYK respiratory bulletin pages for new PDF posts.

This utility fetches the Légúti Figyelőszolgálat adatai listings, reports
PDF links that were not present in the previous run, and can download any
newly discovered PDFs into a local folder. Use `--interval-minutes`
for continuous polling (default: 120 minutes) or `--once` for a single check.
"""
from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, List, Set
from urllib.error import URLError, HTTPError
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import Request, urlopen

CURRENT_SEASON_URL = (
    "https://nnk.gov.hu/index.php/leguti-figyeloszolgalat-2/"
    "category/420-leguti-figyeloszolgalat-adatai-2025-2026-evi-szezon.html"
)
HISTORICAL_SEASON_URLS = (
    "https://nnk.gov.hu/index.php/leguti-figyeloszolgalat-2/"
    "category/390-leguti-figyeloszolgalat-adatai-2024-2025-evi-szezon.html",
)

# Fetch links from all configured season pages by default.
CATEGORY_URLS = (CURRENT_SEASON_URL, *HISTORICAL_SEASON_URLS)

# Backwards compatible alias used by older callers / log messages.
CATEGORY_URL = CURRENT_SEASON_URL
USER_AGENT = "NNGYK-PDF-Monitor/1.0 (contact: dashboard script)"
DEFAULT_INTERVAL_MINUTES = 120


def _build_ssl_context() -> ssl.SSLContext:
    disable_verify = os.getenv("NNGYK_SSL_NO_VERIFY", "").lower() in {"1", "true", "yes"}
    if disable_verify:
        return ssl._create_unverified_context()
    try:
        import certifi
    except Exception:  # noqa: BLE001
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


class _PdfLinkParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.pdf_links: Set[str] = set()
        self.all_links: Set[str] = set()

    def handle_starttag(self, tag: str, attrs: List[tuple[str, str]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if not href:
            return
        absolute = urljoin(self.base_url, href)
        self.all_links.add(absolute)
        href_lower = href.lower()
        if ".pdf" in href_lower:
            self.pdf_links.add(absolute)


def fetch_pdf_links(urls: str | Iterable[str] = CATEGORY_URLS, timeout: int = 20) -> List[str]:
    """Return all absolute PDF URLs from one or more category pages."""
    url_list = [urls] if isinstance(urls, str) else list(urls)
    all_candidates: Set[str] = set()
    errors: List[tuple[str, Exception]] = []
    context = _build_ssl_context()

    for url in url_list:
        parser = _PdfLinkParser(url)

        req = Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urlopen(req, timeout=timeout, context=context) as resp:
                content_type = resp.headers.get_content_charset() or "utf-8"
                html = resp.read().decode(content_type, errors="replace")
        except (HTTPError, URLError) as exc:
            errors.append((url, exc))
            print(f"[warn] Failed to fetch {url}: {exc}", file=sys.stderr)
            continue
        parser.feed(html)

        # Some NNGYK season pages link to intermediate download handlers without a
        # .pdf extension (e.g., "download=1234:filename"). Consider those URLs
        # PDF downloads too so the monitor can pick them up instead of returning
        # an empty set.
        if parser.pdf_links:
            candidates = set(parser.pdf_links)
        else:
            candidates = {
                link
                for link in parser.all_links
                if "download=" in link.lower() or "format=pdf" in link.lower()
            }

        all_candidates.update(candidates)

    if not all_candidates and errors:
        print("[warn] No PDF links fetched from any NNGYK season page.", file=sys.stderr)

    return sorted(all_candidates)


@dataclass
class MonitorState:
    seen_urls: Set[str] = field(default_factory=set)
    last_checked: str | None = None

    @classmethod
    def load(cls, path: Path) -> "MonitorState":
        if not path.exists():
            return cls()
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(set(data.get("seen_urls", [])), data.get("last_checked"))

    def save(self, path: Path) -> None:
        payload = {
            "seen_urls": sorted(self.seen_urls),
            "last_checked": self.last_checked,
        }
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


@dataclass
class MonitorResult:
    new_urls: List[str]
    all_urls: List[str]
    timestamp: datetime
    downloaded_files: List[Path]


def _download_pdf(url: str, directory: Path, timeout: int = 30) -> Path:
    """Download a PDF to the target directory and return the saved path."""
    directory.mkdir(parents=True, exist_ok=True)
    parsed = urlparse(url)
    context = _build_ssl_context()

    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=timeout, context=context) as resp:
        content_type = (resp.headers.get("Content-Type") or "").lower()
        disposition = resp.headers.get("Content-Disposition", "")
        body = resp.read()

    def _filename_from_disposition(header: str) -> str | None:
        if not header:
            return None
        parts = [part.strip() for part in header.split(";")]
        for part in parts:
            if part.lower().startswith("filename*="):
                _, _, value = part.partition("=")
                return Path(value.strip('"')).name
            if part.lower().startswith("filename="):
                _, _, value = part.partition("=")
                return Path(value.strip('"')).name
        return None

    filename = _filename_from_disposition(disposition)
    if not filename:
        query = parse_qs(parsed.query).get("download", [])
        if query:
            candidate = query[0].split(":", 1)[-1]
            filename = f"{Path(candidate).stem}.pdf"
        else:
            filename = Path(parsed.path).name or "nngyk.pdf"
            if not filename.lower().endswith(".pdf") and "pdf" in content_type:
                filename = f"{Path(filename).stem or 'nngyk'}.pdf"

    destination = directory / filename
    if destination.exists():
        stem = destination.stem
        destination = destination.with_name(f"{stem}-{int(time.time())}{destination.suffix}")

    if "pdf" not in content_type and not body.startswith(b"%PDF"):
        raise ValueError(f"Unexpected content type for {url}: {content_type or 'unknown'}")

    destination.write_bytes(body)
    return destination


def check_once(state_path: Path, download_dir: Path | None = None) -> MonitorResult:
    state = MonitorState.load(state_path)
    timestamp = datetime.now(timezone.utc)
    all_urls = fetch_pdf_links()
    new_urls = [url for url in all_urls if url not in state.seen_urls]
    downloaded: List[Path] = []

    if download_dir and new_urls:
        for url in new_urls:
            try:
                downloaded.append(_download_pdf(url, download_dir))
            except Exception as exc:  # noqa: BLE001
                print(f"Failed to download {url}: {exc}", file=sys.stderr)

    state.seen_urls.update(all_urls)
    state.last_checked = timestamp.isoformat()
    state.save(state_path)
    return MonitorResult(new_urls=new_urls, all_urls=all_urls, timestamp=timestamp, downloaded_files=downloaded)


def print_report(result: MonitorResult) -> None:
    dt = result.timestamp.astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    header = f"Checked NNGYK season pages at {dt}"
    print(header)
    print("-" * len(header))
    for url in CATEGORY_URLS:
        print(f"- {url}")
    if result.new_urls:
        print("New PDF links detected:")
        for url in result.new_urls:
            print(f"- {url}")
    else:
        print("No new PDF links since the previous check.")
    print(f"Total PDF links found this run: {len(result.all_urls)}")
    if result.downloaded_files:
        print("Downloaded:")
        for path in result.downloaded_files:
            print(f"- {path}")


def monitor_loop(state_path: Path, interval_minutes: int, download_dir: Path | None) -> None:
    while True:
        try:
            result = check_once(state_path, download_dir)
            print_report(result)
        except (HTTPError, URLError) as err:
            print(f"Request error: {err}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"Unexpected error: {exc}", file=sys.stderr)
        time.sleep(max(interval_minutes, 1) * 60)


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--state-file",
        type=Path,
        default=Path("nngyk_seen.json"),
        help="Path to persist previously seen PDF URLs (default: ./nngyk_seen.json)",
    )
    parser.add_argument(
        "--interval-minutes",
        type=int,
        default=DEFAULT_INTERVAL_MINUTES,
        help="How often to poll for new PDFs when running continuously (default: 120)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Only perform a single check instead of looping",
    )
    parser.add_argument(
        "--download-dir",
        type=Path,
        default=Path("nngyk_pdfs"),
        help="Folder to store newly detected PDFs (default: ./nngyk_pdfs)",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    if args.once:
        try:
            result = check_once(args.state_file, args.download_dir)
        except (HTTPError, URLError) as err:
            print(f"Request error: {err}", file=sys.stderr)
            return 1
        print_report(result)
        return 0

    print("Starting continuous monitor of NNGYK season pages:")
    for url in CATEGORY_URLS:
        print(f"- {url}")
    print(f"Polling every {args.interval_minutes} minutes.")
    monitor_loop(args.state_file, args.interval_minutes, args.download_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

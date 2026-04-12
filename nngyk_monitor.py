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
import re
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

SEASON_START_WEEK = 40
SEASON_CATEGORY_RE = re.compile(
    r"/leguti-figyeloszolgalat-2/category/\d+-leguti-figyeloszolgalat-adatai-(\d{4})-(\d{4})-evi-szezon\.html$",
    re.IGNORECASE,
)

# Seed pages used to discover the active and previous season pages dynamically.
CURRENT_SEASON_SEED_URL = (
    "https://nnk.gov.hu/index.php/leguti-figyeloszolgalat-2/"
    "category/420-leguti-figyeloszolgalat-adatai-2025-2026-evi-szezon.html"
)
HISTORICAL_SEASON_SEED_URLS = (
    "https://nnk.gov.hu/index.php/leguti-figyeloszolgalat-2/"
    "category/390-leguti-figyeloszolgalat-adatai-2024-2025-evi-szezon.html",
)

# Fetch links from dynamically resolved season pages, starting from these seeds.
CATEGORY_URLS = (CURRENT_SEASON_SEED_URL, *HISTORICAL_SEASON_SEED_URLS)

# Backwards compatible alias used by older callers / log messages.
CATEGORY_URL = CURRENT_SEASON_SEED_URL
USER_AGENT = "NNGYK-PDF-Monitor/1.0 (contact: dashboard script)"
DEFAULT_INTERVAL_MINUTES = 120


_SSL_FALLBACK_WARNED = False


def _build_ssl_context() -> ssl.SSLContext:
    disable_verify = os.getenv("NNGYK_SSL_NO_VERIFY", "").lower() in {"1", "true", "yes"}
    if disable_verify:
        return ssl._create_unverified_context()
    try:
        import certifi
    except Exception:  # noqa: BLE001
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


def _should_retry_ssl(exc: Exception) -> bool:
    reason = getattr(exc, "reason", None)
    if isinstance(reason, ssl.SSLError):
        return True
    return "CERTIFICATE_VERIFY_FAILED" in str(exc)


def _allow_ssl_fallback(url: str) -> bool:
    host = urlparse(url).hostname or ""
    return host.endswith("nnk.gov.hu")


def _open_url(req: Request, timeout: int, context: ssl.SSLContext):
    global _SSL_FALLBACK_WARNED
    try:
        return urlopen(req, timeout=timeout, context=context)
    except URLError as exc:
        if not _should_retry_ssl(exc):
            raise
        if context.verify_mode == ssl.CERT_NONE or not _allow_ssl_fallback(req.full_url):
            raise
        if not _SSL_FALLBACK_WARNED:
            print(
                "[warn] SSL verification failed for nnk.gov.hu; retrying without certificate verification.",
                file=sys.stderr,
            )
            _SSL_FALLBACK_WARNED = True
        return urlopen(req, timeout=timeout, context=ssl._create_unverified_context())


class _PdfLinkParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.pdf_links: Set[str] = set()
        self.all_links: Set[str] = set()
        self.category_links: Set[str] = set()

    def handle_starttag(self, tag: str, attrs: List[tuple[str, str]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if not href:
            return
        absolute = urljoin(self.base_url, href)
        self.all_links.add(absolute)
        category_url = _canonicalize_category_url(absolute)
        if _season_start_year_from_url(category_url) is not None:
            self.category_links.add(category_url)
        href_lower = href.lower()
        if ".pdf" in href_lower:
            self.pdf_links.add(absolute)


def _canonicalize_category_url(url: str) -> str:
    parsed = urlparse(url)
    return parsed._replace(query="", fragment="").geturl()


def _season_start_year_from_url(url: str) -> int | None:
    match = SEASON_CATEGORY_RE.search(_canonicalize_category_url(url))
    if not match:
        return None

    start_year = int(match.group(1))
    end_year = int(match.group(2))
    if end_year != start_year + 1:
        return None
    return start_year


def _current_resp_season_start_year(now: datetime | None = None) -> int:
    current = now or datetime.now(timezone.utc)
    iso_year, iso_week, _ = current.isocalendar()
    return iso_year if iso_week >= SEASON_START_WEEK else iso_year - 1


def _target_category_start_years(now: datetime | None = None) -> Set[int]:
    active = _current_resp_season_start_year(now)
    return {active - 1, active}


def _fetch_html(url: str, timeout: int, context: ssl.SSLContext) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with _open_url(req, timeout=timeout, context=context) as resp:
        content_type = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(content_type, errors="replace")


def discover_category_urls(
    urls: str | Iterable[str] = CATEGORY_URLS,
    timeout: int = 20,
    *,
    now: datetime | None = None,
) -> List[str]:
    """Discover the active and previous season category pages from the known seeds."""
    seed_urls = [
        _canonicalize_category_url(url)
        for url in ([urls] if isinstance(urls, str) else list(urls))
    ]
    discovered: Set[str] = set(seed_urls)
    target_years = _target_category_start_years(now)
    context = _build_ssl_context()

    for url in seed_urls:
        parser = _PdfLinkParser(url)
        try:
            html = _fetch_html(url, timeout=timeout, context=context)
        except (HTTPError, URLError) as exc:
            print(f"[warn] Failed to discover season pages from {url}: {exc}", file=sys.stderr)
            continue
        parser.feed(html)
        discovered.update(parser.category_links)

    filtered = {
        url
        for url in discovered
        if (_season_start_year_from_url(url) or -1) in target_years
    }
    if not filtered:
        filtered = {
            url
            for url in seed_urls
            if (_season_start_year_from_url(url) or -1) in target_years
        } or set(seed_urls)

    return sorted(
        filtered,
        key=lambda item: (_season_start_year_from_url(item) or 0, item),
    )


def fetch_pdf_links(
    urls: str | Iterable[str] = CATEGORY_URLS,
    timeout: int = 20,
    *,
    discover_categories: bool = True,
) -> List[str]:
    """Return all absolute PDF URLs from one or more category pages."""
    category_urls = (
        discover_category_urls(urls, timeout=timeout)
        if discover_categories
        else [urls] if isinstance(urls, str) else list(urls)
    )
    all_candidates: Set[str] = set()
    errors: List[tuple[str, Exception]] = []
    context = _build_ssl_context()

    for url in category_urls:
        parser = _PdfLinkParser(url)
        try:
            html = _fetch_html(url, timeout=timeout, context=context)
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
    category_pages: List[str]
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
    with _open_url(req, timeout=timeout, context=context) as resp:
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
    category_pages = discover_category_urls(now=timestamp)
    all_urls = fetch_pdf_links(category_pages, discover_categories=False)
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
    return MonitorResult(
        category_pages=category_pages,
        new_urls=new_urls,
        all_urls=all_urls,
        timestamp=timestamp,
        downloaded_files=downloaded,
    )


def print_report(result: MonitorResult) -> None:
    dt = result.timestamp.astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    header = f"Checked NNGYK season pages at {dt}"
    print(header)
    print("-" * len(header))
    for url in result.category_pages:
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
    for url in discover_category_urls():
        print(f"- {url}")
    print(f"Polling every {args.interval_minutes} minutes.")
    monitor_loop(args.state_file, args.interval_minutes, args.download_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

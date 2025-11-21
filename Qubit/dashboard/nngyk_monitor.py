"""Monitor the NNGYK respiratory bulletin page for new PDF posts.

This utility fetches the Légúti Figyelőszolgálat adatai listing and reports
PDF links that were not present in the previous run. Use `--interval-minutes`
for continuous polling (default: 120 minutes) or `--once` for a single check.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, List, Set
from urllib.error import URLError, HTTPError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

CATEGORY_URL = (
    "https://nnk.gov.hu/index.php/leguti-figyeloszolgalat-2/"
    "category/420-leguti-figyeloszolgalat-adatai-2025-2026-evi-szezon.html"
)
USER_AGENT = "NNGYK-PDF-Monitor/1.0 (contact: dashboard script)"
DEFAULT_INTERVAL_MINUTES = 120


class _PdfLinkParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.links: Set[str] = set()

    def handle_starttag(self, tag: str, attrs: List[tuple[str, str]]) -> None:
        if tag.lower() != "a":
            return
        href = dict(attrs).get("href")
        if not href:
            return
        if ".pdf" in href.lower():
            self.links.add(urljoin(self.base_url, href))


def fetch_pdf_links(url: str = CATEGORY_URL, timeout: int = 20) -> List[str]:
    """Return all absolute PDF URLs from the category page."""
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=timeout) as resp:
        content_type = resp.headers.get_content_charset() or "utf-8"
        html = resp.read().decode(content_type, errors="replace")
    parser = _PdfLinkParser(url)
    parser.feed(html)
    return sorted(parser.links)


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


def check_once(state_path: Path) -> MonitorResult:
    state = MonitorState.load(state_path)
    timestamp = datetime.now(timezone.utc)
    all_urls = fetch_pdf_links()
    new_urls = [url for url in all_urls if url not in state.seen_urls]
    state.seen_urls.update(all_urls)
    state.last_checked = timestamp.isoformat()
    state.save(state_path)
    return MonitorResult(new_urls=new_urls, all_urls=all_urls, timestamp=timestamp)


def print_report(result: MonitorResult) -> None:
    dt = result.timestamp.astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    header = f"Checked {CATEGORY_URL} at {dt}"
    print(header)
    print("-" * len(header))
    if result.new_urls:
        print("New PDF links detected:")
        for url in result.new_urls:
            print(f"- {url}")
    else:
        print("No new PDF links since the previous check.")
    print(f"Total PDF links found this run: {len(result.all_urls)}")


def monitor_loop(state_path: Path, interval_minutes: int) -> None:
    while True:
        try:
            result = check_once(state_path)
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
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    if args.once:
        try:
            result = check_once(args.state_file)
        except (HTTPError, URLError) as err:
            print(f"Request error: {err}", file=sys.stderr)
            return 1
        print_report(result)
        return 0

    print(
        f"Starting continuous monitor of {CATEGORY_URL}\n"
        f"Polling every {args.interval_minutes} minutes."
    )
    monitor_loop(args.state_file, args.interval_minutes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

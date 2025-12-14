"""Combined NNGYK monitor + extractor.

Features:
- Polls NNGYK season pages for new bulletin PDFs (default every 3 hours).
- Downloads newly posted PDFs (or all known links when --sync-all is used).
- Extracts weekly metrics from every PDF in the download folder and writes nngyk_all.json.

Usage examples:
  python3 nngyk_agent.py --once
  python3 nngyk_agent.py --interval-hours 3   # continuous loop
  python3 nngyk_agent.py --sync-all --once    # redownload all listed PDFs, then extract
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Iterable, List
from urllib.error import HTTPError, URLError

from nngyk_monitor import CATEGORY_URLS, MonitorState, _download_pdf, fetch_pdf_links
from erviss_sari_fetch import DEFAULT_URL as ERVISS_URL, DEFAULT_OUTPUT as ERVISS_OUTPUT, DEFAULT_CSV_COPY, main as fetch_erviss
from nngyk_extract import ExtractionResult, extract_text, infer_season_year_from_filename, parse_bulletin

DEFAULT_INTERVAL_HOURS = 3


def _entry_key(entry: dict) -> tuple[int | None, int | None]:
    return entry.get("season_year"), entry.get("week")


def _load_existing_output(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return []
    return payload if isinstance(payload, list) else []


def _merge_output(existing: list[dict], updates: list[dict]) -> list[dict]:
    unknown: list[dict] = []
    merged: dict[tuple[int | None, int | None], dict] = {}

    for entry in existing:
        key = _entry_key(entry)
        if key == (None, None):
            unknown.append(entry)
        else:
            merged[key] = entry

    for entry in updates:
        key = _entry_key(entry)
        if key == (None, None):
            unknown.append(entry)
        else:
            merged[key] = entry

    sorted_known = sorted(
        merged.values(),
        key=lambda item: (item.get("season_year") or 0, item.get("week") or 0, item.get("file") or ""),
    )
    return [*unknown, *sorted_known]


def extract_folder(pdf_dir: Path, output: Path) -> int:
    """Parse all PDFs in a folder and write aggregated JSON list."""
    pdfs = sorted(p for p in pdf_dir.glob("*.pdf") if p.is_file())
    if not pdfs:
        print(f"No PDFs found in {pdf_dir}", file=sys.stderr)
        return 1

    aggregated: List[dict] = []
    deduped: dict[tuple[int | None, int | None], tuple[float, dict]] = {}
    for pdf_path in pdfs:
        try:
            text = extract_text(pdf_path)
            result: ExtractionResult = parse_bulletin(text)
            if result.season_year is None:
                result.season_year = infer_season_year_from_filename(pdf_path, result.week)
            payload = result.to_dashboard_payload()
            entry = {
                "file": str(pdf_path),
                "week": result.week,
                "season_year": result.season_year,
                "payload": payload,
            }
            key = (result.season_year, result.week)
            if key == (None, None):
                aggregated.append(entry)
            else:
                mtime = pdf_path.stat().st_mtime
                previous = deduped.get(key)
                if previous is None or mtime >= previous[0]:
                    deduped[key] = (mtime, entry)
            print(f"[ok] {pdf_path.name} -> week {result.week or 'unknown'}, season {result.season_year or 'unknown'}")
        except Exception as exc:  # noqa: BLE001
            print(f"[fail] {pdf_path}: {exc}", file=sys.stderr)

    aggregated.extend(
        entry
        for _mtime, entry in sorted(
            deduped.values(),
            key=lambda item: (item[1].get("season_year") or 0, item[1].get("week") or 0, item[1].get("file") or ""),
        )
    )

    output.write_text(json.dumps(aggregated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Parsed {len(aggregated)} PDFs from {pdf_dir} -> {output}")
    return 0


def download_pdfs(urls: List[str], download_dir: Path) -> List[tuple[str, Path]]:
    saved: List[tuple[str, Path]] = []
    for url in urls:
        try:
            saved.append((url, _download_pdf(url, download_dir)))
            print(f"[downloaded] {url}")
        except Exception as exc:  # noqa: BLE001
            print(f"[download failed] {url}: {exc}", file=sys.stderr)
    return saved


def _parse_pdfs(pdf_paths: Iterable[Path]) -> list[dict]:
    parsed: list[dict] = []
    for pdf_path in pdf_paths:
        try:
            text = extract_text(pdf_path)
            result: ExtractionResult = parse_bulletin(text)
            if result.season_year is None:
                result.season_year = infer_season_year_from_filename(pdf_path, result.week)
            entry = {
                "file": str(pdf_path),
                "week": result.week,
                "season_year": result.season_year,
                "payload": result.to_dashboard_payload(),
            }
            parsed.append(entry)
            print(f"[ok] {pdf_path.name} -> week {result.week or 'unknown'}, season {result.season_year or 'unknown'}")
        except Exception as exc:  # noqa: BLE001
            print(f"[fail] {pdf_path}: {exc}", file=sys.stderr)
    return parsed


def check_and_extract(
    state_path: Path,
    download_dir: Path,
    output: Path,
    sync_all: bool = False,
    incremental: bool = False,
    fetch_erviss_url: str | None = None,
    erviss_output: Path | None = None,
    erviss_csv_copy: Path | None = None,
) -> int:
    state = MonitorState.load(state_path)
    all_urls = fetch_pdf_links()

    target_urls = all_urls if sync_all else [u for u in all_urls if u not in state.seen_urls]
    if target_urls:
        if sync_all and download_dir.exists():
            for existing in download_dir.glob("*.pdf"):
                try:
                    existing.unlink()
                except Exception as exc:  # noqa: BLE001
                    print(f"[warn] Failed to remove {existing}: {exc}", file=sys.stderr)
        downloaded = download_pdfs(target_urls, download_dir)
        downloaded_urls = [url for url, _path in downloaded]
        downloaded_paths = [path for _url, path in downloaded]
    else:
        print("No new PDFs to download.")
        downloaded_urls = []
        downloaded_paths = []

    # Mark successful downloads as seen; keep failures eligible for retry next run.
    # When sync_all is requested, we still record everything as seen to avoid unbounded growth.
    if sync_all:
        state.seen_urls.update(all_urls)
    else:
        state.seen_urls.update(downloaded_urls)
    state.save(state_path)

    if incremental and not sync_all:
        if downloaded_paths:
            existing = _load_existing_output(output)
            updates = _parse_pdfs(downloaded_paths)
            if not updates:
                result = 1
            else:
                merged = _merge_output(existing, updates)
                output.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                print(f"Updated {len(updates)} PDFs -> merged output {output}")
                result = 0
        else:
            if output.exists():
                print(f"No new PDFs; leaving existing output unchanged: {output}")
                result = 0
            else:
                print(f"No PDFs downloaded and {output} does not exist; run with --sync-all to bootstrap.", file=sys.stderr)
                result = 1
    else:
        # Extract all PDFs currently in the folder (full rebuild from disk)
        result = extract_folder(download_dir, output)

    if fetch_erviss_url and erviss_output:
        try:
            print(f"Fetching ERVISS SARI CSV: {fetch_erviss_url}")
            args = ["--url", fetch_erviss_url, "--output", str(erviss_output)]
            if erviss_csv_copy:
                args.extend(["--csv-copy", str(erviss_csv_copy)])
            fetch_erviss(args)
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] Failed to fetch ERVISS SARI data: {exc}", file=sys.stderr)
    return result


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state-file", type=Path, default=Path("nngyk_seen.json"), help="Path for seen-URL state")
    parser.add_argument("--download-dir", type=Path, default=Path("nngyk_pdfs"), help="Where to store downloaded PDFs")
    parser.add_argument("--output", type=Path, default=Path("nngyk_all.json"), help="Aggregated JSON output path")
    parser.add_argument("--interval-hours", type=float, default=DEFAULT_INTERVAL_HOURS, help="Polling interval when looping")
    parser.add_argument("--once", action="store_true", help="Run a single cycle (fetch+download+extract) and exit")
    parser.add_argument(
        "--sync-all",
        action="store_true",
        help="Redownload all listed PDFs (not just new links) before extracting",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Only parse newly downloaded PDFs and merge into existing output (useful for CI runs without stored PDFs).",
    )
    parser.add_argument(
        "--skip-erviss",
        action="store_true",
        help="Disable fetching ERVISS SARI CSV during this run (defaults to on).",
    )
    parser.add_argument(
        "--erviss-url",
        default=ERVISS_URL,
        help="CSV URL for ERVISS SARI virological EU/EEA data (set empty to skip)",
    )
    parser.add_argument(
        "--erviss-output",
        type=Path,
        default=Path(ERVISS_OUTPUT),
        help="Where to write the ERVISS JSON snapshot",
    )
    parser.add_argument(
        "--erviss-csv-copy",
        type=Path,
        default=Path(DEFAULT_CSV_COPY),
        help="Where to save a copy of the downloaded ERVISS CSV",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)

    def run_cycle() -> int:
        print("Checking NNGYK season pages:")
        for url in CATEGORY_URLS:
            print(f"- {url}")
        fetch_url = None if args.skip_erviss else (args.erviss_url or None)
        if fetch_url:
            args.erviss_output.parent.mkdir(parents=True, exist_ok=True)
            args.erviss_csv_copy.parent.mkdir(parents=True, exist_ok=True)
        return check_and_extract(
            args.state_file,
            args.download_dir,
            args.output,
            sync_all=args.sync_all,
            incremental=args.incremental,
            fetch_erviss_url=fetch_url,
            erviss_output=args.erviss_output if fetch_url else None,
            erviss_csv_copy=args.erviss_csv_copy if fetch_url else None,
        )

    if args.once:
        try:
            return run_cycle()
        except (HTTPError, URLError) as err:
            print(f"Request error: {err}", file=sys.stderr)
            return 1
        except Exception as exc:  # noqa: BLE001
            print(f"Unexpected error: {exc}", file=sys.stderr)
            return 1

    print("Starting continuous monitor of NNGYK season pages")
    print(f"Polling every {args.interval_hours} hours. Output: {args.output} | PDFs: {args.download_dir}")
    while True:
        try:
            run_cycle()
        except (HTTPError, URLError) as err:
            print(f"Request error: {err}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"Unexpected error: {exc}", file=sys.stderr)
        time.sleep(max(int(args.interval_hours * 3600), 60))


if __name__ == "__main__":
    raise SystemExit(main())

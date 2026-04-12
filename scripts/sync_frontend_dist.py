#!/usr/bin/env python3
"""Sync the built Vite frontend from new-dashboard/dist into the repo root."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def copy_root_files(dist_dir: Path, repo_root: Path) -> None:
    for source in dist_dir.iterdir():
        if source.name == "assets" or source.is_dir():
            continue
        shutil.copy2(source, repo_root / source.name)


def sync_assets(dist_assets: Path, repo_assets: Path, *, clean: bool) -> None:
    dist_files = {
        path.relative_to(dist_assets)
        for path in dist_assets.rglob("*")
        if path.is_file()
    }
    repo_assets.mkdir(parents=True, exist_ok=True)

    for relative_path in sorted(dist_files):
        destination = repo_assets / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dist_assets / relative_path, destination)

    if not clean:
        return

    for path in sorted(repo_assets.rglob("*"), reverse=True):
        if path.is_file() and path.relative_to(repo_assets) not in dist_files:
            path.unlink()

    for path in sorted(repo_assets.rglob("*"), reverse=True):
        if path.is_dir() and not any(path.iterdir()):
            path.rmdir()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dist",
        type=Path,
        default=Path("new-dashboard/dist"),
        help="Path to the built frontend output (default: new-dashboard/dist)",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path("."),
        help="Path to the repository root to sync into (default: current directory)",
    )
    parser.add_argument(
        "--clean-assets",
        action="store_true",
        help="Delete previously published bundle files in the root assets directory that are absent from the new build",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dist_dir = args.dist.resolve()
    repo_root = args.repo_root.resolve()
    dist_assets = dist_dir / "assets"

    if not dist_dir.is_dir():
        raise SystemExit(f"Build output not found: {dist_dir}")
    if not dist_assets.is_dir():
        raise SystemExit(f"Build assets directory not found: {dist_assets}")

    copy_root_files(dist_dir, repo_root)
    sync_assets(dist_assets, repo_root / "assets", clean=args.clean_assets)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

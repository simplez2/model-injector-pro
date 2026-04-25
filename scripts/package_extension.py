#!/usr/bin/env python3
"""Build a distributable zip from the extension directory."""

from __future__ import annotations

import json
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTENSION_DIR = ROOT / "extension"
DIST_DIR = ROOT / "dist"

EXCLUDED_NAMES = {
    ".DS_Store",
    "Thumbs.db",
    "content.recover.test.js",
    "fix_ui.patch",
    "_test.png",
}


def read_version() -> str:
    manifest = json.loads((EXTENSION_DIR / "manifest.json").read_text(encoding="utf-8"))
    return str(manifest.get("version", "0.0.0"))


def should_include(path: Path) -> bool:
    if path.name in EXCLUDED_NAMES:
        return False
    return path.is_file()


def main() -> None:
    if not EXTENSION_DIR.exists():
        raise SystemExit("extension directory is missing")

    DIST_DIR.mkdir(exist_ok=True)
    version = read_version()
    archive = DIST_DIR / f"chatgpt-model-injector-pro-v{version}.zip"
    if archive.exists():
        archive.unlink()

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(EXTENSION_DIR.rglob("*")):
            if not should_include(path):
                continue
            zf.write(path, path.relative_to(EXTENSION_DIR).as_posix())

    latest = DIST_DIR / "chatgpt-model-injector-pro-latest.zip"
    if latest.exists():
        latest.unlink()
    shutil.copy2(archive, latest)

    print(f"Created {archive}")
    print(f"Created {latest}")
    print(f"Built at {datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    main()

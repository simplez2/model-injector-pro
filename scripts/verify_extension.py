#!/usr/bin/env python3
"""Validate the extension source layout before loading or packaging."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTENSION_DIR = ROOT / "extension"


def fail(message: str) -> None:
    print(f"[verify] ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f"[verify] OK: {message}")


def load_manifest() -> dict:
    manifest_path = EXTENSION_DIR / "manifest.json"
    if not manifest_path.exists():
        fail("extension/manifest.json is missing")
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"manifest.json is invalid JSON: {exc}")


def check_manifest_files(manifest: dict) -> None:
    scripts = []
    for block in manifest.get("content_scripts", []):
        scripts.extend(block.get("js", []))
    if not scripts:
        fail("manifest has no content_scripts.js entries")
    for relative in scripts:
        path = EXTENSION_DIR / relative
        if not path.exists():
            fail(f"manifest references missing script: {relative}")
        ok(f"script exists: {relative}")

    icons = manifest.get("icons", {}) or {}
    for size, relative in icons.items():
        path = EXTENSION_DIR / relative
        if not path.exists():
            fail(f"manifest references missing icon {size}: {relative}")
        ok(f"icon exists: {relative}")


def check_no_local_junk() -> None:
    blocked = {
        ".git",
        "temp_patch.txt",
        "temp_patch_nobom.txt",
        "extension/fix_ui.patch",
        "extension/content.recover.test.js",
        "extension/icons/_test.png",
    }
    for relative in blocked:
        if (ROOT / relative).exists():
            fail(f"local-only artifact should not be committed: {relative}")
    ok("local-only artifacts are absent")


def check_source_smoke() -> None:
    content = (EXTENSION_DIR / "content.js").read_text(encoding="utf-8")
    required_patterns = [
        r"installNetworkHooks",
        r"patchPayload",
        r"MODELS_ENDPOINT",
        r"GPTTokenizer_o200k_base",
    ]
    for pattern in required_patterns:
        if not re.search(pattern, content):
            fail(f"content.js missing expected pattern: {pattern}")
    ok("content.js contains expected integration points")


def main() -> None:
    manifest = load_manifest()
    check_manifest_files(manifest)
    check_no_local_junk()
    check_source_smoke()
    ok("extension source verification passed")


if __name__ == "__main__":
    main()

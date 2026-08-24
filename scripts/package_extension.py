#!/usr/bin/env python3
"""Build a deterministic, allowlist-only browser extension archive."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
EXTENSION_DIR = ROOT / 'extension'
DIST_DIR = ROOT / 'dist'
VERIFY_SCRIPT = ROOT / 'scripts' / 'verify_extension.py'

# This is the complete public runtime surface. Never replace it with a
# recursive walk: backups, previews, notes, and old archives are not releases.
RUNTIME_FILES = (
    'manifest.json',
    'config.js',
    'content.js',
    'content-bridge.js',
    'background.js',
    'libs/o200k_base.js',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png',
)

# License files travel with every distributable archive but are not referenced
# by manifest.json and therefore remain separate from the runtime allowlist.
LEGAL_FILES = (
    'LICENSE',
    'THIRD_PARTY_NOTICES.md',
)
ARCHIVE_FILES = RUNTIME_FILES + LEGAL_FILES

# ZIP timestamps start in 1980. A fixed value keeps builds reproducible.
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


def read_version() -> str:
    manifest_path = EXTENSION_DIR / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    version = str(manifest.get('version', '')).strip()
    if not version:
        raise SystemExit('extension/manifest.json has no version')
    return version


def archive_path_for_version(version: str) -> Path:
    return DIST_DIR / f'model-injector-pro-v{version}.zip'


def resolve_runtime_file(relative: str) -> Path:
    posix_path = PurePosixPath(relative)
    if posix_path.is_absolute() or '..' in posix_path.parts:
        raise SystemExit(f'unsafe runtime path in allowlist: {relative}')

    path = EXTENSION_DIR.joinpath(*posix_path.parts)
    try:
        path.resolve(strict=True).relative_to(EXTENSION_DIR.resolve(strict=True))
    except (FileNotFoundError, ValueError) as exc:
        raise SystemExit(f'invalid runtime file: {relative}: {exc}') from exc
    if not path.is_file() or path.is_symlink():
        raise SystemExit(f'runtime entry must be a regular non-symlink file: {relative}')
    return path


def resolve_archive_file(relative: str) -> Path:
    if relative in RUNTIME_FILES:
        return resolve_runtime_file(relative)
    if relative not in LEGAL_FILES:
        raise SystemExit(f'archive path is not allowlisted: {relative}')

    posix_path = PurePosixPath(relative)
    if posix_path.is_absolute() or '..' in posix_path.parts:
        raise SystemExit(f'unsafe legal path in allowlist: {relative}')
    path = ROOT.joinpath(*posix_path.parts)
    try:
        path.resolve(strict=True).relative_to(ROOT.resolve(strict=True))
    except (FileNotFoundError, ValueError) as exc:
        raise SystemExit(f'invalid legal file: {relative}: {exc}') from exc
    if not path.is_file() or path.is_symlink():
        raise SystemExit(f'legal entry must be a regular non-symlink file: {relative}')
    return path


def run_verifier(*extra_args: str) -> None:
    subprocess.run(
        [sys.executable, str(VERIFY_SCRIPT), *extra_args],
        cwd=ROOT,
        check=True,
    )


def write_archive(archive: Path) -> None:
    with zipfile.ZipFile(
        archive,
        'w',
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as zf:
        for relative in ARCHIVE_FILES:
            source = resolve_archive_file(relative)
            info = zipfile.ZipInfo(relative, ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            zf.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)


def main() -> None:
    if not EXTENSION_DIR.is_dir():
        raise SystemExit('extension directory is missing')

    run_verifier()
    DIST_DIR.mkdir(exist_ok=True)

    version = read_version()
    versioned_archive = archive_path_for_version(version)
    latest_archive = DIST_DIR / 'model-injector-pro-latest.zip'

    for archive in (versioned_archive, latest_archive):
        if archive.exists():
            archive.unlink()

    write_archive(versioned_archive)
    shutil.copy2(versioned_archive, latest_archive)

    run_verifier('--archive', str(versioned_archive))
    run_verifier('--archive', str(latest_archive))

    print(f'Created {versioned_archive}')
    print(f'Created {latest_archive}')
    print('Packaged archive files:')
    for relative in ARCHIVE_FILES:
        print(f'  - {relative}')


if __name__ == '__main__':
    main()

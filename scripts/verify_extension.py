#!/usr/bin/env python3
"""Validate public source, runtime allowlist, and release archives."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import stat
import subprocess
import sys
import zipfile
from pathlib import Path, PurePosixPath

from package_extension import ARCHIVE_FILES, RUNTIME_FILES, resolve_archive_file

ROOT = Path(__file__).resolve().parents[1]
EXTENSION_DIR = ROOT / 'extension'
PACKAGE_PATH = ROOT / 'package.json'
TOKENIZER_PATH = EXTENSION_DIR / 'libs' / 'o200k_base.js'
TOKENIZER_SHA256 = 'fbc7419f14fb3a1460b56b156b94adb3480ec375a1dd404b0d0bd807fbff97e1'

PUBLIC_REPOSITORY_FILES = (
    '.gitattributes',
    '.gitignore',
    '.github/workflows/verify.yml',
    'LICENSE',
    'README.md',
    'SECURITY.md',
    'THIRD_PARTY_NOTICES.md',
    'package.json',
    'docs/ARCHITECTURE.md',
    'docs/PRIVACY.md',
    'docs/USAGE.md',
    'scripts/package_extension.py',
    'scripts/verify_extension.py',
    'extension/manifest.json',
    'extension/config.js',
    'extension/content.js',
    'extension/libs/o200k_base.js',
    'extension/icons/README.md',
    'extension/icons/generate-icons.ps1',
    'extension/icons/floating-icon.svg',
    'extension/icons/icon-source.svg',
    'extension/icons/icon-16.png',
    'extension/icons/icon-32.png',
    'extension/icons/icon-48.png',
    'extension/icons/icon-128.png',
    'extension/icons/icon-preview.png',
)

BINARY_SUFFIXES = {
    '.7z', '.bmp', '.crx', '.gif', '.ico', '.jpeg', '.jpg', '.pdf',
    '.jks', '.keystore', '.p12', '.pem', '.pfx', '.png', '.tar', '.tgz',
    '.webp', '.woff', '.woff2', '.zip',
}
FORBIDDEN_ARTIFACT_PATTERNS = (
    re.compile(r'(^|/)(?:output|captures?|screenshots?)(/|$)', re.IGNORECASE),
    re.compile(r'\.(?:bak(?:[-.][^/]*)?|backup|crx|jks|keystore|orig|p12|pem|pfx|zip)$', re.IGNORECASE),
    re.compile(r'(^|/)(?:id_ed25519|id_rsa)$', re.IGNORECASE),
    re.compile(r'(^|/)(?:capture|screenshot)[^/]*\.(?:gif|jpe?g|png|webp)$', re.IGNORECASE),
)
SECRET_PATTERNS = (
    ('private key', re.compile(r'-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY-----')),
    ('OpenAI-style API key', re.compile(r'\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b')),
    ('Google API key', re.compile(r'\bAIza[0-9A-Za-z_-]{30,}\b')),
    ('GitHub token', re.compile(r'\bgh[pousr]_[A-Za-z0-9]{20,}\b')),
    ('AWS access key', re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b')),
    ('JWT', re.compile(r'\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b')),
    ('hard-coded secret', re.compile(
        r'''(?ix)\b(?:api[_-]?key|client[_-]?secret|password|passwd|access[_-]?token)\b
            \s*[:=]\s*['"][^'"\s]{8,}['"]'''
    )),
    ('personal email', re.compile(
        r'(?i)\b[A-Z0-9._%+-]+@(?:gmail|hotmail|outlook|qq|163)\.[A-Z]{2,}\b'
    )),
    ('local Windows user path', re.compile(r'(?i)\b[A-Z]:\\Users\\[^\\/\s]+')),
    ('local Unix user path', re.compile(r'(?i)(?:^|[\s\'])/(?:home|Users)/[^/\s\']+')),
)
OLD_BRAND_PATTERNS = (
    ('legacy OpenAI knot path', re.compile(r'm297[.]06\s+130[.]97c7[.]26-21[.]79', re.IGNORECASE)),
    ('legacy OpenAI knot path', re.compile(r'M22[.]2819[, ]+9[.]8211', re.IGNORECASE)),
    ('OpenAI logo asset', re.compile(
        r'''(?ix)https?://[^'"\s]*openai[^'"\s]*/(?:brand|favicon|logo)[^'"\s]*'''
    )),
    ('OpenAI logo label', re.compile(
        r'''(?ix)(?:aria-label|class|id)\s*=\s*['"][^'"]*openai[-_ ]?(?:knot|logo|mark)'''
    )),
)


def fail(message: str) -> None:
    print(f'[verify] ERROR: {message}', file=sys.stderr)
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f'[verify] OK: {message}')


def load_json(path: Path, label: str) -> dict:
    if not path.is_file():
        fail(f'{label} is missing: {path.relative_to(ROOT).as_posix()}')
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        fail(f'{label} is invalid: {exc}')
    if not isinstance(value, dict):
        fail(f'{label} must contain a JSON object')
    return value


def git_output(*args: str) -> bytes:
    result = subprocess.run(
        ['git', '-C', str(ROOT), *args],
        check=False,
        capture_output=True,
    )
    if result.returncode != 0:
        fail(f'git command failed: git {" ".join(args)}')
    return result.stdout


def tracked_paths() -> set[str]:
    return {
        item.decode('utf-8').replace('\\', '/')
        for item in git_output('ls-files', '-z').split(b'\0')
        if item
    }


def check_public_tree() -> None:
    allowed = set(PUBLIC_REPOSITORY_FILES)
    if len(allowed) != len(PUBLIC_REPOSITORY_FILES):
        fail('public repository allowlist contains duplicate paths')

    tracked = tracked_paths()
    missing = sorted(allowed - tracked)
    extra = sorted(tracked - allowed)
    if missing or extra:
        fail(f'public tracked tree differs from allowlist; missing={missing}, extra={extra}')

    for relative in PUBLIC_REPOSITORY_FILES:
        path = ROOT.joinpath(*PurePosixPath(relative).parts)
        if not path.is_file() or path.is_symlink():
            fail(f'public repository entry must be a regular non-symlink file: {relative}')
    ok(f'public tracked tree matches the fixed allowlist ({len(allowed)} files)')


def is_git_ignored(path: Path) -> bool:
    try:
        relative = path.relative_to(ROOT).as_posix()
    except ValueError:
        return False
    result = subprocess.run(
        ['git', '-C', str(ROOT), 'check-ignore', '--no-index', '-q', '--', relative],
        check=False,
        capture_output=True,
    )
    return result.returncode == 0


def is_forbidden_artifact(relative: str) -> bool:
    return any(pattern.search(relative) for pattern in FORBIDDEN_ARTIFACT_PATTERNS)


def check_local_artifacts() -> None:
    tracked = tracked_paths()
    blocked_tracked = sorted(path for path in tracked if is_forbidden_artifact(path))
    if blocked_tracked:
        fail(f'forbidden artifact is tracked: {blocked_tracked[0]}')

    ignored_count = 0
    for path in ROOT.rglob('*'):
        if '.git' in path.relative_to(ROOT).parts:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if not is_forbidden_artifact(relative):
            continue
        if not is_git_ignored(path):
            fail(f'local artifact is not ignored: {relative}')
        ignored_count += 1

    ok(f'forbidden local artifacts are untracked and ignored ({ignored_count} found)')


def iter_public_text_files():
    for path in ROOT.rglob('*'):
        if not path.is_file() or path == TOKENIZER_PATH:
            continue
        relative = path.relative_to(ROOT)
        if '.git' in relative.parts or path.suffix.lower() in BINARY_SUFFIXES:
            continue
        if is_git_ignored(path):
            continue
        try:
            yield path, path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue


def check_sensitive_content() -> None:
    scanned = 0
    for path, text in iter_public_text_files():
        relative = path.relative_to(ROOT).as_posix()
        scanned += 1
        for label, pattern in SECRET_PATTERNS:
            if pattern.search(text):
                fail(f'{label} pattern found in {relative}')
        for label, pattern in OLD_BRAND_PATTERNS:
            if pattern.search(text):
                fail(f'{label} found in {relative}')
    ok(f'public text passed secret and legacy-brand scans ({scanned} files)')


def add_manifest_path(paths: set[str], value) -> None:
    if isinstance(value, str) and value.strip():
        paths.add(PurePosixPath(value).as_posix())
    elif isinstance(value, dict):
        for nested in value.values():
            add_manifest_path(paths, nested)


def collect_manifest_runtime_files(manifest: dict) -> set[str]:
    paths = {'manifest.json'}
    for block in manifest.get('content_scripts', []):
        for key in ('js', 'css'):
            for relative in block.get(key, []):
                add_manifest_path(paths, relative)

    add_manifest_path(paths, manifest.get('icons', {}))
    action = manifest.get('action', {}) or {}
    add_manifest_path(paths, action.get('default_icon'))
    add_manifest_path(paths, action.get('default_popup'))
    background = manifest.get('background', {}) or {}
    add_manifest_path(paths, background.get('service_worker'))
    add_manifest_path(paths, manifest.get('options_page'))
    add_manifest_path(paths, (manifest.get('options_ui', {}) or {}).get('page'))
    add_manifest_path(paths, (manifest.get('side_panel', {}) or {}).get('default_path'))
    for block in manifest.get('web_accessible_resources', []):
        for relative in block.get('resources', []):
            add_manifest_path(paths, relative)
    return paths


def check_runtime_allowlist(manifest: dict) -> None:
    allowed = set(RUNTIME_FILES)
    if len(allowed) != len(RUNTIME_FILES):
        fail('runtime allowlist contains duplicate paths')

    referenced = collect_manifest_runtime_files(manifest)
    if referenced != allowed:
        missing = sorted(referenced - allowed)
        unused = sorted(allowed - referenced)
        fail(f'manifest/allowlist mismatch; missing={missing}, unreferenced={unused}')

    if manifest.get('manifest_version') != 3:
        fail('manifest_version must be 3')
    required_icon_sizes = {'16', '32', '48', '128'}
    if set((manifest.get('icons', {}) or {}).keys()) != required_icon_sizes:
        fail('manifest icons must define exactly 16, 32, 48, and 128')

    extension_root = EXTENSION_DIR.resolve(strict=True)
    for relative in RUNTIME_FILES:
        posix_path = PurePosixPath(relative)
        if posix_path.is_absolute() or '..' in posix_path.parts:
            fail(f'unsafe allowlist path: {relative}')
        if is_forbidden_artifact(relative):
            fail(f'forbidden artifact appears in runtime allowlist: {relative}')
        path = EXTENSION_DIR.joinpath(*posix_path.parts)
        try:
            path.resolve(strict=True).relative_to(extension_root)
        except (FileNotFoundError, ValueError):
            fail(f'allowlisted runtime file is missing or escapes extension/: {relative}')
        if not path.is_file() or path.is_symlink():
            fail(f'allowlisted runtime entry is not a regular file: {relative}')
        ok(f'runtime file: {relative}')
    ok('manifest references exactly the runtime allowlist')


def check_package_metadata(manifest: dict) -> None:
    package = load_json(PACKAGE_PATH, 'package.json')
    manifest_version = str(manifest.get('version', '')).strip()
    package_version = str(package.get('version', '')).strip()
    if not re.fullmatch(r'\d+(?:\.\d+){1,3}', manifest_version):
        fail(f'manifest version is invalid: {manifest_version!r}')
    if package_version != manifest_version:
        fail(f'package.json version {package_version!r} != manifest version {manifest_version!r}')
    if package.get('name') != 'model-injector-pro':
        fail('package.json name must be model-injector-pro')
    if package.get('license') != 'MIT':
        fail('package.json license must be MIT')
    if package.get('private') is not True:
        fail('package.json must remain private to prevent accidental npm publishing')
    scripts = package.get('scripts', {}) or {}
    if not scripts.get('verify') or not scripts.get('package'):
        fail('package.json must define verify and package scripts')
    ok(f'package and manifest versions match ({manifest_version})')


def check_tokenizer_integrity() -> None:
    digest = hashlib.sha256(TOKENIZER_PATH.read_bytes()).hexdigest()
    if digest != TOKENIZER_SHA256:
        fail(f'o200k_base.js SHA-256 changed: {digest}')
    notices = (ROOT / 'THIRD_PARTY_NOTICES.md').read_text(encoding='utf-8').lower()
    if 'gpt-tokenizer' not in notices or '3.4.0' not in notices or digest not in notices:
        fail('THIRD_PARTY_NOTICES.md does not identify the bundled tokenizer and SHA-256')
    ok(f'gpt-tokenizer 3.4.0 bundle SHA-256: {digest}')


def check_source_smoke() -> None:
    content = (EXTENSION_DIR / 'content.js').read_text(encoding='utf-8')
    for pattern in (
        r'installFetchHook',
        r'rewriteConversationPayload',
        r'MODELS_ENDPOINT',
        r'GPTTokenizer_o200k_base',
    ):
        if not re.search(pattern, content):
            fail(f'content.js missing expected integration point: {pattern}')
    ok('content.js contains expected integration points')


def check_public_metadata_files() -> None:
    required = (
        '.gitattributes',
        '.gitignore',
        'LICENSE',
        'README.md',
        'SECURITY.md',
        'THIRD_PARTY_NOTICES.md',
        'docs/ARCHITECTURE.md',
        'docs/PRIVACY.md',
        'docs/USAGE.md',
    )
    for relative in required:
        path = ROOT / relative
        if not path.is_file() or path.stat().st_size == 0:
            fail(f'required public file is missing or empty: {relative}')

    readme = (ROOT / 'README.md').read_text(encoding='utf-8').lower()
    if 'not affiliated with, endorsed by, or sponsored by openai' not in readme:
        fail('README.md must include the independent-project disclaimer')
    if not (ROOT / 'LICENSE').read_text(encoding='utf-8').startswith('MIT License'):
        fail('LICENSE must contain the MIT license text')
    ok('public repository metadata and policy files are present')


def check_archive(archive: Path) -> None:
    if not archive.is_absolute():
        archive = (ROOT / archive).resolve()
    if not archive.is_file():
        fail(f'archive is missing: {archive}')
    if archive.suffix.lower() != '.zip':
        fail(f'archive is not a zip file: {archive}')

    try:
        with zipfile.ZipFile(archive, 'r') as zf:
            infos = zf.infolist()
            names = [info.filename for info in infos]
            if len(names) != len(set(names)):
                fail(f'archive contains duplicate names: {archive.name}')
            if names != list(ARCHIVE_FILES):
                fail(
                    f'archive is not the ordered runtime-and-license allowlist: {archive.name}; '
                    f'found={names}'
                )
            for info in infos:
                path = PurePosixPath(info.filename)
                if info.is_dir() or path.is_absolute() or '..' in path.parts:
                    fail(f'archive contains unsafe entry: {info.filename}')
                if is_forbidden_artifact(info.filename):
                    fail(f'archive contains forbidden artifact: {info.filename}')
                mode = (info.external_attr >> 16) & 0o170000
                if mode == stat.S_IFLNK:
                    fail(f'archive contains a symlink: {info.filename}')
                source = resolve_archive_file(info.filename).read_bytes()
                if zf.read(info.filename) != source:
                    fail(f'archive entry differs from source: {info.filename}')

            archived_manifest = json.loads(zf.read('manifest.json').decode('utf-8'))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        fail(f'archive is invalid: {archive}: {exc}')

    source_manifest = load_json(EXTENSION_DIR / 'manifest.json', 'manifest.json')
    if archived_manifest.get('version') != source_manifest.get('version'):
        fail(f'archive manifest version differs from source: {archive.name}')
    ok(f'archive matches the runtime-and-license allowlist byte-for-byte: {archive.name}')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--archive',
        type=Path,
        help='also validate one generated release ZIP',
    )
    parser.add_argument(
        '--public-tree',
        action='store_true',
        help='require the Git tracked tree to match the public repository allowlist',
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = load_json(EXTENSION_DIR / 'manifest.json', 'manifest.json')
    check_runtime_allowlist(manifest)
    check_package_metadata(manifest)
    check_public_metadata_files()
    if args.public_tree:
        check_public_tree()
    check_local_artifacts()
    check_sensitive_content()
    check_tokenizer_integrity()
    check_source_smoke()
    if args.archive:
        check_archive(args.archive)
    ok('public extension verification passed')


if __name__ == '__main__':
    main()

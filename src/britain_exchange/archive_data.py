"""Archive bulky data/ files to Supabase Storage (and restore on demand).

Why: keep the laptop thin while preserving checksummed raw/curated evidence
in a private bucket. Prefer the service-role key; the anon key works only if
storage policies for ``bx-data-archive`` allow it (dev/solo setups).

Env (repo ``.env``, never commit):
  SUPABASE_URL=https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...   # preferred
  # or SUPABASE_ANON_KEY=...      # fallback

Usage:
  uv run python -m britain_exchange.archive_data push data/housing/price-paid-2025
  uv run python -m britain_exchange.archive_data pull data/housing/price-paid-2025
  uv run python -m britain_exchange.archive_data status
  uv run python -m britain_exchange.archive_data push-largest --min-mb 10

Storage API: https://supabase.com/docs/reference/javascript/storage-from-upload
"""

from __future__ import annotations

import argparse
import base64
import gzip
import json
import os
import shutil
import tempfile
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

import httpx

from britain_exchange.checksum import sha256_file
from britain_exchange.db import load_repo_env
from britain_exchange.paths import DATA_ROOT, REPO_ROOT

BUCKET = "bx-data-archive"
INDEX_PATH = DATA_ROOT / "_archive_index.json"
# Supabase Free plan hard-caps each object at 50 MB.
# https://supabase.com/docs/guides/storage/uploads/file-limits
FREE_TIER_MAX_BYTES = 50 * 1024 * 1024
GZIP_THRESHOLD = 45 * 1024 * 1024  # leave headroom under the 50 MB cap
# Supabase asks for 6 MiB TUS chunks and resumable uploads above ~6 MiB.
# https://supabase.com/docs/guides/storage/uploads/resumable-uploads
TUS_CHUNK_SIZE = 6 * 1024 * 1024
RESUMABLE_THRESHOLD = 6 * 1024 * 1024
KEEP_NAME_FRAGMENTS = (
    "manifest.yaml",
    "README.md",
    "source_register.csv",
    "_archive_index.json",
)


@dataclass
class ArchiveEntry:
    path: str
    size: int
    checksum_sha256: str
    storage_key: str
    uploaded_at: str
    local_deleted: bool = False
    compression: str | None = None  # "gzip" when the stored object is path.gz
    stored_size: int | None = None
    stored_checksum_sha256: str | None = None


def _supabase_config() -> tuple[str, str]:
    load_repo_env()
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_KEY")
        or ""
    )
    if not url or not key:
        raise SystemExit(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "(or SUPABASE_ANON_KEY) in the repo .env file."
        )
    return url, key


def _headers(key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }


def _load_index() -> dict[str, ArchiveEntry]:
    if not INDEX_PATH.is_file():
        return {}
    raw = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    entries = raw.get("entries", raw) if isinstance(raw, dict) else raw
    out: dict[str, ArchiveEntry] = {}
    known = {f.name for f in ArchiveEntry.__dataclass_fields__.values()}
    for item in entries if isinstance(entries, list) else entries.values():
        filtered = {k: v for k, v in item.items() if k in known}
        entry = ArchiveEntry(**filtered)
        out[entry.path] = entry
    return out


def _gzip_file(source: Path, dest: Path) -> None:
    """Stream-compress so we do not hold 150+ MiB CSVs in RAM."""
    with source.open("rb") as src, gzip.open(dest, "wb", compresslevel=6) as out:
        shutil.copyfileobj(src, out, length=1024 * 1024)


def _save_index(entries: dict[str, ArchiveEntry]) -> None:
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "bucket": BUCKET,
        "updated_at": datetime.now(UTC).isoformat(),
        "entries": [asdict(e) for e in sorted(entries.values(), key=lambda e: e.path)],
    }
    INDEX_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _rel_data_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(DATA_ROOT.resolve()).as_posix()
    except ValueError as exc:
        raise SystemExit(f"Path must be under data/: {path}") from exc


def _storage_key(rel: str) -> str:
    return rel.lstrip("/")


def _iter_files(target: Path) -> list[Path]:
    if target.is_file():
        return [target]
    if not target.is_dir():
        raise SystemExit(f"Not found: {target}")
    files = sorted(p for p in target.rglob("*") if p.is_file())
    return files


def _should_keep_local_name(path: Path) -> bool:
    name = path.name
    return name in KEEP_NAME_FRAGMENTS or name.endswith(".md")


def _storage_api_base(project_url: str) -> str:
    """Prefer the direct storage host for large uploads (Supabase guidance)."""
    host = urlparse(project_url).hostname or ""
    # ref.supabase.co → ref.storage.supabase.co
    if host.endswith(".supabase.co") and ".storage." not in host:
        ref = host.split(".", 1)[0]
        return f"https://{ref}.storage.supabase.co"
    return project_url.rstrip("/")


def _b64_meta(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def _upload_file_standard(
    client: httpx.Client, base: str, key: str, path: Path, storage_key: str
) -> None:
    # https://supabase.com/docs/guides/storage/uploads/standard-uploads
    url = f"{base}/storage/v1/object/{BUCKET}/{storage_key}"
    headers = {
        **_headers(key),
        "x-upsert": "true",
        "Content-Type": "application/octet-stream",
    }
    with path.open("rb") as handle:
        response = client.post(url, headers=headers, content=handle, timeout=None)
    if response.status_code >= 400:
        raise RuntimeError(
            f"Upload failed {path}: HTTP {response.status_code} {response.text[:500]}"
        )


def _upload_file_resumable(
    client: httpx.Client, project_url: str, key: str, path: Path, storage_key: str
) -> None:
    """TUS resumable upload (required for files that trip the standard body limit)."""
    storage_base = _storage_api_base(project_url)
    create_url = f"{storage_base}/storage/v1/upload/resumable"
    size = path.stat().st_size
    metadata = ",".join(
        [
            f"bucketName {_b64_meta(BUCKET)}",
            f"objectName {_b64_meta(storage_key)}",
            f"contentType {_b64_meta('application/octet-stream')}",
            f"cacheControl {_b64_meta('3600')}",
        ]
    )
    create = client.post(
        create_url,
        headers={
            **_headers(key),
            "x-upsert": "true",
            "Tus-Resumable": "1.0.0",
            "Upload-Length": str(size),
            "Upload-Metadata": metadata,
        },
        timeout=60,
    )
    if create.status_code not in {200, 201}:
        raise RuntimeError(
            f"TUS create failed {path}: HTTP {create.status_code} {create.text[:500]}"
        )
    upload_url = create.headers.get("Location")
    if not upload_url:
        raise RuntimeError(f"TUS create missing Location header for {path}")

    offset = 0
    with path.open("rb") as handle:
        while offset < size:
            chunk = handle.read(TUS_CHUNK_SIZE)
            if not chunk:
                break
            patch = client.patch(
                upload_url,
                headers={
                    **_headers(key),
                    "Tus-Resumable": "1.0.0",
                    "Upload-Offset": str(offset),
                    "Content-Type": "application/offset+octet-stream",
                    "Content-Length": str(len(chunk)),
                },
                content=chunk,
                timeout=None,
            )
            if patch.status_code not in {200, 204}:
                raise RuntimeError(
                    f"TUS patch failed {path} @{offset}: "
                    f"HTTP {patch.status_code} {patch.text[:500]}"
                )
            new_offset = patch.headers.get("Upload-Offset")
            offset = int(new_offset) if new_offset else offset + len(chunk)


def _upload_file(client: httpx.Client, base: str, key: str, path: Path, storage_key: str) -> None:
    if path.stat().st_size >= RESUMABLE_THRESHOLD:
        _upload_file_resumable(client, base, key, path, storage_key)
    else:
        _upload_file_standard(client, base, key, path, storage_key)


def _download_file(client: httpx.Client, base: str, key: str, storage_key: str, dest: Path) -> None:
    url = f"{base}/storage/v1/object/{BUCKET}/{storage_key}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with client.stream("GET", url, headers=_headers(key), timeout=None) as response:
        if response.status_code >= 400:
            body = response.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(f"Download failed {storage_key}: HTTP {response.status_code} {body}")
        with dest.open("wb") as handle:
            for chunk in response.iter_bytes(1024 * 1024):
                handle.write(chunk)


def _prepare_upload_blob(path: Path) -> tuple[Path, str, str | None, Path | None]:
    """Return (upload_path, storage_key_suffix_path, compression, temp_to_cleanup).

    Free-tier objects must stay under 50 MB, so large files are gzipped first.
    """
    rel = _rel_data_path(path)
    size = path.stat().st_size
    if size < GZIP_THRESHOLD:
        return path, _storage_key(rel), None, None

    tmp = Path(tempfile.mkstemp(prefix="bx-archive-", suffix=".gz")[1])
    print(f"gzip  {rel} ({size // (1024 * 1024)} MiB) …")
    _gzip_file(path, tmp)
    stored = tmp.stat().st_size
    if stored >= FREE_TIER_MAX_BYTES:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(
            f"{rel} is still {stored // (1024 * 1024)} MiB after gzip "
            f"(Free plan max is 50 MB). Split the file or upgrade Supabase."
        )
    print(f"gzip  → {stored // (1024 * 1024)} MiB")
    return tmp, _storage_key(rel) + ".gz", "gzip", tmp


def push_path(target: Path, *, delete_local: bool = True, keep_manifests: bool = True) -> int:
    base, key = _supabase_config()
    entries = _load_index()
    files = _iter_files(target.resolve())
    if not files:
        print(f"No files under {target}")
        return 0

    verify_root = REPO_ROOT / ".archive_verify"
    verify_root.mkdir(exist_ok=True)
    pushed = 0

    with httpx.Client() as client:
        for path in files:
            if keep_manifests and _should_keep_local_name(path):
                print(f"keep  {path.relative_to(REPO_ROOT)}")
                continue
            rel = _rel_data_path(path)
            checksum = sha256_file(path)
            size = path.stat().st_size
            upload_path, storage_key, compression, tmp_blob = _prepare_upload_blob(path)
            stored_checksum = sha256_file(upload_path)
            stored_size = upload_path.stat().st_size
            print(f"push  {rel} ({size // (1024 * 1024)} MiB → store {stored_size // (1024 * 1024)} MiB) …")
            try:
                _upload_file(client, base, key, upload_path, storage_key)
                verify_tmp = verify_root / (Path(rel).name + (".gz" if compression else ""))
                _download_file(client, base, key, storage_key, verify_tmp)
                got = sha256_file(verify_tmp)
                verify_tmp.unlink(missing_ok=True)
                if got != stored_checksum:
                    raise RuntimeError(
                        f"Checksum mismatch for {storage_key}: "
                        f"remote={got} local={stored_checksum}"
                    )
            finally:
                if tmp_blob is not None:
                    tmp_blob.unlink(missing_ok=True)

            entry = ArchiveEntry(
                path=f"data/{rel}",
                size=size,
                checksum_sha256=checksum,
                storage_key=storage_key,
                uploaded_at=datetime.now(UTC).isoformat(),
                local_deleted=False,
                compression=compression,
                stored_size=stored_size,
                stored_checksum_sha256=stored_checksum,
            )
            if delete_local:
                path.unlink()
                entry.local_deleted = True
                print(f"ok    {rel} archived + local deleted")
            else:
                print(f"ok    {rel} archived (local kept)")
            entries[entry.path] = entry
            pushed += 1
            _save_index(entries)

    # Drop empty directories left behind after deletes.
    if delete_local and target.is_dir():
        for dirpath, dirnames, filenames in os.walk(target, topdown=False):
            if not dirnames and not filenames:
                Path(dirpath).rmdir()

    if verify_root.exists() and not any(verify_root.iterdir()):
        verify_root.rmdir()

    print(f"Done: {pushed} file(s). Index → {INDEX_PATH.relative_to(REPO_ROOT)}")
    return pushed


def pull_path(target: str) -> int:
    base, key = _supabase_config()
    entries = _load_index()
    needle = target.replace("\\", "/").lstrip("./")
    if not needle.startswith("data/"):
        needle = f"data/{needle}"

    matches = [
        e
        for e in entries.values()
        if e.path == needle or e.path.startswith(needle.rstrip("/") + "/")
    ]
    if not matches:
        # Allow pull by storage key / relative fragment.
        matches = [e for e in entries.values() if needle in e.path or needle in e.storage_key]
    if not matches:
        raise SystemExit(f"No archive index entries match {target!r}. Run status.")

    pulled = 0
    with httpx.Client() as client:
        for entry in sorted(matches, key=lambda e: e.path):
            dest = REPO_ROOT / entry.path
            if dest.is_file() and sha256_file(dest) == entry.checksum_sha256:
                print(f"skip  {entry.path} (already present)")
                continue
            print(f"pull  {entry.path} …")
            dest.parent.mkdir(parents=True, exist_ok=True)
            if entry.compression == "gzip":
                gz_tmp = Path(tempfile.mkstemp(prefix="bx-pull-", suffix=".gz")[1])
                try:
                    _download_file(client, base, key, entry.storage_key, gz_tmp)
                    with gzip.open(gz_tmp, "rb") as src, dest.open("wb") as out:
                        shutil.copyfileobj(src, out, length=1024 * 1024)
                finally:
                    gz_tmp.unlink(missing_ok=True)
            else:
                _download_file(client, base, key, entry.storage_key, dest)
            got = sha256_file(dest)
            if got != entry.checksum_sha256:
                dest.unlink(missing_ok=True)
                raise RuntimeError(f"Checksum mismatch after pull: {entry.path}")
            entry.local_deleted = False
            entries[entry.path] = entry
            pulled += 1
            print(f"ok    {entry.path}")
    _save_index(entries)
    print(f"Done: {pulled} file(s) restored.")
    return pulled


def status() -> None:
    entries = _load_index()
    if not entries:
        print("Archive index empty (no data/_archive_index.json entries yet).")
        return
    total = sum(e.size for e in entries.values())
    deleted = sum(1 for e in entries.values() if e.local_deleted)
    print(f"{len(entries)} archived file(s), {total / (1024 ** 2):.1f} MiB total, "
          f"{deleted} deleted locally.")
    for entry in sorted(entries.values(), key=lambda e: -e.size)[:30]:
        flag = "cloud-only" if entry.local_deleted else "local+cloud"
        print(f"  {entry.size / (1024 ** 2):7.1f} MiB  {flag:11}  {entry.path}")


def push_largest(*, min_mb: float, delete_local: bool) -> int:
    """Archive large files under data/, skipping thin energy UI curated JSON/CSV under  min size is enough."""
    min_bytes = int(min_mb * 1024 * 1024)
    candidates: list[Path] = []
    for path in DATA_ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path == INDEX_PATH:
            continue
        if _should_keep_local_name(path):
            continue
        # Keep small energy curated assets the Next.js loaders read from disk.
        rel = path.relative_to(DATA_ROOT).as_posix()
        if rel.startswith("energy/") and "/curated/" in rel and path.stat().st_size < 15 * 1024 * 1024:
            continue
        if path.stat().st_size >= min_bytes:
            candidates.append(path)
    candidates.sort(key=lambda p: p.stat().st_size, reverse=True)
    if not candidates:
        print(f"No files ≥ {min_mb} MiB to archive.")
        return 0
    print(f"Archiving {len(candidates)} file(s) ≥ {min_mb} MiB …")
    total = 0
    for path in candidates:
        total += push_path(path, delete_local=delete_local, keep_manifests=False)
    return total


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_push = sub.add_parser("push", help="Upload path, verify checksum, delete local copy")
    p_push.add_argument("path", type=Path, help="File or directory under data/")
    p_push.add_argument(
        "--keep-local",
        action="store_true",
        help="Upload + verify but do not delete the local file",
    )

    p_pull = sub.add_parser("pull", help="Restore archived path(s) from the index")
    p_pull.add_argument("path", help="data/... path or prefix")

    sub.add_parser("status", help="Show archive index summary")

    p_big = sub.add_parser("push-largest", help="Archive every data/ file over a size floor")
    p_big.add_argument("--min-mb", type=float, default=10.0)
    p_big.add_argument("--keep-local", action="store_true")

    args = parser.parse_args(argv)
    if args.cmd == "push":
        push_path(args.path, delete_local=not args.keep_local)
    elif args.cmd == "pull":
        pull_path(args.path)
    elif args.cmd == "status":
        status()
    elif args.cmd == "push-largest":
        push_largest(min_mb=args.min_mb, delete_local=not args.keep_local)
    else:
        parser.error(f"Unknown command {args.cmd}")


if __name__ == "__main__":
    main()

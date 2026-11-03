"""Checksum helpers for raw evidence (SHA-256).

Prefer hashing files after download so manifests stay reproducible.
See https://docs.python.org/3/library/hashlib.html
"""

from __future__ import annotations

import hashlib
from pathlib import Path


def sha256_bytes(data: bytes) -> str:
    """Return hex SHA-256 for an in-memory payload."""
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path, *, chunk_size: int = 1024 * 1024) -> str:
    """Return hex SHA-256 for a file on disk (streams in chunks)."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()

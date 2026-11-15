"""Low-level helpers for *browser-pinned* DMO raw files (any format).

Why this exists
---------------
The DMO website sits behind a bot challenge (Perfdive / ShieldSquare), so
``Connector.fetch_url`` cannot download its exports or reports reliably. A person
downloads the file in a browser and drops it in ``raw/``.

This module owns checksum verification + path-based ``RawEvidence``. Excel
(``.xls``) connectors use ``dmo_common.pinned_evidence``, which calls
``verify_pinned_file`` here so SHA256SUMS logic lives in one place.

Best practices: ``pathlib.Path``, type hints, hash from disk, raise on mismatch
(https://docs.python.org/3/library/pathlib.html ·
https://docs.python.org/3/library/hashlib.html).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from britain_exchange.checksum import sha256_file
from britain_exchange.manifest import RawEvidence


def read_sha256sums(sums_file: Path) -> dict[str, str]:
    """Read a ``sha256sum``-style file: ``<hex>  <filename>`` per line."""
    out: dict[str, str] = {}
    for line in sums_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        digest, _, name = line.partition("  ")
        if not digest or not name:
            raise ValueError(f"Bad SHA256SUMS line in {sums_file}: {line!r}")
        out[name.strip()] = digest.strip().lower()
    return out


def verify_pinned_file(path: Path) -> str:
    """Return the file's sha256 after checking it matches ``SHA256SUMS`` beside it."""
    if not path.is_file():
        raise FileNotFoundError(f"Pinned raw file missing: {path}")
    sums = read_sha256sums(path.parent / "SHA256SUMS")
    expected = sums.get(path.name)
    if expected is None:
        raise ValueError(f"{path.name} is not listed in {path.parent / 'SHA256SUMS'}")
    actual = sha256_file(path)
    if actual != expected:
        raise RuntimeError(
            f"Checksum mismatch for {path.name}: file={actual} SHA256SUMS={expected}. "
            "The pin changed; re-pin deliberately and update SHA256SUMS."
        )
    return actual


def pinned_evidence(
    path: Path,
    data_root: Path,
    *,
    source_url: str,
    content_type: str,
    official_release_date: str = "",
) -> RawEvidence:
    """Build ``RawEvidence`` for a browser-pinned file (no HTTP involved).

    ``retrieved_at`` is the pinned file's modified time — an honest stand-in for the
    browser download time. ``http_status`` stays ``None`` because nothing was fetched
    by the connector.
    """
    checksum = verify_pinned_file(path)
    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    return RawEvidence(
        path=str(path.relative_to(data_root)),
        retrieved_at=mtime.isoformat(),
        checksum_sha256=checksum,
        content_type=content_type,
        official_release_date=official_release_date,
        http_status=None,
        source_url=source_url,
    )

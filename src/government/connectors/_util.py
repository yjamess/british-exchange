"""Small helpers shared by government connectors."""

from __future__ import annotations

import calendar
from datetime import datetime, timezone
from pathlib import Path

from britain_exchange.checksum import sha256_file
from britain_exchange.manifest import RawEvidence


def year_bounds(year: int) -> tuple[str, str]:
    return f"{year:04d}-01-01", f"{year:04d}-12-31"


def fiscal_year_bounds(label: str) -> tuple[str, str]:
    """Map HMT labels like ``2021-22`` → ISO bounds (1 Apr–31 Mar)."""
    start_year = int(label.strip()[:4])
    end_year = start_year + 1
    return f"{start_year:04d}-04-01", f"{end_year:04d}-03-31"


def month_bounds(year: int, month: int) -> tuple[str, str]:
    last = calendar.monthrange(year, month)[1]
    return f"{year:04d}-{month:02d}-01", f"{year:04d}-{month:02d}-{last:02d}"


def evidence_from_file(
    data_root: Path,
    relative: str,
    *,
    source_url: str,
    content_type: str,
    official_release_date: str = "",
) -> RawEvidence:
    path = data_root / relative
    if not path.is_file():
        raise FileNotFoundError(f"Pinned raw missing: {path}")
    return RawEvidence(
        path=relative,
        retrieved_at=datetime.now(timezone.utc).isoformat(),
        checksum_sha256=sha256_file(path),
        content_type=content_type,
        official_release_date=official_release_date,
        http_status=None,
        source_url=source_url,
    )

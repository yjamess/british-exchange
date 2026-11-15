"""Shared helpers for UK DMO (Debt Management Office) pinned ``.xls`` reports.

Why this module exists
----------------------
DMO sits behind a bot challenge (captcha), so connectors **cannot download**
the reports. A person saves the file in a browser and pins it under
``data/economy/<indicator>/raw/``. These helpers let each connector:

1. verify the pinned file against ``raw/SHA256SUMS`` (fail loudly if edited),
2. read the legacy ``.xls`` format with ``xlrd`` (``openpyxl`` cannot),
3. build ``RawEvidence`` for the manifest without touching the raw file.

Best practices: ``pathlib`` for paths, type hints everywhere, explicit errors
instead of silent fallbacks.
Refs: https://docs.python.org/3/library/pathlib.html ·
https://xlrd.readthedocs.io/ · https://peps.python.org/pep-0008/
"""

from __future__ import annotations

from pathlib import Path

import xlrd
from xlrd.sheet import Sheet

from britain_exchange.manifest import RawEvidence
from economy.connectors.dmo_pins import verify_pinned_file

DMO_TERMS_URL = "https://www.dmo.gov.uk/terms-of-use/"
LICENCE = "Open Government Licence v3.0"
UK_CODE = "K02000001"
UK_LABEL = "United Kingdom"
XLS_CONTENT_TYPE = "application/vnd.ms-excel"


def pinned_evidence(
    data_root: Path,
    filename: str,
    *,
    retrieved_on: str,
    official_release_date: str,
    source_url: str,
) -> RawEvidence:
    """Verify the pinned ``.xls`` and describe it for the manifest.

    ``retrieved_on`` is the human pin date (ISO ``YYYY-MM-DD``); DMO blocks
    scripts, so it is recorded from the pin README rather than a download time.
    Checksum verification is shared with ``dmo_pins.verify_pinned_file``.
    """
    path = data_root / "raw" / filename
    checksum = verify_pinned_file(path)
    return RawEvidence(
        path=str(path.relative_to(data_root)),
        retrieved_at=f"{retrieved_on}T00:00:00+00:00",
        checksum_sha256=checksum,
        content_type=XLS_CONTENT_TYPE,
        official_release_date=official_release_date,
        http_status=None,  # browser download behind captcha, not an HTTP fetch
        source_url=source_url,
    )


def open_sheet(path: Path) -> tuple[Sheet, int]:
    """Open the first sheet of an ``.xls`` workbook; return ``(sheet, datemode)``."""
    book = xlrd.open_workbook(str(path))
    return book.sheet_by_index(0), book.datemode


def excel_date_to_iso(serial: float, datemode: int) -> str:
    """Convert an Excel serial date number to ``YYYY-MM-DD``."""
    return xlrd.xldate_as_datetime(serial, datemode).date().isoformat()


def parse_number(cell: object) -> float:
    """Parse a numeric cell that may be a float or a string like ``'152,286'``."""
    if isinstance(cell, (int, float)):
        return float(cell)
    text = str(cell).strip().replace(",", "")
    if not text:
        raise ValueError("empty numeric cell")
    return float(text)


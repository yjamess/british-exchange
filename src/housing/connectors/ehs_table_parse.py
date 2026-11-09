"""Shared helpers for English Housing Survey DA live tables (dwellings).

EHS DA sheets are year-named (``2024``, ``2023``, …). Tenure blocks are
owner occupied · private rented · social rented · all tenures, each with
several measure columns. We read the ``all dwellings`` summary row.
"""

from __future__ import annotations

import re
from pathlib import Path

from housing.ods_util import read_ods_sheet

YEAR_SHEET_RE = re.compile(r"^\d{4}$")
MISSING = {"", "u", "U", "..", "-", "–", "—"}


def year_sheets(path: Path) -> list[str]:
    """Return year sheet names newest-first (uses ODS content.xml via read attempts)."""
    import zipfile
    import xml.etree.ElementTree as ET

    ns = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    names = [
        t.get(f"{{{ns}}}name") or ""
        for t in root.findall(f".//{{{ns}}}table")
    ]
    years = sorted((n for n in names if YEAR_SHEET_RE.match(n)), reverse=True)
    return years


def parse_pct(raw: str) -> float | None:
    text = raw.strip().replace(",", "")
    if not text or text in MISSING:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def all_dwellings_row(rows: list[list[str]]) -> list[str] | None:
    """Last ``all dwellings`` data row (summary), ignoring the title row."""
    found: list[str] | None = None
    for i, row in enumerate(rows):
        if not row:
            continue
        label = row[0].strip().lower()
        if label == "all dwellings" and i > 5:
            found = row
    return found


def tenure_pcts(
    row: list[str],
    *,
    oo_col: int,
    prs_col: int,
    social_col: int,
    all_col: int,
) -> dict[str, float]:
    out: dict[str, float] = {}
    mapping = {
        "owner-occupied": oo_col,
        "private-rented": prs_col,
        "social-rented": social_col,
        "all-tenures": all_col,
    }
    for slug, col in mapping.items():
        if col >= len(row):
            continue
        value = parse_pct(row[col])
        if value is not None:
            out[slug] = value
    return out


def iter_year_rows(path: Path) -> list[tuple[int, list[str]]]:
    """``(year, all-dwellings row)`` for each year sheet that has a summary row."""
    results: list[tuple[int, list[str]]] = []
    for sheet in year_sheets(path):
        rows = read_ods_sheet(path, sheet)
        row = all_dwellings_row(rows)
        if row is None:
            continue
        results.append((int(sheet), row))
    results.sort(key=lambda x: x[0])
    return results

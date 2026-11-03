"""Minimal ODS (OpenDocument Spreadsheet) reader for MHCLG live tables.

Approach: ODS files are ZIP archives with ``content.xml``. We expand repeated
cells carefully and return plain Python lists — enough for national live tables
without adding a heavy dependency.

Refs:
- ODF table model: https://docs.oasis-open.org/office/OpenDocument/v1.3/
- zipfile: https://docs.python.org/3/library/zipfile.html
"""

from __future__ import annotations

import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

_TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
_NS = {
    "table": _TABLE_NS,
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}


def read_ods_sheet(path: Path, sheet_name: str) -> list[list[str]]:
    """Return rows for one named sheet as lists of cell text."""
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))

    target = None
    for sheet in root.findall(".//table:table", _NS):
        name = sheet.attrib.get(f"{{{_TABLE_NS}}}name")
        if name == sheet_name:
            target = sheet
            break
    if target is None:
        names = [
            s.attrib.get(f"{{{_TABLE_NS}}}name")
            for s in root.findall(".//table:table", _NS)
        ]
        raise ValueError(f"Sheet {sheet_name!r} not found in {path.name}; got {names}")

    rows: list[list[str]] = []
    for row_el in target.findall("table:table-row", _NS):
        row_repeat = int(
            row_el.attrib.get(f"{{{_TABLE_NS}}}number-rows-repeated", "1")
        )
        cells: list[str] = []
        for cell in row_el.findall("table:table-cell", _NS):
            text = "".join(cell.itertext())
            col_repeat = int(
                cell.attrib.get(f"{{{_TABLE_NS}}}number-columns-repeated", "1")
            )
            # Guard against huge empty trailing repeats in MHCLG files.
            if col_repeat > 50 and not text.strip():
                continue
            col_repeat = min(col_repeat, 30)
            cells.extend([text] * col_repeat)
        for _ in range(min(row_repeat, 20) if not any(c.strip() for c in cells) else row_repeat):
            rows.append(cells)
            if row_repeat > 1 and not any(c.strip() for c in cells):
                break
    return rows

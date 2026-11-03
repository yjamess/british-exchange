"""Minimal ODS table reader (no extra deps).

Parses ``content.xml`` from an OpenDocument Spreadsheet.
https://docs.oasis-open.org/office/OpenDocument/v1.3/
"""

from __future__ import annotations

import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

_TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
_TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"
_OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"
_NS = {"table": _TABLE_NS, "text": _TEXT_NS, "office": _OFFICE_NS}


def _cell_value(tc: ET.Element) -> str:
    office_val = tc.attrib.get(f"{{{_OFFICE_NS}}}value")
    text_el = tc.find(".//text:p", _NS)
    text_val = "".join(text_el.itertext()) if text_el is not None else ""
    return office_val if office_val is not None else text_val


def _rows_from_table(table: ET.Element, *, max_rows: int | None = None) -> list[list[str]]:
    rows: list[list[str]] = []
    for tr in table.findall("table:table-row", _NS):
        cells: list[str] = []
        for tc in tr.findall("table:table-cell", _NS):
            repeat = int(tc.attrib.get(f"{{{_TABLE_NS}}}number-columns-repeated", "1"))
            repeat = min(repeat, 80)
            value = _cell_value(tc)
            cells.extend([value] * repeat)
        if any(c.strip() for c in cells):
            rows.append(cells)
        if max_rows is not None and len(rows) >= max_rows:
            break
    return rows


def list_ods_tables(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    names: list[str] = []
    for table in root.findall(".//table:table", _NS):
        names.append(table.attrib.get(f"{{{_TABLE_NS}}}name") or "")
    return names


def read_ods_rows(
    path: Path,
    *,
    table_name: str | None = None,
    max_rows: int | None = None,
) -> list[list[str]]:
    """Return rows from one ODS table (by name, or the largest non-cover table)."""
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))

    tables = root.findall(".//table:table", _NS)
    if not tables:
        raise ValueError(f"No tables in ODS: {path}")

    chosen: ET.Element | None = None
    if table_name:
        for table in tables:
            name = table.attrib.get(f"{{{_TABLE_NS}}}name") or ""
            if name == table_name:
                chosen = table
                break
        if chosen is None:
            raise ValueError(f"Table {table_name!r} not in {list_ods_tables(path)}")
    else:
        # Prefer the sheet with the most non-empty rows that is not Cover_*
        best: tuple[int, ET.Element] | None = None
        for table in tables:
            name = (table.attrib.get(f"{{{_TABLE_NS}}}name") or "").lower()
            if name.startswith("cover") or "contents" in name or name == "notes":
                continue
            nrows = len(_rows_from_table(table))
            if best is None or nrows > best[0]:
                best = (nrows, table)
        chosen = best[1] if best else tables[-1]

    return _rows_from_table(chosen, max_rows=max_rows)

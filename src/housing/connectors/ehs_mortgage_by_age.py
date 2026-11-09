"""English Housing Survey FA2555 — mortgage cost by age of the household reference person.

The ONS price-to-earnings-by-age chart stops in 2016. FA2555 is the current England
survey table: weekly mortgage payment, and that payment as a percentage of household
income, for owners buying with a mortgage.

ODS is a zip of XML. The standard library reads it; we do not add a spreadsheet package
for one table. https://docs.python.org/3/library/zipfile.html

Run from the repo root:

    uv run python -m housing.connectors.ehs_mortgage_by_age
"""

from __future__ import annotations

import json
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "data/housing/ehs-mortgage-by-age/raw/FA2555.ods"
OUT = ROOT / "data/housing/ehs-mortgage-by-age/curated/by-age.json"

SOURCE_URL = (
    "https://www.gov.uk/government/statistical-data-sets/"
    "owner-occupiers-recent-first-time-buyers-and-second-homes"
)
COLLECTION_URL = "https://www.gov.uk/government/collections/english-housing-survey"
TABLE = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
TEXT = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"

AGES = ("16 to 24", "25 to 34", "35 to 44", "45 to 54", "55 to 64", "65 and over", "all")


def _cell_text(cell: ET.Element) -> str:
    parts: list[str] = []
    for node in cell.iter(f"{TEXT}p"):
        if node.text:
            parts.append(node.text)
        for child in list(node):
            if child.text:
                parts.append(child.text)
            if child.tail:
                parts.append(child.tail)
    return " ".join(parts).strip()


def _row_values(row: ET.Element) -> list[str]:
    values: list[str] = []
    for cell in row.findall(f"{TABLE}table-cell"):
        repeated = int(cell.get(f"{TABLE}number-columns-repeated") or "1")
        text = _cell_text(cell)
        # Empty columns are repeated across the unused sheet width. Keep one blank.
        values.extend([text] * (1 if text == "" else min(repeated, 12)))
    return values


def _number(raw: str) -> float | None:
    cleaned = raw.replace(",", "").replace("£", "").strip()
    if cleaned.lower() in {"", "u", ":", "..", "-"}:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _age_rows(sheet: ET.Element) -> list[dict[str, object]]:
    rows = [_row_values(row) for row in sheet.findall(f"{TABLE}table-row")]
    start = next((i for i, row in enumerate(rows) if row and row[0] == "age of HRP"), None)
    if start is None:
        return []
    found: list[dict[str, object]] = []
    for row in rows[start + 1 :]:
        label = row[0] if row else ""
        if label not in AGES:
            if found:
                break
            continue
        # Columns after the label: six payment bands, household count, mean £/week,
        # mortgage cost as % of income, sample size.
        tail = row[1:]
        found.append(
            {
                "age": label,
                "householdsThousands": _number(tail[6]) if len(tail) > 6 else None,
                "meanWeekly": _number(tail[7]) if len(tail) > 7 else None,
                "incomeRatio": _number(tail[8]) if len(tail) > 8 else None,
                "sample": _number(tail[9]) if len(tail) > 9 else None,
            }
        )
    return found


def parse_ods(path: Path) -> dict[str, object]:
    with zipfile.ZipFile(path) as package:
        root = ET.fromstring(package.read("content.xml"))
    years: list[dict[str, object]] = []
    for sheet in root.findall(f".//{TABLE}table"):
        name = sheet.get(f"{TABLE}name") or ""
        if not name[:4].isdigit():
            continue
        rows = _age_rows(sheet)
        if rows:
            years.append({"year": name, "rows": rows})
    years.sort(key=lambda item: str(item["year"]))
    return {
        "publisher": "Ministry of Housing, Communities and Local Government",
        "series": "FA2555",
        "title": "Mortgage payment by age of household reference person",
        "geography": "England",
        "url": SOURCE_URL,
        "collectionUrl": COLLECTION_URL,
        "unit": "mortgage payment as % of household income",
        "note": (
            "Owners buying with a mortgage. The ratio is the mortgage payment as a "
            "percentage of gross household income. It is not a house-price-to-earnings "
            "ratio, and it is not rent. A blank cell was published as unreliable (u)."
        ),
        "years": years,
    }


def main() -> None:
    if not RAW.is_file():
        raise FileNotFoundError(f"Pin the FA2555 workbook at {RAW}")
    payload = parse_ods(RAW)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    year_rows = payload["years"]
    latest = year_rows[-1]["year"] if isinstance(year_rows, list) and year_rows else "none"
    count = len(year_rows) if isinstance(year_rows, list) else 0
    print(f"wrote {OUT.relative_to(ROOT)} years={count} latest={latest}")


if __name__ == "__main__":
    main()

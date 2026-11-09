"""Build afford-atlas.json from AFF1 Tables 1c (regions) + 5c (local authorities).

Approach (beginner-friendly):
1. Read the pinned ONS AFF1 workbook already used by house_price_to_earnings.
2. Collect calendar-year columns (skip the 5-year average).
3. Emit one area row per geography with measure pte-median (workplace PTE ratio).
4. Write curated/afford-atlas.json for the Housing map (same Atlas shape as HPI/rent).

Official source: ONS Housing affordability in England and Wales (AFF1).
Docs: https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoworkplacebasedearningslowerquartileandmedian
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

from housing.connectors.house_price_to_earnings import PINNED_RAW, SOURCE_LANDING, SOURCE_VERSION

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data" / "housing" / "house-price-to-earnings-ratio"
OUT = DATA / "curated" / "afford-atlas.json"
MISSING = {"", "[x]", "[z]", "x", "z", None}


def _year_columns(header: list[Any]) -> list[tuple[int, int]]:
    """Return (column_index, year) for calendar-year headers only."""
    cols: list[tuple[int, int]] = []
    for idx, header_cell in enumerate(header):
        if header_cell is None:
            continue
        text = str(header_cell).strip()
        if text.isdigit():
            cols.append((idx, int(text)))
    return cols


def _parse_number(raw: Any) -> float | None:
    if raw in MISSING:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _level(code: str) -> str:
    if code.startswith(("E06", "E07", "E08", "E09", "W06")):
        return "local"
    if code.startswith("E12"):
        return "region"
    if code == "K04000001":
        return "uk"
    if code in {"E92000001", "W92000004"}:
        return "nation"
    return "local"


def _values_for_years(row: tuple[Any, ...], year_cols: list[tuple[int, int]], years: list[int]) -> list[float | None]:
    by_year = {year: _parse_number(row[idx] if idx < len(row) else None) for idx, year in year_cols}
    return [by_year.get(year) for year in years]


def build_afford_atlas(workbook: Path) -> dict[str, Any]:
    wb = load_workbook(workbook, data_only=True, read_only=True)
    try:
        if "1c" not in wb.sheetnames or "5c" not in wb.sheetnames:
            raise ValueError(f"Need sheets 1c and 5c; got {wb.sheetnames}")

        ws1 = wb["1c"]
        header1 = [cell.value for cell in next(ws1.iter_rows(min_row=2, max_row=2))]
        year_cols_1 = _year_columns(header1)

        ws5 = wb["5c"]
        header5 = [cell.value for cell in next(ws5.iter_rows(min_row=2, max_row=2))]
        year_cols_5 = _year_columns(header5)

        years = sorted(set(y for _, y in year_cols_1) & set(y for _, y in year_cols_5))
        if not years:
            raise ValueError("No overlapping year columns between Tables 1c and 5c")

        areas: dict[str, dict[str, Any]] = {}

        for row in ws1.iter_rows(min_row=3, values_only=True):
            if not row or row[0] is None:
                continue
            code = str(row[0]).strip()
            if not code or code in MISSING:
                continue
            label = str(row[1]).strip() if row[1] is not None else code
            areas[code] = {
                "code": code,
                "name": label,
                "level": _level(code),
                "values": {"pte-median": _values_for_years(row, year_cols_1, years)},
            }

        for row in ws5.iter_rows(min_row=3, values_only=True):
            if not row or len(row) < 4 or row[2] is None:
                continue
            code = str(row[2]).strip()
            if not code or code in MISSING:
                continue
            label = str(row[3]).strip() if row[3] is not None else code
            areas[code] = {
                "code": code,
                "name": label,
                "level": "local",
                "values": {"pte-median": _values_for_years(row, year_cols_5, years)},
            }

        return {
            "months": [f"{y:04d}-01-01" for y in years],
            "measure": "pte-median",
            "measures": [
                {
                    "id": "pte-median",
                    "label": "Median price to workplace earnings",
                    "unit": "ratio",
                }
            ],
            "areas": sorted(areas.values(), key=lambda a: a["name"]),
            "source": {
                "publisher": "ONS",
                "url": SOURCE_LANDING,
                "release": SOURCE_VERSION,
            },
            "caveats": [
                "Workplace-based median ratio (AFF1 Table 5c local / 1c region).",
                "England and Wales only — Scotland and Northern Ireland are not in AFF1.",
                "House prices are year ending September; earnings are April ASHE.",
            ],
        }
    finally:
        wb.close()


def main() -> None:
    workbook = DATA / PINNED_RAW
    if not workbook.is_file():
        raise FileNotFoundError(workbook)
    atlas = build_afford_atlas(workbook)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(atlas, separators=(",", ":")), encoding="utf-8")
    locals_n = sum(1 for a in atlas["areas"] if a["level"] == "local")
    eng = next((a for a in atlas["areas"] if a["code"] == "E92000001"), None)
    eng_last = eng["values"]["pte-median"][-1] if eng else None
    print(
        f"wrote {OUT.relative_to(ROOT)} areas={len(atlas['areas'])} "
        f"local={locals_n} years={len(atlas['months'])} "
        f"last={atlas['months'][-1]} england={eng_last}"
    )


if __name__ == "__main__":
    main()

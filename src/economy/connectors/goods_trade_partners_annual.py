"""Build the Trading World partner pack from the Ready goods-by-partner series.

Pack id: ``economy.goods-trade-partners-annual`` (served via ``/packs``).

Approach:
1. Read the curated ``goods-trade-by-partner`` observations (ONS BoP all-countries,
   monthly, seasonally adjusted, £ million current prices).
2. Keep ISO 3166-1 alpha-2 partner rows only (drop EU27 / Non-EU / World totals and
   ONS residual groupings).
3. Sum the months in each calendar year per partner and flow. A year with fewer
   than twelve published months is kept as year-to-date and flagged ``partial``.
4. Keep the largest ``TOP_N`` partners per year and flow so the pack stays small.

Earlier versions of this pack held the December value only, labelled as the year.
That understated every partner twelvefold; this builder replaces it.

Run:  uv run python -m economy.connectors.goods_trade_partners_annual
Then: uv run python -m britain_exchange.archive_data push \
        data/economy/goods-trade-partner-commodity/curated/partners_annual.json --keep-local
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from britain_exchange.paths import ECONOMY_DATA

PACK_ID = "economy.goods-trade-partners-annual"
SOURCE_CSV = ECONOMY_DATA / "goods-trade-by-partner" / "curated" / "observations.csv"
OUT_JSON = ECONOMY_DATA / "goods-trade-partner-commodity" / "curated" / "partners_annual.json"
TOP_N = 80
FLOWS = ("exports", "imports")


def note_part(notes: str, key: str) -> str:
    for chunk in notes.split(";"):
        chunk = chunk.strip()
        if chunk.startswith(f"{key}="):
            return chunk[len(key) + 1 :].strip()
    return ""


def is_country(code: str) -> bool:
    """ISO alpha-2 only: drops B5 (EU27), D5 (Non-EU), W1 (World) and residual groups."""
    return len(code) == 2 and code.isalpha() and code.upper() == code


def build(source: Path = SOURCE_CSV) -> dict[str, Any]:
    if not source.exists():
        raise FileNotFoundError(
            f"{source} missing — run `uv run python -m britain_exchange.archive_data pull "
            "data/economy/goods-trade-by-partner` first."
        )
    # (year, flow, code) -> [sum, months, label, last period]
    acc: dict[tuple[str, str, str], list[Any]] = {}
    months_in_year: dict[str, set[str]] = defaultdict(set)
    source_version = ""
    with source.open(newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            notes = row.get("notes") or ""
            flow = note_part(notes, "flow")
            code = (row.get("geography_code") or "").strip()
            if flow not in FLOWS or not is_country(code):
                continue
            if note_part(notes, "basis") not in ("", "cp"):
                continue
            raw = (row.get("value") or "").strip()
            if not raw:
                continue
            period = row["period_start"][:10]
            year = period[:4]
            months_in_year[year].add(period[:7])
            source_version = source_version or (row.get("source_version") or "")
            key = (year, flow, code)
            slot = acc.setdefault(key, [0.0, 0, row.get("geography_label") or code, period])
            slot[0] += float(raw)
            slot[1] += 1
            slot[3] = max(slot[3], period)

    years = sorted(months_in_year)
    by_year: dict[str, dict[str, list[dict[str, Any]]]] = {}
    coverage: dict[str, dict[str, Any]] = {}
    for year in years:
        months = sorted(months_in_year[year])
        coverage[year] = {
            "months": len(months),
            "first": f"{months[0]}-01",
            "last": f"{months[-1]}-01",
            "partial": len(months) < 12,
        }
        block: dict[str, list[dict[str, Any]]] = {}
        for flow in FLOWS:
            rows = [
                {
                    "code": code,
                    "label": slot[2],
                    "value": round(slot[0], 1),
                    "months": slot[1],
                    "period": slot[3],
                }
                for (y, f, code), slot in acc.items()
                if y == year and f == flow
            ]
            rows.sort(key=lambda r: r["value"], reverse=True)
            block[flow] = rows[:TOP_N]
        by_year[year] = block

    return {
        "id": PACK_ID,
        "title": "Goods trade partners · calendar-year totals",
        "basis": "Sum of monthly values in each calendar year; partial years are year to date.",
        "honesty": (
            "ONS balance of payments goods trade by country, seasonally adjusted, "
            "current prices. Country rows only; EU, non-EU and world totals excluded. "
            "The latest year is year to date until December is published."
        ),
        "source_version": source_version,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "years": years,
        "coverage": coverage,
        "by_year": by_year,
    }


def main() -> None:
    pack = build()
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(pack, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    latest = pack["years"][-1]
    print(
        f"Wrote {OUT_JSON} · {len(pack['years'])} years · latest {latest} "
        f"({pack['coverage'][latest]['months']} months)"
    )


if __name__ == "__main__":
    main()

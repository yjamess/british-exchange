"""Compact PIPR place packs for Housing › Renting.

Built from Postgres ``private-rental-prices`` observations so the Next app
never needs the ~90MB curated CSV on disk. Series keys match the former
CSV loader: ``all|average-rent``, ``bedrooms-1|average-rent``, etc.
"""

from __future__ import annotations

from typing import Any

from britain_exchange.db import connect
from britain_exchange.store import current_release_id, get_indicator_db, using_postgres

INDICATOR_ID = "private-rental-prices"

MEASURE_LABEL: dict[str, dict[str, str]] = {
    "average-rent": {"label": "Average monthly rent", "unit": "GBP"},
    "annual-change": {"label": "Annual change", "unit": "percent"},
    "index": {"label": "Index", "unit": "index"},
}

CAVEATS = [
    "Price Index of Private Rents. Not an advertised asking rent.",
    "Latest two months are provisional. Scotland and Northern Ireland are mainly new lets.",
]


def rent_level(code: str) -> str:
    if code == "K02000001":
        return "uk"
    if len(code) >= 7 and code[0] in "EWSN" and code[1:7] == "920000":
        return "nation"
    if code.startswith("E12"):
        return "region"
    return "local"


def series_key(*, series: str, category: str) -> str | None:
    """Map dim_series / dim_category (from notes) to the Renting UI key."""
    series = (series or "").strip()
    category = (category or "").strip()
    if not series:
        return None
    if category:
        return f"{category}|average-rent" if series == "average-rent" else None
    if series in {"average-rent", "annual-change", "index"}:
        return f"all|{series}"
    return None


def _require_postgres() -> None:
    if not using_postgres():
        raise RuntimeError(
            "Rent packs need PostgreSQL (DATABASE_URL). "
            "Load private-rental-prices with load_ready, then serve from the API."
        )


def _release_id(conn) -> int:
    release = current_release_id(conn, INDICATOR_ID)
    if release is None:
        raise LookupError(
            f"No current release for {INDICATOR_ID}. "
            "Run: uv run python -m britain_exchange.load_ready --only private-rental-prices"
        )
    return release


def list_rent_places() -> list[dict[str, str]]:
    _require_postgres()
    with connect() as conn:
        release = _release_id(conn)
        rows = conn.execute(
            """
            SELECT DISTINCT geography_code, geography_label
            FROM observation
            WHERE indicator_id = %s AND release_id = %s
              AND geography_code <> ''
            ORDER BY geography_label
            """,
            (INDICATOR_ID, release),
        ).fetchall()
    places = [
        {
            "code": str(row["geography_code"]),
            "name": str(row["geography_label"] or row["geography_code"]),
            "level": rent_level(str(row["geography_code"])),
        }
        for row in rows
    ]
    order = {"uk": 0, "nation": 1, "region": 2, "local": 3}
    places.sort(key=lambda p: (order.get(p["level"], 9), p["name"]))
    return places


def _align_months(
    months: list[str],
    cells: dict[str, tuple[float | None, bool]],
) -> tuple[list[float | None], list[bool]]:
    values: list[float | None] = []
    provisional: list[bool] = []
    for month in months:
        cell = cells.get(month)
        if cell is None:
            values.append(None)
            provisional.append(False)
        else:
            values.append(cell[0])
            provisional.append(cell[1])
    return values, provisional


def rent_area_pack(code: str) -> dict[str, Any] | None:
    _require_postgres()
    with connect() as conn:
        release = _release_id(conn)
        rows = conn.execute(
            """
            SELECT period_start::text AS period_start,
                   geography_label, value, observation_status,
                   COALESCE(dim_series, '') AS dim_series,
                   COALESCE(dim_category, '') AS dim_category
            FROM observation
            WHERE indicator_id = %s AND release_id = %s
              AND geography_code = %s
            ORDER BY period_start
            """,
            (INDICATOR_ID, release, code),
        ).fetchall()
    if not rows:
        return None

    month_set: set[str] = set()
    by_key: dict[str, dict[str, tuple[float | None, bool]]] = {}
    name = code
    for row in rows:
        key = series_key(series=row["dim_series"], category=row["dim_category"])
        if not key:
            continue
        period = str(row["period_start"] or "")[:10]
        if not period:
            continue
        month_set.add(period)
        if row["geography_label"]:
            name = str(row["geography_label"])
        raw = row["value"]
        value: float | None
        if raw is None or raw == "":
            value = None
        else:
            try:
                value = float(raw)
            except (TypeError, ValueError):
                value = None
        by_key.setdefault(key, {})[period] = (
            value,
            str(row["observation_status"] or "") == "provisional",
        )

    if not by_key:
        return None

    months = sorted(month_set)
    series: dict[str, list[float | None]] = {}
    provisional: dict[str, list[bool]] = {}
    for key, cells in by_key.items():
        values, flags = _align_months(months, cells)
        series[key] = values
        provisional[key] = flags

    return {
        "code": code,
        "name": name,
        "level": rent_level(code),
        "months": months,
        "series": series,
        "provisional": provisional,
    }


def rent_map_pack(category: str, measure: str) -> dict[str, Any]:
    _require_postgres()
    category = category or "all"
    if measure not in MEASURE_LABEL:
        raise ValueError(f"Unsupported rent measure: {measure}")

    dim_series = measure
    dim_category = "" if category == "all" else category

    with connect() as conn:
        release = _release_id(conn)
        meta = get_indicator_db(INDICATOR_ID) or {}
        evidence = meta.get("raw_evidence") or []
        current = next((e for e in evidence if e.get("is_current")), evidence[0] if evidence else {})
        rows = conn.execute(
            """
            SELECT period_start::text AS period_start,
                   geography_code, geography_label, value
            FROM observation
            WHERE indicator_id = %s AND release_id = %s
              AND COALESCE(dim_series, '') = %s
              AND COALESCE(dim_category, '') = %s
              AND geography_code <> ''
            ORDER BY period_start, geography_code
            """,
            (INDICATOR_ID, release, dim_series, dim_category),
        ).fetchall()

    month_set: set[str] = set()
    by_area: dict[str, dict[str, float | None]] = {}
    names: dict[str, str] = {}
    for row in rows:
        code = str(row["geography_code"])
        period = str(row["period_start"] or "")[:10]
        if not code or not period:
            continue
        month_set.add(period)
        names.setdefault(code, str(row["geography_label"] or code))
        raw = row["value"]
        if raw is None or raw == "":
            value = None
        else:
            try:
                value = float(raw)
            except (TypeError, ValueError):
                value = None
        by_area.setdefault(code, {})[period] = value

    months = sorted(month_set)
    order = {"uk": 0, "nation": 1, "region": 2, "local": 3}
    places = sorted(
        (
            {"code": code, "name": name, "level": rent_level(code)}
            for code, name in names.items()
        ),
        key=lambda p: (order.get(p["level"], 9), p["name"]),
    )
    areas = []
    for place in places:
        cells = by_area.get(place["code"], {})
        areas.append(
            {
                "code": place["code"],
                "name": place["name"],
                "level": place["level"],
                "values": [cells.get(month) for month in months],
            }
        )

    label = MEASURE_LABEL[measure]
    return {
        "months": months,
        "measures": [{"id": measure, "label": label["label"], "unit": label["unit"]}],
        "measure": measure,
        "areas": areas,
        "source": {
            "publisher": meta.get("publisher") or "ONS",
            "url": meta.get("source_url") or "",
            "release": current.get("source_version") or "",
        },
        "caveats": list(CAVEATS),
    }

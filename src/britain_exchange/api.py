"""FastAPI surface over Ready observations.

Prefers PostgreSQL when DATABASE_URL is set; otherwise falls back to local
curated CSV packages under data/.

Run:
  export DATABASE_URL=postgresql://britain@127.0.0.1:5432/britain_exchange
  uv run uvicorn britain_exchange.api:app --reload
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from britain_exchange.aggregation import (
    ENERGY_AGGREGATE_FUELS,
    energy_aggregation_role,
    is_chart_safe_energy_row,
)
from britain_exchange.catalog import get_package, iter_indicator_packages, read_observations
from britain_exchange.chart_contract import (
    assert_compatible_series,
    chart_meta_for_indicator,
    infer_chart_kind,
)
from britain_exchange.dimensions import merge_row_dimensions
from britain_exchange.store import (
    get_indicator_db,
    list_indicators_db,
    list_observations_db,
    using_postgres,
)

app = FastAPI(
    title="Britain Exchange API",
    version="0.3.0",
    description=(
        "Serve verified indicator observations with typed dimensions and "
        "current-release selection. Uses PostgreSQL when DATABASE_URL is set; "
        "else local curated files. Energy fuel totals are excluded from default "
        "observation queries. Water interruptions stay company-level only."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

ENERGY_FUEL_SERIES = frozenset(
    {
        "electricity-generation-by-source",
        "primary-energy-production",
    }
)


def _enrich_observation_rows(
    indicator_id: str,
    rows: list[dict[str, Any]],
    *,
    fuel: str | None,
    water_company: str | None,
    demographic: str | None,
    geography_code: str | None,
    series: str | None,
    category: str | None,
    include_aggregates: bool,
) -> tuple[list[dict[str, Any]], int, dict[str, list[str]]]:
    excluded_aggregates = 0
    working = list(rows)
    energy_fuel_series = indicator_id in ENERGY_FUEL_SERIES

    # Attach dimensions early so filters and facets use typed fields.
    normalized: list[dict[str, Any]] = []
    for row in working:
        item = dict(row)
        dims = merge_row_dimensions(item)
        item["dimensions"] = dims.as_api_dict()
        if item.get("value") == "":
            item["value"] = None
        elif item.get("value") is not None:
            item["value"] = float(item["value"])
        normalized.append(item)
    working = normalized

    if energy_fuel_series and not include_aggregates:
        kept: list[dict[str, Any]] = []
        for row in working:
            fuel_label = (row.get("dimensions") or {}).get("fuel") or ""
            notes = str(row.get("notes") or "")
            safe = (
                is_chart_safe_energy_row(f"fuel={fuel_label}")
                if fuel_label
                else is_chart_safe_energy_row(notes)
            )
            if safe:
                kept.append(row)
            else:
                excluded_aggregates += 1
        working = kept

    # Water: never invent or keep an industry aggregate.
    if indicator_id == "water-supply-interruptions":
        working = [
            row
            for row in working
            if (row.get("dimensions") or {}).get("water_company")
            and (row.get("dimensions") or {}).get("water_company").lower()
            not in {"industry", "total", "all", "aggregate"}
        ]

    if fuel is not None:
        working = [
            row
            for row in working
            if (row.get("dimensions") or {}).get("fuel") == fuel
        ]
    if water_company is not None:
        working = [
            row
            for row in working
            if (row.get("dimensions") or {}).get("water_company") == water_company
        ]
    if demographic is not None:
        working = [
            row
            for row in working
            if (row.get("dimensions") or {}).get("demographic") == demographic
        ]
    if geography_code is not None:
        working = [row for row in working if row.get("geography_code") == geography_code]
    if series is not None:
        working = [
            row
            for row in working
            if (row.get("dimensions") or {}).get("series") == series
        ]
    if category is not None:
        working = [
            row
            for row in working
            if (row.get("dimensions") or {}).get("category") == category
        ]

    enriched: list[dict[str, Any]] = []
    for row in working:
        item = dict(row)
        if energy_fuel_series:
            fuel_label = (item.get("dimensions") or {}).get("fuel") or ""
            item["aggregation_role"] = energy_aggregation_role(
                f"fuel={fuel_label}" if fuel_label else str(item.get("notes") or "")
            )
        elif indicator_id == "water-supply-interruptions":
            item["aggregation_role"] = "component"
        enriched.append(item)

    facets = {
        "fuels": sorted(
            {
                (r.get("dimensions") or {}).get("fuel") or ""
                for r in enriched
                if (r.get("dimensions") or {}).get("fuel")
            }
        ),
        "water_companies": sorted(
            {
                (r.get("dimensions") or {}).get("water_company") or ""
                for r in enriched
                if (r.get("dimensions") or {}).get("water_company")
            }
        ),
        "demographics": sorted(
            {
                (r.get("dimensions") or {}).get("demographic") or ""
                for r in enriched
                if (r.get("dimensions") or {}).get("demographic")
            }
        ),
        "geography_codes": sorted(
            {str(r.get("geography_code") or "") for r in enriched if r.get("geography_code")}
        ),
        "series": sorted(
            {
                (r.get("dimensions") or {}).get("series") or ""
                for r in enriched
                if (r.get("dimensions") or {}).get("series")
            }
        ),
        "categories": sorted(
            {
                (r.get("dimensions") or {}).get("category") or ""
                for r in enriched
                if (r.get("dimensions") or {}).get("category")
            }
        ),
    }
    return enriched, excluded_aggregates, facets


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "store": "postgres" if using_postgres() else "files",
    }


@app.get("/indicators")
def list_indicators() -> list[dict[str, Any]]:
    if using_postgres():
        return list_indicators_db()
    items: list[dict[str, Any]] = []
    for package in iter_indicator_packages():
        m = package.manifest
        items.append(
            {
                "indicator_id": m.indicator_id,
                "title": m.title,
                "sector": m.sector,
                "publisher": m.publisher,
                "unit": m.unit,
                "frequency": m.frequency,
                "geography": m.geography,
                "series_id": m.series_id,
                "caveats": m.caveats,
                "source_url": m.source_url,
                "notion_registry_url": m.notion_registry_url,
                "agent_owner": m.agent_owner,
            }
        )
    return items


@app.get("/indicators/{indicator_id}")
def get_indicator(indicator_id: str) -> dict[str, Any]:
    if using_postgres():
        payload = get_indicator_db(indicator_id)
        if payload is None:
            raise HTTPException(status_code=404, detail=f"Unknown indicator: {indicator_id}")
        payload["chart"] = chart_meta_for_indicator(
            indicator_id,
            title=str(payload["title"]),
            geography=str(payload["geography"]),
            frequency=str(payload["frequency"]),
            unit=str(payload["unit"]),
            publisher=str(payload["publisher"]),
            source_url=str(payload["source_url"]),
            caveats=str(payload.get("caveats") or ""),
            series_id=str(payload["series_id"]),
            definition=str(payload.get("definition") or ""),
        )
        return payload
    try:
        package = get_package(indicator_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown indicator: {indicator_id}") from exc
    m = package.manifest
    return {
        "indicator_id": m.indicator_id,
        "title": m.title,
        "sector": m.sector,
        "publisher": m.publisher,
        "source_url": m.source_url,
        "series_id": m.series_id,
        "geography": m.geography,
        "frequency": m.frequency,
        "unit": m.unit,
        "definition": m.definition,
        "licence": m.licence,
        "caveats": m.caveats,
        "revision_notes": m.revision_notes,
        "notion_registry_url": m.notion_registry_url,
        "raw_evidence": [asdict(e) for e in m.raw_evidence],
        "chart": chart_meta_for_indicator(
            m.indicator_id,
            title=m.title,
            geography=m.geography,
            frequency=m.frequency,
            unit=m.unit,
            publisher=m.publisher,
            source_url=m.source_url,
            caveats=m.caveats,
            series_id=m.series_id,
            definition=m.definition,
        ),
    }


@app.get("/indicators/{indicator_id}/observations")
def get_observations(
    indicator_id: str,
    fuel: str | None = Query(
        default=None,
        description="Filter by typed fuel dimension (e.g. Gas).",
    ),
    water_company: str | None = Query(
        default=None,
        description="Filter by Ofwat company code (e.g. TMS).",
    ),
    demographic: str | None = Query(
        default=None,
        description="Filter by demographic dimension (e.g. female).",
    ),
    geography_code: str | None = Query(
        default=None,
        description="Filter by geography_code (e.g. E92000001).",
    ),
    series: str | None = Query(
        default=None,
        description="Filter by dim_series when an indicator carries multiple series.",
    ),
    category: str | None = Query(
        default=None,
        description="Filter by category dimension (e.g. industrial price band).",
    ),
    release_id: int | None = Query(
        default=None,
        description="Select a specific data_release; default is the current release.",
    ),
    current_only: bool = Query(
        default=True,
        description="When true (default) and release_id omitted, use is_current release.",
    ),
    include_aggregates: bool = Query(
        default=False,
        description=(
            "Energy only: when false (default), drop Total* aggregate fuels so "
            "stacked charts do not double-count. Set true for QA/totals."
        ),
    ),
    limit: int | None = Query(default=None, ge=1, le=10_000),
) -> dict[str, Any]:
    available_dimensions: dict[str, Any] = {}
    if using_postgres():
        meta = get_indicator_db(indicator_id)
        if meta is None:
            raise HTTPException(status_code=404, detail=f"Unknown indicator: {indicator_id}")
        rows, available_dimensions = list_observations_db(
            indicator_id,
            release_id=release_id,
            current_only=current_only,
            fuel=fuel,
            water_company=water_company,
            demographic=demographic,
            geography_code=geography_code,
            series=series,
            category=category,
        )
        # DB path already filtered; still enrich aggregation_role / chart fields.
        enriched, excluded_aggregates, facets = _enrich_observation_rows(
            indicator_id,
            rows,
            fuel=None,
            water_company=None,
            demographic=None,
            geography_code=None,
            series=None,
            category=None,
            include_aggregates=include_aggregates,
        )
        # Prefer DB facets (pre-filter) merged with post-filter facet lists.
        available_dimensions = {**available_dimensions, **facets}
        source_url = str(meta["source_url"])
        unit = str(meta["unit"])
        frequency = str(meta["frequency"])
        geography = str(meta["geography"])
        title = str(meta["title"])
        publisher = str(meta["publisher"])
        caveats = str(meta.get("caveats") or "")
        series_id = str(meta["series_id"])
        definition = str(meta.get("definition") or "")
    else:
        try:
            package = get_package(indicator_id)
        except KeyError as exc:
            raise HTTPException(
                status_code=404, detail=f"Unknown indicator: {indicator_id}"
            ) from exc
        rows = read_observations(package)
        enriched, excluded_aggregates, available_dimensions = _enrich_observation_rows(
            indicator_id,
            rows,
            fuel=fuel,
            water_company=water_company,
            demographic=demographic,
            geography_code=geography_code,
            series=series,
            category=category,
            include_aggregates=include_aggregates,
        )
        source_url = package.manifest.source_url
        unit = package.manifest.unit
        frequency = package.manifest.frequency
        geography = package.manifest.geography
        title = package.manifest.title
        publisher = package.manifest.publisher
        caveats = package.manifest.caveats
        series_id = package.manifest.series_id
        definition = package.manifest.definition

    chart_kind = infer_chart_kind(
        frequency=frequency,
        geography_codes={str(r.get("geography_code") or "") for r in enriched},
        fuels={
            (r.get("dimensions") or {}).get("fuel") or ""
            for r in enriched
        },
        water_companies={
            (r.get("dimensions") or {}).get("water_company") or ""
            for r in enriched
        },
        demographics={
            (r.get("dimensions") or {}).get("demographic") or ""
            for r in enriched
        },
        period_starts={str(r.get("period_start") or "") for r in enriched},
    )
    compatibility_warnings = assert_compatible_series(
        {str(r.get("unit") or "") for r in enriched},
        {str(r.get("geography_label") or "") for r in enriched},
    )
    if indicator_id == "water-supply-interruptions":
        compatibility_warnings.append(
            "Company-level only — no industry aggregate is published in this extract."
        )

    total = len(enriched)
    if limit is not None:
        enriched = enriched[:limit]

    chart = chart_meta_for_indicator(
        indicator_id,
        title=title,
        geography=geography,
        frequency=frequency,
        unit=unit,
        publisher=publisher,
        source_url=source_url,
        caveats=caveats,
        series_id=series_id,
        definition=definition,
    )
    chart["chart_kind"] = chart_kind
    chart["compatibility_warnings"] = compatibility_warnings

    return {
        "indicator_id": indicator_id,
        "source_url": source_url,
        "unit": unit,
        "frequency": frequency,
        "store": "postgres" if using_postgres() else "files",
        "count": total,
        "returned": len(enriched),
        "excluded_aggregate_rows": excluded_aggregates,
        "aggregate_fuels": sorted(ENERGY_AGGREGATE_FUELS)
        if indicator_id in ENERGY_FUEL_SERIES
        else [],
        "available_dimensions": available_dimensions,
        "chart": chart,
        "observations": enriched,
    }

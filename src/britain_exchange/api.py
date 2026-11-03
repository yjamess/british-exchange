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
from britain_exchange.store import (
    get_indicator_db,
    list_indicators_db,
    list_observations_db,
    using_postgres,
)

app = FastAPI(
    title="Britain Exchange API",
    version="0.2.0",
    description=(
        "Serve verified indicator observations. "
        "Uses PostgreSQL when DATABASE_URL is set; else local curated files. "
        "Energy fuel totals are excluded from default observation queries."
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


def _enrich_observation_rows(
    indicator_id: str,
    rows: list[dict[str, Any]],
    *,
    fuel: str | None,
    include_aggregates: bool,
) -> tuple[list[dict[str, Any]], int]:
    excluded_aggregates = 0
    working = list(rows)
    energy_fuel_series = indicator_id in {
        "electricity-generation-by-source",
        "primary-energy-production",
    }
    if energy_fuel_series and not include_aggregates:
        kept: list[dict[str, Any]] = []
        for row in working:
            if is_chart_safe_energy_row(str(row.get("notes") or "")):
                kept.append(row)
            else:
                excluded_aggregates += 1
        working = kept
    if fuel is not None:
        needle = fuel if fuel.startswith("fuel=") else f"fuel={fuel}"
        working = [row for row in working if row.get("notes") == needle]

    enriched: list[dict[str, Any]] = []
    for row in working:
        item: dict[str, Any] = dict(row)
        if energy_fuel_series:
            item["aggregation_role"] = energy_aggregation_role(str(row.get("notes") or ""))
        if item.get("value") == "":
            item["value"] = None
        elif item.get("value") is not None:
            item["value"] = float(item["value"])
        enriched.append(item)
    return enriched, excluded_aggregates


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
    }


@app.get("/indicators/{indicator_id}/observations")
def get_observations(
    indicator_id: str,
    fuel: str | None = Query(
        default=None,
        description="Energy only: filter notes equal to fuel=<label>",
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
    if using_postgres():
        meta = get_indicator_db(indicator_id)
        if meta is None:
            raise HTTPException(status_code=404, detail=f"Unknown indicator: {indicator_id}")
        rows = list_observations_db(indicator_id)
        source_url = str(meta["source_url"])
        unit = str(meta["unit"])
    else:
        try:
            package = get_package(indicator_id)
        except KeyError as exc:
            raise HTTPException(
                status_code=404, detail=f"Unknown indicator: {indicator_id}"
            ) from exc
        rows = read_observations(package)
        source_url = package.manifest.source_url
        unit = package.manifest.unit

    enriched, excluded_aggregates = _enrich_observation_rows(
        indicator_id,
        rows,
        fuel=fuel,
        include_aggregates=include_aggregates,
    )
    total = len(enriched)
    if limit is not None:
        enriched = enriched[:limit]
    return {
        "indicator_id": indicator_id,
        "source_url": source_url,
        "unit": unit,
        "store": "postgres" if using_postgres() else "files",
        "count": total,
        "returned": len(enriched),
        "excluded_aggregate_rows": excluded_aggregates,
        "aggregate_fuels": sorted(ENERGY_AGGREGATE_FUELS)
        if indicator_id
        in {"electricity-generation-by-source", "primary-energy-production"}
        else [],
        "observations": enriched,
    }

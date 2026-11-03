"""Minimal FastAPI surface over Ready curated observations.

Run: `uv run uvicorn britain_exchange.api:app --reload`
Serves chart-ready series + source links from local hand-offs (no Postgres yet).
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

app = FastAPI(
    title="Britain Exchange API",
    version="0.1.0",
    description=(
        "Serve verified indicator observations from local manifests. "
        "Energy fuel totals are excluded from default observation queries."
    ),
)

# Local Next.js (web/) talks to this API in the browser.
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/indicators")
def list_indicators() -> list[dict[str, Any]]:
    """List indicators that have a local manifest + curated CSV."""
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
    try:
        package = get_package(indicator_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown indicator: {indicator_id}") from exc

    rows = read_observations(package)
    excluded_aggregates = 0
    if indicator_id == "electricity-generation-by-source" and not include_aggregates:
        kept: list[dict[str, str]] = []
        for row in rows:
            if is_chart_safe_energy_row(row.get("notes") or ""):
                kept.append(row)
            else:
                excluded_aggregates += 1
        rows = kept
    if fuel is not None:
        needle = fuel if fuel.startswith("fuel=") else f"fuel={fuel}"
        rows = [row for row in rows if row.get("notes") == needle]

    enriched: list[dict[str, Any]] = []
    for row in rows:
        item: dict[str, Any] = dict(row)
        if indicator_id == "electricity-generation-by-source":
            item["aggregation_role"] = energy_aggregation_role(row.get("notes") or "")
        # Coerce empty CSV value to JSON null for typed clients.
        if item.get("value") == "":
            item["value"] = None
        elif item.get("value") is not None:
            item["value"] = float(item["value"])
        enriched.append(item)

    total = len(enriched)
    if limit is not None:
        enriched = enriched[:limit]
    return {
        "indicator_id": indicator_id,
        "source_url": package.manifest.source_url,
        "unit": package.manifest.unit,
        "count": total,
        "returned": len(enriched),
        "excluded_aggregate_rows": excluded_aggregates,
        "aggregate_fuels": sorted(ENERGY_AGGREGATE_FUELS)
        if indicator_id == "electricity-generation-by-source"
        else [],
        "observations": enriched,
    }

"""Read indicators/observations from PostgreSQL when DATABASE_URL is set."""

from __future__ import annotations

from typing import Any

from britain_exchange.db import connect, database_url


def using_postgres() -> bool:
    return database_url() is not None


def list_indicators_db() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT i.indicator_id, i.title, i.sector, i.publisher, i.unit, i.frequency,
                   i.source_url, i.notion_registry_url, i.agent_owner, i.geography,
                   i.series_id, i.caveats, i.licence, i.definition,
                   COALESCE(cov.coverage_start, '') AS coverage_start,
                   COALESCE(cov.coverage_end, '') AS coverage_end,
                   COALESCE(cov.observation_count, 0) AS observation_count,
                   COALESCE(rel.release_date, '') AS release_date,
                   COALESCE(rel.retrieved_at, '') AS retrieved_at
            FROM indicator i
            LEFT JOIN (
                SELECT o.indicator_id,
                       MIN(o.period_start)::text AS coverage_start,
                       MAX(o.period_end)::text AS coverage_end,
                       COUNT(*) AS observation_count
                FROM observation o
                JOIN data_release r ON r.release_id = o.release_id AND r.is_current
                GROUP BY o.indicator_id
            ) cov ON cov.indicator_id = i.indicator_id
            LEFT JOIN (
                SELECT indicator_id,
                       MAX(official_release_date)::text AS release_date,
                       MAX(retrieved_at)::text AS retrieved_at
                FROM data_release
                WHERE is_current
                GROUP BY indicator_id
            ) rel ON rel.indicator_id = i.indicator_id
            ORDER BY i.indicator_id
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_indicator_db(indicator_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT indicator_id, title, sector, publisher, source_url, series_id,
                   geography, frequency, unit, definition, licence, caveats,
                   revision_notes, notion_registry_url, agent_owner
            FROM indicator
            WHERE indicator_id = %s
            """,
            (indicator_id,),
        ).fetchone()
        if row is None:
            return None
        evidence = conn.execute(
            """
            SELECT release_id, source_version,
                   official_release_date::text AS official_release_date,
                   retrieved_at::text AS retrieved_at, checksum_sha256,
                   raw_path AS path, is_current
            FROM data_release
            WHERE indicator_id = %s
            ORDER BY release_id DESC
            LIMIT 10
            """,
            (indicator_id,),
        ).fetchall()
    payload = dict(row)
    payload["raw_evidence"] = [dict(item) for item in evidence]
    return payload


def current_release_id(conn, indicator_id: str) -> int | None:
    row = conn.execute(
        """
        SELECT release_id FROM data_release
        WHERE indicator_id = %s AND is_current
        ORDER BY release_id DESC
        LIMIT 1
        """,
        (indicator_id,),
    ).fetchone()
    return int(row["release_id"]) if row else None


def list_observations_db(
    indicator_id: str,
    *,
    release_id: int | None = None,
    current_only: bool = True,
    fuel: str | None = None,
    water_company: str | None = None,
    demographic: str | None = None,
    geography_code: str | None = None,
    series: str | None = None,
    category: str | None = None,
    period_start: str | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Return observation rows plus dimension facet metadata."""
    with connect() as conn:
        params: list[Any] = [indicator_id]
        where = ["o.indicator_id = %s"]

        selected_release: int | None = release_id
        if selected_release is None and current_only:
            selected_release = current_release_id(conn, indicator_id)
        if selected_release is not None:
            where.append("o.release_id = %s")
            params.append(selected_release)

        if fuel is not None:
            where.append("o.dim_fuel = %s")
            params.append(fuel)
        if water_company is not None:
            where.append("o.dim_water_company = %s")
            params.append(water_company)
        if demographic is not None:
            where.append("o.dim_demographic = %s")
            params.append(demographic)
        if geography_code is not None:
            where.append("o.geography_code = %s")
            params.append(geography_code)
        if series is not None:
            where.append("o.dim_series = %s")
            params.append(series)
        if category is not None:
            where.append("o.dim_category = %s")
            params.append(category)
        if period_start is not None:
            where.append("o.period_start = %s")
            params.append(period_start)

        sql = f"""
            SELECT o.indicator_id,
                   o.release_id,
                   o.period_start::text AS period_start,
                   o.period_end::text AS period_end,
                   o.geography_code, o.geography_label, o.value, o.unit,
                   o.observation_status, o.source_version, o.notes,
                   o.dim_fuel, o.dim_water_company, o.dim_water_company_name,
                   o.dim_demographic, o.dim_series, o.dim_category
            FROM observation o
            WHERE {" AND ".join(where)}
            ORDER BY o.period_start, o.dim_fuel, o.dim_water_company,
                     o.dim_demographic, o.dim_category, o.geography_code
        """
        rows = conn.execute(sql, params).fetchall()

        # Full-indicator DISTINCT facets are expensive on large packages (EPC LA ≈ 200k).
        # When the caller already filtered, derive facets from the filtered result set.
        filtered = any(
            v is not None
            for v in (fuel, water_company, demographic, geography_code, series, category, period_start)
        )
        facets = None
        if not filtered:
            facet_release = selected_release
            facet_params: list[Any] = [indicator_id]
            facet_where = ["indicator_id = %s"]
            if facet_release is not None:
                facet_where.append("release_id = %s")
                facet_params.append(facet_release)
            facets = conn.execute(
                f"""
                SELECT
                    array_remove(array_agg(DISTINCT NULLIF(dim_fuel, '')), NULL)
                        AS fuels,
                    array_remove(array_agg(DISTINCT NULLIF(dim_water_company, '')), NULL)
                        AS water_companies,
                    array_remove(array_agg(DISTINCT NULLIF(dim_demographic, '')), NULL)
                        AS demographics,
                    array_remove(array_agg(DISTINCT NULLIF(geography_code, '')), NULL)
                        AS geography_codes,
                    array_remove(array_agg(DISTINCT NULLIF(dim_series, '')), NULL)
                        AS series,
                    array_remove(array_agg(DISTINCT NULLIF(dim_category, '')), NULL)
                        AS categories
                FROM observation
                WHERE {" AND ".join(facet_where)}
                """,
                facet_params,
            ).fetchone()

    observations = []
    for row in rows:
        item = dict(row)
        item["dimensions"] = {
            "fuel": item.pop("dim_fuel") or "",
            "water_company": item.pop("dim_water_company") or "",
            "water_company_name": item.pop("dim_water_company_name") or "",
            "demographic": item.pop("dim_demographic") or "",
            "series": item.pop("dim_series") or "",
            "category": item.pop("dim_category") or "",
        }
        observations.append(item)

    if facets is not None:
        available = {
            "fuels": list(facets["fuels"] or []),
            "water_companies": list(facets["water_companies"] or []),
            "demographics": list(facets["demographics"] or []),
            "geography_codes": list(facets["geography_codes"] or []),
            "series": list(facets["series"] or []),
            "categories": list(facets["categories"] or []),
            "release_id": selected_release,
            "current_only": current_only and release_id is None,
        }
    else:
        def _vals(key: str) -> list[str]:
            seen: list[str] = []
            for o in observations:
                v = (o["dimensions"].get(key) if key != "geography_code" else o.get("geography_code")) or ""
                if v and v not in seen:
                    seen.append(v)
            return seen

        available = {
            "fuels": _vals("fuel"),
            "water_companies": _vals("water_company"),
            "demographics": _vals("demographic"),
            "geography_codes": _vals("geography_code"),
            "series": _vals("series"),
            "categories": _vals("category"),
            "release_id": selected_release,
            "current_only": current_only and release_id is None,
        }
    return observations, available

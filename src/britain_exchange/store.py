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
            SELECT indicator_id, title, sector, publisher, unit, frequency,
                   source_url, notion_registry_url, agent_owner
            FROM indicator
            ORDER BY indicator_id
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
            SELECT source_version, official_release_date::text AS official_release_date,
                   retrieved_at::text AS retrieved_at, checksum_sha256,
                   raw_path AS path
            FROM data_release
            WHERE indicator_id = %s
            ORDER BY release_id DESC
            LIMIT 5
            """,
            (indicator_id,),
        ).fetchall()
    payload = dict(row)
    payload["raw_evidence"] = [dict(item) for item in evidence]
    return payload


def list_observations_db(indicator_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT indicator_id,
                   period_start::text AS period_start,
                   period_end::text AS period_end,
                   geography_code, geography_label, value, unit,
                   observation_status, source_version, notes
            FROM observation
            WHERE indicator_id = %s
            ORDER BY period_start, notes
            """,
            (indicator_id,),
        ).fetchall()
    return [dict(row) for row in rows]

"""Load Ready curated packages from disk into PostgreSQL.

Usage:
  export DATABASE_URL=postgresql://britain:britain@127.0.0.1:5432/britain_exchange
  uv run python -m britain_exchange.load_ready
"""

from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path

from britain_exchange.catalog import IndicatorPackage, iter_indicator_packages
from britain_exchange.db import apply_migrations, connect
from britain_exchange.manifest import Manifest


def _parse_date(raw: str) -> date | None:
    text = (raw or "").strip()
    if not text:
        return None
    return date.fromisoformat(text[:10])


def _parse_timestamptz(raw: str) -> datetime | None:
    text = (raw or "").strip()
    if not text:
        return None
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


def upsert_indicator(conn, manifest: Manifest) -> None:
    conn.execute(
        """
        INSERT INTO indicator (
            indicator_id, title, sector, publisher, source_url, series_id,
            geography, frequency, unit, definition, licence, caveats,
            revision_notes, notion_registry_url, agent_owner, updated_at
        ) VALUES (
            %(indicator_id)s, %(title)s, %(sector)s, %(publisher)s, %(source_url)s,
            %(series_id)s, %(geography)s, %(frequency)s, %(unit)s, %(definition)s,
            %(licence)s, %(caveats)s, %(revision_notes)s, %(notion_registry_url)s,
            %(agent_owner)s, NOW()
        )
        ON CONFLICT (indicator_id) DO UPDATE SET
            title = EXCLUDED.title,
            sector = EXCLUDED.sector,
            publisher = EXCLUDED.publisher,
            source_url = EXCLUDED.source_url,
            series_id = EXCLUDED.series_id,
            geography = EXCLUDED.geography,
            frequency = EXCLUDED.frequency,
            unit = EXCLUDED.unit,
            definition = EXCLUDED.definition,
            licence = EXCLUDED.licence,
            caveats = EXCLUDED.caveats,
            revision_notes = EXCLUDED.revision_notes,
            notion_registry_url = EXCLUDED.notion_registry_url,
            agent_owner = EXCLUDED.agent_owner,
            updated_at = NOW()
        """,
        {
            "indicator_id": manifest.indicator_id,
            "title": manifest.title,
            "sector": manifest.sector,
            "publisher": manifest.publisher,
            "source_url": manifest.source_url,
            "series_id": manifest.series_id,
            "geography": manifest.geography,
            "frequency": manifest.frequency,
            "unit": manifest.unit,
            "definition": manifest.definition,
            "licence": manifest.licence,
            "caveats": manifest.caveats,
            "revision_notes": manifest.revision_notes,
            "notion_registry_url": manifest.notion_registry_url,
            "agent_owner": manifest.agent_owner,
        },
    )


def upsert_release(conn, package: IndicatorPackage) -> int:
    manifest = package.manifest
    evidence = manifest.raw_evidence[0] if manifest.raw_evidence else None
    source_version = ""
    with package.curated_csv.open(newline="", encoding="utf-8") as handle:
        first = next(csv.DictReader(handle), None)
        if first:
            source_version = first.get("source_version") or ""
    if not source_version and evidence:
        source_version = Path(evidence.path).name
    if not source_version:
        source_version = "unknown"

    row = conn.execute(
        """
        INSERT INTO data_release (
            indicator_id, source_version, official_release_date,
            retrieved_at, checksum_sha256, raw_path
        ) VALUES (
            %(indicator_id)s, %(source_version)s, %(official_release_date)s,
            %(retrieved_at)s, %(checksum_sha256)s, %(raw_path)s
        )
        ON CONFLICT (indicator_id, source_version, checksum_sha256) DO UPDATE SET
            official_release_date = EXCLUDED.official_release_date,
            retrieved_at = EXCLUDED.retrieved_at,
            raw_path = EXCLUDED.raw_path
        RETURNING release_id
        """,
        {
            "indicator_id": manifest.indicator_id,
            "source_version": source_version,
            "official_release_date": (
                _parse_date(evidence.official_release_date) if evidence else None
            ),
            "retrieved_at": (
                _parse_timestamptz(evidence.retrieved_at) if evidence else None
            ),
            "checksum_sha256": (evidence.checksum_sha256 if evidence else "") or "",
            "raw_path": evidence.path if evidence else None,
        },
    ).fetchone()
    assert row is not None
    return int(row["release_id"])


def replace_observations(conn, package: IndicatorPackage, release_id: int) -> int:
    manifest = package.manifest
    conn.execute(
        "DELETE FROM observation WHERE indicator_id = %s",
        (manifest.indicator_id,),
    )
    count = 0
    with package.curated_csv.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            raw_value = row.get("value")
            value = None if raw_value in (None, "") else float(raw_value)
            conn.execute(
                """
                INSERT INTO observation (
                    indicator_id, release_id, period_start, period_end,
                    geography_code, geography_label, value, unit,
                    observation_status, source_version, notes
                ) VALUES (
                    %(indicator_id)s, %(release_id)s, %(period_start)s, %(period_end)s,
                    %(geography_code)s, %(geography_label)s, %(value)s, %(unit)s,
                    %(observation_status)s, %(source_version)s, %(notes)s
                )
                """,
                {
                    "indicator_id": row["indicator_id"],
                    "release_id": release_id,
                    "period_start": date.fromisoformat(row["period_start"]),
                    "period_end": date.fromisoformat(row["period_end"]),
                    "geography_code": row["geography_code"],
                    "geography_label": row["geography_label"],
                    "value": value,
                    "unit": row["unit"],
                    "observation_status": row["observation_status"],
                    "source_version": row["source_version"],
                    "notes": row.get("notes") or "",
                },
            )
            count += 1
    return count


def load_all() -> None:
    packages = iter_indicator_packages()
    if not packages:
        raise SystemExit("No local indicator packages found under data/")

    with connect() as conn:
        applied = apply_migrations(conn)
        print(f"migrations: {', '.join(applied)}")
        for package in packages:
            upsert_indicator(conn, package.manifest)
            release_id = upsert_release(conn, package)
            n = replace_observations(conn, package, release_id)
            conn.commit()
            print(
                f"loaded {package.manifest.indicator_id}: "
                f"{n} observations (release_id={release_id})"
            )


def main() -> None:
    load_all()


if __name__ == "__main__":
    main()

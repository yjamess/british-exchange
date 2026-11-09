"""Load Ready curated packages from disk into PostgreSQL.

Preserves prior ``data_release`` rows and their observations. A refresh upserts
the matching release (or inserts a new one), replaces only that release's
observations, and marks it ``is_current``.

Usage:
  export DATABASE_URL=postgresql://britain:britain@127.0.0.1:5432/britain_exchange
  uv run python -m britain_exchange.load_ready

  # Or load via Supabase PostgREST when DATABASE_URL is not yet set
  # (schema must already exist; see apply_migration / dashboard SQL):
  uv run python -m britain_exchange.load_ready --via-rest
"""

from __future__ import annotations

import argparse
import csv
import os
from datetime import date, datetime
from pathlib import Path

import httpx

from britain_exchange.catalog import IndicatorPackage, iter_indicator_packages
from britain_exchange.db import apply_migrations, connect, load_repo_env
from britain_exchange.dimensions import dimensions_from_notes, dimensions_to_db_fields
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
    """Insert or reuse a release row; mark it current; leave prior releases intact."""
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
            retrieved_at, checksum_sha256, raw_path, is_current
        ) VALUES (
            %(indicator_id)s, %(source_version)s, %(official_release_date)s,
            %(retrieved_at)s, %(checksum_sha256)s, %(raw_path)s, TRUE
        )
        ON CONFLICT (indicator_id, source_version, checksum_sha256) DO UPDATE SET
            official_release_date = EXCLUDED.official_release_date,
            retrieved_at = EXCLUDED.retrieved_at,
            raw_path = EXCLUDED.raw_path,
            is_current = TRUE
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
    release_id = int(row["release_id"])

    conn.execute(
        """
        UPDATE data_release
        SET is_current = FALSE
        WHERE indicator_id = %s AND release_id <> %s
        """,
        (manifest.indicator_id, release_id),
    )
    return release_id


_OBS_INSERT_SQL = """
    INSERT INTO observation (
        indicator_id, release_id, period_start, period_end,
        geography_code, geography_label, value, unit,
        observation_status, source_version, notes,
        dim_fuel, dim_water_company, dim_water_company_name,
        dim_demographic, dim_series, dim_category
    ) VALUES (
        %(indicator_id)s, %(release_id)s, %(period_start)s, %(period_end)s,
        %(geography_code)s, %(geography_label)s, %(value)s, %(unit)s,
        %(observation_status)s, %(source_version)s, %(notes)s,
        %(dim_fuel)s, %(dim_water_company)s, %(dim_water_company_name)s,
        %(dim_demographic)s, %(dim_series)s, %(dim_category)s
    )
"""

# Remote Postgres (Supabase) is far faster with batched inserts than one round-trip per row.
_OBS_BATCH_SIZE = 2_000


def replace_release_observations(
    conn, package: IndicatorPackage, release_id: int
) -> int:
    """Replace observations for one release only — never wipe other releases."""
    manifest = package.manifest
    conn.execute(
        "DELETE FROM observation WHERE release_id = %s",
        (release_id,),
    )
    count = 0
    batch: list[dict] = []

    def flush() -> None:
        nonlocal batch
        if not batch:
            return
        # psycopg3: executemany lives on the cursor, not Connection.
        with conn.cursor() as cur:
            cur.executemany(_OBS_INSERT_SQL, batch)
        batch = []

    with package.curated_csv.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            raw_value = row.get("value")
            value = None if raw_value in (None, "") else float(raw_value)
            notes = row.get("notes") or ""
            dims = dimensions_from_notes(notes)
            dim_fields = dimensions_to_db_fields(dims)
            batch.append(
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
                    "notes": notes,
                    **dim_fields,
                }
            )
            count += 1
            if len(batch) >= _OBS_BATCH_SIZE:
                flush()
                if count % 50_000 == 0:
                    print(f"  … {count} rows", flush=True)
    flush()
    # Guard: Ofwat extract must stay company-level (no fabricated industry total).
    if manifest.indicator_id == "water-supply-interruptions":
        bad = conn.execute(
            """
            SELECT COUNT(*) AS n FROM observation
            WHERE release_id = %s
              AND (
                lower(dim_water_company) IN ('industry', 'total', 'all', 'aggregate')
                OR lower(notes) LIKE '%%industry aggregate%%'
              )
            """,
            (release_id,),
        ).fetchone()
        if bad and int(bad["n"]) > 0:
            raise RuntimeError(
                "water-supply-interruptions must not contain industry aggregate rows"
            )
    return count


def _is_observation_package(package: IndicatorPackage) -> bool:
    """Skip transaction-layer packages (e.g. Price Paid) that are not Observation CSVs."""
    path = package.curated_csv
    if not path.is_file():
        return False
    with path.open(newline="", encoding="utf-8") as handle:
        header = next(csv.reader(handle), [])
    return "observation_status" in header and "period_start" in header


def _select_packages(only: set[str] | None) -> list[IndicatorPackage]:
    packages = iter_indicator_packages()
    if only:
        packages = [p for p in packages if p.manifest.indicator_id in only]
        missing = only - {p.manifest.indicator_id for p in packages}
        if missing:
            raise SystemExit(
                "No local package(s) for: "
                + ", ".join(sorted(missing))
                + ". Pull curated CSV from the archive first."
            )
    if not packages:
        raise SystemExit("No local indicator packages found under data/")
    return packages


def load_all(*, only: set[str] | None = None) -> None:
    packages = _select_packages(only)

    with connect() as conn:
        applied = apply_migrations(conn)
        print(f"migrations: {', '.join(applied) or 'none'}", flush=True)
        for package in packages:
            if not _is_observation_package(package):
                print(
                    f"skip {package.manifest.indicator_id}: "
                    "not an observation curated CSV (transaction layer)",
                    flush=True,
                )
                continue
            print(f"loading {package.manifest.indicator_id} …", flush=True)
            upsert_indicator(conn, package.manifest)
            release_id = upsert_release(conn, package)
            n = replace_release_observations(conn, package, release_id)
            conn.commit()
            print(
                f"loaded {package.manifest.indicator_id}: "
                f"{n} observations (release_id={release_id}, current)",
                flush=True,
            )


def _rest_config() -> tuple[str, str]:
    load_repo_env()
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_KEY")
        or ""
    )
    if not url or not key:
        raise SystemExit(
            " --via-rest needs SUPABASE_URL and SUPABASE_ANON_KEY "
            "(or SUPABASE_SERVICE_ROLE_KEY) in .env"
        )
    return url, key


def _rest_headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _rest_upsert_indicator(client: httpx.Client, base: str, key: str, manifest: Manifest) -> None:
    row = {
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
    }
    response = client.post(
        f"{base}/rest/v1/indicator",
        headers={
            **_rest_headers(key),
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        params={"on_conflict": "indicator_id"},
        json=row,
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"indicator upsert failed: {response.status_code} {response.text[:400]}")


def _rest_upsert_release(client: httpx.Client, base: str, key: str, package: IndicatorPackage) -> int:
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

    checksum = (evidence.checksum_sha256 if evidence else "") or ""
    # Look for an existing matching release first.
    existing = client.get(
        f"{base}/rest/v1/data_release",
        headers=_rest_headers(key),
        params={
            "select": "release_id",
            "indicator_id": f"eq.{manifest.indicator_id}",
            "source_version": f"eq.{source_version}",
            "checksum_sha256": f"eq.{checksum}",
            "limit": "1",
        },
        timeout=60,
    )
    if existing.status_code >= 400:
        raise RuntimeError(f"release lookup failed: {existing.status_code} {existing.text[:400]}")
    rows = existing.json()
    if rows:
        release_id = int(rows[0]["release_id"])
    else:
        payload = {
            "indicator_id": manifest.indicator_id,
            "source_version": source_version,
            "official_release_date": (
                _parse_date(evidence.official_release_date).isoformat()
                if evidence and _parse_date(evidence.official_release_date)
                else None
            ),
            "retrieved_at": (
                _parse_timestamptz(evidence.retrieved_at).isoformat()
                if evidence and _parse_timestamptz(evidence.retrieved_at)
                else None
            ),
            "checksum_sha256": checksum,
            "raw_path": evidence.path if evidence else None,
            "is_current": True,
        }
        created = client.post(
            f"{base}/rest/v1/data_release",
            headers={
                **_rest_headers(key),
                "Prefer": "return=representation",
            },
            json=payload,
            timeout=60,
        )
        if created.status_code >= 400:
            raise RuntimeError(f"release insert failed: {created.status_code} {created.text[:400]}")
        release_id = int(created.json()[0]["release_id"])

    # Mark this release current; clear siblings.
    client.patch(
        f"{base}/rest/v1/data_release",
        headers=_rest_headers(key),
        params={"release_id": f"eq.{release_id}"},
        json={"is_current": True},
        timeout=60,
    )
    client.patch(
        f"{base}/rest/v1/data_release",
        headers=_rest_headers(key),
        params={
            "indicator_id": f"eq.{manifest.indicator_id}",
            "release_id": f"neq.{release_id}",
        },
        json={"is_current": False},
        timeout=60,
    )
    return release_id


def _rest_replace_observations(
    client: httpx.Client, base: str, key: str, package: IndicatorPackage, release_id: int
) -> int:
    manifest = package.manifest
    deleted = client.delete(
        f"{base}/rest/v1/observation",
        headers=_rest_headers(key),
        params={"release_id": f"eq.{release_id}"},
        timeout=120,
    )
    if deleted.status_code >= 400:
        raise RuntimeError(f"observation delete failed: {deleted.status_code} {deleted.text[:400]}")

    batch: list[dict] = []
    count = 0
    batch_size = 500

    def flush() -> None:
        nonlocal batch, count
        if not batch:
            return
        response = client.post(
            f"{base}/rest/v1/observation",
            headers={
                **_rest_headers(key),
                "Prefer": "return=minimal",
            },
            json=batch,
            timeout=120,
        )
        if response.status_code >= 400:
            raise RuntimeError(
                f"observation insert failed ({manifest.indicator_id}): "
                f"{response.status_code} {response.text[:500]}"
            )
        count += len(batch)
        batch = []

    with package.curated_csv.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            raw_value = row.get("value")
            value = None if raw_value in (None, "") else float(raw_value)
            notes = row.get("notes") or ""
            dims = dimensions_from_notes(notes)
            dim_fields = dimensions_to_db_fields(dims)
            batch.append(
                {
                    "indicator_id": row["indicator_id"],
                    "release_id": release_id,
                    "period_start": row["period_start"],
                    "period_end": row["period_end"],
                    "geography_code": row["geography_code"],
                    "geography_label": row["geography_label"],
                    "value": value,
                    "unit": row["unit"],
                    "observation_status": row["observation_status"],
                    "source_version": row["source_version"],
                    "notes": notes,
                    **dim_fields,
                }
            )
            if len(batch) >= batch_size:
                flush()
    flush()
    return count


def load_all_via_rest(
    *, max_bytes: int | None = None, only: set[str] | None = None
) -> None:
    """Load Ready packages through Supabase PostgREST (no direct DB password needed)."""
    base, key = _rest_config()
    packages = _select_packages(only)

    with httpx.Client() as client:
        for package in packages:
            if not _is_observation_package(package):
                print(f"skip {package.manifest.indicator_id}: not observation CSV")
                continue
            size = package.curated_csv.stat().st_size
            if max_bytes is not None and size > max_bytes:
                print(
                    f"skip {package.manifest.indicator_id}: "
                    f"{size // 1024} KiB over --max-kb limit"
                )
                continue
            print(f"rest  {package.manifest.indicator_id} ({size // 1024} KiB) …")
            _rest_upsert_indicator(client, base, key, package.manifest)
            release_id = _rest_upsert_release(client, base, key, package)
            n = _rest_replace_observations(client, base, key, package, release_id)
            print(f"loaded {package.manifest.indicator_id}: {n} observations (release_id={release_id})")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--via-rest",
        action="store_true",
        help="Load through Supabase PostgREST using SUPABASE_URL + API key",
    )
    parser.add_argument(
        "--max-kb",
        type=int,
        default=None,
        help="With --via-rest, skip curated CSVs larger than this many KiB",
    )
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        metavar="INDICATOR_ID",
        help="Load only this indicator_id (repeatable). Needs the curated CSV on disk.",
    )
    args = parser.parse_args(argv)
    only = set(args.only) or None
    if args.via_rest:
        max_bytes = None if args.max_kb is None else args.max_kb * 1024
        load_all_via_rest(max_bytes=max_bytes, only=only)
    else:
        load_all(only=only)


if __name__ == "__main__":
    main()

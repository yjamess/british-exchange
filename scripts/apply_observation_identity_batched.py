#!/usr/bin/env python3
"""Apply observation note/identity backfill in small batches (production-safe).

Use when a single-transaction migration times out on hosted Postgres.
Requires DATABASE_URL. Idempotent: only fills NULL note_id / identity_hash.

Example:
  uv run python scripts/apply_observation_identity_batched.py --batch-size 25000
"""

from __future__ import annotations

import argparse
import time

from britain_exchange.db import apply_migrations, connect, require_database_url


def _ensure_scaffold(conn) -> None:
    """Create extension/table/columns without the heavy backfill."""
    conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS observation_note (
            note_id   BIGSERIAL PRIMARY KEY,
            note_text TEXT NOT NULL,
            CONSTRAINT observation_note_text_uid UNIQUE (note_text)
        )
        """
    )
    conn.execute(
        """
        ALTER TABLE observation
            ADD COLUMN IF NOT EXISTS note_id BIGINT,
            ADD COLUMN IF NOT EXISTS identity_hash BYTEA
        """
    )
    conn.commit()


def _seed_notes(conn) -> int:
    before = conn.execute("SELECT COUNT(*)::int AS n FROM observation_note").fetchone()["n"]
    conn.execute(
        """
        INSERT INTO observation_note (note_text)
        SELECT DISTINCT notes
        FROM observation
        WHERE notes IS NOT NULL
        ON CONFLICT (note_text) DO NOTHING
        """
    )
    conn.commit()
    after = conn.execute("SELECT COUNT(*)::int AS n FROM observation_note").fetchone()["n"]
    return int(after) - int(before)


def _backfill_note_ids(conn, batch_size: int) -> int:
    total = 0
    while True:
        row = conn.execute(
            """
            WITH chunk AS (
                SELECT observation_id
                FROM observation
                WHERE note_id IS NULL
                ORDER BY observation_id
                LIMIT %s
            )
            UPDATE observation o
            SET note_id = n.note_id
            FROM observation_note n, chunk
            WHERE o.observation_id = chunk.observation_id
              AND o.notes = n.note_text
            RETURNING o.observation_id
            """,
            (batch_size,),
        ).fetchall()
        conn.commit()
        n = len(row)
        total += n
        print(f"  note_id +{n} (total {total})", flush=True)
        if n == 0:
            break
        time.sleep(0.2)
    return total


def _backfill_hashes(conn, batch_size: int) -> int:
    total = 0
    while True:
        row = conn.execute(
            """
            WITH chunk AS (
                SELECT observation_id
                FROM observation
                WHERE identity_hash IS NULL
                ORDER BY observation_id
                LIMIT %s
            )
            UPDATE observation o
            SET identity_hash = digest(
                concat_ws(
                    E'\\x1f',
                    o.release_id::text,
                    to_char(o.period_start, 'YYYY-MM-DD'),
                    to_char(o.period_end, 'YYYY-MM-DD'),
                    o.geography_code,
                    o.dim_fuel,
                    o.dim_water_company,
                    o.dim_demographic,
                    o.dim_series,
                    o.dim_category,
                    o.notes
                ),
                'sha256'
            )
            FROM chunk
            WHERE o.observation_id = chunk.observation_id
            RETURNING o.observation_id
            """,
            (batch_size,),
        ).fetchall()
        conn.commit()
        n = len(row)
        total += n
        print(f"  identity_hash +{n} (total {total})", flush=True)
        if n == 0:
            break
        time.sleep(0.2)
    return total


def _finalize(conn) -> None:
    gaps = conn.execute(
        """
        SELECT
          COUNT(*) FILTER (WHERE note_id IS NULL)::int AS null_notes,
          COUNT(*) FILTER (WHERE identity_hash IS NULL)::int AS null_hash
        FROM observation
        """
    ).fetchone()
    if gaps["null_notes"] or gaps["null_hash"]:
        raise RuntimeError(f"backfill gaps remain: {dict(gaps)}")
    conn.execute("ALTER TABLE observation ALTER COLUMN note_id SET NOT NULL")
    conn.execute("ALTER TABLE observation ALTER COLUMN identity_hash SET NOT NULL")
    conn.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'observation_note_id_fkey'
            ) THEN
                ALTER TABLE observation
                    ADD CONSTRAINT observation_note_id_fkey
                    FOREIGN KEY (note_id) REFERENCES observation_note (note_id);
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'observation_release_identity_uid'
            ) THEN
                ALTER TABLE observation
                    ADD CONSTRAINT observation_release_identity_uid
                    UNIQUE (release_id, identity_hash);
            END IF;
        END $$;
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS observation_note_id_idx ON observation (note_id)"
    )
    conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch-size", type=int, default=25_000)
    parser.add_argument(
        "--record-migration",
        action="store_true",
        help="Also run apply_migrations so 004 is recorded if already applied by this script",
    )
    args = parser.parse_args()
    print("DATABASE_URL host ok:", "supabase" in (require_database_url()))
    with connect() as conn:
        print("scaffold…", flush=True)
        _ensure_scaffold(conn)
        print("seed notes…", flush=True)
        added = _seed_notes(conn)
        print(f"  new dictionary rows: {added}", flush=True)
        print("backfill note_id…", flush=True)
        _backfill_note_ids(conn, args.batch_size)
        print("backfill identity_hash…", flush=True)
        _backfill_hashes(conn, args.batch_size)
        print("finalize constraints…", flush=True)
        _finalize(conn)
        if args.record_migration:
            # If 004 SQL is already effectively applied, apply_migrations may try
            # to re-run it. Prefer recording checksum manually when using batches.
            applied = apply_migrations(conn)
            print("apply_migrations:", applied or "none")
    print("done")


if __name__ == "__main__":
    main()

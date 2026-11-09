"""PostgreSQL helpers for the observation spine.

Set DATABASE_URL, e.g.:
  postgresql://britain:britain@127.0.0.1:5432/britain_exchange
"""

from __future__ import annotations

import hashlib
import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

REPO_ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = REPO_ROOT / "database" / "migrations"


def load_repo_env() -> None:
    """Copy the repo `.env` file into this process.

    Python only sees variables the shell exported. A `.env` file is ignored
    until something reads it. A variable already set in the shell is left as it
    is, so an exported ``DATABASE_URL`` wins over the file.
    https://docs.python.org/3/library/os.html#os.environ
    """
    path = REPO_ROOT / ".env"
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        key, sep, value = line.partition("=")
        if not sep:
            continue
        key = key.strip()
        if not key or key in os.environ:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ[key] = value


# Load once on import so the API sees `.env` without a manual export.
load_repo_env()


def database_url() -> str | None:
    """Return the Postgres URL from the process environment.

    Checks ``DATABASE_URL`` first, then common host aliases. Empty / whitespace
    values count as unset (a frequent Railway paste mistake).
    """
    for key in (
        "DATABASE_URL",
        "POSTGRES_URL",
        "POSTGRES_PRIVATE_URL",
        "DATABASE_PRIVATE_URL",
    ):
        raw = os.environ.get(key)
        if raw is None:
            continue
        url = raw.strip().strip("'").strip('"')
        if url:
            return url
    return None


def require_database_url() -> str:
    url = database_url()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. On Railway, add it under the API service "
            "Variables (exact name DATABASE_URL), then redeploy. Example: "
            "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
        )
    return url


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    with psycopg.connect(require_database_url(), row_factory=dict_row) as conn:
        yield conn


def apply_migrations(conn: psycopg.Connection) -> list[str]:
    """Apply immutable SQL migrations once, atomically, with bounded lock waits.

    Serialise migration runners, record checksums, and never rewrite release
    data just because an importer starts. Existing installations can baseline
    verified migrations in schema_migration before their first tracked run.
    """
    applied: list[str] = []
    try:
        conn.execute("SET LOCAL lock_timeout = '3s'")
        conn.execute("SELECT pg_advisory_xact_lock(728194620)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_migration (
                name TEXT PRIMARY KEY,
                checksum_sha256 TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        recorded = {
            row["name"]: row["checksum_sha256"]
            for row in conn.execute(
                "SELECT name, checksum_sha256 FROM schema_migration"
            ).fetchall()
        }
        pending = []
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            sql = path.read_text(encoding="utf-8")
            checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()
            if path.name in recorded:
                if recorded[path.name] != checksum:
                    raise RuntimeError(
                        f"Applied migration {path.name} has changed; add a new migration instead."
                    )
                continue
            pending.append((path.name, sql, checksum))
        for name, sql, checksum in pending:
            conn.execute(sql)
            conn.execute(
                "INSERT INTO schema_migration (name, checksum_sha256) VALUES (%s, %s)",
                (name, checksum),
            )
            applied.append(name)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return applied

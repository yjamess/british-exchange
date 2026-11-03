"""PostgreSQL helpers for the observation spine.

Set DATABASE_URL, e.g.:
  postgresql://britain:britain@127.0.0.1:5432/britain_exchange
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

REPO_ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = REPO_ROOT / "database" / "migrations"


def database_url() -> str | None:
    return os.environ.get("DATABASE_URL") or None


def require_database_url() -> str:
    url = database_url()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Example: "
            "postgresql://britain:britain@127.0.0.1:5432/britain_exchange"
        )
    return url


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    with psycopg.connect(require_database_url(), row_factory=dict_row) as conn:
        yield conn


def apply_migrations(conn: psycopg.Connection) -> list[str]:
    applied: list[str] = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        sql = path.read_text(encoding="utf-8")
        conn.execute(sql)
        applied.append(path.name)
    conn.commit()
    return applied

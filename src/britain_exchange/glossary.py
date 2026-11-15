"""Shared terms registry: plain definitions behind the ``Term`` marker.

Source of truth is Postgres (``glossary_term``). ``data/glossary/terms.yaml`` is
the connector pin that this module validates and upserts.

Usage:
  uv run python -m britain_exchange.glossary            # validate + load to DATABASE_URL
  uv run python -m britain_exchange.glossary --check    # validate only
"""

from __future__ import annotations

import argparse
import re
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from britain_exchange.db import REPO_ROOT, apply_migrations, close_pool, connect
from britain_exchange.store import using_postgres

TERMS_PATH = REPO_ROOT / "data" / "glossary" / "terms.yaml"
_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class Term:
    slug: str
    short: str
    full_name: str
    definition: str
    sector: str
    group: str = ""
    note: str = ""
    seen_on: str = ""
    related_indicator_ids: list[str] = field(default_factory=list)
    source_url: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "short": self.short,
            "full_name": self.full_name,
            "definition": self.definition,
            "note": self.note,
            "sector": self.sector,
            "group": self.group,
            "related_indicator_ids": list(self.related_indicator_ids),
            "source_url": self.source_url,
        }


def load_terms_yaml(path: Path = TERMS_PATH) -> list[Term]:
    """Read and validate the pinned YAML. Raises ValueError on the first bad row."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    rows = raw.get("terms") or []
    terms: list[Term] = []
    seen: set[str] = set()
    for i, row in enumerate(rows):
        slug = str(row.get("slug") or "").strip()
        if not _SLUG.match(slug):
            raise ValueError(f"terms[{i}]: bad slug {slug!r}")
        if slug in seen:
            raise ValueError(f"terms[{i}]: duplicate slug {slug!r}")
        seen.add(slug)
        for key in ("short", "full_name", "definition", "sector"):
            if not str(row.get(key) or "").strip():
                raise ValueError(f"terms[{i}] ({slug}): {key} is required")
        definition = str(row["definition"]).strip()
        if len(definition) > 240:
            raise ValueError(f"terms[{i}] ({slug}): definition over 240 chars; move detail to note")
        terms.append(
            Term(
                slug=slug,
                short=str(row["short"]).strip(),
                full_name=str(row["full_name"]).strip(),
                definition=definition,
                sector=str(row["sector"]).strip(),
                group=str(row.get("group") or "").strip(),
                note=str(row.get("note") or "").strip(),
                seen_on=str(row.get("seen_on") or "").strip(),
                related_indicator_ids=[str(x) for x in (row.get("related_indicator_ids") or [])],
                source_url=str(row.get("source_url") or "").strip(),
            )
        )
    return terms


def upsert_terms(conn, terms: list[Term]) -> None:
    """Replace the registry with the pinned set (removed slugs are deleted)."""
    conn.execute(
        "DELETE FROM glossary_term WHERE slug <> ALL(%s)",
        ([t.slug for t in terms],),
    )
    for t in terms:
        conn.execute(
            """
            INSERT INTO glossary_term (
                slug, short, full_name, definition, note, sector, "group",
                related_indicator_ids, source_url, updated_at
            ) VALUES (
                %(slug)s, %(short)s, %(full_name)s, %(definition)s, %(note)s,
                %(sector)s, %(group)s, %(related_indicator_ids)s, %(source_url)s, now()
            )
            ON CONFLICT (slug) DO UPDATE SET
                short = EXCLUDED.short,
                full_name = EXCLUDED.full_name,
                definition = EXCLUDED.definition,
                note = EXCLUDED.note,
                sector = EXCLUDED.sector,
                "group" = EXCLUDED."group",
                related_indicator_ids = EXCLUDED.related_indicator_ids,
                source_url = EXCLUDED.source_url,
                updated_at = now()
            """,
            t.as_dict(),
        )


# ——— Read side (API) ———
_CACHE: dict[str, Any] = {"key": None, "rows": None}
_LOCK = threading.Lock()


def _rows_from_db() -> list[dict[str, Any]]:
    with connect() as conn:
        key = conn.execute(
            "SELECT COUNT(*) AS n, COALESCE(MAX(updated_at)::text, '') AS u FROM glossary_term"
        ).fetchone()
        key = (key["n"], key["u"])
        if _CACHE["key"] == key and _CACHE["rows"] is not None:
            return _CACHE["rows"]
        rows = conn.execute(
            """
            SELECT slug, short, full_name, definition, note, sector, "group",
                   related_indicator_ids, source_url
            FROM glossary_term ORDER BY sector, "group", short
            """
        ).fetchall()
    rows = [dict(r) for r in rows]
    with _LOCK:
        _CACHE.update(key=key, rows=rows)
    return rows


def list_terms(sector: str | None = None) -> list[dict[str, Any]]:
    """All terms, from Postgres when configured, else the pinned YAML (dev only)."""
    rows = _rows_from_db() if using_postgres() else [t.as_dict() for t in load_terms_yaml()]
    if sector:
        rows = [r for r in rows if r["sector"] in (sector, "shared")]
    return rows


def get_term(slug: str) -> dict[str, Any] | None:
    for row in list_terms():
        if row["slug"] == slug:
            return row
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="validate the YAML only")
    args = parser.parse_args()
    terms = load_terms_yaml()
    print(f"{len(terms)} terms valid in {TERMS_PATH.relative_to(REPO_ROOT)}")
    if args.check:
        return
    with connect() as conn:
        applied = apply_migrations(conn)
        if applied:
            print("applied migrations:", ", ".join(applied))
        upsert_terms(conn, terms)
        conn.commit()
        n = conn.execute("SELECT COUNT(*) AS n FROM glossary_term").fetchone()["n"]
    close_pool()
    print(f"glossary_term now holds {n} rows")


if __name__ == "__main__":
    main()

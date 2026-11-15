-- Shared terms registry: plain definitions for acronyms and terms of art that
-- recur across sector pages. Indicator definitions stay on `indicator`; this
-- table holds the cross-cutting vocabulary the `Term` marker reads.
-- Seed: data/glossary/terms.yaml (connector pin only; Postgres is the source).
CREATE TABLE IF NOT EXISTS glossary_term (
    slug TEXT PRIMARY KEY,
    short TEXT NOT NULL,
    full_name TEXT NOT NULL,
    definition TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    sector TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT '',
    related_indicator_ids TEXT[] NOT NULL DEFAULT '{}',
    source_url TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS glossary_term_sector_idx ON glossary_term (sector);

-- Britain Exchange — observation spine (Layer B)
-- Apply: psql "$DATABASE_URL" -f database/migrations/001_init.sql

CREATE TABLE IF NOT EXISTS indicator (
    indicator_id       TEXT PRIMARY KEY,
    title              TEXT NOT NULL,
    sector             TEXT NOT NULL,
    publisher          TEXT NOT NULL,
    source_url         TEXT NOT NULL,
    series_id          TEXT NOT NULL,
    geography          TEXT NOT NULL,
    frequency          TEXT NOT NULL,
    unit               TEXT NOT NULL,
    definition         TEXT NOT NULL DEFAULT '',
    licence            TEXT NOT NULL DEFAULT '',
    caveats            TEXT NOT NULL DEFAULT '',
    revision_notes     TEXT NOT NULL DEFAULT '',
    notion_registry_url TEXT NOT NULL DEFAULT '',
    agent_owner        TEXT NOT NULL DEFAULT '',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_release (
    release_id             BIGSERIAL PRIMARY KEY,
    indicator_id           TEXT NOT NULL REFERENCES indicator (indicator_id) ON DELETE CASCADE,
    source_version         TEXT NOT NULL,
    official_release_date  DATE,
    retrieved_at           TIMESTAMPTZ,
    checksum_sha256        TEXT NOT NULL DEFAULT '',
    raw_path               TEXT,
    UNIQUE (indicator_id, source_version, checksum_sha256)
);

CREATE TABLE IF NOT EXISTS observation (
    observation_id       BIGSERIAL PRIMARY KEY,
    indicator_id         TEXT NOT NULL REFERENCES indicator (indicator_id) ON DELETE CASCADE,
    release_id           BIGINT NOT NULL REFERENCES data_release (release_id) ON DELETE CASCADE,
    period_start         DATE NOT NULL,
    period_end           DATE NOT NULL,
    geography_code       TEXT NOT NULL,
    geography_label      TEXT NOT NULL,
    value                DOUBLE PRECISION,
    unit                 TEXT NOT NULL,
    observation_status   TEXT NOT NULL,
    source_version       TEXT NOT NULL,
    notes                TEXT NOT NULL DEFAULT '',
    UNIQUE (indicator_id, period_start, period_end, geography_code, notes, source_version)
);

CREATE INDEX IF NOT EXISTS observation_indicator_period_idx
    ON observation (indicator_id, period_start);

CREATE INDEX IF NOT EXISTS observation_indicator_notes_idx
    ON observation (indicator_id, notes);

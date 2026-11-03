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
    is_current             BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (indicator_id, source_version, checksum_sha256)
);

CREATE TABLE IF NOT EXISTS observation (
    observation_id           BIGSERIAL PRIMARY KEY,
    indicator_id             TEXT NOT NULL REFERENCES indicator (indicator_id) ON DELETE CASCADE,
    release_id               BIGINT NOT NULL REFERENCES data_release (release_id) ON DELETE CASCADE,
    period_start             DATE NOT NULL,
    period_end               DATE NOT NULL,
    geography_code           TEXT NOT NULL,
    geography_label          TEXT NOT NULL,
    value                    DOUBLE PRECISION,
    unit                     TEXT NOT NULL,
    observation_status       TEXT NOT NULL,
    source_version           TEXT NOT NULL,
    notes                    TEXT NOT NULL DEFAULT '',
    dim_fuel                 TEXT NOT NULL DEFAULT '',
    dim_water_company        TEXT NOT NULL DEFAULT '',
    dim_water_company_name   TEXT NOT NULL DEFAULT '',
    dim_demographic          TEXT NOT NULL DEFAULT '',
    dim_series               TEXT NOT NULL DEFAULT '',
    dim_category             TEXT NOT NULL DEFAULT '',
    -- notes remains in the key for structural tags not yet promoted to dim_*.
    CONSTRAINT observation_release_dims_uid UNIQUE (
        indicator_id,
        release_id,
        period_start,
        period_end,
        geography_code,
        dim_fuel,
        dim_water_company,
        dim_demographic,
        dim_series,
        dim_category,
        notes
    )
);

CREATE INDEX IF NOT EXISTS observation_indicator_period_idx
    ON observation (indicator_id, period_start);

-- Dimension / is_current indexes are created in 002 so upgrades of older
-- 001 tables (without those columns yet) do not fail mid-migration.

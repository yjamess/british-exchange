-- Phase 1: note dictionary + compact identity_hash uniqueness (additive).
-- Keeps observation.notes and observation_release_dims_uid until a follow-up
-- migration drops them after collision validation.
-- Apply via britain_exchange.db.apply_migrations (staging first).
--
-- identity_hash = sha256 of UTF-8 fields joined by U+001F (unit separator),
-- matching britain_exchange.dimensions.observation_identity_hash.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS observation_note (
    note_id   BIGSERIAL PRIMARY KEY,
    note_text TEXT NOT NULL,
    CONSTRAINT observation_note_text_uid UNIQUE (note_text)
);

ALTER TABLE observation
    ADD COLUMN IF NOT EXISTS note_id BIGINT,
    ADD COLUMN IF NOT EXISTS identity_hash BYTEA;

-- Dictionary of distinct note strings currently on observation.
INSERT INTO observation_note (note_text)
SELECT DISTINCT notes
FROM observation
WHERE notes IS NOT NULL
ON CONFLICT (note_text) DO NOTHING;

-- Link rows to the dictionary.
UPDATE observation o
SET note_id = n.note_id
FROM observation_note n
WHERE o.note_id IS NULL
  AND o.notes = n.note_text;

-- Canonical identity hash (must match britain_exchange.dimensions.observation_identity_hash).
UPDATE observation
SET identity_hash = digest(
    concat_ws(
        E'\x1f',
        release_id::text,
        to_char(period_start, 'YYYY-MM-DD'),
        to_char(period_end, 'YYYY-MM-DD'),
        geography_code,
        dim_fuel,
        dim_water_company,
        dim_demographic,
        dim_series,
        dim_category,
        notes
    ),
    'sha256'
)
WHERE identity_hash IS NULL;

-- Fail loudly if backfill left gaps (empty table is fine).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM observation LIMIT 1) THEN
        IF EXISTS (SELECT 1 FROM observation WHERE note_id IS NULL) THEN
            RAISE EXCEPTION '004_observation_note_identity: note_id backfill left NULLs';
        END IF;
        IF EXISTS (SELECT 1 FROM observation WHERE identity_hash IS NULL) THEN
            RAISE EXCEPTION '004_observation_note_identity: identity_hash backfill left NULLs';
        END IF;
    END IF;
END $$;

ALTER TABLE observation
    ALTER COLUMN note_id SET NOT NULL,
    ALTER COLUMN identity_hash SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'observation_note_id_fkey'
    ) THEN
        ALTER TABLE observation
            ADD CONSTRAINT observation_note_id_fkey
            FOREIGN KEY (note_id) REFERENCES observation_note (note_id);
    END IF;
END $$;

-- Compact uniqueness alongside the legacy notes-based unique key.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'observation_release_identity_uid'
    ) THEN
        ALTER TABLE observation
            ADD CONSTRAINT observation_release_identity_uid
            UNIQUE (release_id, identity_hash);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS observation_note_id_idx
    ON observation (note_id);

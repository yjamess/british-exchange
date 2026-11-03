-- Preserve release history + typed observation dimensions (upgrade from 001).
-- Idempotent: safe to re-run via britain_exchange.db.apply_migrations.
-- Order matters: backfill dimensions BEFORE adding the dimension unique key.

ALTER TABLE data_release
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE observation ADD COLUMN IF NOT EXISTS dim_fuel TEXT NOT NULL DEFAULT '';
ALTER TABLE observation ADD COLUMN IF NOT EXISTS dim_water_company TEXT NOT NULL DEFAULT '';
ALTER TABLE observation ADD COLUMN IF NOT EXISTS dim_water_company_name TEXT NOT NULL DEFAULT '';
ALTER TABLE observation ADD COLUMN IF NOT EXISTS dim_demographic TEXT NOT NULL DEFAULT '';
ALTER TABLE observation ADD COLUMN IF NOT EXISTS dim_series TEXT NOT NULL DEFAULT '';
ALTER TABLE observation ADD COLUMN IF NOT EXISTS dim_category TEXT NOT NULL DEFAULT '';

-- Drop the notes-based uniqueness from the original 001 (name may vary).
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'observation'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) LIKE '%notes%';
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE observation DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Backfill typed dimensions from structured notes BEFORE uniqueness on dims.
UPDATE observation
SET dim_fuel = trim(both FROM substring(notes FROM 'fuel=([^;]+)'))
WHERE dim_fuel = '' AND notes ~ 'fuel=';

UPDATE observation
SET dim_water_company = trim(both FROM substring(notes FROM 'company=([^;]+)'))
WHERE dim_water_company = '' AND notes ~ 'company=';

UPDATE observation
SET dim_water_company_name = trim(both FROM substring(notes FROM 'company_name=([^;]+)'))
WHERE dim_water_company_name = '' AND notes ~ 'company_name=';

UPDATE observation
SET dim_demographic = trim(both FROM substring(notes FROM 'sex=([^;]+)'))
WHERE dim_demographic = '' AND notes ~ 'sex=';

UPDATE observation
SET dim_demographic = trim(both FROM substring(notes FROM 'demographic=([^;]+)'))
WHERE dim_demographic = '' AND notes ~ 'demographic=';

UPDATE observation
SET dim_demographic = trim(both FROM substring(notes FROM 'tenure=([^;]+)'))
WHERE dim_demographic = '' AND notes ~ 'tenure=';

UPDATE observation
SET dim_series = trim(both FROM substring(notes FROM 'series=([^;]+)'))
WHERE dim_series = '' AND notes ~ 'series=';

UPDATE observation
SET dim_category = trim(both FROM substring(notes FROM 'band=([^;]+)'))
WHERE dim_category = '' AND notes ~ 'band=';

UPDATE observation
SET dim_category = trim(both FROM substring(notes FROM 'vehicle=([^;]+)'))
WHERE dim_category = '' AND notes ~ 'vehicle=';

UPDATE observation
SET dim_category = trim(both FROM substring(notes FROM 'classification=([^;]+)'))
WHERE dim_category = '' AND notes ~ 'classification=';

UPDATE observation
SET dim_category = trim(both FROM substring(notes FROM 'kind=([^;]+)'))
WHERE dim_category = '' AND notes ~ 'kind=';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'observation_release_dims_uid'
    ) THEN
        ALTER TABLE observation
            ADD CONSTRAINT observation_release_dims_uid UNIQUE (
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
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS observation_indicator_dims_idx
    ON observation (indicator_id, dim_fuel, dim_water_company, dim_demographic, dim_category);

CREATE INDEX IF NOT EXISTS data_release_current_idx
    ON data_release (indicator_id, is_current);

UPDATE data_release dr
SET is_current = TRUE
FROM (
    SELECT DISTINCT ON (indicator_id) release_id
    FROM data_release
    ORDER BY indicator_id, release_id DESC
) latest
WHERE dr.release_id = latest.release_id
  AND NOT EXISTS (
      SELECT 1 FROM data_release x
      WHERE x.indicator_id = dr.indicator_id AND x.is_current
  );

-- Phase 2: drop the wide notes-based unique key and the duplicated notes column.
-- Requires 004_observation_note_identity.sql (note_id + identity_hash + compact unique).
-- Readers must join observation_note for note text (store.py already does).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'observation_release_identity_uid'
    ) THEN
        RAISE EXCEPTION
            '005_drop_legacy_observation_notes_unique: observation_release_identity_uid missing — apply 004 first';
    END IF;
END $$;

ALTER TABLE observation
    DROP CONSTRAINT IF EXISTS observation_release_dims_uid;

ALTER TABLE observation
    DROP COLUMN IF EXISTS notes;

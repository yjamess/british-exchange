-- Catalogue freshness: the publisher's update cadence and a plain status note for
-- finished, one-off, pinned or future-dated series. Additive; observations untouched.
ALTER TABLE indicator ADD COLUMN IF NOT EXISTS update_cadence TEXT NOT NULL DEFAULT '';
ALTER TABLE indicator ADD COLUMN IF NOT EXISTS status_note TEXT NOT NULL DEFAULT '';

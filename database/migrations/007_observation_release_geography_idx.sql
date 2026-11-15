-- Reader path for every sector page: observations are always fetched for one indicator
-- and its current release, often for one geography, ordered by period. The existing
-- (indicator_id, period_start) index made Postgres walk every row of the indicator and
-- filter: 270k rows for one UK rents query (13 s). This index answers that filter directly
-- and, with geography_label included, lets the rent place list be an index-only scan.
CREATE INDEX IF NOT EXISTS observation_indicator_release_geo_period_idx
    ON observation (indicator_id, release_id, geography_code, period_start)
    INCLUDE (geography_label);

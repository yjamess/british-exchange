-- Price Paid transaction layer (Domain 01 slice — not Observation rows).
-- Apply via britain_exchange.db.apply_migrations.

CREATE TABLE IF NOT EXISTS price_paid_transaction (
    transaction_id   TEXT PRIMARY KEY,
    price            INTEGER NOT NULL,
    transfer_date    DATE NOT NULL,
    postcode         TEXT NOT NULL DEFAULT '',
    property_type    TEXT NOT NULL DEFAULT '',
    new_build        BOOLEAN NOT NULL DEFAULT FALSE,
    tenure           TEXT NOT NULL DEFAULT '',
    paon             TEXT NOT NULL DEFAULT '',
    saon             TEXT NOT NULL DEFAULT '',
    street           TEXT NOT NULL DEFAULT '',
    locality         TEXT NOT NULL DEFAULT '',
    town             TEXT NOT NULL DEFAULT '',
    district         TEXT NOT NULL DEFAULT '',
    county           TEXT NOT NULL DEFAULT '',
    ppd_category     TEXT NOT NULL DEFAULT '',
    record_status    TEXT NOT NULL DEFAULT '',
    source_year      INTEGER NOT NULL DEFAULT 2025
);

CREATE INDEX IF NOT EXISTS price_paid_postcode_idx
    ON price_paid_transaction (postcode);

CREATE INDEX IF NOT EXISTS price_paid_street_town_idx
    ON price_paid_transaction (street, town);

CREATE INDEX IF NOT EXISTS price_paid_date_idx
    ON price_paid_transaction (transfer_date);

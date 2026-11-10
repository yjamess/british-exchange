# QA — observation identity hash (Phase 1)

**Date:** 2026-11-10  
**Owner:** Orchestrator / Validation  
**Scope:** Prove `(release_id, identity_hash)` uniqueness before dropping `observation_release_dims_uid`.

## Staging (local `britain_exchange`)

- Applied `004_observation_note_identity.sql` only on local staging (not production).
- Row counts after backfill: 1,034,503 observations; 39,348 dictionary notes; 0 NULL `note_id` / `identity_hash`.
- Both uniques present: `observation_release_dims_uid` (legacy) and `observation_release_identity_uid` (new).
- Global duplicate `(release_id, identity_hash)` groups: **0**.
- Reloaded via new loader: `transmission-entry-capacity-register` (2,211), `domestic-electricity-unit-standing` (2,048).
- Python `observation_identity_hash` vs SQL `digest(..., 'sha256')` parity: **0 mismatches** on sampled rows (incl. TEC / unit-standing).
- Unit tests: `tests/test_observation_identity.py`, `tests/test_dimensions.py`, `tests/test_load_revisions.py` — pass against staging `DATABASE_URL`.

## Production (read-only hash probe; no DDL)

Computed the same canonical hash with `pgcrypto.digest` for focus indicators — **0 duplicate pairs**:

| indicator_id | rows | distinct hashes | duplicate pairs |
|--------------|------|-----------------|-----------------|
| transmission-entry-capacity-register | 2,211 | 2,211 | 0 |
| domestic-electricity-unit-standing | 2,048 | 2,048 | 0 |
| domestic-electricity-bills | 80 | 80 | 0 |
| subnational-final-consumption | 30,720 | 30,720 | 0 |
| private-rental-prices | 541,299 | 541,299 | 0 |
| epc-domestic-lodgements-by-local-authority | 216,918 | 216,918 | 0 |

## Verdict

Phase 1 identity key is collision-free for the audited series. **Safe to schedule Phase 2** (drop legacy unique + optionally drop `observation.notes`) after production applies `004` on a maintenance window. Do **not** drop `observation_release_dims_uid` until production backfill + new unique are verified live.

## Production cutover (2026-11-10 evening)

After Free→Pro upgrade and recovery from disk-full crash-loop:

1. Batched `note_id` + `identity_hash` backfill under `BEGIN; SET TRANSACTION READ WRITE;` (platform stayed read-only for autocommit sessions).
2. Added `observation_release_identity_uid`; **0** duplicate identity groups.
3. Dropped `observation_release_dims_uid` + `observation.notes` (005).
4. `VACUUM FULL` on `observation` / `observation_note`.
5. Recorded `004` / `005` in `schema_migration`.

Live focus-series check after cutover: TEC 2211, unit-standing 2048, bills 80, subnational 30720, PIPR 541299, EPC-LA 216918 — each `n == distinct (release_id, identity_hash)`.

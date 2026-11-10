# Observation uniqueness and storage audit

**Status:** Design approved; Phase 1 implementation is additive (keeps existing unique constraint and `notes` column).  
**Project:** Supabase `british-exchange` (`wqofhaddnavcthuqpijv`), Postgres 17.  
**Measured (audit day):** DB **847 MB**; `observation` total **835 MB** (heap **363 MB**, indexes **471 MB** of which `observation_release_dims_uid` is **428 MB**).

---

## 1. Findings (live)

| Metric | Value |
|--------|--------|
| Rows | 1,130,479 |
| Distinct `notes` | 43,965 |
| Empty notes | 0 |
| Avg note length | ~121 chars (~123 B stored) |
| Notes column sum | ~132 MB |
| Historic (non-current) obs | ~34k (not the bloat driver) |
| Indicators needing notes for uniqueness | **30** |
| Groups that collide if notes dropped from unique key | 9,693 groups / ~49k rows |

Largest row counts: `private-rental-prices` (541k), `epc-domestic-lodgements-by-local-authority` (217k), `manufacturing-iop-by-division` (68k).

**Root cause:** Indexes (especially the unique constraint that includes full `notes`) exceed heap size. Free Plan pressure is an **index-width** problem, not “too many observations.”

```mermaid
flowchart LR
  connectors[Sector connectors] --> csv[curated/observations.csv]
  csv --> loadReady[load_ready DELETE plus INSERT]
  loadReady --> obs[(observation)]
  obs --> uid["UNIQUE ... notes TEXT"]
  uid --> bloat[428 MB unique index]
  obs --> api[store.py / FastAPI]
  api --> web[Energy and Housing UI]
```

---

## 2. Code paths touching `public.observation`

### Writes

- `src/britain_exchange/load_ready.py` — sole production writer
  - SQL: `DELETE FROM observation WHERE release_id = %s` then batched `INSERT` (no `ON CONFLICT` on observation)
  - PostgREST: `_rest_replace_observations` (same delete-and-replace)
  - Derives `dim_*` via `dimensions_from_notes`
- `database/migrations/002_releases_and_dimensions.sql` — one-time `dim_*` backfill `UPDATE`s
- Sector connectors **do not** write Postgres; they emit CSV via `Observation`

### Reads

- `src/britain_exchange/store.py` — list/get observations + facets
- `src/britain_exchange/rent_packs.py` — dims only
- `src/britain_exchange/api.py` — HTTP surface
- Validation QA scripts under `src/validation/qa_*` that `SELECT` from observation
- Web: FastAPI / Next proxies only — no direct SQL

### Uniqueness vs conflict resolution

- **Ingestion:** replace whole release → uniqueness rarely fires on refresh; it guards **intra-batch duplicates** and REST multi-insert integrity.
- **Constraint (live at audit):**  
  `UNIQUE (indicator_id, release_id, period_start, period_end, geography_code, dim_fuel, dim_water_company, dim_demographic, dim_series, dim_category, notes)`  
  Schema comment: notes kept for “structural tags not yet promoted to `dim_*`.”
- `indicator_id` is **redundant** with `release_id` (each release already belongs to one indicator).

---

## 3. Role of `notes` today

- Curated contract still requires a free-text `notes` column (`docs/connector-contract.md`).
- Only a subset of keys promote to `dim_*`: fuel, company, demographic, series, category (`band`/`kind`/…).
- Remaining identity lives in notes, e.g.:
  - TEC (`transmission-entry-capacity-register`): `project_id`, `plant_type`, `gate`, …
  - Domestic tariffs: `payment`, `measure`, `region`, `meter`, …
  - Subnational / end-use / interconnectors: `sector`, `end_use`, `corridor`, `flow`, …
- Frontends (especially Energy models and Housing `load.ts`) still regex `notes` even when `dimensions` exists.

**Null / empty dims:** all `dim_*` are `TEXT NOT NULL DEFAULT ''`. Empty string participates in uniqueness (good — SQL `NULL` would make UNIQUE ineffective). Any redesign must keep empty-string semantics, never nullable key dims.

---

## 4. Alternatives assessed

| Approach | Uniqueness | Provenance | Est. DB impact | Verdict |
|----------|------------|------------|----------------|---------|
| A. Drop `notes` from unique only | **Breaks** ~30 indicators | Kept | Shrinks index but collapses distinct rows | Reject |
| B. Promote all remaining tags to new `dim_*` then drop notes from unique | OK if complete | Kept as free text | Shrinks unique if notes leave the key; column sprawl; hard to finish for TEC/EHS | Secondary / later |
| C. `observation_note` + `note_id` in unique (same other columns) | OK | OK | Unique ~428→~290 MB; heap −~130 MB if notes column dropped; **~580 MB** still likely over 500 | Insufficient alone |
| D. **Note dictionary + compact `identity_hash` unique** | OK | OK | Unique ~428→~70–100 MB; heap −~130 MB; new tables ~15 MB; **~380–450 MB** | **Recommend** |
| E. Explicit `source_record_id` only | Helps TEC-like packs | Partial | Does not fix tariff/subnational note-keyed packs | Complement to D |

---

## 5. Recommended schema (D)

```sql
CREATE TABLE observation_note (
  note_id   BIGSERIAL PRIMARY KEY,
  note_text TEXT NOT NULL,
  CONSTRAINT observation_note_text_uid UNIQUE (note_text)
);

-- on observation (additive first):
-- note_id BIGINT NOT NULL REFERENCES observation_note(note_id)
-- identity_hash BYTEA NOT NULL  -- sha256 of canonical key encoding
-- UNIQUE (release_id, identity_hash)  -- replaces observation_release_dims_uid (Phase 2)
```

**Canonical hash input (stable, documented):**  
`release_id`, `period_start`, `period_end`, `geography_code`, `dim_fuel`, `dim_water_company`, `dim_demographic`, `dim_series`, `dim_category`, `note_text`  
joined with Unicode unit separator `U+001F` (empty dims as `""`; UTF-8; dates `YYYY-MM-DD`). Using `note_text` (not only `note_id`) keeps hash stable across note-table rebuilds.

**API compatibility:** `store.py` / CSV export `JOIN observation_note` (or dual-read `notes` while present) and continue returning `notes` as today — no frontend change required for cutover.

**Optional Phase 2 (queryability, not storage):** promote high-churn tags (`payment`, `region`, `measure`, `sector`, `end_use`, `project_id` as `source_record_id`) into typed columns and include them in the hash instead of burying them only in notes — especially TEC and domestic tariffs.

---

## 6. Estimated storage savings

| Change | Approx. effect |
|--------|----------------|
| Replace wide unique with `(release_id, identity_hash)` | **−300 to −350 MB** index |
| Drop duplicated `notes` text from heap (keep dictionary) | **−120 to −135 MB** heap |
| Add `observation_note` + `note_id` + `identity_hash` | **+10 to +20 MB** |
| **Net** | **≈ −400 to −460 MB** → DB **~390–450 MB** (under 500 MB Free Plan, with headroom) |

Historic releases (~34k rows) are minor; do **not** delete them for space.

**Phase 1 (this implementation):** additive only — dictionary + columns + new unique index; **keep** `observation_release_dims_uid` and `notes` until collision suite passes on staging and a follow-up migration drops them.

**Staging result (local, after 004+005 + `VACUUM FULL`):** `observation` total **379 MB** (heap 267 MB, indexes **112 MB**); `observation_note` ~33 MB. Compact unique works.

**Production incident (2026-11-10):** applying 004 in one transaction on Free Plan exhausted disk (`No space left on device` writing `pg_wal`). Instance entered recovery crash-loop. Use `scripts/apply_observation_identity_batched.py` only after disk headroom is restored — never a single multi-hundred-MB rewrite on a full Free Plan volume.

---

## 7. Migration strategy

1. **Staging clone / local DB** — never first drop old uniqueness on production.
2. Create `observation_note`; backfill distinct notes; add nullable `note_id` / `identity_hash`; fill; set `NOT NULL`.
3. Create **new** unique index `observation_release_identity_uid UNIQUE (release_id, identity_hash)`.
4. Validate: row counts unchanged; no duplicate hashes; sample TEC / domestic electricity / PIPR / EPC; API `notes` still present.
5. Drop old `observation_release_dims_uid` only after new unique is live (follow-up migration).
6. Drop `observation.notes` column once readers use the join (follow-up migration).
7. Ship loader/store/API changes in the same deploy window as the schema cutover.
8. `VACUUM (FULL)` / rebuild only if measured bloat remains (maintenance window; optional).

**Loader change:** `replace_release_observations` upserts into `observation_note`, computes `identity_hash`, inserts observation with `note_id`. Curated CSV contract **unchanged**.

---

## 8. Rollback plan

1. Keep old unique constraint until validation gate passes (overlap window).
2. If cutover fails: drop new unique + new columns/table; restore `notes`-based unique from migration backup SQL; redeploy previous loader.
3. If `notes` column already dropped: restore from pre-migration snapshot / PITR; do not attempt partial reconstruct without the note dictionary.
4. Application rollback: previous `load_ready` / `store` digests still expect `notes` on the row — pin app version with DB version.

---

## 9. Performance implications

- **Inserts:** one extra upsert into `observation_note` per distinct note in a batch (small; 44k dictionary). Hash compute is cheap vs network.
- **Reads:** one join for notes; indexable filters still use `dim_*` and `observation_indicator_period_idx`.
- **Unique checks:** narrower btree → faster inserts and less cache pressure.
- **Facets:** unchanged (still on `dim_*`).

---

## 10. Affected files

**Schema / docs**

- `database/migrations/004_observation_note_identity.sql`
- `docs/connector-contract.md`, `docs/schema-compatibility.md`
- This audit doc

**Load / read / API**

- `src/britain_exchange/load_ready.py`
- `src/britain_exchange/store.py`
- `src/britain_exchange/dimensions.py` (hash helper)
- `src/britain_exchange/api.py` (only if CSV path bypasses store)
- `tests/test_load_revisions.py`, `tests/test_dimensions.py`, `tests/test_observation_identity.py`

**Frontend:** none required if API still returns `notes` string.

**Connectors:** none required for Phase 1.

---

## 11. Constraints respected

- No observation deletion proposed.
- Phase 1 does not remove the existing uniqueness constraint.
- Uniqueness guarantee preserved (new form added; old retained until Phase 2).
- Full note text and release history retained.
- Dashboards keep working via `notes` field (column and/or joined dictionary).

# Handover — Economy Domain 08 Public Debt & Government Finances

**Gate:** G2 (evidence only — no frontend) · **Wave:** A · **Owner:** Economy
**Prepared:** 2026-11-11 · **Kickoff:** [agent-kickoff-economy-08-debt.md](agent-kickoff-economy-08-debt.md)
**Notion plan:** [08 · Public Debt & Government Finances](https://app.notion.com/p/414654717685811cb155f725cba481a3)
**Overlap matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)

**Status line:** Validation-**ready**, not **Ready**. Economy self-QA passed (2026-11-03). Independent Validation has not run on these three indicators (no report under `data/qa/`). Do not treat any series below as Ready, or as trusted for UI, until Validation files a PASS.

**Locked question (provisional):** What does the state owe, what does it borrow, and what does debt interest cost?

---

## Artefact 1 — Dataset foundation

### Pin re-validation (2026-11-11 vs live ONS)

I re-fetched each ONS `/data` JSON on 2026-11-11 and compared its SHA-256 with the manifest pin.

| Indicator | CDID | Pinned sha256 (manifest) | Live sha256 2026-11-11 | Match | Latest period | Release | Next release |
|-----------|------|--------------------------|------------------------|-------|---------------|---------|--------------|
| `public-sector-net-debt` | HF6W | `1c277e82…0cb8540e` | `1c277e82…0cb8540e` | yes | 2026-09 = 3005.0 | 2026-10-20 | 20 Nov 2026 |
| `public-sector-net-borrowing` | DZLS | `6244b006…0edcb6dc` | `6244b006…0edcb6dc` | yes | 2026-09 = 24520 | 2026-10-20 | 20 Nov 2026 |
| `public-sector-debt-interest` | NMFX | `56e3bf13…fd9dc620` | `56e3bf13…fd9dc620` | yes | 2026-09 = 10933 | 2026-10-20 | 20 Nov 2026 |

Full values: HF6W `1c277e826426a35dc5cbe8dd3d7330275f523ec23edd6890c3fef2cc0cb8540e`, DZLS `6244b0066ca00a74aa32c09b35a6f3213b48a7a236fbd6d5fe9aa7a20edcb6dc`, NMFX `56e3bf137fbb764fb5ea198af5644816c5e7da756e1b818631a8b2aafd9dc620`.

Pins are current. The next PSF release on **20 Nov 2026** will revise recent months, so re-pin then.

### Packages

| Indicator | Connector | Curated path | Rows | Missing | Span | Curated sha256 |
|-----------|-----------|--------------|------|---------|------|----------------|
| `public-sector-net-debt` | `economy.connectors.public_sector_net_debt` | `data/economy/public-sector-net-debt/curated/observations.csv` | 619 | 198 | 1975-03 → 2026-09 | `b3351af3…3571` |
| `public-sector-net-borrowing` | `economy.connectors.public_sector_net_borrowing` | `data/economy/public-sector-net-borrowing/curated/observations.csv` | 405 | 51 | 1993-01 → 2026-09 | `53ae775f…f77c` |
| `public-sector-debt-interest` | `economy.connectors.public_sector_debt_interest` | `data/economy/public-sector-debt-interest/curated/observations.csv` | 354 | 0 | 1997-04 → 2026-09 | `30e63027…cec6` |

Each package also holds `manifest.yaml`, `README.md` and `validation_report.md`. All three share the spec file `src/economy/connectors/fiscal_series.py` and the base class `src/economy/connectors/ons_timeseries.py`.

Reproduce one package: `uv run python -m economy.connectors.public_sector_net_debt` (same pattern for the other two).

### Series definitions (do not blur these)

| Measure | Indicator | CDID | Concept | Type | Unit | SA? |
|---------|-----------|------|---------|------|------|-----|
| **Debt** | `public-sector-net-debt` | HF6W | PSND excluding public sector banks, end of month | **Stock** | £ billion, current prices | NSA |
| **Borrowing** | `public-sector-net-borrowing` | DZLS | PSNB excluding public sector banks, in month | **Flow** | £ million, current prices | NSA |
| **Interest** | `public-sector-debt-interest` | NMFX | **Central government** current expenditure, net interest payable, in month | **Flow** | £ million, current prices | NSA |

Common to all three: ONS Public Sector Finances (dataset PUSF), UK (`K02000001`), monthly, OGL v3.0, `observation_status=provisional`.

Unit warning: debt is in **£ billion** and the other two are in **£ million**. A shared axis would also be wrong because debt is a stock and the others are flows. Never plot the three on one axis. Show them as three labelled measures, each with its own unit and stock/flow tag.

### Known data shape (from curated files)

- **PSND (HF6W):** before 1993-03 only March values exist, so it is effectively annual until 1993. Monthly values start at 1993-03/04. The 198 "missing" rows are pre-1993 non-March months, which the connector keeps as `observation_status=missing`. Do not interpolate them.
- **PSNB (DZLS):** the first value is 1997-04. 1993-01 → 1997-03 is blank (51 rows) in the ONS series.
- **Interest (NMFX):** complete from 1997-04.
- **Seasonality:** all three are NSA and flows are strongly seasonal. DZLS has 45 negative months (surpluses), including 2026-01 = −31,960. NMFX swings from about −125 to 20,128 (index-linked gilt effects). A raw monthly line chart is misleading. Any trend view should use a **12-month rolling sum** or a financial-year total, labelled derived. This is a requirement for G3, not something to build now.
- **Illustrative derived check (not curated, not for UI):** the 12 months ending 2026-09 sum to about £129.8bn (DZLS) and £99.0bn (NMFX) in current prices. These were summed from the curated CSVs only to check shape.
- **Interest is central-government net interest** (NMFX), not whole public sector. UI copy must say so. Interest-to-revenue would be a further derived view, which ONS publishes as experimental. It needs `tax-receipts` (AHHY = taxes + NICs, not total receipts), so label it a different concept and keep it out of Wave A.

### Raw evidence (blocker B2 — local copy absent)

Manifests point to `raw/2026-11-03/*_pusf.json`. Those files are **not on disk** in this workspace, because `.gitignore` excludes `data/**/raw/**`. The live ONS files hash identically to the manifest, so the evidence is verifiable and reproducible. For a self-contained handover, re-run the three connectors (this also re-pins raw and manifests), preferably after the 20 Nov release. I did not re-run them here, to avoid rewriting `manifest.yaml` `retrieved_at` values without a new release to pin.

---

## Artefact 2 — Research scope

### Questions the domain can answer now

1. How large is net public debt in £ billion, how has it grown since 1993 (since 1975 at March resolution), and what was the latest month?
2. How much does the public sector borrow per month, and is a given month a deficit or surplus (1997 →)?
3. How much does central government pay in net interest per month (1997 →)?
4. Do borrowing and interest move together, or differently? This should be a side-by-side view of separate measures, not a merged axis.

### Questions that need more data (planned-not-ready)

| Question | Missing | Notes |
|----------|---------|-------|
| Debt as % of GDP | Official HF6X, or a documented derivation (see %GDP section) | Needs a new registry row or a nominal-GDP pin |
| Debt interest as share of revenue | Ratio series or `tax-receipts` pairing, with revenue concept stated | Domain 06 link, not a merge |
| Debt including public sector banks | PSND incl. banks (CDID not pinned) | Copy must say "excluding public sector banks" |
| Interest by gilt type, or effective rate | Not pinned (DMO and OBR sources) | Out of scope for G2 |
| Forecasts (OBR EFO) | Not ingested | Do not present projected values as observed |

### Coverage and breaks

- Geography: UK only. No regional split exists.
- Revisions: all PSF monthly levels revise each release (20th-ish of the month). Blue Book and classification changes can move history. Keep `provisional`, and re-pin on each release.
- Breaks: public sector bank classification (headline measure excludes them), and ONS reclassifications. These are not documented in the series metadata, so cite the PSF bulletin and methodology notes when the UI makes break claims.

### Boundaries with other domains

- **06 Taxation & Revenue** (`tax-receipts`, AHHY) and **07 Public Spending** (`total-managed-expenditure`, EBFT): link only. The manifests already list them in `related_indicator_ids`. Do not combine them with debt, borrowing and interest in one chart. Borrowing is conceptually TME minus receipts, but that is a Domain 06/07 story to link, not to merge.
- **05 Growth** (`real-gdp`, ABMI): see the next section, because it is not the right denominator.

---

## %GDP recommendation

**Recommendation: ingest the official ONS series HF6X as a fourth Domain 08 registry row, e.g. `public-sector-net-debt-pct-gdp`. Do not derive debt/GDP from `real-gdp`.**

### Why not derive from `real-gdp`

The kickoff suggests pairing with `real-gdp`. That would be wrong:

- `real-gdp` is ABMI, **chained volume (inflation-adjusted), seasonally adjusted, quarterly**.
- PSND is **current prices (nominal)**. Dividing nominal debt by real GDP mixes price bases and gives a number that is not "debt % of GDP".
- ONS's published ratio uses **nominal, centred 12-month GDP**. This is the "centred" approach (6 months before and 6 months after the debt date). It needs OBR forecasts for the latest 6 months. Monthly GDP is the quarterly value ÷ 3. (Source: ONS, [The use of GDP in public sector fiscal ratio statistics](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/methodologies/theuseofgrossdomesticproductgdpinpublicsectorfiscalratiostatistics), 2016, restated in recent PSF bulletins.)

### Official series (preferred)

| Field | Value |
|-------|-------|
| CDID / dataset | **HF6X** / PUSF |
| Title (live) | PS: Net Debt (excluding public sector banks) as a % of GDP: NSA |
| URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf/data |
| Live check 2026-11-11 | 403 months, 1993-03 → 2026-09, no gaps; 2026-09 = 94.0%, 2026-08 = 93.6% (release 2026-10-20) |
| Live sha256 | `9e36441224589270407925629a6fbf4ec0428f485a8f328983fa255ada23f4e5` (not yet pinned) |
| Revision risk | **High for the latest ~6 months.** The denominator uses forecast GDP, so the ratio is highly provisional until outturn GDP replaces the forecasts. Carry `provisional` and show a revision flag in the UI. |

Required work: a new `OnsSeriesSpec` in `fiscal_series.py`, a connector module, a package under `data/economy/`, and a Notion registry row linked to HF6W. The HF6W manifest's `open_questions` already asks "Should a second registry row cover HF6X?". The answer is **yes**. Nothing was ingested here, because it was outside this task's scope.

Naming caution: older ONS tables label HF6X as "PSND ex BoE" in some PSA5A layouts, while the current live title is "excluding public sector banks". Use the live title and confirm against the latest PSF bulletin when pinning.

### Fallback derivation (only if HF6X is rejected)

If the official series is ever unavailable, derive it explicitly. Never do it silently.

1. Numerator: HF6W at month end, in £ billion. Convert to £ million before dividing.
2. Denominator: nominal GDP at current market prices, **NSA**. ONS names BKTL for the NSA nominal measure. It is not currently ingested. `real-gdp` ABMI does not qualify.
3. For month *m*, the denominator is the sum of 12 monthly GDP values from month m−5 to m+6, where monthly GDP is the quarterly value ÷ 3.
4. Months within 6 months of the latest outturn need OBR forecast quarters, which are not ingested. **The derived series therefore cannot reproduce the latest ~6 months of HF6X.**
5. Document the formula in the manifest Notes. Reconcile to HF6X where both exist (tolerance to be set by Validation). Mark all derived values `derived`.

I do not recommend building this fallback. It would recreate an official ONS series with a less reliable denominator.

---

## Artefact 3 — Notion plan

Matured at [08 · Public Debt & Government Finances](https://app.notion.com/p/414654717685811cb155f725cba481a3). The page holds the question, pin table with live-check results, flagship, planned-not-ready graphics, tech requirements, gap list and checklist. This file and the Notion page must stay consistent. If they diverge, the Notion page is the plan and this file is the evidence.

Registry rows for the three indicators were moved from **Ready** to **Validation** on 2026-11-11, because the Ready status was set on self-QA only. See "Registry status" below.

---

## Artefact 4 — Handover contents

### Indicator IDs and paths

| Indicator | Package path | Connector | Notion registry |
|-----------|--------------|-----------|-----------------|
| `public-sector-net-debt` | `data/economy/public-sector-net-debt/` | `src/economy/connectors/public_sector_net_debt.py` | https://app.notion.com/40d65471768581aba151c1ec18617559 |
| `public-sector-net-borrowing` | `data/economy/public-sector-net-borrowing/` | `src/economy/connectors/public_sector_net_borrowing.py` | https://app.notion.com/40d65471768581d0b736e7e36e6b56d7 |
| `public-sector-debt-interest` | `data/economy/public-sector-debt-interest/` | `src/economy/connectors/public_sector_debt_interest.py` | https://app.notion.com/40d654717685815cb4e5d52cb43c17f3 |

### Dimensions available

Time (monthly; period start/end), geography (UK only), and measure (three separate indicators). There are no category splits. Observation status is `provisional` or `missing`.

### Dependencies

- Link: `tax-receipts` (06), `total-managed-expenditure` (07). Do not merge.
- New row needed for the %GDP instrument: `public-sector-net-debt-pct-gdp` (HF6X).
- Cloud: Ready observations must load from Postgres, not local files (AGENTS.md cloud rule). Orchestrator should confirm these three rows are in Postgres before any UI claim. I did not check this.

### Registry status

| Indicator | Before | Now | Reason |
|-----------|--------|-----|--------|
| `public-sector-net-debt` | Ready | Validation | Self-QA only, no independent Validation |
| `public-sector-net-borrowing` | Ready | Validation | Same |
| `public-sector-debt-interest` | Ready | Validation | Same |

Package READMEs ("Status: Ready (self-QA pass)", "Registry → Ready") were edited to match.

### Validation-ready notes (for the Validation agent)

Pass criteria for each package:

1. Re-pin raw JSON (after 2026-11-20 if possible) and confirm the checksum matches the manifest (or document the revision).
2. Independent recompute of curated CSV from raw JSON (months only): zero mismatches, zero extras.
3. Spot-check against the official release tables, beyond the JSON used by the connector:
   - PSND ex at end of Sep 2026 = £3,005.0bn
   - PSNB ex for Sep 2026 = £24,520m
   - CG net interest payable for Sep 2026 = £10,933m
   - Also check one pre-2000 point and one negative DZLS month (2026-01 = −31,960).
4. Unit check: debt £bn, borrowing and interest £m, and the manifests say so.
5. Confirm NMFX concept (CG net interest payable) against the PSF bulletin or tables, and confirm HF6W = "PSND ex" (not incl. banks).
6. Confirm `missing` rows are real ONS blanks, not parse failures. PSND: 198, PSNB: 51.
7. If HF6X is ingested: check HF6X × centred GDP ≈ HF6W is consistent (reconciliation, not exact), and that revision flags are present.
8. Revision check: compare 2026-10-20 values against the 2026-11-20 release for the last 6 months and record the size of revisions.

Validation files its report under `data/qa/`. The Economy agent does not edit it.

### Recommended G3 views (requirements only — do not build before the Review Gate)

Follow `docs/visual-identity.md` and the Explorer shell. Orchestrator owns the visual contract.

1. **Debt dial (flagship).** Three separately labelled readouts: debt (£bn, stock), borrowing (£m, flow, 12-month rolling), interest (£m, CG, flow, 12-month rolling). Each shows its own unit, its stock/flow tag, a "provisional" flag and the release date. No shared axis, no summing.
2. **Debt level over time.** One measure only, annual resolution before 1993 and monthly after, with the revision-flagged tail.
3. **Borrowing: deficit and surplus months.** NSA monthly bars with a 12-month rolling line as a labelled derived overlay. The seasonal spike must be explained in the Notes.
4. **Interest cost.** CG net interest in £m with a rolling 12-month view. The copy states "central government".
5. **Side-by-side small multiples.** Three panels with separate scales. Domain 06 and 07 appear only as "Follow" links, never as overlays.
6. **Debt % of GDP (planned-not-ready).** Needs HF6X ingested and Validation. It must show a revision band for the latest ~6 months. Until then it appears only as a labelled gap.

Copy requirements: say "excluding public sector banks" for debt and borrowing, "central government" for interest, "current prices, not seasonally adjusted", "provisional, revised monthly", and give the source line (ONS PSF, CDID, release date, indicator id).

### Blockers and open items

| # | Item | Severity | Owner |
|---|------|----------|-------|
| B1 | No independent Validation yet (registry moved to Validation) | Gate for Ready | Validation |
| B2 | Raw JSON not on local disk (gitignored); live checksums match manifests. Re-run connectors after the 20 Nov release | Low | Economy |
| B3 | HF6X not ingested, so no official %GDP in the dataset | Blocks the %GDP instrument only | Economy (new registry row; Orchestrator to approve) |
| B4 | Kickoff text says to pair %GDP with `real-gdp`. That is methodologically wrong (nominal vs real). Amend kickoff and Notion wording | Medium (documentation) | Orchestrator |
| B5 | Postgres loading for these three series not confirmed by me | Gate for UI | Orchestrator |
| B6 | NMFX is CG-only. Decide whether a PS-wide interest series is needed | Low | Economy and Orchestrator |

### Files touched in this task

- Created: `docs/handover-economy-08-debt.md`
- Edited: `data/economy/public-sector-net-debt/README.md`, `data/economy/public-sector-net-borrowing/README.md`, `data/economy/public-sector-debt-interest/README.md` (status wording only)
- Notion: domain 08 page matured; three registry rows set to Validation.
- Not touched: all frontend and `web/`, Energy and Housing paths, data, curated CSVs, manifests and connectors.

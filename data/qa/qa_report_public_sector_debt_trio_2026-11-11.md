# QA report — public sector debt trio (HF6W / DZLS / NMFX) — 2026-11-11

**Agent:** Validation  
**Overall verdict:** **pass** for all three indicators (0 fail; 1 warn shared by all three: raw JSON not on local disk)

## Scope

| Indicator | CDID | Concept | Type | Unit |
|-----------|------|---------|------|------|
| `public-sector-net-debt` | **HF6W** (PUSF) | PSND excluding public sector banks, end of month | **Stock** | **£ billion**, current prices, NSA |
| `public-sector-net-borrowing` | **DZLS** (PUSF) | PSNB excluding public sector banks, in month | **Flow** | **£ million**, current prices, NSA |
| `public-sector-debt-interest` | **NMFX** (PUSF) | **Central government** current expenditure: net interest payable, in month | **Flow** | **£ million**, current prices, NSA |

- Manifests / curated: `data/economy/{public-sector-net-debt,public-sector-net-borrowing,public-sector-debt-interest}/`
- Connectors (not re-run): `economy.connectors.public_sector_{net_debt,net_borrowing,debt_interest}`
- Handover: `docs/handover-economy-08-debt.md`
- Official: ONS [HF6W](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6w/pusf) · [DZLS](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/dzls/pusf) · [NMFX](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/nmfx/pusf) · [Public sector finances, UK: September 2026](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/bulletins/publicsectorfinances/september2026)
- First independent Validation for all three (registry rows were demoted Ready → Validation on 2026-11-11 after self-QA only).

> **Never one axis.** Debt is a **£bn stock**; borrowing and interest are **£m monthly flows**. 3,005.0 (£bn) next to 24,520 and 10,933 (£m) are different units and different kinds of quantity. NMFX is **central government** interest, not whole public sector.

## Freeze

| Indicator | Manifest SHA-256 | Live ONS `/data` SHA-256 (2026-11-11) | Match | Curated CSV SHA-256 | Release / next |
|-----------|------------------|----------------------------------------|-------|---------------------|----------------|
| HF6W | `1c277e826426a35dc5cbe8dd3d7330275f523ec23edd6890c3fef2cc0cb8540e` | `1c277e826426a35dc5cbe8dd3d7330275f523ec23edd6890c3fef2cc0cb8540e` | yes | `b3351af346639854d21aea7da8a2491a8a7346b635cea0b0ebe979d7c2323571` | 2026-10-20 / 20 Nov 2026 |
| DZLS | `6244b0066ca00a74aa32c09b35a6f3213b48a7a236fbd6d5fe9aa7a20edcb6dc` | `6244b0066ca00a74aa32c09b35a6f3213b48a7a236fbd6d5fe9aa7a20edcb6dc` | yes | `53ae775fc42e8ab3d046482cd0d0996a200330d67f9f4288976dad274ac9f77c` | 2026-10-20 / 20 Nov 2026 |
| NMFX | `56e3bf137fbb764fb5ea198af5644816c5e7da756e1b818631a8b2aafd9dc620` | `56e3bf137fbb764fb5ea198af5644816c5e7da756e1b818631a8b2aafd9dc620` | yes | `30e63027388eea795fa06176f9df703df9f17898cbbfccdd97927ebeab88cec6` | 2026-10-20 / 20 Nov 2026 |

The local raw files (`raw/2026-11-03/*_pusf.json`) are absent (`data/**/raw/**` is gitignored). Because the live payload hashes identically to the manifest pin, the live file stands in for the pin (see W1).

## Checks

### Common (applies to each of HF6W, DZLS, NMFX)

| ID | Check | HF6W | DZLS | NMFX | Notes |
|----|-------|------|------|------|-------|
| C1 | Live `/data` SHA-256 = manifest checksum | **pass** | **pass** | **pass** | Byte-identical; pins current until the 20 Nov 2026 release |
| C2 | Live CDID and title match the claimed concept | **pass** | **pass** | **pass** | HF6W "PS: Net Debt (excluding public sector banks): £bn: CPNSA"; DZLS "Public sector net borrowing, excluding public sector banks (£ million)"; NMFX "CG: Current expenditure: Net Interest payable: £m CPNSA" |
| C3 | Independent re-parse of live `months` vs curated CSV (every period) | **pass** | **pass** | **pass** | 619 / 405 / 354 rows; **0** value diffs, 0 only-live, 0 only-curated, 0 duplicates |
| C4 | Calendar integrity | **pass** | **pass** | **pass** | Period bounds are real month start/end (0 bad); 0 gaps from first to last month |
| C5 | Geography | **pass** | **pass** | **pass** | `K02000001` on every row |
| C6 | Unit string and magnitude | **pass** | **pass** | **pass** | Curated unit text and manifest agree: HF6W "£ billion", DZLS / NMFX "£ million"; live `unit` field `£bn`, `£million`, `£m` |
| C7 | Missing rows are real ONS blanks, not parse failures | **pass** | **pass** | **pass** | Missing: HF6W 198, DZLS 51, NMFX 0. Live JSON has the same counts. Every `missing` row has an empty value and every empty value is `missing` |
| C8 | Postgres serves the same data as the curated CSV (cloud completeness) | **pass** | **pass** | **pass** | Current releases 51 / 50 / 49, checksum equals manifest, 619 / 405 / 354 rows, 0 only-DB, 0 only-CSV, 0 value diffs, units identical |
| C9 | Status label | **pass** | **pass** | **pass** | `provisional` (or `missing`) only; consistent with manifest revision note |
| C10 | Independence — no silent rewrite | **pass** | **pass** | **pass** | Validation did not edit `data/economy/`; live payloads fetched to `/tmp` only |

### Indicator-specific

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| H1 | HF6W latest month vs ONS bulletin | **pass** | 2026-09 = **3,005.0** £bn; bulletin: "provisionally estimated at £3,005.0 billion at the end of September 2026" |
| H2 | HF6W year-on-year recompute | **pass** | Curated 2025-09 = 2,913.3, so change = +91.7; bulletin: "£91.7 billion more than a year earlier" |
| H3 | HF6W missing-row pattern | **pass** | 198 missing = 216 months (1975-03 → 1993-02) minus 18 March values. Before 1993 only March exists (effectively annual); 1993-03 onward is monthly. Rows kept as `missing`, not interpolated |
| H4 | HF6W pre-2000 spot points | **pass** | 1975-03 = 52.1; 1993-03 = 201.9; 2000-03 = 353.3 (all equal to live ONS) |
| D1 | DZLS latest month vs ONS bulletin | **pass** | 2026-09 = **24,520** £m; bulletin "£24.5 billion in September 2026" |
| D2 | DZLS year-on-year recompute | **pass** | Curated 2025-09 = 22,764; +1,756 £m (+7.7%); bulletin: "£1.8 billion (7.7%) more than in September 2025" |
| D3 | DZLS financial-year-to-date recompute | **pass** | Sum Apr–Sep 2026 = 97,841 £m; bulletin: "£97.8 billion in the financial year" |
| D4 | DZLS negative / surplus months | **pass** | 2026-01 = −31,960 (January surplus, matches handover); 45 negative months in total; 2000-03 = −399; min −31,960, max 51,103 |
| D5 | DZLS blank block before 1997-04 | **pass** | 51 blank months (1993-01 → 1997-03) are blank in live ONS; first value 1997-04 = 2,934 |
| N1 | NMFX latest month vs ONS bulletin | **pass** | 2026-09 = **10,933** £m; bulletin "Central government debt interest payable was £10.9 billion in September 2026" |
| N2 | NMFX year-on-year recompute | **pass** | Curated 2025-09 = 9,377; +1,556 £m (+16.6%); bulletin: "£1.6 billion (16.6%) more than in September 2025" |
| N3 | NMFX concept is central government, not whole public sector | **pass** | Live title starts "CG:"; manifest `unit` says "CG net interest payable"; bulletin wording is "Central government debt interest payable". UI copy must say "central government" |
| N4 | NMFX range / sign | **pass** | Complete from 1997-04 (354 months); min −125, max 20,128 (index-linked gilt effects); 1 negative month |
| X1 | Stock vs flow separation | **pass** | Manifests tag HF6W £ billion / DZLS and NMFX £ million; the three have no shared unit. 12-month rolling sum to 2026-09 (derived by Validation, not curated): DZLS £129,762m, NMFX £98,983m — consistent with the handover's ≈£129.8bn / ≈£99.0bn |
| X2 | Bulletin also cites 94.0% of GDP | **info** | That is HF6X, which is **not** ingested. The handover recommends a separate row; out of scope for this QA |

## Warnings

- **W1 — raw evidence not on local disk (all three).** `raw/2026-11-03/{hf6w,dzls,nmfx}_pusf.json` do not exist locally (gitignored; the Economy handover logged this as B2). Mitigation: live ONS payload SHA-256 equals the manifest pin, so the pin is verifiable and reproducible. Recompute checks (C3) ran against the live payload, not a local file. **Non-blocking for Ready.** Owner: Economy, re-pin raw after the 20 Nov 2026 release.

## Summary

| Indicator | Verdict | Pass | Warn | Fail |
|-----------|---------|------|------|------|
| `public-sector-net-debt` (HF6W) | **pass** | 15 | 1 (W1) | 0 |
| `public-sector-net-borrowing` (DZLS) | **pass** | 16 | 1 (W1) | 0 |
| `public-sector-debt-interest` (NMFX) | **pass** | 15 | 1 (W1) | 0 |

Counts = common C1–C10 + indicator-specific checks + X1; X2 is informational and not counted.

- Blockers: **none**
- Recommended fixes (**owner: Economy**): re-pin raw JSON and manifests after the 20 Nov 2026 release (clears W1); manifest `notion_registry_url` values use `https://app.notion.com/<id>` without `/p/` (cosmetic).
- Deferred to post-release (**owner: Validation**): handover criterion 8 — compare the 2026-10-20 values to the 2026-11-20 release for the last six months and record the size of revisions. It cannot be run yet.
- Not in scope: HF6X (% of GDP) ingestion, PS-wide interest, OBR forecasts.
- **Notion:** all three rows are at Validation; **Validation recommends Ready** for each. Validation did not flip status (Orchestrator pattern, as for CPIH). Last checked set to 2026-11-11.
- UI constraints for G3 (from this QA): three separately labelled measures, each with its own unit and stock/flow tag; "excluding public sector banks" on debt and borrowing; "central government" on interest; "current prices, not seasonally adjusted"; rolling-12 or financial-year totals labelled derived for trend views; no shared axis, no summing, no `real-gdp` denominator.

## Reproduce

```bash
for c in hf6w dzls nmfx; do
  curl -sS -A 'Mozilla/5.0' "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/$c/pusf/data" | shasum -a 256
done
curl -sS -A 'Mozilla/5.0' 'https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/bulletins/publicsectorfinances/september2026'   # compare headline figures
PYTHONPATH=src uv run python -m validation.qa_economy_wave_a_p0_2026_11_11
```

Script: `src/validation/qa_economy_wave_a_p0_2026_11_11.py` (reads manifests and curated CSVs, fetches live ONS, queries Postgres read-only; writes nothing under `data/economy/`).

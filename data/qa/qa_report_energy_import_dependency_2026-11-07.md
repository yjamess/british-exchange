# QA report — energy-import-dependency — 2026-11-07

## Scope
- Indicator: `energy-import-dependency` (DESNZ ET 1.3 Import dependency [note 6])
- Manifest: `data/energy/energy-import-dependency/manifest.yaml`
- Raw: `data/energy/energy-import-dependency/raw/2026-11-03/ET_1.3_SEP_26.xlsx`
- Curated: `data/energy/energy-import-dependency/curated/observations.csv` (142 rows)
- Connector: `src/energy/connectors/energy_import_dependency.py`
- Gate 1 notes: `data/energy/energy-imports-security/`
- Sibling Ready (no-regress): `energy-imports-and-exports`
- Notion: https://app.notion.com/41165471768581f1b20de3b144f17d52

Validation did **not** rewrite Energy curated/raw data.

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze checksum vs manifest | **pass** | Package raw SHA-256 `7e3d230e7cdcc45f3eef2b1ec5c866a30ffc26218fdd486cbae59f55eb34bf81` matches manifest + connector `EXPECTED_CHECKSUM`. Sibling Ready raw identical checksum. |
| C2 | Curated row count + split | **pass** | 142 observations = 28 annual + 114 quarterly (matches agent claim ~142). Coverage annual 1998–2025; quarterly 1998-Q1–2026-Q2. |
| C3 | Schema / unit / geography | **pass** | `unit=ratio` only; geography `K02000001` UK; statuses `final` 141 + `provisional` 1 (2026-Q2). No abs(value)>1.5 (not percent-scaled). |
| C4 | Method: ratio not display-% alone | **pass** | Manifest + curated store workbook decimals (e.g. 0.43 ≈ 43%). Connector docs forbid ×100. |
| C5 | Method: net ≠ gross; dependency ≠ vulnerability | **pass** | Column is `Import dependency [note 6]` on dependency sheets (not gross Imports/Exports ktoe). Caveats state dependency ≠ vulnerability/resilience/price exposure. Gate 1 notes align. No partner-country geography invented. |
| C6 | Negative = net exporter years OK | **pass** | 31 negative curated rows; annual negatives 1998–2003. Raw annual 1998 = `-0.16422287282997539` matches curated. |
| C7 | Numerical: full recompute from pinned raw | **pass** | Independent parse of col 16 on Annual + Quarter dependency sheets: **0 mismatches / 0 missing raw** vs curated. |
| C8 | Spot samples (agent claims) | **pass** | Annual 2025 = `0.43334807664982017` ≈ 0.4333; Q2 2026 provisional = `0.4043414454347498` ≈ 0.4043. Also 1998 annual negative and 2004 first positive year match raw. |
| C9 | Formula identity (net ÷ denominator) | **pass** | Spot-recomputed `Net imports / Denominator` equals published Import dependency for 1998, 2003, 2004, 2012, 2024, 2025 and quarters 1998-Q1, 2025-Q1, 2026-Q2. Confirms net-based ratio, not gross imports. |
| C10 | Complementary to Ready sibling (not duplicate pipeline) | **pass** | Sibling uses `Quarter supply and use of fuels` → `flow=Imports\|Exports`, unit **ktoe**, 228 rows. This indicator uses dependency sheets → `measure=import_dependency; basis=annual\|quarterly`, unit **ratio**, 142 rows. Same workbook, distinct series. Sibling checksum unchanged. |
| C11 | Manifest completeness / connector pin | **pass** | Related Ready id listed; transformations/caveats/revision notes present; connector copies sibling raw if missing then refuses checksum drift. |
| C12 | Note 6 documentation depth | **warn** | Workbook Notes sheet points to Dec 2010 Energy Trends article for dependency ratio explanation rather than embedding the formula text. Mitigated: Validation recomputed net/denom identity from the same sheet columns. |

## Spot-check table
| Period | Basis | Curated | Raw col 16 | net/denom |
|--------|-------|---------|------------|-----------|
| 1998 | annual | -0.16422287282997539 | match | match |
| 2025 | annual | 0.43334807664982017 | match | match |
| 2026-Q2 | quarterly (provisional) | 0.4043414454347498 | match | match |

## Summary
- **Pass:** 11
- **Warn:** 1 (C12 documentation pointer only)
- **Fail:** 0
- **Verdict:** critical QA **PASS** → registry Status **Ready**
- **Blockers for Orchestrator:** none
- **Energy fixes required:** none (no curated edits)

## Notion hand-off
- Status → Ready
- Last checked → 2026-11-07
- Evidence includes: `data/qa/qa_report_energy_import_dependency_2026-11-07.md`

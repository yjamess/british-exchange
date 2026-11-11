# QA report — business-investment — 2026-11-03

## Scope
- Economy package: `data/economy/business-investment/`
- Raw: `raw/2026-11-03/npel_pn2.json`
- Curated: `curated/observations.csv`
- Series: ONS NPEL/PN2

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Checksum raw↔manifest | pass | 41125202c10b9399 |
| C2 | Manifest contract | pass | missing=none |
| C3 | Curated schema | pass | True |
| C4 | Rows/uniqueness/id | pass | rows=118 dupes=0 gaps=0 |
| C5 | Independent JSON recompute | pass | mismatches=0 extra=0 |
| C6 | Latest period spot-check | pass | raw=78413 curated=78413.0 |
| C7 | Status/revision notes | pass | statuses={'provisional'} |

## Summary
- Overall: **pass**
- Rows: 118 (quarterly; 1997-01-01 → 2026-04-01)
- Latest curated value: 78413.0 (£ million chained volume, SA)
- Official release date: 2026-08-12
- Blockers: none

Economy self-QA (wave Y2). Independent Validation may re-run checks under `data/qa/`.

## Re-pin note — 2026-11-11
- Re-ran `economy.connectors.business_investment`; raw is now `raw/2026-11-11/npel_pn2.json`.
- SHA-256 unchanged (`41125202c10b9399…`); curated CSV unchanged (118 rows, latest 78413.0 for 2026 Q2). The checks above still hold.
- Status: Validation-ready, not Ready. PN2 is frozen at 2026-08-12; QNA 2026-09-29 differs materially (see `docs/handover-economy-05-repin-2026-11-11.md`).

## Source switch note — 2026-11-11 (PN2 → QNA)
- Orchestrator locked source policy: NPEL now ingests from `…/npel/qna/data`. Raw is `raw/2026-11-11/npel_qna.json` (SHA-256 `09722c21c27a5d5462e176c19d568e6c23c0b55b30bd6e6b0c7c77a87a356076`, release 2026-09-29).
- **The 2026-11-03 checks above apply to the retired PN2 bytes (`41125202…`) only.** Economy recompute on the QNA bytes: raw↔curated mismatches 0, rows 118 (1997 Q1 → 2026 Q2), latest 83,534. Independent Validation must re-run C1–C7 against QNA.
- Status: Validation-ready, not Ready. Dataset=QNA. See `docs/handover-economy-05-qna-switch-2026-11-11.md`.

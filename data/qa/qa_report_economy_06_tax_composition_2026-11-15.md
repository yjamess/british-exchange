# QA report — Economy 06 tax-receipts-composition · 2026-11-15

## Scope

- Indicator: `tax-receipts-composition` (MF6P + AIIH + NMHM + AHGR → AHHY)
- Package: `data/economy/tax-receipts-composition/`
- Cross-check (read-only): Ready `data/economy/tax-receipts/` (AHHY)
- Handover: `docs/handover-economy-06-anatomy-pin.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-anatomy.md`
- Script: `validation.qa_economy_06_tax_composition_2026_11_15`
- Vintage: raw `2026-11-15` · PUSF JSON release **2026-10-20** · Appendix D **2026-10-21**

## Independence

Disk raw + curated only. No curated/raw rewrites. Identity recomputed against
Ready `tax-receipts` observations; AHGR spot-checked against Appendix D Time
Series (not treated as an Exchange residual).

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C-files | package files present | **pass** | 2026-11-15 |
| C-extra | checksum ahgr_pusf_probe.json | **pass** | a7a1297a75c6450a… http=404 |
| C-extra | checksum appendix_d_public_sector_current_receipts.xlsx | **pass** | 7a06b80fb26f2f64… http=200 |
| C-extra | checksum aiih_pusf.json | **pass** | 4bcf79500e3f8516… http=200 |
| C-extra | checksum mf6p_pusf.json | **pass** | 87ea045812bf3cc5… http=200 |
| C-extra | checksum nmhm_pusf.json | **pass** | 6ee71d11bd5a4a49… http=200 |
| V5 | AHGR PUSF /data 404 probe | **pass** | status=404 |
| V5 | AHGR workbook sourcing documented | **pass** | manifest caveats/transforms |
| V3 | accruals ≠ HMRC cash documented | **pass** | manifest caveats |
| V3 | total is AHHY not JW2O | **pass** | manifest caveats |
| V4 | no HMRC cash series in package | **pass** | series=['AHGR', 'AIIH', 'MF6P', 'NMHM'] |
| V4 | source_register not HMRC cash | **pass** | source_register.csv |
| C-extra | provisional = latest valued / series | **pass** | AHGR:2026-09; AIIH:2026-09; MF6P:2026-09; NMHM:2026-09 |
| V1 | identity MF6P+AIIH+NMHM+AHGR=AHHY | **pass** | ok=345 fail=0 incomplete=60 |
| V1 | spot months Jul/Aug/Sep 2026 | **pass** | 2026-07 sum=103741 AHHY=103741 d=0; 2026-08 sum=88626 AHHY=88626 d=0; 2026-09 sum=88127 AHHY=88127 d=0 |
| V1 | identity artefact agrees | **pass** | artefact_ok=345 recomputed=345 |
| V1 | FYTD present in Appendix D Table (not curated) | **pass** | Table FYTD col present; AHHY Apr–Sep 2026=544338 |
| V2 | spot MF6P vs PUSF JSON + workbook | **pass** | match |
| V2 | spot AIIH vs PUSF JSON + workbook | **pass** | match |
| V2 | spot NMHM vs PUSF JSON + workbook | **pass** | match |
| V2 | spot AHGR vs Appendix D Time Series | **pass** | match |
| V2 | workbook identity Jul/Aug/Sep | **pass** | 2026-07 d=0; 2026-08 d=0; 2026-09 d=0 |
| V2 | Ready AHHY == workbook AHHY spots | **pass** | 2026-07 Ready=103741 wb=103741; 2026-08 Ready=88626 wb=88626; 2026-09 Ready=88127 wb=88127 |

## Identity

- Months with all four heads + Ready AHHY and exact match (£0.01m): **345**
- Failed identity months: **0**
- Incomplete / skipped overlap months: **60** (early history before full four-head + AHHY overlap)
- Spot months independently checked: **2026-07**, **2026-08**, **2026-09**

## AHGR note

- Live PUSF `…/timeseries/ahgr/pusf/data` returns **HTTP 404** (pinned probe
  `raw/2026-11-15/ahgr_pusf_probe.json`).
- Curated AHGR values match Appendix D **Time Series** column `AHGR`
  (*Other local government taxes*) for Jul/Aug/Sep 2026.
- Manifest documents workbook sourcing and states AHGR is **not** an
  Exchange-invented residual `AHHY − (MF6P+AIIH+NMHM)`.
- Connector correctly refuses to ship if AHGR `/data` returns 200 without a
  code change (forces intentional JSON switch).

## Summary

- **Verdict: pass** (23 pass / 0 warn / 0 fail)
- **Ready recommendation: yes**
- Orchestrator may flip registry to Ready + schedule cloud load after PASS.
- Re-pin after **20 Nov 2026** PSF (may revise recent months); re-probe AHGR `/data`.
- Out of scope: Anatomy frontend, Tax Machine, HMRC cash ingest, JW2O total, CG drill.

## Blockers

- None for Ready on tax-receipts-composition.

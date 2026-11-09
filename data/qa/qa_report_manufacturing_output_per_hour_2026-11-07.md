# QA report — manufacturing output per hour — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **pass-with-warns** (Ready)

## Scope

- Indicator: `manufacturing-output-per-hour` (ONS DJK6 / PRDY — manufacturing section C output per hour)
- Manifest: `data/energy/manufacturing-output-per-hour/manifest.yaml`
- Raw: `data/energy/manufacturing-output-per-hour/raw/2026-11-07/djk6_prdy.json`
- Curated: `data/energy/manufacturing-output-per-hour/curated/observations.csv` (129 quarterly rows)
- Connector (read-only): `src/energy/connectors/manufacturing_output_per_hour.py`
- Energy notes: `data/energy/manufacturing-output-per-hour/validation_notes.md`
- Inventories: `data/energy/manufacturing/`, `data/energy/jobs-productivity/`
- Distinct from Economy `labour-productivity` (LZVB) — do not conflate
- Official: [ONS DJK6 / PRDY](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/djk6/prdy) — Output per hour: Manufacturing C SIC07, 2023=100, SA, UK
- Registry: https://app.notion.com/41165471768581c89c2ce8e92d3134e3

## Freeze

| Item | Value |
|------|-------|
| Claimed SHA-256 | `cbe5a021d243f44e5b56f00fe583ee5d8af5687886ca687ed06fa7e61fe82d53` |
| Observed SHA-256 | `cbe5a021d243f44e5b56f00fe583ee5d8af5687886ca687ed06fa7e61fe82d53` |
| Series | DJK6 / PRDY |
| Official release | 2026-08-17 |
| Rows | 129 quarterly (1994 Q1 → 2026 Q1) |
| Claimed spots | 1994Q1=38.7; 2026Q1=103.3 |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs claimed / manifest | **pass** | Exact match; no re-ingest as primary path |
| C2 | Curated coverage — 129 UK quarterly rows, unique keys | **pass** | 1994-01-01→2026-01-01; geo `K02000001` only; 0 missing values; unique (period_start, geography) |
| C3 | Method — index 2023=100 SA; quarterly; SIC section C | **pass** | ONS title: “Output per hour: Manufacturing C SIC07, 2023=100, SA, UK”. Unit field in JSON is `Index, base year = 100`; base year + SA carried in title and curated unit. Frequency quarterly; annual aggregates not curated |
| C4 | Method — not IoP÷jobs DIY; not whole-economy productivity | **pass** | Connector/manifest use official DJK6 only. Notes carry `series=DJK6`. Jobs inventory forbids inventing productivity from IoP÷Workforce Jobs. Economy `labour-productivity` is LZVB (whole economy); all 129 shared periods differ in value (e.g. 2026Q1 DJK6=103.3 vs LZVB=100.1) |
| C5 | Numerical — Energy claimed spots vs ONS / curated | **pass** | 1994 Q1 = **38.7**; 2026 Q1 = **103.3**. Match pinned raw, curated, and live ONS `/data` + landing table |
| C6 | Numerical — full recompute curated from pinned raw | **pass** | `ManufacturingOutputPerHourConnector.transform` → 129 rows, **0** mismatches vs curated (period bounds, value, geo, unit) |
| C7 | Numerical — mid-series spot sample vs live ONS | **pass** | 2023 Q1–Q4 (96.6, 100.4, 102.0, 101.1) and 2025 Q4 (100.9) match live ONS quarters; 2023 quarterly mean ≈ 100.03 (consistent with 2023=100 base) |
| C8 | Annual rows omitted from curated (documented) | **warn** | Raw has 32 annual rows (e.g. 1994=39.1) omitted by design; no calendar-year rows in curated. Same pattern as manufacturing employment QA |
| C9 | Independence / no silent rewrite | **pass** | Validation did not edit Energy curated/raw/manifest. Connector inspected read-only |
| C10 | ONS revision / correction context | **warn** | Landing page notes Dec 2025 PRDY processing correction; pin release is **2026-08-17** (post-correction). All curated `observation_status=provisional` as PRDY revises — expected, not a blocker |

## Numerical samples (Validation)

| Period | ONS label | Live ONS / pinned raw | Curated | Match |
|--------|-----------|------------------------|---------|-------|
| 1994-01-01 → 1994-03-31 | 1994 Q1 | 38.7 | 38.7 | exact |
| 2023-01-01 → 2023-03-31 | 2023 Q1 | 96.6 | 96.6 | exact |
| 2023-04-01 → 2023-06-30 | 2023 Q2 | 100.4 | 100.4 | exact |
| 2023-07-01 → 2023-09-30 | 2023 Q3 | 102.0 | 102.0 | exact |
| 2023-10-01 → 2023-12-31 | 2023 Q4 | 101.1 | 101.1 | exact |
| 2025-10-01 → 2025-12-31 | 2025 Q4 | 100.9 | 100.9 | exact |
| 2026-01-01 → 2026-03-31 | 2026 Q1 | 103.3 | 103.3 | exact |

Distinctness check (same periods, different series):

| Period | DJK6 (manufacturing) | LZVB (whole economy) |
|--------|----------------------|----------------------|
| 2023 Q1 | 96.6 | 99.7 |
| 2025 Q4 | 100.9 | 99.1 |
| 2026 Q1 | 103.3 | 100.1 |

## Summary

- Pass: **8**
- Warn: **2**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner Energy): none for Ready. Optional later: surface `seasonalAdjustment` / base year as structured metadata if ONS adds them outside the title string.
- **Notion:** Status Validation → **Ready** (2026-11-07); Evidence includes this QA path

## Reproduce

```bash
# checksum
shasum -a 256 data/energy/manufacturing-output-per-hour/raw/2026-11-07/djk6_prdy.json

# recompute from pinned raw (transform only; do not rewrite curated for QA)
uv run python -c "
from energy.connectors.manufacturing_output_per_hour import ManufacturingOutputPerHourConnector
c = ManufacturingOutputPerHourConnector()
e = c.evidence_from_pinned_raw()
obs = c.transform([e])
print(e.checksum_sha256, len(obs), obs[0].value, obs[-1].value)
"
```

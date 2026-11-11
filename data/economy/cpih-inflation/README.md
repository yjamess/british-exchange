# cpih-inflation

**Owner:** Economy agent  
**Status:** Validation-ready (Economy self-check pass; **not Ready** — Ready is set only by Validation / Orchestrator)  
**Registry:** https://app.notion.com/p/415654717685815b877cc6795dac6273 (status: Validation)  
**Domain:** 01 Inflation & Prices (Wave A) — Orchestrator-approved pin 2026-11-11  
**indicator_id:** `cpih-inflation`

## Series

| Field | Value |
|-------|-------|
| Publisher | ONS |
| Series ID (CDID) | **L55O** |
| Dataset | **MM23** |
| ONS title | CPIH ANNUAL RATE 00: ALL ITEMS 2015=100 |
| Landing | https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23 |
| Data URL | https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | % annual rate (CPIH all items) |
| Licence | OGL v3.0 |
| ONS release | 2026-10-20 (next: 2026-11-18) |

> The "2015=100" in the ONS title is the index base of the underlying CPIH. The series itself is a **percentage rate**.

## Do not confuse with

| indicator_id | CDID | What it is |
|--------------|------|------------|
| `cpih-inflation` (this) | L55O | CPIH **annual rate** (%) |
| `cpih-index` | L522 | CPIH **index level** (2015=100) |
| `cpi-inflation` | D7G7 | CPI **annual rate** (%) — Bank of England target measure |
| `cpi-index` | D7BT | CPI **index level** (2015=100) |

Never label this series as CPI. Energy and Housing link by id; do not fork under `data/energy/`.

## Layout

```txt
data/economy/cpih-inflation/
  manifest.yaml
  raw/2026-11-11/l55o_mm23.json     (gitignored, local pin; re-fetchable)
  curated/observations.csv
  validation_notes.md
  README.md
src/economy/connectors/cpih_inflation.py
src/economy/connectors/labour_prices_series.py   (CPIH_INFLATION spec)
```

## Reproduce

```bash
uv run python -m economy.connectors.cpih_inflation
```

## Result (2026-11-11 ingest)

- Rows: **453** monthly (1989-01 → 2026-09), 0 duplicates, 0 missing values
- Latest: **2026-09 = 3.6** (2026-08 = 3.3, 2026-07 = 3.1)
- First: 1989-01 = 5.7
- `observation_status = provisional` (ONS revises)
- SHA-256 (raw): `7783d086411a1b3aa8c776eb219e328799a522e2ef8e0c171b80d9fabcb53120`

## Related indicators

`cpih-index`, `cpi-inflation`, `cpi-index` (links are two-way in each manifest), plus the Y1 labour/prices family.

## Hand-off

Economy self-check **pass** (see `validation_notes.md`). Hand to Validation for independent QA; Economy does **not** set registry Ready.
Handover note: `docs/handover-economy-01-l55o.md`.

# tax-receipts

**Owner:** Economy agent  
**Status:** Validation-ready (Economy self-QA 2026-11-14) — **not** Registry Ready until independent Validation PASS  
**Registry:** https://app.notion.com/40d654717685811090b0dba9cfd17526  
**indicator_id:** `tax-receipts`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **AHHY** |
| Dataset | **PUSF** |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ahhy/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ahhy/pusf/data |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | £ million, NSA (PS taxes + NICs) |
| Accounting | National Accounts / accruals-aligned PSF — **not** HMRC cash |
| Licence | OGL v3.0 |

## Layout

```txt
data/economy/tax-receipts/
  manifest.yaml
  raw/2026-11-14/ahhy_pusf.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/tax_receipts.py
```

## Reproduce

```bash
uv run python -m economy.connectors.tax_receipts
```

## Spot-checks (2026-11-14 re-pin)

Against pinned raw JSON (release **2026-10-20**; next PSF **20 Nov 2026**):

| Period start | ONS JSON | Curated | Status |
|--------------|----------|---------|--------|
| 1997-04-01 | 21096.0 | 21096.0 | final |
| 2012-01-01 | 56444.0 | 56444.0 | final |
| 2026-08-01 | 88626.0 | 88626.0 | final |
| 2026-09-01 | 88127.0 | 88127.0 | **provisional** (latest only) |

Row count: **354** (1997-04-01 → 2026-09-01). Statuses: **353 final + 1 provisional**.

SHA-256 (raw): `ea9d05903b6d5287484b95bd8c7d7eb5985d2e4b897d30070be6be3f65748ed1`  
(unchanged vs 2026-11-03 pin — same October PSF vintage)

## Accounting note (read before charting)

- **AHHY ≠ HMRC cash receipts.** AHHY is total **public-sector taxes + NICs** on the ONS Public Sector Finances (national accounts / accruals) basis. HMRC’s monthly bulletin is **cash** when money arrives at HMRC.
- Package stores **calendar-month period levels only** (£m NSA). Bulletins often quote **financial-year-to-date** sums — those are not curated here; derive and label if needed.
- Do **not** invent tax/GDP by dividing AHHY by chain-volume GDP. Official ratio series only, or leave as a gap.
- Do **not** add HMRC cash tax-type components to AHHY and claim reconciliation.

## Related indicators

`public-sector-net-borrowing`, `public-sector-net-debt`, `public-sector-debt-interest`, `total-managed-expenditure`

## Hand-off

Economy self-QA **pass** (2026-11-14). Registry stays **Validation** until independent QA under `data/qa/`.

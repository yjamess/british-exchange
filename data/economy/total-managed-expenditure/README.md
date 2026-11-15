# total-managed-expenditure

**Owner:** Economy agent  
**Status:** Validation-ready (self-QA pass) — **not** Registry Ready until independent Validation  
**Registry:** https://app.notion.com/40d65471768581fdbd63d0fe45d94e87  
**indicator_id:** `total-managed-expenditure`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **EBFT** |
| Dataset | **PUSF** |
| Landing | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ebft/pusf |
| Data URL | https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/ebft/pusf/data |
| ONS title | PS: Total managed expenditure: £m CPNSA |
| Geography | United Kingdom (`K02000001`) |
| Frequency | monthly |
| Unit | £ million, current prices, **NSA** |
| Licence | OGL v3.0 |

## Accounting (short)

- **TME** = National Accounts aggregate of public-sector current + capital spending (ONS PSF).
- HMT budgeting presents **TME ≈ DEL + AME** (plus accounting adjustments in PESA/PSS) — see [How to understand public sector spending](https://www.gov.uk/government/publications/how-to-understand-public-sector-spending/how-to-understand-public-sector-spending) and [PSS guidance](https://www.gov.uk/government/statistics/public-spending-statistics-release-july-2026/public-spending-statistics-guidance).
- This package stores **calendar-month levels only** (£m NSA). Bulletins often quote financial-year-to-date — label any FYTD / rolling sum as derived.
- **Not** HMT departmental outturn, OSCAR organisation lines, or COFOG / “services delivered” (TES) without a labelled gap.
- Latest valued month `provisional`; older valued months `final`. Charts should drop provisional.

## Layout

```txt
data/economy/total-managed-expenditure/
  manifest.yaml
  raw/2026-11-14/ebft_pusf.json
  curated/observations.csv
  validation_report.md
  README.md
src/economy/connectors/total_managed_expenditure.py
```

## Reproduce

```bash
uv run python -m economy.connectors.total_managed_expenditure
```

## Spot-checks (2026-11-14 re-pin)

Against pinned raw JSON (October 2026 PSF vintage; checksum unchanged vs 2026-11-03):

| Period start | ONS JSON | Curated | Status |
|--------------|----------|---------|--------|
| 1997-04-01 | 26918.0 | 26918.0 | final |
| 2012-01-01 | 66277.0 | 66277.0 | final |
| 2026-08-01 | 116488.0 | 116488.0 | final |
| 2026-09-01 | 123791.0 | 123791.0 | provisional |

Row count: **354** (1997-04-01 → 2026-09-01). Statuses: **353 final + 1 provisional**.

SHA-256: `2669443f7b262618fe67a0346c5b0c58fba700f1091fd234dfb9977a5268cfbc`  
Official release: **2026-10-20** · Next PSF: **20 Nov 2026**

## Related indicators

`public-sector-net-borrowing`, `public-sector-net-debt`, `public-sector-debt-interest`, `tax-receipts`

## Hand-off

Self-QA verdict **pass**. Registry stays **Validation** until independent QA under `data/qa/`. See `docs/handover-economy-07-spending.md`.

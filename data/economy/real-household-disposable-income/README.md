# real-household-disposable-income

**Owner:** Economy agent  
**Status:** Validation-ready (Domain 04 Phase 1) — **not Ready**  
**Registry:** https://app.notion.com/p/4196547176858177ba88d10198b5cdee  
**indicator_id:** `real-household-disposable-income`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **DG2R** |
| Dataset | **UKEA** (UK Economic Accounts) |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/dg2r/ukea |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly (annual rows in raw JSON omitted) |
| Unit | £ million CVM, SA, households **S.14** |
| Reference year | **2024** (series title at 2026-09-30 UKEA vintage) |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m economy.connectors.real_household_disposable_income
```

## Pin (2026-11-15)

- Raw: `raw/2026-11-15/dg2r_ukea.json`, SHA-256 `cd6c516e9009a2e51f2c5e1fe3fe5d375bd88487ed69a467adee88f3f9f64be9`
- JSON `releaseDate`: `2026-09-29T23:00:00.000Z` → manifest `official_release_date` **2026-09-29** (ONS landing shows 30 September 2026 UK)
- Next release listed: 22 December 2026
- Rows: **286** (1955 Q1 → 2026 Q2). Latest 2026 Q2 = **457,927** £m (provisional). 2026 Q1 = 453,116 (final).
- Spot vs ONS timeseries table: 1955 Q1 = 78,185; 2026 Q2 = 457,927 — match.

## Notes

National accounts S.14 total, not a median household. Not NPISH (NRJR). Not AWE, not HBAI, not ETB.

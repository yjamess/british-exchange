# real-household-disposable-income-per-head

**Owner:** Economy agent  
**Status:** Validation-ready (Domain 04 Phase 1) — **not Ready**  
**Registry:** https://app.notion.com/p/41965471768581998f42e024b57683fa  
**indicator_id:** `real-household-disposable-income-per-head`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **CRXX** |
| Dataset | **UKEA** |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/crxx/ukea |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly |
| Unit | £ CVM per head, SA |
| Reference year | **2024** |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m economy.connectors.real_household_disposable_income_per_head
```

## Pin (2026-11-15)

- Raw: `raw/2026-11-15/crxx_ukea.json`, SHA-256 `172d03bff5669c51b75881fb2a718bf7d110e302277ea59d95f1324219fd24b5`
- Release: JSON `2026-09-29T23:00:00.000Z` (landing 30 September 2026)
- Rows: **286** (1955 Q1 → 2026 Q2). Latest 2026 Q2 = **£6,577** (provisional). 2026 Q1 = £6,511 (final).
- Spot vs ONS table: 1955 Q1 = 1,536; 2026 Q2 = 6,577 — match.

## Notes

Per-head national accounts, not equivalised HBAI, not `real-gdp-per-head` (IHXW). ONS title does not print ESA S.14; treated as the DG2R companion. Population denominator revises separately.

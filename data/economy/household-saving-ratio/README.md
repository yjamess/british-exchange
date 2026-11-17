# household-saving-ratio

**Owner:** Economy agent  
**Status:** Validation-ready companion (Domain 04 Phase 1) — **not Ready**  
**Registry:** https://app.notion.com/p/419654717685813cba9cd97e70409fb3  
**indicator_id:** `household-saving-ratio`

## Series

| Field | Value |
|-------|--------|
| Publisher | ONS |
| Series ID (CDID) | **DGD8** |
| Dataset | **UKEA** |
| Landing | https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/dgd8/ukea |
| Geography | United Kingdom (`K02000001`) |
| Frequency | Quarterly |
| Unit | % of household total resources, SA, current prices, **S.14** |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m economy.connectors.household_saving_ratio
```

## Pin (2026-11-15)

- Raw: `raw/2026-11-15/dgd8_ukea.json`, SHA-256 `aa05f3a111fc2d8117ae4006809b83fde19d460b57131d3296ed015a886cd6ee`
- Release: JSON `2026-09-29T23:00:00.000Z` (landing 30 September 2026)
- Rows: **254** (1963 Q1 → 2026 Q2). Latest 2026 Q2 = **8.8%** (provisional). 2026 Q1 = 8.6% (final).
- Spot vs ONS table: 1963 Q1 = 4.7; 2026 Q2 = 8.8 — match.

## Notes

National-accounts residual. **Not** Britain's Financial Buffer (needs WAS / survey distributions). Not S.14+S.15 (NRJS). Not experimental cash-basis CSJ8. ONS title still says “£m” even though the series is a percent — we store the published percent values.

Do not join this ratio to LCF spending or HBAI income as one household record.

# consumer-credit-outstanding

**Owner:** Economy agent  
**Status:** Validation-ready (Domain 04 Weight of Debt) — **not Ready**  
**Registry:** https://app.notion.com/p/41965471768581ac9b18dd18aa199030  
**indicator_id:** `consumer-credit-outstanding`

## Series

| Field | Value |
|-------|--------|
| Publisher | Bank of England |
| CDIDs | **LPMBI2O** total; **LPMVZRJ** credit cards; **LPMB4TS** other |
| Table | Bankstats A5.6 / Money and Credit |
| Landing | https://www.bankofengland.co.uk/boeapps/database/ |
| Geography | United Kingdom (`K02000001`); lending to individuals |
| Frequency | Monthly |
| Unit | £ million, seasonally adjusted |
| Licence | OGL / BoE terms of use |

Headline stock **excludes** the Student Loans Company.

## Reproduce

```bash
uv run python -m economy.connectors.consumer_credit_outstanding
```

## Pin (2026-11-15)

- Raw: `raw/2026-11-15/lpmbi2o_lpmvzrj_lpmb4ts.csv`
- SHA-256 `ab8c026ad4caca0c158655d82a0b49a25425643dccc3d5784702df85d78545da`
- Vintage: Money and Credit **29 October 2026** (September 2026 data)
- Rows: **1,208** (total 402 from Apr 1993; cards/other 403 from Mar 1993)
- Latest month marked `provisional`

September 2026 spots (self-QA; cards + other = total):

| Series | CDID | £ million SA |
|--------|------|----------------|
| Total | LPMBI2O | **261,200** |
| Credit cards | LPMVZRJ | 83,708 |
| Other | LPMB4TS | 177,492 |

## Link only (do not re-ingest)

- `mortgage-rate-2yr-fixed` (IUMBV34) — quoted rate context, not a burden
- Housing `residential-mortgage-book` — MLAR outstanding / arrears

BoE secured-on-dwellings outstanding **LPMVTXK** (Table A5.2, SA) is documented but **not ingested** so Economy does not fork Housing’s book.

## Notes

- Credit-card vs other split is not comparable before January 1999.
- April 2024 ONS→BoE reporting-population transfer may affect levels.
- Lender stocks ≠ WAS survey debt (Table 5.7 left uningested).

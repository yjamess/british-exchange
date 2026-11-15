# underemployment (EMP16)

**Owner:** Economy · EC-G2-03c  
**What it is:** People aged 16 and over who want more hours (ONS underemployment). United Kingdom. **Not seasonally adjusted.** Quarterly.

The workbook banner says “Levels, thousands”. The cells are **people**. Check: level ÷ employment × 100 equals the published rate. The connector stops if that check fails. Do not divide these numbers by 1,000.

This is not involuntary part-time (`involuntary-part-time`, YCCX) and not all part-time work (`employment-part-time`, YCBH).

## Reproduce

```bash
uv run python -m economy.connectors.underemployment
```

## Spot (release 2026-08-18, Apr–Jun 2026)

| Series | Value |
|--------|-------|
| Underemployment level | **2,768,796** people |
| Employment (rate denominator) | **34,426,383** people |
| Underemployment rate | **8.04%** of employment (full cell 8.042657…) |

ONS does not publish a seasonally adjusted twin in EMP16. Compare the same quarter across years.

`Jan-Mar 20191` (Levels) and `Jan-Mar 20194` (Rates) are 2019 Q1 with a footnote digit stuck to the year. `source_label` keeps the original text.

# tax-receipts-cg-composition

**Owner:** Economy agent  
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready  
**indicator_id:** `tax-receipts-cg-composition`  
**Identity:** `NMBY + NMCU + LIQR = MF6P`

## Series

| CDID | Role | Source | Curated? |
|------|------|--------|----------|
| NMBY | Total CG taxes on production | PUSF `/data` JSON | yes |
| NMCU | Total CG taxes on income and wealth | PUSF `/data` JSON | yes |
| LIQR | Other CG taxes | PUSF `/data` JSON | yes |
| MF6P | Total CG taxes (parent) | PUSF + Ready composition | evidence / identity only |

## Reproduce

```bash
uv run python -m economy.connectors.tax_receipts_cg_composition
```

## Identity spot (self-QA)

| Period | NMBY | NMCU | LIQR | Sum | MF6P | Diff |
|--------|------|------|------|-----|------|------|
| 2026-07-01 | 31,702 | 48,323 | 2,609 | 82,634 | 82,634 | 0.0 |
| 2026-08-01 | 30,912 | 33,370 | 2,348 | 66,630 | 66,630 | 0.0 |
| 2026-09-01 | 31,454 | 32,087 | 2,741 | 66,282 | 66,282 | 0.0 |

Identity check pass=True; ok_months=354; failed=0.

## Accounting

- Accruals / NAB (Appendix D) — **not** HMRC cash.
- Sibling of Ready `tax-receipts-composition` — does **not** rewrite AHHY four heads.
- Latest month provisional only (PSF revises).
- Deeper leaves (LIBR / NZGF / CPRN) **not** in this pin.

Docs: `docs/handover-economy-06-anatomy-cg-drill.md`

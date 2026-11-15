# tax-receipts-composition

**Owner:** Economy agent  
**Status:** Validation-ready (Economy self-QA) — **not** Registry Ready  
**Registry:** https://app.notion.com/p/419654717685818dac2bc06033d4a01c  
**indicator_id:** `tax-receipts-composition`  
**Identity:** `MF6P + AIIH + NMHM + AHGR = AHHY`

## Series

| CDID | Role | Source |
|------|------|--------|
| MF6P | Total CG taxes | PUSF `/data` JSON |
| AIIH | Social contributions (NICs) | PUSF `/data` JSON |
| NMHM | Council tax | PUSF `/data` JSON |
| AHGR | Other LG taxes | Appendix D Time Series (PUSF `/data` **404**) |
| AHHY | Total (chart) | Ready `tax-receipts` — **not** forked here |

## Reproduce

```bash
uv run python -m economy.connectors.tax_receipts_composition
```

## Identity spot (self-QA)

| Period | MF6P | AIIH | NMHM | AHGR | Sum | AHHY | Diff |
|--------|------|------|------|------|-----|------|------|
| 2026-07-01 | 82,634 | 16,678 | 4,494 | -65 | 103,741 | 103,741 | 0.0 |
| 2026-08-01 | 66,630 | 17,567 | 4,494 | -65 | 88,626 | 88,626 | 0.0 |
| 2026-09-01 | 66,282 | 17,414 | 4,494 | -63 | 88,127 | 88,127 | 0.0 |

Identity check pass=True; ok_months=345; failed=0.

## Accounting

- Accruals / NAB (Appendix D) — **not** HMRC cash.
- Do **not** use JW2O as Anatomy total.
- Latest month provisional only (PSF revises).

Docs: `docs/handover-economy-06-anatomy-pin.md`

# unemployment-rate (LF2Q) — validation notes (Economy G2 Phase 0)

**Checked:** 2026-11-14 by Economy Domain 03. **Not a Validation sign-off.**

| Check | Result |
|-------|--------|
| Pin | `raw/2026-11-14/lf2q_lms.json` · sha256 `371e47deb6d82a5239531f310cf86caad1cd0f15c110d5a4f16460be7d521014` |
| Spot | 2026-07 = **4.9%** of economically active aged 16–64 |
| Rows | 666 · provisional = latest month only |

## Caveats

- Denominator = economically active 16–64, **not** population 16–64.
- Prefer LF2Q with Domain 03 counts; do not silently substitute headline MGSX (16+).
- Never add LF2Q + LF24 + LF2S as a population composition.

# employment-rate (LF24) — validation notes (Economy G2 Phase 0)

**Checked:** 2026-11-14 by Economy Domain 03. **Not a Validation sign-off.** Ready only after Validation QA.

| Check | Result |
|-------|--------|
| Re-pin | `raw/2026-11-14/lf24_lms.json` · sha256 `b68f87c2ed598965d0169b5b3de8bf88b07af0cbbad867260b23a4fc31ae04ed` |
| ONS release in JSON | 2026-10-19 (LMS); next labour-market release 17 Nov 2026 |
| Spot | 2026-07 (Jun–Aug mid-month) = **75.3%** — matches [UK labour market Oct 2026](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/bulletins/uklabourmarket/october2026) summary |
| Rows | 666 months · `observation_status` = latest month provisional only (665 final + 1 provisional) |
| Geography / age / SA | UK · 16–64 · SA |

## Caveats for Validation

- LFS rolling three-month average; mid-month LMS convention.
- Do **not** compose working-age population from LF24 + LF2S + unemployment rate (different denominators). Use matched counts LF2G / LF2I / LF2M.
- LFS response / reweighting uncertainty — small monthly moves are noisy.

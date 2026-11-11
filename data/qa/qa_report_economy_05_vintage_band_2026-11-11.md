# QA report — Economy 05 GDP vintage-band — 2026-11-11

**Agent:** Validation  
**Overall verdict:** **pass** (0 fails · 0 warns)

| Pack | Verdict | Ready recommendation |
|------|---------|----------------------|
| `economy.gdp-vintage-band` | **pass** | Trusted for Growth › Revisions on the 2026-11-11 pin set |

## Scope

- Pack: `data/economy/gdp-vintage-band/curated/band.json` (read only)
- Inputs: `real-gdp/raw/2026-11-11/abmi_{pn2,qna}.json` · `real-gdp-per-head/raw/2026-11-11/ihxw_{pn2,qna}.json`
- Prior: QNA series QA in `qa_report_economy_growth_qna_2026-11-11.md` (unchanged)
- Kickoff: `docs/agent-kickoff-validation-economy-05-vintage-band.md`

## Freeze

| Key / vintage | Raw path | Pack checksum | File checksum | Match |
|---------------|----------|---------------|---------------|-------|
| real-gdp / pn2 | `…/abmi_pn2.json` | `a1265250…` | `a1265250cf820db2…` | yes |
| real-gdp / qna | `…/abmi_qna.json` | `6ce4b868…` | `6ce4b868fc86af44…` | yes |
| real-gdp-per-head / pn2 | `…/ihxw_pn2.json` | `245f3fea…` | `245f3fea0aebba90…` | yes |
| real-gdp-per-head / qna | `…/ihxw_qna.json` | `7a03fd26…` | `7a03fd267fefc5fc…` | yes |

QNA raw checksums match the Growth QNA freeze table. PN2 ABMI matches the superseded PN2 pin noted in that report.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| V1 | Raw SHA-256 = pack `checksum_sha256` (×4) | **pass** | See Freeze |
| V2 | Independent rebase to 2019 Q4 = 100 | **pass** | 0 mismatches ×4; first index point = 100.0 at 2019-10-01; n=27 quarters each |
| V3 | Release dates from ONS description | **pass** | PN2 2026-08-12 · QNA 2026-09-29 |
| V4 | Spot recompute (ratio · since-ref %) | **pass** | GDP ratio **1.0448**; since 2019 Q4 PN2 **+6.2569%** / QNA **+6.2142%**; per-head **1.0448** / **+1.7701%** / **+1.7220%** |
| V5 | Quarterly contiguity of index | **pass** | No gaps 2019 Q4 → 2026 Q2 |
| V6 | Honesty string present | **pass** | States absolute £ levels are not comparable across vintages |
| V7 | Index ≠ absolute level | **pass** | Chart values ~100–106; levels remain £m / £ per head in spot only |
| V8 | Independence — no silent rewrite | **pass** | Validation did not edit `data/economy/` or `src/economy/` |

## Summary

- Pass: 19 · Warn: 0 · Fail: **0**
- Blockers: none for this pin set
- Recommended follow-ups (not blockers):
  1. **Economy** — rebuild pack after 12 Nov GDP re-pin (new dated raw folder).
  2. **Orchestrator** — Growth › Revisions may treat the vintage-band as trusted; keep Notes honesty (rebased indexes only).

## Reproduce

```bash
uv run python -m economy.connectors.gdp_vintage_band
# then re-run the independent rebase / spot script used for this report
shasum -a 256 \
  data/economy/real-gdp/raw/2026-11-11/abmi_pn2.json \
  data/economy/real-gdp/raw/2026-11-11/abmi_qna.json \
  data/economy/real-gdp-per-head/raw/2026-11-11/ihxw_pn2.json \
  data/economy/real-gdp-per-head/raw/2026-11-11/ihxw_qna.json
```

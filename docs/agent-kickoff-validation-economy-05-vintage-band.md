# Validation kickoff — Economy 05 · GDP vintage-band

**Owner:** Validation · **Date:** 2026-11-11  
**Domain:** [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b)  
**Prior QA:** [qa_report_economy_growth_qna_2026-11-11.md](../data/qa/qa_report_economy_growth_qna_2026-11-11.md) (QNA series — already pass)

## Scope

Independent QA only — do **not** rewrite curated files. File findings under `data/qa/`.

### Pack under test

| Item | Path / id |
|------|-----------|
| Pack id | `economy.gdp-vintage-band` |
| Curated | `data/economy/gdp-vintage-band/curated/band.json` |
| Builder | `economy.connectors.gdp_vintage_band` |
| Inputs | `real-gdp/raw/2026-11-11/abmi_{pn2,qna}.json` · `real-gdp-per-head/raw/2026-11-11/ihxw_{pn2,qna}.json` |

### Checks

| Check | How |
|-------|-----|
| Input freeze | SHA-256 of four raw pins match pack `checksum_sha256` and (for QNA) prior Growth QA freeze |
| Rebase honesty | Both vintages hit **100.0** at 2019 Q4; chart series are indexes, not £ levels |
| Spot recompute | Latest-period since-2019Q4 % and QNA÷PN2 level ratio match an independent recompute |
| No level overlay | Pack `honesty` string present; UI Notes must not plot absolute £ on one axis |
| Contiguity | Index series continuous quarterly from 2019 Q4 → latest shared quarter |

## Out of scope

- Re-QA of live QNA curated CSVs (already in `qa_report_economy_growth_qna_2026-11-11.md`)
- Post-12 Nov / 17 Nov re-pins
- Editorial polish of Growth canvas

## Done means

QA report under `data/qa/` with pass/fail; Orchestrator may treat Revisions as trusted for the 2026-11-11 pin set.

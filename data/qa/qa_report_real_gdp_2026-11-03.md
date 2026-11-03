# QA report — Real GDP — 2026-11-03

**Agent:** Validation  
**Task:** T06c — Economy Real GDP (`real-gdp`)  
**Overall verdict:** **pass-with-warns**

## Scope

- Economy files:
  - Manifest: `data/economy/real-gdp/manifest.yaml`
  - Curated: `data/economy/real-gdp/curated/observations.csv` (286 data rows)
  - Raw: `data/economy/real-gdp/raw/2026-11-03/abmi_pn2.json`
  - README: `data/economy/real-gdp/README.md`
  - Registry: https://app.notion.com/40d6547176858109b56fe01fb94ff2eb
- Energy files: not in scope (independent of Energy T05)
- Independence: Validation re-read pinned raw JSON + curated CSV; did **not** re-ingest or edit Economy/Energy paths.

## Freeze confirmation

| Item | Expected | Observed |
|------|----------|----------|
| SHA-256 | `a1265250cf820db23acee78d3ffbbe48ddd0ac3ca7a0aef4027332dbf0d3296d` | match (file = manifest = freeze) |
| Series | ABMI / PN2 | ONS JSON `description.cdid=ABMI`; quarters `sourceDataset=PN2` |
| Row count | 286 | 286 quarterly (1955 Q1 → 2026 Q2), continuous |
| Unit / method | UK K02000001; quarterly CVM SA £m | match |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Raw checksum vs manifest + freeze | pass | SHA-256 `a1265250cf820db23acee78d3ffbbe48ddd0ac3ca7a0aef4027332dbf0d3296d` |
| C2 | Manifest contract fields | pass | Required fields present; `series_id=ABMI`; geography UK/`K02000001`; `frequency=quarterly`; unit `£ million chained volume (market prices), SA` |
| C3 | Curated Observation schema | pass | Header matches contract columns exactly |
| C4 | Row count / uniqueness / period coverage | pass | 286 rows; 0 duplicates on `(indicator_id, period_start)`; continuous quarters `1955-01-01`…`2026-04-01`; all `provisional` |
| C5 | Independent recompute ≥5 quarters from raw JSON | pass | Spot: 1955Q1=145457; 2019Q4=670587; 2020Q2=522356; 2025Q1=703178; 2026Q2=712545 — all match. Full recompute of all 286 JSON quarters → CSV: **0 mismatches** |
| C6 | Method: SA, CVM levels not index; quarterly only | warn | ONS title confirms chained volume + seasonally adjusted £m; median value ~374k (£m levels, not index≈100). **Warn:** raw JSON has 78 annual rows; curated correctly omits them (documented; open question for annual secondary file) |
| C7 | Status / revision caveats documented | warn | All rows `provisional` (PN2 first-estimate family). Revisions covered in `caveats` + `transformations`. **Warn:** `revision_notes` field is empty — non-blocking; optional Economy fill |

## Summary

- **Blockers:** none.
- **Verdict:** pass-with-warns (C6 annual omitted; C7 empty `revision_notes`).
- **Recommended fixes (owner):** none required for Ready.
  - Optional (owner **Economy**): populate `revision_notes` with Blue Book / quarterly revision pointer; decide with Orchestrator whether to add annual ABMI as a second curated file.
- **Notion:** Status was Validation at QA start; set → **Ready** after this pass-with-warns.

## Repro

```bash
uv run python -m validation.qa_real_gdp_2026_11_03
```

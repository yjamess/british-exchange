# QA report — Economy Wave A growth (QNA vintage) — 2026-11-11

**Agent:** Validation
**Overall verdict:** **pass-with-warns** (no fails)

| Indicator | CDID / dataset | Verdict | Ready recommendation |
|-----------|----------------|---------|----------------------|
| `real-gdp` | ABMI / QNA | **pass** | **Ready** (re-pin after 12 Nov release) |
| `real-gdp-per-head` | IHXW / QNA | **warn** (36 ONS zero placeholders pre-1955) | **Ready, conditional** — UI/API must treat 1946 Q1 → 1954 Q4 as missing; Orchestrator fix first or gate in the view |
| `business-investment` | NPEL / QNA | **pass** | **Ready** (re-pin after 12 Nov release) |
| `labour-productivity` | LZVB / PRDY | **pass-with-warn** (Aug vintage; next release 17 Nov) | **Ready** for the current pin; re-pin 17 Nov |

## Scope

- Economy files (read only, none edited): `data/economy/{real-gdp,real-gdp-per-head,business-investment,labour-productivity}/` — `manifest.yaml`, `raw/2026-11-11/*`, `curated/observations.csv`
- Handover: `docs/handover-economy-05-qna-switch-2026-11-11.md`
- Official: ONS [ABMI/QNA](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/abmi/qna), [IHXW/QNA](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ihxw/qna), [NPEL/QNA](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/qna), [LZVB/PRDY](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/lzvb/prdy)
- Supersedes for these bytes: `qa_report_real_gdp_2026-11-03.md` (covered PN2 `a1265250…`)

## Freeze

| Indicator | Raw path | Manifest SHA-256 | Observed SHA-256 | Match |
|-----------|----------|------------------|------------------|-------|
| `real-gdp` | `raw/2026-11-11/abmi_qna.json` | `6ce4b868fc86af44…` | `6ce4b868fc86af44653ae0ae864e587d15a849c54f347b22830cddaa92ad7693` | yes |
| `real-gdp-per-head` | `raw/2026-11-11/ihxw_qna.json` | `7a03fd267fefc5fc…` | `7a03fd267fefc5fcc7e66bc9ac05bf3b42d24806696c4ef7530ac3dcf29fb7ba` | yes |
| `business-investment` | `raw/2026-11-11/npel_qna.json` | `09722c21c27a5d54…` | `09722c21c27a5d5462e176c19d568e6c23c0b55b30bd6e6b0c7c77a87a356076` | yes |
| `labour-productivity` | `raw/2026-11-11/lzvb_prdy.json` | `0203bfc8991c4e31…` | `0203bfc8991c4e3162ea6e7183859f7e522a78978a508a99bbb70cb06b816f89` | yes |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| G1 | Raw SHA-256 equals manifest (all 4) | **pass** | See Freeze table |
| G2 | `dataset_id` = QNA in manifest for ABMI, IHXW, NPEL | **pass** | `source_url` and `raw_evidence.source_url` end `/qna` and `/qna/data`; raw `path` is `*_qna.json`; every `quarters[].sourceDataset` in raw is `["QNA"]`; curated `source_version` = `QNA/<CDID> 2026-09-29` on every row; row notes carry `dataset=QNA` |
| G3 | LZVB stays on PRDY | **pass** | Raw `sourceDataset` = `PRDY`; `source_version` = `PRDY/LZVB 2026-08-17` |
| G4 | Independent raw → curated recompute (own loop over `quarters`) | **pass** | 0 mismatches and 0 extra rows: ABMI 286, IHXW 322, NPEL 118, LZVB 221 |
| G5 | Live ONS `/data` spot-check vs pin (retrieved 2026-11-11, HTTP 200) | **pass** | Full-series diff vs pinned raw = **0** for all four; live `releaseDate` equals pin (QNA 2026-09-29; PRDY 2026-08-17); titles match |
| G6 | Latest quarter vs ONS series page | **pass** | ABMI 2026 Q2 = 744,453 £m; IHXW 2026 Q2 = £10,692; NPEL 2026 Q2 = 83,534 £m; LZVB 2026 Q1 = 100.1 — live `/data` equals curated |
| G7 | Reference year / base year | **pass** | IHXW title states "reference year = 2024"; ABMI/NPEL titles do not state it (ONS QNA 2026-09-29 is on 2024; manifest says "confirm on each ingest"); LZVB title "Index 2023 = 100" matches manifest unit |
| G8 | Continuity, duplicates, units, geography, status | **pass** | Quarterly rows contiguous (no gaps/dupes), `period_end` on quarter ends, geography `K02000001` / United Kingdom only, `observation_status` = `provisional`, units match manifests |
| G9 | Cross-series sanity (ABMI ÷ IHXW = implied population) | **pass** | 69.6m at 2026 Q2 and 58.8m at 2000 Q1 — plausible UK population; confirms both are the same QNA vintage and the same reference year |
| G10 | Growth recompute from curated | **pass** | 2026 Q2: ABMI QoQ +0.53%, YoY +1.37%, since 2019 Q4 +6.21%; IHXW +0.48% / +1.17% / +1.72%; NPEL +1.75% / **+5.16%** / +12.69% — all equal the handover §3 QNA figures |
| G11 | NPEL YoY story is QNA-based | **pass** | From raw: QNA 2026 Q2 YoY **+5.16%** (83,534 vs 2025 Q2); retired PN2 raw gives **+0.83%** (78,413). Curated NPEL YoY (+5.16%) equals the QNA figure, so the curated file and manifest `revision_notes` tell the QNA story. Never mix vintages in one chart |
| G12 | IHXW ONS zero placeholders | **warn** | 36 curated rows (1946 Q1 → 1954 Q4) are `0.0`, not data; first real value 1955 Q1 = 2,936. Raw also holds `0` — this is an ONS publication artefact, not a parse error. README and handover already flag it. **Owner: Orchestrator/Economy** — add a per-spec first-valid period, or mark these as missing; do not change the shared parser blanket-wise (agrees with the handover) |
| G13 | LZVB vintage freshness | **warn** | Release 2026-08-17; live `nextRelease` = 17 November 2026 (confirmed). Pass with warn per brief. Re-pin and compare base year on 17 Nov (manifest says base may move) |
| G14 | QNA vintage will move tomorrow | **warn** | Live `nextRelease` = 12 November 2026 for ABMI, IHXW, NPEL (GDP Q3 first estimate). This QA is valid for the 2026-09-29 vintage only. Re-pin and re-run `diff` after 12 Nov |
| G15 | Notion registry rows consistent with manifests | **warn** | Registry `Real GDP` row still points at PN2 (Source URL `…/abmi/pn2`, raw sha `a1265250…`, evidence `raw/2026-11-03/abmi_pn2.json`). Stale after the QNA switch. **Owner: Orchestrator/Economy** to refresh row text. Validation updated **Last checked** only |
| G16 | Prior validation for `business-investment` | **warn** | `data/economy/business-investment/validation_report.md` self-QA applies to PN2 bytes only; this report replaces it for QNA |
| G17 | Independence — no silent rewrite | **pass** | Validation did not edit any `data/economy/` or `src/economy/` file |

## Summary

- Pass: 12 · Warn: 5 (G12 – G16) · Fail: **0**
- Blockers: none for the 2026-09-29 pin
- Recommended fixes (owner):
  1. **Orchestrator/Economy** — IHXW pre-1955 zeros → missing (G12) before the series is charted from its start. Until then UI must start IHXW at 1955 Q1.
  2. **Economy** — re-pin ABMI/IHXW/NPEL after 12 Nov and LZVB after 17 Nov. Re-run Validation diff then.
  3. **Orchestrator** — refresh stale PN2 text in the Notion `Real GDP` row (G15).
- **Recommendation to Orchestrator (Validation does not flip Notion status):** `real-gdp` Ready, `business-investment` Ready, `labour-productivity` Ready (current pin), `real-gdp-per-head` Ready with the pre-1955 condition above.

## Orchestrator follow-up (2026-11-11, same day)

- **G12 applied:** `OnsSeriesSpec.zero_as_missing_before="1955-01-01"` on IHXW; offline re-curate from `ihxw_qna.json` → 36 `missing`, 0 value-zeros, first real 1955 Q1 = 2,936.
- **G15 applied:** Notion Real GDP / GDP per head / business investment rows refreshed to QNA evidence.
- **Ready flips:** `real-gdp`, `real-gdp-per-head`, `business-investment`, `labour-productivity`.

## Reproduce

```bash
cd data/economy
shasum -a 256 real-gdp/raw/2026-11-11/abmi_qna.json real-gdp-per-head/raw/2026-11-11/ihxw_qna.json \
  business-investment/raw/2026-11-11/npel_qna.json labour-productivity/raw/2026-11-11/lzvb_prdy.json
curl -sS 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/npel/qna/data' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); q=d['quarters']; print(d['description']['releaseDate'], d['description']['nextRelease'], q[-1])"
# YoY on QNA vs PN2 raw (both on disk): 83534/ (2025 Q2) -1  → +5.16%;  78413/(2025 Q2) -1 → +0.83%
```

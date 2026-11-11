# Handover — Economy Domain 05 PN2 → QNA source switch (2026-11-11)

**Owner:** Economy · **Scope:** `src/economy/`, `data/economy/` only (no frontend)
**Notion:** [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b)
**Previous handover:** [handover-economy-05-repin-2026-11-11.md](handover-economy-05-repin-2026-11-11.md)

> **Status: Validation-ready, not Ready.** Economy does not set registry Ready.
> **Dataset = QNA** for ABMI, IHXW and NPEL. LZVB stays on PRDY.

## Why

Orchestrator locked source policy. The PN2 landing is frozen at 2026-08-12 and never advances (its JSON still says `nextRelease: 30 September 2026`, which ONS published into QNA). QNA 2026-09-29 (reference year 2024) is the live vintage. NPEL year-on-year growth differs materially between the two (+0.8% on PN2, +5.2% on QNA).

## Pre-flight: QNA `/data` URLs

All three returned HTTP 200 on 2026-11-11 with a `quarters` array. `months` is empty because these are quarterly series. Every quarter row has `sourceDataset: "QNA"`, and no CDID needed a different slug (no UKEA fallback needed).

| CDID | URL | HTTP | months / quarters / years | Release | `nextRelease` |
|---|---|---|---|---|---|
| ABMI | `…/grossdomesticproductgdp/timeseries/abmi/qna/data` | 200 | 0 / 286 / 78 | 2026-09-29 | 12 Nov 2026 |
| IHXW | `…/grossdomesticproductgdp/timeseries/ihxw/qna/data` | 200 | 0 / 322 / 80 | 2026-09-29 | 12 Nov 2026 |
| NPEL | `…/grossdomesticproductgdp/timeseries/npel/qna/data` | 200 | 0 / 118 / 29 | 2026-09-29 | 12 Nov 2026 |

## Code changes

| File | Change |
|---|---|
| `src/economy/connectors/real_gdp.py` | `DATASET_ID="QNA"`, landing `…/abmi/qna`. `source_version` and the raw filename now derive from `DATASET_ID` (they were hard-coded `PN2`/`abmi_pn2.json`). PN2→QNA in definition, transformations, revision notes and caveats. Removed the resolved "Prefer QNA vs PN2?" open question. |
| `src/economy/connectors/labour_prices_series.py` | `REAL_GDP_PER_HEAD` (IHXW): `dataset_id="QNA"`, landing `…/ihxw/qna`, definition and revision notes updated. LZVB (PRDY) untouched. |
| `src/economy/connectors/fiscal_series.py` | `BUSINESS_INVESTMENT` (NPEL): `dataset_id="QNA"`, landing `…/npel/qna`, text updated, `open_questions=[]` (resolved: QNA). |
| `src/economy/connectors/__init__.py`, `business_investment.py` | PN2 → QNA in comments/docstring. |

The raw filename follows `<cdid>_<dataset>.json`, so QNA raws are new files beside the PN2 ones in `raw/2026-11-11/`. Nothing was overwritten.

## 1. Old PN2 vs new QNA checksums

Raw JSON is git-ignored (`data/**/raw/**`). Old PN2 raw files are still on disk in the same `raw/2026-11-11/` folders.

| Indicator | Old raw SHA-256 (PN2) | New raw SHA-256 (QNA) |
|---|---|---|
| `real-gdp` (ABMI) | `a1265250cf820db23acee78d3ffbbe48ddd0ac3ca7a0aef4027332dbf0d3296d` | `6ce4b868fc86af44653ae0ae864e587d15a849c54f347b22830cddaa92ad7693` |
| `real-gdp-per-head` (IHXW) | `245f3fea0aebba90fe62b455c1b537bd21534641561810bce59e36cd1fbef97a` | `7a03fd267fefc5fcc7e66bc9ac05bf3b42d24806696c4ef7530ac3dcf29fb7ba` |
| `business-investment` (NPEL) | `41125202c10b9399d436b59b1934cc7d061c099474d4e2de0ea0f038e6b86f7c` | `09722c21c27a5d5462e176c19d568e6c23c0b55b30bd6e6b0c7c77a87a356076` |
| `labour-productivity` (LZVB, PRDY) | `0203bfc8991c4e3162ea6e7183859f7e522a78978a508a99bbb70cb06b816f89` | unchanged (`0203bfc8…`) |

| Indicator | Old curated CSV SHA-256 | New curated CSV SHA-256 |
|---|---|---|
| `real-gdp` | `6549c13a9beca571614ed1f540245861f8b38ec2d75df1bcd7d9cf8e09c14745` | `c1f095338aa587fd8650e4c82b4ebf04996114fa9749b3f54b7b3ced05d87864` |
| `real-gdp-per-head` | `3a63e406510ed82345aec65693cca54583c774e4a22694498ff913178361c5ad` | `dcfbaf8e5d5f3be3661fd9cd68062482ec3c59504894fd74946b8744b0fad42a` |
| `business-investment` | `268138d738c1a01ea6c209fed4a786927566f6dbf1956b2e6afee9c9b1055ca3` | `609ea5091dcc2604d543524dd32b3b585dbf17dbf5890c91ad4533b19a46b6a9` |
| `labour-productivity` | `ca62b0605bd8707cdc5fc5e0a2bd93547d5712dfd6ca702a56072fa0083b71f1` | unchanged |

Same periods, same row counts before and after (286 / 322 / 118). Only values, `source_version` and `notes` changed.

## 2. Latest values, release dates, reference years

| Indicator | Release | Ref. year | Latest period | PN2 → QNA latest | Rows | `source_version` |
|---|---|---|---|---|---|---|
| `real-gdp` | 2026-08-12 → **2026-09-29** | 2023 → **2024** | 2026 Q2 | 712,545 → **744,453** £m | 286 (1955 Q1 →) | `QNA/ABMI 2026-09-29` |
| `real-gdp-per-head` | 2026-08-12 → **2026-09-29** | 2023 → **2024** (in series title) | 2026 Q2 | 10,234 → **10,692** £ | 322 (1946 Q1 →) | `QNA/IHXW 2026-09-29` |
| `business-investment` | 2026-08-12 → **2026-09-29** | 2023 → **2024** (not in title) | 2026 Q2 | 78,413 → **83,534** £m | 118 (1997 Q1 →) | `QNA/NPEL 2026-09-29` |
| `labour-productivity` | 2026-08-17 (unchanged) | index 2023=100 | 2026 Q1 | 100.1 (unchanged) | 221 | `PRDY/LZVB 2026-08-17` |

ONS `nextRelease` is **12 November 2026** for the three QNA series (tomorrow), and 17 Nov 2026 for LZVB.

## 3. Growth comparison (computed from the curated CSVs, old vs new)

| Series | Level ratio QNA/PN2 | 2026 Q2 QoQ (PN2 → QNA) | 2026 Q2 YoY (PN2 → QNA) | Growth since 2019 Q4 (PN2 → QNA) |
|---|---|---|---|---|
| ABMI | 1.027–1.045 | +0.42% → +0.53% | +1.17% → +1.37% | +6.26% → +6.21% |
| IHXW | 1.027–1.045 | +0.36% → +0.48% | +0.98% → +1.17% | +1.77% → +1.72% |
| NPEL | **0.951–1.080** | +1.66% → +1.75% | **+0.83% → +5.16%** | +12.88% → +12.69% |

- **ABMI and IHXW:** the level move is a near-uniform rebase from reference year 2023 to 2024. Growth barely changes (about 0.1–0.2 pp). Do not mix vintages in one level chart.
- **NPEL:** the ratio is not uniform across history, so the vintage changes the growth story. 2026 Q2 YoY is +5.2% on QNA against +0.8% on PN2. This is the evidence behind the policy decision.
- **IHXW QoQ/YoY** were not computed in the earlier handover; they are computed here from both CSVs.

## 4. Verification run by Economy

Run on 2026-11-11 with unrestricted network (HTTP 200):

```bash
uv run python -m economy.connectors.real_gdp
uv run python -m economy.connectors.real_gdp_per_head
uv run python -m economy.connectors.business_investment
uv run python -m economy.connectors.labour_productivity   # optional refresh: unchanged bytes
```

- Raw JSON SHA-256 equals `manifest.yaml` `raw_evidence.checksum_sha256` for all three.
- Raw↔curated recompute (independent loop over `quarters`): **0 mismatches** for ABMI (286), IHXW (322), NPEL (118).
- Manifest `source_url` now ends `/qna`; `raw_evidence.path` is `raw/2026-11-11/<cdid>_qna.json`; `official_release_date` is 2026-09-29.

## 5. Finding for Orchestrator / Validation: ONS zero placeholders in IHXW

ONS publishes `0` where a series has no data yet. The shared parser stores it as a real value, so the curated IHXW file has leading zeros:

| Vintage | Zero rows | Range | Blank (missing) rows |
|---|---|---|---|
| PN2 (old) | 28 | 1948 Q1 → 1954 Q4 | 8 (1946–1947) |
| QNA (new) | **36** | 1946 Q1 → 1954 Q4 | 0 |

- This predates the switch (PN2 already had 28 zeros). QNA fills the 8 blank quarters with zeros, so the curated count of zeros rises from 28 to 36.
- ABMI starts 1955 and NPEL starts 1997 and have no zeros.
- I did **not** change the shared parser (`ons_timeseries.py`): a blanket "0 → missing" rule would corrupt other series where 0 is a genuine value (for example some fiscal flows). The right fix is a per-spec `first_valid_period` (or similar) for IHXW. **Decision needed from Orchestrator.** Until then, treat IHXW rows before 1955 Q1 as invalid. Validation should flag them.

## 6. Docs and status updates

- READMEs updated: `real-gdp`, `real-gdp-per-head`, `business-investment` (dataset=QNA, new checksums and spot-checks). `labour-productivity/README.md` unchanged (PRDY).
- `business-investment/validation_report.md`: appended a switch note. The 2026-11-03 self-QA applies to PN2 bytes only.
- `data/qa/qa_report_real_gdp_2026-11-03.md` (Validation) was not edited. It covers the PN2 bytes (`a1265250…`) and needs a re-run on QNA.
- Notion Domain 05 page updated (see summary).

## 7. Summary table for Validation

| Indicator | CDID | Dataset | Raw path | Raw SHA-256 (first 16) | Release | Ref. year | Latest | Rows | Self-check |
|---|---|---|---|---|---|---|---|---|---|
| `real-gdp` | ABMI | **QNA** | `data/economy/real-gdp/raw/2026-11-11/abmi_qna.json` | `6ce4b868fc86af44` | 2026-09-29 | 2024 | 2026 Q2 = 744,453 | 286 | 0 mismatches |
| `real-gdp-per-head` | IHXW | **QNA** | `data/economy/real-gdp-per-head/raw/2026-11-11/ihxw_qna.json` | `7a03fd267fefc5fc` | 2026-09-29 | 2024 | 2026 Q2 = 10,692 | 322 (36 pre-1955 zeros) | 0 mismatches; zeros flagged |
| `business-investment` | NPEL | **QNA** | `data/economy/business-investment/raw/2026-11-11/npel_qna.json` | `09722c21c27a5d54` | 2026-09-29 | 2024 | 2026 Q2 = 83,534 | 118 | 0 mismatches |
| `labour-productivity` | LZVB | PRDY | `data/economy/labour-productivity/raw/2026-11-11/lzvb_prdy.json` | `0203bfc8991c4e31` | 2026-08-17 | 2023=100 | 2026 Q1 = 100.1 | 221 | unchanged |

Validation should re-run against QNA: checksum vs manifest, independent recompute, latest-quarter check against the ONS website, and the growth comparison in section 3. Best timing is after **12 Nov (GDP Q3 first estimate)** and **17 Nov (productivity)**. Both will change the data.

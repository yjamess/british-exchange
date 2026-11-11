# Handover — Economy Domain 05 re-pin (2026-11-11)

**Owner:** Economy · **Scope:** `src/economy/`, `data/economy/` only (no frontend)
**Notion:** [05 · Productivity & Economic Growth](https://app.notion.com/p/414654717685811a9435e45ebfe64a3b)
**Prior handover:** [handover-economy-05-growth.md](handover-economy-05-growth.md)

> **Status: Validation-ready, not Ready.** Economy does not set registry Ready.

## Headline

All four connectors ran clean at 2026-11-11 15:19 UTC (unrestricted network, HTTP 200).
**The re-pin was a no-op: ONS is still serving the same bytes.** Every raw JSON SHA-256 and
every curated CSV SHA-256 is identical to the previous pin. Only the manifest
`raw_evidence` path and `retrieved_at` moved (`raw/2026-11-03/` → `raw/2026-11-11/`).

Why nothing moved:

- **The PN2 landing is frozen at 2026-08-12.** Its JSON still says `nextRelease: "30 September 2026"`, a date that has already passed. ONS published that update into **QNA**, not PN2. PN2 will not advance while the connector defaults to it (Orchestrator decision: keep PN2 landing as source).
- **No Q3 first estimate yet.** ONS lists the next QNA/GDP release as **12 November 2026**, i.e. tomorrow. `LZVB` (PRDY) lists **17 November 2026**.
- **The live latest vintage is QNA 2026-09-29 (reference year 2024).** Evidence fetched read-only to `/tmp` this session (not pinned).

## 1. Old vs new checksums

| Indicator | Raw JSON SHA-256 (old = new) | Changed? | Curated CSV SHA-256 (old = new) |
|---|---|---|---|
| `real-gdp` (ABMI/PN2) | `a1265250cf820db23acee78d3ffbbe48ddd0ac3ca7a0aef4027332dbf0d3296d` | no | `6549c13a9beca571614ed1f540245861f8b38ec2d75df1bcd7d9cf8e09c14745` |
| `real-gdp-per-head` (IHXW/PN2) | `245f3fea0aebba90fe62b455c1b537bd21534641561810bce59e36cd1fbef97a` | no | `3a63e406510ed82345aec65693cca54583c774e4a22694498ff913178361c5ad` |
| `labour-productivity` (LZVB/PRDY) | `0203bfc8991c4e3162ea6e7183859f7e522a78978a508a99bbb70cb06b816f89` | no | `ca62b0605bd8707cdc5fc5e0a2bd93547d5712dfd6ca702a56072fa0083b71f1` |
| `business-investment` (NPEL/PN2) | `41125202c10b9399d436b59b1934cc7d061c099474d4e2de0ea0f038e6b86f7c` | no | `268138d738c1a01ea6c209fed4a786927566f6dbf1956b2e6afee9c9b1055ca3` |

## 2. Release dates, reference years, latest values, row counts

| Indicator | Release date (pinned) | ONS `nextRelease` | Reference / base year | Latest period | Latest value | Rows |
|---|---|---|---|---|---|---|
| `real-gdp` | 2026-08-12 | "30 Sep 2026" (stale; PN2 not updated) | 2023 (PN2); series title does not state it | 2026 Q2 | 712,545 £m | 286 (1955 Q1 → 2026 Q2) |
| `real-gdp-per-head` | 2026-08-12 | "30 Sep 2026" (stale) | **2023** (series title) | 2026 Q2 | £10,234 | 322 (1946 Q1 → 2026 Q2; 314 non-missing) |
| `labour-productivity` | 2026-08-17 | **17 Nov 2026** | Index **2023=100** (series title) | 2026 Q1 | 100.1 | 221 (1971 Q1 → 2026 Q1) |
| `business-investment` | 2026-08-12 | "30 Sep 2026" (stale) | not in title; PN2 = 2023 | 2026 Q2 | 78,413 £m | 118 (1997 Q1 → 2026 Q2) |

Raw JSON is now on disk at `data/economy/<indicator>/raw/2026-11-11/` (git-ignored by `data/**/raw/**`; Storage archive is the Orchestrator's job).

## 3. Did the vintage change meaningfully? (QNA 2026-09-29 vs pinned PN2)

Not re-pinned (PN2 stays the source). Compared read-only so Validation knows what a QNA switch would do.

| Series | 2026 Q2 PN2 → QNA | Level ratio (QNA/PN2) | Growth since 2019 Q4 (PN2 → QNA) | Q2 QoQ (PN2 → QNA) | Q2 YoY (PN2 → QNA) |
|---|---|---|---|---|---|
| ABMI | 712,545 → 744,453 | 1.027–1.045 (all 286 qtrs) | +6.26% → +6.21% | +0.42% → +0.53% | +1.17% → +1.37% |
| IHXW | 10,234 → 10,692 (ref yr 2024) | ≈1.045 | +1.77% → +1.72% | not computed | not computed |
| NPEL | 78,413 → 83,534 | **0.951–1.080** (non-uniform) | +12.88% → +12.69% | +1.66% → +1.75% | **+0.83% → +5.16%** |
| LZVB | no newer vintage; next release 17 Nov | n/a | n/a | n/a | n/a |

- **Real GDP and GDP per head: levels moved ~4.5% (reference-year rebase 2023 → 2024); growth is essentially unchanged** (< 0.2 pp over the long run, ~0.1–0.2 pp on the latest quarter). Use growth or a fixed-quarter index when mixing vintages.
- **Business investment is different: growth moved too.** The ratio is not uniform across history, so year-on-year growth for 2026 Q2 changes from +0.8% to +5.2%. A chart showing "business investment growth" would tell a different story on PN2 vs QNA. This is the strongest argument for a QNA/UKEA source decision (open question in the manifest).
- **Labour productivity** is unchanged until 17 Nov. Expect the 2023=100 base to possibly move then.

## 4. Changes made

- Connectors: **no code change** (all four ran as-is, default PN2/PRDY).
- Manifests: `raw_evidence` points at `raw/2026-11-11/`, `retrieved_at` updated. (The other manifest text edits in the working tree came from the earlier Wave A pass, not this one.)
- READMEs: `real-gdp` and `business-investment` updated; short READMEs added for `real-gdp-per-head` and `labour-productivity`. All say **Validation-ready after 2026-11-11 re-pin; not Ready**.
- `business-investment/validation_report.md`: appended a re-pin note. The 2026-11-03 Economy self-QA still applies because the bytes are identical.
- `business-investment` stays an Economy pipeline; **primary story home is Domain 09** and Domain 05 **Follows**.

## 5. Recommendation for Validation

- **Run now?** Yes for a basic pass: bytes are identical to what Validation or Economy self-QA already saw, so the checks are valid against `raw/2026-11-11/`.
- **Better to wait?** If Validation wants to certify the "latest" figures, it is better to run **after 12 Nov (GDP Q3 first estimate)** and **17 Nov (productivity)**. Both will change the data. `real-gdp` already has a pass-with-warns report on this exact PN2 vintage (`data/qa/qa_report_real_gdp_2026-11-03.md`).
- **Decision needed from Orchestrator:** PN2 never advances, so the connector will keep returning 2026-08-12 data unless it is pointed at QNA (or a fallback is added). That is source policy, so I made no change.

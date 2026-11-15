# Handover — Economy Domain 06 · Anatomy CG drill under MF6P (EC-G2-06B-DRILL)

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §C  
**Kickoff:** [agent-kickoff-economy-06-anatomy-cg-drill.md](agent-kickoff-economy-06-anatomy-cg-drill.md)  
**Discovery:** [economy-06-anatomy-source-matrix.md](economy-06-anatomy-source-matrix.md)  
**Parent Ready:** [tax-receipts-composition](handover-economy-06-anatomy-pin.md) (AHHY four heads) — **read-only**  
**Registry:** [Tax receipts CG composition (Anatomy drill under MF6P)](https://app.notion.com/p/41965471768581ceb258cd766de891cb) — Status **Validation**

> **Status:** Sibling CG pin complete. Economy self-QA **pass**. **Not Ready** until independent Validation `EC-VAL-06B-DRILL` PASS. No frontend this pass.

## Verdict (return to Orchestrator)

| Field | Value |
|-------|--------|
| **Indicator id** | `tax-receipts-cg-composition` |
| **Identity** | `NMBY + NMCU + LIQR = MF6P` |
| **Self-QA** | **pass** — 354 months exact (£0.01m); spot Jul/Aug/Sep 2026 |
| **MF6P total** | Pinned PUSF JSON + Ready `tax-receipts-composition` series=MF6P — **not forked** |
| **Parent package** | Ready four-head AHHY identity **untouched** |
| **Deeper leaves** | **Deferred** (LIBR / NZGF / CPRN) — first identity only |
| **Next** | Schedule Validation **`EC-VAL-06B-DRILL`**; UI stays EmptyStage until PASS |

### Identity spot (≥3 months)

| Period | NMBY | NMCU | LIQR | Sum | MF6P | Diff |
|--------|------|------|------|-----|------|------|
| 2026-07-01 | 31,702 | 48,323 | 2,609 | 82,634 | 82,634 | 0 |
| 2026-08-01 | 30,912 | 33,370 | 2,348 | 66,630 | 66,630 | 0 |
| 2026-09-01 | 31,454 | 32,087 | 2,741 | 66,282 | 66,282 | 0 |

Full check artefact: `data/economy/tax-receipts-cg-composition/curated/cg_identity_check.json`  
(`months_checked_ok=354`, `n_failed=0`, `months_skipped_incomplete=0`, `n_mf6p_ready_vs_pinned_mismatches=0`).

## Row counts

| Series | Curated rows | Source |
|--------|--------------|--------|
| NMBY | 405 | PUSF `/data` JSON (51 early missing) |
| NMCU | 354 | PUSF `/data` JSON |
| LIQR | 354 | PUSF `/data` JSON |
| **Total curated** | **1,113** | leaves only |

Statuses: **1,059 final + 3 provisional + 51 missing**. Provisional = latest valued month **per leaf** only (all three: 2026-09).

MF6P is **not** curated as a leaf — identity evidence only (pinned JSON + Ready composition).

## Paths written

```txt
src/economy/connectors/tax_receipts_cg_composition.py
data/economy/tax-receipts-cg-composition/
  manifest.yaml
  source_register.csv
  README.md
  validation_report.md
  raw/2026-11-15/
    appendix_d_public_sector_current_receipts.xlsx
    nmby_pusf.json
    nmcu_pusf.json
    liqr_pusf.json
    mf6p_pusf.json
  curated/
    observations.csv
    cg_identity_check.json
docs/handover-economy-06-anatomy-cg-drill.md   # this file
```

### Raw checksums (2026-11-15 pin)

| File | SHA-256 (prefix) | HTTP |
|------|------------------|------|
| `appendix_d_…xlsx` | `7a06b80fb26f…` | 200 |
| `nmby_pusf.json` | `9d8155937473…` | 200 |
| `nmcu_pusf.json` | `6e369dabf20c…` | 200 |
| `liqr_pusf.json` | `acdaf3c877f3…` | 200 |
| `mf6p_pusf.json` | `87ea045812bf…` | 200 |

Official release dates on JSON: **2026-10-20**. Appendix D workbook landing: **21 Oct 2026**. Next PSF: **20 Nov 2026**.

## Self-QA summary

| Check | Result |
|-------|--------|
| Identity on ≥3 months vs pinned MF6P | **pass** (354 months) |
| Pinned MF6P matches Ready composition | **pass** (0 mismatches) |
| Sep 2026 matches discovery matrix | **pass** (66,282) |
| Provisional latest only | **pass** (3 provisional = one per leaf) |
| Four-head AHHY package untouched | **pass** (read-only MF6P) |
| No HMRC cash / no invented residual | **pass** |
| Deeper leaves not half-shipped | **pass** (deferred) |

Reproduce:

```bash
uv run python -m economy.connectors.tax_receipts_cg_composition
```

## Validation ask — `EC-VAL-06B-DRILL`

Independent Validation should file under `data/qa/` and **not** silently rewrite Economy curated data.

| Check | Expectation |
|-------|-------------|
| **V1** | Identity `NMBY + NMCU + LIQR = MF6P` on ≥3 months from curated vs pinned MF6P |
| **V2** | Curated NMBY / NMCU / LIQR equal live PUSF `/data` (and Appendix D Time Series spot) |
| **V3** | Pinned MF6P equals Ready `tax-receipts-composition` series=MF6P on overlap |
| **V4** | Manifest caveats: accruals ≠ HMRC cash; sibling under MF6P; parent AHHY package not rewritten |
| **V5** | No HMRC cash series; no incomplete LIBR/NZGF/CPRN residual in this package |

**Out of scope until PASS:** Registry Ready; Anatomy CG UI drill; HMRC cash stack; second-depth leaves (LIBR / NZGF / CPRN).

## Blockers for Validation

| Item | Severity |
|------|----------|
| Independent `EC-VAL-06B-DRILL` not yet run | Process (expected) |
| Next PSF **20 Nov 2026** may revise recent months | Calendar — re-pin after release |
| Optional deeper leaves gated on Orchestrator | Product (not a blocker for this identity) |

## Do not (this wave)

- Edit `web/src/brand/**` or Anatomy React
- Mark Ready
- Touch Time Machine / Scotland work
- Rewrite `tax-receipts-composition`
- Mix HMRC cash under AHHY / MF6P

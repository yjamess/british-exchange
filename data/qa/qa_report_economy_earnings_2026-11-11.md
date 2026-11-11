# QA report — Economy earnings P1 (`nominal-earnings`, `real-earnings`) — 2026-11-11

**Agent:** Validation
**Overall verdict:** **pass-with-warns** (no fails)

| Indicator | Series | Verdict | Ready recommendation |
|-----------|--------|---------|----------------------|
| `nominal-earnings` | KAI7 / EMP | **warn** (GB labelled as UK) | **Ready, conditional** — UI and Notes must say **Great Britain** |
| `real-earnings` | A2FC / EMP | **warn** (GB labelled as UK) | **Ready, conditional** — same condition; Notes must say CPIH-deflated, 2015 prices |

## Scope

- Economy files (read only, none edited): `data/economy/nominal-earnings/` and `data/economy/real-earnings/` — `manifest.yaml`, `raw/`, `curated/observations.csv`; link-only `cpih-index`, `cpi-index` curated used for the deflator test
- Handover: `docs/handover-economy-02-wages.md`
- Registry: [nominal-earnings](https://app.notion.com/p/4146547176858139b68ae2c75df07043) · [real-earnings](https://app.notion.com/p/40d654717685814a998ad66b45808f8c)
- Official: ONS [KAI7/EMP](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kai7/emp), [A2FC/EMP](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/a2fc/emp), AWE QMI, "Average weekly earnings in Great Britain" bulletins (Jan 2026, Jun 2026, table 16 plus methodology text)

## Freeze

| Indicator | Raw path | Manifest SHA-256 | Observed SHA-256 | Match |
|-----------|----------|------------------|------------------|-------|
| `nominal-earnings` | `raw/2026-11-07/kai7_emp.json` | `c23b05e8873d568c…` | `c23b05e8873d568c7cab0dd7779b442e9370bb477b1705c544bf34d1634c7c98` | yes |
| `real-earnings` | `raw/2026-11-03/a2fc_emp.json` | `27a063a1b31cdcd3…` | `27a063a1b31cdcd3660407617943255f8954cb09e0724782ca06eac913a2dd4e` | yes |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| E1 | Raw SHA-256 equals manifest (both) | **pass** | See Freeze |
| E2 | Independent raw → curated recompute | **pass** | 320 months each (2000-01 → 2026-08), 0 mismatches, 0 extra rows, no blanks |
| E3 | Live ONS `/data` vs pin (2026-11-11, HTTP 200) | **pass** | Full-series diff = **0** for both; live `releaseDate` 2026-10-19, `nextRelease` 17 November 2026; `description.number` = 707 (KAI7) and 494 (A2FC) for 2026 AUG = curated latest |
| E4 | Sample vs published ONS bulletin table 16 (GB, whole economy, SA, regular pay) | **pass** | Compared 18 values (9 months × nominal/real) from the Jan 2026 and Jun 2026 bulletins: 15 match exactly (e.g. Aug 25 £682/£493; Apr 26 £697/£494; Apr 24 £642/£487). 3 differ by £1 only (Nov 23 nominal £626 vs £625; Feb 25 real £494 vs £493; Nov 25 real £495 vs £494). Consistent with later revisions and the annual seasonal-adjustment review (ONS flags it); curated equals the current ONS series |
| E5 | Continuity, duplicates, units, status | **pass** | Months contiguous, month-end `period_end`, `observation_status` = `provisional`, units "£ per week, SA, …(regular pay)", source_version `EMP/KAI7` / `EMP/A2FC 2026-10-19` |
| E6 | Pay-type definition | **pass** | KAI7 = SA regular pay excl. arrears (excludes bonuses); A2FC = SA regular pay real terms. Not total pay (KAB9 / A3WX are not ingested). Manifest caveats state this |
| E7 | Deflator confirmation | **pass** | ONS bulletin table 16 note 3: "Estimates of real earnings are calculated by deflating the nominal earnings estimates by … CPIH". Method text: NSA AWE ÷ CPIH (L522), referenced 2015 = 100, then seasonally adjusted. A2FC is "earnings at constant 2015 prices". Our test agrees: `KAI7 ÷ (L522/100)` vs A2FC mean abs error £1.36 (max £3.69, 320 months); using CPI D7BT instead is worse (mean £3.85, max £11.01). The £1.4 gap is explained — ONS deflates the unadjusted series before SA, so A2FC is not exactly reproducible from the SA series. Use A2FC as published |
| E8 | **Geography — Great Britain vs United Kingdom** | **warn** | ONS AWE (Monthly Wages and Salaries Survey) covers **Great Britain**, excludes Northern Ireland, self-employed, HM Forces (AWE QMI: "Geographic coverage: Great Britain"; bulletin: "Average weekly earnings in Great Britain"). All 320 curated rows of each series carry `K02000001` / "United Kingdom". Manifest text reads "Great Britain / UK … coded K02000001 for spine". **Values equal ONS, so this is not a fail**; it is a labelling defect. Notion `Geography` (real) says "United Kingdom / GB AWE". Open defect already logged by Economy (handover) |
| E9 | Real vs nominal consistency | **pass** | Aug 2026 £707 nominal; £494 real (2015 prices); YoY nominal +3.67%, real +0.20% (Aug 2025: £682 / £493); real peak £497 (Jun 2026); CPIH latest common month Sep 2026 vs AWE Aug 2026 — pair on Aug |
| E10 | Registry hygiene | **warn** | `nominal-earnings` manifest `notion_registry_url` is empty; `real-earnings` registry row is Ready but its checklist is unticked, Evidence/output empty; both rows show Ready without a prior domain QA — this report is that QA. **Owner: Orchestrator** |
| E11 | Revision exposure | **warn** | Next ONS release **17 Nov 2026**; pins are one release stale after that. Re-pin and re-run E3/E4 then |
| E12 | Postgres/API parity (handover item e) | **not run** | Out of scope for this task (pin QA only). Notion row for nominal reports cloud verified 2026-11-10; Orchestrator to confirm real-earnings |
| E13 | Independence — no silent rewrite | **pass** | Validation did not edit any `data/economy/` or `src/economy/` file |

## Geography defect — conditions for any Ready

Validation recommends Ready **only if** all of these hold; otherwise keep the rows in Validation:

1. **Every UI surface** that shows KAI7 or A2FC labels the geography as **Great Britain** (title/subtitle, source line, tooltip) — never "UK" or "United Kingdom".
2. **Notes / registry text** says AWE is Great Britain; excludes Northern Ireland, self-employed and HM Forces; regular pay only (no bonuses or arrears); average per employee, affected by workforce composition.
3. Any chart or panel pairing AWE with UK series (`cpih-index`, `cpi-index`, `cpi-inflation`, `employment-rate`, `economic-inactivity-rate`) shows a **geography-break chip** ("earnings: GB; prices/labour rates: UK").
4. Real-terms notes state "deflated by CPIH, 2015 prices (ONS A2FC as published)". Do not call a self-deflated KAI7 ÷ CPI line `real-earnings`.

**Proper fix (Economy, needs Orchestrator approval):** per-spec GB override (`K03000001`, "Great Britain") on `NOMINAL_EARNINGS` / `REAL_EARNINGS`, re-ingest, reload cloud, then check the Energy prices model, which reads both series. This changes observation identity hashes (see `qa_observation_identity_hash_2026-11-10.md`). Do not edit the curated data by hand.

## Summary

- Pass: 9 · Warn: 3 (E8, E10, E11) · Fail: **0** · Not run: 1 (E12)
- Blockers: none for a **conditional** Ready; the GB label must be enforced by UI/Notes (above)
- Recommended fixes (owner):
  1. **Orchestrator** — approve GB geography override; **Economy** implements and re-ingests; **Energy** confirms prices-model join is unaffected.
  2. **Economy** — re-pin both series after 17 Nov; refresh `notion_registry_url` in `nominal-earnings` manifest.
  3. **Orchestrator** — tick the `real-earnings` registry checklist and add Evidence/output pointing to this report.
- **Recommendation to Orchestrator (Validation does not flip Notion status):** both **Ready, conditional on GB labelling**.

## Orchestrator follow-up (2026-11-11, same day)

- **Geography override applied:** `NOMINAL_EARNINGS` / `REAL_EARNINGS` now emit `K03000001` / `Great Britain`; offline re-curate from existing EMP pins (320 months each).
- Energy Prices affordability joins earnings **by calendar year**, not geography code — join remains valid.
- Fallback meta in `web/src/brand/energy/load.ts` updated to `Great Britain (K03000001)`.
- **Ready flips:** both series Ready with GB caveats on the registry rows.

## Reproduce

```bash
cd data/economy
shasum -a 256 nominal-earnings/raw/2026-11-07/kai7_emp.json real-earnings/raw/2026-11-03/a2fc_emp.json
curl -sS 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/a2fc/emp/data' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['description']['releaseDate'], d['description']['nextRelease'], len(d['months']), d['months'][-1])"
# Deflator test: KAI7 / (L522/100) vs A2FC across 320 months — mean abs error 1.36; CPI D7BT: 3.85
```

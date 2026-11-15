# Handover — Economy Domain 06 · Scotland income-tax bands 2017–18…2022–23

**Author:** Economy domain subagent · **Date:** 2026-11-15  
**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §E  
**Kickoff:** [agent-kickoff-economy-06-scotland-bands.md](agent-kickoff-economy-06-scotland-bands.md)  
**Extends:** [handover-economy-06-timemachine.md](handover-economy-06-timemachine.md) (`tax-machine-income-tax-history`)  
**Work plan:** `EC-G2-06E-SCOT`  
**Scope:** Scotland (`S92000003`) bands + reserved UK PA for **2017–18…2022–23**. **No frontend.** NICs out of scope this pass.

> **Status:** Economy self-QA **pass**. **Validation-ready, not a Ready flip.**  
> Same indicator id — do not fork. Do not mark Registry Ready for this fill until independent Validation files a PASS under `data/qa/` (`EC-VAL-06E-SCOT`).

**Question:** Can we fill the labelled Scotland gap years 2017–18…2022–23 with official after-allowance band tables — without inventing rates or silently copying E/W/NI?

---

## Outcome

| Year | Status | Band structure | PA (UK reserved) |
|------|--------|----------------|------------------|
| 2017–18 | **filled** | 3 bands (basic 20% / higher 40% / additional 45%); HRT £43,000 | £11,500 |
| 2018–19 | **filled** | 5 bands (starter 19% … top 46%); HRT £43,430 | £11,850 |
| 2019–20 | **filled** | 5 bands; HRT £43,430 | £12,500 |
| 2020–21 | **filled** | 5 bands; HRT £43,430 | £12,500 |
| 2021–22 | **filled** | 5 bands; HRT £43,662 | £12,570 |
| 2022–23 | **filled** | 5 bands; HRT £43,662 | £12,570 |

**Still gapped:** none of the six kickoff years.  
**Never copied E/W/NI** for these years (2017–18 basic upper £31,500 ≠ E/W/NI £33,500; 2018–19+ five-band / 41%–46% diverge).

---

## Indicator (unchanged id)

| Field | Value |
|-------|--------|
| Indicator id | `tax-machine-income-tax-history` |
| Package folder | `data/economy/tax-machine-income-tax-history/` |
| Connector | `economy.connectors.tax_machine_income_tax_history` |
| Coverage status (Scotland) | `pinned_govscot_hmrc_sit` for 2017–18…2022–23 |
| Licence | Open Government Licence v3.0 |
| Retrieved | 2026-11-15 (raw folder `raw/2026-11-15/` — Scotland HTML + prior HMRC ODS/GOV.UK) |

---

## After-allowance mapping (documented)

gov.scot / HMRC SIT publish **gross** income ranges assuming standard UK PA. Curated tables use the same after-allowance convention as the Ready pin / HMRC employers pages:

- Starter / basic / intermediate uppers = gross upper − PA; next lower = previous upper + 1; first band lower = 0.
- Higher upper / top lower keep the absolute £150,000 / £150,001 (PA taper — matches HMRC employers 2018–19 / 2020–21 and 2021–22 Scottish Rate Resolution rate limits).

Spot checks:

| Year | Curated check | Official cross-check |
|------|---------------|----------------------|
| 2018–19 | starter 0–2000; intermediate …31580; higher 41% | HMRC employers 2018–19; gov.scot 2018–2019 |
| 2020–21 | starter 0–2085; intermediate …30930 | HMRC employers 2020–21; HMRC SIT 2021 |
| 2021–22 | starter …2097; basic …12726; intermediate …31092 | SRR explanatory note rate limits |

Personal Allowance for Scotland rows remains **HMRC Table A.1** (reserved UK PA); gov.scot footnotes state PA is set by the UK Government.

---

## Sources pinned (raw + SHA256)

| File | Role |
|------|------|
| `sco_2017_18_govscot.html` | gov.scot news — 2017–18 rates/bands |
| `sco_2018_19_govscot.html` | gov.scot — 2018–19 rates/bands |
| `sco_hmrc_sit_2019.html` | HMRC SIT annual report 2019 — 2017–19 annex tables |
| `sco_hmrc_sit_2020.html` | HMRC SIT 2020 — 2019–20 table |
| `sco_hmrc_sit_2021.html` | HMRC SIT 2021 — 2020–21 table |
| `sco_2020_21_govscot.html` | Scotland Act implementation report — 2020–21 / 2021–22 |
| `sco_2021_22_budget.html` | Scottish Budget 2021–22 Tax chapter |
| `sco_2022_23_govscot.html` | gov.scot rates-and-bands 2022–23 |
| `sco_hmrc_sit_2023.html` | HMRC SIT 2023 — 2022–23 table |
| `employers_2018_19.html` | after-allowance cross-check |
| `employers_2020_21.html` | after-allowance cross-check |

Checksums: `data/economy/tax-machine-income-tax-history/raw/2026-11-15/SHA256SUMS`.

Reproduce:

```bash
uv run python -m economy.connectors.tax_machine_income_tax_history
```

---

## Self-QA (Economy)

Overall: **pass** (`validation_report.md` / `curated/self_qa.json`).

New / updated checks include:

- Scotland 2017–22 filled (`pinned_govscot_hmrc_sit`); no remaining gap years in span  
- 2018–19 / 2020–21 / 2021–22 spot figures vs employers / SRR  
- Scotland ≠ E/W/NI for 2018–19 (starter band + higher 41% vs 40%)  
- Prior checksum / PA / Ready-pin / NICs / fiscal-drag checks still pass  

---

## Validation ask — `EC-VAL-06E-SCOT`

**Task:** Independently recompute ≥3 of the six filled years from curated after-allowance tables vs pinned raw gov.scot / HMRC SIT HTML; file pass/fail under `data/qa/`.

Suggested checks:

1. Manifest `raw_evidence` checksums ↔ Scotland HTML files on disk.  
2. Recompute after-allowance for **2018–19**, **2020–21**, **2022–23** (and optionally **2017–18**, **2021–22**) from pinned gross tables + PA.  
3. Confirm **no silent E/W/NI fill** (e.g. 2017–18 Scotland basic upper £31,500 ≠ E/W/NI £33,500; 2018–19 five bands / 41%–46%).  
4. Confirm PA for Scotland rows matches HMRC A.1 / gov.scot “Standard UK Personal Allowance” footnotes.  
5. Confirm coverage inventory shows `pinned_govscot_hmrc_sit` for 2017–22 (not `gap_awaiting_clean_pin`).  
6. No frontend / Ready claim for this fill alone; fiscal drag still deferred.

### Blockers for Validation

- None for Economy self-consistency on the six years.  
- Independent Validation must still run (`EC-VAL-06E-SCOT`).  
- UI refresh of Time Machine Scotland gap copy is **Orchestrator / out of scope** for this Economy pass.

---

## Notion

- **Registry (note only — do not flip Ready):** https://app.notion.com/p/4196547176858177bf79d15680c0c264  
- Domain 06: Scotland 2017–22 gap closed in history package; Validation ask queued.

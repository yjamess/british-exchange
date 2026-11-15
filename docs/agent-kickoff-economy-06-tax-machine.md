# Kickoff — Economy Domain 06 · The Tax Machine (statute pin)

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc)  
**Parent handover:** [handover-economy-06-tax.md](handover-economy-06-tax.md)  
**Prior kickoff:** [agent-kickoff-economy-06-tax.md](agent-kickoff-economy-06-tax.md)  
**Work plan:** `EC-G2-06C`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15 · Wave B deepen  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Through what verified rules does a taxable activity lead to a calculated statutory liability — for one scoped scenario?

**Experience:** **The Tax Machine** — signature concept; currently EmptyStage on `/economy?domain=tax&view=machine`. Educational illustration, **not** tax advice.

## Non-negotiables

- **No frontend / no calculator UI.** Evidence pin + rule tables + worked examples only.
- **Jurisdiction explicit.** Do not silently apply England/Wales/NI rules to all UK taxpayers. Scotland income-tax rates/bands are separate when income tax is in scope.
- **Dated pins.** Every rate, threshold, allowance must cite tax year, publisher URL, retrieval date, and licence.
- **No invented rate histories.** If a year is missing, leave a gap.
- Do not present modelled liability as observed population tax paid.
- Distinguishing **statutory incidence** vs economic incidence in Notes.
- Do not touch `web/src/brand/economy/**`.

## Scope for this pass (keep small)

Pin **one** primary scenario set so Validation can check arithmetic:

| Field | Locked for EC-G2-06C |
|-------|----------------------|
| Tax | **Income tax** (PAYE-style band calculation) + optional **employee Class 1 NICs** as a **separate** stage (not blended into one “tax rate”) |
| Tax years | **Current + one prior** (document which; prefer 2025–26 and 2024–25 if published) |
| Jurisdictions | **England/Wales/NI** full bands; **Scotland** as a labelled alternate table (same years if published) |
| Scenario type | Hypothetical taxable income only (no benefits, no pensions relief, no marriage allowance, no student loan) — list exclusions explicitly |

## Sources of truth (verify, then pin)

- GOV.UK [Income Tax rates and allowances](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past)
- GOV.UK NICs rates / thresholds pages for the same years
- Scottish income tax rates (Revenue Scotland / GOV.UK) for the same years
- legislation.gov.uk only when needed to resolve a conflict — cite both

## Deliverables (this task)

1. **Package** under `data/economy/tax-machine-rules/` (or similar id you justify):
   - `manifest.yaml` (shared contract fields; indicator id proposal e.g. `tax-machine-income-tax-rules`)
   - `raw/` snapshots (HTML/PDF/JSON as retrieved) + checksums
   - `curated/` machine-readable tables: tax_year, jurisdiction, band/threshold/allowance rows, NIC rows if included
   - `README.md` + `validation_report.md` (self-QA)
   - Connector or documented procedure under `src/economy/` (prefer small reproducible script)
2. **Worked examples** — at least **3** hypothetical incomes × (E/W/NI) and **1** Scottish contrast, with step-by-step statutory liability matching GOV.UK examples or your documented arithmetic. Put in `curated/worked_examples.json` (or csv) + human-readable note.
3. **Safety copy** — one paragraph for future Notes: “not tax advice”; exclusions list; Scotland separate.
4. **Notion** — Phase 2 Tax Machine: mark statute pin in progress/complete for this narrow scope; UI still planned-not-ready.
5. **Handover** — `docs/handover-economy-06-tax-machine.md` with Validation ask (`EC-VAL-06C`).

## Do not

- Ship React Tax Machine or replace EmptyStage.
- Claim Ready — stop at Validation-ready.
- Model corporation tax, VAT, CGT, or council tax in this pass.
- Merge employee + employer NICs into one “worker tax” figure.

## Done means

Independent Validation can recompute your worked examples from curated tables alone and file pass/fail under `data/qa/`.

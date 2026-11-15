# Kickoff — Economy Domain 06 · Scotland income-tax bands 2017–18…2022–23

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §E  
**Extend Ready package:** `tax-machine-income-tax-history` · [handover-economy-06-timemachine.md](handover-economy-06-timemachine.md)  
**Live UI (Orchestrator later):** `/economy?domain=tax&view=timemachine`  
**Work plan:** `EC-G2-06E-SCOT`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/tax-machine-income-tax-history/` (+ connector) only  
**Opened:** 2026-11-15  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** Can we fill the labelled Scotland gap years 2017–18…2022–23 with official after-allowance band tables — without inventing rates or silently copying E/W/NI?

## Non-negotiables

- **No frontend.** Extend curated history + raw pins + self-QA only.
- **No invented bands.** If a year lacks a clean official table, leave that year as gap and document the blocker.
- **Scotland ≠ rUK** — never fill from E/W/NI for these years.
- Extend the **existing** indicator `tax-machine-income-tax-history` (same connector family). Do not fork a second history id.
- Personal Allowance for Scotland in these years: pin from the same official source family as bands (or document shared UK PA if that is what the source states).
- Employee Class 1 NICs are **out of scope** this pass (already UK-wide in the package).

## Scope

| Field | Locked |
|-------|--------|
| Years | **2017–18, 2018–19, 2019–20, 2020–21, 2021–22, 2022–23** |
| Geography | Scotland (`S92000003`) only for new rows |
| Content | Income-tax bands (starter/basic/intermediate/higher/top as published each year) + PA if published |

## Sources (verify, then pin)

Prefer dated official tables (pin HTML/PDF/ODS + checksums):

- Revenue Scotland / gov.scot Scottish Income Tax rates & bands by year
- GOV.UK Income Tax rates pages that explicitly tabulate Scotland for those years
- HMRC Scottish Income Tax bulletins / annual reports if they publish band tables
- legislation.gov.uk only to resolve conflicts — cite both

Manifest already notes: *“Pin Scotland 2017–18…2022–23 from gov.scot / HMRC SIT annual reports?”*

## Deliverables

1. Raw snapshots under `data/economy/tax-machine-income-tax-history/raw/<retrieval-date>/` (+ SHA256SUMS).
2. Update curated `income_tax_bands.csv` / `allowances.csv` / `observations.csv` / coverage inventory — gap years become published rows **or** remain explicit gaps with documented reason.
3. Re-run / refresh Economy self-QA; update `validation_report.md` + README.
4. Short handover addendum: `docs/handover-economy-06-scotland-bands.md` + Validation ask `EC-VAL-06E-SCOT`.
5. Notion registry note on existing history row (still Validation until independent PASS — do not claim Ready yourself).

## Do not

- Edit `web/src/brand/economy/**`.
- Touch fiscal-drag files beyond noting Scotland fill is separate.
- Edit Energy / other Economy packages.
- Mark Ready or replace Time Machine UI.

## Done means

Validation can recompute ≥3 of the six gap years from curated tables vs pinned raw official sources. Any year still gapped has a written blocker.

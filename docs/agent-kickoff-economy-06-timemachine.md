# Kickoff — Economy Domain 06 · The Tax Time Machine (evidence pin)

**Notion plan:** [06 · Taxation & Revenue](https://app.notion.com/p/414654717685816bb414e87ccbd501fc) §E  
**UI (later):** `/economy?domain=tax&view=timemachine` — EmptyStage today  
**Related Ready pin:** `tax-machine-income-tax-rules` (2025–26 + 2026–27 only) — **extend, do not fork**  
**Work plan:** `EC-G2-06E`  
**Owner:** Economy · **Paths:** `src/economy/`, `data/economy/` only  
**Opened:** 2026-11-15  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

**Question:** How have income-tax (and related) rates, allowances and thresholds changed over time — and can fiscal drag be shown with explicit assumptions?

## Non-negotiables

- **No frontend / no fiscal-drag calculator UI.** Evidence archive + worked counterfactual tables only if fully documented.
- **No invented rate histories.** Missing years = gaps.
- **Scotland ≠ rUK** — labelled alternate tables always.
- Prefer extending `tax-machine-income-tax-rules` or a sibling id (e.g. `tax-machine-income-tax-history`) that links the Ready pin — one connector family if possible.
- Employee Class 1 NICs stay a **separate** stage if included.
- Fiscal-drag demo (optional this pass): only with a verified earnings measure, tax year, and counterfactual assumptions written down. Prefer **inventory + one small worked example set** over a full UI model.

## Scope for this pass (keep bounded)

| Field | Locked |
|-------|--------|
| Tax | Income tax bands + Personal Allowance (+ optional employee Class 1 NICs as separate stage) |
| Years | Extend backward as far as **GOV.UK published tables** support with clean pins (target: at least back through **2010–11** or document the earliest clean year) |
| Jurisdictions | E/W/NI + Scotland where published for each year |

## Sources

- GOV.UK Income Tax rates and allowances (current and past)
- GOV.UK NICs rates / employers thresholds pages by year
- Scottish Income Tax pages by year
- legislation.gov.uk only to resolve conflicts — cite both

## Deliverables

1. Extended package (new or update existing) under `data/economy/` with raw HTML/PDF snapshots + checksums per year sourced.
2. Curated machine-readable history tables + README + self-QA.
3. Optional: `curated/fiscal_drag_examples.json` with ≤3 hypothetical profiles and explicit assumptions — or document “fiscal drag deferred”.
4. `docs/handover-economy-06-timemachine.md` + Validation ask `EC-VAL-06E`.
5. Notion registry + Domain 06 Phase 4 notes. Status **Validation**.

## Do not

- Replace EmptyStage or build Time Machine React.
- Silently apply E/W/NI rates to Scotland.
- Invent freezes or rates not on the pin.

## Done means

Validation can recompute a sample of historical years from curated tables vs raw GOV.UK snapshots.

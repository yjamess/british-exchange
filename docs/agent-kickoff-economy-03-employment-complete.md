# Kickoff — Economy Domain 03 Employment · complete remaining experiences

**Notion plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Prior handover:** [handover-economy-03-employment.md](handover-economy-03-employment.md)  
**Prior kickoff:** [agent-kickoff-economy-03-employment.md](agent-kickoff-economy-03-employment.md)  
**Work plan:** EC-G2-03b  
**Wave:** B · **Owner:** Economy · **Paths:** `src/economy/`, `data/economy/`  
**Opened:** 2026-11-14

Orchestrator decision: **finish Domain 03 before other Economy work.** Tax/Spending polish and Wave C wait.

## Already shipped (do not re-litigate)

Flagship **The British Workforce** + Rates + Data are G3 live (LF2G/LF2I/LF2M/LF24/LF2S/LF2Q Ready + cloud). Re-pin those six only if a newer LMS than 2026-10-19 is out (next was **17 Nov 2026**).

## Goal

Close the domain’s six experiences as far as official evidence allows:

| Experience | Target this pass |
|------------|------------------|
| **Outside the Workforce** | **Must ship evidence** — ingest matched reason **levels** (thousands, UK 16–64 SA) that reconcile to LF2M; registry → Validation |
| **What Britain Does for Work** | Ingest national industry and/or occupation employment if official series found; else document Blocked with URLs. **Link** Energy manufacturing — never fork |
| **The Working Week** | Ingest hours / FT–PT / underemployment if official series found; else Blocked with CDIDs TBD |
| **The Demand for Labour** | Ingest Vacancy Survey headline(s) if clear after Oct 2026 processing note; else Blocked |
| **The Geography of Employment** | Prefer **national regional rates** from ONS/APS only if ownership does not collide with Regions. If Regions owns local atlas, leave **planned-not-ready** with labelled gap — do not build LA map |

## Non-negotiables

- No React / no `web/` in this pass (Orchestrator owns G3 after Validation).
- Reasons must be **official levels** on the same basis as LF2M — do not invent shares from % series that do not sum.
- No fabricated person-flows between reason categories.
- Claimant Count ≠ ILO unemployment.
- Do not fork Energy `manufacturing-employment` / BRES / mfg productivity under `data/economy/`.
- Prefer LMS / ONS timeseries JSON via existing `OnsSeriesSpec` / `labour_prices_series` patterns ([uv](https://docs.astral.sh/uv/), type hints).

## Outside the Workforce — evidence gate

1. Open [INAC01 SA](https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/economicinactivity/datasets/economicinactivitybyreasonseasonallyadjustedinac01sa) + LMS reason CDIDs.
2. Pin a **reason pack** of level series (000s SA, 16–64) covering principal reasons (student, long-term sick, looking after family/home, retired, other / discouraged as published).
3. Prove reconciliation: sum of reason levels ≈ LF2M for latest overlapping period (allow published rounding).
4. Registry rows (Ingesting → hand Validation). Packages under `data/economy/` with manifests, checksums, provisional = latest month only.
5. Gap note if a published category is % of inactive only and has no level twin — do not invent levels from rates × LF2M unless ONS publishes that product.

## Deliverables

1. Ingested packages + connectors for every series that clears the gate.
2. Updated handover: `docs/handover-economy-03-employment-complete.md` (or append section to prior handover).
3. Notion Domain 03 experience states updated.
4. Status note under EC-G2-03b in `docs/work-plan.md`.
5. Explicit list: Ready-for-Validation IDs · Blocked IDs with reason · recommended Validation task name (`EC-VAL-03-INAC` etc.).

## Do not

- Ship EmptyStage UI yourself.
- Mix 16+ and 16–64 without a geography/age break chip in the handover requirements.
- Treat vacancies as hires or claimant counts as ILO unemployment.

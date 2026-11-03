# Energy agent kickoff

**Assigned by:** Orchestrator  
**Date:** 2026-11-03  
**Contract:** [connector-contract.md](connector-contract.md)  
**Sector page:** [Energy & Industry](https://app.notion.com/p/40d6547176858194bc18cec7be0a812d)  
**Skill:** `.cursor/skills/energy-agent/SKILL.md`

## Your first (and only) indicator until Ready

| Field | Value |
|-------|--------|
| Registry | [Electricity generation by source](https://app.notion.com/40d65471768581839535dd21683f6238) |
| `indicator_id` | `electricity-generation-by-source` |
| Publisher | DESNZ |
| Suggested start | [Energy Trends](https://www.gov.uk/government/collections/energy-trends) |
| Work-plan tasks | **T03** (scope) then **T04** (ingest) |
| Paths | `src/energy/`, `data/energy/electricity-generation-by-source/` |

## Do now (T03)

1. Read `docs/brief.md` + `docs/connector-contract.md`
2. Find the authoritative historical electricity generation-by-fuel series (table ID, geography UK vs GB, units, frequency)
3. Update the Notion registry row: Source URL, Series ID, Geography, Frequency, Licence / caveats, Agent / owner = `energy`, Status → `Scoping` then `Sourcing`
4. Create `data/energy/electricity-generation-by-source/README.md` with scoping notes (no fake curated numbers)

## Then (T04) — only after T03 fields are filled

1. Implement `src/energy/connectors/electricity_generation.py` subclassing `britain_exchange.Connector`
2. Fetch raw → transform → `write_hand_off`
3. Status → `Ingesting` then hand to Validation (**T05**)

## Do not

- Start other Energy registry rows yet
- Touch `src/economy/` or `data/economy/`
- Mark Ready yourself

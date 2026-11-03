# Economy agent kickoff

**Assigned by:** Orchestrator  
**Date:** 2026-11-03  
**Contract:** [connector-contract.md](connector-contract.md)  
**Sector page:** [Economy & Public Finance](https://app.notion.com/p/40d65471768581419ceaefe6dec32ba2)  
**Skill:** `.cursor/skills/economy-agent/SKILL.md`

## Your first indicator (parallel scoping — Energy remains P0 for e2e)

| Field | Value |
|-------|--------|
| Registry | [Real GDP](https://app.notion.com/40d6547176858109b56fe01fb94ff2eb) |
| `indicator_id` | `real-gdp` |
| Publisher | ONS |
| Suggested start | [ONS developer API](https://developer.ons.gov.uk/) |
| Work-plan task | **T06** (scope one P0 indicator) |
| Paths | `src/economy/`, `data/economy/real-gdp/` |

You may **scope and fill registry metadata now**. Hold bulk download/transform until Energy’s first slice proves the contract (**after T04/T05**), unless Orchestrator explicitly advances you.

## Do now (T06)

1. Read `docs/brief.md` + `docs/connector-contract.md`
2. Identify the exact ONS Real GDP series (dataset ID, geography, SA/NSA, chained volume / index, frequency)
3. Update Notion registry: Source URL, Series ID, Geography, Frequency, Licence / caveats, Agent / owner = `economy`, Status → `Scoping` then `Sourcing`
4. Create `data/economy/real-gdp/README.md` with scoping notes
5. Draft connector stub under `src/economy/connectors/` only if helpful — do not invent curated values

## Do not

- Ingest all Economy P0 rows at once
- Re-ingest Energy DESNZ series — link registry IDs instead
- Touch `src/energy/` or `data/energy/`
- Mark Ready yourself

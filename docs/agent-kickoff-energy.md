# Energy agent kickoff — Layer C

**Assigned by:** Orchestrator  
**Date:** 2026-11-03  
**Contract:** [connector-contract.md](connector-contract.md)  
**Sector page:** [Energy & Industry](https://app.notion.com/p/40d6547176858194bc18cec7be0a812d)  
**Skill:** `.cursor/skills/energy-agent/SKILL.md`

## Proven Ready (do not re-ingest unless revisions)

| Field | Value |
|-------|--------|
| Registry | [Electricity generation by source](https://app.notion.com/40d65471768581839535dd21683f6238) |
| `indicator_id` | `electricity-generation-by-source` |
| Paths | `src/energy/connectors/electricity_generation.py`, `data/energy/electricity-generation-by-source/` |

## Current assignment (one indicator until Ready)

| Field | Value |
|-------|--------|
| Registry | [Primary energy production](https://app.notion.com/40d654717685819db323cce12ec97c72) |
| `indicator_id` | `primary-energy-production` |
| Publisher | DESNZ |
| Series | **ET 1.1** Indigenous production of primary fuels |
| Landing | [Energy Trends: UK total energy](https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends) |
| Paths | `src/energy/`, `data/energy/primary-energy-production/` |
| Status | Scoping (fields filled 2026-11-03) |

## Do now

1. Pin latest ET 1.1 XLSX under `data/energy/primary-energy-production/raw/YYYY-MM-DD/` with checksum.
2. Confirm unit (Mtoe/ktoe), Total vs fuel rows, period columns; note nuclear / primary-electricity conventions.
3. Registry → `Sourcing` then `Ingesting`; implement `src/energy/connectors/primary_energy_production.py`.
4. Hand off to Validation — **do not mark Ready**.

## Do not

- Start other Energy Inbox rows (gas production, imports, industrial prices, manufacturing*) yet
- Touch `src/economy/` or `data/economy/`
- Sum aggregate Total rows with fuel components in charts (reuse aggregation rules if needed)

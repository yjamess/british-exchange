# Kickoff — Domain 04 Oil, Gas & Fossil Fuels

**Updated:** 2026-11-09  
**Owner:** Energy (Fossils lane) + Orchestrator (UI)  
**Mode:** **complete** (Gate 4 passed 2026-11-09) — [gate4-audit-fossils.md](gate4-audit-fossils.md)

## Locked question

Where did Britain's fossil fuels come from, what was extracted, and how did domestic production change?

## Shipped

| Piece | Path / view |
|-------|-------------|
| Extraction Century | `view=extraction` — crude Mt · gas **bcm** · coal Mt · oil-equivalent energy at the end (fuels tab folded in) |
| North Sea fields | `view=northsea` — NSTA fields on Britain’s coast + shelf outline; ceased via Status = ceased; gas in bcm |
| Production Gap | `view=gap` — shared start years · line leaders · dependency figure + Follow → Imports Resilience (no duplicate chart) |
| What's left | `view=reserves` — year control; 2P and extraction on **separate** charts |
| Data | `view=data` — Series control + archive tables; gas in bcm |
| New series | `nsta-field-production` · `uk-oil-gas-reserves` (Ready after QA) |

## Reuse (link, do not fork)

`domestic-gas-production` · `primary-energy-production` · `historical-coal-production` · `nsta-ukcs-fields` · `nsta-ukcs-licences` · `energy-imports-and-exports` · `energy-import-dependency` · `oil-imports-by-country`

## Unit lock (publisher native)

| Series | Unit on Fossils UI |
|--------|-------------------|
| Crude / coal / oil imports | Mt (million tonnes) |
| UK / field gas | bcm (from published GWh where converted — method note says so) |
| Fossil fuels as energy / trade beside production | Mtoe (oil-equivalent) |
| Import dependency figure | % (ET 1.3) — full chart on Imports › Resilience |

Never plot Mt · bcm · Mtoe · % on one unmarked axis. Gas GWh→bcm conversion is Fossils-only display; Imports gas trade stays GWh.

## Backlog (not Gate 4)

BGS coalfields · NSTA NDR wells · DUKES F.1 NGL · long-form editorial

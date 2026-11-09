# Gate 4 — Energy Domain 01 structural + editorial audit — 2026-11-06

## Scope
- Domain: Electricity Generation (`/energy?domain=generation`)
- Views: Changing Current · Compare · Capacity ≠ Electricity · Renewables atlas · A Year in Power · Data
- Reference: Housing Explorer stage rules (`.cursor/rules/explorer-stage.mdc`); `docs/visual-identity.md`

## Series checklist
| Indicator | Status | QA |
|-----------|--------|-----|
| `electricity-generation-by-source` | Ready | prior (ET 5.1) |
| `electricity-generation-long-run` | Ready (UI) | prior long-run QA |
| `electricity-capacity-by-technology` | Ready | `qa_report_electricity_capacity_2026-11-06.md` |
| `gb-generation-mix-half-hourly` | Ready | `qa_report_gb_generation_mix_2026-11-06.md` |
| `renewable-energy-planning-operational` | Ready | `qa_report_renewable_energy_planning_2026-11-06.md` |

## Structural checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| S1 | All six views HTTP 200 | **pass** | current, compare, capacity, atlas, year, data |
| S2 | API serves all five Domain 01 indicators | **pass** | each `GET /indicators/{id}` → 200 |
| S3 | One Notes foot (`FigureRecord`) per stage | **pass** | no second SourceLine under stage; Notes switch by view |
| S4 | No Coverage strip on domain stages | **pass** | FigureStrip only for current/compare headlines, not SPAN/OBSERVATIONS strip |
| S5 | Multi-chart titles use `stageTitle` | **pass** | no `FIG. N ·` caps titles |
| S6 | Capacity ≠ Electricity units | **pass** | GW (nameplate) vs TWh; DUKES ≠ ET 5.1 labels caveated |
| S7 | Year view geography break | **pass** | GB NESO labelled; Notes forbid blend with UK ET 5.1 |
| S8 | Atlas coverage honesty | **pass** | Tab “Renewables atlas”; Notes: not full fleet; offshore off tiles |
| S9 | URL deep links | **pass** | `?domain=generation&view=…` loads correct stage |
| S10 | Client/server boundary | **pass** | client imports `packs.ts`; `load.ts` (node:fs) stays server-only |

## Editorial
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| E1 | Locked domain question in `sector-pages.ts` | **pass** | matches Notion Domain 01 question intent |
| E2 | Follow-this-fuel present on Changing Current | **pass** | contextual hop retained |
| E3 | Data view download / catalogue links | **pass** | generation archive + capacity/atlas catalogue hrefs |

## Deferred (explicitly out of Domain 01 Gate 4)
- REPD OSGB point map (tiles + table only)
- Full fossil/nuclear geo register (no open source identified for Gate 3)
- Coal editorial investigation / chart turning-point rules beyond long-run
- Domains 02–10 explorers

## Summary
- Pass: 10 structural + 3 editorial
- Warn: 0
- Fail: 0
- Blockers: none
- **Domain 01 Gate 4: complete.** Next sector work is Domain 02+ or Economy.

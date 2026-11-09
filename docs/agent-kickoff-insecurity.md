# Kickoff — Housing Domain 08 Housing Insecurity

**Brief:** [Housing Insecurity](https://app.notion.com/p/40e65471768581a2a277cc76f104f990)  
**Question (locked):** What happens when people cannot secure, maintain or remain in a stable home?  
**Canvas head:** When a home is no longer certain.  
**Owner:** Housing (connectors + registry); Orchestrator (Pathways / Temporary Life / Displacement / Housing Need UI); Validation after ingest.  
**Rule:** Stay close to the Notion plan. Do **not** skip listed datasets or research areas. One domain fully complete before Ownership / Policy.

## Design non-negotiables (brief)

- Evidence seriousness — no red crisis cards, no staged imagery of vulnerable people.
- Homelessness ≠ rough sleeping; stocks ≠ flows; England ≠ UK merged rates.
- Pathways diagram = process + linked official stats — **not** a measured cohort flow unless linked data exists.
- Never turn waiting-list ÷ lettings into an individual predicted wait time.
- Privacy: no identifiable household locations; suppress small counts where required.
- Devolved nations = distinct legal definitions, never false uniform UK rates.
- Future (not Gate 2 blocker): Cost of Insecurity (TA spend ↔ finance).

## Target views (Notion)

**Pathways · Temporary Housing · Displacement · Housing Need · Data**  
Default opens **The Pathways of Housing Insecurity**.

| View | Experience |
|------|------------|
| Pathways | Flagship process diagram: assessment → prevention → relief → main duty → TA → outcomes; select duty → definition + measured series |
| Temporary Housing | **A Temporary Life** — duration bands, household type, children, TA type; stock vs entries/exits |
| Displacement | Geography of TA rates + out-of-area placements (TA9) where defensible; reuse map infrastructure |
| Housing Need | **Waiting for a Home** — Table 600 registers + CORE lettings; clear measure meanings |
| Data | Tables, definitions, downloads, stocks vs flows glossary |

## Research scope — full catalogue (do not drop)

| Research area | What visitors investigate | Primary series |
|---------------|--------------------------|----------------|
| Statutory homelessness | Assessments, duties owed, outcomes | H-CLIC A1 / P / R / MD |
| Temporary accommodation | Households, children, types, length of stay | TA1–TA9 (+ children stock) |
| Rough sleeping | Single-night estimate, geography, trends | Autumn snapshot (+ note data framework) |
| Evictions / repossessions | Claims, orders, warrants, enforcement | MoJ mortgage + landlord possession |
| Social housing waiting lists | Registered need by LA | LAHS Table 600 |
| Social housing lettings | Allocations / lettings | CORE / social housing lettings |
| Hidden homelessness | Concealed households / sofa surfing | Census + related (coverage gaps explicit) |
| Homelessness prevention | Prevention & relief activity / outcomes | H-CLIC P* / R* |
| Displacement | Out-of-area TA placements | TA9 (+ geography rates) |
| Households at risk | Support needs / priority need where published | H-CLIC A3 / MD3 |
| Geographic inequality | LA / region rates | Detailed LA tables + denominators |
| TA expenditure | Financial cost of insecurity | LA finance stats (phase 6 / future Cost view) |
| Devolved returns | Scotland / Wales / NI | Jurisdiction-specific stubs → Ready |

## Research figures — verify before Ready

| Claim | Period / unit | Must match |
|-------|---------------|------------|
| 135,580 households in TA | England stock, **31 March 2026** | MHCLG statutory homelessness Jan–Mar 2026 |
| 177,530 children in those households | Same stock date | Same release |
| 83,850 households assessed owed prevention or relief | **Jan–Mar 2026** flow | Same release (A1) |
| 4,793 people estimated sleeping rough | Single night **autumn 2025** | Rough sleeping snapshot |

Different periods and units — **do not add or equate**.

## Authoritative sources (Notion §5 — all required)

| Dataset | Publisher | Landing / pin target |
|---------|-----------|----------------------|
| Statutory homelessness / H-CLIC | MHCLG | [Live tables on homelessness](https://www.gov.uk/government/statistical-data-sets/live-tables-on-homelessness) — England time series + Detailed LA Jan–Mar 2026 |
| Temporary accommodation | MHCLG | Same pack (TA1–TA9 in England series + LA detail) |
| Rough sleeping snapshot | MHCLG | [Tables on rough sleeping](https://www.gov.uk/government/statistical-data-sets/tables-on-rough-sleeping) — autumn 2025 ODS |
| Possession / repossession | MoJ | Mortgage and landlord possession statistics |
| Social housing registers | MHCLG LAHS | [Live Table 600](https://www.gov.uk/government/statistical-data-sets/live-tables-on-rents-lettings-and-tenancies) |
| Social housing lettings | MHCLG CORE | Social housing lettings in England release / tables |
| Concealed households | ONS Census | TS / RM tables on concealed / overcrowded living arrangements |
| TA expenditure | MHCLG / DLUHC LA finance | RO / RA housing lines (Cost of Insecurity — phase 6) |
| Devolved homelessness | SG / WG / NIHE | Separate indicators, never summed into England |

## Ingest sequence (brief §8)

1. **Verify + ingest** England statutory homelessness + TA (measure types + periods explicit).
2. **Pathways** instrument wired to real A1 / P / R / MD / TA stocks.
3. **A Temporary Life** duration graphic (TA4 / TA7 / TA8 children).
4. **Geography of Displacement** — LA rates + TA9 out-of-area aggregates.
5. **Registers + lettings** — Table 600 + CORE with comparability caveats.
6. **Devolved + MoJ + Census concealed + TA spend** — extend carefully; Validation QA.

## Registry rows to create

| Indicator ID | Source | Measure type |
|--------------|--------|--------------|
| `statutory-homelessness-assessments` | H-CLIC A1 (+ duty splits) | **Flow** (quarter) |
| `homelessness-prevention-outcomes` | H-CLIC P* | Flow |
| `homelessness-relief-outcomes` | H-CLIC R* | Flow |
| `homelessness-main-duty` | H-CLIC MD* | Flow |
| `temporary-accommodation-households` | TA1 / England series | **Stock** (quarter-end) |
| `temporary-accommodation-children` | TA8 / children stock | Stock |
| `temporary-accommodation-by-type` | TA1 type breakdown | Stock |
| `temporary-accommodation-duration` | TA4 / TA7 | Stock / average stay |
| `temporary-accommodation-out-of-area` | TA9 | Stock / placements |
| `rough-sleeping-snapshot` | Autumn snapshot | Stock (single night) |
| `possession-claims` | MoJ | Flow |
| `social-housing-waiting-list` | Table 600 | Stock (31 Mar) |
| `social-housing-lettings` | CORE | Flow (annual) |
| `concealed-households` | Census | Stock (Census night) |
| `temporary-accommodation-spend` | LA finance | Flow (£) — later |
| `homelessness-scotland` / `wales` / `ni` | Devolved | Jurisdiction-specific |

## Safeguards checklist

- [ ] Every observation tagged stock vs flow in notes / unit / definition
- [ ] Pathways UI labels process vs measured aggregates
- [ ] No individual wait-time from 600 ÷ lettings
- [ ] England figures labelled England
- [ ] Research headlines checked against pinned release before registry Ready

## Out of scope this wave

- Domain 06 Land Explorer polygons (user).
- Cost of Insecurity as a fifth mode (data ingest OK; dedicated view later).
- Household-level trajectory fiction from unlinked aggregates.

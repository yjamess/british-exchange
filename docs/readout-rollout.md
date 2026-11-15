# Shared readout rollout · 15 November 2026

`ReadoutCard` in `web/src/brand/instrument/` is the Tax Machine reference card: paper, ink rule, mono heading, labelled value rows. Exported from `@/brand`. Charts own inspection state. Use `placement="inline"` for map records, selected features and scenario summaries; values wrap on narrow screens. Data, calculations, links, legends and source notes retain their existing roles.

## Energy coverage

| Domain | Readout coverage |
|---|---|
| Electricity generation | Shared TimeChart; station hover/selection, station evidence and national generation context cards. Open fuel legends remain legends. |
| Consumption | Shared TimeChart; local-authority and regional consumption records; Useful Energy split-bar tooltip migrated with pointer, touch, focus and Escape. |
| Prices | Shared TimeChart; regional-price record adapter migrated; receipt remains the bill instrument. |
| Fossil fuels | Shared TimeChart; field hover/selection and production records, preserving suppression and not-started states. |
| Imports | Shared TimeChart; selected/hovered country values through WorldChoropleth. |
| Low carbon | Shared TimeChart and technology field-guide selected measures. |
| Networks | Shared TimeChart; substation hover/selection and evidence record. |
| Manufacturing | Existing time charts inherit the shared card; ranked bars retain direct labelled values. |
| Jobs and industrial work | Existing time charts inherit the shared card; ranked bars retain direct labelled values. |
| Policy | Shared DecisionLedger/dossiers retained; narrative and evidence tables are not numeric readout cards. |

## Housing coverage (Housing sub-agent; reviewed by Orchestrator)

| Domain | Readout coverage |
|---|---|
| Prices | Selected-place and comparison records; shared time charts. |
| Renting | Shared atlas selected-place and comparison records; shared time charts. |
| Affordability | Shared atlas records; purchase-budget and repayment/scenario cards. |
| Stock | Shared TimeChart and ShareArea cards; open legends retained. |
| Quality | Cutaway selected feature and companion measure; condition cell; efficiency/cost and selected EPC place. |
| Supply | Selected district and national fallback record. |
| Land | Selected feature record with existing links and caveats. |
| Ownership | Selected company-title place and national fallback record; shared time charts. |
| Insecurity | Displacement selected-place and national fallback record; shared time charts. |
| Policy | Shared ledger/dossiers retained. |

## Verification

- Full TypeScript check passed; Housing targeted ESLint clean. Energy/shared targeted ESLint has no errors; four existing warnings remain in GenerationCanvas and NetworksCanvas.
- Visually checked Energy field guide and Housing supply at 1440px and 390px. Inline cards fit their containers; mobile document width is 390px (no horizontal overflow). Screenshots: `/private/tmp/bx-sector-{energy,housing}-{desktop,mobile}.png`.
- Scoped card value typography prevents surrounding ranked-bar figure styles from enlarging readout values.
- Useful Energy pointer and keyboard inspection passed; Escape dismisses the card. Its 390px screenshot confirms the card stays inside the plot (308px card at x=41). Screenshots: `/private/tmp/bx-useful-readout-{desktop,mobile}.png`.
- All domains audited in source; representative browser checks do not claim screenshots of every tab.

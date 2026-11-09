# Domain 04 — reuse map (do not fork)

Locked question: *Where did Britain's fossil fuels come from, what was extracted, and how did domestic production change?*

| Indicator id | Owner path | Status | Role in Domain 04 | Action |
|--------------|------------|--------|-------------------|--------|
| `domestic-gas-production` | `data/energy/domestic-gas-production/` | **Ready** | Native-unit UK indigenous gas (GWh, monthly) | Registry-link only |
| `primary-energy-production` | `data/energy/primary-energy-production/` | **Ready** | Common-unit indigenous Oil / Gas / Coal (Mtoe, monthly) | Registry-link; Extraction Century energy-unit view |
| `historical-coal-production` | `data/history/historical-coal-production/` | **Ready** (History agent) | Native-unit coal extraction (Mt, annual) | Cross-sector link; **Energy does not re-ingest** |
| `electricity-generation-long-run` | `data/energy/electricity-generation-long-run/` | Ingested | Coal/oil/gas **generation** TWh since 1920 | Journey 2 only — not extraction |
| `energy-imports-and-exports` | `data/energy/energy-imports-and-exports/` | Ready (Imports lane) | Trade for Production Gap | Link; Imports agent owns package |
| `crude-oil-production` | `data/energy/crude-oil-production/` | **New Wave A2** | Native-unit UK indigenous crude (Mt, annual, long-run) | Gate 2 ingest → Validation |

## Non-overlap rules

1. **Gas:** ET 4.2 GWh (`domestic-gas-production`) ≠ ET 1.1 Natural gas Mtoe (`primary-energy-production`).
2. **Coal:** History Mt series ≠ Energy ET 1.1 Coal Mtoe; DUKES 2.1.1 deferred unless deep/surface split is required.
3. **Oil:** New `crude-oil-production` (Mt, historical workbook) ≠ ET 1.1 Oil Mtoe; do not sum field-level NSTA rows to replace the national total.
4. **Generation fuel ≠ extraction:** never present `electricity-generation-long-run` coal as UK mine output.

## Notion registry

- Gas: https://app.notion.com/40d65471768581f78387e9f7006eabd4
- Primary production: https://app.notion.com/40d654717685819db323cce12ec97c72
- Historical coal: https://app.notion.com/40d654717685810db26fe5add2ed8e1e
- Domain brief: https://app.notion.com/p/410654717685815db976d589af8be69f

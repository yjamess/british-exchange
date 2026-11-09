# Validation notes — `electricity-interconnector-capacity`

**Agent:** Energy (self-check before Validation)  
**Pin:** `raw/2026-11-08/interconnector-register-05-november-2026.csv`  
**SHA-256:** `97e09cef423d9530d14fa7342d6d3a6ed3369e8b1690717fd83159a311624dcf`

## Method

- Official CKAN `resource_show` → dated CSV pin (immutable).
- One curated row per register line.
- **Built** with `MW Import - Current` > 0 → value = current import MW; period = pin date from filename (`2026-11-05`); `date_basis=built_current_pin_snapshot`.
- Otherwise rows with `MW Effective From` → value = `MW Import - Increase / Decrease`; period = contractual date; `date_basis=mw_effective_from_contractual`.
- Primary measure is **import-side firm TEC** (NESO / CUSC). Export MW kept in notes only.
- Geography **GB** (`K03000001`), not UK.
- Gate blank → `gate=unassigned` (not invented).

## Sample vs pin (Built import current)

| Project (register name) | Curated MW | Raw `MW Import - Current` |
|-------------------------|------------|---------------------------|
| IFA Interconnector | 1988 | 1988 |
| IFA2 Interconnector | 1100 | 1100 |
| ElecLink | 1000 | 1000 |
| Britned | 1200 | 1200 |
| Nemo Link | 1020 | 1020 |
| NS Link | 1400 | 1400 |
| Viking Link Denmark Interconnector | 1500 | 1500 |
| East West Interconnector | 505 | 505 |
| Greenlink | 504 | 504 |
| Auchencrosh (interconnector CCT) | 500 | 500 |
| Isle of Man Interconnector | 74 | 74 |

## Honesty

- Do **not** treat MW as ET 5.6 GWh.
- Do **not** invent partner shipping routes or landfalls from this register.
- Moyle (Auchencrosh) 500 MW TEC is subject to operational restrictions (NESO portal note).
- Stage / technology aggregates may duplicate under Connections Reform — do not sum without dedupe.
- France–UK ET 5.6 corridor is an aggregate of IFA + IFA2 + ElecLink — capacity rows stay project-level.

## Related

- Flows: `electricity-interconnector-flows` (ET 5.6)
- Queue (generation/storage TEC, not interconnectors): `transmission-entry-capacity-register`

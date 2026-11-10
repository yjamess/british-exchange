# QA report — manufacturing productivity hours — 2026-11-10

**Agent:** Validation  
**Overall verdict:** **pass** (Ready)

## Scope

- Indicator: `manufacturing-productivity-hours` (ONS DK3V / PRDY — manufacturing section C productivity hours)
- Manifest: `data/energy/manufacturing-productivity-hours/manifest.yaml`
- Raw: `data/energy/manufacturing-productivity-hours/raw/2026-11-10/dk3v_prdy.json`
- Curated: `data/energy/manufacturing-productivity-hours/curated/observations.csv` (129 quarterly rows)
- Connector: `src/energy/connectors/manufacturing_productivity_hours.py`
- Official: [ONS DK3V / PRDY](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/dk3v/prdy)
- Hours component for the Productivity Machine formula — not Workforce Jobs

## Freeze

| Item | Value |
|------|-------|
| SHA-256 | `0680c2fbc844807b83b9f16a40e679191136189c7946d38eae15544bf0728cf4` |
| Series | DK3V / PRDY |
| Official release | 2026-08-17 |
| Rows | 129 quarterly (1994 Q1 → 2026 Q1) |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Pin SHA vs curated hand-off | **pass** | Matches manifest raw evidence |
| C2 | Coverage / UK only / unique keys | **pass** | `K02000001` only; quarterly bounds |
| C3 | Method — index 2023=100 SA; not jobs | **pass** | Official “Productivity hours: Manufacturing C”; not JWR7 |
| C4 | Spot sample vs ONS table | **pass** | 1994 Q1 = 159.9; 2020 Q2 = 81.4; 2026 Q1 = 96.9 |
| C5 | Not a DIY denominator for IoP | **pass** | UI must plot official DJK6/DJ4P; hours chart is the component only |

## Close

Ready for Domain 09 Productivity Machine hours panel. Postgres loaded 2026-11-10 (release_id=144).

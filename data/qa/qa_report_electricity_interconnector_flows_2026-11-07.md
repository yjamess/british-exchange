# QA report — electricity interconnector flows — 2026-11-07

## Scope
- Indicator: `electricity-interconnector-flows` (DESNZ Energy Trends **ET 5.6**, sheet `Quarterly imports and exports`, GWh by corridor)
- Manifest: `data/energy/electricity-interconnector-flows/manifest.yaml`
- Raw: `data/energy/electricity-interconnector-flows/raw/2026-11-07/ET_5.6_SEP_26.xlsx`
- Retrieval: `data/energy/electricity-interconnector-flows/raw/2026-11-07/retrieval.json`
- Curated: `data/energy/electricity-interconnector-flows/curated/observations.csv` (2736 rows)
- Connector (read-only): `src/energy/connectors/electricity_interconnector_flows.py`
- Energy notes: `data/energy/electricity-interconnector-flows/validation_notes.md`
- Gate 1 inventory: `data/energy/power-networks/`
- Related Ready (link only — do not conflate): `energy-imports-and-exports` (ET 1.3 ktoe all-fuels), `gb-generation-mix-half-hourly` (GB NESO operational)
- Registry: https://app.notion.com/4116547176858128b5cde0c291d4674c

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs claimed / manifest / retrieval.json | **pass** | `shasum -a 256` = `f9ce73f5adaec1f84cb463479567964f185733c1eed1d506075ce6328b9c46f9` (exact). No re-ingest as primary path. |
| C2 | Curated coverage — 114 quarters × 8 corridors × 3 flows | **pass** | 2736 rows; valued=1722; missing=1014 (`[x]` → `observation_status=missing`); periods 1998-Q1 … 2026-Q2; geo all `K02000001` / United Kingdom; unit all `GWh`; statuses final=1698, missing=1014, provisional=24 (2026-Q2 × 8 × 3). |
| C3 | Method — GWh; quarterly; Imports/Exports/Net by corridor | **pass** | Manifest + curated unit `GWh`. Calendar quarters (`period_start`/`period_end`). Flows = Imports \| Exports \| Net imports. Corridors = UK-total, France-UK, Ireland-NI, Netherlands-UK, Ireland-Wales, Belgium-UK, Norway-UK, Denmark-UK. Sheet title / Cover / Notes confirm electricity GWh trade, not nameplate MW capacity. |
| C4 | Method — UK geography; GB/UK caveats; not ET 1.3; not capacity | **pass** | UK Official Statistics (`K02000001`), includes NI–Republic of Ireland. Manifest caveats correctly separate GB NESO half-hourly Imports and ET 1.3 ktoe. Annual sheet + ET 5.6B transfers / 5.6B sheets present in workbook but not ingested (documented). Gate 1 notes NTC/nameplate capacity as separate/Blocked. |
| C5 | Method — France aggregate; pre-commissioning `[x]`; Net publisher values | **pass** | Notes Note 2: France = IFA+IFA2+ElecLink sum. Missing markers mapped to null/`missing`. Publisher Net imports preserved; spot identity Imports−Exports = Net for 2026-Q2 UK (diff 0.0). |
| C6 | Numerical — claimed 2026-Q2 samples vs pinned quarterly sheet | **pass** | Independent `openpyxl` `data_only` re-read of `Quarterly imports and exports` + curated. UK Imports 11242.8331; Exports 3627.8791; Net 7614.954; France→UK Imports 6156.4105 — all exact; row label `Quarter 2 [provisional]`. Matches Commentary rounded TWh (11.2 / 3.6 / 7.6 / 6.2; France 54.8% of imports). |
| C7 | Numerical — 2024 Σ quarterly UK Net ≈ annual sheet | **pass** | Quarterly curated UK-total Net imports 2024 sum = `33407.820199999995` (4 quarters). Annual sheet `Annual imports and exports` UK total net imports 2024 = `33407.820199999995`. Abs diff vs claimed 33407.8202 = ~7e-12 (float). |
| C8 | No silent rewrite / no ET 1.3–ET 5.6 conflation / no capacity invent | **pass** | Validation did not edit Energy curated/raw. Series remains electricity corridor GWh, not all-fuels ktoe or MW capacity. Gate 3 backlog (constraints, ET 5.6B, NESO register) left open honestly. |
| C9 | Manifest / connector reproducibility | **pass** | Header row 6 matches connector `EXPECTED_HEADERS`; entrypoint `uv run python -m energy.connectors.electricity_interconnector_flows`; source_version `ET_5.6_SEP_26`; official_release_date 2026-09-29. |
| C10 | Corridor/flow dimensions in free-text `notes` | **warn** | Dimensions are parseable `corridor=` / `flow=` notes, not typed columns. Acceptable for contract v1.0; same pattern as other Ready series. Not a Ready blocker. |
| C11 | Publisher zeros before Note-stated commissioning (Denmark/Belgium/Norway windows) | **warn** | Workbook uses `[x]` then often `0.0` for some corridors before Note 3/4/7 full-operation dates (e.g. Denmark Note 7 = 29 Dec 2023, but zeros appear from 2017-Q1). Connector faithfully mirrors source; consumers should prefer Notes commissioning dates over treating early zeros as trade. Not a fail. |

## Numerical samples (Validation recompute)

Pinned sheet `Quarterly imports and exports` (`data_only`) vs curated:

| Period | Corridor | Flow | XLSX | Curated | Status | Match |
|--------|----------|------|------|---------|--------|-------|
| 2026-Q2 | UK-total | Imports | 11242.8331 | 11242.8331 | provisional | exact |
| 2026-Q2 | UK-total | Exports | 3627.8791 | 3627.8791 | provisional | exact |
| 2026-Q2 | UK-total | Net imports | 7614.954 | 7614.954 | provisional | exact |
| 2026-Q2 | France-UK | Imports | 6156.4105 | 6156.4105 | provisional | exact |
| 2024 (Σ Q1–Q4) | UK-total | Net imports | — | 33407.820199999995 | final | = annual sheet 33407.820199999995 |

Net identity 2026-Q2 UK: 11242.8331 − 3627.8791 = 7614.954 (diff 0.0).

## Summary
- Pass: **9**
- Warn: **2**
- Fail: **0**
- Blockers: **none**
- Recommended fixes (owner Energy): none for Ready. Optional later: typed corridor/flow columns; document publisher zero-vs-`[x]` windows in README for Denmark/Belgium/Norway.
- **Notion:** Status Validation → **Ready** (2026-11-07); Evidence includes this QA path

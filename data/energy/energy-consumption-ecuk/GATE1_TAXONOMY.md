# Gate 1 — ECUK taxonomy and coverage breaks

**Pin:** `raw/2026-11-06/` · release **2026-09-24** · data year through **2025**  
**Do not invent continuous flows across the breaks below.**

## Sectors (final consumption · Table C1)

Side-by-side blocks on one sheet (row 5 banners / row 6 Year headers):

| Sector id (Exchange) | ECUK banner | Fuel grain | Years |
|----------------------|-------------|------------|-------|
| `industry` | Industry [Note 1] | Coal … Petroleum products + Total | 1970–2025 |
| `transport` | Transport | Mode × fuel (Rail/Road/Water/Air) + Total | 1970–2025 |
| `domestic` | Domestic | Coal … Petroleum + Total | 1970–2025 |
| `services` | Services and other final users | Coal … Petroleum + Total | 1970–2025 |
| `all-final` | All final users | Aggregate fuels + Total | 1970–2025 |

**Spot (C1 All final users Total, 2025):** 127 688.54 ktoe ≈ **127.7 mtoe** (matches ECUK 2026 headline in the Notion brief).

**Reuse:** `industrial-energy-consumption` = Industry block only (Ready; QA 2026-11-03). Gate 2 should extend C1 to all sector blocks — **one connector family / one source pin**, not a second download of Consumption tables.

## Fuels (final consumption)

Common industry/domestic/services labels (normalise newlines / notes away):

Coal · Coke and breeze · Other solid fuels · Coke oven gas · Town gas · Natural gas · Electricity · Heat · Bioenergy & waste · Petroleum (products) · **Total**

Transport uses **mode-prefixed** fuels (e.g. `Road - petroleum`). Never sum component fuels with `Total`.

## End uses (Tables U*)

| Coverage | Tables | End-use examples |
|----------|--------|------------------|
| Domestic long-run 1970–2025 | U3 | Space heating · water heating · cooking · lighting · appliances (often `[x]` early) · domestic total |
| Cross-sector short 2021–2025 | U1, U2, U5 | All sectors excl. transport; services excl. agriculture |
| Industry detail | U4.x | End use × 2-digit SIC (estimated proportions) |

**Break:** Most non-domestic end-use detail starts **2021**. Do not animate a 1970→now end-use Metabolism for industry/services.

## Energy-system stages (join carefully)

| Stage | Tables | From | Notes |
|-------|--------|------|-------|
| Primary | P1, P2 | 1970 | Distinct from final. |
| Primary → destinations | **W1** | **1998** | Transfers · Transformation · Energy industry use · Losses · Non-energy use · Final consumption |
| Final by sector/fuel | **C1** | 1970 | Gate 2 national composition |
| Useful / rejected | **W2** (sector) · **W3** (end use) | 2017 / 2025 | **Official Statistics in Development**; coefficients on Assumed Efficiencies |
| Intensity | I1–I6 | varies | Gate 3 appetite / efficiency |

**Join keys (legitimate):** calendar `year` + UK geography + documented unit (ktoe unless noted).  
**Not legitimate without method notes:** assigning electricity *generation* fuel mix to a sector’s electricity *consumption*; stitching W2 useful energy onto C1 before 2017.

## Geography break (separate product)

National ECUK (this pin) ≠ [DESNZ subnational final consumption 2005–2024](https://www.gov.uk/government/statistics/total-final-energy-consumption-at-regional-and-local-authority-level-2005-to-2024). Geography explorer waits Gate 3; do not imply LA totals exist for 1970–2025.

## Model / observation status

| Content | Status to show in UI |
|---------|----------------------|
| C1 / P* / most U3 | Observed / accredited official statistics |
| W* pack | Official statistics **in development** |
| W2/W3 useful & rejected | **Modelled** from Assumed Efficiencies |
| W4 / user-toggled coefficients | **User scenario** — never labelled DESNZ |

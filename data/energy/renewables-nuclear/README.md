# Renewables & Nuclear — Gate 1 gap inventory (Wave B1)

**Domain:** 06 · `low-carbon` · [Renewables & Nuclear](https://app.notion.com/p/4106547176858123a229f9dbcb1a93e7)  
**Owner:** Energy (Low-carbon lane)  
**Opened:** 2026-11-07  
**Central question:** How much low-carbon electricity is installed, generated and planned, and where is the new energy landscape taking shape?

This folder is **inventory only**. Ready sibling packages are linked, not rewritten. Nuclear is low-carbon but **not** renewable — REPD never covers nuclear.

## Reuse first (do not fork)

| Indicator id | Role for Domain 06 | Status | Path |
|--------------|--------------------|--------|------|
| `renewable-energy-planning-operational` | Project pipeline / atlas (operational REPD MW + sites) | Ready / ingested | `data/energy/renewable-energy-planning-operational/` |
| `electricity-capacity-by-technology` | Installed capacity MW by technology (incl. Nuclear AGR/PWR/…) | Ingested | `data/energy/electricity-capacity-by-technology/` |
| `electricity-generation-by-source` | Generation TWh by fuel (incl. Nuclear, wind, solar) | Ingested | `data/energy/electricity-generation-by-source/` |

Related (link only; owned elsewhere):

| Indicator id | Why relevant | Caveat |
|--------------|--------------|--------|
| `uk-power-stations-dukes` | Fossil + nuclear station register (DUKES 5.11) complements REPD | Not a renewable atlas |
| `electricity-generation-long-run` | Historic fuel mix for chronology | Cross-domain Generation |
| `gb-generation-mix-half-hourly` | Intra-day mix | NESO GB, not DESNZ annual |

## What Gate 2 still needs

Notion §1–3 asks for **capacity ≠ output**: MW, TWh **and load factors**, plus nuclear as a distinct low-carbon category (not via REPD).

| Need | Gap vs reuse | Action (Wave B1) |
|------|--------------|------------------|
| Renewable load factors (% of potential generation) | **Missing** as its own indicator | **Ingest** `renewable-electricity-load-factors` (DUKES 6.3) |
| Nuclear installed capacity as distinct indicator | Partially covered inside `electricity-capacity-by-technology` (`fuel=Nuclear - …`) | Reuse filter; optional later extract |
| Nuclear generation as distinct indicator | Partially covered inside `electricity-generation-by-source` (`fuel=Nuclear`) | Reuse filter; optional later extract |
| Nuclear fleet / planned projects | Stations in `uk-power-stations-dukes`; planned new-build not in REPD | Candidate: ONR / DESNZ / developer publications — Gate 3 |
| Proposed / consented / under construction pipeline | REPD has stages; current curated series is **operational only** | Candidate: extend REPD connector for non-operational status — Gate 3 |
| Regional / location atlas completeness | REPD atlas + DUKES 5.11 | Sufficient for Gate 2 slice with load factors |

## Statistical safeguards (from Notion)

- REPD is **not** a complete register of all scales or nuclear assets.
- Proposed capacity ≠ installed capacity ≠ generation.
- Do not treat nuclear rows as renewable, or imply REPD covers reactors.

## Wave B1 deliverable

- **New series:** `renewable-electricity-load-factors` → Validation  
- Reproduce: `uv run python -m energy.connectors.renewable_electricity_load_factors`  
- Inventory: this README + `source_register.csv`

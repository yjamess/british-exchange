# QA report — ofgem-default-tariff-cap — 2026-11-07

**Agent:** Validation  
**Overall verdict:** **warn** (numbers pass; TDCV note inconsistency)

## Scope

- Indicator: `ofgem-default-tariff-cap` (Ofgem Annex 9 levelised default tariff cap)
- Manifest: `data/energy/ofgem-default-tariff-cap/manifest.yaml`
- Raw: `raw/2026-11-07/{jan-mar,apr-jun,jul-sep,oct-dec}-2026/` (Annex 9 XLSX + Energy price cap levels PDF × 4)
- Curated: `curated/observations.csv` (12 rows = 4 periods × 3 measures)
- Connector: `energy.connectors.ofgem_default_tariff_cap` (`src/energy/connectors/ofgem_default_tariff_cap.py`)
- Method under test: pin-per-period Annex 9 sheet `1a Levelised DTC`; **GB average, inc VAT**; **Other Payment Method**; measures `elec_single` / `gas` / `dual_fuel`
- Official landing: [Ofgem default tariff levels](https://www.ofgem.gov.uk/energy-regulation/domestic-and-non-domestic/energy-pricing-rules/energy-price-cap/energy-price-cap-default-tariff-levels)

## Freeze

| Item | Value |
|------|-------|
| Periods | 2026-01→03, 2026-04→06, 2026-07→09, 2026-10→12 |
| Observations | 12 |
| Geography | `K03000001` Great Britain (all rows) |
| Dual-fuel curated | 1757.98 · 1641.22 · 1663.37 · 1723.36 £/year |

SHA-256 (claimed = observed for all 8 pinned files):

| Asset | SHA-256 |
|-------|---------|
| jan-mar Annex 9 | `ab227e1039a4f247964982c9e20e0ab7175e7eada6b4e600c28ed16a3b057f77` |
| jan-mar PDF | `8ca9d4e9fa75b53c2eb1d3c8c0735582c57e2b2400a6cbcb179bbbd3dfd50971` |
| apr-jun Annex 9 | `8a5a60aea2652b19b7cdffd40b50ebbc8b50619a1886c7daeb0eb86b0093aee5` |
| apr-jun PDF | `a731ff0cbee65d7a399b1d1a0e0fac812e24ecfded5447ee422b9d74231ca5c4` |
| jul-sep Annex 9 | `e154e285f8e6e5fbd16a07265ee03a3da97c453a5c9ab305f65cebb3fdea169a` |
| jul-sep PDF | `f8ace45c9cbfc007cfd71b073ee74772f27f26656d2867130af0bfb829c0277d` |
| oct-dec Annex 9 | `5a7277ca7af148d1b918d87a29fab5fa9100e8764a88b9042d7969b7dbe1a6f8` |
| oct-dec PDF | `f34dd54ac09069e753cfe95a273f0ee0e53c7612d1aa0cf1b8cea9f2e630dcc8` |

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | Freeze — pinned raw SHA-256 vs manifest | **pass** | All 8 Annex 9 + PDF pins match |
| C2 | Geography GB only (`K03000001`) | **pass** | No `K02000001` (UK), no NI codes; label Great Britain on all 12 rows |
| C3 | Method — Annex 9 `1a` Other Payment Method / GB average inc VAT | **pass** | Independent openpyxl re-read matches curated £/year to 2 dp for all 4×3 cells |
| C4 | Dual-fuel identity `dual ≈ elec + gas` | **pass** | Exact for all four periods (e.g. Oct–Dec 858.20 + 865.16 = 1723.36) |
| C5 | Spot-check dual_fuel / gas vs Energy price cap levels PDFs | **pass** | PDFs are **excl VAT**, regional. Jan–Mar and Oct–Dec Gas OPM regional means (14 regions) = Annex 9 excl-VAT GB average; ×1.05 (or elec 0% + gas 5% in Oct–Dec) recovers curated. Dual-fuel curated = Annex `GB average, inc VAT` dual column |
| C6 | Oct–Dec VAT mix documented | **pass** | Annex label `GB average, inc VAT` (elec 0% Oct 2026–Mar 2027); ratio dual_inc/excl ≈ 1.0245, not flat 5% — consistent with notes |
| C7 | TDCV disclosure consistency (Jul–Sep) | **warn** | `observations.csv` notes for Jul–Sep say TDCV **2.7 / 11.5 MWh**; `spot_values.csv` for 2026-Q3 says **2500 / 9500 kWh**. Sheet `1c` in the Jul–Sep pin has both “Jan–Jun” (2.7/11.5) and “July 2026 onwards” (2.5/9.5). Connector appears to read the default Consumption column, which can mis-label Jul–Sep footnotes. **£ values from `1a` still match** — disclosure only |
| C8 | Not DESNZ bills / not NI scrape | **pass** | Manifest + notes honest; Ofgem pins only |
| C9 | Independence — no silent rewrite | **pass** | Validation did not edit Energy curated/raw |

## Summary

- Pass: **8**
- Warn: **1** (C7)
- Fail: **0**
- Blockers: **none hard** — curated £/year levels are trustworthy
- Recommended fixes (**owner: Energy**): ~~C7 TDCV footnote~~ — **fixed 2026-11-07** by Orchestrator: connector now prefers July-onwards TDCV column for periods ≥ 2026-07-01; Jul–Sep notes = 2.5 / 9.5 MWh. README documents PDF excl-VAT vs curated inc-VAT.
- **Notion:** Orchestrator → **Ready** (2026-11-07) after C7 fix.

## Reproduce

```bash
shasum -a 256 data/energy/ofgem-default-tariff-cap/raw/2026-11-07/*/*
# Independent Annex 9 re-read (Other Payment Method → GB average, inc VAT)
uv run python -c "from openpyxl import load_workbook; print('see Validation session notes')"
```

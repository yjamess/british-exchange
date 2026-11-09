# Manufacturing IoP by SIC division / subsection

**Indicator:** `manufacturing-iop-by-division`  
**Agent:** energy (Energy & Industry)  
**Status:** **Ready** (Validation 2026-11-07 — `data/qa/qa_report_manufacturing_iop_by_division_2026-11-07.md`)  
**Source:** ONS DIOP multi-series CSV — [Index of Production time series (current)](https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/indexofproduction/current)

## What this is

Monthly seasonally adjusted chained-volume **index** levels for SIC 2007 Section C:

- Subsections **CA–CM**
- Divisions **10–33** (ONS combined **11+12** as CDID `DM4H` — labelled honestly)

## What this is not

- **Not** Ready headline Section C `manufacturing-output-index` (`K22A`) — that pipeline is untouched.
- Not growth rates, weights, turnover (£m), or NSA series.
- Not finer group/class CVMSA (e.g. 10.1, 20A) in this spine.

## Reproduce

```bash
uv run python -m energy.connectors.manufacturing_iop_by_division
```

Pins `raw/2026-11-07/diop.csv`, writes `curated/observations.csv` + `manifest.yaml`.

## Notes column

Structured keys: `series=` (CDID), `classification=` (`subsection` | `division` | `combined_division`), `sic=`, `label=`, `dataset=DIOP`.

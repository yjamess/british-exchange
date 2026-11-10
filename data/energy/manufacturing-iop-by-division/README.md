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


## Gate 4 weights handoff (2026-11-10)

`manufacturing-iop-weights` is delivered through Storage pack `energy.manufacturing-iop-weights`, not a duplicate Postgres observation table. Registry: https://app.notion.com/p/41465471768581ca87b8eadee2c8bfc0.

Reproduce with `uv run python -m energy.connectors.manufacturing_iop_by_division --weights-only`. Raw evidence is the pinned DIOP CSV; exact SHA-256 and independent sample QA are recorded in `data/qa/qa_energy_finalise_sources_2026-11-10.md`. The source manifest's transformation-only checksum is not the verified raw checksum; use the QA record for this weights handoff.

Verified cloud-only pack: 1,110 observations, 633,248 bytes, SHA-256 `aec8c61453d33a14bf9590b1bc86e7c132d43fd5557a316c05ac7b1a8fcdb2c6`. The local pin remains a reproducible development cache. Weights are parts per thousand of all production; divide by Section C to get manufacturing branch shares.

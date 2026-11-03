# Water supply interruptions

**Status:** Ready (unblocked 2026-11-03 with manual Ofwat WCPR download)  
**Publisher:** Ofwat (official UK non-ministerial department)  
**Series:** APR3A_02 — Actual performance, water supply interruptions  
**Unit:** minutes per property  
**Geography:** England & Wales company-level (`K04000001`)

## Source

Pinned: `raw/2026-11-03/WCPR_2024-25_Open_Data.xlsx`  
Landing: https://www.ofwat.gov.uk/publication/data-for-the-water-company-performance-report-2024-25-open-data-friendly-machine-readable-format/

Automated CDN fetch often returns HTTP 403; use a browser download and re-pin.

## Reproduce

```bash
uv run python -m infrastructure.connectors.water_supply_interruptions
```

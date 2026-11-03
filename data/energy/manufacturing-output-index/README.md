# Manufacturing output index

**Registry:** [Manufacturing output index](https://app.notion.com/40d65471768581af8d35fbee740cd16f)  
**Agent:** energy (Energy & Industry)  
**Series:** ONS `K22A` / DIOP — IoP Manufacturing CVMSA (index, base year = 100)

## Reproduce

```bash
uv run python -m energy.connectors.manufacturing_output_index
```

Pins raw JSON under `raw/2026-11-03/k22a_diop.json`, writes `curated/observations.csv` + `manifest.yaml`.

## Notes

Monthly seasonally adjusted chained-volume **index level** (not growth-rate series such as K2AT).

## QA

```bash
uv run python -m validation.qa_manufacturing_output_index_2026_11_03
```

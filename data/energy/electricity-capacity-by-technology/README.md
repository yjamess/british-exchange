# electricity-capacity-by-technology

**Owner:** Energy agent  
**Status:** Ingested (Gate 3) → hand to Validation before Ready  
**Registry:** https://app.notion.com/4106547176858180a305ffa706cffc4b  
**indicator_id:** `electricity-capacity-by-technology`

## Chosen series

| Field | Value |
|-------|--------|
| Publisher | DESNZ |
| Landing | https://www.gov.uk/government/statistics/electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes |
| Series | **DUKES 5.12.C** — Plant installed capacity by connection, UK total (MW) |
| Not used as primary | DUKES 5.7 (de-rated) — pinned alongside for reference only |
| Geography | UK — `K02000001` |
| Frequency | Annual calendar year |
| Unit | MW (installed / nameplate) |
| Licence | OGL v3.0 |

## Reproduce

```bash
uv run python -m energy.connectors.electricity_capacity
```

## Parse notes

- Sheet `5.12`, table **5.12.C**.
- For each generator type that is not a Total row: sum Transmission + Distribution MW.
- `notes` = `fuel=<ExactGeneratorType>` (note markers retained as printed).
- Empty cells skipped (not applicable).

## Spot check (this pin)

- 2025 UK component sum ≈ **111,103.4 MW** (= Transmission total + Distribution total on 5.12.C).
- Coal [note 4] in 2025 = **0 MW** (post Ratcliffe closure).

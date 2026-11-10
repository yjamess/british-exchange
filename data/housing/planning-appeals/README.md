# Planning appeals — PINS Casework Database (England)

**Status: Validation — casework aggregate product for Domain 06 Planning decisions.**

## What it is

Annual aggregates from the Planning Inspectorate **Casework Database** (decided appeals only):

- England totals by decision year (decided / allowed / dismissed / allow rate)
- Top local authorities by decided volume in the latest full calendar year
- Casework type and decision-code tallies

**Not a map.** Site address is published as text; we do not geocode it.

## Source

- [Planning Inspectorate Casework Database](https://www.gov.uk/government/publications/planning-inspectorate-appeals-database) (OGL v3.0)
- [Field notes](https://www.gov.uk/government/publications/planning-inspectorate-appeals-database/appeals-data-data-notes-and-guidance)
- Pin: `raw/2026-11-10/Casework_Database_2610.xlsx` (archived to `bx-data-archive`)

## Allow rate

Allowed ÷ (Allowed + Dismissed). “Allowed” includes Allowed, Allowed with Conditions, Allowed in part, and Planning permission granted. Unknown / withdrawn / invalid / turned away are excluded from the rate. Enforcement notice outcomes sit in Other.

## Honesty

- Rolling casework extract ≠ PINS quarterly Official Statistics (different compile day)
- Not Live Table P120 (district planning applications)
- Blank sheet rows are ignored (~91k decided cases kept from the published extract)

## Reproduce

```sh
uv run python -m housing.connectors.planning_appeals
uv run python -m britain_exchange.archive_data push data/housing/planning-appeals
```

Pack id: `housing.planning-appeals`

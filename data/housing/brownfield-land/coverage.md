# Planning Data coverage — brownfield-land

Retrieved: 2026-11-04  
Source: https://www.planning.data.gov.uk/dataset/brownfield-land  
Dump: https://files.planning.data.gov.uk/brownfield-land-collection/dataset/brownfield-land.csv

## Snapshot

| Measure | Value |
|---------|------:|
| Entities in dump | 40,229 |
| Current (blank end_date) | 32,353 |
| Ended entities dropped | 7,876 |
| Local-authority organisations joined | 379 |

Publisher warning (dataset page): data may be incomplete and not yet cover all of England.

## Geography claim

**England only, incomplete.** Do not present as UK / Britain coverage. Authority rows use Planning Data `local-authority` entity ids (`PD-LA-*`), not ONS GSS codes.

## Meaning

- Register entry ≠ deliverable site, ownership willingness, or viable permission.
- Maximum net dwellings are LPA estimates; many sites omit them — do not treat the England sum as buildable pipeline.
- Permission-status free text is partially canonised (`permissioned`, `not-permissioned`, `pending-decision`, `completed`, `unknown`, `other-or-unclear`).

## Related layers (not yet Ready)

| Layer | Dataset | Notes |
|-------|---------|-------|
| Green Belt polygons | `green-belt` | For Land Explorer spatial mode |
| Conservation areas | `conservation-area` | Designation, not a ban |
| Allocations | local plans / Planning Data | Separate from brownfield register |

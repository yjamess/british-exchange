# QA — Housing land indicators 2026-11-04

Independent read-only checks for green-belt-area, land-use-stock, planning-decisions-granted.

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| green-belt-area:C1 | Checksum raw=manifest | pass | 9aabb046f935e13fa274e1568cab055ee524cb7cdd538bd5baaa604e95d16cf5 |
| green-belt-area:C2 | Manifest contract + owner + geography | pass | missing=none |
| green-belt-area:C3 | Curated Observation schema | pass |  |
| green-belt-area:C4 | Row count / uniqueness | pass | rows=207 dupes=0 |
| green-belt-area:C5 | Independent raw recompute / spot check | pass | england_points=21 last=1632730.0 expected=1632730.0 |
| land-use-stock:C1 | Checksum raw=manifest | pass | 395007ff30ae0b1648d92d6d85679d08ba1fc2d582dc96a2463df41d7e425677 |
| land-use-stock:C2 | Manifest contract + owner + geography | pass | missing=none |
| land-use-stock:C3 | Curated Observation schema | pass |  |
| land-use-stock:C4 | Row count / uniqueness | pass | rows=14 dupes=0 |
| land-use-stock:C5 | Independent raw recompute / spot check | pass | developed_share=8.7 |
| planning-decisions-granted:C1 | Checksum raw=manifest | pass | ec1936b8bbf885a643c860e3d96772759a7066214899bd7590e1c35c0af2bf8b |
| planning-decisions-granted:C2 | Manifest contract + owner + geography | pass | missing=none |
| planning-decisions-granted:C3 | Curated Observation schema | pass |  |
| planning-decisions-granted:C4 | Row count / uniqueness | pass | rows=171 dupes=0 |
| planning-decisions-granted:C5 | Independent raw recompute / spot check | pass | rows=171 ods_quarters=57 series=['applications-decided', 'applications-received', 'decisions-granted'] last=65211.0 |

Overall: **pass**


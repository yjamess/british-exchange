# QA — Housing wave 2026-11-03

Independent read-only checks against `data/housing/`.

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| house-price-to-earnings-ratio:C1 | Checksum raw=freeze=manifest | pass | 585bc98112e801fc3dd45dbc5238d05c6507d4e48dc3ec3afab4867eded1c2f4 |
| house-price-to-earnings-ratio:C2 | Manifest contract + owner + geography | pass | missing=none; geo_ok=True |
| house-price-to-earnings-ratio:C3 | Curated Observation schema | pass |  |
| house-price-to-earnings-ratio:C4 | Row count / uniqueness | pass | rows=29 expected=29 dupes=0 |
| house-price-to-earnings-ratio:C5 | Independent raw recompute / spot check | pass | AFF1 1c England 1997/2021/2025 |
| uk-average-house-price:C1 | Checksum raw=freeze=manifest | pass | b00756d0c39f356d17fadf93c42af75ccc48f7123cd666e602c65260d081b6c9 |
| uk-average-house-price:C2 | Manifest contract + owner + geography | pass | missing=none; geo_ok=True |
| uk-average-house-price:C3 | Curated Observation schema | pass |  |
| uk-average-house-price:C4 | Row count / uniqueness | pass | rows=701 expected=701 dupes=0 |
| uk-average-house-price:C5 | Independent raw recompute / spot check | pass | UK rows=701 last=273037 |
| private-rental-price-index:C1 | Checksum raw=freeze=manifest | pass | 0d79a0b23041b200748edc84526aff286379f59e2367aeeb57ebb8813517a73c |
| private-rental-price-index:C2 | Manifest contract + owner + geography | pass | missing=none; geo_ok=True |
| private-rental-price-index:C3 | Curated Observation schema | pass |  |
| private-rental-price-index:C4 | Row count / uniqueness | pass | rows=141 expected=141 dupes=0 |
| private-rental-price-index:C5 | Independent raw recompute / spot check | pass | PIPR UK index rows=141 |
| housing-completions:C1 | Checksum raw=freeze=manifest | pass | 97752ab5cbee6e7491b207e2eaebbfd798b0bda73c2d91300f085ef79d6031e6 |
| housing-completions:C2 | Manifest contract + owner + geography | pass | missing=none; geo_ok=True |
| housing-completions:C3 | Curated Observation schema | pass |  |
| housing-completions:C4 | Row count / uniqueness | pass | rows=194 expected=194 dupes=0 |
| housing-completions:C5 | Independent raw recompute / spot check | pass | ODS quarterly periods=194 col=8 |
| dwelling-stock-by-tenure:C1 | Checksum raw=freeze=manifest | pass | ecd02eb8e520e4fef7878bda35db002ca2360cb45112416db6619863b211a1fa |
| dwelling-stock-by-tenure:C2 | Manifest contract + owner + geography | pass | missing=none; geo_ok=True |
| dwelling-stock-by-tenure:C3 | Curated Observation schema | pass |  |
| dwelling-stock-by-tenure:C4 | Row count / uniqueness | pass | rows=444 expected=444 dupes=0 |
| dwelling-stock-by-tenure:C5 | Independent raw recompute / spot check | pass | tenures=['all-dwellings', 'local-authority', 'other-public-sector', 'owner-occupied', 'private-registered-provider', 'private-rented'] |

Overall: **pass**


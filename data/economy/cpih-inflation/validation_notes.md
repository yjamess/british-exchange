# Validation notes — cpih-inflation (Economy self-check)

**Date:** 2026-11-11  
**Indicator:** `cpih-inflation` (ONS L55O / MM23)  
**Connector:** `economy.connectors.cpih_inflation`  
**Status:** Validation-ready. **This is a self-check, not independent QA. Not Ready.**

| Artefact | Path |
|----------|------|
| Manifest | `data/economy/cpih-inflation/manifest.yaml` |
| Raw | `raw/2026-11-11/l55o_mm23.json` |
| Curated | `curated/observations.csv` (453 monthly rows) |

## Self-check

- CDID **L55O** · dataset **MM23** · title `CPIH ANNUAL RATE 00: ALL ITEMS 2015=100` · unit `%`
- Raw sha256 `7783d086411a1b3aa8c776eb219e328799a522e2ef8e0c171b80d9fabcb53120` = manifest checksum
- ONS release date 2026-10-20; ONS `nextRelease` 18 November 2026
- Curated vs raw `months` array: 453/453 rows match (period and value), 0 diffs
- 0 duplicate periods, 0 missing values
- Range 1989-01 → 2026-09. Latest **2026-09 = 3.6** (matches the 3.6 spot in `docs/handover-economy-01-inflation.md` §2.3)
- Distinct from `cpi-inflation` (D7G7): same month 2026-09 is 3.5 there vs 3.6 here
- Distinct from `cpih-index` (L522): that is an index level (144.0), this is a rate

## Not yet checked (for Validation)

- Compare a sample of months against the published ONS CPIH bulletin / reference table, not only the same `/data` JSON the connector read
- Cross-check the rate against 12-month change in `cpih-index` (L522). Expect small differences from ONS rounding (rate is published to 1 dp)
- Confirm the first-month value (1989-01 = 5.7) and a mid-history spot (e.g. a 2022 peak month)

## Link changes made with this ingest

`related_indicator_ids` now include `cpih-inflation` in the manifests of `cpih-index`, `cpi-inflation` and `cpi-index`, and vice versa. Raw pins and checksums of those three were **not** touched; only the related-id list was rewritten from the shared spec. This also removed a duplicate `cpi-index` entry from the `cpih-index` manifest.

## Hand-off

QA: not yet scheduled. Registry → **Validation** (https://app.notion.com/p/415654717685815b877cc6795dac6273). Re-pin after the 2026-11-18 ONS release.

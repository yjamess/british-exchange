# Housing atlas presentation bundle

Status: **experimental; not a Ready indicator**. Independent QA and publication review are required. This is a derived view of archived source data, not a new source ingestion.

## Reproduce

From the repository root, after installing the project with `uv sync`:

```sh
uv run python -m housing.connectors.housing_atlas
```

The procedure needs no network. It reads the existing `uk-average-house-price` raw archive, verifies its recorded SHA-256, and reuses the original publisher release and retrieval timestamps. It also reads the existing curated `dwelling-stock-by-tenure`, `housing-completions`, `private-rental-price-index` and `house-price-to-earnings-ratio` packages after verifying their raw archives.

Output is deterministic for unchanged archives and manifests. `atlas-manifest.yaml` records source paths/checksums/timestamps, output checksums, excluded geographies and transformations. Its deliberate nonstandard filename keeps this experimental JSON bundle out of the canonical CSV catalogue, which otherwise treats every `manifest.yaml` as an importable indicator.

## Files

- `curated/atlas.json`: monthly HPI arrays for supported geographic levels, from January 1995 (all measures nested).
- `curated/atlas-{measure}.json`: one-measure slices for the Housing map (~1MB each) so the UI never parses the full archive.
- `curated/topics.json`: existing housing topic observations, suitable for distinct national time/proportion views.
- `atlas-manifest.yaml`: source inventory, SHA-256 evidence, exclusions, measure dictionary and coverage.
- `validation_report.md`: owner verification notes; independent validation is maintained separately by Validation.
- Connector: `src/housing/connectors/housing_atlas.py`.

## Atlas data dictionary

| Field | Type | Meaning |
|---|---|---|
| `months` | string[] | Contiguous calendar months, YYYY-MM, shared by every value array. |
| `measures` | object[] | `id`, display `label`, and `unit` (GBP or sales). |
| `areas[].code` | string | Exact source ONS-style geography code; never inferred from a place name. |
| `areas[].name` | string | Source area name, preserved verbatim. |
| `areas[].level` | enum | `local`, `region` (English regions), `nation`, or `uk`. |
| `areas[].values[measure]` | (number/null)[] | Source numeric value at the corresponding `months` index. Null is unavailable; zero remains zero. |
| `source` | object | Publisher, canonical landing URL, official release date, source version, licence, original retrieval timestamp, raw SHA-256. |
| `caveats` | string[] | Geographic, temporal, methodological and publication limitations. |

Each non-null array position is a typed observation with geography supplied by its parent area, calendar period by `months`, measure/unit by `measures`, and source version by `source`. Calendar months imply first/last calendar day period bounds. All observations belong to the pinned source release. The compact format does not assign final/provisional status to individual HPI cells; recent estimates can revise.

`local` includes E06 unitary authorities, E07 non-metropolitan districts, E08 metropolitan districts, E09 London boroughs, W06 Welsh unitary authorities, S12 Scottish council areas and N09 Northern Ireland districts. E12 supplies English regions; E92/W92/S92/N92 supply the four nations; K02000001 is the UK. E10 counties, E11 metropolitan counties, E13 Inner/Outer London, K03 Great Britain and K04 England/Wales are explicitly excluded rather than mislabeled as one of the supported levels.

Series start dates differ. Northern Ireland HPI information is quarterly, even where the source repeats values in calendar-month rows. Use only exact source-code boundary joins. A present-day boundary must not be silently substituted for a historic or abolished code. The file may contain historic area definitions. Do not infer postcode- or property-level values from this dataset.

Annual change is `(value[t] / value[t-12] - 1) * 100` for the same area and measure, only where both source values exist and the denominator is positive. Prices are nominal, not inflation-adjusted. Different measures can end in different months; preserve nulls when moving the time control. Do not aggregate area prices by summing or taking an unweighted mean.

## Topic data dictionary

`tenure` contains `{year, owner, privateRented, social, total, status}` in dwelling counts. Only complete 31 March snapshots are included: owner occupied, private rented, local authority, private registered provider, other public sector and total must all have non-null values. Social is the sum of the three social/public components. Share displays should divide each component by the sum of the components; retain the official `total` separately because rounding can make it differ from the sum. Zero is a valid observed component. These are shares of dwellings, not households. Tenure `status` is `provisional` when its archived ODS Notes contains `[p]`, otherwise `final`; optional `sourceFlags` preserves the exact Notes text, including revisions.

`completions`, `rent`, and `affordability` contain `{period, value, status}`. Period is the source period start (YYYY-MM-DD); value is number or null; status preserves the curated status except that completion row-level `[p]`/`[r]` flags are recovered from the archived ODS Notes column. Provisional takes precedence over revised; missing remains missing. Completions are England quarterly new-build dwellings, rent is UK monthly index (January 2023=100), and affordability is England annual workplace-based price-to-earnings ratio.

`sources` keys match those four topic names. Each entry provides publisher, source URL, official release date, unit and geography. Complete source lineage and checksum evidence is recorded in the manifest. Rental annual change and four-consecutive-quarter completion totals may be calculated by the view, with missing periods breaking the calculation.

## Recovered source status flags

Independent QA found that the existing canonical completion and stock connectors omit row-level flags from the archived ODS Notes columns. LT213 marks 2026 Q2 `[p]`, while its curated CSV says final. LT104 marks 2022–2025 `[p]` (2024 also `[r]`), while its curated component rows say final.

The experimental export recovers these flags directly from the already checksum-verified archives. Completion rows with `[r]` only receive revised status; `[p]` takes precedence when both occur. Tenure status is provisional/final. Optional `sourceFlags` retains original note text for both exports. The manifest records all nonempty source flags and this discrepancy. Canonical CSV files and their manifests are **not altered**; their underlying connectors need a separately reviewed correction.

## Publication boundary

This export does not introduce Price Paid transactions, rents in pounds, local affordability, postcode coordinates or boundaries. It makes no claim that all HPI areas have matching geometries. New geographic layers require their own version and licence record, exact-code join audit and independent QA. Existing source registry records remain authoritative; no existing source data is overwritten.

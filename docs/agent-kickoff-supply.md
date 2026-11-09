# Kickoff — Housing Domain 05 Construction & Supply

**Brief:** [Construction & Supply](https://app.notion.com/p/40e65471768581ffb44ef707f8ccf483)  
**Question (locked):** How many homes is Britain building, where are they being built, and why does the number delivered differ from the number planned?  
**Owner:** Housing (connectors + registry); Orchestrator (canvas / Supply Machine UI); Validation after ingest.  
**Rule:** Finish Domain 05 fully before Domain 06 (Planning & Land).

## Non-negotiables

- England figures stay labelled England — never “UK” / “Britain” totals from England-only tables.
- Completions ≠ net additions ≠ permissions. Do not treat same-year permissions and completions as a stalled-homes cohort.
- Planning applications remain Domain 06 territory; permissions appear here only as pipeline **context**.
- Reuse `housing-completions` and `planning-decisions-granted` — no duplicate pipelines.
- Supply Machine marks scale from published counts; no decorative buildings as fake home counts.

## Already Ready

| Indicator | Geography | Use |
|-----------|-----------|-----|
| `housing-completions` | England (`E92000001`) quarterly (Live Table 213) | Completions time series; extend for starts / tenure |
| `planning-decisions-granted` | England quarterly | Pipeline context only (Domain 06 owns planning product) |
| `dwelling-stock-by-tenure` / region / district | England | Denominator for rate per 1,000 dwellings |

## Target views (Notion)

**Supply · Pipeline · Geography · Who builds · Data** — default opens the **Housing Supply Machine**.

| View | Needs |
|------|--------|
| Supply (Machine) | Net additions + components (new build, conversions, change of use, other gains, demolitions) |
| Pipeline | Permissions / starts / completions as **unmatched** period series + caveats |
| Geography | Net additions or completions by region / LA (+ rate vs stock) |
| Who builds | Tenure / builder split from Table 213 (+ affordable supply when Ready) |
| Data | Table + download of curated observations |

## Ingest sequence

1. **Net additional dwellings + components** — MHCLG Live Tables 118 / 120 (England; regional from 118). Flagship QA target: 208,600 net / 190,600 new build in 2024–25 (provisional; verify against pinned release).
2. **Extend Table 213** — starts + tenure/builder columns where published (same ODS as completions).
3. **Geography** — Table 122 (LA net additions); optional Table 123 component flows.
4. **Affordable housing supply** — MHCLG affordable housing release (Who builds / affordable delivery).
5. **UI** — Supply Machine graphic + view tabs; Validation QA file under `data/qa/`.

## Registry rows to create

| Indicator ID | Source |
|--------------|--------|
| `net-additional-dwellings` | Live Table 118 (England + regions; components via series=) |
| `housing-starts` | Live Table 213 starts (or related house-building table) |
| `affordable-housing-supply` | MHCLG affordable housing statistics |
| `net-additions-by-authority` | Live Table 122 (Geography) |

Components may live as `series=` dimensions on `net-additional-dwellings` rather than separate indicators (one source → many series; one registry row for the indicator concept is fine if notes/dimensions are clear).

## QA anchors (verify on pin)

- England 2024–25: **208,600** net additional dwellings (provisional).
- Of which new build **190,600**; change of use **17,710**; conversions **3,850**; other gains **1,080**; demolitions **4,630**.
- Release page: [Housing supply: net additional dwellings, England: 2024 to 2025](https://www.gov.uk/government/statistics/housing-supply-net-additional-dwellings-england-2024-to-2025/housing-supply-net-additional-dwellings-england-2024-to-2025).
- Live tables: [net supply of housing](https://www.gov.uk/government/statistical-data-sets/live-tables-on-net-supply-of-housing).

# Handover — Economy Domain 01 · Inflation & Prices (Wave A, Gate 2)

**Author:** Economy domain subagent · **Date:** 2026-11-11
**Notion plan:** [01 · Inflation & Prices](https://app.notion.com/p/41465471768581d09883c708f8f5f27c)
**Kickoff:** [agent-kickoff-economy-01-inflation.md](agent-kickoff-economy-01-inflation.md)
**Overlap matrix:** [economy-overlap-matrix.md](economy-overlap-matrix.md)
**Scope of this pass:** datasets + Notion only. No frontend, no `sector-pages.ts`, no brand edits.

> **Status:** evidence ready for Validation. **Nothing here is claimed Validation-passed by this
> handover.** Two of three pins already carry earlier QA (see §1.3); `cpi-index` does not.

---

## 1. Dataset foundation

### 1.1 Pins

| `indicator_id` | ONS CDID / dataset | Measure | Unit | Rows | Range | Latest |
|----------------|--------------------|---------|------|------|-------|--------|
| `cpi-inflation` | **D7G7** / MM23 | CPI all items, **annual rate** | % | 453 | 1989-01 → 2026-09 | **3.5** |
| `cpi-index` | **D7BT** / MM23 | CPI all items, **index** (2015=100) | index | 465 | 1988-01 → 2026-09 | **144.1** |
| `cpih-index` | **L522** / MM23 | CPIH all items, **index** (2015=100) | index | 465 | 1988-01 → 2026-09 | **144.0** |

All: United Kingdom `K02000001` · monthly · OGL v3.0 · ONS release **2026-10-20** · `observation_status=provisional`.
**CPI ≠ CPIH.** D7G7/D7BT are CPI; L522 is CPIH (includes owner-occupiers' housing costs).

### 1.2 Paths, connectors, checksums

| Indicator | Manifest | Raw pin | sha256 (raw) | Connector |
|-----------|----------|---------|--------------|-----------|
| `cpi-inflation` | `data/economy/cpi-inflation/manifest.yaml` | `raw/2026-11-03/d7g7_mm23.json` | `f05709a7d468e40599e8f9fe385ce8c42667b8bd49264e65b4ec0c6c5e787604` | `economy.connectors.cpi_inflation` |
| `cpi-index` | `data/economy/cpi-index/manifest.yaml` | `raw/2026-11-04/d7bt_mm23.json` | `a0e630b09306a449f79de41ced22bb5640f34c6cab6923900a4fb8b101c69c93` | `economy.connectors.cpi_index` |
| `cpih-index` | `data/economy/cpih-index/manifest.yaml` | `raw/2026-11-07/l522_mm23.json` | `883b0b911e2977ddb0c1aecbe99e42f3b5c45367f868e245579f84801982ce80` | `economy.connectors.cpih_index` |

- Curated: `data/economy/<id>/curated/observations.csv` (shared `Observation` header).
- Connector source: `src/economy/connectors/{cpi_inflation,cpi_index,cpih_index}.py`; series specs in
  `labour_prices_series.py`; shared ONS JSON parsing in `ons_timeseries.py`.
- Re-run: `uv run python -m economy.connectors.cpi_inflation` (same for `cpi_index`, `cpih_index`).
- Source URLs (from manifests): `https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/{d7g7,d7bt,l522}/mm23` (data: `…/data`).

### 1.3 Registry URLs and status

| Indicator | Notion registry | Status in Notion | Prior QA |
|-----------|-----------------|------------------|----------|
| `cpi-inflation` | https://app.notion.com/p/40d65471768581fd992ff976385c80eb (in manifest) | Ready, Last checked 2026-11-03 | `data/qa/qa_report_economy_y1_labour_prices_2026-11-03.md` — pass |
| `cpih-index` | https://app.notion.com/p/4116547176858108a814ff7231de2f77 (**found by search; manifest field is empty**) | Ready (per `validation_notes.md`) | `data/qa/qa_report_cpih_index_2026-11-07.md` — pass |
| `cpi-index` | **No row found**; manifest `notion_registry_url` is empty | — | **None** (only mentioned as a distinct twin in the CPIH QA) |

### 1.4 Re-check performed 2026-11-11

Live ONS `/data` JSON for D7G7, D7BT and L522 fetched and compared with the pins.

| Check | D7G7 | D7BT | L522 |
|-------|------|------|------|
| Live payload sha256 = manifest checksum | yes | yes | yes |
| Curated rows vs live `months` (value-by-value) | 453/453, 0 diffs | 465/465, 0 diffs | 465/465, 0 diffs |
| Duplicates / missing values in curated | 0 / 0 | 0 / 0 | 0 / 0 |
| ONS release date | 2026-10-20 | 2026-10-20 | 2026-10-20 |

- ONS reports **next release 18 Nov 2026** (October CPI). Until then all three pins are **current**; no refresh was needed and none was done.
- `cpi-inflation` raw file was **missing locally** (`data/**/raw/**` is gitignored, and it wasn't in the archive index). Restored on 2026-11-11 by saving the live payload to `raw/2026-11-03/d7g7_mm23.json`. Its checksum equals the manifest checksum, so the manifest was **not** touched (`retrieved_at` still 2026-11-03).
- New notes: `data/economy/cpi-inflation/validation_notes.md`, `data/economy/cpi-index/validation_notes.md` (`cpih-index/validation_notes.md` already existed).

### 1.5 Dimensions

Notes follow `series=<CDID>; dataset=MM23; month=MM; monthly`. **No category dimension exists** on any of the three pins. There is no COICOP key, region key or weights key. Geography is UK only.

### 1.6 Known manifest nits (not fixed — need a connector rerun, Economy-owned, low risk)

- `cpi-inflation` unit string `% annual rate (CPI all items, 2015=100 base for index companion)` mixes in an index base year. A rate has no base year.
- `cpih-index` `related_indicator_ids` lists `cpi-index` twice.
- `cpi-index` and `cpih-index` `notion_registry_url` are empty.

---

## 2. Research scope

### 2.1 Questions

1. How fast are UK consumer prices rising now, and how does that compare with history (1989 →)?
2. What does a pound buy over time? (index levels, rebased / deflator use)
3. How do CPI and CPIH differ, and when does the gap open? (owner-occupiers' housing costs)
4. *(Not yet answerable)* Which categories drive inflation? (COICOP contributions)
5. *(Not yet answerable)* What do everyday items cost? (average prices)

### 2.2 Coverage today

| Question | Supported by | Verdict |
|----------|--------------|---------|
| 1 | `cpi-inflation` | Yes — monthly, 1989-01 → 2026-09 |
| 2 | `cpi-index`, `cpih-index` | Yes — monthly, 1988-01 → 2026-09 |
| 3 | `cpi-index` vs `cpih-index` (index level only) | Partial — index levels yes; **no CPIH annual rate** pinned |
| 4 | — | No |
| 5 | — | No |

### 2.3 Gap list with verified sources (2026-11-11)

I confirmed these exist as ONS timeseries on the same MM23 dataset (title, CDID, span, latest). **Not ingested.**

| Gap | Candidate series | Verified | Notes |
|-----|------------------|----------|-------|
| CPIH annual rate, all items | **L55O** | "CPIH ANNUAL RATE 00: ALL ITEMS", 453 months, 1989-01 → 2026-09, latest **3.6** | Cheapest next pin; same connector pattern. Needed for a like-for-like CPI-vs-CPIH rate view. |
| CPI annual rate by COICOP division | e.g. **D7G8** (01 food) | "CPI ANNUAL RATE 01: FOOD AND NON-ALCOHOLIC BEVERAGES", 453 months, latest 1.3 | One series per division (01–12), so ~12 CDIDs. Need the full CDID map from MM23 before scoping. |
| CPI index by COICOP division | e.g. **D7BU** (01 food), **D7BV** (02 alcohol/tobacco) | 465 months, latest 144.3 / 160.2 | Same one-series-per-division shape. |
| CPIH annual rate by COICOP | e.g. **L55P** (01 food) | 453 months, latest 1.3 | CPIH category rates exist; do not mix with CPI categories. |
| Contributions (percentage points) | ONS "contributions to CPI/CPIH annual rate" tables | **Not verified** | Likely a separate ONS dataset/table (not a plain `timeseries/<cdid>/mm23`). Needs sourcing; may need computing from weights × index, which would be an Exchange derivation and must be labelled as one. |
| Basket weights | ONS annual CPI weights | **Not verified** | Needed for contribution derivation and for "Notes foot" basket caveats. |
| Average prices / everyday basket | ONS average price data (selected items) | **Not verified** | Stays **planned-not-ready**. Do not use retailer shelf scrapes. |

CDIDs above are only as confirmed by the live fetch; no mapping beyond those five was checked.

### 2.4 Limitations

- Headline CPI/CPIH only. No categories, regions, weights or average prices.
- All values carry `observation_status=provisional` from the connector (the shared default for ONS pulls). The manifests note that ONS can revise; the label is conservative and says nothing about how often a given month actually changes.
- 2015=100 base for index levels. Anything labelled "real" or "in today's money" is an Exchange restatement, not an ONS series.
- UK-wide only (`K02000001`). No devolved or regional inflation is pinned; any regional source has not been scoped.
- CPIH is the preferred ONS measure for household costs but is **not** the Bank of England target measure (CPI). Never swap labels.
- Housing and Energy already consume `cpi-index` / `cpih-index`. Any change of base or units here has downstream effects.

---

## 3. Notion plan summary

Matured on [01 · Inflation & Prices](https://app.notion.com/p/41465471768581d09883c708f8f5f27c).

- **Question (provisional, lock at end of G2):** How fast are prices rising in Britain, what does money buy, and how do CPI and CPIH differ?
- **Flagship (planned):** *The Changing Price of Britain* — CPI / CPIH history with an explicit measure switch; Notes foot carries basket/weight caveats.
- **Distinctive graphics, all planned-not-ready:**
  - Category contribution bars → needs COICOP series + contributions/weights.
  - Everyday basket plate → needs verified official average-price series.
- **Tech requirements:**
  - Reuse `TimeChart` / `RankBars`; Explorer shell unchanged.
  - Separate CPI vs CPIH everywhere; never label CPIH as CPI.
  - Energy Follow links `cpih-index` by id.
  - Real-terms is an Exchange restatement and must be labelled so.
- **Do not:** ship `/economy` canvases or new brand components; duplicate CPIH under Energy; present retailer prices as ONS averages.

---

## 4. Handover

### 4.1 Files

| Path | Purpose |
|------|---------|
| `docs/handover-economy-01-inflation.md` | This file |
| `data/economy/{cpi-inflation,cpi-index,cpih-index}/manifest.yaml` | Contract manifests |
| `data/economy/{cpi-inflation,cpi-index,cpih-index}/curated/observations.csv` | Typed observations |
| `data/economy/{cpi-inflation,cpi-index,cpih-index}/raw/…` | Pinned ONS JSON (gitignored; local copy present for all three) |
| `data/economy/{cpi-inflation,cpi-index,cpih-index}/validation_notes.md` | Self-check notes (new for the first two) |
| `src/economy/connectors/{cpi_inflation,cpi_index,cpih_index}.py`, `labour_prices_series.py`, `ons_timeseries.py` | Connectors |

### 4.2 Indicator IDs, dimensions, dependencies

- IDs: `cpi-inflation`, `cpi-index`, `cpih-index`. Dimensions: geography `K02000001` only; no category dimension.
- Downstream consumers (do not fork, do not rename):
  - Energy Prices → `cpih-index` (real-terms bills).
  - Housing → `cpi-index` (real house prices).
  - `src/britain_exchange/chart_contract.py` maps `cpi-inflation` and `cpi-index` to measure family `cpi`.
- Upstream: ONS Consumer price inflation (MM23), monthly; next release **2026-11-18**.

### 4.3 Validation requirement before anything is treated as trusted

| Indicator | Needs Validation? | Why |
|-----------|-------------------|-----|
| `cpi-inflation` | Light re-check after 2026-11-18 | Already QA-passed 2026-11-03; re-verified by Economy against live ONS on 2026-11-11 (self-check only) |
| `cpih-index` | Light re-check after 2026-11-18 | QA-passed 2026-11-07; re-verified by Economy 2026-11-11 (self-check only) |
| `cpi-index` | **Yes — first formal QA** | Never QA'd individually, no Notion registry row found, yet already consumed by Housing and listed in `sector-pages.ts` |
| Any new COICOP / L55O pin | **Yes** | Not ingested yet |

Registry status was **not changed** by this pass.

### 4.4 Blocked / open items

1. **COICOP / category inflation** — not ingested. Series are available (§2.3); needs the CDID map and an Orchestrator decision on scope (CPI vs CPIH categories, rate vs index, 12 divisions).
2. **Contributions & weights** — source unverified; may be an Exchange derivation.
3. **Average prices / everyday basket** — planned-not-ready; official source not yet sourced or registered.
4. **`cpi-index` registry row** — missing; Orchestrator/Validation to create or locate.
5. **CPIH annual rate (L55O)** — **ingested 2026-11-11** as `cpih-inflation` (Validation-ready, not Ready). See [handover-economy-01-l55o.md](handover-economy-01-l55o.md).
6. **Orchestrator-owned inconsistency:** `src/britain_exchange/chart_contract.py` still sets `"is_cpih": False` with the comment "CPIH is not in the Ready catalogue". `cpih-index` is now Ready, and `MEASURE_FAMILY` has no `cpih-index` entry (it would fall back to its own id). Not touched by me.
7. **Post-release refresh** — repin all three after 2026-11-18 if the release moves the numbers (Economy task, monthly cadence).
8. Manifest nits in §1.6.

### 4.5 Recommended G3 views (requirements only — no UI built)

1. **Changing Price of Britain (flagship).** Monthly CPI annual rate (`cpi-inflation`) with the 1989 → now run. A clear "Measure" switch: CPI vs CPIH. The CPIH rate needs L55O first; until then CPIH can only be shown as index level.
2. **What a pound buys.** `cpi-index` and `cpih-index` indexed lines, rebasing control. Real-terms is labelled as an Exchange restatement.
3. **CPI vs CPIH gap.** Two index lines or a rate difference. Requires L55O for the rate gap.
4. **Category contributions (planned-not-ready).** Needs COICOP series + weights. Do not mock with fake data.
5. **Everyday basket plate (planned-not-ready).** Needs official average-price items. Never retailer scrapes.

Each view: source line (publisher, CDID, period, release 2026-10-20, indicator id); CPI and CPIH never share a label.

### 4.6 Suggested next orchestrator actions

1. Schedule Validation for `cpi-index`, and a post-18-Nov light re-check for all three.
2. Decide G3 scope: ingest L55O (cheap) and COICOP set (larger) before G3, or ship flagship with headline measures only.
3. Fix `chart_contract.py` CPIH flags if the CPIH view ships.

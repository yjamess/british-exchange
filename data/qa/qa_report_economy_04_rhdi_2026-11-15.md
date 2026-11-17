# QA report — Economy 04 RHDI / living-standards pins · 2026-11-15

## Scope

- Domain: [04 · Household Finances & Living Standards](https://app.notion.com/p/4146547176858147ba12d76094388df9)
- Kickoff: `docs/agent-kickoff-validation-economy-04-rhdi.md`
- Handover: `docs/handover-economy-04-household.md`
- Packages: `real-household-disposable-income` (DG2R),
  `real-household-disposable-income-per-head` (CRXX),
  `household-saving-ratio` (DGD8 companion)
- Vintage: UKEA raw `2026-11-15` · JSON `releaseDate` **2026-09-29**
  (ONS landing **30 September 2026**). Next UKEA listed 22 December 2026.
- Script: `validation.qa_economy_04_rhdi_2026_11_15`
- Out of scope: mortgage-rate, ETB, Ledger / Cost of Living / Buffer / Debt,
  HBAI, real household consumption.

## Independence

Pinned raw SHA-256 checked against manifests. Live ONS `/timeseries/<cdid>/ukea/data`
JSON re-fetched on 2026-11-15 and compared quarter-for-quarter to the pin.
HTML landing tables used for first / mid / last spots. Curated CSVs were not edited.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | live ONS /data fetch (all three) | **pass** | independent re-fetch of DG2R/CRXX/DGD8 JSON |
| C1 | DG2R files + connector | **pass** | raw=dg2r_ukea.json |
| C1 | DG2R checksum | **pass** | disk=cd6c516e9009a2e5… |
| C5 | DG2R licence + connector + CDID | **pass** | licence=Open Government Licence v3.0 module=economy.connectors.real_household_disposable_income |
| C3 | DG2R UK geo + SA + units | **pass** | geo=United Kingdom (K02000001); excl. Crown dependencies; unit=£ million chained volume, SA (households S.14) |
| C3 | DG2R ONS series title | **pass** | Households (S.14): Real households' disposable income at chained volume measures (reference year 2024): £m: SA |
| C3 | DG2R CVM reference year 2024 | **pass** | Households (S.14): Real households' disposable income at chained volume measures (reference year 2024): £m: SA |
| C3 | DG2R ESA S.14 in ONS title | **pass** | Households (S.14): Real households' disposable income at chained volume measures (reference year 2024): £m: SA |
| C1 | DG2R live JSON == pin | **pass** | live_n=286 pin_n=286 |
| C5 | DG2R vintage 2026-09-29 JSON / 30 Sep landing | **pass** | releaseDate=2026-09-29T23:00:00.000Z; landing date is 30 September 2026 UK |
| C4 | DG2R observation count | **pass** | n=286 expected=286 |
| C3 | DG2R curated geography | **pass** | codes=['K02000001'] labels=['United Kingdom'] |
| C6 | DG2R provisional = latest quarter only | **pass** | prov=1 latest=2026-04-01 status=provisional |
| C1 | DG2R pin quarters == curated (full recon) | **pass** | all quarters match |
| C2 | DG2R first/last curated | **pass** | first=1955-01-01 78185.0; last=2026-04-01 457927.0 |
| C2 | DG2R spot 1955 Q1 | **pass** | expected=78185.0 curated=78185.0 html=78185.0 |
| C2 | DG2R spot 1990 Q4 | **pass** | expected=226895.0 curated=226895.0 html=226895.0 |
| C2 | DG2R spot 2010 Q1 | **pass** | expected=360389.0 curated=360389.0 html=360389.0 |
| C2 | DG2R spot 2020 Q2 | **pass** | expected=426121.0 curated=426121.0 html=426121.0 |
| C2 | DG2R spot 2024 Q1 | **pass** | expected=440927.0 curated=440927.0 html=440927.0 |
| C3 | DG2R not substituted with NRJR (S.14+S.15) | **pass** | NRJR listed as link-only in source_register |
| C1 | CRXX files + connector | **pass** | raw=crxx_ukea.json |
| C1 | CRXX checksum | **pass** | disk=172d03bff5669c51… |
| C5 | CRXX licence + connector + CDID | **pass** | licence=Open Government Licence v3.0 module=economy.connectors.real_household_disposable_income_per_head |
| C3 | CRXX UK geo + SA + units | **pass** | geo=United Kingdom (K02000001); excl. Crown dependencies; unit=£ chained volume per head, SA |
| C3 | CRXX ONS series title | **pass** | Households: Real disposable Income, per head: Chained volume measure (reference year = 2024) £: Seasonally adjusted |
| C3 | CRXX CVM reference year 2024 | **pass** | Households: Real disposable Income, per head: Chained volume measure (reference year = 2024) £: Seasonally adjusted |
| C3 | CRXX ESA S.14 in ONS title | **warn** | ONS title says Households without ESA code; treated as DG2R companion |
| C1 | CRXX live JSON == pin | **pass** | live_n=286 pin_n=286 |
| C5 | CRXX vintage 2026-09-29 JSON / 30 Sep landing | **pass** | releaseDate=2026-09-29T23:00:00.000Z; landing date is 30 September 2026 UK |
| C4 | CRXX observation count | **pass** | n=286 expected=286 |
| C3 | CRXX curated geography | **pass** | codes=['K02000001'] labels=['United Kingdom'] |
| C6 | CRXX provisional = latest quarter only | **pass** | prov=1 latest=2026-04-01 status=provisional |
| C1 | CRXX pin quarters == curated (full recon) | **pass** | all quarters match |
| C2 | CRXX first/last curated | **pass** | first=1955-01-01 1536.0; last=2026-04-01 6577.0 |
| C2 | CRXX spot 1955 Q1 | **pass** | expected=1536.0 curated=1536.0 html=1536.0 |
| C2 | CRXX spot 1990 Q4 | **pass** | expected=3957.0 curated=3957.0 html=3957.0 |
| C2 | CRXX spot 2010 Q1 | **pass** | expected=5754.0 curated=5754.0 html=5754.0 |
| C2 | CRXX spot 2020 Q2 | **pass** | expected=6385.0 curated=6385.0 html=6385.0 |
| C2 | CRXX spot 2026 Q2 | **pass** | expected=6577.0 curated=6577.0 html=6577.0 |
| C3 | CRXX Notes flag missing ESA code | **pass** | open question recorded; not silently claimed as S.14+S.15 |
| C1 | DGD8 files + connector | **pass** | raw=dgd8_ukea.json |
| C1 | DGD8 checksum | **pass** | disk=aa05f3a111fc2d81… |
| C5 | DGD8 licence + connector + CDID | **pass** | licence=Open Government Licence v3.0 module=economy.connectors.household_saving_ratio |
| C3 | DGD8 UK geo + SA + units | **pass** | geo=United Kingdom (K02000001); excl. Crown dependencies; unit=% of household total resources, SA (current prices) |
| C3 | DGD8 ONS series title | **pass** | Households (S.14): Households' saving ratio (per cent): Current price: £m: SA |
| C3 | DGD8 current prices (not CVM) | **pass** | Households (S.14): Households' saving ratio (per cent): Current price: £m: SA |
| C3 | DGD8 ESA S.14 in ONS title | **pass** | Households (S.14): Households' saving ratio (per cent): Current price: £m: SA |
| C1 | DGD8 live JSON == pin | **pass** | live_n=254 pin_n=254 |
| C5 | DGD8 vintage 2026-09-29 JSON / 30 Sep landing | **pass** | releaseDate=2026-09-29T23:00:00.000Z; landing date is 30 September 2026 UK |
| C4 | DGD8 observation count | **pass** | n=254 expected=254 |
| C3 | DGD8 curated geography | **pass** | codes=['K02000001'] labels=['United Kingdom'] |
| C6 | DGD8 provisional = latest quarter only | **pass** | prov=1 latest=2026-04-01 status=provisional |
| C1 | DGD8 pin quarters == curated (full recon) | **pass** | all quarters match |
| C2 | DGD8 first/last curated | **pass** | first=1963-01-01 4.7; last=2026-04-01 8.8 |
| C2 | DGD8 spot 1963 Q1 | **pass** | expected=4.7 curated=4.7 html=4.7 |
| C2 | DGD8 spot 1990 Q4 | **pass** | expected=11.1 curated=11.1 html=11.1 |
| C2 | DGD8 spot 2010 Q1 | **pass** | expected=12.6 curated=12.6 html=12.6 |
| C2 | DGD8 spot 2020 Q2 | **pass** | expected=27.1 curated=27.1 html=27.1 |
| C2 | DGD8 spot 2026 Q2 | **pass** | expected=8.8 curated=8.8 html=8.8 |
| C7 | DGD8 labelled national-accounts residual (not Buffer) | **pass** | manifest/README treat DGD8 as S.14 residual, not WAS buffer |
| C7 | DGD8 ONS title still says £m | **warn** | ONS title is 'saving ratio (per cent): Current price: £m: SA'; curated unit is percent — documented in README |
| C4 | DG2R/CRXX implied headcount sanity (2026 Q2) | **pass** | £m / £ per head ≈ 69.63 million people — not a published recon |

## Method notes

- **DG2R** ONS title: Households (S.14), CVM, reference year 2024, £m, SA.
- **CRXX** ONS title: Households, CVM per head, reference year = 2024, SA.
  ESA code is **not** printed. Validation **warns**, does not fail: Economy
  records this as an open question and treats CRXX as the DG2R companion.
  Do not substitute NRJR (S.14+S.15) for DG2R.
- **DGD8** ONS title: Households (S.14) saving ratio (per cent), current
  prices, SA. Title still appends `£m`; curated unit is percent. This is a
  **national-accounts residual**, not a typical household buffer and not WAS.
  Handover Notes are strong; not labelled as Financial Buffer → not a fail.
- Provisional policy: latest quarter only (`2026 Q2`). Older quarters `final`
  in curated files even though UKEA still revises history.

## Summary

- **Verdict: pass** (61 pass / 2 warn / 0 fail)
- Recommend Orchestrator **Ready** on the three Phase 1 pins only
  (DG2R, CRXX, DGD8). Do **not** flip mortgage-rate, ETB, or Ledger/Buffer.
- Cloud load of observations is still an Orchestrator / API concern;
  this QA is numerical + methodological vs ONS UKEA.
- Follow-up: re-pin after **22 December 2026** UKEA. Optional: confirm CRXX
  ESA universe with Sector Accounts (not a Ready blocker).

## Blockers

- None for Ready on these three pins.

## Economy fix tasks

- None required to pass this vintage.
- Optional (non-blocking): keep the CRXX S.14 open question on the registry
  row until ONS prints the ESA code, or cite a UKEA table note that CRXX is S.14.


# QA report — Economy 06 Scotland income-tax bands 2017–22 · 2026-11-15

## Scope

- Indicator: `tax-machine-income-tax-history`
- Package: `data/economy/tax-machine-income-tax-history/`
- Handover: `docs/handover-economy-06-scotland-bands.md`
- Kickoff: `docs/agent-kickoff-validation-economy-06-scotland-bands.md`
- Script: `validation.qa_economy_06_scotland_bands_2026_11_15`
- Focus: Scotland `pinned_govscot_hmrc_sit` for **2017–18…2022–23**
- Years recomputed: 2018-19, 2020-21, 2022-23, 2017-18, 2021-22, 2019-20 (primary 2018-19, 2020-21, 2022-23)

## Independence

Disk raw + curated only. After-allowance recomputed from Validation-extracted gross uppers in pinned gov.scot / HMRC SIT HTML + curated UK Personal Allowance (reserved). Does not import Economy `SCOTLAND_BANDS_HISTORICAL`. No curated/raw rewrites. Fiscal drag out of scope.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | checksum sco_2017_18_govscot.html | **pass** | manifest=True SHA256SUMS=True disk=ece5b76b606a79e6 |
| C1 | checksum sco_2018_19_govscot.html | **pass** | manifest=True SHA256SUMS=True disk=acf55c924c063a59 |
| C1 | checksum sco_hmrc_sit_2019.html | **pass** | manifest=True SHA256SUMS=True disk=06472d93a52a8751 |
| C1 | checksum sco_hmrc_sit_2020.html | **pass** | manifest=True SHA256SUMS=True disk=2c15d31c6019c3ff |
| C1 | checksum sco_hmrc_sit_2021.html | **pass** | manifest=True SHA256SUMS=True disk=b25933b88b362f33 |
| C1 | checksum sco_2020_21_govscot.html | **pass** | manifest=True SHA256SUMS=True disk=dab38505afd7ecee |
| C1 | checksum sco_2021_22_budget.html | **pass** | manifest=True SHA256SUMS=True disk=d363f7cc624b0a4e |
| C1 | checksum sco_2022_23_govscot.html | **pass** | manifest=True SHA256SUMS=True disk=b4afd8309b1e4439 |
| C1 | checksum sco_hmrc_sit_2023.html | **pass** | manifest=True SHA256SUMS=True disk=cf019c201aa4a702 |
| C1 | checksum employers_2018_19.html | **pass** | manifest=True SHA256SUMS=True disk=00ca04d6d4f9d6ea |
| C1 | checksum employers_2020_21.html | **pass** | manifest=True SHA256SUMS=True disk=4cbdf3bf61d76ec3 |
| C2 | Scotland 2018-19 coverage_status | **pass** | status=['pinned_govscot_hmrc_sit'] n_bands=5 |
| C2 | Scotland 2018-19 starter | **pass** | gross→after PA=11850: (0,2000 @19%) curated→(0,2000 @19%) |
| C2 | Scotland 2018-19 basic | **pass** | gross→after PA=11850: (2001,12150 @20%) curated→(2001,12150 @20%) |
| C2 | Scotland 2018-19 intermediate | **pass** | gross→after PA=11850: (12151,31580 @21%) curated→(12151,31580 @21%) |
| C2 | Scotland 2018-19 higher | **pass** | gross→after PA=11850: (31581,150000 @41%) curated→(31581,150000 @41%) |
| C2 | Scotland 2018-19 top | **pass** | gross→after PA=11850: (150001,open @46%) curated→(150001,open @46%) |
| C2 | PA reserved UK 2018-19 | **pass** | scotland=11850 ewni=11850 |
| C2 | Scotland 2020-21 coverage_status | **pass** | status=['pinned_govscot_hmrc_sit'] n_bands=5 |
| C2 | Scotland 2020-21 starter | **pass** | gross→after PA=12500: (0,2085 @19%) curated→(0,2085 @19%) |
| C2 | Scotland 2020-21 basic | **pass** | gross→after PA=12500: (2086,12658 @20%) curated→(2086,12658 @20%) |
| C2 | Scotland 2020-21 intermediate | **pass** | gross→after PA=12500: (12659,30930 @21%) curated→(12659,30930 @21%) |
| C2 | Scotland 2020-21 higher | **pass** | gross→after PA=12500: (30931,150000 @41%) curated→(30931,150000 @41%) |
| C2 | Scotland 2020-21 top | **pass** | gross→after PA=12500: (150001,open @46%) curated→(150001,open @46%) |
| C2 | PA reserved UK 2020-21 | **pass** | scotland=12500 ewni=12500 |
| C2 | Scotland 2022-23 coverage_status | **pass** | status=['pinned_govscot_hmrc_sit'] n_bands=5 |
| C2 | Scotland 2022-23 starter | **pass** | gross→after PA=12570: (0,2162 @19%) curated→(0,2162 @19%) |
| C2 | Scotland 2022-23 basic | **pass** | gross→after PA=12570: (2163,13118 @20%) curated→(2163,13118 @20%) |
| C2 | Scotland 2022-23 intermediate | **pass** | gross→after PA=12570: (13119,31092 @21%) curated→(13119,31092 @21%) |
| C2 | Scotland 2022-23 higher | **pass** | gross→after PA=12570: (31093,150000 @41%) curated→(31093,150000 @41%) |
| C2 | Scotland 2022-23 top | **pass** | gross→after PA=12570: (150001,open @46%) curated→(150001,open @46%) |
| C2 | PA reserved UK 2022-23 | **pass** | scotland=12570 ewni=12570 |
| C2 | Scotland 2017-18 coverage_status | **pass** | status=['pinned_govscot_hmrc_sit'] n_bands=3 |
| C2 | Scotland 2017-18 basic | **pass** | gross→after PA=11500: (0,31500 @20%) curated→(0,31500 @20%) |
| C2 | Scotland 2017-18 higher | **pass** | gross→after PA=11500: (31501,150000 @40%) curated→(31501,150000 @40%) |
| C2 | Scotland 2017-18 additional | **pass** | gross→after PA=11500: (150001,open @45%) curated→(150001,open @45%) |
| C2 | PA reserved UK 2017-18 | **pass** | scotland=11500 ewni=11500 |
| C2 | Scotland 2021-22 coverage_status | **pass** | status=['pinned_govscot_hmrc_sit'] n_bands=5 |
| C2 | Scotland 2021-22 starter | **pass** | gross→after PA=12570: (0,2097 @19%) curated→(0,2097 @19%) |
| C2 | Scotland 2021-22 basic | **pass** | gross→after PA=12570: (2098,12726 @20%) curated→(2098,12726 @20%) |
| C2 | Scotland 2021-22 intermediate | **pass** | gross→after PA=12570: (12727,31092 @21%) curated→(12727,31092 @21%) |
| C2 | Scotland 2021-22 higher | **pass** | gross→after PA=12570: (31093,150000 @41%) curated→(31093,150000 @41%) |
| C2 | Scotland 2021-22 top | **pass** | gross→after PA=12570: (150001,open @46%) curated→(150001,open @46%) |
| C2 | PA reserved UK 2021-22 | **pass** | scotland=12570 ewni=12570 |
| C2 | Scotland 2019-20 coverage_status | **pass** | status=['pinned_govscot_hmrc_sit'] n_bands=5 |
| C2 | Scotland 2019-20 starter | **pass** | gross→after PA=12500: (0,2049 @19%) curated→(0,2049 @19%) |
| C2 | Scotland 2019-20 basic | **pass** | gross→after PA=12500: (2050,12444 @20%) curated→(2050,12444 @20%) |
| C2 | Scotland 2019-20 intermediate | **pass** | gross→after PA=12500: (12445,30930 @21%) curated→(12445,30930 @21%) |
| C2 | Scotland 2019-20 higher | **pass** | gross→after PA=12500: (30931,150000 @41%) curated→(30931,150000 @41%) |
| C2 | Scotland 2019-20 top | **pass** | gross→after PA=12500: (150001,open @46%) curated→(150001,open @46%) |
| C2 | PA reserved UK 2019-20 | **pass** | scotland=12500 ewni=12500 |
| C2 | raw needles sco_2017_18_govscot.html | **pass** | needles=['£43,000', '20%', '40%', '45%'] |
| C2 | raw needles sco_2018_19_govscot.html | **pass** | needles=['£13,850', '£43,430', '19%', '41%', '46%'] |
| C2 | raw needles employers_2018_19.html | **pass** | needles=['£2,000', '£31,580', '41%'] |
| C2 | raw needles sco_hmrc_sit_2021.html | **pass** | needles=['£14,585', '£25,158', '£43,430'] |
| C2 | raw needles employers_2020_21.html | **pass** | needles=['£2,085', '£30,930'] |
| C2 | raw needles sco_2021_22_budget.html | **pass** | needles=['£14,667', '£25,296', '£43,662'] |
| C2 | raw needles sco_2022_23_govscot.html | **pass** | needles=['£14,732', '£25,688', '£43,662', '41%', '46%'] |
| C2 | raw needles sco_hmrc_sit_2023.html | **pass** | needles=['£14,732', '£25,688', '£43,662'] |
| C3 | Scotland≠E/W/NI 2017-18 basic | **pass** | scotland.upper_after_allowance_gbp=31500 ewni.upper_after_allowance_gbp=33500 |
| C3 | Scotland≠E/W/NI 2018-19 higher | **pass** | scotland.rate_percent=41 ewni.rate_percent=40 |
| C3 | Scotland≠E/W/NI 2020-21 starter | **pass** | scotland_has_starter=True ewni_has=False |
| C3 | Scotland≠E/W/NI 2022-23 higher | **pass** | scotland.rate_percent=41 ewni.rate_percent=40 |
| C3 | 2018-19 band count Scotland≠E/W/NI | **pass** | scotland_n=5 ewni_n=3 |
| C4 | coverage_inventory 2017-18 | **pass** | scotland_income_tax=pinned_govscot_hmrc_sit |
| C4 | coverage_inventory 2018-19 | **pass** | scotland_income_tax=pinned_govscot_hmrc_sit |
| C4 | coverage_inventory 2019-20 | **pass** | scotland_income_tax=pinned_govscot_hmrc_sit |
| C4 | coverage_inventory 2020-21 | **pass** | scotland_income_tax=pinned_govscot_hmrc_sit |
| C4 | coverage_inventory 2021-22 | **pass** | scotland_income_tax=pinned_govscot_hmrc_sit |
| C4 | coverage_inventory 2022-23 | **pass** | scotland_income_tax=pinned_govscot_hmrc_sit |
| C4 | no remaining 2017–22 gaps in inventory | **pass** | gaps_left=[] |
| C5 | no Ready claim in manifest | **pass** | status_note=Time Machine history pin (+ Scotland 2017–22 fill). Validation-ready, not Ready. |
| C5 | fiscal drag deferred | **pass** | status=deferred examples=None |
| C5 | no UI claim for govscot pin | **pass** | no web/src reference to pinned_govscot_hmrc_sit |
| C6 | 2016-17 Scotland mirror intact | **pass** | sco_basic_upper=32000 ewni=32000 status=pre_divergence_mirrors_ewni |
| C6 | 2023-24 Scotland GOV.UK pin intact | **pass** | starter_upper=2162 top_rate=47 status=pinned_govuk_after_allowance |
| C6 | E/W/NI 2018-19 basic intact | **pass** | basic_upper=34500 higher_rate=40 |

## Spot cells

- 2018-19 starter: after-allowance 0–2000 @19% (PA £11850)
- 2018-19 basic: after-allowance 2001–12150 @20% (PA £11850)
- 2018-19 intermediate: after-allowance 12151–31580 @21% (PA £11850)
- 2020-21 starter: after-allowance 0–2085 @19% (PA £12500)
- 2020-21 basic: after-allowance 2086–12658 @20% (PA £12500)
- 2020-21 intermediate: after-allowance 12659–30930 @21% (PA £12500)
- 2022-23 starter: after-allowance 0–2162 @19% (PA £12570)
- 2022-23 basic: after-allowance 2163–13118 @20% (PA £12570)
- 2022-23 intermediate: after-allowance 13119–31092 @21% (PA £12570)
- diverge 2017-18 basic: scotland.upper_after_allowance_gbp=31500 ewni.upper_after_allowance_gbp=33500
- diverge 2018-19 higher: scotland.rate_percent=41 ewni.rate_percent=40
- diverge 2020-21 starter: scotland_has_starter=True ewni_has=False
- diverge 2022-23 higher: scotland.rate_percent=41 ewni.rate_percent=40
- 2016-17 Scotland basic upper=32000 (mirror E/W/NI)
- 2023-24 starter upper=2162 @19%; top=47%
- Mapping: starter/basic/intermediate upper = gross upper − PA; higher upper / top lower absolute £150,000 / £150,001

## Summary

- **Verdict: pass** (77 pass / 0 warn / 0 fail)
- **Ready recommendation: yes** — Orchestrator may re-load cloud history package + refresh Time Machine Scotland gap copy. Do **not** start fiscal-drag work from this PASS alone; fiscal drag remains deferred.
- Out of scope: Time Machine React redesign; fiscal-drag examples; Notion Ready flip by Validation.

## Blockers

- None for Scotland 2017–22 Validation PASS.
- Orchestrator-owned next: cloud re-load of `tax-machine-income-tax-history` + Time Machine gap-copy refresh; registry note only (same indicator id).
- Fiscal drag remains deferred (`EC-G2-06E-DRAG` queued).

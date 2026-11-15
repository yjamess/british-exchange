# QA report — Economy Domain 08 DMO D8B + D1A — 2026-11-14

**Agent:** Validation
**Overall verdict:** **PASS with warnings** (25 pass · 1 warn · 0 fail)
**Packages:** `dmo-gilt-future-redemptions` (D8B) · `dmo-gilts-in-issue` (D1A)
**Script:** `src/validation/qa_economy_08_dmo_d8b_d1a_2026_11_14.py`
**Independence:** Re-parsed both raw `.xls` files directly with `xlrd`; did **not** import `economy.connectors`; did not edit `data/economy/`.

## Scope

| Field | D8B Future Redemptions | D1A Gilts in Issue |
|-------|------------------------|--------------------|
| Manifest | `data/economy/dmo-gilt-future-redemptions/manifest.yaml` | `data/economy/dmo-gilts-in-issue/manifest.yaml` |
| Raw | `raw/Future Redemptions Nov 14 2026.xls` | `raw/Gilts in Issue Nov 14 2026.xls` |
| Curated | `curated/observations.csv` (141 rows) | `curated/observations.csv` (138 rows) + `headline_check.json` |
| Unit / basis | £ million; **net of government holdings** | £ million nominal / nominal incl. IL uplift; **gross** |
| Date | Data date 2026-11-14 (FY profile) | In issue 2026-11-13 (data date 2026-11-14) |
| Source channel | Browser pin (DMO captcha); no live re-fetch possible | same |
| Not claimed | PSND (HF6W) · issuance forecast · market value · who owns gilts | same |

Live re-fetch from DMO was **not** attempted: matrix documents Perfdrive/captcha on every export endpoint. "Official release" comparison is therefore against the pinned workbook itself (hash-verified), i.e. raw-vs-curated, plus the DMO-stated headline inside the D1A sheet and a D8B↔D1A cross-check.

## Checks — D8B (`dmo-gilt-future-redemptions`)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| A1 | D8B raw SHA-256 = SHA256SUMS = manifest | **pass** | disk `50e75c5e54ae…`; SHA256SUMS `50e75c5e54ae…`; manifest `50e75c5e54ae…` |
| A2 | D8B row count 141 = 47 FY × 3 series | **pass** | curated 141 rows; raw FY rows 47; per series {'conventional': 47, 'index_linked': 47, 'total': 47} |
| A3 | D8B every raw cell == curated value (141 cells) | **pass** | mismatches 0; curated-only keys 0; duplicate keys 0 |
| A4 | FY 2027-28: conv 152,286 · IL 15,164 · total 167,450 (raw and curated) | **pass** | raw (152286.0, 15164.0, 167450.0); curated (152286.0, 15164.0, 167450.0) |
| A5 | conventional + index-linked ≈ total in every FY (±£1m rounding) | **pass** | 47 FY; max /diff/ £0m; failures none |
| A6 | FY labels contiguous 2027-28…2073-74; period = 1 Apr → 31 Mar | **pass** | first 2027-2028, last 2073-2074, contiguous=True, bad periods 0 |
| A7 | indicator_id, geography K02000001, unit £ million, status provisional, values ≥ 0 | **pass** | 0 rows breach |
| A8 | notes say net_of_government_holdings on all rows; manifest says ≠ PSND (HF6W) | **pass** | rows without basis 0; manifest net+PSND wording ok |
| A9 | No PSND / HF6W / net-debt rows in D8B curated | **pass** | 0 suspicious rows |
| A10 | Raw data date 2026-11-14 = curated source_version = manifest release date | **pass** | raw data date 2026-11-14; source_version ['DMO D8B data-date 2026-11-14'] |
| A11 | DMO footnote in raw: net of government holdings; IL ≠ uplifted nominal; FY 1 Apr–31 Mar | **pass** | all three footnote clauses found in raw sheet |
| A12 | Cross-check vs D1A: D8B conv ≤ D1A gross conv; D8B IL ≤ D1A uplifted IL; same FYs non-zero | **pass** | conv>gross none; IL>uplifted none; zero/non-zero mismatches none; D1A maturity FYs absent from D8B (excl. current FY) none |
| A12b | D8B coverage: first FY is 2027-28; remaining FY 2026-27 redemptions are not in the report | **warn** | D1A shows 2 gilt(s) maturing in FY 2026-2027 after the as-of date (conventional £69,761m gross; IL uplifted £0m): 4 1/8% Treasury Gilt 2027, 3¾% Treasury Gilt 2027. Not a data error (curated == raw) but the README/manifest do not say D8B excludes the in-progress FY. |
| A13 | Net-vs-gross sanity: D8B conv is below D1A gross conv in FYs with official holdings | **pass** | 37 FYs compared; largest gross−net gap 2027-2028 £13,898m (consistent with DMO/CRND holdings) |

### D8B spot checks (raw → curated, £m)

| FY | Raw conv | Raw IL | Raw total | Curated conv / IL / total |
|----|---------:|-------:|----------:|---------------------------|
| 2027-2028 | 152,286 | 15,164 | 167,450 | 152,286 / 15,164 / 167,450 |
| 2028-2029 | 115,987 | 34,629 | 150,616 | 115,987 / 34,629 / 150,616 |
| 2029-2030 | 165,944 | 0 | 165,944 | 165,944 / 0 / 165,944 |
| 2047-2048 | 24,163 | 12,500 | 36,663 | 24,163 / 12,500 / 36,663 |
| 2072-2073 | 0 | 5,869 | 5,869 | 0 / 5,869 / 5,869 |
| 2073-2074 | 10,500 | 0 | 10,500 | 10,500 / 0 / 10,500 |

Σ all 47 FYs: conventional £1,993,154m · index-linked £457,793m · total £2,450,947m. Rows where conv + IL equals total exactly: 47/47.

### D8B ↔ D1A cross-check (first FYs, conventional, £m)

D8B is **net** of government holdings; D1A is **gross**; so D8B ≤ D1A is expected, with the gap = official (DMO/CRND) holdings.

| FY | D1A gross conv by maturity | D8B net conv | Gap |
|----|---------------------------:|-------------:|----:|
| 2027-2028 | 166,184 | 152,286 | 13,898 |
| 2028-2029 | 128,288 | 115,987 | 12,301 |
| 2029-2030 | 169,892 | 165,944 | 3,948 |
| 2030-2031 | 137,317 | 126,398 | 10,919 |
| 2031-2032 | 132,353 | 127,697 | 4,656 |
| 2032-2033 | 114,887 | 102,907 | 11,980 |

## Checks — D1A (`dmo-gilts-in-issue`)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| B1 | D1A raw SHA-256 = SHA256SUMS = manifest | **pass** | disk `1d765a6f84d0…`; SHA256SUMS `1d765a6f84d0…`; manifest `1d765a6f84d0…` |
| B2 | D1A 138 rows = 104 gilts (70 conv + 34 IL) → 104 nominal + 34 uplifted | **pass** | curated 138 rows; raw gilts 104 (70 conv + 34 IL); series {'nominal': 104, 'uplifted_nominal': 34}; unique ISINs 104 |
| B3 | Every raw gilt (amount, kind, maturity, first issue) == curated; no conv uplift rows | **pass** | 0 mismatches; duplicate keys 0 |
| B4 | Σ conventional nominal + Σ IL uplifted ≈ £2,939.04bn (±£5m) | **pass** | curated Σ = £2,939,042.992m; raw headline £2,939,040m; diff £+2.992m (conv £2,222,280.293m + IL uplifted £716,762.700m; IL face £438,195.936m not added) |
| B5 | As-of 2026-11-13 (title) = curated period; no matured / future-issued gilts | **pass** | raw title `GILTS IN ISSUE ON 13 NOVEMBER 2026`; rows with wrong period 0; matured 0; first-issue after as-of 0 |
| B6 | No fake PSND / aggregate / total row: every row is one valid-ISIN gilt | **pass** | 0 rows without valid ISIN or with total/PSND wording; all 104 ISINs pass ISO 6166 check digit |
| B7 | indicator_id, geography K02000001, status final, positive values, unit by series | **pass** | 0 rows breach |
| B8 | IL uplift = nominal × (ref RPI ÷ base RPI): implied ref RPI identical across gilts per lag | **pass** | implied reference RPI (3m lag) 421.8484–421.8511; (8m lag) 411.4000–411.4000; odd ratios none |
| B9 | Conventional bucket and IL lag_months/base_rpi in notes match raw sheet sections | **pass** | bucket errors 0; lag/base_rpi errors 0 (notes round base_rpi to 3 dp, e.g. 194.06667 → 194.067; tolerance ±0.0006; amounts are unrounded) |
| B10 | Conventional bucket consistent with years to maturity (<3 / 3–7 / 7–15 / >15) | **pass** | out-of-band none |
| B11 | Manifest caveats: nominal ≠ market value; not PSND; gross (not net of holdings); no cross-kind total | **pass** | wording present |
| B12 | Economy's headline_check.json matches independent recompute | **pass** | Economy Σ £2,939,042.992m diff £+2.992m; Validation Σ £2,939,042.992m diff £+2.992m |

### D1A headline arithmetic (£m)

| Quantity | £m |
|----------|---:|
| Σ conventional nominal (70 gilts) | 2,222,280.293 |
| Σ index-linked uplifted nominal (34 gilts) | 716,762.700 |
| **Σ curated (conv nominal + IL uplifted)** | **2,939,042.992** |
| Raw sheet headline (£2,939.04bn, rounded to £10m) | 2,939,040 |
| Difference | +2.992 (tolerance ±5) |
| *Not the headline:* conv nominal + IL face | 2,660,476.228 |
| *Memo:* Σ IL nominal (face) | 438,195.936 |

### D1A spot checks (raw → curated, £m)

| ISIN | Gilt | Raw nominal | Curated nominal | Raw uplifted | Curated uplifted |
|------|------|------------:|----------------:|-------------:|-----------------:|
| GB00BL6C7720 | 4 1/8% Treasury Gilt 2027 | 32,407.950 | 32,407.950 | — | — |
| GB00BLBDX619 | 1 1/8% Treasury Gilt 2073 | 11,111.000 | 11,111.000 | — | — |
| GB00B128DH60 | 1¼% Index-linked Treasury Gilt 2027 | 14,170.199 | 14,170.199 | 30,802.328 | 30,802.328 |
| GB0031790826 | 2% Index-linked Treasury Stock 2035 | 9,083.989 | 9,083.989 | 21,527.379 | 21,527.379 |

Implied reference RPI from `uplifted ÷ nominal × base RPI`: 3-month-lag gilts ≈ 421.848; 8-month-lag gilts ≈ 411.400 (constant across gilts → uplifts are internally consistent).

## Method notes (for Ready / UI later)

1. **D8B ≠ D1A maturities.** D8B is net of government holdings and carries only part of the IL uplift; never reconcile D8B IL to D1A uplifted amounts.
2. **D1A headline ties only as conventional nominal + IL uplifted nominal.** Adding IL face instead would understate the headline by the IL uplift. The 104 nominal rows must not be summed across kinds in the UI.
3. **Neither package is PSND (HF6W)**; no aggregate rows exist in either curated file.
4. **Snapshots, not time series.** Both change with each gilt operation / redemption / monthly RPI; re-run this script after any re-pin.
5. D8B rows are `provisional` (DMO: holdings update after month-end, net figures may temporarily overstate); D1A rows `final` for the as-of date.

## Summary

- **Blockers:** none
- **Recommended fixes (owner):** none blocking — data is faithful to the pinned raw. Docs-only task for Economy (A12b): add to the D8B README, manifest caveats and Notes that the report starts at FY 2027-28 and omits the remainder of the in-progress FY 2026-27 (D1A shows ~£69.8bn gross conventional maturing Jan/Mar 2027), so the Repayment Calendar UI must not imply nothing redeems before Apr 2027.
- **Ready recommendation:** both packages pass numerical QA; Orchestrator may mark Validation done → Ready after the A12b caveat is added, then cloud load (no UI before Review).
- **Not verified:** live DMO D8B/D1A PDF/XML export (captcha-blocked); registry/Notion status is for the Orchestrator hand-off.

# QA report — Economy Domain 08: debt ownership / official holdings / portfolio composition — 2026-11-14

**Agent:** Validation
**Overall verdict:** **PASS with warnings** (34 pass · 3 warn · 0 fail)
**Script:** `src/validation/qa_economy_08_debt_ownership_2026_11_14.py`
**Independence:** Raw QR PDF re-parsed with `pypdf` layout mode and raw D4L `.xls` re-summed with `xlrd` + `math.fsum`, using Validation's own parsers. `economy.connectors` is only imported for the `*-REPRO` re-run, which runs inside a temp folder. Nothing under `data/economy/` was edited.
**Related:** D8B + D1A already Validation-passed in `qa_report_economy_08_dmo_d8b_d1a_2026-11-14.md`.

| Package | Verdict | Curated rows | Unit / valuation |
|---------|---------|-------------:|------------------|
| `gilt-holdings-by-sector` (ONS via QR) | **PASS with warnings** | 32 | £mn, **market value** |
| `dmo-government-holdings` (D4L) | **PASS with warnings** | 777 | £mn, **nominal** (CRND + DMO only) |
| `dmo-debt-portfolio-composition` (QR) | **PASS with warnings** | 48 | £bn, **uplifted nominal** and **market value** |

## Locked distinctions (verified in manifests and row notes)

| Label | Valuation | ≠ |
|-------|-----------|---|
| Who owns gilts (ONS via QR) | Market value | ≠ D4L · ≠ D1A · ≠ uplifted-nominal portfolio · ≠ PSND (HF6W) |
| Official holdings (D4L) | Nominal | ≠ Who Owns the Debt (excludes BoE, local authorities, public corporations) · ≠ PSND |
| Portfolio composition (QR) | Uplifted nominal / market value, gross and net | T-bills = debt-management only · ≠ PSND · never sum across valuations |

Live re-fetch from DMO/ONS was **not** attempted (matrix: Perfdrive/captcha on DMO). "Official release" comparison is against the hash-verified pinned QR PDF and D4L workbook.

## Package 1 — `gilt-holdings-by-sector`

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| G1 | Gilt holdings raw SHA-256 = SHA256SUMS = manifest | **pass** | disk `ddd016d62c3f…`; SHA256SUMS `ddd016d62c3f…`; manifest `ddd016d62c3f…` |
| G1b | Package PDF copy is byte-identical to the composition package pin | **pass** | `ddd016d62c3f…` vs `ddd016d62c3f…` |
| G2 | 32 rows = 8 series × 4 quarters; no duplicate (series, quarter); no blank values | **pass** | 32 rows; 8 series; 32 unique keys |
| G3 | Every curated cell equals the PDF table (own layout-mode parse) | **pass** | 32 cells compared; mismatches none |
| G4 | Q3 2025 spot check vs matrix/QR (Overseas, ICPF, BoE APF, total + 4 other sectors) | **pass** | overseas 709,279; insurance-pension-funds 449,107; bank-of-england-apf 393,760; total 2,124,632 |
| G5 | Σ sectors = TOTAL each quarter; Q3 2025 printed % re-derived (0.1 pp) | **pass** | max /Σ−TOTAL/ = 0 £mn (QR: figures may not sum due to rounding); max share error 0.00 pp |
| G6 | Attribution: publisher=ONS, valuation=market-value on every row; manifest caveats ≠ D1A / PSND / D4L | **pass** | manifest publisher `ONS`; notes ok True; unit ok True; source_version ok True; caveats ok True; PDF source line `Source: ONS. Figures may not sum due to rounding` |
| G7 | Quarter bounds correct; latest quarter provisional, earlier quarters final | **pass** | period bounds ok True; Q3 2025 provisional True; others final True |
| G8 | BoE shown as Asset Purchase Facility; MFI row present (MFI excludes BoE per matrix) | **pass** | PDF page 3 labels present: True |
| G9 | Cross-source sanity: ONS total sits near, but is not equal to, DMO net gilt market value (≠ confirmed) | **pass** | ONS total Q3 2025 £2,124.63bn · DMO net gilt market value (Sep 2025) £2,139.48bn (-0.69%) · DMO gross gilt market value £2,293.79bn (-7.37%) |
| G10 | Gilt holdings connector re-run (temp dir) reproduces curated CSV | **pass** | connector `economy.connectors.gilt_holdings_by_sector.GiltHoldingsBySectorConnector`: curated 32 rows vs re-run 32; key mismatch False; value/status/unit diffs 0 |
| G11 | Series depth / source route | **warn** | Interim PDF text parse of one QR vintage: only 4 quarters (Q4 2024–Q3 2025); ONS CDIDs not located (matrix §2.1 G2 action still open); ONS revises retrospectively, and Q4 2024–Q2 2025 are labelled `final` although the QR says figures can be revised. `official_release_date` empty in manifest raw_evidence. |

### Q3 2025 spot check (£mn, market value; QR PDF page 3)

| Series | Matrix / QR | Curated | Match |
|--------|------------:|--------:|:-----:|
| overseas | 709,279 | 709,279 | ✓ |
| insurance-pension-funds | 449,107 | 449,107 | ✓ |
| bank-of-england-apf | 393,760 | 393,760 | ✓ |
| other-financial-pnfc | 356,371 | 356,371 | ✓ |
| monetary-financial-institutions | 212,170 | 212,170 | ✓ |
| households-npish | 2,950 | 2,950 | ✓ |
| local-authorities-public-corporations | 995 | 995 | ✓ |
| total | 2,124,632 | 2,124,632 | ✓ |

Cross-source context: ONS total Q3 2025 £2,124.63bn · DMO net gilt market value (Sep 2025) £2,139.48bn (-0.69%) · DMO gross gilt market value £2,293.79bn (-7.37%). ONS and DMO universes/dates differ, so the figures are near but not equal — treat as **different measures**, never reconcile in the UI.

## Package 2 — `dmo-government-holdings` (D4L)

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| D1 | D4L raw SHA-256 = SHA256SUMS = manifest | **pass** | disk `3e086d618b56…`; SHA256SUMS `3e086d618b56…`; manifest `3e086d618b56…` |
| D2 | Row count 777 = 259 months × 3 series; contiguous Apr 2005–Oct 2026; no duplicates | **pass** | 777 rows; 259 months ((2005, 4)→(2026, 10)); per series {'conventional': 259, 'index-linked': 259, 'total': 259} |
| D3 | All 777 curated values equal an independent re-sum of the raw xls (fsum, tol 1e-6 £m) | **pass** | max /curated − recomputed/ = 1.00e-09 £m; mismatches none |
| D4 | total = conventional + index-linked every month; no negative holdings | **pass** | max identity error 2.64e-11 £m; 20,151 gilt-month cells, all ≥ 0: True |
| D5 | Spot months re-summed from raw per-gilt cells match curated | **pass** | 6 months in table below |
| D6 | Conventional vs index-linked classification agrees with D1A kind for all overlapping ISINs | **pass** | 188 ISINs in D4L; 103 also in D1A; classification disagreements none; unusual IL spellings none; 46 IL names |
| D7 | latest_snapshot_by_gilt.csv: 103 gilts, Σ = Oct 2026 total, as-of 2026-10-31 | **pass** | snapshot 103 rows Σ £166,974.242m vs raw Oct-2026 total £166,974.242m |
| D8 | Scope: excludes BoE / LA / PC on every row; nominal; ≠ Who Owns the Debt, ≠ PSND (manifest + raw footnote agree) | **pass** | row notes ok True; unit ok True; caveats ok True; raw footnote agrees True; definition says 'NOT who owns the debt' True |
| D9 | Only latest month (Oct 2026) is provisional per series | **pass** | provisional keys [('conventional', '2026-10-01'), ('index-linked', '2026-10-01'), ('total', '2026-10-01')] |
| D10 | Oct-2026 holding ≤ D1A nominal in issue per ISIN (gilts held can't exceed gilts issued) | **pass** | gilts over-held none; held in D4L but not in D1A (matured/new) none |
| D11 | Conventional: D4L month-end holdings tie to QR gross−net (gilts held by DMO) within £0.05bn at 4 quarter-ends | **pass** | max /D4L − (QR gross − net)/ = £0.007bn across Mar/Jun/Sep/Dec 2025 — independent official-source tie-out of the D4L conventional series |
| D11b | Index-linked basis: D4L IL is *nominal* (face) — D4L × uplift ratio lands within 10 % of QR uplifted gap; raw D4L IL does not | **pass** | Dec 2025 IL: D4L raw £2.10bn; D4L × D1A per-ISIN uplift ratio ≈ £5.17bn; QR gross−net (uplifted) £5.03bn. Uses Nov-2026 uplift ratios on Dec-2025 holdings, so a few % drift is expected. Resolves Economy's open question by evidence, not by DMO confirmation. |
| D12 | D4L connector re-run (temp dir) reproduces curated CSV | **pass** | connector `economy.connectors.dmo_government_holdings.DmoGovernmentHoldingsConnector`: curated 777 rows vs re-run 777; key mismatch False; value/status/unit diffs 0 |
| D13 | IL basis evidence-only; totals are our sums | **warn** | DMO file does not state whether IL holdings are nominal or inflation-uplifted; D11b shows the evidence points to nominal, but there is no DMO confirmation (manifest open question stays open; do not add D4L IL to uplifted totals). Totals are sums of gilt rows — no DMO-published total to tick against. Re-run after each re-pin; earlier months may be restated. |

### Spot months (raw per-gilt cells re-summed → curated, £m nominal)

| Month | Gilts held | Raw conv | Curated conv | Raw IL | Curated IL | Raw total | Curated total |
|-------|-----------:|---------:|-------------:|-------:|-----------:|----------:|--------------:|
| 2005-04 | 49 | 12,644.825 | 12,644.825 | 2,298.888 | 2,298.888 | 14,943.713 | 14,943.713 |
| 2008-10 | 57 | 73,779.480 | 73,779.480 | 6,662.647 | 6,662.647 | 80,442.127 | 80,442.127 |
| 2012-03 | 66 | 109,456.433 | 109,456.433 | 5,738.640 | 5,738.640 | 115,195.073 | 115,195.073 |
| 2020-03 | 74 | 98,519.603 | 98,519.603 | 3,687.979 | 3,687.979 | 102,207.582 | 102,207.582 |
| 2022-09 | 87 | 119,381.214 | 119,381.214 | 3,001.811 | 3,001.811 | 122,383.025 | 122,383.025 |
| 2026-10 | 103 | 164,871.913 | 164,871.913 | 2,102.330 | 2,102.330 | 166,974.242 | 166,974.242 |

### D4L (CRND+DMO, nominal) vs QR gross−net (DMO-held, uplifted nominal), £bn

| Quarter-end | Instrument | QR gross − net | D4L | D4L − QR |
|-------------|------------|---------------:|----:|---------:|
| 2025-03-31 | conventional | 153.25 | 153.25 | -0.00 |
| 2025-03-31 | index-linked | 4.86 | 2.11 | -2.75 |
| 2025-06-30 | conventional | 175.43 | 175.43 | -0.00 |
| 2025-06-30 | index-linked | 4.93 | 2.11 | -2.82 |
| 2025-09-30 | conventional | 172.82 | 172.82 | -0.00 |
| 2025-09-30 | index-linked | 4.94 | 2.10 | -2.84 |
| 2025-12-31 | conventional | 172.13 | 172.12 | -0.01 |
| 2025-12-31 | index-linked | 5.03 | 2.10 | -2.93 |

QR "net" excludes gilts held by the **DMO**. Conventional D4L ties to the QR gap to within a penny of £bn at every quarter-end, which independently confirms the D4L conventional series. Index-linked D4L is lower because D4L is **nominal** while the QR gap is **uplifted**: Dec 2025 IL: D4L raw £2.10bn; D4L × D1A per-ISIN uplift ratio ≈ £5.17bn; QR gross−net (uplifted) £5.03bn. So D4L IL is on a nominal basis (evidence-based, not DMO-confirmed) — never add D4L IL to uplifted totals.

## Package 3 — `dmo-debt-portfolio-composition`

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| P1 | Portfolio composition raw SHA-256 = SHA256SUMS = manifest | **pass** | disk `ddd016d62c3f…`; SHA256SUMS `ddd016d62c3f…`; manifest `ddd016d62c3f…` |
| P2 | 48 rows = 4 uplifted dates × 2 bases × 4 + 2 market dates × 2 × 4; no duplicate keys | **pass** | 48 curated rows; 48 unique keys; 48 cells parsed independently from the PDF |
| P3 | Every curated cell equals the PDF figure (own layout-mode parse, 0.005 £bn) | **pass** | 48 cells compared; mismatches none |
| P4 | total = conv + IL + T-bills (±£0.02bn); net ≤ gross; net T-bills = gross T-bills | **pass** | max /Σ parts − total/ £0.01bn; net>gross violations none; max T-bill net−gross 0.00e+00 |
| P5 | Spot check Sep & Dec 2025 gross/net uplifted nominal (conv / IL / T-bills / total) vs PDF | **pass** | 16 cells in table below (Dec 2025 gross: conv 2,125.59 · IL 693.56 · T-bills 89.50 · total 2,908.65) |
| P6 | Labelling: unit matches valuation; T-bills labelled debt-management only; caveats ≠ PSND/D1A/market value; Sukuk excluded | **pass** | unit/valuation ok True; T-bill label ok True; caveat wording ok True |
| P7 | Point-in-time dates (start = end = quarter-end): uplifted ×4, market value ×2 (Sep/Dec 2025) | **pass** | uplifted dates ['2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31']; market-value dates ['2025-09-30', '2025-12-31'] |
| P8 | PDF footnotes the manifest relies on are present | **pass** | Sukuk excluded: True; net excludes DMO-held gilts: True; T-bills for debt management; cash-mgmt excluded since June 2016: True; green gilts £49.6bn Dec 2025: True |
| P9 | Sanity vs D1A: QR gross gilts (Dec 2025) → D1A headline (13 Nov 2026) grows plausibly (0–10 %) | **pass** | QR Dec 2025 gross uplifted gilts £2,819.15bn → D1A £2,939.04bn (+4.3%). Different dates; consistency, not a tie-out. |
| P10 | Portfolio composition connector re-run (temp dir) reproduces curated CSV | **pass** | connector `economy.connectors.dmo_debt_portfolio_composition.DmoDebtPortfolioCompositionConnector`: curated 48 rows vs re-run 48; key mismatch False; value/status/unit diffs 0 |
| P11 | Series depth | **warn** | Only the quarter-ends printed in one QR are curated (uplifted nominal ×4, market value ×2); no history before Mar 2025 (back-fill is an open question in the manifest). All rows `final`; DMO may revise T-bill history (QR footnote 3). Average maturity / yields / duration are deliberately not curated. |

### Spot check — uplifted nominal, Sep and Dec 2025 (£bn; raw PDF → curated)

| As of | Basis | Instrument | PDF | Curated | Match |
|-------|-------|------------|----:|--------:|:-----:|
| 2025-09-30 | gross | conventional-gilts | 2,093.79 | 2,093.79 | ✓ |
| 2025-09-30 | gross | index-linked-gilts | 678.75 | 678.75 | ✓ |
| 2025-09-30 | gross | treasury-bills | 77.50 | 77.50 | ✓ |
| 2025-09-30 | gross | total | 2,850.04 | 2,850.04 | ✓ |
| 2025-09-30 | net | conventional-gilts | 1,920.97 | 1,920.97 | ✓ |
| 2025-09-30 | net | index-linked-gilts | 673.81 | 673.81 | ✓ |
| 2025-09-30 | net | treasury-bills | 77.50 | 77.50 | ✓ |
| 2025-09-30 | net | total | 2,672.28 | 2,672.28 | ✓ |
| 2025-12-31 | gross | conventional-gilts | 2,125.59 | 2,125.59 | ✓ |
| 2025-12-31 | gross | index-linked-gilts | 693.56 | 693.56 | ✓ |
| 2025-12-31 | gross | treasury-bills | 89.50 | 89.50 | ✓ |
| 2025-12-31 | gross | total | 2,908.65 | 2,908.65 | ✓ |
| 2025-12-31 | net | conventional-gilts | 1,953.46 | 1,953.46 | ✓ |
| 2025-12-31 | net | index-linked-gilts | 688.53 | 688.53 | ✓ |
| 2025-12-31 | net | treasury-bills | 89.50 | 89.50 | ✓ |
| 2025-12-31 | net | total | 2,731.49 | 2,731.49 | ✓ |

## Method notes for UI / Ready

1. Three different measures: ONS **market-value** holders by sector; D4L **nominal** official holdings; QR **uplifted-nominal / market-value** portfolio by instrument. Never put them on one stacked axis or sum them.
2. Do not describe ONS sector shares as shares of PSND (HF6W). Do not call D4L "Who owns the debt".
3. ONS sector total (Q3 2025 £2,124.6bn) sits within about 1 % of the DMO *net* gilt market value but is a different dataset, so never equate them.
4. T-bills in the QR are debt-management only; cash-management bills are excluded since June 2016.
5. All three are point-in-time snapshots of one pin; re-run this script after any re-pin (new QR, new D4L export).

## Summary

- **Blockers:** none
- **Recommended fixes (owner Economy):**
No blocking fixes. Non-blocking docs/metadata tasks for Economy are listed below.
  - *Non-blocking (warn):* (a) fill `official_release_date` in the gilt-holdings and portfolio manifests (QR publication date); (b) before UI shows Q4 2024–Q2 2025 as `final`, either mark them `provisional` or add a visitor-facing "ONS revises retrospectively" note; (c) lock ONS CDIDs / pin newer QRs to extend beyond 4 quarters (matrix §2.1); (d) add a one-line README/manifest note that D4L index-linked holdings are on a nominal basis (Validation evidence D11b: D4L × uplift ratio ≈ QR uplifted gap) and still ask DMO to confirm; (e) back-fill earlier portfolio quarters from older QRs.
- **Ready recommendation:** all three packages pass numerical QA vs raw; Orchestrator may mark Validation done → Ready for cloud load. No UI before Review; keep the three measures on separate panels.
- **Not verified:** live ONS / DMO re-download; an independent ONS release (CDIDs not located); registry/Notion status is for the Orchestrator hand-off.

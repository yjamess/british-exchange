# QA report — Economy Domain 08 Borrowing Machine stock-flow bridge — 2026-11-14

**Agent:** Validation  
**Overall verdict:** **fail** for a numeric Borrowing Machine that treats `sum(DZLS)` as explaining `ΔHF6W`  
**UI implication:** keep the conceptual EmptyStage; do **not** invent a balancing item as an official series

## Scope

Can visitors see opening debt, borrowing over an interval, and closing debt with a checked bridge between them?

| Role | Indicator | CDID | Kind | Unit |
|------|-----------|------|------|------|
| Debt stock | `public-sector-net-debt` | HF6W | Stock (end of month) | £ billion |
| Borrowing flow | `public-sector-net-borrowing` | DZLS | Flow (in month) | £ million → £bn for compare |

- Kickoff: `docs/agent-kickoff-economy-08-borrowing-machine.md`
- Script: `src/validation/qa_economy_08_borrowing_machine_2026_11_14.py`
- Inputs: curated CSVs only (final, valued). No re-ingest. No edits under `data/economy/`.
- Prior Ready QA for the pins themselves: `data/qa/qa_report_public_sector_debt_trio_2026-11-11.md` (**pass**) — this report does **not** reopen that.

### Freeze (curated used 2026-11-14)

| Series | Final valued months | Curated SHA-256 |
|--------|---------------------|-----------------|
| HF6W | 420 · 1975-03 → 2026-08 | `47fdad141b0e11f5690aa03111a768e36550c2f99b66c5851a7437fb34903750` |
| DZLS | 353 · 1997-04 → 2026-08 | `c0d6c65e38cf07aacd998da8e579242ea86fd6d14695064ea62fa46b17063f02` |

Manifest pins remain the Oct 20 2026 PSF vintage (next release 20 Nov). Curated hashes differ from the 11 Nov trio report because provisional/final labelling was corrected later; values for final months are what this bridge uses.

## Method (documented mapping)

1. **Open / close** = HF6W end-of-month stocks on two dates that both exist as final valued months.
2. **Flows** = DZLS for months **after** open through close **inclusive** (the open month’s borrowing is already inside the opening stock).
3. Convert DZLS £ million → £ billion (`/ 1000`).
4. **Residual** = `(close − open) − sum(flows)` in £ billion.

Alternative inclusive-open / exclusive-close mapping was checked as a diagnostic; residuals stay large — mapping choice is not the story.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| B1 | Supported open/close dates exist (final HF6W) | **pass** | 11 sample windows all have valued stocks |
| B2 | DZLS months map cleanly onto each window | **pass** | No missing flow months on the sample set |
| B3 | Units aligned before subtract | **pass** | HF6W £bn; DZLS /1000 |
| B4 | Residuals negligible on sample windows (£5bn or 10% of \|Δ\|) | **fail** | All 11 windows material; smallest is FY 2023/24 (+£6.2bn / 4.4%) |
| B5 | Monthly ΔHF6W ≈ same-month DZLS | **fail** | n=353; residual mean £0.5bn but max abs **£76.8bn** (2021-10); p90 abs £18.7bn |
| B6 | Official ONS PSNB→PSND reconciliation available in our pins | **fail** | No PSNCR / REC3 series ingested; ONS FOI states they do **not** reconcile PSNB with PSND |
| B7 | Independence — no silent rewrite | **pass** | Validation did not edit Economy data |

### Sample windows (final months only)

| Window | Open £bn | Close £bn | Δ debt £bn | Sum DZLS £bn | Residual £bn | Residual / \|Δ\| |
|--------|----------|-----------|------------|--------------|--------------|------------------|
| FY 2018/19 | 1760.1 | 1778.0 | +17.9 | +44.1 | **−26.2** | −146% |
| FY 2019/20 | 1778.0 | 1814.8 | +36.8 | +58.8 | **−22.0** | −60% |
| FY 2020/21 | 1814.8 | 2157.7 | +342.9 | +310.8 | **+32.1** | +9% |
| FY 2021/22 | 2157.7 | 2379.7 | +222.0 | +116.0 | **+106.0** | +48% |
| FY 2022/23 | 2379.7 | 2542.7 | +163.0 | +123.8 | **+39.2** | +24% |
| FY 2023/24 | 2542.7 | 2684.1 | +141.4 | +135.2 | +6.2 | +4% |
| FY 2024/25 | 2684.1 | 2806.7 | +122.6 | +149.8 | **−27.2** | −22% |
| Cal 2020 | 1837.2 | 2154.2 | +317.0 | +269.9 | **+47.1** | +15% |
| Cal 2024 | 2694.0 | 2816.4 | +122.4 | +148.6 | **−26.2** | −21% |
| 12m to Aug 2025 | 2757.9 | 2907.0 | +149.1 | +159.1 | **−10.0** | −7% |
| 12m to Aug 2026 | 2907.0 | 2981.2 | +74.2 | +128.0 | **−53.8** | −73% |

Worst monthly residuals (Δ debt vs same-month borrowing): 2021-10 (+£76.8bn), 2020-04 (+£53.5bn), 2008-09 (+£39.8bn).

## Methodological reading (why this fails)

ONS Quality and Methodology Information ([Public sector finances QMI](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/methodologies/publicsectorfinancesandgovernmentdeficitanddebtunderthemaastrichttreatyqmi)):

- **PSNB** = deficit (accruals): spending minus receipts over a period.
- **PSNCR** (net cash requirement) ≈ cash to raise; close but **not identical** to the change in net debt.
- Debt is a stock; reducing the deficit is not the same as reducing the debt.

ONS FOI-2026-3439 ([receipts, expenditure, borrowing and debt](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/publicsectorreceiptsexpenditurenetborrowingandnetdebt)):

- Appendix R reconciles receipts / expenditure / **borrowing** (and borrowing ↔ cash requirement).
- **“Unfortunately, we do not reconcile these with public sector net debt.”**
- The published debt-change bridge they point to is **REC3**: central government **net cash requirement** ↔ change in central government **net debt** (Appendix A) — not PSNB ex ↔ PSND ex.

So a residual of `ΔHF6W − sum(DZLS)` is **not** an official “stock-flow adjustment” series. Showing it as if it were would invent a statistic.

## Summary

- **Blockers for numeric Borrowing Machine:** residuals are large and structural; no official PSNB→PSND bridge in our pins; inventing a balancing item is forbidden by the kickoff honesty rules.
- **What already ships is correct:** conceptual EmptyStage on `/economy?domain=debt&view=machine`.
- **Recommended next (Economy, later):** if a numeric instrument is still wanted, scope an official cash / debt-change path (e.g. PSNCR + REC3-style CG reconciliation, or documented PSF appendix tables) — new registry rows + Validation — **or** keep the Machine conceptual forever and teach the relationship in Notes only.
- **Do not (Orchestrator UI):** plot opening + sum(borrowing) + residual + closing as a closed official identity.

## Reproduce

```bash
PYTHONPATH=src uv run python -m validation.qa_economy_08_borrowing_machine_2026_11_14
```

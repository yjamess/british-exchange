# QA report — Economy 04 Buffer + Debt · 2026-11-15

## Scope

- Domain: 04 · Household Finances & Living Standards — Buffer + Weight of Debt
- Kickoff: `docs/agent-kickoff-validation-economy-04-buffer-debt.md`
- Handover: `docs/handover-economy-04-household-deepen.md`
- Packages: `household-financial-wealth` (ONS WAS 5.1, 5.10–5.13),
  `consumer-credit-outstanding` (BoE LPMBI2O, LPMVZRJ, LPMB4TS)
- Script: `validation.qa_economy_04_buffer_debt_2026_11_15`
- Out of scope: LCF Cost of Living / Household Ledger; Housing property wealth,
  MLAR, IUMBV34 as new Economy pins; DGD8 Ready (already a Phase 1 companion).

## Independence

Pinned raw SHA-256 checked against manifests. WAS cells recomputed from
`financialwealthtables.xlsx` (Tables 5.1, 5.10–5.13) with a Validation parser
that does not import Economy connectors. BoE pin CSV parsed independently;
live IADB re-fetch attempted (sep_live=261200.0). Curated CSVs were not edited.

## Checks

| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | WAS files + connector | **pass** | /Users/yettyjames/Workspace/machine/british-exchange/data/economy/household-financial-wealth |
| C1 | WAS checksum | **pass** | disk=7afee4fac3e3b3b0d1c970678bc10cd7e2711a774a13e4d2665c1b513c85013c |
| C4 | WAS observation count | **pass** | curated=447 parsed=447 expected=447 |
| C3 | WAS GB geography (workbook + manifest) | **pass** | Great Britain, July 2006 to June 2016/April 2014 to March 2022 |
| C3 | WAS curated geography | **pass** | codes=['K03000001'] labels=['Great Britain'] |
| C1 | WAS edition date on cover | **pass** | cover='Date published: 24th January 2025'; evidence=2025-01-24 |
| C1 | WAS workbook cells == curated (full recon) | **pass** | all published cells match |
| C2 | WAS Round 8 5.10 median all hh | **pass** | workbook=10400.0 expected=10400.0 |
| C2 | WAS Round 8 5.10 p25 all hh | **pass** | workbook=300.0 expected=300.0 |
| C2 | WAS Round 8 5.10 p75 all hh | **pass** | workbook=58000.0 expected=58000.0 |
| C2 | WAS Round 8 5.1 any formal % | **pass** | workbook=98.0 expected=98.0 |
| C2 | WAS Round 8 5.11 £100k+ share | **pass** | workbook=17.0 expected=17.0 |
| C2 | WAS Round 8 5.12 aggregate net £bn | **pass** | workbook=1915.0 expected=1915.0 |
| C2 | WAS Round 8 5.13 median all hh | **pass** | workbook=10400.0 expected=10400.0 |
| C3 | WAS Round 8 accreditation=suspended on curated rows | **pass** | round8_n=57 |
| C4 | WAS table mix 5.1/5.10–5.13 | **pass** | {'5.10': 72, '5.11': 90, '5.12': 27, '5.1': 27, '5.13': 231} |
| C4 | WAS Table 5.7 survey borrowing not curated | **pass** | survey non-mortgage borrowing left uningested |
| C4 | WAS Table 5.11 Round 8 band shares ~100% | **pass** | sum=100.0 n_bands=10 |
| C4 | WAS Table 5.12 Round 8 gross − liabilities = net | **pass** | 2061.0 − 146.0 = 1915.0 vs net 1915.0 |
| C7 | WAS Notes: DGD8 is not the Buffer | **pass** | manifest/README treat DGD8 as national-accounts residual |
| C3 | WAS Notes: accreditation + nominal £ + COVID weights | **pass** | cover + package caveats |
| C5 | WAS does not fork Housing property wealth | **pass** | related id is link-only; no economy/ package |
| C5 | WAS connector + OGL | **pass** | economy.connectors.household_financial_wealth |
| C1 | BoE files + connector | **pass** | /Users/yettyjames/Workspace/machine/british-exchange/data/economy/consumer-credit-outstanding |
| C1 | BoE checksum | **pass** | disk=ab8c026ad4caca0c158655d82a0b49a25425643dccc3d5784702df85d78545da |
| C4 | BoE observation count | **pass** | curated=1208 pin=1208 expected=1208 |
| C1 | BoE pin CSV == curated (full recon) | **pass** | all months match |
| C2 | BoE Sep 2026 LPMBI2O = 261,200 | **pass** | total=261200.0 |
| C2 | BoE Sep 2026 cards 83,708 + other 177,492 | **pass** | cards=83708.0 other=177492.0 |
| C4 | BoE Sep 2026 cards + other = total | **pass** | 83708.0+177492.0=261200.0 vs 261200.0 |
| C4 | BoE identity cards+other=total (all overlapping months) | **pass** | checked=402 fails=0 (tolerance £1.5m rounding) |
| C4 | BoE row mix (total 402 from Apr 1993; cards/other 403 from Mar 1993) | **pass** | {'LPMVZRJ': 403, 'LPMB4TS': 403, 'LPMBI2O': 402} |
| C3 | BoE UK geo + SA £ million | **pass** | unit=£ million, SA |
| C6 | BoE provisional = latest month only (Sep 2026, all three series) | **pass** | provisional_n=3 periods=['2026-09-01'] |
| C3 | BoE excl. SLC in title / notes | **pass** | Consumer credit outstanding (excl. Student Loans Company) |
| C5 | Housing MLAR / IUMBV34 / LPMVTXK are link-only | **pass** | no Economy fork of Housing MLAR or LPMVTXK |
| C5 | BoE connector + vintage 29 Oct 2026 | **pass** | module=economy.connectors.consumer_credit_outstanding release=2026-10-29 |
| C1 | BoE live IADB == pin | **pass** | live_n=1208 pin_n=1208 Sep2026 total=261200.0 |
| C7 | DGD8 companion still labelled residual (not Buffer) | **pass** | household-saving-ratio README; not flipped in this ticket |
| C5 | LCF Cost/Ledger not in this Ready set | **pass** | out of scope: family-spending-by-category, family-spending-by-income |

## Method notes

- **WAS Buffer** is Great Britain (`K03000001`), survey rounds, nominal £.
  Round 8 (Apr 2020–Mar 2022) cells carry `accreditation=suspended` (ONS
  notice 13 June 2025; Round 8 telephone fieldwork + tenure recalibration).
  Cover sheet: published **24 January 2025**. Do not splice July and April
  round systems. Table 5.12 aggregate £bn is a companion stock, not the
  Buffer distribution. **DGD8** is a national-accounts residual — Notes
  correctly refuse it as a Buffer proxy.
- **BoE Weight of Debt** is UK (`K02000001`) monthly SA £ million, excl.
  Student Loans Company. Latest month (Sep 2026 on this pin) is provisional.
  Cards + other = total on this vintage. Housing MLAR and IUMBV34 remain
  link-only; LPMVTXK is documented and **not** ingested.

## Summary

- **Verdict: pass** (40 pass / 0 warn / 0 fail)
- Recommend Orchestrator **Ready** on these two ids only
  (`household-financial-wealth`, `consumer-credit-outstanding`).
- Do **not** Ready LCF Cost/Ledger. Do not fork Housing property wealth,
  MLAR, or LPMVTXK under `data/economy/`.

## Blockers

- None for Ready on these two pins.

## Economy fix tasks

- None required to pass this vintage.


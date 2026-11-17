"""Economy sector connectors (ONS / OBR / HMT / BoE).

Domain 04 household living-standards:
- real_household_disposable_income (DG2R/UKEA — RHDI £m CVM SA, S.14)
- real_household_disposable_income_per_head (CRXX/UKEA — RHDI per head £ CVM SA)
- household_saving_ratio (DGD8/UKEA — S.14 saving ratio % SA; not WAS buffer)
- household_series (shared OnsSeriesSpec config)
- family_spending_by_category (LCF workbook 1 Table 4.1 — Cost of Living)
- family_spending_by_income (LCF workbook 1 Tables 3.1E5/3.2E5, two-adult OECD)

Domain 04 deepen Buffer / Weight of Debt:
- household_financial_wealth (WAS GB financial wealth — Tables 5.1/5.10–5.13)
- consumer_credit_outstanding (BoE LPMBI2O/LPMVZRJ/LPMB4TS excl. SLC)

Fiscal wave (Y2) modules:
- public_sector_net_borrowing (DZLS/PUSF)
- public_sector_net_debt (HF6W/PUSF)
- public_sector_net_debt_percent_gdp (HF6X/PUSF, Domain 08 add-on)
- public_sector_debt_interest (NMFX/PUSF)
- tax_receipts (AHHY/PUSF)
- tax_receipts_composition (MF6P+AIIH+NMHM+AHGR under AHHY; Appendix D / PUSF)
- tax_machine_rules (GOV.UK statute pin — Domain 06 Tax Machine)
- tax_machine_income_tax_history (HMRC A.1/A.2/A.4 + GOV.UK — Domain 06 Time Machine)
- hmrc_tax_gap (HMRC Measuring tax gaps — Domain 06 The Tax Gap)
- effects_of_taxes_and_benefits (ONS ETB — Domain 06 Who Bears the Tax Burden?)
- total_managed_expenditure (EBFT/PUSF)
- business_investment (NPEL/QNA)

Domain 08 debt-instruments modules (UK DMO, pinned browser .xls — captcha, no download):
- dmo_gilt_future_redemptions (D8B)
- dmo_gilts_in_issue (D1A)
- dmo_common (shared checksum/xls helpers)

Domain 07 PSS July 2026 outturn pins (not monthly EBFT):
- pss_july_2026 (shared financial-year helpers)
- tes_by_function (Table 5.4 TES / COFOG, nominal)
- tme_del_ame (Table 1.1 Total DEL, Departmental AME, Other AME)
- tme_del_ame_real (Table 1.2, £ million, 2025-26 prices)
- tes_by_function_real (Table 4.3, £ billion, 2025-26 prices)
- tes_by_function_long_run (Table 4.2, nominal £ billion, 2003-04 to 2025-26)
- esa_gg_expenditure_by_function (ONS ESA Table 11, general government, calendar year)
"""

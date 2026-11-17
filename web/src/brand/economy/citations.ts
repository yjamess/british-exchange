/**
 * Human-readable source lines for Economy explorers.
 *
 * Chart feet show the publisher and source name only, matching the compact
 * Housing presentation. Geography, dates, release pins and methodology belong
 * in figure labels, Notes and the catalogue. Legacy coverage arguments are
 * accepted by economySource so existing callers share this presentation.
 */

/** Drop Exchange / ONS pin fragments (MM23/D7G7, EMP/KAI7, …) from user-facing copy. */
export function stripPinCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\b[A-Z]{2,}(?:\/[A-Z0-9.]+)+\b/g, "")
    .replace(/\b[A-Z]{2,}(?:[_-][A-Z0-9.]+){1,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s·\s·/g, " · ")
    .replace(/^[\s·]+|[\s·]+$/g, "")
    .trim();
}

/**
 * Period slot for chart feet: cadence only, optionally "to Mon YYYY".
 * Never pass raw `source_version` (it carries MM23/D7G7-style pins).
 */
export function economyPeriod(
  cadence: "monthly" | "quarterly" | "annual",
  throughLabel?: string | null,
): string {
  const base =
    cadence === "monthly" ? "Monthly" : cadence === "quarterly" ? "Quarterly" : "Annual";
  const through = throughLabel?.trim();
  return through ? `${base} · to ${through}` : base;
}

/** Compact chart foot: publisher and source name only. Coverage belongs in the figure and Data. */
export function economySource(
  publisherSeries: string,
  _geography: string,
  _period: string,
  _boundaries?: string | null,
): string {
  // Retain coverage inputs for existing callers; they are not printed in the compact foot.
  void _geography;
  void _period;
  void _boundaries;
  return publisherSeries.trim();
}

export const ECONOMY_SOURCE = {
  cpiRate: "ONS · Consumer Prices Index annual rate",
  cpihRate: "ONS · Consumer Prices Index including owner occupiers' housing costs annual rate",
  cpiIndex: "ONS · Consumer Prices Index",
  cpihIndex: "ONS · Consumer Prices Index including owner occupiers' housing costs",
  cpiCpihIndexes: "ONS · Consumer Prices Index and CPIH",
  consumerPrices: "ONS · Consumer price inflation",
  coicop: "ONS · Consumer price inflation by category",
  contributions: "ONS · Contributions to the CPIH annual rate",
  averagePrices: "ONS · Shopping prices comparison tool",

  realEarnings: "ONS · Average weekly earnings real regular pay",
  cashEarnings: "ONS · Average weekly earnings regular pay",
  earnings: "ONS · Average weekly earnings",
  payVsPrices: "ONS · Average weekly earnings and CPIH",
  asheNational: "ONS · Annual Survey of Hours and Earnings",
  asheRegional: "ONS · Annual Survey of Hours and Earnings place of work",

  realGdp: "ONS · Gross domestic product chained volume",
  gdpPerHead: "ONS · Gross domestic product per head",
  labourProductivity: "ONS · Output per hour worked",
  labourProductivityHours: "ONS · Productivity hours worked",
  industryGva: "ONS · Gross value added by industry",
  growth: "ONS · National accounts and productivity",

  rhdi: "ONS · Real household disposable income",
  rhdiPerHead: "ONS · Real household disposable income per person",
  householdSavingRatio: "ONS · Households' saving ratio",
  householdFinances: "ONS · Household sector accounts",
  familySpending: "ONS · Family spending",
  familySpendingByCategory: "ONS · Family spending by category",
  familySpendingByIncome: "ONS · Family spending by income group",
  householdFinancialWealth: "ONS · Wealth and Assets Survey financial wealth",
  consumerCredit: "Bank of England · Consumer credit outstanding",

  labourForce: "ONS · Labour Force Survey working-age levels",
  labourForceRates: "ONS · Labour Force Survey working-age rates",
  inactivityReasons: "ONS · Economic inactivity by reason",
  averageHours: "ONS · Average actual weekly hours",
  employmentFullPartTime: "ONS · Full-time and part-time employment",
  underemployment: "ONS · Underemployment",
  involuntaryPartTime: "ONS · Part-time workers who could not find a full-time job",
  employmentByOccupation: "ONS via Nomis · Annual Population Survey employment by occupation",
  vacancies: "ONS · Vacancies",
  workforceJobs: "ONS · Workforce jobs",
  workforceJobsByIndustry: "ONS · Workforce jobs by industry",
  regionalLabour: "ONS · Labour-force indicators by region",

  taxReceipts: "ONS · Public sector taxes and National Insurance contributions",
  /** Anatomy total identity — Appendix D heads compose AHHY (pin gated). */
  taxReceiptsComposition: "ONS · Public sector current receipts (Appendix D)",
  /** Anatomy CG drill under MF6P — NMBY + NMCU + LIQR. */
  taxReceiptsCgComposition: "ONS · Public sector current receipts (Appendix D · CG taxes)",
  /** Tax Machine statute tables. */
  taxMachineRules: "GOV.UK · Income Tax rates and allowances",
  /** Who Bears the Tax Burden? — ONS Effects of taxes and benefits. */
  taxBurden: "ONS · Effects of taxes and benefits on household income",
  /** Time Machine — HMRC Tables A.1/A.2/A.4 + GOV.UK Scotland after-allowance years. */
  taxTimeMachine: "HMRC · Income Tax and National Insurance rates and allowances",
  /** Time Machine fiscal-drag examples — ONS AWE KAI7 regular pay path. */
  taxFiscalDrag: "ONS · Average weekly earnings regular pay",
  /** Tax Gap — HMRC Measuring tax gaps (MTG 2026 pin). */
  taxGap: "HMRC · Measuring tax gaps",
  totalManagedExpenditure: "ONS · Public sector total managed expenditure",
  /** Where spending goes — HMT PSS / PESA TES by COFOG. */
  tesByFunction: "HM Treasury · Public Spending Statistics Table 5.4",
  /** DEL vs AME — HMT PSS Table 1.1 control totals. */
  tmeDelAme: "HM Treasury · Public Spending Statistics Table 1.1",
  /** Real DEL/AME — HMT PSS Table 1.2, 2025-26 prices. */
  tmeDelAmeReal: "HM Treasury · Public Spending Statistics Table 1.2",
  /** Real TES/COFOG — HMT PSS Table 4.3, 2025-26 prices. */
  tesByFunctionReal: "HM Treasury · Public Spending Statistics Table 4.3",
  /** Long-run TES/COFOG — HMT PSS Table 4.2, £ billion. */
  tesByFunctionLongRun: "HM Treasury · Public Spending Statistics Table 4.2",
  /** ESA Table 11 — general government COFOG (calendar year). */
  esaGgByFunction: "ONS · ESA Table 11 general government expenditure",

  /** Economic policy register — legislation.gov.uk, Hansard, GOV.UK, OBR, Bank of England. */
  policy: "UK legislation · Hansard · HM Treasury · OBR",
  policyPledges: "HM Treasury Charter for Budget Responsibility · Bank of England",

  /** Domain 09 — Trade, Investment & Business. */
  tradeMret: "ONS · Monthly Review of External Trade (balance of payments)",
  tradeExPm: "ONS · UK trade excluding precious metals",
  goodsPartners: "ONS · UK trade all countries (goods partners)",
  goodsCommodity: "ONS · UK trade by SITC commodity",
  goodsByRegion: "HMRC · Regional trade statistics",
  servicesPartners: "ONS · UK trade in services by partner country",
  servicesTrade: "ONS · UK trade in services",
  businessInvestment: "ONS · Business investment",
  fdi: "ONS · Foreign direct investment",
  ukBusiness: "ONS · UK business activity, size and location",
  businessDemography: "ONS · Business demography",
  insolvencies: "Insolvency Service · Company insolvencies",

  netDebt: "ONS · Public sector net debt",
  netBorrowing: "ONS · Public sector net borrowing",
  debtInterest: "ONS · Central government debt interest",
  debtPercentGdp: "ONS · Public sector net debt as a percentage of GDP",
  publicFinances: "ONS · Public sector finances",
  cashBridge: "ONS · Central government cash requirement and change in net debt",

  /** Debt instruments (Domain 08) — DMO publishes; ownership numbers are ONS, republished by the DMO. */
  debtPortfolio: "DMO · Quarterly Review debt portfolio",
  giltsInIssue: "DMO · Gilts in issue",
  giltOwnership: "ONS · Gilt holdings by sector, in the DMO Quarterly Review",
  giltRedemptions: "DMO · Future gilt redemptions",
  governmentHoldings: "DMO · Government holdings of gilts",
} as const;

/**
 * Economy data loaders — cloud only (Exchange API → Supabase Postgres).
 * Never fall back to laptop `data/economy/**` for Ready series.
 * Pack allow-list: `domain-sources.ts` (Energy / Housing pattern).
 */

import {
  fetchIndicator,
  fetchObservations,
  fetchPackJson,
  type IndicatorMeta,
  type Observation,
} from "@/lib/api";
import { loadBasketPack } from "./basket-load";
import { packsFor } from "./domain-sources";
import { loadEconomyPolicyEvents, loadEconomyPolicyPledges } from "./policy-model";
import { createDomainCache } from "@/lib/domain-cache";
import { CPIH_COICOP_DIVISIONS, CPIH_CONTRIBUTION_DIVISIONS } from "./inflation-model";
import type {
  DebtPack,
  EconomyDomainId,
  EmploymentPack,
  FiscalDragPack,
  GdpVintageBandPack,
  GrowthPack,
  HouseholdPack,
  InflationPack,
  InvestmentPack,
  PartnersAnnualPack,
  SeriesPack,
  SpendingPack,
  TaxPack,
  WagesPack,
  PolicyPack,
} from "./types";

const FALLBACK: IndicatorMeta = {
  indicator_id: "",
  title: "",
  sector: "economy-public-finance",
  publisher: "ONS",
  source_url: "",
  series_id: "",
  geography: "United Kingdom",
  frequency: "monthly",
  unit: "",
  definition: "",
  licence: "Open Government Licence v3.0",
  caveats: "",
  revision_notes: "",
  notion_registry_url: "",
};

async function loadSeriesPack(
  id: string,
  params: Record<string, string> = {},
): Promise<SeriesPack | null> {
  const attempt = async (): Promise<SeriesPack> => {
    const [meta, obs] = await Promise.all([
      fetchIndicator(id),
      fetchObservations(id, { limit: "10000", ...params }),
    ]);
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";
    return { meta, observations: obs.observations, sourceVersion };
  };
  try {
    return await attempt();
  } catch (first) {
    try {
      return await attempt();
    } catch (err) {
      console.error(`economy loadSeriesPack(${id}) failed after retry`, err ?? first);
      void FALLBACK;
      return null;
    }
  }
}

export async function loadInflation(): Promise<InflationPack> {
  const coicopIds = CPIH_COICOP_DIVISIONS.map((d) => d.id);
  const contribIds = CPIH_CONTRIBUTION_DIVISIONS.map((d) => d.id);
  const [cpiRate, cpihRate, cpiIndex, cpihIndex, basket, ...rest] = await Promise.all([
    loadSeriesPack("cpi-inflation"),
    loadSeriesPack("cpih-inflation"),
    loadSeriesPack("cpi-index"),
    loadSeriesPack("cpih-index"),
    loadBasketPack(),
    ...coicopIds.map((id) => loadSeriesPack(id)),
    ...contribIds.map((id) => loadSeriesPack(id)),
  ]);
  const coicopPacks = rest.slice(0, coicopIds.length);
  const contribPacks = rest.slice(coicopIds.length);
  const coicop: Record<string, SeriesPack | null> = {};
  coicopIds.forEach((id, i) => {
    coicop[id] = coicopPacks[i] ?? null;
  });
  const contributions: Record<string, SeriesPack | null> = {};
  contribIds.forEach((id, i) => {
    contributions[id] = contribPacks[i] ?? null;
  });
  return { cpiRate, cpihRate, cpiIndex, cpihIndex, coicop, contributions, basket };
}

export async function loadWages(): Promise<WagesPack> {
  const [nominal, real, cpihIndex, cpihRate, ashe, asheRegional, asheIndustry, asheRegionIndustry] =
    await Promise.all([
      loadSeriesPack("nominal-earnings"),
      loadSeriesPack("real-earnings"),
      loadSeriesPack("cpih-index"),
      loadSeriesPack("cpih-inflation"),
      loadSeriesPack("ashe-national-earnings"),
      loadSeriesPack("ashe-regional-earnings"),
      loadSeriesPack("ashe-industry-earnings"),
      loadSeriesPack("ashe-region-industry-earnings"),
    ]);
  return { nominal, real, cpihIndex, cpihRate, ashe, asheRegional, asheIndustry, asheRegionIndustry };
}

export async function loadDebt(): Promise<DebtPack> {
  // Each series is independent: one failing pack becomes null and only its view shows an empty state.
  const [
    debt,
    borrowing,
    interest,
    percentGdp,
    portfolio,
    giltsInIssue,
    ownership,
    redemptions,
    governmentHoldings,
    cashBridge,
  ] = await Promise.all([
    loadSeriesPack("public-sector-net-debt"),
    loadSeriesPack("public-sector-net-borrowing"),
    loadSeriesPack("public-sector-debt-interest"),
    loadSeriesPack("public-sector-net-debt-percent-gdp"),
    loadSeriesPack("dmo-debt-portfolio-composition"),
    loadSeriesPack("dmo-gilts-in-issue"),
    loadSeriesPack("gilt-holdings-by-sector"),
    loadSeriesPack("dmo-gilt-future-redemptions"),
    loadSeriesPack("dmo-government-holdings"),
    loadSeriesPack("cg-cash-debt-reconciliation"),
  ]);
  return {
    debt,
    borrowing,
    interest,
    percentGdp,
    portfolio,
    giltsInIssue,
    ownership,
    redemptions,
    governmentHoldings,
    cashBridge,
  };
}

async function loadGdpVintageBand(): Promise<GdpVintageBandPack | null> {
  try {
    return await fetchPackJson<GdpVintageBandPack>("economy.gdp-vintage-band");
  } catch (err) {
    console.error("economy loadGdpVintageBand failed", err);
    return null;
  }
}

async function loadIndustryGva(): Promise<SeriesPack | null> {
  /** Current-price rows only — Anatomy shares; CVM stays out of this pack. */
  const attempt = async (): Promise<SeriesPack> => {
    const [meta, obs] = await Promise.all([
      fetchIndicator("gva-by-industry-section"),
      fetchObservations("gva-by-industry-section", {
        limit: "10000",
        category: "current_price",
      }),
    ]);
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";
    return { meta, observations: obs.observations, sourceVersion };
  };
  try {
    return await attempt();
  } catch (first) {
    try {
      return await attempt();
    } catch (err) {
      console.error("economy loadIndustryGva failed after retry", err ?? first);
      return null;
    }
  }
}

export async function loadHousehold(): Promise<HouseholdPack> {
  const [
    rhdi,
    rhdiPerHead,
    savingRatio,
    familySpendingByCategory,
    familySpendingByIncome,
    householdFinancialWealth,
    consumerCredit,
    taxBenefits,
  ] = await Promise.all([
    loadSeriesPack("real-household-disposable-income"),
    loadSeriesPack("real-household-disposable-income-per-head"),
    loadSeriesPack("household-saving-ratio"),
    loadSeriesPack("family-spending-by-category"),
    loadSeriesPack("family-spending-by-income"),
    loadSeriesPack("household-financial-wealth"),
    loadSeriesPack("consumer-credit-outstanding"),
    loadSeriesPack("effects-of-taxes-and-benefits"),
  ]);
  return {
    rhdi,
    rhdiPerHead,
    savingRatio,
    familySpendingByCategory,
    familySpendingByIncome,
    householdFinancialWealth,
    consumerCredit,
    taxBenefits,
  };
}

export async function loadGrowth(): Promise<GrowthPack> {
  const [gdp, gdpPerHead, productivity, productivityHours, industryGva, vintageBand] =
    await Promise.all([
      loadSeriesPack("real-gdp"),
      loadSeriesPack("real-gdp-per-head"),
      loadSeriesPack("labour-productivity"),
      loadSeriesPack("labour-productivity-hours"),
      loadIndustryGva(),
      loadGdpVintageBand(),
    ]);
  return { gdp, gdpPerHead, productivity, productivityHours, industryGva, vintageBand };
}

async function loadPartnersAnnual(): Promise<PartnersAnnualPack | null> {
  try {
    return await fetchPackJson<PartnersAnnualPack>("economy.goods-trade-partners-annual");
  } catch (err) {
    console.error("economy loadPartnersAnnual failed", err);
    return null;
  }
}

export async function loadInvestment(): Promise<InvestmentPack> {
  const [
    tradeMret,
    tradeExPm,
    partnersAnnual,
    goodsCommodity,
    goodsByRegion,
    servicesCategory,
    servicesPartner,
    goodsEu,
    goodsNonEu,
    businessInvestment,
    investmentByAsset,
    investmentByIndustry,
    fdi,
    enterprises,
    demography,
    insolvencies,
  ] = await Promise.all([
    loadSeriesPack("uk-trade-mret"),
    loadSeriesPack("uk-trade-ex-precious-metals"),
    loadPartnersAnnual(),
    loadSeriesPack("goods-trade-by-commodity"),
    loadSeriesPack("goods-trade-by-uk-region"),
    loadSeriesPack("services-trade-by-category"),
    loadSeriesPack("services-trade-by-partner"),
    // EU27 / Non-EU aggregates only — the full partner series is 170k rows.
    loadSeriesPack("goods-trade-by-partner", { geography_code: "B5" }),
    loadSeriesPack("goods-trade-by-partner", { geography_code: "D5" }),
    loadSeriesPack("business-investment"),
    loadSeriesPack("business-investment-by-asset"),
    loadSeriesPack("business-investment-by-industry"),
    loadSeriesPack("uk-fdi"),
    loadSeriesPack("uk-business-enterprises"),
    loadSeriesPack("business-demography"),
    loadSeriesPack("company-insolvencies"),
  ]);
  return {
    tradeMret,
    tradeExPm,
    partnersAnnual,
    goodsCommodity,
    goodsByRegion,
    servicesCategory,
    servicesPartner,
    goodsEu,
    goodsNonEu,
    businessInvestment,
    investmentByAsset,
    investmentByIndustry,
    fdi,
    enterprises,
    demography,
    insolvencies,
  };
}

export async function loadEmployment(): Promise<EmploymentPack> {
  const [
    employmentRate,
    inactivityRate,
    unemploymentRate,
    employmentLevel,
    unemploymentLevel,
    inactivityLevel,
    reasonStudents,
    reasonFamilyHome,
    reasonTempSick,
    reasonLongTermSick,
    reasonRetired,
    reasonOther,
    reasonDiscouraged,
    averageHours,
    employmentFullTime,
    employmentPartTime,
    underemployment,
    involuntaryPartTime,
    employmentByOccupation,
    vacancies,
    workforceJobs,
    workforceJobsByIndustry,
    regionalEmploymentRate,
    regionalUnemploymentRate,
    regionalInactivityRate,
  ] = await Promise.all([
    loadSeriesPack("employment-rate"),
    loadSeriesPack("economic-inactivity-rate"),
    loadSeriesPack("unemployment-rate"),
    loadSeriesPack("employment-level"),
    loadSeriesPack("unemployment-level"),
    loadSeriesPack("economic-inactivity-level"),
    loadSeriesPack("inactivity-reason-students"),
    loadSeriesPack("inactivity-reason-family-home"),
    loadSeriesPack("inactivity-reason-temp-sick"),
    loadSeriesPack("inactivity-reason-long-term-sick"),
    loadSeriesPack("inactivity-reason-retired"),
    loadSeriesPack("inactivity-reason-other"),
    loadSeriesPack("inactivity-reason-discouraged"),
    loadSeriesPack("average-actual-weekly-hours"),
    loadSeriesPack("employment-full-time"),
    loadSeriesPack("employment-part-time"),
    loadSeriesPack("underemployment"),
    loadSeriesPack("involuntary-part-time"),
    loadSeriesPack("employment-by-occupation"),
    loadSeriesPack("uk-vacancies"),
    loadSeriesPack("workforce-jobs"),
    loadSeriesPack("workforce-jobs-by-industry"),
    // Regions-owned HI00 — same API, never duplicate under data/economy/
    loadSeriesPack("employment-rate-by-region"),
    loadSeriesPack("unemployment-rate-by-region"),
    loadSeriesPack("economic-inactivity-rate-by-region"),
  ]);
  return {
    employmentRate,
    inactivityRate,
    unemploymentRate,
    employmentLevel,
    unemploymentLevel,
    inactivityLevel,
    reasonStudents,
    reasonFamilyHome,
    reasonTempSick,
    reasonLongTermSick,
    reasonRetired,
    reasonOther,
    reasonDiscouraged,
    averageHours,
    employmentFullTime,
    employmentPartTime,
    underemployment,
    involuntaryPartTime,
    employmentByOccupation,
    vacancies,
    workforceJobs,
    workforceJobsByIndustry,
    regionalEmploymentRate,
    regionalUnemploymentRate,
    regionalInactivityRate,
  };
}

async function loadFiscalDrag(): Promise<FiscalDragPack | null> {
  try {
    return await fetchPackJson<FiscalDragPack>("economy.tax-fiscal-drag");
  } catch (err) {
    console.error("economy loadFiscalDrag failed", err);
    return null;
  }
}

export async function loadTax(): Promise<TaxPack> {
  const [
    taxReceipts,
    taxMachineRules,
    taxTimeMachine,
    fiscalDrag,
    taxComposition,
    taxCgComposition,
    taxBurden,
    taxGap,
  ] = await Promise.all([
    loadSeriesPack("tax-receipts"),
    loadSeriesPack("tax-machine-income-tax-rules"),
    loadSeriesPack("tax-machine-income-tax-history"),
    loadFiscalDrag(),
    loadSeriesPack("tax-receipts-composition"),
    loadSeriesPack("tax-receipts-cg-composition"),
    loadSeriesPack("effects-of-taxes-and-benefits"),
    loadSeriesPack("hmrc-tax-gap"),
  ]);
  return {
    taxReceipts,
    taxMachineRules,
    taxTimeMachine,
    fiscalDrag,
    taxComposition,
    taxCgComposition,
    taxBurden,
    taxGap,
  };
}

export async function loadSpending(): Promise<SpendingPack> {
  return {
    totalManagedExpenditure: await loadSeriesPack("total-managed-expenditure"),
    tesByFunction: await loadSeriesPack("tes-by-function"),
    tmeDelAme: await loadSeriesPack("tme-del-ame"),
    tmeDelAmeReal: await loadSeriesPack("tme-del-ame-real"),
    tesByFunctionReal: await loadSeriesPack("tes-by-function-real"),
    tesByFunctionLongRun: await loadSeriesPack("tes-by-function-long-run"),
    esaGgByFunction: await loadSeriesPack("esa-gg-expenditure-by-function"),
  };
}

export async function loadPolicy(): Promise<PolicyPack> {
  const [policyEvents, policyPledges] = await Promise.all([
    loadEconomyPolicyEvents().catch(() => null),
    loadEconomyPolicyPledges().catch(() => null),
  ]);
  return { policyEvents, policyPledges };
}

export type EconomyData = {
  inflation: InflationPack;
  wages: WagesPack;
  employment: EmploymentPack;
  household: HouseholdPack;
  tax: TaxPack;
  spending: SpendingPack;
  debt: DebtPack;
  growth: GrowthPack;
  investment: InvestmentPack;
  policy: PolicyPack;
};

const EMPTY_INFLATION: InflationPack = {
  cpiRate: null,
  cpihRate: null,
  cpiIndex: null,
  cpihIndex: null,
  coicop: Object.fromEntries(CPIH_COICOP_DIVISIONS.map((d) => [d.id, null])),
  contributions: Object.fromEntries(CPIH_CONTRIBUTION_DIVISIONS.map((d) => [d.id, null])),
  basket: null,
};

const EMPTY_WAGES: WagesPack = {
  nominal: null,
  real: null,
  cpihIndex: null,
  cpihRate: null,
  ashe: null,
  asheRegional: null,
  asheIndustry: null,
  asheRegionIndustry: null,
};

const EMPTY_DEBT: DebtPack = {
  debt: null,
  borrowing: null,
  interest: null,
  percentGdp: null,
  portfolio: null,
  giltsInIssue: null,
  ownership: null,
  redemptions: null,
  governmentHoldings: null,
  cashBridge: null,
};

const EMPTY_HOUSEHOLD: HouseholdPack = {
  rhdi: null,
  rhdiPerHead: null,
  savingRatio: null,
  familySpendingByCategory: null,
  familySpendingByIncome: null,
  householdFinancialWealth: null,
  consumerCredit: null,
  taxBenefits: null,
};

const EMPTY_GROWTH: GrowthPack = {
  gdp: null,
  gdpPerHead: null,
  productivity: null,
  productivityHours: null,
  industryGva: null,
  vintageBand: null,
};

const EMPTY_INVESTMENT: InvestmentPack = {
  tradeMret: null,
  tradeExPm: null,
  partnersAnnual: null,
  goodsCommodity: null,
  goodsByRegion: null,
  servicesCategory: null,
  servicesPartner: null,
  goodsEu: null,
  goodsNonEu: null,
  businessInvestment: null,
  investmentByAsset: null,
  investmentByIndustry: null,
  fdi: null,
  enterprises: null,
  demography: null,
  insolvencies: null,
};

const EMPTY_EMPLOYMENT: EmploymentPack = {
  employmentRate: null,
  inactivityRate: null,
  unemploymentRate: null,
  employmentLevel: null,
  unemploymentLevel: null,
  inactivityLevel: null,
  reasonStudents: null,
  reasonFamilyHome: null,
  reasonTempSick: null,
  reasonLongTermSick: null,
  reasonRetired: null,
  reasonOther: null,
  reasonDiscouraged: null,
  averageHours: null,
  employmentFullTime: null,
  employmentPartTime: null,
  underemployment: null,
  involuntaryPartTime: null,
  employmentByOccupation: null,
  vacancies: null,
  workforceJobs: null,
  workforceJobsByIndustry: null,
  regionalEmploymentRate: null,
  regionalUnemploymentRate: null,
  regionalInactivityRate: null,
};

const EMPTY_TAX: TaxPack = {
  taxReceipts: null,
  taxMachineRules: null,
  taxTimeMachine: null,
  fiscalDrag: null,
  taxComposition: null,
  taxCgComposition: null,
  taxBurden: null,
  taxGap: null,
};

const EMPTY_SPENDING: SpendingPack = {
  totalManagedExpenditure: null,
  tesByFunction: null,
  tmeDelAme: null,
  tmeDelAmeReal: null,
  tesByFunctionReal: null,
  tesByFunctionLongRun: null,
  esaGgByFunction: null,
};

const EMPTY: EconomyData = {
  inflation: EMPTY_INFLATION,
  wages: EMPTY_WAGES,
  employment: EMPTY_EMPLOYMENT,
  household: EMPTY_HOUSEHOLD,
  tax: EMPTY_TAX,
  spending: EMPTY_SPENDING,
  debt: EMPTY_DEBT,
  growth: EMPTY_GROWTH,
  investment: EMPTY_INVESTMENT,
  policy: { policyEvents: null, policyPledges: null },
};

/** Hydrate only the selected domain's packs (Housing / Energy pattern). */
export function loadEconomy(domain: EconomyDomainId): Promise<EconomyData> {
  return economyDomainCache.get(domain);
}

/** One cached payload per domain; stale entries are served and rebuilt behind the reader. */
export const economyDomainCache = createDomainCache<EconomyDomainId, EconomyData>(async (domain) => {
  const data = await buildEconomy(domain);
  const needed = packsFor(domain);
  // Complete when each declared pack has at least one series.
  const complete = needed.every((key) => Object.values(data[key] as Record<string, unknown>).some((v) => v !== null));
  return { data, complete };
});

async function buildEconomy(domain: EconomyDomainId): Promise<EconomyData> {
  const needed = new Set(packsFor(domain));
  if (needed.has("inflation")) return { ...EMPTY, inflation: await loadInflation() };
  if (needed.has("wages")) return { ...EMPTY, wages: await loadWages() };
  if (needed.has("employment")) return { ...EMPTY, employment: await loadEmployment() };
  if (needed.has("household")) return { ...EMPTY, household: await loadHousehold() };
  if (needed.has("tax")) return { ...EMPTY, tax: await loadTax() };
  if (needed.has("spending")) return { ...EMPTY, spending: await loadSpending() };
  if (needed.has("debt")) return { ...EMPTY, debt: await loadDebt() };
  if (needed.has("growth")) return { ...EMPTY, growth: await loadGrowth() };
  if (needed.has("investment")) return { ...EMPTY, investment: await loadInvestment() };
  if (needed.has("policy")) return { ...EMPTY, policy: await loadPolicy() };
  return EMPTY;
}

export function latestFinite(rows: Observation[]): Observation | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (row.value != null && Number.isFinite(row.value)) return row;
  }
  return null;
}

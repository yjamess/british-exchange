import type { IndicatorMeta, Observation } from "@/lib/api";

/** One Ready series pack from the Exchange API (no laptop CSV fallback). */
export type SeriesPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  sourceVersion: string;
};

export type InflationPack = {
  cpiRate: SeriesPack | null;
  cpihRate: SeriesPack | null;
  cpiIndex: SeriesPack | null;
  cpihIndex: SeriesPack | null;
  /** CPIH COICOP division annual rates (What's driving it · rates). */
  coicop: Record<string, SeriesPack | null>;
  /** CPIH COICOP contributions to the all-items annual rate (pp). */
  contributions: Record<string, SeriesPack | null>;
  /** Everyday basket average prices (one pin, category= item slug). */
  basket: SeriesPack | null;
};

export type WagesPack = {
  nominal: SeriesPack | null;
  real: SeriesPack | null;
  cpihIndex: SeriesPack | null;
  /** CPIH all-items annual rate (Pay cheque vs prices · growth panel). */
  cpihRate: SeriesPack | null;
  /** National ASHE Table 1 weekly gross distribution (Wage ladder). */
  ashe: SeriesPack | null;
  /** Regional ASHE Table 7 workplace medians (Geography of Pay). */
  asheRegional: SeriesPack | null;
  /** ASHE Table 4 industry sections, UK (Geography of Pay · industry lens). */
  asheIndustry: SeriesPack | null;
  /** ASHE Table 5 region × industry section workplace medians. */
  asheRegionIndustry: SeriesPack | null;
};

export type DebtPack = {
  debt: SeriesPack | null;
  borrowing: SeriesPack | null;
  interest: SeriesPack | null;
  percentGdp: SeriesPack | null;
  /** DMO Quarterly Review portfolio — conventional / index-linked / T-bills (Anatomy). */
  portfolio: SeriesPack | null;
  /** DMO D1A snapshot of every gilt in issue (Anatomy detail). */
  giltsInIssue: SeriesPack | null;
  /** ONS sector gilt holdings, market value £m (Who owns the debt). */
  ownership: SeriesPack | null;
  /** DMO D8B future redemptions by financial year (Repayment calendar). */
  redemptions: SeriesPack | null;
  /** DMO D4L official government holdings — Data tab only, never ownership. */
  governmentHoldings: SeriesPack | null;
  /** ONS Appendix A REC3 — central government cash requirement → change in net debt (Cash to debt). */
  cashBridge: SeriesPack | null;
};

/** One ONS release vintage inside `economy.gdp-vintage-band`. */
export type GdpVintage = {
  id: string;
  label: string;
  dataset: string;
  release_date: string;
  reference_year: number;
  source_file: string;
  checksum_sha256: string;
  n: number;
  range: [string, string];
  latest_level: number;
  ref_level: number;
  since_ref_pct: number;
  levels: { period_start: string; t: number; v: number }[];
  index: { period_start: string; t: number; v: number }[];
};

export type GdpVintageSpot = {
  latest_period: string;
  first_level: number;
  latest_level: number;
  level_ratio: number;
  first_since_ref_pct: number;
  latest_since_ref_pct: number;
  first_reference_year: number;
  latest_reference_year: number;
};

/** Dated first-estimate + latest-release store for the Growth Revisions chart. */
export type GdpVintageBandPack = {
  pack_id: string;
  built_at: string;
  ref_period: string;
  ref_label: string;
  unit_index: string;
  honesty: string;
  series: {
    "real-gdp": GdpVintage[];
    "real-gdp-per-head": GdpVintage[];
  };
  spot: {
    "real-gdp": GdpVintageSpot;
    "real-gdp-per-head": GdpVintageSpot;
  };
};

export type GrowthPack = {
  gdp: SeriesPack | null;
  gdpPerHead: SeriesPack | null;
  productivity: SeriesPack | null;
  /** Whole-economy productivity hours (LZVA) — Productivity Engine companion to LZVB. */
  productivityHours: SeriesPack | null;
  /** SIC section GVA (current prices) for Anatomy — shares only. */
  industryGva: SeriesPack | null;
  /** Null when Storage pack is missing — Revisions falls back to EmptyStage. */
  vintageBand: GdpVintageBandPack | null;
};

/** Domain 03 — national LFS levels + rates (UK 16–64 SA) + completion packs. */
export type EmploymentPack = {
  employmentRate: SeriesPack | null;
  inactivityRate: SeriesPack | null;
  unemploymentRate: SeriesPack | null;
  employmentLevel: SeriesPack | null;
  unemploymentLevel: SeriesPack | null;
  inactivityLevel: SeriesPack | null;
  /** Outside the Workforce — principal reason levels (000s SA 16–64). */
  reasonStudents: SeriesPack | null;
  reasonFamilyHome: SeriesPack | null;
  reasonTempSick: SeriesPack | null;
  reasonLongTermSick: SeriesPack | null;
  reasonRetired: SeriesPack | null;
  reasonOther: SeriesPack | null;
  reasonDiscouraged: SeriesPack | null;
  /** Working Week / Demand / national jobs. */
  averageHours: SeriesPack | null;
  employmentFullTime: SeriesPack | null;
  employmentPartTime: SeriesPack | null;
  /** Working Week — EMP16 underemployment (people, NSA, 16+) and YCCX involuntary part-time (000s SA). */
  underemployment: SeriesPack | null;
  involuntaryPartTime: SeriesPack | null;
  /** APS employment by SOC 2020 major group (people, 16+, rolling twelve-month windows). */
  employmentByOccupation: SeriesPack | null;
  vacancies: SeriesPack | null;
  workforceJobs: SeriesPack | null;
  /** JOBS02 WFJ SA sections A–T + total (jobs, not people). */
  workforceJobsByIndustry: SeriesPack | null;
  /** Regions HI00 — linked, not forked under Economy. */
  regionalEmploymentRate: SeriesPack | null;
  regionalUnemploymentRate: SeriesPack | null;
  regionalInactivityRate: SeriesPack | null;
};

/**
 * Educational fiscal-drag worked examples (`economy.tax-fiscal-drag`).
 * Status is `documented` — not a separate Registry Ready flip.
 */
export type FiscalDragLiability = {
  gross_employment_income_gbp: number;
  personal_allowance_applied_gbp: number;
  taxable_income_gbp: number;
  income_tax_gbp: number;
  effective_income_tax_rate_percent: number;
};

export type FiscalDragYear = {
  tax_year: string;
  awe_index_vs_2021_22: number;
  awe_annualised_x52_gbp: number;
  actual_statutory: FiscalDragLiability;
  /** E/W/NI only — PA/basic upper indexed to KAI7; absent for Scotland. */
  counterfactual_thresholds_indexed_to_awe?: {
    personal_allowance_gbp: number;
    basic_upper_after_allowance_gbp: number;
    liability: FiscalDragLiability;
    extra_tax_vs_counterfactual_gbp: number;
  };
};

export type FiscalDragProfile = {
  profile_id: string;
  label: string;
  jurisdiction: "england-wales-ni" | "scotland" | string;
  base_gross_gbp: number;
  notes: string;
  years: FiscalDragYear[];
};

export type FiscalDragPack = {
  indicator_id: string;
  artefact: string;
  status: string;
  generated_at?: string;
  assumptions: {
    educational_disclaimer: string;
    earnings_measure: {
      publisher: string;
      series_id: string;
      title: string;
      geography: string;
      related_indicator_id?: string;
    };
    counterfactual: {
      base_tax_year: string;
      end_tax_year: string;
      jurisdiction_scope: string;
      scotland_note: string;
      freeze_context: string;
    };
    tax_model: {
      exclusions: string[];
    };
  };
  profiles: FiscalDragProfile[];
};

/** Domain 06 — public-sector taxes + NICs (AHHY) + Tax Machine + Anatomy composition. */
export type TaxPack = {
  taxReceipts: SeriesPack | null;
  /** Ready statute pin — income tax bands + employee Class 1 NICs. */
  taxMachineRules: SeriesPack | null;
  /** Ready multi-year rates/thresholds archive (Time Machine). */
  taxTimeMachine: SeriesPack | null;
  /**
   * Documented fiscal-drag examples pack (`economy.tax-fiscal-drag`).
   * Nullable when Storage/API is unavailable — UI falls back to rates-only Time Machine.
   */
  fiscalDrag: FiscalDragPack | null;
  /** Ready Appendix D heads under AHHY — MF6P + AIIH + NMHM + AHGR. */
  taxComposition: SeriesPack | null;
  /** Ready CG drill under MF6P — NMBY + NMCU + LIQR. */
  taxCgComposition: SeriesPack | null;
  /** Ready ONS Effects of taxes and benefits (FYE 2024). */
  taxBurden: SeriesPack | null;
  /** Ready HMRC Measuring tax gaps (MTG 2026). */
  taxGap: SeriesPack | null;
};

/** Domain 04 — RHDI living standards + LCF / WAS / BoE household deepen pins. */
export type HouseholdPack = {
  rhdi: SeriesPack | null;
  rhdiPerHead: SeriesPack | null;
  savingRatio: SeriesPack | null;
  familySpendingByCategory: SeriesPack | null;
  familySpendingByIncome: SeriesPack | null;
  householdFinancialWealth: SeriesPack | null;
  consumerCredit: SeriesPack | null;
  /** Domain 06 ETB — adjacent tax context on the Ledger only; never summed with LCF. */
  taxBenefits: SeriesPack | null;
};

/** Domain 09 — Trade & Investment (route id `investment`). */
export type PartnersAnnualPack = {
  id: string;
  title: string;
  honesty: string;
  years: string[];
  /** Months published per calendar year; `partial` = year to date. Absent on pre-2026-11-16 packs. */
  coverage?: Record<string, { months: number; first: string; last: string; partial: boolean }>;
  by_year: Record<
    string,
    {
      exports: { code: string; label: string; value: number; period: string }[];
      imports: { code: string; label: string; value: number; period: string }[];
    }
  >;
};

/** HMRC OTS partner × SITC1 product mix (Storage pack) — Trading World dossier frames. */
export type PartnerCommodityPack = {
  id: string;
  title: string;
  honesty: string;
  source: string;
  source_version: string;
  unit: string;
  classification: string;
  sitc1_labels: Record<string, string>;
  years: string[];
  coverage: Record<string, { months: number; first: string; last: string; partial: boolean }>;
  by_year: Record<
    string,
    {
      exports: Record<string, { sitc1: string; label: string; value: number }[]>;
      imports: Record<string, { sitc1: string; label: string; value: number }[]>;
    }
  >;
  built_at?: string;
};

export type InvestmentPack = {
  tradeMret: SeriesPack | null;
  tradeExPm: SeriesPack | null;
  /** Annual ISO2 partner rollups (Storage pack) — Trading World map + ranks. */
  partnersAnnual: PartnersAnnualPack | null;
  /** Partner × SITC1 mix (HMRC OTS) — dossier product frames. */
  partnerCommodity: PartnerCommodityPack | null;
  goodsCommodity: SeriesPack | null;
  goodsByRegion: SeriesPack | null;
  servicesCategory: SeriesPack | null;
  /** ONS services trade by partner — annual, ISO2 countries + EU27 (B5) / Non-EU (D5). */
  servicesPartner: SeriesPack | null;
  /** Goods trade with the EU27 (B5) and with non-EU partners (D5) — monthly, from goods-trade-by-partner. */
  goodsEu: SeriesPack | null;
  goodsNonEu: SeriesPack | null;
  businessInvestment: SeriesPack | null;
  investmentByAsset: SeriesPack | null;
  investmentByIndustry: SeriesPack | null;
  fdi: SeriesPack | null;
  enterprises: SeriesPack | null;
  demography: SeriesPack | null;
  insolvencies: SeriesPack | null;
};

/** Domain 07 — TME flagship + TES/COFOG + DEL/AME (+ real-terms). */
/** Economy Domain 10 — event + pledge registers (packs from the API; not observation series). */
export type PolicyPack = {
  policyEvents: import("./policy-model").PolicyEventsPack | null;
  policyPledges: import("./policy-model").PolicyPledgesPack | null;
};

export type SpendingPack = {
  totalManagedExpenditure: SeriesPack | null;
  /** Ready HMT PSS Table 5.4 — TES by COFOG (not monthly EBFT). */
  tesByFunction: SeriesPack | null;
  /** Ready HMT PSS Table 1.1 — Total DEL + Departmental AME + Other AME. */
  tmeDelAme: SeriesPack | null;
  /** Ready HMT PSS Table 1.2 — real terms, 2025-26 prices, £ million. */
  tmeDelAmeReal: SeriesPack | null;
  /** Ready HMT PSS Table 4.3 — real TES/COFOG, 2025-26 prices, £ billion. */
  tesByFunctionReal: SeriesPack | null;
  /** Ready HMT PSS Table 4.2 — nominal TES/COFOG long-run, £ billion. */
  tesByFunctionLongRun: SeriesPack | null;
  /** Ready ONS ESA Table 11 — general government COFOG, calendar year, £ million. */
  esaGgByFunction: SeriesPack | null;
};

export type EconomyDomainId =
  | "inflation"
  | "wages"
  | "employment"
  | "household"
  | "growth"
  | "tax"
  | "spending"
  | "debt"
  | "investment"
  | "policy";

/** Rail order 01–10 (Economy Sector Control). */
export const ECONOMY_DOMAIN_IDS: EconomyDomainId[] = [
  "inflation",
  "wages",
  "employment",
  "household",
  "growth",
  "tax",
  "spending",
  "debt",
  "investment",
  "policy",
];

/** Domains with a drawn canvas and cloud-loaded Ready series. Everything else is In preparation. */
export const ECONOMY_READY_DOMAINS: ReadonlySet<EconomyDomainId> = new Set<EconomyDomainId>([
  "inflation",
  "wages",
  "employment",
  "household",
  "growth",
  "tax",
  "spending",
  "debt",
  "investment",
  "policy",
]);

/** Stage copy for domains without a canvas yet (same words as Energy). */
export const ECONOMY_STAGE_EMPTY = {
  preparation: {
    label: "In preparation",
    hint: "This domain is still being drawn. Ready series will appear here once they pass validation.",
  },
} as const;

/** Old scaffold domain ids → Wave A ids (Review Gate 2026-11-11). */
export const LEGACY_ECONOMY_DOMAIN: Record<string, EconomyDomainId> = {
  prices: "inflation",
  work: "wages",
  output: "growth",
  finances: "debt",
};

/** @deprecated Prefer `resolveEconomyDomain` from `./domain-sources`. */
export function resolveEconomyDomain(raw: string | string[] | undefined): EconomyDomainId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "inflation";
  if ((ECONOMY_DOMAIN_IDS as string[]).includes(value)) return value as EconomyDomainId;
  return LEGACY_ECONOMY_DOMAIN[value] ?? "inflation";
}

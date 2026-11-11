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
  pn2_level: number;
  qna_level: number;
  level_ratio: number;
  pn2_since_ref_pct: number;
  qna_since_ref_pct: number;
  pn2_reference_year: number;
  qna_reference_year: number;
};

/** Dated PN2 + QNA store for the Growth Revisions signature chart. */
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
  /** Null when Storage pack is missing — Revisions falls back to EmptyStage. */
  vintageBand: GdpVintageBandPack | null;
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

/** Wave A domains with a drawn canvas and cloud-loaded Ready series. Everything else is In preparation. */
export const ECONOMY_READY_DOMAINS: ReadonlySet<EconomyDomainId> = new Set<EconomyDomainId>([
  "inflation",
  "wages",
  "growth",
  "debt",
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

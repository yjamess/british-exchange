import type { DomainId } from "./model";

/**
 * Terms listed under “Terms” in each Housing stage's Notes foot (docs/work-plan.md › GLOSS-03-HOUSING).
 * Slugs are rows in the shared registry (data/glossary/terms.yaml → /glossary). `*` applies to every
 * view of a domain. <Term> markers on the stage add themselves; this map covers the words that sit
 * in menus, captions and axis labels where a marker cannot go.
 */
const HOUSING_TERMS: Record<DomainId, Record<string, string[]>> = {
  prices: {
    "*": ["uk-hpi", "hm-land-registry", "nominal"],
    history: ["real-terms", "cpi", "provisional"],
    segments: ["first-time-buyer"],
    table: ["real-terms", "cpi"],
  },
  renting: {
    "*": ["pipr"],
    monthly: ["provisional"],
    change: ["provisional"],
    index: ["provisional"],
    tenancies: ["social-rent", "affordable-rent", "intermediate-rent", "registered-provider"],
  },
  affordability: {
    "*": ["affordability-ratio", "median", "workplace-based-earnings", "aff1"],
    experiment: ["uk-hpi", "quoted-rate", "ltv"],
    rent: ["rent-to-earnings", "pipr"],
    ages: ["ehs"],
    households: ["ehs"],
  },
  stock: {
    "*": ["dwelling", "household", "tenure", "mhclg"],
    composition: ["owner-occupied", "private-rented", "social-rented"],
    tenure: ["owner-occupied", "private-rented", "social-rented", "adjustment-to-census"],
    types: ["census-ts044"],
    vacancy: ["vacant"],
  },
  supply: {
    "*": ["starts", "completions", "net-additional-dwellings", "mhclg-live-tables"],
    pipeline: ["planning-permission"],
    "who-builds": ["builder-tenure", "registered-provider"],
  },
  land: {
    "*": ["lpa", "planning-data"],
    explorer: ["brownfield", "green-belt", "article-4", "tpo", "local-plan"],
    sites: ["brownfield", "planning-permission"],
    decisions: ["allow-rate", "local-plan", "planning-permission"],
    history: ["green-belt"],
  },
  quality: {
    "*": ["ehs", "decent-homes-standard", "non-decent"],
    inside: ["hhsrs", "category-1-hazard"],
    condition: ["hhsrs", "category-1-hazard"],
    energy: ["epc-band", "band-c", "sap", "epc-register"],
    geography: ["epc-register", "epc-band"],
  },
  insecurity: {
    "*": ["mhclg"],
    pathways: ["prevention-duty", "relief-duty", "main-duty", "priority-need", "intentionally-homeless"],
    temporary: ["temporary-accommodation", "main-duty"],
    displacement: ["possession-action", "moj", "section-21"],
    need: ["concealed-household", "household"],
    cost: ["temporary-accommodation"],
  },
  ownership: {
    "*": [],
    ownership: ["freehold", "leasehold", "ccod-ocod", "hm-land-registry"],
    mortgages: ["mlar", "fca-pra", "ltv", "quoted-rate", "gross-advances", "arrears", "buy-to-let", "remortgage"],
    wealth: ["net-property-wealth", "wealth-and-assets-survey", "hmrc"],
    table: ["nominal"],
  },
  policy: {
    "*": ["section-21"],
  },
};

export function housingTerms(domain: DomainId, view: string): string[] {
  const d = HOUSING_TERMS[domain] ?? {};
  return [...new Set([...(d["*"] ?? []), ...(d[view] ?? [])])];
}

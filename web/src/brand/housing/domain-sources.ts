/** Server data boundary. A domain must declare its dependencies, including cross-domain series. */
export const DOMAIN_SOURCES = {
  prices: ["uk-average-house-price", "house-prices-by-region", "uk-hpi-measures", "cpi-index"],
  renting: ["private-rental-price-index", "private-rental-prices", "social-housing-lettings"],
  affordability: ["uk-average-house-price", "house-prices-by-region", "house-price-to-earnings-ratio", "housing-purchase-affordability", "mortgage-rate-2yr-fixed", "rent-to-earnings-ratio", "private-rental-prices", "concealed-households"],
  stock: ["dwelling-stock-by-tenure", "dwelling-stock-by-region", "dwelling-stock-by-district", "dwelling-type", "vacant-dwellings", "second-homes"],
  supply: ["housing-completions", "housing-starts", "net-additional-dwellings", "net-additions-by-authority", "affordable-housing-supply", "planning-decisions-granted", "dwelling-stock-by-tenure", "dwelling-stock-by-region", "dwelling-stock-by-district"],
  land: ["green-belt-area", "land-use-stock", "planning-decisions-granted", "brownfield-land"],
  quality: ["ehs-decent-homes", "ehs-category-1-hazards", "ehs-damp-surveyor", "ehs-energy-efficiency-bands", "ehs-heating", "ehs-insulation", "ehs-energy-improvement", "epc-domestic-lodgements", "epc-domestic-lodgements-by-local-authority"],
  insecurity: ["statutory-homelessness-assessments", "homelessness-prevention-outcomes", "homelessness-relief-outcomes", "homelessness-main-duty", "temporary-accommodation-households", "temporary-accommodation-children", "temporary-accommodation-by-type", "temporary-accommodation-duration", "temporary-accommodation-out-of-area", "rough-sleeping-snapshot", "social-housing-waiting-list", "social-housing-lettings", "possession-claims", "concealed-households", "homelessness-support-needs", "homelessness-priority-need", "homelessness-devolved-ta", "temporary-accommodation-spend", "rough-sleeping-framework"],
  ownership: ["mortgage-approvals", "residential-mortgage-book", "household-net-property-wealth", "mortgage-rate-2yr-fixed", "corporate-owned-titles", "estates-residential-property"],
  policy: [],
} as const;

export type HousingDomain = keyof typeof DOMAIN_SOURCES;
export type HousingScope = HousingDomain | "all";
export function sourceAllowed(scope: HousingScope, id: string): boolean {
  return scope === "all" || (DOMAIN_SOURCES[scope] as readonly string[]).includes(id);
}

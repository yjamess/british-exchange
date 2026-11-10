/**
 * Human-readable source lines for Energy explorers.
 *
 * Matches Housing FigureRecord feet: publisher · series (table when useful).
 * Release pins, indicator ids, file names and source_version strings live in Data —
 * never on the stage source row. See Explorer FigureRecord docs.
 */

/** Drop Exchange pin codes (REPD_Q2_2026, DUKES_5.11_2025, …) from user-facing copy. */
export function stripPinCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\b[A-Z]{2,}(?:[_-][A-Z0-9.]+){1,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s·\s·/g, " · ")
    .replace(/^[\s·]+|[\s·]+$/g, "")
    .trim();
}

export const ENERGY_SOURCE = {
  generationLongRun: "DESNZ · Electricity since 1920",
  generationEt51: "DESNZ · Energy Trends · table 5.1",
  generationCapacity: "DESNZ · Digest of UK Energy Statistics · table 5.12.C",
  generationYearMix: "NESO · Great Britain generation mix",
  generationAtlas: "DESNZ · Renewable Energy Planning Database · DUKES table 5.11",
  generationOpenings: "DESNZ · List of Electricity Generators",

  consumptionFinal: "DESNZ · Energy Consumption in the UK · table C1",
  consumptionEndUse: "DESNZ · Energy Consumption in the UK · table U3",
  consumptionGeography: "DESNZ · Subnational final energy consumption",
  consumptionUseful: "DESNZ · Energy Consumption in the UK · table W1",

  pricesDomesticElectricity: "DESNZ · Quarterly Energy Prices · domestic electricity bills",
  pricesDomesticGas: "DESNZ · Quarterly Energy Prices · domestic gas bills",
  pricesBillLayersElectricity: "DESNZ · Quarterly Energy Prices · electricity unit and standing charges",
  pricesBillLayersGas: "DESNZ · Quarterly Energy Prices · gas unit and standing charges",
  pricesIndustrial: "DESNZ · Quarterly Energy Prices · industrial electricity prices",
  pricesEconomies: "DESNZ · Quarterly Energy Prices · domestic bills and industrial prices",
  pricesOfgemCap: "Ofgem · default tariff (price) cap · Annex 9 GB average",
  pricesOfgemRegional: "Ofgem · default tariff (price) cap · Annex 9 regions",
  pricesReal: "DESNZ · Quarterly Energy Prices · ONS · CPIH (L522)",
  pricesShock: "DESNZ · Quarterly Energy Prices · domestic bills and industrial electricity",
  pricesRegions: "DESNZ · Quarterly Energy Prices · unit rates and standing charges by region",
  pricesAfford: "DESNZ · domestic bills · ONS · average weekly earnings (KAI7)",
  pricesWholesale: "DESNZ · Quarterly Energy Prices · fuels purchased by major power producers",
  pricesEconomy7: "DESNZ · Quarterly Energy Prices · Economy 7 electricity bills",

  fossilsCrude: "DESNZ · Indigenous crude oil production",
  fossilsGas: "DESNZ · Energy Trends · domestic gas production",
  fossilsPrimary: "DESNZ · Energy Trends · table 1.1",
  fossilsFuels: "DESNZ · Crude oil · gas · coal · primary energy",
  fossilsNorthSea: "NSTA · UKCS offshore fields · PPRS field production",
  fossilsGap: "DESNZ · Primary production · energy imports · oil imports",
  fossilsReserves: "NSTA · Historic oil and gas reserves and contingent resources",

  importsDependency: "DESNZ · Energy Trends · table 1.3 · import dependency",
  importsTrade: "DESNZ · Energy Trends · table 1.3 · imports and exports",
  importsConnectors: "DESNZ · ET 5.6 flows · NESO Interconnector Register capacity",
  importsLifelinesOil: "DESNZ · Digest of UK Energy Statistics · table 3.7 · oil by country",
  importsLifelinesGas: "DESNZ · Digest of UK Energy Statistics · table 4.5a · gas by partner",
  importsLifelinesLng: "DESNZ · Digest of UK Energy Statistics · table 4.6 · LNG by terminal",
  importsLifelines: "DESNZ · DUKES · oil by country · gas by partner · LNG by terminal",
  importsResilience: "DESNZ · Energy Trends · table 1.3 · import · fossil · low carbon ratios",
  importsResilienceStorage:
    "DESNZ · ET 1.3 ratios · DUKES 4.4a gas stock and storage capacity",
  importsShock: "Operator · DESNZ · National Grid · Statnett · sourced event cards",

  renewablesLoadFactors: "DESNZ · Digest of UK Energy Statistics · table 6.3",
  renewablesPlantLoadFactors: "DESNZ · Digest of UK Energy Statistics · table 5.10",
  renewablesPipeline: "DESNZ · Renewable Energy Planning Database · non-operational",
  renewablesField: "DESNZ · Capacity · generation · load factors",
  renewablesFieldNuclear: "DESNZ · DUKES · tables 5.12 · 5.10 · Energy Trends 5.1",

  networksBorder: "DESNZ · Energy Trends · table 5.6 · interconnector flows",
  networksNight: "NESO · Great Britain generation mix",
  networksQueue: "NESO · Transmission Entry Capacity (TEC) Register",
  networksCapacity: "NESO · Interconnector Register · firm TEC MW",
  networksGrid: "SSEN Distribution · substations · overhead lines",

  manufacturingIop: "ONS · Index of Production · manufacturing",
  manufacturingIopBranches: "ONS · Index of Production · SIC subsections and divisions",
  manufacturingLandscape: "ONS · Index of Production · workforce jobs · share of GVA",
  manufacturingBres: "ONS · BRES Table 4 · manufacturing employee jobs by region",
  manufacturingBresDivision:
    "ONS · Nomis BRES · manufacturing employee jobs by division and region",

  jobsProductivity: "ONS · Labour productivity · manufacturing",
  jobsLandscape: "ONS · Workforce jobs · Index of Production · productivity",
  jobsAtlas: "ONS · BRES · manufacturing employee jobs by region",
  jobsPay: "ONS · ASHE Table 4 · manufacturing median earnings",

  policy: "UK legislation · DESNZ · GOV.UK",
} as const;

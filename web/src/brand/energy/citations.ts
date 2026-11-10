/**
 * Human-readable source lines for Energy explorers.
 *
 * Match Housing Notes feet: `Publisher · series · geography · period`.
 * This file holds **publisher · series** only (one middle dot after the
 * publisher, or publishers listed first for multi-source feet). Geography and
 * period come from view evidence via `energySource` / `formatSource`.
 *
 * Prefer plain publication names over bare acronyms (ET, DUKES, QEP, BRES…).
 * Table numbers stay inside the series name the way Housing keeps
 * “Live Table 213” — not as a separate · segment.
 * Pins, indicator ids and file names belong on Data — never on this row.
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
  generationLongRun: "DESNZ · Electricity generation since 1920",
  generationEt51: "DESNZ · Energy Trends table 5.1",
  generationCapacity: "DESNZ · Digest of UK Energy Statistics table 5.12.C",
  generationYearMix: "NESO · Great Britain generation mix",
  generationAtlas: "DESNZ · Renewable Energy Planning Database and Digest table 5.11",
  generationOpenings: "DESNZ · List of Electricity Generators",

  consumptionFinal: "DESNZ · Energy Consumption in the UK table C1",
  consumptionEndUse: "DESNZ · Energy Consumption in the UK table U3",
  consumptionGeography: "DESNZ · Subnational final energy consumption",
  consumptionUseful: "DESNZ · Energy Consumption in the UK table W1",

  pricesDomesticElectricity: "DESNZ · Quarterly Energy Prices domestic electricity bills",
  pricesDomesticGas: "DESNZ · Quarterly Energy Prices domestic gas bills",
  pricesBillLayersElectricity: "DESNZ · Quarterly Energy Prices electricity unit and standing charges",
  pricesBillLayersGas: "DESNZ · Quarterly Energy Prices gas unit and standing charges",
  pricesIndustrial: "DESNZ · Quarterly Energy Prices industrial electricity prices",
  pricesEconomies: "DESNZ · Quarterly Energy Prices domestic bills and industrial prices",
  pricesOfgemCap: "Ofgem · Default tariff cap Annex 9 Great Britain average",
  pricesOfgemRegional: "Ofgem · Default tariff cap Annex 9 regions",
  pricesReal: "DESNZ · ONS · Quarterly Energy Prices and CPIH",
  pricesShock: "DESNZ · Quarterly Energy Prices domestic bills and industrial electricity",
  pricesRegions: "DESNZ · Quarterly Energy Prices unit rates and standing charges by region",
  pricesAfford: "DESNZ · ONS · Domestic bills and average weekly earnings",
  pricesWholesale: "DESNZ · Quarterly Energy Prices fuels purchased by major power producers",
  pricesEconomy7: "DESNZ · Quarterly Energy Prices Economy 7 electricity bills",

  fossilsCrude: "DESNZ · Indigenous crude oil production",
  fossilsGas: "DESNZ · Energy Trends domestic gas production",
  fossilsPrimary: "DESNZ · Energy Trends table 1.1",
  fossilsFuels: "DESNZ · Crude oil, gas, coal and primary energy production",
  fossilsNorthSea: "NSTA · UK Continental Shelf fields and field production",
  fossilsGap: "DESNZ · Primary production and energy imports",
  fossilsReserves: "NSTA · Historic oil and gas reserves and contingent resources",

  importsDependency: "DESNZ · Energy Trends table 1.3 import dependency",
  importsTrade: "DESNZ · Energy Trends table 1.3 imports and exports",
  importsConnectors: "DESNZ · NESO · Energy Trends table 5.6 flows and Interconnector Register capacity",
  importsLifelinesOil: "DESNZ · Digest of UK Energy Statistics table 3.7 oil by country",
  importsLifelinesGas: "DESNZ · Digest of UK Energy Statistics table 4.5a gas by partner",
  importsLifelinesLng: "DESNZ · Digest of UK Energy Statistics table 4.6 liquefied natural gas by terminal",
  importsLifelines: "DESNZ · Digest oil, gas and liquefied natural gas trade tables",
  importsResilience: "DESNZ · Energy Trends table 1.3 dependency ratios",
  importsResilienceStorage:
    "DESNZ · Energy Trends table 1.3 ratios and Digest table 4.4a gas storage",
  importsShock: "DESNZ · National Grid · Statnett · Operator event cards",

  renewablesLoadFactors: "DESNZ · Digest of UK Energy Statistics table 6.3",
  renewablesPlantLoadFactors: "DESNZ · Digest of UK Energy Statistics table 5.10",
  renewablesPipeline: "DESNZ · Renewable Energy Planning Database non-operational projects",
  renewablesField: "DESNZ · Capacity, generation and load factors",
  renewablesFieldNuclear: "DESNZ · Digest tables 5.12 and 5.10 and Energy Trends table 5.1",

  networksBorder: "DESNZ · Energy Trends table 5.6 interconnector flows",
  networksNight: "NESO · Great Britain generation mix",
  networksQueue: "NESO · Transmission Entry Capacity register",
  networksCapacity: "NESO · Interconnector Register firm capacity",
  networksGrid: "SSEN Distribution · Substations and overhead lines",

  manufacturingIop: "ONS · Index of Production manufacturing",
  manufacturingIopBranches: "ONS · Index of Production manufacturing branches",
  manufacturingLandscape: "ONS · Index of Production, workforce jobs and share of GVA",
  manufacturingBres: "ONS · Business Register and Employment Survey manufacturing jobs by region",
  manufacturingBresDivision:
    "ONS · Business Register and Employment Survey manufacturing jobs by division and region",

  jobsProductivity: "ONS · Labour productivity manufacturing",
  jobsLandscape: "ONS · Workforce jobs, Index of Production and productivity",
  jobsAtlas: "ONS · Business Register and Employment Survey manufacturing jobs by region",
  jobsPay: "ONS · Annual Survey of Hours and Earnings manufacturing median pay",

  policy: "UK legislation · DESNZ and GOV.UK",
  policyPledges: "GOV.UK and party manifestos · DESNZ Energy Trends",
} as const;

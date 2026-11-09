/**
 * Server-only loaders for Energy Domain 01.
 * Client components must import types/helpers from packs.ts — not this file —
 * because long-run loading uses node:fs (Next.js App Router boundary).
 */

import { stationPosition } from "./station-model";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fetchIndicator, fetchObservations, type IndicatorMeta, type Observation } from "@/lib/api";
import {
  CROSS_SECTOR_END_USE_ID,
  DOMESTIC_END_USE_ID,
  FINAL_CONSUMPTION_ID,
  PRIMARY_FLOW_ID,
  SUBNATIONAL_ID,
  type AssumedEfficienciesPack,
  type ConsumptionPack,
  type GeographyPack,
} from "./consumption-model";
import { annualMix, type GenObs } from "./generation-model";
import type { AtlasPack, CapacityPack, GenerationPack, YearPack } from "./packs";
import { longRunFromRows, type Coverage, type LongRunPack } from "./long-run";
import {
  CPIH_INDEX_ID,
  DOMESTIC_BILLS_ID,
  DOMESTIC_ECONOMY7_ID,
  DOMESTIC_GAS_BILLS_ID,
  DOMESTIC_UNIT_STANDING_ID,
  DOMESTIC_GAS_UNIT_STANDING_ID,
  INDUSTRIAL_PRICES_ID,
  MPP_FUEL_PRICES_ID,
  OFGEM_CAP_ID,
  OFGEM_CAP_REGIONAL_ID,
  NOMINAL_EARNINGS_ID,
  type PricesPack,
  type SeriesPack,
} from "./prices-model";
import {
  CRUDE_OIL_ID,
  DOMESTIC_GAS_ID,
  HISTORICAL_COAL_ID,
  IMPORT_DEPENDENCY_ID as FOSSILS_DEPENDENCY_ID,
  IMPORTS_EXPORTS_ID as FOSSILS_TRADE_ID,
  NSTA_FIELD_PRODUCTION_ID,
  OIL_IMPORTS_ID,
  PRIMARY_PRODUCTION_ID,
  UK_RESERVES_ID,
  type FieldAnnual,
  type FieldPoint,
  type FossilsPack,
} from "./fossils-model";
import {
  FOSSIL_FUEL_DEPENDENCY_ID,
  GAS_TRADE_BY_PARTNER_ID,
  IMPORT_DEPENDENCY_ID,
  IMPORTS_EXPORTS_ID,
  INTERCONNECTOR_CAPACITY_ID,
  INTERCONNECTOR_FLOWS_ID,
  LNG_IMPORTS_BY_TERMINAL_ID,
  LOW_CARBON_ENERGY_SHARE_ID,
  NATURAL_GAS_STORAGE_ID,
  OIL_IMPORTS_BY_COUNTRY_ID,
  type ImportsPack,
} from "./imports-model";
import {
  EMPLOYMENT_ID,
  OUTPUT_INDEX_ID,
  OUTPUT_PER_HOUR_ID,
  SHARE_GVA_ID,
  type ManufacturingPack,
} from "./manufacturing-model";
import {
  LOAD_FACTORS_ID,
  PIPELINE_ID,
  PLANT_LOAD_FACTORS_ID,
  type RenewablesPack,
} from "./renewables-model";
import {
  INTERCONNECTOR_FLOWS_ID as NETWORKS_IC_ID,
  type NetworksPack,
} from "./networks-model";

export type { AtlasPack, CapacityPack, GenerationPack, YearPack } from "./packs";
export type { ConsumptionPack };
export type { PricesPack };
export type { FossilsPack };
export type { ImportsPack };
export type { ManufacturingPack };
export type { RenewablesPack };
export type { NetworksPack };
export { atlasTechRows, capacityRowsForYear, yearMonthlyStack } from "./packs";

export const GENERATION_ID = "electricity-generation-by-source";
export const CAPACITY_ID = "electricity-capacity-by-technology";
export const YEAR_MIX_ID = "gb-generation-mix-half-hourly";
export const ATLAS_ID = "renewable-energy-planning-operational";
export const STATIONS_ID = "uk-power-stations-dukes";

/** GB land outline in station/field map coordinates — context only, never an indicator. */
function loadGbOutline(): { outline?: string; outlineAttribution?: string } {
  try {
    const dir = path.resolve(process.cwd(), "../data/regions/housing-boundaries/curated");
    const geo = JSON.parse(readFileSync(path.join(dir, "boundaries.geojson"), "utf8"));
    const source = JSON.parse(readFileSync(path.join(dir, "source.json"), "utf8"));
    const outline = geo.features
      .flatMap((f: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }) => {
        const polygons =
          f.geometry.type === "Polygon"
            ? [f.geometry.coordinates as number[][][]]
            : (f.geometry.coordinates as number[][][][]);
        return polygons.flatMap((poly) =>
          poly.map(
            (ring) =>
              ring
                .map(([lon, lat], i) => {
                  const [x, y] = stationPosition(lon, lat);
                  return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join("") + "Z",
          ),
        );
      })
      .join("");
    return { outline, outlineAttribution: source.attribution as string };
  } catch {
    return {};
  }
}

function asGenObs(rows: Observation[]): GenObs[] {
  return rows.map((r) => ({
    period_start: r.period_start,
    value: r.value,
    observation_status: r.observation_status,
    notes: r.notes ?? "",
    source_version: r.source_version ?? "",
  }));
}

export async function loadGeneration(): Promise<GenerationPack | null> {
  try {
    const [meta, obs] = await Promise.all([
      fetchIndicator(GENERATION_ID),
      fetchObservations(GENERATION_ID, { limit: "10000" }),
    ]);
    const mix = annualMix(asGenObs(obs.observations));
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";
    return {
      meta,
      observations: obs.observations,
      mix,
      sourceVersion,
      retrievedNote: "Loaded from the Exchange API (pinned raw under data/energy/electricity-generation-by-source/).",
    };
  } catch {
    return null;
  }
}

export async function loadCapacity(): Promise<CapacityPack | null> {
  try {
    const [meta, obs] = await Promise.all([
      fetchIndicator(CAPACITY_ID),
      fetchObservations(CAPACITY_ID, { limit: "10000" }),
    ]);
    const years = [
      ...new Set(obs.observations.map((r) => Number(r.period_start.slice(0, 4))).filter((y) => Number.isFinite(y))),
    ].sort((a, b) => a - b);
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";
    return { meta, observations: obs.observations, years, sourceVersion };
  } catch {
    return null;
  }
}

export async function loadYearMix(): Promise<YearPack | null> {
  try {
    const [meta, obs] = await Promise.all([
      fetchIndicator(YEAR_MIX_ID),
      fetchObservations(YEAR_MIX_ID, { limit: "10000" }),
    ]);
    const years = [
      ...new Set(obs.observations.map((r) => Number(r.period_start.slice(0, 4))).filter((y) => Number.isFinite(y))),
    ];
    const year = years.sort((a, b) => a - b).at(-1) ?? 2024;
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";
    return { meta, observations: obs.observations, year, sourceVersion };
  } catch {
    return null;
  }
}

export async function loadConsumption(): Promise<ConsumptionPack> {
  async function one(id: string) {
    try {
      // API caps `limit` at 10_000 (422 above that) — see britain_exchange.api observations route.
      const [meta, obs] = await Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })]);
      return { meta, observations: obs.observations };
    } catch {
      return null;
    }
  }
  const [final, flow, endUse, crossEndUse, geography, efficiencies] = await Promise.all([
    one(FINAL_CONSUMPTION_ID),
    one(PRIMARY_FLOW_ID),
    one(DOMESTIC_END_USE_ID),
    one(CROSS_SECTOR_END_USE_ID),
    loadGeography(),
    loadAssumedEfficiencies(),
  ]);
  return { final, flow, endUse, crossEndUse, geography, efficiencies };
}

function loadAssumedEfficiencies(): AssumedEfficienciesPack | null {
  try {
    const root = path.resolve(process.cwd(), "../data/energy/primary-energy-flow-allocation");
    return JSON.parse(
      readFileSync(path.join(root, "curated/assumed_efficiencies.json"), "utf8"),
    ) as AssumedEfficienciesPack;
  } catch {
    return null;
  }
}

function loadPopulationPack(): GeographyPack["population"] {
  try {
    const root = path.resolve(process.cwd(), "../data/people/subnational-population-estimate");
    return JSON.parse(
      readFileSync(path.join(root, "curated/population.json"), "utf8"),
    ) as NonNullable<GeographyPack["population"]>;
  } catch {
    return null;
  }
}

async function loadGeography(): Promise<GeographyPack | null> {
  try {
    let meta = null;
    try {
      meta = await fetchIndicator(SUBNATIONAL_ID);
    } catch {
      meta = null;
    }
    const root = path.resolve(process.cwd(), "../data/energy/subnational-final-consumption");
    const raw = JSON.parse(readFileSync(path.join(root, "curated/geography.json"), "utf8")) as {
      years: number[];
      places: GeographyPack["places"];
      note: string;
    };
    const auth = JSON.parse(readFileSync(path.join(root, "curated/authorities.json"), "utf8")) as {
      places: GeographyPack["authorities"];
      note: string;
    };
    return {
      meta,
      years: raw.years,
      places: raw.places,
      authorities: auth.places,
      note: raw.note,
      authoritiesNote: auth.note,
      population: loadPopulationPack(),
    };
  } catch {
    return null;
  }
}

export async function loadAtlas(): Promise<AtlasPack | null> {
  try {
    const [meta, obs] = await Promise.all([
      fetchIndicator(ATLAS_ID),
      fetchObservations(ATLAS_ID, { limit: "10000" }),
    ]);
    const root = path.resolve(process.cwd(), "../data/energy/renewable-energy-planning-operational");
    const atlas = JSON.parse(readFileSync(path.join(root, "curated/atlas.json"), "utf8")) as {
      offshore_mw: number;
      operational_sites: number;
      sites_with_coordinates?: number;
      tiles: { code: string; name: string; mw: number }[];
      largest_sites: AtlasPack["largestSites"];
      points?: {
        id: string;
        name: string;
        mw: number;
        technology: string;
        family: "renewable";
        region?: string;
        country?: string;
        operator?: string;
        operational_date?: string;
        lon: number;
        lat: number;
      }[];
    };
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";

    let stations: AtlasPack["stations"] = null;
    try {
      const stationsRoot = path.resolve(process.cwd(), "../data/energy/uk-power-stations-dukes");
      const sj = JSON.parse(readFileSync(path.join(stationsRoot, "curated/stations.json"), "utf8")) as {
        station_count: number;
        stations_with_coordinates: number;
        skipped_northern_ireland: number;
        largest_stations: {
          id: string;
          name: string;
          technology: string;
          primary_fuel: string;
          family: "fossil" | "nuclear";
          mw: number;
          region: string;
          country: string;
        }[];
        points: {
          id: string;
          name: string;
          mw: number;
          technology: string;
          primary_fuel: string;
          family: "fossil" | "nuclear";
          region?: string;
          country?: string;
          operator?: string;
          year_commissioned?: number;
          lon: number;
          lat: number;
        }[];
        extract?: string;
      };
      let stationsMeta: IndicatorMeta | null = null;
      try {
        stationsMeta = await fetchIndicator(STATIONS_ID);
      } catch {
        stationsMeta = null;
      }
      stations = {
        meta: stationsMeta,
        stationCount: sj.station_count,
        withCoordinates: sj.stations_with_coordinates,
        skippedNorthernIreland: sj.skipped_northern_ireland,
        largest: sj.largest_stations.map((s) => ({
          id: s.id,
          name: s.name,
          technology: s.technology,
          primaryFuel: s.primary_fuel,
          family: s.family,
          mw: s.mw,
          region: s.region,
          country: s.country,
        })),
        points: sj.points.map((p) => ({
          id: p.id,
          name: p.name,
          mw: p.mw,
          family: p.family,
          technology: p.technology,
          primaryFuel: p.primary_fuel,
          region: p.region,
          country: p.country,
          operator: p.operator,
          yearCommissioned: p.year_commissioned,
          lon: p.lon,
          lat: p.lat,
        })),
        sourceVersion: sj.extract ?? "",
      };
    } catch {
      stations = null;
    }

    const { outline, outlineAttribution } = loadGbOutline();

    let history: AtlasPack["history"] = null;
    try {
      const histPath = path.resolve(
        process.cwd(),
        "../data/energy/electricity-generation-long-run/curated/station-history.json",
      );
      const raw = JSON.parse(readFileSync(histPath, "utf8")) as {
        sheet: string;
        caveat: string;
        source_version: string;
        records: {
          id: string;
          name: string;
          region: string | null;
          commissioned: string | null;
          closure_or_planned: string | null;
          capacity_mw: number | null;
          fuel: string | null;
        }[];
      };
      history = {
        sheet: raw.sheet,
        caveat: raw.caveat,
        sourceVersion: raw.source_version,
        records: raw.records.map((r) => ({
          id: r.id,
          name: r.name,
          region: r.region,
          commissioned: r.commissioned,
          closureOrPlanned: r.closure_or_planned,
          capacityMw: r.capacity_mw,
          fuel: r.fuel,
        })),
      };
    } catch {
      history = null;
    }

    return {
      meta,
      observations: obs.observations,
      outline,
      outlineAttribution,
      offshoreMw: atlas.offshore_mw,
      operationalSites: atlas.operational_sites,
      sitesWithCoordinates: atlas.sites_with_coordinates ?? atlas.points?.length ?? 0,
      tiles: atlas.tiles,
      largestSites: atlas.largest_sites,
      renewablePoints: (atlas.points ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        mw: p.mw,
        family: "renewable" as const,
        technology: p.technology,
        region: p.region,
        country: p.country,
        operator: p.operator,
        operationalDate: p.operational_date,
        lon: p.lon,
        lat: p.lat,
      })),
      stations,
      history,
      sourceVersion,
    };
  } catch {
    return null;
  }
}

/* ——— Long run (1920–2025): DESNZ Electricity since 1920, read from the curated file ——— */

export type { Coverage, LongRunPack } from "./long-run";

const RELATED: { id: string; title: string; frequency: string }[] = [
  { id: "electricity-generation-by-source", title: "Electricity generation by source (ET 5.1)", frequency: "quarterly" },
  { id: "primary-energy-production", title: "Primary energy production", frequency: "monthly" },
  { id: "domestic-gas-production", title: "Domestic gas production", frequency: "monthly" },
  { id: "energy-imports-and-exports", title: "Energy imports and exports", frequency: "quarterly" },
  { id: "industrial-energy-consumption", title: "Industrial energy consumption", frequency: "annual" },
];

function csvRows(file: string): Record<string, string>[] {
  const text = readFileSync(file, "utf8").trim().split(/\r?\n/);
  const head = text[0]!.split(",");
  return text.slice(1).map((line) => {
    // Quoted cells (fuel labels with commas) — a small CSV split is enough for this file shape.
    const cells: string[] = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

/* ——— Domain 03 Prices: prefer API; fall back to curated CSV when the API is down ——— */

const DOMESTIC_META: IndicatorMeta = {
  indicator_id: DOMESTIC_BILLS_ID,
  title: "Domestic electricity bills",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics",
  series_id: "QEP 2.2.1 (Standard Electricity, cash, 3,400 kWh/year, UK)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "GBP",
  definition:
    "Average annual domestic Standard Electricity bill in cash terms (pounds) for United Kingdom households, based on a fixed annual consumption of 3,400 kWh.",
  licence: "Open Government Licence v3.0",
  caveats:
    "Fixed 3,400 kWh assumption; not Ofgem TDCV or price cap; not wholesale; Fixed/Variable from 2022 (official statistics in development).",
  revision_notes: "QEP June 2026 domestic bills update (table_221).",
  notion_registry_url: "https://app.notion.com/411654717685810ca44cff374a0b7d24",
};

const DOMESTIC_GAS_META: IndicatorMeta = {
  indicator_id: DOMESTIC_GAS_BILLS_ID,
  title: "Domestic gas bills",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics",
  series_id: "QEP 2.3.1 (Average annual domestic gas bills, cash, 11,200 kWh/year, UK)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "GBP",
  definition:
    "Average annual domestic gas bill in cash terms (pounds) for United Kingdom households, based on a fixed annual consumption of 11,200 kWh.",
  licence: "Open Government Licence v3.0",
  caveats:
    "Fixed 11,200 kWh assumption; not Ofgem TDCV or price cap; not electricity bills; Fixed/Variable from 2022 (official statistics in development).",
  revision_notes: "QEP June 2026 domestic gas bills update (table_231).",
  notion_registry_url: "https://app.notion.com/41165471768581048377c944c354e01c",
};

const LAYERS_META: IndicatorMeta = {
  indicator_id: DOMESTIC_UNIT_STANDING_ID,
  title: "Domestic electricity unit rates and standing charges",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics",
  series_id: "QEP 2.2.4 (unit £/kWh + fixed £/year, standard electricity, calendar year)",
  geography: "United Kingdom (K02000001); PES regions in notes",
  frequency: "annual",
  unit: "GBP_per_kWh or GBP_per_year",
  definition:
    "Average variable unit price and fixed cost for UK domestic standard electricity by region and payment method.",
  licence: "Open Government Licence v3.0",
  caveats:
    "Official statistics in development. Fixed cost includes standing + first-block premium. Reconstruct ≈ fixed + unit×kWh; may differ from published 2.2.1 bills.",
  revision_notes: "QEP June 2026 table_224.",
  notion_registry_url: "https://app.notion.com/41165471768581f08a34c092a897fbfd",
};

const GAS_LAYERS_META: IndicatorMeta = {
  indicator_id: DOMESTIC_GAS_UNIT_STANDING_ID,
  title: "Domestic gas unit rates and standing charges",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics",
  series_id: "QEP 2.3.4 (unit £/kWh + fixed £/year, gas, calendar year)",
  geography: "United Kingdom (K02000001); LDZ / PES-aligned regions in notes",
  frequency: "annual",
  unit: "GBP_per_kWh or GBP_per_year",
  definition:
    "Average variable unit price and fixed cost for UK domestic gas by region and payment method.",
  licence: "Open Government Licence v3.0",
  caveats:
    "Official statistics in development. Fixed cost includes standing + first-block premium. Reconstruct ≈ fixed + unit×kWh at 11,200 kWh; may differ from published 2.3.1 bills for other cuts. Not electricity 2.2.4.",
  revision_notes: "QEP June 2026 table_234.",
  notion_registry_url: "",
};

const INDUSTRIAL_META: IndicatorMeta = {
  indicator_id: INDUSTRIAL_PRICES_ID,
  title: "Industrial electricity prices",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistical-data-sets/prices-of-fuels-purchased-by-manufacturing-industry",
  series_id: "QEP 3.1.2 (Electricity excl. CCL, p/kWh, GB)",
  geography: "Great Britain (K03000001)",
  frequency: "quarterly",
  unit: "p/kWh",
  definition:
    "Average prices of electricity purchased by manufacturing industry in Great Britain, excluding Climate Change Levy, by size of consumer.",
  licence: "Open Government Licence v3.0",
  caveats: "GB manufacturing survey — not UK domestic bills; unit is p/kWh, not GBP/year.",
  revision_notes: "QEP industrial fuels tables.",
  notion_registry_url: "https://app.notion.com/40d65471768581f9ba3aefefe8eab198",
};

const ECONOMY7_META: IndicatorMeta = {
  indicator_id: DOMESTIC_ECONOMY7_ID,
  title: "Domestic Economy 7 electricity bills",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics",
  series_id: "QEP 2.2.1 Economy 7 / time-of-use (cash, 4,800 kWh/year, UK)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "GBP",
  definition:
    "Average annual domestic Economy 7 and other time-of-use electricity bill in cash terms at a fixed 4,800 kWh/year.",
  licence: "Open Government Licence v3.0",
  caveats: "Not Standard Electricity 3,400 kWh. Not Ofgem TDCV.",
  revision_notes: "QEP June 2026 table_221 Economy 7 sheet.",
  notion_registry_url: "",
};

const OFGEM_META: IndicatorMeta = {
  indicator_id: OFGEM_CAP_ID,
  title: "Ofgem default tariff (price) cap",
  sector: "energy-industry",
  publisher: "Ofgem",
  source_url:
    "https://www.ofgem.gov.uk/energy-regulation/domestic-and-non-domestic/energy-pricing-rules/energy-price-cap/energy-price-cap-default-tariff-levels",
  series_id: "Ofgem Annex 9 levelised default tariff cap (GB average, inc VAT)",
  geography: "Great Britain (K03000001); not Northern Ireland",
  frequency: "quarterly",
  unit: "GBP per year (benchmark / typical consumption)",
  definition:
    "Great Britain default tariff (price) cap levels for a typical domestic consumer from Ofgem Annex 9 (GB average, VAT-inclusive, Other Payment Method). Electricity single-rate history from sheet 1b.",
  licence: "Ofgem published materials",
  caveats:
    "Not DESNZ average bills. Not Northern Ireland. Gas/dual history limited to pinned periods. Typical consumption (TDCV) can change by period.",
  revision_notes: "Annex 9 1b historical + pinned 1a periods.",
  notion_registry_url: "",
};

const OFGEM_REGIONAL_META: IndicatorMeta = {
  indicator_id: OFGEM_CAP_REGIONAL_ID,
  title: "Ofgem default tariff (price) cap — regions",
  sector: "energy-industry",
  publisher: "Ofgem",
  source_url:
    "https://www.ofgem.gov.uk/energy-regulation/domestic-and-non-domestic/energy-pricing-rules/energy-price-cap/energy-price-cap-default-tariff-levels",
  series_id: "Ofgem Annex 9 levelised DTC by charge-restriction region (inc VAT)",
  geography: "Great Britain charge-restriction regions; not Northern Ireland",
  frequency: "quarterly",
  unit: "GBP per year (benchmark / typical consumption)",
  definition:
    "Regional default tariff cap levels from Ofgem Annex 9 (Other Payment Method). Regional rows × 1.05 VAT.",
  licence: "Ofgem published materials",
  caveats: "Not DESNZ PES/LDZ average bills. Not Northern Ireland.",
  revision_notes: "Shares Annex 9 pins with national Ofgem package.",
  notion_registry_url: "",
};

const WHOLESALE_META: IndicatorMeta = {
  indicator_id: MPP_FUEL_PRICES_ID,
  title: "Major power producer fuel prices",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistical-data-sets/prices-of-fuels-purchased-by-major-power-producers",
  series_id: "QEP 3.2.1 (cash, quarterly p/kWh — coal, oil, MPP natural gas)",
  geography: "United Kingdom (K02000001)",
  frequency: "quarterly",
  unit: "p/kWh",
  definition:
    "Average prices of fuels purchased by major UK power producers (generator input prices). Not household bills and not day-ahead power exchange prices.",
  licence: "Open Government Licence v3.0",
  caveats: "Long-term generator contracts; excludes CPS levy on coal/gas.",
  revision_notes: "QEP September 2026 table_321.",
  notion_registry_url: "",
};

const CPIH_META: IndicatorMeta = {
  indicator_id: CPIH_INDEX_ID,
  title: "CPIH index",
  sector: "economy-public-finance",
  publisher: "ONS",
  source_url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l522/mm23",
  series_id: "L522",
  geography: "United Kingdom (K02000001)",
  frequency: "monthly",
  unit: "Index 2015=100 (CPIH all items)",
  definition:
    "UK Consumer Prices Index including owner occupiers' housing costs (CPIH) all-items index (2015=100). Preferred household-cost deflator for Energy real-terms bills.",
  licence: "Open Government Licence v3.0",
  caveats: "Not CPI (D7BT). Energy links this Economy series — do not fork under data/energy.",
  revision_notes: "ONS Consumer price inflation MM23.",
  notion_registry_url: "",
};

const EARNINGS_META: IndicatorMeta = {
  indicator_id: NOMINAL_EARNINGS_ID,
  title: "Average weekly earnings (cash terms)",
  sector: "economy-public-finance",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kai7/emp",
  series_id: "KAI7",
  geography: "Great Britain (K02000001 spine)",
  frequency: "monthly",
  unit: "£ per week, SA, cash terms (regular pay)",
  definition:
    "Average weekly earnings (AWE) whole-economy regular pay in cash terms, seasonally adjusted.",
  licence: "Open Government Licence v3.0",
  caveats: "Regular pay per employee, excluding bonuses; not household income. Energy annualises ×52 (mean of the year's months).",
  revision_notes: "ONS AWE EMP/A2FC.",
  notion_registry_url: "",
};

type CuratedSector = "energy" | "economy" | "history";

function curatedObservations(packageId: string, sector: CuratedSector = "energy"): Observation[] {
  const file = path.join(
    path.resolve(process.cwd(), `../data/${sector}`),
    packageId,
    "curated/observations.csv",
  );
  return csvRows(file).map((r) => ({
    indicator_id: r.indicator_id ?? packageId,
    period_start: r.period_start ?? "",
    period_end: r.period_end ?? "",
    geography_code: r.geography_code ?? "",
    geography_label:
      r.geography_label ||
      (packageId === DOMESTIC_BILLS_ID || packageId === DOMESTIC_GAS_BILLS_ID || packageId === CPIH_INDEX_ID
        ? "United Kingdom"
        : "Great Britain"),
    value: r.value === "" || r.value == null ? null : Number(r.value),
    unit: r.unit ?? "",
    observation_status: r.observation_status ?? "final",
    source_version: r.source_version ?? "",
    notes: r.notes ?? "",
  }));
}

async function loadSeriesPack(
  id: string,
  fallbackMeta: IndicatorMeta,
  sector: CuratedSector = "energy",
): Promise<SeriesPack | null> {
  try {
    const [meta, obs] = await Promise.all([
      fetchIndicator(id),
      fetchObservations(id, { limit: "10000" }),
    ]);
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";
    return {
      meta,
      observations: obs.observations,
      sourceVersion,
      retrievedNote: `Loaded from the Exchange API (pinned raw under data/${sector}/${id}/).`,
    };
  } catch {
    try {
      const observations = curatedObservations(id, sector);
      if (!observations.length) return null;
      const sourceVersion = observations.find((r) => r.source_version)?.source_version ?? "";
      return {
        meta: fallbackMeta,
        observations,
        sourceVersion,
        retrievedNote: `Loaded from curated CSV under data/${sector}/${id}/ (API unavailable).`,
      };
    } catch {
      return null;
    }
  }
}

export async function loadPrices(): Promise<PricesPack> {
  const [
    domestic,
    gas,
    economy7,
    layers,
    gasLayers,
    industrial,
    ofgem,
    ofgemRegional,
    wholesale,
    cpih,
    earnings,
  ] = await Promise.all([
    loadSeriesPack(DOMESTIC_BILLS_ID, DOMESTIC_META),
    loadSeriesPack(DOMESTIC_GAS_BILLS_ID, DOMESTIC_GAS_META),
    loadSeriesPack(DOMESTIC_ECONOMY7_ID, ECONOMY7_META),
    loadSeriesPack(DOMESTIC_UNIT_STANDING_ID, LAYERS_META),
    loadSeriesPack(DOMESTIC_GAS_UNIT_STANDING_ID, GAS_LAYERS_META),
    loadSeriesPack(INDUSTRIAL_PRICES_ID, INDUSTRIAL_META),
    loadSeriesPack(OFGEM_CAP_ID, OFGEM_META),
    loadSeriesPack(OFGEM_CAP_REGIONAL_ID, OFGEM_REGIONAL_META),
    loadSeriesPack(MPP_FUEL_PRICES_ID, WHOLESALE_META),
    loadSeriesPack(CPIH_INDEX_ID, CPIH_META, "economy"),
    loadSeriesPack(NOMINAL_EARNINGS_ID, EARNINGS_META, "economy"),
  ]);
  let capComponents: PricesPack["capComponents"] = null;
  try {
    capComponents = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "../data/energy/ofgem-default-tariff-cap/curated/components.json"), "utf8"),
    );
  } catch {
    capComponents = null;
  }
  return {
    capComponents,
    domestic,
    gas,
    economy7,
    layers,
    gasLayers,
    industrial,
    ofgem,
    ofgemRegional,
    wholesale,
    cpih,
    earnings,
  };
}

const CRUDE_META: IndicatorMeta = {
  indicator_id: CRUDE_OIL_ID,
  title: "Crude oil production",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistical-data-sets/crude-oil-and-petroleum-production-imports-and-exports",
  series_id: "Indigenous crude oil production Total (historical workbook)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "million tonnes",
  definition:
    "UK indigenous crude oil production (Total), calendar years, million tonnes (publisher thousand tonnes ÷ 1000).",
  licence: "Open Government Licence v3.0",
  caveats: "Through 1962 includes shale oil. Not field-level NSTA production. Not primary Petroleum (Mtoe).",
  revision_notes: "Pinned Oil_Production_Trade_since_1890.xls (2026-07-30).",
  notion_registry_url: "https://app.notion.com/411654717685812d92a6d647e28cd8a3",
};

const GAS_META: IndicatorMeta = {
  indicator_id: DOMESTIC_GAS_ID,
  title: "Domestic gas production",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistics/gas-section-4-energy-trends",
  series_id: "ET 4.2 indigenous (gross) natural gas production",
  geography: "United Kingdom (K02000001)",
  frequency: "monthly",
  unit: "GWh",
  definition: "UK indigenous (gross) natural gas production in gigawatt hours.",
  licence: "Open Government Licence v3.0",
  caveats: "Monthly GWh; Fuels view annualises by summing months.",
  revision_notes: "Energy Trends gas tables.",
  notion_registry_url: "",
};

const PRIMARY_META: IndicatorMeta = {
  indicator_id: PRIMARY_PRODUCTION_ID,
  title: "Primary energy production",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends",
  series_id: "ET 1.1 primary energy production by fuel",
  geography: "United Kingdom (K02000001)",
  frequency: "monthly",
  unit: "Mtoe",
  definition: "UK primary energy production by fuel (million tonnes of oil equivalent).",
  licence: "Open Government Licence v3.0",
  caveats: "Petroleum (Mtoe) ≠ crude oil (Mt). Natural gas (Mtoe) ≠ gross gas (GWh).",
  revision_notes: "Energy Trends 1.1.",
  notion_registry_url: "",
};

const COAL_META: IndicatorMeta = {
  indicator_id: HISTORICAL_COAL_ID,
  title: "Historical coal production",
  sector: "history-change",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistical-data-sets/historical-coal-data-coal-production-availability-and-consumption",
  series_id: "Historical coal data — Coal Production Total Output",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "million tonnes",
  definition: "UK coal production (total output, million tonnes) from DESNZ historical coal statistics.",
  licence: "Open Government Licence v3.0",
  caveats: "Distinct from primary-energy-production Coal (Mtoe). Owned under History — Energy links only.",
  revision_notes: "Pinned Coal_since_1853.xls.",
  notion_registry_url: "https://app.notion.com/40d654717685810db26fe5add2ed8e1e",
};

const FIELD_PRODUCTION_META: IndicatorMeta = {
  indicator_id: NSTA_FIELD_PRODUCTION_ID,
  title: "NSTA UKCS field production (PPRS annual)",
  sector: "energy-industry",
  publisher: "North Sea Transition Authority",
  source_url:
    "https://open-data-ukcs-transition.hub.arcgis.com/datasets/UKCS-transition::ukcs-hydrocarbon-field-production-reports-pprs-points-wgs84",
  series_id: "UKCS hydrocarbon field production reports PPRS points (WGS84)",
  geography: "UKCS PPRS reporting units",
  frequency: "annual",
  unit: "tonnes (oil) / ksm3 (gas to pipeline)",
  definition: "Calendar-year sums of monthly NSTA PPRS field production by Field name.",
  licence: "NSTA User Agreement (Open User Licence); attribution required",
  caveats: "Field-sum totals must not replace DESNZ indigenous production.",
  revision_notes: "Hub CSV pin under data/energy/nsta-field-production/.",
  notion_registry_url: "",
};

const RESERVES_META: IndicatorMeta = {
  indicator_id: UK_RESERVES_ID,
  title: "UK oil and gas reserves and contingent resources",
  sector: "energy-industry",
  publisher: "North Sea Transition Authority",
  source_url: "https://www.nstauthority.co.uk/news-publications/reserves-and-resources-as-at-end-2024/",
  series_id: "Historic estimates of Oil and Gas Reserves and Contingent Resources 1973–2024",
  geography: "UK Continental Shelf",
  frequency: "annual",
  unit: "million tonnes (oil) / billion cubic metres (gas)",
  definition: "NSTA historic remaining reserves (1P/2P/3P) and contingent resources (2C).",
  licence: "NSTA User Agreement (Open User Licence); attribution required",
  caveats: "Reserves ≠ production. Classification changes around 2015 break long-run comparability.",
  revision_notes: "Pinned historic xlsx 1973–2024.",
  notion_registry_url: "",
};

const OIL_IMPORTS_META: IndicatorMeta = {
  indicator_id: OIL_IMPORTS_ID,
  title: "Oil imports by country",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistics/petroleum-chapter-3-digest-of-united-kingdom-energy-statistics-dukes",
  series_id: "DUKES 3.7 Total oil imports by country",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "thousand tonnes",
  definition: "UK annual imports of crude oil and petroleum products by country (Total oil).",
  licence: "Open Government Licence v3.0",
  caveats: "Use kind=aggregate Total imports for national totals.",
  revision_notes: "DUKES 3.7.",
  notion_registry_url: "",
};

function loadFieldAtlasPoints(): FieldPoint[] {
  try {
    const file = path.join(
      path.resolve(process.cwd(), "../data/energy/nsta-ukcs-fields/curated/atlas_points.json"),
    );
    const payload = JSON.parse(readFileSync(file, "utf8")) as {
      points?: FieldPoint[];
      attribution?: string;
    };
    return payload.points ?? [];
  } catch {
    return [];
  }
}

function loadFieldAnnualRows(): FieldAnnual[] {
  try {
    const file = path.join(
      path.resolve(process.cwd(), "../data/energy/nsta-field-production/curated/annual_by_field.csv"),
    );
    return csvRows(file).map((r) => ({
      fieldName: r.field_name ?? "",
      year: Number(r.year),
      oilTonnes: Number(r.oil_tonnes || 0),
      gasToPipelineKsm3: Number(r.gas_to_pipeline_ksm3 || 0),
      dryGasKsm3: Number(r.dry_gas_ksm3 || 0),
      associatedGasKsm3: Number(r.associated_gas_ksm3 || 0),
      condensateTonnes: Number(r.condensate_tonnes || 0),
      months: Number(r.months || 0),
      location: r.location ?? "",
      region: r.field_region ?? "",
    })).filter((r) => r.fieldName && Number.isFinite(r.year));
  } catch {
    return [];
  }
}

export async function loadFossils(): Promise<FossilsPack> {
  const [
    crude,
    gas,
    primary,
    coal,
    fieldProductionNational,
    reserves,
    oilImports,
    trade,
    dependency,
  ] = await Promise.all([
    loadSeriesPack(CRUDE_OIL_ID, CRUDE_META),
    loadSeriesPack(DOMESTIC_GAS_ID, GAS_META),
    loadSeriesPack(PRIMARY_PRODUCTION_ID, PRIMARY_META),
    loadSeriesPack(HISTORICAL_COAL_ID, COAL_META, "history"),
    loadSeriesPack(NSTA_FIELD_PRODUCTION_ID, FIELD_PRODUCTION_META),
    loadSeriesPack(UK_RESERVES_ID, RESERVES_META),
    loadSeriesPack(OIL_IMPORTS_ID, OIL_IMPORTS_META),
    loadSeriesPack(FOSSILS_TRADE_ID, {
      indicator_id: FOSSILS_TRADE_ID,
      title: "Energy imports and exports",
      sector: "energy-industry",
      publisher: "DESNZ",
      source_url: "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends",
      series_id: "ET 1.3 (Imports and Exports, ktoe)",
      geography: "United Kingdom (K02000001)",
      frequency: "quarterly",
      unit: "ktoe",
      definition: "UK gross energy Imports and Exports in thousand tonnes of oil equivalent.",
      licence: "Open Government Licence v3.0",
      caveats: "Gross ≠ net.",
      revision_notes: "Energy Trends 1.3.",
      notion_registry_url: "",
    }),
    loadSeriesPack(FOSSILS_DEPENDENCY_ID, {
      indicator_id: FOSSILS_DEPENDENCY_ID,
      title: "Energy import dependency",
      sector: "energy-industry",
      publisher: "DESNZ",
      source_url: "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends",
      series_id: "ET 1.3 (Import dependency, ratio)",
      geography: "United Kingdom (K02000001)",
      frequency: "annual+quarterly",
      unit: "ratio",
      definition: "UK energy import dependency ratio.",
      licence: "Open Government Licence v3.0",
      caveats: "Ratio ≠ resilience score.",
      revision_notes: "ET 1.3.",
      notion_registry_url: "",
    }),
  ]);
  const { outline, outlineAttribution } = loadGbOutline();
  return {
    crude,
    gas,
    primary,
    coal,
    fields: loadFieldAtlasPoints(),
    fieldProduction: loadFieldAnnualRows(),
    fieldProductionNational,
    reserves,
    oilImports,
    trade,
    dependency,
    outline,
    outlineAttribution,
    attribution:
      "Contains information provided by the North Sea Transition Authority and/or other third parties.",
  };
}

const DEPENDENCY_META: IndicatorMeta = {
  indicator_id: IMPORT_DEPENDENCY_ID,
  title: "Energy import dependency",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends",
  series_id: "ET 1.3 (Import dependency, ratio, annual + quarterly)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual+quarterly",
  unit: "ratio",
  definition:
    "UK energy import dependency: net imports divided by the published energy supply denominator (ratio).",
  licence: "Open Government Licence v3.0",
  caveats:
    "Ratio ≠ percent in storage; UI may display ×100. Negative = net exporter. Not a resilience score.",
  revision_notes: "ET 1.3 pinned with energy-imports-and-exports workbook.",
  notion_registry_url: "https://app.notion.com/41165471768581f1b20de3b144f17d52",
};

const TRADE_META: IndicatorMeta = {
  indicator_id: IMPORTS_EXPORTS_ID,
  title: "Energy imports and exports",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends",
  series_id: "ET 1.3 (Imports and Exports, ktoe)",
  geography: "United Kingdom (K02000001)",
  frequency: "quarterly",
  unit: "ktoe",
  definition: "UK gross energy Imports and Exports in thousand tonnes of oil equivalent.",
  licence: "Open Government Licence v3.0",
  caveats: "Gross ≠ net. Exports often published with negative sign.",
  revision_notes: "Energy Trends 1.3.",
  notion_registry_url: "https://app.notion.com/40d6547176858157b47ad6027387bc4e",
};

const INTERCONNECTOR_META: IndicatorMeta = {
  indicator_id: INTERCONNECTOR_FLOWS_ID,
  title: "Electricity interconnector flows",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistics/electricity-section-5-energy-trends",
  series_id: "ET 5.6 (Quarterly imports and exports, GWh, by corridor)",
  geography: "United Kingdom (K02000001)",
  frequency: "quarterly",
  unit: "GWh",
  definition:
    "UK electricity interconnector Imports, Exports and Net imports by corridor (gigawatt hours).",
  licence: "Open Government Licence v3.0",
  caveats:
    "France-UK is IFA+IFA2+ElecLink sum. Not nameplate MW capacity. Not ET 1.3 all-fuels ktoe. UK ≠ GB NESO.",
  revision_notes: "ET 5.6 Sep 2026 pin.",
  notion_registry_url: "https://app.notion.com/4116547176858128b5cde0c291d4674c",
};

const INTERCONNECTOR_CAPACITY_META: IndicatorMeta = {
  indicator_id: INTERCONNECTOR_CAPACITY_ID,
  title: "Electricity interconnector capacity",
  sector: "energy-industry",
  publisher: "NESO",
  source_url: "https://www.neso.energy/data-portal/interconnector-register",
  series_id: "Interconnector Register (resource_id 64f7908f-f787-4977-93e1-5342a5f1357f)",
  geography: "Great Britain (K03000001)",
  frequency: "ad_hoc",
  unit: "MW",
  definition:
    "Firm Transmission Entry Capacity for interconnectors (import side). Built links use current MW at the register pin date.",
  licence: "NESO Open Data Licence",
  caveats:
    "Capacity MW ≠ ET 5.6 GWh. GB NESO ≠ UK Official Statistics corridors. Moyle 500 MW TEC has operational restrictions.",
  revision_notes: "NESO Interconnector Register pin 2026-11-08.",
  notion_registry_url: "",
};

const GAS_STORAGE_META: IndicatorMeta = {
  indicator_id: NATURAL_GAS_STORAGE_ID,
  title: "Natural gas stock and storage capacity",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistics/natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes",
  series_id: "DUKES 4.4a (Natural gas stock, GWh)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "GWh",
  definition:
    "UK annual natural gas Stock, Stock change and Storage capacity from DUKES table 4.4a.",
  licence: "Open Government Licence v3.0",
  caveats:
    "2016 series break (Note 1). Not a security score. Distinct from gas trade flows and electricity storage.",
  revision_notes: "DUKES 4.4 Jul 2026 pin.",
  notion_registry_url: "",
};

const OIL_PARTNERS_META: IndicatorMeta = {
  indicator_id: OIL_IMPORTS_BY_COUNTRY_ID,
  title: "Oil imports by country",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistics/petroleum-chapter-3-digest-of-united-kingdom-energy-statistics-dukes",
  series_id: "DUKES 3.7 (Total oil imports by country of origin, thousand tonnes)",
  geography: "United Kingdom (K02000001); partners in notes",
  frequency: "annual",
  unit: "thousand tonnes",
  definition: "UK imports of crude oil and petroleum products by country of origin (Total oil).",
  licence: "Open Government Licence v3.0",
  caveats: "Partner countries of origin — not pipeline landfalls. Total oil column only.",
  revision_notes: "DUKES 3.7 Jul 2026 pin.",
  notion_registry_url: "",
};

const GAS_PARTNERS_META: IndicatorMeta = {
  indicator_id: GAS_TRADE_BY_PARTNER_ID,
  title: "Gas trade by partner",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistics/natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes",
  series_id: "DUKES 4.5a (Natural gas imports and exports by partner, GWh)",
  geography: "United Kingdom (K02000001); partners in notes",
  frequency: "annual",
  unit: "GWh",
  definition: "UK natural gas Imports, Exports and Net by partner country and Pipeline / LNG mode.",
  licence: "Open Government Licence v3.0",
  caveats: "Partner countries — not invented landfalls. Facility capacity (4.5b) not ingested.",
  revision_notes: "DUKES 4.5 Jul 2026 pin.",
  notion_registry_url: "",
};

const LNG_TERMINALS_META: IndicatorMeta = {
  indicator_id: LNG_IMPORTS_BY_TERMINAL_ID,
  title: "LNG imports by terminal",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistics/natural-gas-chapter-4-digest-of-united-kingdom-energy-statistics-dukes",
  series_id: "DUKES 4.6 (LNG imports by terminal, GWh)",
  geography: "United Kingdom (K02000001); terminal names in notes",
  frequency: "annual",
  unit: "GWh",
  definition: "UK LNG imports by named terminal (Dragon, Isle of Grain, South Hook, Teesside GasPort).",
  licence: "Open Government Licence v3.0",
  caveats: "Named terminals only — not pipeline landfalls. Zeros kept for idle years.",
  revision_notes: "DUKES 4.6 Jul 2026 pin.",
  notion_registry_url: "",
};

const FOSSIL_DEPENDENCY_META: IndicatorMeta = {
  indicator_id: FOSSIL_FUEL_DEPENDENCY_ID,
  title: "Fossil fuel dependency",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends",
  series_id: "ET 1.3 (Fossil fuel dependency [note 6], ratio)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual+quarterly",
  unit: "ratio",
  definition: "UK fossil fuel dependency ratio from Energy Trends table 1.3.",
  licence: "Open Government Licence v3.0",
  caveats: "Ratio ≠ security score. Distinct from import dependency and low carbon share.",
  revision_notes: "ET 1.3 Sep 2026 pin.",
  notion_registry_url: "",
};

const LOW_CARBON_SHARE_META: IndicatorMeta = {
  indicator_id: LOW_CARBON_ENERGY_SHARE_ID,
  title: "Low carbon energy share",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url: "https://www.gov.uk/government/statistics/total-energy-section-1-energy-trends",
  series_id: "ET 1.3 (Low carbon share [note 6], ratio)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual+quarterly",
  unit: "ratio",
  definition: "UK low carbon share of total energy consumption from Energy Trends table 1.3.",
  licence: "Open Government Licence v3.0",
  caveats: "Ratio ≠ security score. Distinct from import dependency and fossil fuel dependency.",
  revision_notes: "ET 1.3 Sep 2026 pin.",
  notion_registry_url: "",
};

export async function loadImports(): Promise<ImportsPack> {
  const [
    dependency,
    trade,
    interconnectors,
    interconnectorCapacity,
    oilPartners,
    gasPartners,
    lngTerminals,
    fossilDependency,
    lowCarbonShare,
    gasStorage,
  ] = await Promise.all([
    loadSeriesPack(IMPORT_DEPENDENCY_ID, DEPENDENCY_META),
    loadSeriesPack(IMPORTS_EXPORTS_ID, TRADE_META),
    loadSeriesPack(INTERCONNECTOR_FLOWS_ID, INTERCONNECTOR_META),
    loadSeriesPack(INTERCONNECTOR_CAPACITY_ID, INTERCONNECTOR_CAPACITY_META),
    loadSeriesPack(OIL_IMPORTS_BY_COUNTRY_ID, OIL_PARTNERS_META),
    loadSeriesPack(GAS_TRADE_BY_PARTNER_ID, GAS_PARTNERS_META),
    loadSeriesPack(LNG_IMPORTS_BY_TERMINAL_ID, LNG_TERMINALS_META),
    loadSeriesPack(FOSSIL_FUEL_DEPENDENCY_ID, FOSSIL_DEPENDENCY_META),
    loadSeriesPack(LOW_CARBON_ENERGY_SHARE_ID, LOW_CARBON_SHARE_META),
    loadSeriesPack(NATURAL_GAS_STORAGE_ID, GAS_STORAGE_META),
  ]);
  return {
    dependency,
    trade,
    interconnectors,
    interconnectorCapacity,
    oilPartners,
    gasPartners,
    lngTerminals,
    fossilDependency,
    lowCarbonShare,
    gasStorage,
  };
}

const LOAD_FACTORS_META: IndicatorMeta = {
  indicator_id: LOAD_FACTORS_ID,
  title: "Renewable electricity load factors",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistics/renewable-sources-of-energy-chapter-6-digest-of-united-kingdom-energy-statistics-dukes",
  series_id: "DUKES 6.3 (Load factors for renewable electricity generation, percent)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "percent",
  definition:
    "UK annual load factors for renewable electricity generation technologies (percent of potential generation).",
  licence: "Open Government Licence v3.0",
  caveats:
    "Renewables only — not nuclear. Two bases (average BoE capacity vs unchanged configuration). REPD does not publish load factors.",
  revision_notes: "DUKES 6.3 2026 pin.",
  notion_registry_url: "https://app.notion.com/41165471768581dfbb30e984c9aa01ba",
};

const PIPELINE_META: IndicatorMeta = {
  indicator_id: PIPELINE_ID,
  title: "Renewable energy planning — non-operational pipeline",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract",
  series_id:
    "REPD quarterly extract — Installed Capacity (MWelec) by Development Status (short), excluding Operational",
  geography: "United Kingdom (planning register; includes NI and offshore)",
  frequency: "quarterly",
  unit: "MW",
  definition:
    "Sum of installed electrical capacity (MW) for REPD projects that are not yet Operational, by Development Status (short) and Technology Type.",
  licence: "Open Government Licence v3.0",
  caveats:
    "REPD capacity threshold ≥150 kW. Includes refused/withdrawn/abandoned as well as active pipeline. Not nuclear. Not generation.",
  revision_notes: "Gate 3 B3 — sibling of renewable-energy-planning-operational.",
  notion_registry_url: "",
};

const PLANT_LOAD_FACTORS_META: IndicatorMeta = {
  indicator_id: PLANT_LOAD_FACTORS_ID,
  title: "Plant load factors (major power producers)",
  sector: "energy-industry",
  publisher: "DESNZ",
  source_url:
    "https://www.gov.uk/government/statistics/electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes",
  series_id: "DUKES 5.10.B Plant load factor (%) and 5.10.C Thermal efficiency (%)",
  geography: "United Kingdom (K02000001) — Major Power Producers",
  frequency: "annual",
  unit: "percent",
  definition:
    "UK annual plant load factors for Major Power Producers from DUKES table 5.10.B, including Nuclear stations.",
  licence: "Open Government Licence v3.0",
  caveats:
    "MPP scope only. Distinct from renewable load factors in DUKES 6.3. Unit is percent (0–100) as published.",
  revision_notes: "Gate 3 B3 — nuclear LF companion for Field Guide.",
  notion_registry_url: "",
};

export async function loadRenewables(): Promise<RenewablesPack> {
  const [loadFactors, pipeline, plantLoadFactors] = await Promise.all([
    loadSeriesPack(LOAD_FACTORS_ID, LOAD_FACTORS_META),
    loadSeriesPack(PIPELINE_ID, PIPELINE_META),
    loadSeriesPack(PLANT_LOAD_FACTORS_ID, PLANT_LOAD_FACTORS_META),
  ]);
  return { loadFactors, pipeline, plantLoadFactors };
}

export async function loadNetworks(): Promise<NetworksPack> {
  // Same Ready ET 5.6 package as Imports Connectors — link, do not fork curated data.
  const interconnectors = await loadSeriesPack(NETWORKS_IC_ID, INTERCONNECTOR_META);
  return { interconnectors };
}

const OUTPUT_META: IndicatorMeta = {
  indicator_id: OUTPUT_INDEX_ID,
  title: "Manufacturing output index",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/timeseries/k22a/diop",
  series_id: "K22A / DIOP (IOP: C:MANUFACTURING: CVMSA)",
  geography: "United Kingdom (K02000001)",
  frequency: "monthly",
  unit: "index (chained volume, SA; base year = 100)",
  definition:
    "UK Index of Production for SIC 2007 section C Manufacturing: chained volume measure, seasonally adjusted index.",
  licence: "Open Government Licence v3.0",
  caveats: "Volume index — not £ output, not GVA share, not employment.",
  revision_notes: "ONS Index of Production revisions.",
  notion_registry_url: "https://app.notion.com/40d65471768581af8d35fbee740cd16f",
};

const SHARE_META: IndicatorMeta = {
  indicator_id: SHARE_GVA_ID,
  title: "Manufacturing share of GVA",
  sector: "energy-industry",
  publisher: "ONS",
  source_url: "https://www.ons.gov.uk/economy/grossvalueaddedgva/timeseries/l4nt/wgdp",
  series_id: "L4NT / WGDP (C : Manufacturing: Weights:CVM)",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "% of GVA (from GDP(O) CVM weight ÷ 10)",
  definition: "Manufacturing (SIC section C) share of UK GVA from ONS CVM industry weights.",
  licence: "Open Government Licence v3.0",
  caveats: "Percent from weight/10 — not current-price share; not an output index.",
  revision_notes: "Blue Book / WGDP industry weights.",
  notion_registry_url: "",
};

const EMPLOYMENT_META: IndicatorMeta = {
  indicator_id: EMPLOYMENT_ID,
  title: "Manufacturing employment",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/jwr7/lms",
  series_id: "JWR7 / LMS (Workforce Jobs SA, SIC C)",
  geography: "United Kingdom (K02000001)",
  frequency: "quarterly",
  unit: "thousands of jobs, SA",
  definition: "UK Workforce Jobs (seasonally adjusted) in SIC 2007 section C Manufacturing.",
  licence: "Open Government Licence v3.0",
  caveats: "Jobs ≠ persons; not History long-run employment.",
  revision_notes: "ONS Vacancies and jobs / LMS.",
  notion_registry_url: "https://app.notion.com/40d65471768581e3a829d4cad506e0bc",
};

const PRODUCTIVITY_META: IndicatorMeta = {
  indicator_id: OUTPUT_PER_HOUR_ID,
  title: "Manufacturing output per hour",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/djk6/prdy",
  series_id: "DJK6 / PRDY (Manufacturing C output per hour, 2023=100 SA)",
  geography: "United Kingdom (K02000001)",
  frequency: "quarterly",
  unit: "index (2023=100, SA)",
  definition: "UK manufacturing (SIC section C) output per hour worked, seasonally adjusted index.",
  licence: "Open Government Licence v3.0",
  caveats: "Not IoP÷jobs; not whole-economy labour productivity (LZVB).",
  revision_notes: "ONS productivity revisions.",
  notion_registry_url: "https://app.notion.com/41165471768581c89c2ce8e92d3134e3",
};

export async function loadManufacturing(): Promise<ManufacturingPack> {
  const [output, share, employment, productivity] = await Promise.all([
    loadSeriesPack(OUTPUT_INDEX_ID, OUTPUT_META),
    loadSeriesPack(SHARE_GVA_ID, SHARE_META),
    loadSeriesPack(EMPLOYMENT_ID, EMPLOYMENT_META),
    loadSeriesPack(OUTPUT_PER_HOUR_ID, PRODUCTIVITY_META),
  ]);
  return { output, share, employment, productivity };
}

export async function loadLongRun(): Promise<LongRunPack | null> {
  const root = path.resolve(process.cwd(), "../data/energy");
  try {
    const rows = csvRows(path.join(root, "electricity-generation-long-run/curated/observations.csv")).map((r) => ({
      period_start: r.period_start!,
      value: r.value === "" ? null : Number(r.value),
      observation_status: r.observation_status!,
      notes: r.notes!,
    }));
    const related: Record<string, Coverage> = {};
    for (const rel of RELATED) {
      try {
        const lines = readFileSync(path.join(root, rel.id, "curated/observations.csv"), "utf8").trim().split(/\r?\n/).slice(1);
        const years = lines.map((l) => Number(l.split(",")[1]?.slice(0, 4))).filter(Number.isFinite);
        related[rel.id] = { ...rel, first: Math.min(...years), last: Math.max(...years) };
      } catch {
        /* a missing related file just drops that link */
      }
    }
    return { mix: longRunFromRows(rows), related };
  } catch {
    return null;
  }
}

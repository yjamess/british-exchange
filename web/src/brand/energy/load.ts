/**
 * Server-only loaders for Energy explorers.
 * Client components must import types/helpers from packs.ts — not this file.
 * Curated blobs (atlas, stations, geography) come from the Exchange API packs
 * surface (disk in local API, Supabase Storage in deploy) — not Next.js node:fs.
 */

import { stationPosition } from "./station-model";
import { EMPTY_POLICY_PLEDGES_PACK, loadPolicyPledgesPack, type PolicyPledgesPack } from "./policy-pledges";
import {
  fetchIndicator,
  fetchObservations,
  fetchPackJson,
  fetchPackText,
  type IndicatorMeta,
  type Observation,
} from "@/lib/api";
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
  BRES_BY_DIVISION_REGION_ID,
  BRES_EMPLOYEE_JOBS_ID,
  ASHE_EARNINGS_ID,
  OUTPUT_PER_JOB_ID,
  PRODUCTIVITY_HOURS_ID,
  EMPLOYMENT_ID,
  IOP_BY_DIVISION_ID,
  IOP_WEIGHTS_ID,
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
  SSEN_ATLAS_ID,
  TEC_REGISTER_ID,
  type NetworksPack,
  type SsenAtlasPack,
} from "./networks-model";
import { packAllowed, type EnergyPackKey, type EnergyScope } from "./domain-sources";
import {
  EMPTY_POLICY_EVENTS_PACK,
  loadPolicyEventsPack,
  type PolicyEventsPack,
} from "./policy-events";
import {
  EMPTY_SHOCK_EVENTS_PACK,
  loadShockEventsPack,
  type ShockEventsPack,
} from "./imports-shock-events";

export type { AtlasPack, CapacityPack, GenerationPack, YearPack } from "./packs";
export type { ConsumptionPack };
export type { PricesPack };
export type { FossilsPack };
export type { ImportsPack };
export type { ManufacturingPack };
export type { RenewablesPack };
export type { NetworksPack };
export type { PolicyEventsPack };
export type { ShockEventsPack };
export { atlasTechRows, capacityRowsForYear, yearMonthlyStack } from "./packs";

export const GENERATION_ID = "electricity-generation-by-source";
export const CAPACITY_ID = "electricity-capacity-by-technology";
export const YEAR_MIX_ID = "gb-generation-mix-half-hourly";
export const ATLAS_ID = "renewable-energy-planning-operational";
export const STATIONS_ID = "uk-power-stations-dukes";

/** GB land outline in station/field map coordinates — context only, never an indicator. */
async function loadGbOutline(): Promise<{ outline?: string; outlineAttribution?: string }> {
  try {
    const [geo, source] = await Promise.all([
      fetchPackJson<{
        features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[];
      }>("regions.gb-boundaries"),
      fetchPackJson<{ attribution?: string; note?: string }>("regions.gb-boundaries-source"),
    ]);
    const outline = geo.features
      .flatMap((f) => {
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
    return { outline, outlineAttribution: (source.attribution ?? source.note ?? "") as string };
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

async function loadAssumedEfficiencies(): Promise<AssumedEfficienciesPack | null> {
  try {
    return await fetchPackJson<AssumedEfficienciesPack>("energy.assumed-efficiencies");
  } catch {
    return null;
  }
}

async function loadPopulationPack(): Promise<GeographyPack["population"]> {
  try {
    return await fetchPackJson<NonNullable<GeographyPack["population"]>>("people.population");
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
    const [raw, auth, population] = await Promise.all([
      fetchPackJson<{
        years: number[];
        places: GeographyPack["places"];
        note: string;
      }>("energy.geography"),
      fetchPackJson<{
        places: GeographyPack["authorities"];
        note: string;
      }>("energy.authorities"),
      loadPopulationPack(),
    ]);
    return {
      meta,
      years: raw.years,
      places: raw.places,
      authorities: auth.places,
      note: raw.note,
      authoritiesNote: auth.note,
      population,
    };
  } catch {
    return null;
  }
}

export async function loadAtlas(): Promise<AtlasPack | null> {
  try {
    const [meta, obs, atlas, outlinePack] = await Promise.all([
      fetchIndicator(ATLAS_ID),
      fetchObservations(ATLAS_ID, { limit: "10000" }),
      fetchPackJson<{
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
      }>("energy.atlas"),
      loadGbOutline(),
    ]);
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";

    let stations: AtlasPack["stations"] = null;
    try {
      const [sj, stationsMeta] = await Promise.all([
        fetchPackJson<{
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
        }>("energy.stations"),
        fetchIndicator(STATIONS_ID).catch(() => null),
      ]);
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

    let history: AtlasPack["history"] = null;
    try {
      const raw = await fetchPackJson<{
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
      }>("energy.station-history");
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
      outline: outlinePack.outline,
      outlineAttribution: outlinePack.outlineAttribution,
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

function csvRowsFromText(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
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

async function loadSeriesPack(
  id: string,
  fallbackMeta: IndicatorMeta,
  sector: CuratedSector = "energy",
): Promise<SeriesPack | null> {
  // Cloud completeness: no laptop CSV fallback — Ready series must come from the API.
  // One silent retry: Imports loads ~10 packs in parallel and a single aborted fetch
  // was wiping Resilience (fossilDependency null while siblings 200).
  const attempt = async (): Promise<SeriesPack> => {
    const [meta, obs] = await Promise.all([
      fetchIndicator(id),
      fetchObservations(id, { limit: "10000" }),
    ]);
    const sourceVersion = obs.observations.find((r) => r.source_version)?.source_version ?? "";
    return {
      meta,
      observations: obs.observations,
      sourceVersion,
      retrievedNote: `Loaded from the Exchange API (Supabase Postgres; ${sector}/${id}).`,
    };
  };
  try {
    return await attempt();
  } catch (first) {
    try {
      return await attempt();
    } catch (err) {
      console.error(`loadSeriesPack(${id}) failed after retry`, err ?? first);
      void fallbackMeta;
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
    capComponents = await fetchPackJson<PricesPack["capComponents"]>("energy.ofgem-components");
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

async function loadFieldAtlasPoints(): Promise<FieldPoint[]> {
  try {
    const payload = await fetchPackJson<{ points?: FieldPoint[]; attribution?: string }>(
      "energy.nsta-field-points",
    );
    return payload.points ?? [];
  } catch {
    return [];
  }
}

async function loadFieldAnnualRows(): Promise<FieldAnnual[]> {
  try {
    const text = await fetchPackText("energy.nsta-field-annual");
    return csvRowsFromText(text)
      .map((r) => ({
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
      }))
      .filter((r) => r.fieldName && Number.isFinite(r.year));
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
  const [outlinePack, fields, fieldProduction] = await Promise.all([
    loadGbOutline(),
    loadFieldAtlasPoints(),
    loadFieldAnnualRows(),
  ]);
  return {
    crude,
    gas,
    primary,
    coal,
    fields,
    fieldProduction,
    fieldProductionNational,
    reserves,
    oilImports,
    trade,
    dependency,
    outline: outlinePack.outline,
    outlineAttribution: outlinePack.outlineAttribution,
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

const TEC_REGISTER_META: IndicatorMeta = {
  indicator_id: TEC_REGISTER_ID,
  title: "Transmission entry capacity (TEC) register",
  sector: "energy-industry",
  publisher: "NESO",
  source_url: "https://www.neso.energy/data-portal/transmission-entry-capacity-tec-register",
  series_id: "TEC Register (resource_id 17becbab-e3e8-473f-b303-3806f43a6a10)",
  geography: "Great Britain (K03000001)",
  frequency: "ad_hoc",
  unit: "MW",
  definition:
    "Contracted Transmission Entry Capacity increments from the NESO TEC Register. Not speculative ETAs. Not a DNO topology atlas.",
  licence: "NESO Open Data Licence",
  caveats:
    "GB only. Gate may be unassigned. Do not sum stage rows without dedupe. MW Effective From is contractual, not a delivery promise.",
  revision_notes: "NESO TEC Register pin 2026-11-07.",
  notion_registry_url: "",
};

const SSEN_ATLAS_META: IndicatorMeta = {
  indicator_id: SSEN_ATLAS_ID,
  title: "SSEN distribution network atlas (DNO pilot)",
  sector: "energy-industry",
  publisher: "SSEN Distribution",
  source_url: "https://data.ssen.co.uk/@ssen-distribution/ssen-substation-data",
  series_id: "ssen-substation-data + ssen-overhead-lines (pilot pin)",
  geography: "SEPD + SHEPD licence areas only — not GB-wide",
  frequency: "ad_hoc",
  unit: "feature_count",
  definition:
    "SSEN Distribution substations and overhead-line segments plus a lean display atlas for the Invisible Grid pilot.",
  licence: "Creative Commons Attribution 4.0 (CC BY 4.0) · IB1-O — © SSEN Distribution",
  caveats:
    "Pilot geography only. Overhead only. Not spare capacity. Not a national DNO product.",
  revision_notes: "SSEN operator pin 2026-11-09.",
  notion_registry_url: "https://app.notion.com/p/4136547176858141b066ff8d9b836ca9",
};

export async function loadNetworks(): Promise<NetworksPack> {
  // Link Ready packages already used elsewhere — do not fork curated data.
  const [interconnectors, interconnectorCapacity, tec, ssenCounts, ssenAtlasRaw, outlinePack] =
    await Promise.all([
      loadSeriesPack(NETWORKS_IC_ID, INTERCONNECTOR_META),
      loadSeriesPack(INTERCONNECTOR_CAPACITY_ID, INTERCONNECTOR_CAPACITY_META),
      loadSeriesPack(TEC_REGISTER_ID, TEC_REGISTER_META),
      loadSeriesPack(SSEN_ATLAS_ID, SSEN_ATLAS_META),
      fetchPackJson<SsenAtlasPack>("energy.ssen-dno-atlas").catch(() => null),
      loadGbOutline(),
    ]);
  // Operator pin reuses the same id for many UNKNOWN / blank-number sites (hundreds
  // of Switching Station:UNKNOWN). React keys and selection need one id per mark.
  const ssenAtlas = ssenAtlasRaw
    ? {
        ...ssenAtlasRaw,
        substations: ssenAtlasRaw.substations.map((p, i) => ({
          ...p,
          id: `${p.id}@${p.lon.toFixed(5)},${p.lat.toFixed(5)}#${i}`,
        })),
        lines: ssenAtlasRaw.lines.map((line, i) => ({
          ...line,
          id: `${line.id}#${i}`,
        })),
      }
    : null;
  return {
    interconnectors,
    interconnectorCapacity,
    tec,
    ssenCounts,
    ssenAtlas,
    outline: outlinePack.outline,
    outlineAttribution: outlinePack.outlineAttribution,
  };
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

const OUTPUT_PER_JOB_META: IndicatorMeta = {
  indicator_id: OUTPUT_PER_JOB_ID,
  title: "Manufacturing output per job",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/dj4p/prdy",
  series_id: "DJ4P / PRDY (Manufacturing C output per job, 2023=100 SA)",
  geography: "United Kingdom (K02000001)",
  frequency: "quarterly",
  unit: "index (2023=100, SA)",
  definition: "UK manufacturing (SIC section C) output per filled job, seasonally adjusted index.",
  licence: "Open Government Licence v3.0",
  caveats: "Not IoP÷jobs; distinct from output per hour (DJK6).",
  revision_notes: "ONS productivity revisions.",
  notion_registry_url: "",
};

const PRODUCTIVITY_HOURS_META: IndicatorMeta = {
  indicator_id: PRODUCTIVITY_HOURS_ID,
  title: "Manufacturing productivity hours",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/labourproductivity/timeseries/dk3v/prdy",
  series_id: "DK3V / PRDY (Manufacturing C productivity hours, 2023=100 SA)",
  geography: "United Kingdom (K02000001)",
  frequency: "quarterly",
  unit: "index (2023=100, SA)",
  definition:
    "UK manufacturing (SIC section C) productivity hours index — the official hours component in labour productivity.",
  licence: "Open Government Licence v3.0",
  caveats: "Hours index ≠ Workforce Jobs (JWR7). Not ASHE paid hours.",
  revision_notes: "ONS productivity revisions.",
  notion_registry_url: "https://app.notion.com/414654717685812eb6a1f1dbe97cc368",
};

const ASHE_EARNINGS_META: IndicatorMeta = {
  indicator_id: ASHE_EARNINGS_ID,
  title: "ASHE manufacturing median earnings",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/industry2digitsicashetable4",
  series_id: "ASHE Table 4 · SIC 2007 manufacturing · median",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "GBP median (weekly gross or hourly excluding overtime)",
  definition:
    "ASHE Table 4 medians for UK manufacturing section C and divisions 10–33 (All and Full-Time employee jobs).",
  licence: "Open Government Licence v3.0",
  caveats: "Cash pounds; median ≠ mean; Full-Time ≠ All; not Workforce Jobs.",
  revision_notes: "ASHE 2025 revised pin 2026-11-10.",
  notion_registry_url: "https://app.notion.com/41465471768581e3bfbbc844f0357d31",
};

const IOP_BY_DIVISION_META: IndicatorMeta = {
  indicator_id: IOP_BY_DIVISION_ID,
  title: "Manufacturing IoP by SIC division / subsection",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/indexofproduction/current",
  series_id: "DIOP · SIC 2007 section C subsections CA–CM and divisions 10–33",
  geography: "United Kingdom (K02000001)",
  frequency: "monthly",
  unit: "index (chained volume, SA; base year = 100)",
  definition:
    "Monthly seasonally adjusted chained-volume Index of Production levels for manufacturing subsections and divisions. Index levels are not industry size.",
  licence: "Open Government Licence v3.0",
  caveats:
    "Not Ready headline K22A. Not GVA shares. ONS combines divisions 11+12 as DM4H. Indices are not additive.",
  revision_notes: "DIOP pin 2026-11-07.",
  notion_registry_url: "",
};

const IOP_WEIGHTS_META: IndicatorMeta = {
  indicator_id: IOP_WEIGHTS_ID,
  title: "Manufacturing IoP weights by SIC division / subsection",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/indexofproduction/current",
  series_id: "DIOP · annual GVA weights · section C, subsections CA–CM, divisions 10–33",
  geography: "United Kingdom (K02000001)",
  frequency: "annual",
  unit: "parts per thousand of the Index of Production (GVA weight)",
  definition:
    "ONS annual GVA weights used to combine the Index of Production, in parts per thousand of all production. Subsections and divisions each add up to manufacturing.",
  licence: "Open Government Licence v3.0",
  caveats: "Weights describe each branch's share of production value, not its volume growth.",
  revision_notes: "DIOP pin 2026-11-07.",
  notion_registry_url: "",
};

const BRES_META: IndicatorMeta = {
  indicator_id: BRES_EMPLOYEE_JOBS_ID,
  title: "BRES manufacturing employee jobs by region",
  sector: "energy-industry",
  publisher: "ONS",
  source_url:
    "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/regionbybroadindustrygroupsicbusinessregisterandemploymentsurveybrestable4",
  series_id: "BRES Table 4 · Manufacturing · Total employees",
  geography: "UK countries and English regions",
  frequency: "annual",
  unit: "thousands of employee jobs",
  definition:
    "Manufacturing (SIC section C) employee jobs by UK region from BRES Table 4. Not the workforce-jobs series.",
  licence: "Open Government Licence v3.0",
  caveats: "2024 provisional excludes Northern Ireland. Employee jobs ≠ workforce jobs.",
  revision_notes: "BRES Table 4 annual editions.",
  notion_registry_url: "",
};

const BRES_DIVISION_META: IndicatorMeta = {
  indicator_id: BRES_BY_DIVISION_REGION_ID,
  title: "BRES manufacturing employee jobs by division and region",
  sector: "energy-industry",
  publisher: "ONS via Nomis",
  source_url: "https://www.nomisweb.co.uk/datasets/newbres6pub",
  series_id: "Nomis NM_189_1 · SIC divisions × regions · Employees",
  geography: "Great Britain countries and English regions",
  frequency: "annual",
  unit: "thousands of employee jobs",
  definition:
    "Manufacturing SIC division employee jobs by GB region from Nomis open-access BRES. No Northern Ireland.",
  licence: "Open Government Licence v3.0",
  caveats: "GB only. Rounded counts. Division sums will not exactly match Table 4 totals.",
  revision_notes: "Nomis BRES open access annual editions.",
  notion_registry_url: "",
};

type IopAnnualPack = {
  indicator_id?: string;
  source_version?: string;
  observation_count?: number;
  observations: Array<{
    indicator_id?: string;
    period_start: string;
    period_end: string;
    geography_code?: string;
    geography_label?: string;
    value: number | null;
    unit?: string;
    observation_status?: string;
    source_version?: string;
    notes?: string;
    dimensions?: { series?: string; category?: string };
  }>;
};

/**
 * Multi-series IoP — lean annual year-mean pack (not the ~34k-row monthly CSV).
 * Catalogue ChangeRows and branch dials only need one point per year per SIC break.
 */
async function loadIopByDivision(): Promise<SeriesPack | null> {
  return loadIopPack("energy.manufacturing-iop-annual", IOP_BY_DIVISION_ID, IOP_BY_DIVISION_META);
}

/** ONS annual IoP weights — additive composition of manufacturing (Production Anatomy). */
async function loadIopWeights(): Promise<SeriesPack | null> {
  return loadIopPack("energy.manufacturing-iop-weights", IOP_WEIGHTS_ID, IOP_WEIGHTS_META);
}

async function loadIopPack(
  packId: string,
  indicatorId: string,
  fallbackMeta: IndicatorMeta,
): Promise<SeriesPack | null> {
  try {
    const pack = await fetchPackJson<IopAnnualPack>(packId);
    const observations: Observation[] = (pack.observations ?? []).map((r) => ({
      indicator_id: r.indicator_id || indicatorId,
      period_start: r.period_start ?? "",
      period_end: r.period_end ?? "",
      geography_code: r.geography_code ?? "K02000001",
      geography_label: r.geography_label ?? "United Kingdom",
      value: r.value != null && Number.isFinite(Number(r.value)) ? Number(r.value) : null,
      unit: r.unit ?? "",
      observation_status: r.observation_status ?? "final",
      source_version: r.source_version ?? pack.source_version ?? "",
      notes: r.notes ?? "",
      dimensions: {
        fuel: "",
        water_company: "",
        water_company_name: "",
        demographic: "",
        series: r.dimensions?.series ?? "",
        category: r.dimensions?.category ?? "",
      },
    }));
    if (!observations.length) return null;
    const meta = await fetchIndicator(indicatorId).catch(() => fallbackMeta);
    const sourceVersion =
      pack.source_version ||
      observations.find((row) => row.source_version)?.source_version ||
      "";
    return {
      meta,
      observations,
      sourceVersion,
      retrievedNote: `Loaded from pack ${packId} (${observations.length} annual rows).`,
    };
  } catch {
    return null;
  }
}

export async function loadManufacturing(): Promise<ManufacturingPack> {
  const [
    output,
    share,
    employment,
    productivity,
    outputPerJob,
    productivityHours,
    asheEarnings,
    iopByDivision,
    iopWeights,
    bresByRegion,
    bresByDivisionRegion,
  ] = await Promise.all([
    loadSeriesPack(OUTPUT_INDEX_ID, OUTPUT_META),
    loadSeriesPack(SHARE_GVA_ID, SHARE_META),
    loadSeriesPack(EMPLOYMENT_ID, EMPLOYMENT_META),
    loadSeriesPack(OUTPUT_PER_HOUR_ID, PRODUCTIVITY_META),
    loadSeriesPack(OUTPUT_PER_JOB_ID, OUTPUT_PER_JOB_META),
    loadSeriesPack(PRODUCTIVITY_HOURS_ID, PRODUCTIVITY_HOURS_META),
    loadSeriesPack(ASHE_EARNINGS_ID, ASHE_EARNINGS_META),
    loadIopByDivision(),
    loadIopWeights(),
    loadSeriesPack(BRES_EMPLOYEE_JOBS_ID, BRES_META),
    loadSeriesPack(BRES_BY_DIVISION_REGION_ID, BRES_DIVISION_META),
  ]);
  return {
    output,
    share,
    employment,
    productivity,
    outputPerJob,
    productivityHours,
    asheEarnings,
    iopByDivision,
    iopWeights,
    bresByRegion,
    bresByDivisionRegion,
  };
}

export async function loadLongRun(): Promise<LongRunPack | null> {
  try {
    // Prefer Postgres observations; fall back to the curated pack via Storage/API.
    let rows: { period_start: string; value: number | null; observation_status: string; notes: string }[];
    try {
      const obs = await fetchObservations("electricity-generation-long-run", {
        limit: "10000",
        include_aggregates: "true",
      });
      rows = obs.observations.map((r) => ({
        period_start: r.period_start,
        value: r.value,
        observation_status: r.observation_status,
        notes: r.notes ?? "",
      }));
    } catch {
      const text = await fetchPackText("energy.long-run-observations");
      rows = csvRowsFromText(text).map((r) => ({
        period_start: r.period_start!,
        value: r.value === "" ? null : Number(r.value),
        observation_status: r.observation_status!,
        notes: r.notes!,
      }));
    }
    const related: Record<string, Coverage> = {};
    await Promise.all(
      RELATED.map(async (rel) => {
        try {
          const obs = await fetchObservations(rel.id, { limit: "10000", include_aggregates: "true" });
          const years = obs.observations
            .map((r) => Number(r.period_start.slice(0, 4)))
            .filter(Number.isFinite);
          if (!years.length) return;
          related[rel.id] = { ...rel, first: Math.min(...years), last: Math.max(...years) };
        } catch {
          /* a missing related series just drops that link */
        }
      }),
    );
    return { mix: longRunFromRows(rows), related };
  } catch {
    return null;
  }
}

/** Empty shells for packs the current domain did not request. */
const EMPTY_CONSUMPTION: ConsumptionPack = {
  final: null,
  flow: null,
  endUse: null,
  crossEndUse: null,
  geography: null,
  efficiencies: null,
};
const EMPTY_PRICES: PricesPack = {
  domestic: null,
  gas: null,
  economy7: null,
  layers: null,
  gasLayers: null,
  industrial: null,
  ofgem: null,
  ofgemRegional: null,
  wholesale: null,
  cpih: null,
  earnings: null,
};
const EMPTY_FOSSILS: FossilsPack = {
  crude: null,
  gas: null,
  primary: null,
  coal: null,
  fields: [],
  fieldProduction: [],
  fieldProductionNational: null,
  reserves: null,
  oilImports: null,
  trade: null,
  dependency: null,
  attribution: "",
};
const EMPTY_IMPORTS: ImportsPack = {
  dependency: null,
  trade: null,
  interconnectors: null,
  interconnectorCapacity: null,
  oilPartners: null,
  gasPartners: null,
  lngTerminals: null,
  fossilDependency: null,
  lowCarbonShare: null,
  gasStorage: null,
};
const EMPTY_MANUFACTURING: ManufacturingPack = {
  output: null,
  share: null,
  employment: null,
  productivity: null,
  outputPerJob: null,
  productivityHours: null,
  asheEarnings: null,
  iopByDivision: null,
  iopWeights: null,
  bresByRegion: null,
  bresByDivisionRegion: null,
};
const EMPTY_RENEWABLES: RenewablesPack = {
  loadFactors: null,
  pipeline: null,
  plantLoadFactors: null,
};
const EMPTY_NETWORKS: NetworksPack = {
  interconnectors: null,
  interconnectorCapacity: null,
  tec: null,
  ssenAtlas: null,
  ssenCounts: null,
};

/** Curated event registers: a missing pack degrades to an empty ledger, never a crash. */
async function loadPolicyEvents(): Promise<PolicyEventsPack> {
  try {
    return await loadPolicyEventsPack();
  } catch {
    return EMPTY_POLICY_EVENTS_PACK;
  }
}

async function loadPolicyPledges(): Promise<PolicyPledgesPack> {
  try {
    return await loadPolicyPledgesPack();
  } catch {
    return EMPTY_POLICY_PLEDGES_PACK;
  }
}

async function loadShockEvents(): Promise<ShockEventsPack> {
  try {
    return await loadShockEventsPack();
  } catch {
    return EMPTY_SHOCK_EVENTS_PACK;
  }
}

export type EnergySectorData = {
  generation: GenerationPack | null;
  capacity: CapacityPack | null;
  longRun: LongRunPack | null;
  yearMix: YearPack | null;
  atlas: AtlasPack | null;
  consumption: ConsumptionPack;
  prices: PricesPack;
  fossils: FossilsPack;
  imports: ImportsPack;
  manufacturing: ManufacturingPack;
  renewables: RenewablesPack;
  networks: NetworksPack;
  policyEvents: PolicyEventsPack;
  policyPledges: PolicyPledgesPack;
  shockEvents: ShockEventsPack;
};

/**
 * Load only the packs the selected Energy domain needs.
 * Pass `scope: "all"` for design-lab or full-sector consumers.
 * Domain switches must navigate through Next so this runs again server-side.
 */
export async function loadEnergy(scope: EnergyScope = "generation"): Promise<EnergySectorData> {
  const need = (key: EnergyPackKey) => packAllowed(scope, key);
  const skip = <T>(empty: T) => Promise.resolve(empty);

  const [
    generation,
    capacity,
    longRun,
    yearMix,
    atlas,
    consumption,
    prices,
    fossils,
    imports,
    manufacturing,
    renewables,
    networks,
    policyEvents,
    policyPledges,
    shockEvents,
  ] = await Promise.all([
    need("generation") ? loadGeneration() : skip(null),
    need("capacity") ? loadCapacity() : skip(null),
    need("longRun") ? loadLongRun() : skip(null),
    need("yearMix") ? loadYearMix() : skip(null),
    need("atlas") ? loadAtlas() : skip(null),
    need("consumption") ? loadConsumption() : skip(EMPTY_CONSUMPTION),
    need("prices") ? loadPrices() : skip(EMPTY_PRICES),
    need("fossils") ? loadFossils() : skip(EMPTY_FOSSILS),
    need("imports") ? loadImports() : skip(EMPTY_IMPORTS),
    need("manufacturing") ? loadManufacturing() : skip(EMPTY_MANUFACTURING),
    need("renewables") ? loadRenewables() : skip(EMPTY_RENEWABLES),
    need("networks") ? loadNetworks() : skip(EMPTY_NETWORKS),
    need("policyEvents") ? loadPolicyEvents() : skip(EMPTY_POLICY_EVENTS_PACK),
    need("policyPledges") ? loadPolicyPledges() : skip(EMPTY_POLICY_PLEDGES_PACK),
    need("shockEvents") ? loadShockEvents() : skip(EMPTY_SHOCK_EVENTS_PACK),
  ]);

  return {
    generation,
    capacity,
    longRun,
    yearMix,
    atlas,
    consumption,
    prices,
    fossils,
    imports,
    manufacturing,
    renewables,
    networks,
    policyEvents,
    policyPledges,
    shockEvents,
  };
}

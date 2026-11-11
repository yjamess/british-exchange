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
import { CPIH_COICOP_DIVISIONS, CPIH_CONTRIBUTION_DIVISIONS } from "./inflation-model";
import type {
  DebtPack,
  EconomyDomainId,
  GdpVintageBandPack,
  GrowthPack,
  InflationPack,
  SeriesPack,
  WagesPack,
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

async function loadSeriesPack(id: string): Promise<SeriesPack | null> {
  const attempt = async (): Promise<SeriesPack> => {
    const [meta, obs] = await Promise.all([
      fetchIndicator(id),
      fetchObservations(id, { limit: "10000" }),
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
  const [debt, borrowing, interest, percentGdp] = await Promise.all([
    loadSeriesPack("public-sector-net-debt"),
    loadSeriesPack("public-sector-net-borrowing"),
    loadSeriesPack("public-sector-debt-interest"),
    loadSeriesPack("public-sector-net-debt-percent-gdp"),
  ]);
  return { debt, borrowing, interest, percentGdp };
}

async function loadGdpVintageBand(): Promise<GdpVintageBandPack | null> {
  try {
    return await fetchPackJson<GdpVintageBandPack>("economy.gdp-vintage-band");
  } catch (err) {
    console.error("economy loadGdpVintageBand failed", err);
    return null;
  }
}

export async function loadGrowth(): Promise<GrowthPack> {
  const [gdp, gdpPerHead, productivity, vintageBand] = await Promise.all([
    loadSeriesPack("real-gdp"),
    loadSeriesPack("real-gdp-per-head"),
    loadSeriesPack("labour-productivity"),
    loadGdpVintageBand(),
  ]);
  return { gdp, gdpPerHead, productivity, vintageBand };
}

export type EconomyData = {
  inflation: InflationPack;
  wages: WagesPack;
  debt: DebtPack;
  growth: GrowthPack;
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
};

const EMPTY_GROWTH: GrowthPack = {
  gdp: null,
  gdpPerHead: null,
  productivity: null,
  vintageBand: null,
};

const EMPTY: EconomyData = {
  inflation: EMPTY_INFLATION,
  wages: EMPTY_WAGES,
  debt: EMPTY_DEBT,
  growth: EMPTY_GROWTH,
};

/** Hydrate only the selected domain's packs (Housing / Energy pattern). */
export async function loadEconomy(domain: EconomyDomainId): Promise<EconomyData> {
  const needed = new Set(packsFor(domain));
  if (needed.has("inflation")) return { ...EMPTY, inflation: await loadInflation() };
  if (needed.has("wages")) return { ...EMPTY, wages: await loadWages() };
  if (needed.has("debt")) return { ...EMPTY, debt: await loadDebt() };
  if (needed.has("growth")) return { ...EMPTY, growth: await loadGrowth() };
  return EMPTY;
}

export function latestFinite(rows: Observation[]): Observation | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (row.value != null && Number.isFinite(row.value)) return row;
  }
  return null;
}

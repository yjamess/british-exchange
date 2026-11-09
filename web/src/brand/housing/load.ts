/**
 * Housing & Land — server loader (v1).
 * Pulls only the selected domain’s dependencies and shapes them for the explorer.
 * Rules: never mix geographies or snapshot conventions in one line;
 * derived measures (rent annual change, rolling-year completions) are computed here and labelled.
 * Observation provisional flags are preserved for dotted traces and exact-value status.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { apiBase, fetchIndicator, fetchObservations, type IndicatorMeta, type Observation } from "@/lib/api";
import { toT, type Pt } from "../data";
import { sourceAllowed, type HousingScope } from "./domain-sources";
import { categoryLabel } from "./canvas/renting/selection";

export type Source = {
  id: string;
  title: string;
  publisher: string;
  seriesId: string;
  unit: string;
  geography: string;
  frequency: string;
  sourceUrl: string;
  release: string;
  first: string;
  last: string;
  count: number;
  /** Publisher caveats from the indicator record, when the API sent them. */
  caveats?: string;
  /** External publication, for a series read from a local file rather than the API. */
  href?: string;
};

export type Line = { id: string; label: string; points: Pt[] };

/** One age band in one EHS survey year. Null means the cell was published as unreliable. */
export type EhsAgeRow = {
  age: string;
  householdsThousands: number | null;
  meanWeekly: number | null;
  incomeRatio: number | null;
  sample: number | null;
};

export type EhsMortgageByAge = {
  publisher: string;
  series: string;
  title: string;
  geography: string;
  url: string;
  collectionUrl: string;
  unit: string;
  note: string;
  years: { year: string; rows: EhsAgeRow[] }[];
};

function loadEhsMortgageByAge(): EhsMortgageByAge | null {
  try {
    const file = path.resolve(process.cwd(), "../data/housing/ehs-mortgage-by-age/curated/by-age.json");
    return JSON.parse(readFileSync(file, "utf8")) as EhsMortgageByAge;
  } catch {
    return null;
  }
}

/** One published cell: mean share, median share, and the unweighted sample. Null was published as unreliable. */
export type EhsCostStat = { mean: number | null; median: number | null; sample: number | null };

export type EhsCostTenure = {
  id: "mortgage" | "private-rent" | "social-rent";
  label: string;
  latest: EhsCostStat;
  earlier: EhsCostStat;
};

export type EhsCostRow = {
  group: "region" | "income" | "children" | "total";
  place: string;
  tenures: EhsCostTenure[];
};

export type EhsCostCohort = {
  age: string;
  table: string;
  base: string;
  rows: EhsCostRow[];
};

/** English Housing Survey age-cohort annex: housing cost as a share of income. */
export type EhsHousingCostsByAge = {
  publisher: string;
  series: string;
  title: string;
  geography: string;
  url: string;
  collectionUrl: string;
  unit: string;
  release: string;
  latestYear: string;
  earlierYear: string;
  note: string;
  unpublishedAges: { age: string; reason: string }[];
  cohorts: EhsCostCohort[];
};

function loadEhsHousingCostsByAge(): EhsHousingCostsByAge | null {
  try {
    const file = path.resolve(process.cwd(), "../data/housing/ehs-housing-costs-by-age/curated/costs-by-age.json");
    return JSON.parse(readFileSync(file, "utf8")) as EhsHousingCostsByAge;
  } catch {
    return null;
  }
}

/** H-CLIC series used by the Pathways diagram, keyed the same for England and places. */
export type PathwayKey =
  | "assessmentsTotal"
  | "assessmentsOwed"
  | "preventionOwed"
  | "reliefOwed"
  | "preventionEnded"
  | "preventionSecured"
  | "reliefEnded"
  | "reliefSecured"
  | "relief56Days"
  | "mainDutyTotal"
  | "mainDutyAccepted"
  | "mainDutyIntentional"
  | "mainDutyNoPriority"
  | "mainDutyNotHomeless";

/** One financial year of MHCLG Live Table 118 for one place — every published term, nulls kept. */
export type SupplyLedgerYear = {
  /** Financial year start (1 April), as toT(period_start). */
  t: number;
  /** "2024–25". */
  fy: string;
  status: "final" | "provisional";
  net: number | null;
  newBuild: number | null;
  conversions: number | null;
  changeOfUse: number | null;
  otherGains: number | null;
  /** Published as a positive count; subtracted in the identity (LT118 note 4). */
  demolitions: number | null;
  /** Adjustment to Census 2011 or 2021; null where the publisher marks it not applicable. */
  census: number | null;
  censusLabel: string | null;
  residual: number | null;
  /** All-dwellings stock at 31 March opening / closing the year (Live Table 109c), when published. */
  stockOpen: number | null;
  stockClose: number | null;
  /** Publisher table notes on this year's rows, e.g. "[note 2]". */
  notes: string[];
};

export type HousingV1 = {
  sources: Record<string, Source>;
  price: Pt[];
  types: Line[];
  /** UK new-build vs existing HPI prices. */
  newExisting: Line[];
  /** England first-time buyer average price. */
  firstTimeBuyer: Pt[];
  /** England cash vs mortgage HPI prices. */
  cashMortgage: Line[];
  /** UK average deflated to latest CPI (£). Empty until cpi-index is Ready. */
  priceReal: Pt[];
  sales: Pt[];
  regions: { code: string; name: string; points: Pt[] }[];
  ukRegional: Pt[];
  /** UK average monthly private rent (£) — PIPR average-rent. */
  rentAverage: Pt[];
  /** UK annual change in private rents (%) — PIPR annual-change (publisher). */
  rentChange: Pt[];
  /** UK PIPR index (Jan 2023=100). */
  rentIndex: Pt[];
  /** UK average rent by bedroom count. Categories come from the file, not a fixed list. */
  rentBedrooms: Line[];
  /** UK average rent by property type, where the file publishes it. */
  rentPropertyTypes: Line[];
  afford: Pt[];
  /** 10th–90th percentile of AFF1 median ratio across English local authorities (added server-side by the page). */
  affordSpread?: { lo: Pt[]; hi: Pt[]; areas: number } | null;
  /** Derived England annual rent ÷ workplace earnings. */
  rentToEarnings: Pt[];
  /** ONS purchase affordability median/median by country & English region. */
  purchaseAffordRegions: Line[];
  /** England income×price decile grid for the latest financial year. */
  purchaseAffordGrid: { income: string; price: string; value: number }[];
  /**
   * English Housing Survey age cohorts: mortgage, private rent and social rent
   * as a share of income, ages 16–34 and 65 or over.
   */
  ehsHousingCostsByAge: EhsHousingCostsByAge | null;
  /** English Housing Survey FA2555: mortgage payment as % of income by age. */
  ehsMortgageByAge: EhsMortgageByAge | null;
  /** BoE quoted 2-year fixed mortgage rate (%). */
  mortgageRate: Pt[];
  completions: Pt[];
  completionsYear: Pt[];
  tenure: { years: number[]; owner: number[]; privateRented: number[]; social: number[]; total: number[] };
  allDwellings: Pt[];
  /** Live Table 615 vacants (England series + regional latest ranks). */
  vacancy: {
    all: Pt[];
    longTerm: Pt[];
    /** Derived: all vacants ÷ Table 104 England all-dwellings (%). */
    rateEngland: Pt[];
    regionAll: { id: string; label: string; v: number }[];
  };
  /**
   * Council Taxbase Table 4 second homes, England.
   * Furnished, not a main home. Not the vacancy series above.
   */
  secondHomes: {
    total: Pt[];
    noDiscountOrPremium: Pt[];
    subjectToDiscount: Pt[];
    chargedPremium: Pt[];
  };
  /**
   * Live Table 109 by 31 March year, plus Table 100’s latest district ranking.
   * Districts do not follow the region year: Table 100’s private sector is not split.
   */
  stockGeography: {
    years: number[];
    byYear: {
      year: number;
      england: { owner: number; privateRented: number; social: number; total: number } | null;
      regions: { id: string; label: string; owner: number; privateRented: number; social: number; total: number }[];
    }[];
    districtYear: number | null;
    districtTotals: { id: string; label: string; v: number }[];
  };
  /** Census 2021 TS044 accommodation type (households). */
  dwellingTypes: {
    places: {
      id: string;
      label: string;
      total: number;
      parts: { id: string; label: string; count: number }[];
    }[];
  };
  ridges: { names: string[]; quarters: string[]; values: number[][] };
  /** England Green Belt hectares (annual, as at 31 March). */
  greenBelt: Pt[];
  /** Land-use shares for England 2022 (series key → %). */
  landUseShares: Line[];
  /** District planning decisions granted (England, quarterly). */
  planningGranted: Pt[];
  /** Domain 06 — P120 received / decided / granted (England, quarterly). */
  planningFlow: { received: Pt[]; decided: Pt[]; granted: Pt[] };
  /** Domain 06 — brownfield register inventory (Planning Data snapshot). */
  brownfield: {
    asAt: number | null;
    siteCount: number | null;
    hectares: number | null;
    maxDwellings: number | null;
    /** Sites whose maximum was published. The rest are missing, not zero. */
    sitesWithEstimate: number | null;
    byPermission: { id: string; v: number }[];
    authorities: { id: string; label: string; v: number; hectares: number }[];
  };
  /**
   * HM Land Registry Price Paid slice behind address search.
   * `available` is false when the API has no PostgreSQL store.
   * Publisher, series, file and geography come from the API, for the source line.
   */
  pricePaid: {
    available: boolean;
    year: number | null;
    count: number;
    publisher: string;
    series: string;
    release: string;
    geography: string;
    url: string;
  };
  /** Domain 05 — England net additions components (financial year). */
  supplyNet: {
    years: number[];
    net: number[];
    newBuild: number[];
    conversions: number[];
    changeOfUse: number[];
    otherGains: number[];
    demolitions: number[];
  };
  /** Domain 05 — Supply Machine ledger: England + regions, years with published components. */
  supplyMachine: {
    places: { code: string; label: string }[];
    byPlace: Record<string, SupplyLedgerYear[]>;
    release: string;
  };
  /** Domain 05 — latest FY regional + top LA net additions. */
  supplyGeography: {
    yearLabel: string | null;
    /** Latest financial year is still marked provisional by the publisher. */
    provisional: boolean;
    england: number | null;
    regions: { id: string; label: string; v: number; shareOfEngland: number }[];
    authorities: { id: string; label: string; v: number }[];
  };
  /** Domain 05 — Table 213 tenure starts / completions + Table 1000 affordable. */
  whoBuilds: {
    completions: Line[];
    starts: Line[];
    /** Affordable completions by product (Live Table 1000). */
    affordable: Line[];
    /** All affordable completions (England). */
    affordableTotal: Pt[];
  };
  /** England quarterly starts (all tenures). */
  starts: Pt[];
  /** Domain 07 — EHS housing quality (England survey %). */
  quality: {
    years: number[];
    /** Years available on energy anatomy series (bands / heating / insulation). */
    energyYears: number[];
    decentHomes: { tenure: string; points: Pt[] }[];
    category1: { tenure: string; points: Pt[] }[];
    damp: { tenure: string; points: Pt[] }[];
    energyAbc: { tenure: string; points: Pt[] }[];
    /** Full EER band mix (all-tenures from DA7101). */
    energyBands: Record<string, { tenure: string; points: Pt[] }[]>;
    heating: {
      central: { tenure: string; points: Pt[] }[];
      condensing: { tenure: string; points: Pt[] }[];
      room: { tenure: string; points: Pt[] }[];
    };
    insulation: {
      wall: { tenure: string; points: Pt[] }[];
      loft200: { tenure: string; points: Pt[] }[];
      glazing: { tenure: string; points: Pt[] }[];
    };
    improvement: {
      improvable: { tenure: string; points: Pt[] }[];
      alreadyC: { tenure: string; points: Pt[] }[];
      meanCost: { tenure: string; points: Pt[] }[];
    };
  };
  /** Domain 08 — Housing Insecurity (stocks vs flows tagged on each series). */
  insecurity: {
    /** Quarterly flow — households owed prevention or relief (A1). */
    assessmentsOwed: Pt[];
    assessmentsTotal: Pt[];
    preventionEnded: Pt[];
    preventionSecured: Pt[];
    reliefEnded: Pt[];
    reliefSecured: Pt[];
    mainDutyAccepted: Pt[];
    /** A1 duty split (flow, quarter). */
    preventionOwed: Pt[];
    reliefOwed: Pt[];
    /** R1 — relief ended because 56 days elapsed (flow). */
    relief56Days: Pt[];
    /** MD1 decisions (flow) — total and non-acceptance outcomes. */
    mainDutyTotal: Pt[];
    mainDutyIntentional: Pt[];
    mainDutyNoPriority: Pt[];
    mainDutyNotHomeless: Pt[];
    /** Quarterly stock — households / children in TA (England). */
    taHouseholds: Pt[];
    taChildren: Pt[];
    /** TA1 households with dependent children (stock, England, 1998→). */
    taWithChildren: Pt[];
    /** TA4 England matrix at 31 Mar 2026: accommodation type × length-of-stay band (stock). */
    taDurationMatrix: { id: string; label: string; total: number; bands: { id: string; label: string; v: number }[] }[];
    /** ISO stock date of the TA4 matrix and the LA place record. */
    taDurationDate: string;
    /** Latest LA place record (31 Mar 2026 stock). Values null where suppressed / not reported. */
    taPlaces: {
      code: string;
      name: string;
      households: number | null;
      children: number | null;
      rate: number | null;
      outOfArea: number | null;
      /** TA7 mean / median days by accommodation type. */
      days: { id: string; label: string; mean: number | null; median: number | null }[];
    }[];
    /**
     * Pathway by place — H-CLIC flows for one quarter (detailed LA tables) and the TA stock at its
     * end. Regions (E12) and authorities (E06–E09). Null = not submitted / not published.
     */
    pathwayPlaces: {
      code: string;
      name: string;
      kind: "region" | "local";
      /** ISO start of the flow quarter. */
      period: string;
      v: Partial<Record<PathwayKey, number | null>>;
      ta: number | null;
    }[];
    /** CORE new lettings by rent and needs type (flow, financial year starting t). */
    lettingsBreakdown: {
      t: number;
      total: number;
      social: number;
      affordable: number;
      intermediate: number;
      generalNeeds: number;
      supported: number;
    }[];
    taByType: Line[];
    /** Duration bands at 31 Mar 2026 (all types summed). */
    taDurationBands: { id: string; label: string; v: number }[];
    /** TA2 household composition at latest stock date. */
    taHouseholdComposition: { id: string; label: string; v: number }[];
    /** Latest LA TA rates (households per thousand). */
    taRates: { id: string; label: string; v: number }[];
    /** Out-of-area placements (latest snapshot). */
    taOutOfArea: { id: string; label: string; v: number }[];
    roughSleeping: Pt[];
    roughSleepingRegions: { id: string; label: string; v: number }[];
    waitingList: Pt[];
    lettings: Pt[];
    possessionMortgageClaims: Pt[];
    possessionLandlordClaims: Pt[];
    /** MoJ landlord possession stages, England & Wales (flow, quarter). Separate events, not one cohort. */
    possessionLandlordOrders: Pt[];
    possessionLandlordWarrants: Pt[];
    possessionLandlordRepossessions: Pt[];
    /** H-CLIC A3 — households owed a duty with one or more support needs (flow, quarter). */
    supportNeedsSeries: Pt[];
    /** Devolved TA stocks (jurisdiction-specific). */
    devolvedTa: { id: string; label: string; v: number; period: string }[];
    headlines: {
      taHouseholds: number | null;
      taChildren: number | null;
      assessmentsOwed: number | null;
      roughSleeping: number | null;
      waitingList: number | null;
      lettings: number | null;
      concealedFamilies: number | null;
      supportNeeds: number | null;
      mortgageClaims: number | null;
      landlordClaims: number | null;
      /** RO4 2024-25 England net current expenditure, £ thousand. */
      homelessnessSpendNet: number | null;
      /** Framework Table 1 — people seen over June 2026 (management information). */
      roughSleepingMonth: number | null;
      /** TA9 England — households placed outside their authority (latest stock). */
      outOfAreaEngland: number | null;
    };
  };
  /** Domain 09 — legal and financial ownership. Stocks and flows stay on separate series. */
  ownership: {
    /** BoE monthly flows (seasonally adjusted). */
    housePurchaseApprovals: Pt[];
    remortgageApprovals: Pt[];
    netSecuredLending: Pt[];
    grossSecuredLending: Pt[];
    /** FCA MLAR. Balances and arrears are stocks; advances are flows. £ million. */
    balancesOutstanding: Pt[];
    grossAdvances: Pt[];
    newCommitments: Pt[];
    arrearsBalances: Pt[];
    /** Latest quarter shares of gross advances (percent). */
    advanceShares: { id: string; label: string; v: number }[];
    ltvShares: { id: string; label: string; v: number }[];
    /** ONS Wealth and Assets Survey. Pounds, all households. */
    p25AllHouseholds: Pt[];
    medianAllHouseholds: Pt[];
    p75AllHouseholds: Pt[];
    /** Table 3.9, £ billion. */
    aggregateNet: Pt[];
    /** Table 3.19, April 2020–March 2022. Share of people in each band. */
    ageDistribution: { id: string; label: string; bands: { id: string; label: string; v: number }[] }[];
    headlines: {
      housePurchaseApprovals: number | null;
      remortgageApprovals: number | null;
      balancesOutstanding: number | null;
      grossAdvances: number | null;
      newCommitments: number | null;
      arrearsBalances: number | null;
      buyToLetShare: number | null;
      /** Median net property wealth, all households, latest survey round (£). */
      medianNetPropertyWealth: number | null;
    };
  };
};

function toPts(rows: Observation[]): Pt[] {
  const by = new Map<number, Pt>();
  for (const r of rows) {
    if (r.value === null) continue;
    const t = toT(r.period_start);
    by.set(t, { t, v: r.value, provisional: r.observation_status === "provisional" });
  }
  return [...by.values()].sort((a, b) => a.t - b.t);
}

/**
 * One local API process cannot drain a hundred sockets at once.
 * Four at a time lets each read finish instead of sitting until the client gives up.
 */
const API_CONCURRENCY = 4;

let apiActive = 0;
const apiQueue: (() => void)[] = [];

function withApiSlot<T>(work: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      apiActive += 1;
      work().then(resolve, reject).finally(() => {
        apiActive -= 1;
        apiQueue.shift()?.();
      });
    };
    if (apiActive < API_CONCURRENCY) run();
    else apiQueue.push(run);
  });
}

type SeriesLoad = { meta: IndicatorMeta; rows: Observation[] } | null;

const seriesInflight = new Map<string, Promise<SeriesLoad>>();

function seriesKey(id: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params);
  qs.sort();
  return `${id}?${qs.toString()}`;
}

async function fetchSeries(id: string, params: Record<string, string>): Promise<SeriesLoad> {
  try {
    const [meta, obs] = await Promise.all([
      fetchIndicator(id),
      fetchObservations(id, { limit: "10000", ...params }),
    ]);
    return { meta, rows: obs.observations };
  } catch {
    return null;
  }
}

/** One in-flight request per indicator + filter. Repeat loads on this page share it. */
function loadSeries(id: string, params: Record<string, string> = {}): Promise<SeriesLoad> {
  const key = seriesKey(id, params);
  const existing = seriesInflight.get(key);
  if (existing) return existing;
  const job = withApiSlot(() => fetchSeries(id, params)).finally(() => {
    seriesInflight.delete(key);
  });
  seriesInflight.set(key, job);
  return job;
}

function publicRelease(id: string, version: string): string {
  if (id === "mortgage-rate-2yr-fixed") return "Quoted two-year fixed rate";
  return version;
}

function source(meta: IndicatorMeta, rows: Observation[]): Source {
  const valued = rows.filter((r) => r.value !== null).sort((a, b) => a.period_start.localeCompare(b.period_start));
  return {
    id: meta.indicator_id,
    title: meta.title,
    publisher: meta.publisher,
    seriesId: meta.series_id,
    unit: meta.unit,
    geography: meta.geography.split(/[(;—]/)[0]!.trim(),
    frequency: meta.frequency,
    sourceUrl: meta.source_url,
    release: publicRelease(meta.indicator_id, valued[valued.length - 1]?.source_version ?? ""),
    first: valued[0]?.period_start ?? "",
    last: valued[valued.length - 1]?.period_start ?? "",
    count: valued.length,
    caveats: meta.caveats || undefined,
  };
}

const seriesRows = (rows: Observation[], key: string) => rows.filter((r) => r.dimensions?.series === key);

/** Deflate nominal £ series to the latest CPI index level (same calendar months only). */
function realPrices(nominal: Pt[], cpi: Pt[]): Pt[] {
  if (nominal.length === 0 || cpi.length === 0) return [];
  const byCpi = new Map(cpi.map((p) => [Math.round(p.t * 12), p.v]));
  const latest = cpi[cpi.length - 1]!;
  return nominal.flatMap((p) => {
    const c = byCpi.get(Math.round(p.t * 12));
    if (c == null || c === 0) return [];
    return [{ t: p.t, v: p.v * (latest.v / c) }];
  });
}

/** 12-month % change of a monthly index; only where the same month a year earlier exists. */
function annualChange(index: Pt[]): Pt[] {
  const by = new Map(index.map((p) => [Math.round(p.t * 12), p]));
  return index.flatMap((p) => {
    const prev = by.get(Math.round(p.t * 12) - 12);
    if (!prev) return [];
    return [{ t: p.t, v: (p.v / prev.v - 1) * 100 }];
  });
}

/** Sum of four consecutive quarters (rolling year), only where all four exist. */
function rollingYear(q: Pt[]): Pt[] {
  const by = new Map(q.map((p) => [Math.round(p.t * 4), p]));
  return q.flatMap((p) => {
    const k = Math.round(p.t * 4);
    const four = [k, k - 1, k - 2, k - 3].map((i) => by.get(i));
    if (four.some((x) => !x)) return [];
    return [{ t: p.t, v: four.reduce((s, x) => s + x!.v, 0) }];
  });
}

/** Bound cached payloads by domain, never by every place/period query combination. */
const HOUSING_CACHE_MS = 10 * 60 * 1000;
const housingCache = new Map<HousingScope, { at: number; data: HousingV1 }>();
const housingInflight = new Map<HousingScope, Promise<HousingV1>>();

export function loadHousing(scope: HousingScope = "all"): Promise<HousingV1> {
  const cached = housingCache.get(scope);
  if (cached && Date.now() - cached.at < HOUSING_CACHE_MS) return Promise.resolve(cached.data);
  const inflight = housingInflight.get(scope);
  if (inflight) return inflight;
  const job = buildHousing(scope).then(({ data, complete }) => {
    if (complete) housingCache.set(scope, { at: Date.now(), data });
    // Keep good data during a temporary API outage rather than replacing it with holes.
    return complete ? data : cached?.data ?? data;
  }).finally(() => housingInflight.delete(scope));
  housingInflight.set(scope, job);
  return job;
}

async function buildHousing(scope: HousingScope): Promise<{ data: HousingV1; complete: boolean }> {
  let complete = true;
  const scopedLoad = async (id: string, params: Record<string, string> = {}): Promise<SeriesLoad> => {
    if (!sourceAllowed(scope, id)) return null;
    const result = await loadSeries(id, params);
    if (!result) complete = false;
    return result;
  };
  const load = scopedLoad;
  const loadFiltered = scopedLoad;
  const loaded = await Promise.all([
    load("uk-average-house-price"),
    load("house-prices-by-region"),
    load("house-price-to-earnings-ratio"),
    load("private-rental-price-index"),
    // PIPR multi-measure pack — UK only for the explorer charts (map layer later).
    loadFiltered("private-rental-prices", { geography_code: "K02000001" }),
    load("housing-completions"),
    load("dwelling-stock-by-tenure"),
    load("uk-hpi-measures"),
    load("green-belt-area"),
    load("land-use-stock"),
    load("planning-decisions-granted"),
    load("brownfield-land"),
    load("cpi-index"),
    load("rent-to-earnings-ratio"),
    load("housing-purchase-affordability"),
    load("mortgage-rate-2yr-fixed"),
    // England time series only — full LA vacant rows exceed the API 10k cap.
    loadFiltered("vacant-dwellings", { geography_code: "E92000001" }),
    load("second-homes"),
    load("dwelling-stock-by-region"),
    // All-dwellings tenure only — fits the 10k observation cap.
    loadFiltered("dwelling-stock-by-district", { demographic: "all-dwellings" }),
    load("dwelling-type"),
    load("net-additional-dwellings"),
    load("housing-starts"),
    load("net-additions-by-authority"),
    load("affordable-housing-supply"),
    load("ehs-decent-homes"),
    load("ehs-category-1-hazards"),
    load("ehs-damp-surveyor"),
    load("ehs-energy-efficiency-bands"),
    load("ehs-heating"),
    load("ehs-insulation"),
    load("ehs-energy-improvement"),
    loadFiltered("statutory-homelessness-assessments", { geography_code: "E92000001" }),
    loadFiltered("homelessness-prevention-outcomes", { geography_code: "E92000001" }),
    loadFiltered("homelessness-relief-outcomes", { geography_code: "E92000001" }),
    loadFiltered("homelessness-main-duty", { geography_code: "E92000001" }),
    loadFiltered("temporary-accommodation-households", {
      geography_code: "E92000001",
      series: "households-total",
    }),
    loadFiltered("temporary-accommodation-households", { geography_code: "E92000001" }),
    loadFiltered("temporary-accommodation-children", {
      geography_code: "E92000001",
      series: "children-total",
    }),
    loadFiltered("temporary-accommodation-by-type", { geography_code: "E92000001" }),
    // Full TA4/TA7 pack: England band matrix + LA mean/median days by type (~4k rows).
    load("temporary-accommodation-duration"),
    loadFiltered("temporary-accommodation-households", { series: "households-per-thousand" }),
    load("temporary-accommodation-out-of-area"),
    loadFiltered("rough-sleeping-snapshot", { geography_code: "E92000001" }),
    loadFiltered("rough-sleeping-snapshot", { series: "autumn-single-night" }),
    loadFiltered("social-housing-waiting-list", { geography_code: "E92000001" }),
    loadFiltered("social-housing-lettings", {
      geography_code: "E92000001",
      series: "lettings-total",
    }),
    load("possession-claims"),
    loadFiltered("concealed-households", { geography_code: "E92000001" }),
    loadFiltered("homelessness-support-needs", { geography_code: "E92000001" }),
    loadFiltered("homelessness-priority-need", { geography_code: "E92000001" }),
    load("homelessness-devolved-ta"),
    loadFiltered("temporary-accommodation-spend", { geography_code: "E92000001" }),
    loadFiltered("rough-sleeping-framework", {
      geography_code: "E92000001",
      series: "people-over-the-month",
    }),
    // Domain 08 place record: LA TA households + children stock (31 Mar 2026), all CORE lettings rows.
    loadFiltered("temporary-accommodation-households", { series: "households-total" }),
    loadFiltered("temporary-accommodation-children", { series: "children-total" }),
    loadFiltered("social-housing-lettings", { geography_code: "E92000001" }),
    // Domain 08 pathway by place: H-CLIC A1 / P1 / R1 / MD1, regions + authorities, latest quarter.
    load("statutory-homelessness-assessments"),
    load("homelessness-prevention-outcomes"),
    load("homelessness-relief-outcomes"),
    load("homelessness-main-duty"),
    load("mortgage-approvals"),
    load("residential-mortgage-book"),
    load("household-net-property-wealth"),
  ]);
  const [
    price,
    regional,
    afford,
    rentLegacy,
    rentUk,
    completions,
    stock,
    hpi,
    greenBelt,
    landUse,
    planning,
    brownfield,
    cpiIndex,
    rentBurden,
    purchaseAfford,
    mortgageRate,
    vacantsEngland,
    secondHomes,
    stockRegion,
    stockDistrict,
    dwellingType,
    netAdditions,
    housingStarts,
    netAdditionsLA,
    affordableSupply,
    ehsDecent,
    ehsHazards,
    ehsDamp,
    ehsEnergy,
    ehsHeating,
    ehsInsulation,
    ehsImprovement,
    hclicAssess,
    hclicPrev,
    hclicRelief,
    hclicMain,
    taHhEng,
    taHhAll,
    taChildEng,
    taByType,
    taDuration,
    taRates,
    taOutOfArea,
    roughEng,
    roughRegions,
    waitingEng,
    lettings,
    possession,
    concealed,
    supportNeeds,
    priorityNeed,
    devolvedTa,
    taSpend,
    roughMonth,
    taHhPlaces,
    taChildPlaces,
    lettingsAll,
    hclicAssessAll,
    hclicPrevAll,
    hclicReliefAll,
    hclicMainAll,
    mortgageApprovals,
    mortgageBook,
    propertyWealth,
  ] = loaded;

  const sources: Record<string, Source> = {};
  for (const x of [
    price,
    regional,
    hpi,
    rentUk,
    rentLegacy,
    afford,
    rentBurden,
    purchaseAfford,
    mortgageRate,
    mortgageApprovals,
    mortgageBook,
    propertyWealth,
    completions,
    stock,
    greenBelt,
    landUse,
    planning,
    brownfield,
    cpiIndex,
    vacantsEngland,
    secondHomes,
    stockRegion,
    stockDistrict,
    dwellingType,
    netAdditions,
    housingStarts,
    netAdditionsLA,
    affordableSupply,
    ehsDecent,
    ehsHazards,
    ehsDamp,
    ehsEnergy,
    ehsHeating,
    ehsInsulation,
    ehsImprovement,
    hclicAssess,
    hclicPrev,
    hclicRelief,
    hclicMain,
    taHhEng,
    taHhAll,
    taChildEng,
    taByType,
    taDuration,
    taRates,
    taOutOfArea,
    roughEng,
    waitingEng,
    lettings,
    possession,
    concealed,
    supportNeeds,
    priorityNeed,
    devolvedTa,
    taSpend,
    roughMonth,
  ]) {
    if (x) sources[x.meta.indicator_id] = source(x.meta, x.rows);
  }

  const ehsHousingCostsByAge = scope === "all" || scope === "affordability" ? loadEhsHousingCostsByAge() : null;
  const ehsMortgageByAge = scope === "all" || scope === "affordability" ? loadEhsMortgageByAge() : null;
  if (ehsHousingCostsByAge) {
    const cells = ehsHousingCostsByAge.cohorts.reduce((sum, cohort) => sum + cohort.rows.length, 0);
    sources["ehs-housing-costs-by-age"] = {
      id: "ehs-housing-costs-by-age",
      title: ehsHousingCostsByAge.title,
      publisher: ehsHousingCostsByAge.publisher,
      seriesId: ehsHousingCostsByAge.series,
      unit: ehsHousingCostsByAge.unit,
      geography: ehsHousingCostsByAge.geography,
      frequency: "annual",
      sourceUrl: ehsHousingCostsByAge.url,
      release: ehsHousingCostsByAge.release,
      first: ehsHousingCostsByAge.earlierYear,
      last: ehsHousingCostsByAge.latestYear,
      count: cells,
      caveats: ehsHousingCostsByAge.note,
      href: ehsHousingCostsByAge.url,
    };
  }
  if (ehsMortgageByAge) {
    const latest = ehsMortgageByAge.years.at(-1)?.year ?? "";
    const first = ehsMortgageByAge.years[0]?.year ?? "";
    sources["ehs-mortgage-by-age"] = {
      id: "ehs-mortgage-by-age",
      title: ehsMortgageByAge.title,
      publisher: ehsMortgageByAge.publisher,
      seriesId: ehsMortgageByAge.series,
      unit: ehsMortgageByAge.unit,
      geography: ehsMortgageByAge.geography,
      frequency: "annual",
      sourceUrl: ehsMortgageByAge.url,
      release: latest,
      first,
      last: latest,
      count: ehsMortgageByAge.years.reduce((sum, year) => sum + year.rows.length, 0),
      caveats: ehsMortgageByAge.note,
      href: ehsMortgageByAge.url,
    };
  }

  // Regions: monthly from Jan 1995, the first month every nation/region is present.
  const AGG = new Set(["K02000001", "E92000001"]);
  const regionMap = new Map<string, { name: string; rows: Observation[] }>();
  const ukRows: Observation[] = [];
  for (const r of regional?.rows ?? []) {
    if (r.geography_code === "K02000001") ukRows.push(r);
    if (AGG.has(r.geography_code)) continue;
    if (!regionMap.has(r.geography_code)) regionMap.set(r.geography_code, { name: r.geography_label.replace(" Region", ""), rows: [] });
    regionMap.get(r.geography_code)!.rows.push(r);
  }
  const regions = [...regionMap.entries()]
    .map(([code, v]) => ({ code, name: v.name, points: toPts(v.rows).filter((p) => p.t >= 1995) }))
    .sort((a, b) => (b.points.at(-1)?.v ?? 0) - (a.points.at(-1)?.v ?? 0));

  // Hero ridges: quarterly samples (Jan/Apr/Jul/Oct), highest-priced region at the back.
  const qTimes = (regions[0]?.points ?? []).filter((p) => Math.round(p.t * 12) % 3 === 0).map((p) => p.t);
  const ridgeValues = regions.map((r) => {
    const by = new Map(r.points.map((p) => [Math.round(p.t * 12), p.v]));
    return qTimes.map((t) => by.get(Math.round(t * 12)) ?? 0);
  });

  // Tenure: England, 31 March snapshot; complete years only.
  const snap = (r: Observation) => /snapshot=31 March/.test(r.notes ?? "");
  const byYear = new Map<number, Record<string, number>>();
  for (const r of (stock?.rows ?? []).filter((r) => r.value !== null && snap(r))) {
    const y = Number(r.period_start.slice(0, 4));
    byYear.set(y, { ...(byYear.get(y) ?? {}), [r.dimensions?.demographic ?? ""]: r.value as number });
  }
  const years = [...byYear.keys()]
    .sort((a, b) => a - b)
    .filter((y) => {
      const v = byYear.get(y)!;
      return v["owner-occupied"] && v["private-rented"] && v["local-authority"] && v["private-registered-provider"];
    });
  const social = (v: Record<string, number>) => (v["local-authority"] ?? 0) + (v["private-registered-provider"] ?? 0) + (v["other-public-sector"] ?? 0);
  const allDwellings = [...byYear.entries()]
    .filter(([, v]) => v["all-dwellings"])
    .map(([y, v]) => ({ t: y, v: v["all-dwellings"]! }))
    .sort((a, b) => a.t - b.t);

  const dimSeries = (r: Observation) =>
    r.dimensions?.series || /series=([^;]+)/.exec(r.notes ?? "")?.[1] || "";
  const dimDemo = (r: Observation) =>
    r.dimensions?.demographic ||
    /demographic=([^;]+)/.exec(r.notes ?? "")?.[1] ||
    /tenure=([^;]+)/.exec(r.notes ?? "")?.[1] ||
    "";

  const vacantEng = vacantsEngland?.rows ?? [];
  const vacancyAll = toPts(vacantEng.filter((r) => dimSeries(r) === "all-vacants"));
  const vacancyLong = toPts(vacantEng.filter((r) => dimSeries(r) === "long-term-vacants"));
  const stockByYear = new Map(allDwellings.map((p) => [Math.floor(p.t + 1e-6), p.v]));
  const vacancyRateEngland = vacancyAll.flatMap((p) => {
    const stock = stockByYear.get(Math.floor(p.t + 1e-6));
    if (!stock || stock <= 0) return [];
    return [{ t: p.t, v: (p.v / stock) * 100 }];
  });
  // Regional vacant ranks need a slim atlas (LA rows exceed the API cap) — Gate 2 is England-first.
  const vacancyRegionAll: { id: string; label: string; v: number }[] = [];

  // Regional tenure (Table 109) — every 31 March year with a regional owner-occupied count.
  const regionRows = (stockRegion?.rows ?? []).filter((r) => r.value !== null);
  const regionYears = [...new Set(regionRows.map((r) => Number(r.period_start.slice(0, 4))))].sort(
    (a, b) => a - b,
  );
  type RegionBucket = { label: string; owner: number; privateRented: number; social: number; total: number };
  const placesForYear = (year: number) => {
    const bucket = new Map<string, RegionBucket>();
    for (const r of regionRows) {
      if (Number(r.period_start.slice(0, 4)) !== year) continue;
      const tenure = dimDemo(r);
      const cur = bucket.get(r.geography_code) ?? {
        label: r.geography_label,
        owner: 0,
        privateRented: 0,
        social: 0,
        total: 0,
      };
      const v = r.value as number;
      if (tenure === "owner-occupied") cur.owner = v;
      else if (tenure === "private-rented") cur.privateRented = v;
      else if (
        tenure === "local-authority" ||
        tenure === "private-registered-provider" ||
        tenure === "other-public-sector"
      ) {
        cur.social += v;
      } else if (tenure === "all-dwellings") cur.total = v;
      bucket.set(r.geography_code, cur);
    }
    const regions = [...bucket.entries()]
      .filter(([code]) => code.startsWith("E12"))
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total);
    return { year, england: bucket.get("E92000001") ?? null, regions };
  };
  const stockGeoByYear = regionYears
    .map(placesForYear)
    .filter((pack) => pack.regions.some((r) => r.owner > 0));

  const districtAll = (stockDistrict?.rows ?? []).filter(
    (r) =>
      r.value !== null &&
      dimDemo(r) === "all-dwellings" &&
      /^(E06|E07|E08|E09)/.test(r.geography_code),
  );
  const districtLatestPeriod = districtAll.map((r) => r.period_start).sort().at(-1) ?? "";
  const districtYear = districtLatestPeriod ? Number(districtLatestPeriod.slice(0, 4)) : null;
  const districtTotals = districtAll
    .filter((r) => r.period_start === districtLatestPeriod)
    .map((r) => ({
      id: r.geography_code,
      label: r.geography_label.replace(/ UA$/, ""),
      v: r.value as number,
    }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 15);

  const TYPE_PARTS: [string, string][] = [
    ["detached", "Detached"],
    ["semi-detached", "Semi-detached"],
    ["terraced", "Terraced"],
    ["purpose-built-flat", "Purpose-built flat"],
    ["converted-or-shared", "Converted / shared"],
    ["converted-other-building", "Other converted"],
    ["commercial-building", "Commercial building"],
    ["caravan-or-temporary", "Caravan / temporary"],
  ];
  const OTHER_IDS = new Set([
    "converted-or-shared",
    "converted-other-building",
    "commercial-building",
    "caravan-or-temporary",
  ]);
  const typeByGeo = new Map<string, { label: string; rows: Observation[] }>();
  for (const r of dwellingType?.rows ?? []) {
    if (r.value === null) continue;
    if (!typeByGeo.has(r.geography_code)) {
      typeByGeo.set(r.geography_code, { label: r.geography_label, rows: [] });
    }
    typeByGeo.get(r.geography_code)!.rows.push(r);
  }
  const dwellingTypePlaces = [...typeByGeo.entries()]
    .filter(([code]) => code === "E92000001" || code.startsWith("E12"))
    .map(([id, pack]) => {
      const byDemo = new Map(
        pack.rows.map((r) => [dimDemo(r), r.value as number] as const),
      );
      const main = TYPE_PARTS.filter(([k]) => !OTHER_IDS.has(k)).map(([k, label]) => ({
        id: k,
        label,
        count: byDemo.get(k) ?? 0,
      }));
      const otherCount = [...OTHER_IDS].reduce((s, k) => s + (byDemo.get(k) ?? 0), 0);
      const parts = [...main, { id: "other", label: "Other", count: otherCount }].filter(
        (p) => p.count > 0,
      );
      return {
        id,
        label: pack.label,
        total: byDemo.get("all-households") ?? parts.reduce((s, p) => s + p.count, 0),
        parts,
      };
    })
    .sort((a, b) => {
      if (a.id === "E92000001") return -1;
      if (b.id === "E92000001") return 1;
      return a.label.localeCompare(b.label);
    });

  const hpiRows = hpi?.rows ?? [];
  const rentRows = rentUk?.rows ?? [];
  const allProperty = (r: Observation) =>
    (r.dimensions?.series === "average-rent" || /series=average-rent/.test(r.notes ?? "")) &&
    !(r.dimensions?.category || /kind=/.test(r.notes ?? ""));
  const rentAverage = toPts(rentRows.filter(allProperty));
  const rentChangePts = toPts(
    rentRows.filter((r) => r.dimensions?.series === "annual-change" || /series=annual-change/.test(r.notes ?? "")),
  );
  const rentIndexPts = toPts(
    rentRows.filter((r) => r.dimensions?.series === "index" || /series=index/.test(r.notes ?? "")),
  );
  // Fallback to legacy UK-only index indicator if the pack is offline.
  const rentIndex = rentIndexPts.length > 0 ? rentIndexPts : toPts(rentLegacy?.rows ?? []);
  const rentChange = rentChangePts.length > 0 ? rentChangePts : annualChange(rentIndex);
  const rentKind = (r: Observation) => r.dimensions?.category || /kind=([^;]+)/.exec(r.notes ?? "")?.[1] || "";
  const isAverageRent = (r: Observation) =>
    r.dimensions?.series === "average-rent" || /series=average-rent/.test(r.notes ?? "");
  const linesFor = (prefix: string): Line[] => {
    const ids = [...new Set(rentRows.map(rentKind).filter((id) => id.startsWith(prefix)))].sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true }),
    );
    return ids.flatMap((id) => {
      const points = toPts(rentRows.filter((r) => isAverageRent(r) && rentKind(r) === id));
      return points.length ? [{ id, label: categoryLabel(id), points }] : [];
    });
  };
  const rentBedrooms = linesFor("bedrooms-");
  const rentPropertyTypes = linesFor("type-");
  const completionRows = completions?.rows ?? [];
  const startRows = housingStarts?.rows ?? [];
  const completionsQ = toPts(
    completionRows.filter((r) => {
      const s = dimSeries(r);
      return s === "all-completions" || s === "" || s.includes("All Completions");
    }),
  );
  const startsQ = toPts(startRows.filter((r) => dimSeries(r) === "all-starts"));

  const TENURE_LINES: [string, string][] = [
    ["private-enterprise", "Private enterprise"],
    ["housing-association", "Housing association"],
    ["local-authority", "Local authority"],
  ];
  const whoBuildsCompletions: Line[] = TENURE_LINES.map(([id, label]) => ({
    id,
    label,
    points: toPts(completionRows.filter((r) => dimSeries(r) === id)),
  }));
  const whoBuildsStarts: Line[] = TENURE_LINES.map(([id, label]) => ({
    id,
    label,
    points: toPts(startRows.filter((r) => dimSeries(r) === id)),
  }));

  const dimCategory = (r: Observation) =>
    r.dimensions?.category || /category=([^;]+)/.exec(r.notes ?? "")?.[1] || "";
  const AFFORDABLE_LINES: [string, string][] = [
    ["social-rent", "Social rent"],
    ["london-affordable-rent", "London affordable rent"],
    ["affordable-rent", "Affordable rent"],
    ["intermediate-rent", "Intermediate rent"],
    ["shared-ownership", "Shared ownership"],
    ["affordable-home-ownership", "Affordable home ownership"],
    ["first-homes", "First Homes"],
  ];
  const affordableRows = (affordableSupply?.rows ?? []).filter((r) => dimCategory(r) === "completions");
  const whoBuildsAffordable: Line[] = AFFORDABLE_LINES.map(([id, label]) => ({
    id,
    label,
    points: toPts(affordableRows.filter((r) => dimSeries(r) === id)),
  }));
  const affordableTotal = toPts(affordableRows.filter((r) => dimSeries(r) === "all-affordable"));

  // Domain 05 — England net additions components (aligned financial years).
  const netRowsEng = (netAdditions?.rows ?? []).filter((r) => r.geography_code === "E92000001" && r.value !== null);
  const netBySeries = (slug: string) =>
    toPts(netRowsEng.filter((r) => dimSeries(r) === slug));
  const netPts = netBySeries("net-additions");
  const newBuildPts = netBySeries("new-build");
  const convPts = netBySeries("net-conversions");
  const couPts = netBySeries("net-change-of-use");
  const otherPts = netBySeries("net-other-gains");
  const demoPts = netBySeries("demolitions");
  const supplyYears = netPts.map((p) => p.t);
  const atT = (pts: Pt[], t: number) => pts.find((p) => Math.abs(p.t - t) < 1e-6)?.v ?? null;
  const supplyNet = {
    years: supplyYears,
    net: supplyYears.map((t) => atT(netPts, t) ?? 0),
    newBuild: supplyYears.map((t) => atT(newBuildPts, t) ?? 0),
    conversions: supplyYears.map((t) => atT(convPts, t) ?? 0),
    changeOfUse: supplyYears.map((t) => atT(couPts, t) ?? 0),
    otherGains: supplyYears.map((t) => atT(otherPts, t) ?? 0),
    demolitions: supplyYears.map((t) => atT(demoPts, t) ?? 0),
  };

  // Domain 05 — Supply Machine ledger: every LT118 term per place and year, nulls kept (no zero-fill).
  const supplyMachine = (() => {
    const fields: Record<string, keyof SupplyLedgerYear> = {
      "net-additions": "net",
      "new-build": "newBuild",
      "net-conversions": "conversions",
      "net-change-of-use": "changeOfUse",
      "net-other-gains": "otherGains",
      demolitions: "demolitions",
      "census-adjustment": "census",
      residual: "residual",
    };
    const stockAt = new Map<string, number>();
    for (const r of stockRegion?.rows ?? []) {
      if (r.value === null || dimDemo(r) !== "all-dwellings") continue;
      stockAt.set(`${r.geography_code}|${r.period_start.slice(0, 4)}`, r.value);
    }
    const ledger = new Map<string, Map<number, SupplyLedgerYear>>();
    const labels = new Map<string, string>();
    for (const r of netAdditions?.rows ?? []) {
      const field = fields[dimSeries(r)];
      if (!field || r.value === null) continue;
      const code = r.geography_code;
      labels.set(code, r.geography_label);
      const y = Number(r.period_start.slice(0, 4));
      const byYear = ledger.get(code) ?? new Map<number, SupplyLedgerYear>();
      ledger.set(code, byYear);
      const row: SupplyLedgerYear = byYear.get(y) ?? {
        t: toT(r.period_start),
        fy: `${y}–${String((y + 1) % 100).padStart(2, "0")}`,
        status: "final",
        net: null,
        newBuild: null,
        conversions: null,
        changeOfUse: null,
        otherGains: null,
        demolitions: null,
        census: null,
        censusLabel: null,
        residual: null,
        stockOpen: stockAt.get(`${code}|${y}`) ?? null,
        stockClose: stockAt.get(`${code}|${y + 1}`) ?? null,
        notes: [],
      };
      byYear.set(y, row);
      (row as Record<string, unknown>)[field] = r.value;
      if (field === "census") row.censusLabel = /component=([^;]+)/.exec(r.notes ?? "")?.[1]?.trim() ?? "Adjustment to Census";
      if (r.observation_status === "provisional") row.status = "provisional";
      for (const n of /table_notes=(.*)$/.exec(r.notes ?? "")?.[1]?.match(/\[[^\]]+\]/g) ?? []) {
        if (n !== "[p]" && !row.notes.includes(n)) row.notes.push(n);
      }
    }
    const byPlace: Record<string, SupplyLedgerYear[]> = {};
    for (const [code, byYear] of ledger) {
      // Components were first collected in 2006–07 (LT118 note 5): keep years where all five are published.
      byPlace[code] = [...byYear.values()]
        .filter((y) => [y.net, y.newBuild, y.conversions, y.changeOfUse, y.otherGains, y.demolitions].every((v) => v !== null))
        .sort((a, b) => a.t - b.t);
    }
    const order = (c: string) => (c === "E92000001" ? "0" : c);
    const places = [...labels.entries()]
      .filter(([code]) => (byPlace[code]?.length ?? 0) > 0)
      .sort((a, b) => order(a[0]).localeCompare(order(b[0])))
      .map(([code, label]) => ({ code, label }));
    const release = (netAdditions?.rows ?? []).find((r) => r.source_version)?.source_version ?? "";
    return { places, byPlace, release };
  })();

  const latestNetT = supplyYears[supplyYears.length - 1];
  const fyFromT = (t: number | undefined) => {
    if (t == null) return null;
    const start = Math.floor(t + 1e-6);
    return `${start}–${String((start + 1) % 100).padStart(2, "0")}`;
  };
  const netRegionLatest = (netAdditions?.rows ?? [])
    .filter(
      (r) =>
        dimSeries(r) === "net-additions" &&
        r.geography_code.startsWith("E12") &&
        r.value !== null &&
        latestNetT != null &&
        Math.abs(toT(r.period_start) - latestNetT) < 1e-6,
    )
    .map((r) => ({
      id: r.geography_code,
      label: r.geography_label,
      v: r.value as number,
      shareOfEngland: supplyNet.net[supplyNet.net.length - 1]
        ? (r.value as number) / supplyNet.net[supplyNet.net.length - 1]!
        : 0,
    }))
    .sort((a, b) => b.v - a.v);

  // Districts only. E11 metropolitan counties (Greater Manchester, West Midlands) are
  // sums of the E08 districts inside them, so they must not share a rank.
  const isDistrict = (code: string) => /^E0[6789]/.test(code);
  const laRows = (netAdditionsLA?.rows ?? []).filter(
    (r) =>
      isDistrict(r.geography_code) &&
      r.value !== null &&
      latestNetT != null &&
      Math.abs(toT(r.period_start) - latestNetT) < 1e-6,
  );
  const laLatest = laRows
    .map((r) => ({ id: r.geography_code, label: r.geography_label, v: r.value as number }))
    .sort((a, b) => b.v - a.v);
  const supplyYearProvisional = [...(netAdditions?.rows ?? []), ...(netAdditionsLA?.rows ?? [])].some(
    (r) =>
      r.observation_status === "provisional" &&
      latestNetT != null &&
      Math.abs(toT(r.period_start) - latestNetT) < 1e-6,
  );

  const supplyGeography = {
    yearLabel: fyFromT(latestNetT),
    provisional: supplyYearProvisional,
    england: supplyNet.net.length ? supplyNet.net[supplyNet.net.length - 1]! : null,
    regions: netRegionLatest,
    authorities: laLatest.slice(0, 40),
  };
  const pricePts = toPts(price?.rows ?? []);
  const cpiPts = toPts(cpiIndex?.rows ?? []);
  const newExisting: Line[] = [
    { id: "new-build", label: "New build", points: toPts(seriesRows(hpiRows, "new-build")) },
    { id: "existing", label: "Existing homes", points: toPts(seriesRows(hpiRows, "existing")) },
  ];
  const firstTimeBuyer = toPts(seriesRows(hpiRows, "first-time-buyer"));
  const cashMortgage: Line[] = [
    { id: "cash", label: "Cash", points: toPts(seriesRows(hpiRows, "cash")) },
    { id: "mortgage", label: "Mortgage", points: toPts(seriesRows(hpiRows, "mortgage")) },
  ];

  // Green Belt: England totals only (LA snapshot stays on the data record / later atlas layer).
  const greenBeltEngland = toPts(
    (greenBelt?.rows ?? []).filter(
      (r) =>
        r.geography_code === "E92000001" &&
        (r.dimensions?.series === "england-total" || /series=england-total/.test(r.notes ?? "")),
    ),
  );

  // Land use: England 2022 shares (one point per series). Measure lives in notes, not typed dims.
  const LAND_SHARE: [string, string][] = [
    ["developed", "Developed"],
    ["non-developed", "Non-developed"],
    ["agriculture", "Agriculture"],
    ["forestry-open-land-water", "Forestry, open land & water"],
    ["residential-gardens", "Residential gardens"],
  ];
  const landUseShares: Line[] = LAND_SHARE.map(([id, label]) => {
    const row = (landUse?.rows ?? []).find((r) => {
      const series = r.dimensions?.series || (/series=([^;]+)/.exec(r.notes ?? "")?.[1] ?? "");
      return series === id && /measure=share/.test(r.notes ?? "") && r.value !== null;
    });
    return { id, label, points: row ? [{ t: toT(row.period_start), v: row.value as number }] : [] };
  });

  const emptyPaid: HousingV1["pricePaid"] = {
    available: false,
    year: null,
    count: 0,
    publisher: "",
    series: "",
    release: "",
    geography: "",
    url: "",
  };
  let pricePaid = emptyPaid;
  try {
    if (scope === "all" || scope === "prices") {
    const res = await fetch(`${apiBase()}/housing/price-paid/meta`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (res.ok) {
      const meta = (await res.json()) as {
        count?: number;
        year?: number;
        available?: boolean;
        publisher?: string;
        series?: string;
        release?: string;
        geography?: string;
        url?: string;
      };
      pricePaid = {
        available: meta.available === true,
        year: typeof meta.year === "number" ? meta.year : null,
        count: Number(meta.count) || 0,
        publisher: meta.publisher ?? "",
        series: meta.series ?? "",
        release: meta.release ?? "",
        geography: meta.geography ?? "",
        url: meta.url ?? "",
      };
    }
    }
  } catch {
    pricePaid = emptyPaid;
  }

  const purchaseRows = purchaseAfford?.rows ?? [];
  const medianHousehold = purchaseRows.filter(
    (r) =>
      (r.dimensions?.series || /series=([^;]+)/.exec(r.notes ?? "")?.[1] || "") === "median-household",
  );
  const byGeo = new Map<string, { label: string; rows: Observation[] }>();
  for (const r of medianHousehold) {
    if (!byGeo.has(r.geography_code)) {
      byGeo.set(r.geography_code, { label: r.geography_label, rows: [] });
    }
    byGeo.get(r.geography_code)!.rows.push(r);
  }
  // Prefer England first, then regions by latest ratio (hardest first).
  const purchaseAffordRegions: Line[] = [...byGeo.entries()]
    .map(([code, v]) => ({ id: code, label: v.label, points: toPts(v.rows) }))
    .sort((a, b) => {
      if (a.id === "E92000001") return -1;
      if (b.id === "E92000001") return 1;
      return (b.points.at(-1)?.v ?? 0) - (a.points.at(-1)?.v ?? 0);
    });

  const PCT_LABEL: Record<string, string> = {
    p10: "10th",
    p20: "20th",
    p30: "30th",
    p40: "40th",
    p50: "50th",
    p60: "60th",
    p70: "70th",
    p80: "80th",
    p90: "90th",
  };
  const purchaseAffordGrid = purchaseRows
    .filter((r) => (r.dimensions?.series || /series=([^;]+)/.exec(r.notes ?? "")?.[1] || "") === "decile-grid")
    .flatMap((r) => {
      if (r.value === null) return [];
      const income =
        r.dimensions?.demographic?.replace(/^income-/, "") ||
        /demographic=income-([^;]+)/.exec(r.notes ?? "")?.[1] ||
        "";
      const price =
        r.dimensions?.category?.replace(/^price-/, "") ||
        /category=price-([^;]+)/.exec(r.notes ?? "")?.[1] ||
        "";
      if (!income || !price) return [];
      return [{ income: PCT_LABEL[income] ?? income, price: PCT_LABEL[price] ?? price, value: r.value }];
    });

  const data: HousingV1 = {
    sources,
    price: pricePts,
    types: [
      ["detached", "Detached"],
      ["semi-detached", "Semi-detached"],
      ["terraced", "Terraced"],
      ["flat", "Flat or maisonette"],
    ].map(([id, label]) => ({ id: id!, label: label!, points: toPts(seriesRows(hpiRows, id!)) })),
    newExisting,
    firstTimeBuyer,
    cashMortgage,
    priceReal: realPrices(pricePts, cpiPts),
    sales: toPts(seriesRows(hpiRows, "sales-volume")),
    regions,
    ukRegional: toPts(ukRows).filter((p) => p.t >= 1995),
    rentAverage,
    rentChange,
    rentIndex,
    rentBedrooms,
    rentPropertyTypes,
    afford: toPts(afford?.rows ?? []),
    rentToEarnings: toPts(rentBurden?.rows ?? []),
    purchaseAffordRegions,
    purchaseAffordGrid,
    ehsHousingCostsByAge,
    ehsMortgageByAge,
    mortgageRate: toPts(mortgageRate?.rows ?? []),
    completions: completionsQ,
    completionsYear: rollingYear(completionsQ),
    tenure: {
      years,
      owner: years.map((y) => byYear.get(y)!["owner-occupied"]!),
      privateRented: years.map((y) => byYear.get(y)!["private-rented"]!),
      social: years.map((y) => social(byYear.get(y)!)),
      total: years.map((y) => byYear.get(y)!["all-dwellings"] ?? 0),
    },
    allDwellings,
    vacancy: {
      all: vacancyAll,
      longTerm: vacancyLong,
      rateEngland: vacancyRateEngland,
      regionAll: vacancyRegionAll,
    },
    secondHomes: {
      total: toPts((secondHomes?.rows ?? []).filter((r) => dimSeries(r) === "total")),
      noDiscountOrPremium: toPts(
        (secondHomes?.rows ?? []).filter((r) => dimSeries(r) === "no-discount-or-premium"),
      ),
      subjectToDiscount: toPts(
        (secondHomes?.rows ?? []).filter((r) => dimSeries(r) === "subject-to-discount"),
      ),
      chargedPremium: toPts(
        (secondHomes?.rows ?? []).filter((r) => dimSeries(r) === "charged-premium"),
      ),
    },
    stockGeography: {
      years: stockGeoByYear.map((pack) => pack.year),
      byYear: stockGeoByYear,
      districtYear,
      districtTotals,
    },
    dwellingTypes: { places: dwellingTypePlaces },
    ridges: {
      names: regions.map((r) => r.name),
      quarters: qTimes.map((t) => `${Math.floor(t)}-${String(Math.round((t % 1) * 12) + 1).padStart(2, "0")}`),
      values: ridgeValues,
    },
    greenBelt: greenBeltEngland,
    landUseShares,
    planningGranted: toPts(
      (planning?.rows ?? []).filter((r) => dimSeries(r) === "decisions-granted" || !dimSeries(r)),
    ),
    planningFlow: {
      received: toPts(
        (planning?.rows ?? []).filter((r) => dimSeries(r) === "applications-received"),
      ),
      decided: toPts(
        (planning?.rows ?? []).filter((r) => dimSeries(r) === "applications-decided"),
      ),
      granted: toPts(
        (planning?.rows ?? []).filter((r) => dimSeries(r) === "decisions-granted" || !dimSeries(r)),
      ),
    },
    brownfield: (() => {
      const rows = brownfield?.rows ?? [];
      const eng = (series: string) =>
        rows.find(
          (r) =>
            r.geography_code === "E92000001" &&
            dimSeries(r) === series &&
            r.value !== null &&
            !/permission-status=/.test(r.notes ?? ""),
        );
      const site = eng("site-count");
      const ha = eng("hectares-total");
      const dwell = eng("max-net-dwellings");
      const byPermission = rows
        .filter(
          (r) =>
            r.geography_code === "E92000001" &&
            dimSeries(r) === "site-count-by-permission" &&
            r.value !== null,
        )
        .map((r) => ({
          id: /permission-status=([^;]+)/.exec(r.notes ?? "")?.[1] ?? "unknown",
          v: r.value as number,
        }));
      const authorities = rows
        .filter(
          (r) =>
            dimSeries(r) === "site-count-by-authority" &&
            r.geography_code.startsWith("PD-LA-") &&
            r.value !== null,
        )
        .map((r) => ({
          id: r.geography_code,
          label: r.geography_label,
          v: r.value as number,
          hectares: Number(/hectares=([0-9.]+)/.exec(r.notes ?? "")?.[1] ?? 0),
        }))
        .sort((a, b) => b.v - a.v);
      return {
        asAt: site ? toT(site.period_start) : null,
        siteCount: site?.value ?? null,
        hectares: ha?.value ?? null,
        maxDwellings: dwell?.value ?? null,
        sitesWithEstimate: (() => {
          const raw = /sites-with-estimate=(\d+)/.exec(dwell?.notes ?? "")?.[1];
          return raw == null ? null : Number(raw);
        })(),
        byPermission,
        authorities,
      };
    })(),
    pricePaid,
    supplyNet,
    supplyMachine,
    supplyGeography,
    whoBuilds: {
      completions: whoBuildsCompletions,
      starts: whoBuildsStarts,
      affordable: whoBuildsAffordable,
      affordableTotal,
    },
    starts: startsQ,
    quality: (() => {
      const dimTenure = (r: Observation) =>
        r.dimensions?.demographic ||
        /tenure=([^;]+)/.exec(r.notes ?? "")?.[1] ||
        "";
      // Headline rows only: England, no archetype / region / floor-area breakdown.
      // (EHS tables now also carry breakdown=dwelling-age|dwelling-type|region|… rows.)
      const isHeadline = (r: Observation) => {
        const b = /breakdown=([^;]+)/.exec(r.notes ?? "")?.[1]?.trim();
        return (!b || b === "none") && (!r.geography_code || r.geography_code === "E92000001");
      };
      const byTenure = (
        pack: { rows: Observation[] } | null | undefined,
        seriesFilter?: (r: Observation) => boolean,
      ) => {
        const rows = (pack?.rows ?? []).filter(
          (r) => r.value !== null && isHeadline(r) && (!seriesFilter || seriesFilter(r)),
        );
        const tenures = [...new Set(rows.map(dimTenure).filter(Boolean))].sort();
        return tenures.map((tenure) => ({
          tenure,
          points: toPts(rows.filter((r) => dimTenure(r) === tenure)),
        }));
      };
      const withSocialAlias = (lines: { tenure: string; points: Pt[] }[]) => {
        if (lines.some((l) => l.tenure === "social-rented")) return lines;
        const social = lines.filter((l) => l.tenure === "all-social");
        return social.length
          ? [...lines, ...social.map((l) => ({ tenure: "social-rented", points: l.points }))]
          : lines;
      };
      const headlineSeries = (id: string) => (r: Observation) => {
        const sr = dimSeries(r);
        return !sr || sr === id;
      };
      const decentHomes = withSocialAlias(byTenure(ehsDecent, headlineSeries("non-decent")));
      const category1 = withSocialAlias(byTenure(ehsHazards, headlineSeries("any-category-1-hazard")));
      const damp = withSocialAlias(byTenure(ehsDamp, headlineSeries("any-damp")));
      const energyAbc = withSocialAlias(
        byTenure(ehsEnergy, (r) => dimSeries(r) === "band-a-b-c"),
      );
      const bandIds = [
        "band-a-b",
        "band-c",
        "band-d",
        "band-e",
        "band-f",
        "band-g",
        "band-e-f-g",
        "band-a-b-c",
      ];
      const energyBands: Record<string, { tenure: string; points: Pt[] }[]> = {};
      for (const id of bandIds) {
        energyBands[id] = byTenure(ehsEnergy, (r) => dimSeries(r) === id);
      }
      const heating = {
        central: withSocialAlias(
          byTenure(ehsHeating, (r) => dimSeries(r) === "central-heating"),
        ),
        condensing: withSocialAlias(
          byTenure(ehsHeating, (r) => dimSeries(r) === "condensing-boiler"),
        ),
        room: withSocialAlias(
          byTenure(ehsHeating, (r) => dimSeries(r) === "room-heater"),
        ),
      };
      const insulation = {
        wall: withSocialAlias(
          byTenure(ehsInsulation, (r) => dimSeries(r) === "wall-insulation"),
        ),
        loft200: byTenure(ehsInsulation, (r) => dimSeries(r) === "loft-200mm-plus"),
        glazing: withSocialAlias(
          byTenure(ehsInsulation, (r) => dimSeries(r) === "full-double-glazing"),
        ),
      };
      const improvement = {
        improvable: byTenure(
          ehsImprovement,
          (r) => dimSeries(r) === "improvable-to-band-c",
        ),
        alreadyC: byTenure(
          ehsImprovement,
          (r) => dimSeries(r) === "already-band-c-or-above",
        ),
        meanCost: withSocialAlias(
          byTenure(ehsImprovement, (r) => dimSeries(r) === "mean-cost-to-band-c"),
        ),
      };
      const yearSet = new Set<number>();
      const energyYearSet = new Set<number>();
      for (const block of [decentHomes, category1, damp, energyAbc]) {
        for (const line of block) {
          for (const p of line.points) yearSet.add(Math.floor(p.t + 1e-6));
        }
      }
      for (const block of [
        energyAbc,
        heating.central,
        heating.condensing,
        insulation.wall,
        insulation.loft200,
        insulation.glazing,
      ]) {
        for (const line of block) {
          for (const p of line.points) {
            const y = Math.floor(p.t + 1e-6);
            yearSet.add(y);
            energyYearSet.add(y);
          }
        }
      }
      return {
        years: [...yearSet].sort((a, b) => a - b),
        energyYears: [...energyYearSet].sort((a, b) => a - b),
        decentHomes,
        category1,
        damp,
        energyAbc,
        energyBands,
        heating,
        insulation,
        improvement,
      };
    })(),
    insecurity: (() => {
      const seriesPts = (pack: { rows: Observation[] } | null | undefined, series: string) =>
        toPts((pack?.rows ?? []).filter((r) => dimSeries(r) === series));
      const last = (p: Pt[]) => (p.length ? p[p.length - 1]!.v : null);
      const TYPE_LABEL: Record<string, string> = {
        "bb-shared-annexes": "B&B / shared annexes",
        "nightly-paid-privately-managed": "Nightly paid / privately managed",
        hostels: "Hostels",
        "private-sector-leased": "Private sector leased",
        "la-ha-stock": "LA / HA stock",
        "other-temporary": "Other temporary",
      };
      const taByTypeLines: Line[] = Object.entries(TYPE_LABEL).map(([id, label]) => ({
        id,
        label,
        points: seriesPts(taByType, id),
      }));
      const BAND_LABEL: Record<string, string> = {
        "all-types-under-6-months": "Under 6 months",
        "all-types-6-months-to-1-year": "6 months to 1 year",
        "all-types-1-to-2-years": "1 to 2 years",
        "all-types-2-to-5-years": "2 to 5 years",
        "all-types-5-or-more-years": "5 or more years",
      };
      const taDurationBands = Object.entries(BAND_LABEL).flatMap(([id, label]) => {
        const row = (taDuration?.rows ?? []).find(
          (r) => r.geography_code === "E92000001" && dimSeries(r) === id && r.value !== null,
        );
        return row ? [{ id, label, v: row.value as number }] : [];
      });
      const taRatesRows = (taRates?.rows ?? [])
        .filter((r) => {
          if (r.value === null) return false;
          const c = r.geography_code;
          return c.startsWith("E06") || c.startsWith("E07") || c.startsWith("E08") || c.startsWith("E09");
        })
        .map((r) => ({ id: r.geography_code, label: r.geography_label, v: r.value as number }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 40);
      const taOutRows = (taOutOfArea?.rows ?? [])
        .filter((r) => r.value !== null && r.geography_code !== "E92000001")
        .map((r) => ({ id: r.geography_code, label: r.geography_label, v: r.value as number }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 40);
      const roughRegionLatest = (roughRegions?.rows ?? [])
        .filter(
          (r) =>
            r.value !== null &&
            r.geography_code.startsWith("E12") &&
            r.period_start.startsWith("2025"),
        )
        .map((r) => ({ id: r.geography_code, label: r.geography_label, v: r.value as number }))
        .sort((a, b) => b.v - a.v);
      const assessmentsOwed = seriesPts(hclicAssess, "owed-prevention-or-relief");
      const assessmentsTotal = seriesPts(hclicAssess, "initial-assessments-total");
      const preventionEnded = seriesPts(hclicPrev, "prevention-duty-ended-total");
      const preventionSecured = seriesPts(hclicPrev, "secured-accommodation");
      const reliefEnded = seriesPts(hclicRelief, "relief-duty-ended-total");
      const reliefSecured = seriesPts(hclicRelief, "secured-accommodation-6-months");
      const mainDutyAccepted = seriesPts(hclicMain, "priority-need-unintentionally-homeless");
      const preventionOwed = seriesPts(hclicAssess, "prevention-duty-owed");
      const reliefOwed = seriesPts(hclicAssess, "relief-duty-owed");
      const relief56Days = seriesPts(hclicRelief, "56-days-elapsed");
      const mainDutyTotal = seriesPts(hclicMain, "main-duty-decisions-total");
      const mainDutyIntentional = seriesPts(hclicMain, "priority-need-intentionally-homeless");
      const mainDutyNoPriority = seriesPts(hclicMain, "homeless-no-priority-need");
      const mainDutyNotHomeless = seriesPts(hclicMain, "not-homeless");
      const taWithChildren = seriesPts(taHhAll, "households-with-children");

      // TA4 matrix (England). Six types sum to all-ta-total in the publisher table.
      const DUR_TYPES: [string, string][] = [
        ["nightly-paid", "Nightly paid, privately managed"],
        ["la-ha-stock", "Local authority / housing association stock"],
        ["private-sector", "Private sector accommodation"],
        ["bb", "Bed and breakfast"],
        ["hostels", "Hostels"],
        ["other", "Other"],
      ];
      const DUR_BANDS: [string, string][] = [
        ["under-6-months", "Under 6 months"],
        ["6-months-to-1-year", "6 months to 1 year"],
        ["1-to-2-years", "1 to 2 years"],
        ["2-to-5-years", "2 to 5 years"],
        ["5-or-more-years", "5 years or more"],
      ];
      const durEng = (taDuration?.rows ?? []).filter((r) => r.geography_code === "E92000001" && r.value !== null);
      const durVal = (key: string) => (durEng.find((r) => dimSeries(r) === key)?.value as number | undefined) ?? null;
      const taDurationMatrix = [["all-types", "All accommodation types"] as [string, string], ...DUR_TYPES].flatMap(
        ([id, label]) => {
          const bands = DUR_BANDS.flatMap(([b, bl]) => {
            const v = durVal(`${id}-${b}`);
            return v == null ? [] : [{ id: b, label: bl, v }];
          });
          const total = id === "all-types" ? durVal("all-ta-total") : durVal(`${id}-total`);
          return bands.length === DUR_BANDS.length && total != null ? [{ id, label, total, bands }] : [];
        },
      );

      // LA place record — latest stock date only.
      const LA = (c: string) => /^E0[6789]/.test(c);
      const latestBy = (rows: Observation[] | undefined) => {
        const m = new Map<string, { name: string; v: number | null; p: string }>();
        for (const r of rows ?? []) {
          if (!LA(r.geography_code)) continue;
          const cur = m.get(r.geography_code);
          if (!cur || r.period_start > cur.p) m.set(r.geography_code, { name: r.geography_label, v: r.value, p: r.period_start });
        }
        return m;
      };
      const hhBy = latestBy(taHhPlaces?.rows);
      const chBy = latestBy(taChildPlaces?.rows);
      const rateBy = latestBy(taRates?.rows);
      const outBy = latestBy(taOutOfArea?.rows);
      const DAY_TYPES: [string, string][] = [
        ["nightly-paid-privately-managed-accommoda", "Nightly paid"],
        ["la-ha-stock", "LA / HA stock"],
        ["private-sector-accommodation", "Private sector"],
        ["b-b-or-shared-annex", "B&B / shared annex"],
        ["hostel-or-refuge", "Hostel or refuge"],
        ["own-arrangements", "Own arrangements"],
        ["other-or-not-known", "Other or not known"],
      ];
      const daysBy = new Map<string, Map<string, number>>();
      for (const r of taDuration?.rows ?? []) {
        if (!LA(r.geography_code) || r.value === null) continue;
        const m = daysBy.get(r.geography_code) ?? new Map<string, number>();
        m.set(dimSeries(r), r.value);
        daysBy.set(r.geography_code, m);
      }
      const taPlaces = [...new Set([...hhBy.keys(), ...rateBy.keys(), ...outBy.keys()])]
        .map((code) => {
          const d = daysBy.get(code);
          return {
            code,
            name: hhBy.get(code)?.name ?? rateBy.get(code)?.name ?? outBy.get(code)?.name ?? code,
            households: hhBy.get(code)?.v ?? null,
            children: chBy.get(code)?.v ?? null,
            rate: rateBy.get(code)?.v ?? null,
            outOfArea: outBy.get(code)?.v ?? null,
            days: DAY_TYPES.map(([id, label]) => ({
              id,
              label,
              mean: d?.get(`${id}-mean-days`) ?? null,
              median: d?.get(`${id}-median-days`) ?? null,
            })),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      // Pathway by place: latest quarter of each H-CLIC table, regions + authorities.
      const PATH_SERIES: [Observation[] | undefined, string, PathwayKey][] = [
        [hclicAssessAll?.rows, "initial-assessments-total", "assessmentsTotal"],
        [hclicAssessAll?.rows, "owed-prevention-or-relief", "assessmentsOwed"],
        [hclicAssessAll?.rows, "prevention-duty-owed", "preventionOwed"],
        [hclicAssessAll?.rows, "relief-duty-owed", "reliefOwed"],
        [hclicPrevAll?.rows, "prevention-duty-ended-total", "preventionEnded"],
        [hclicPrevAll?.rows, "secured-accommodation", "preventionSecured"],
        [hclicReliefAll?.rows, "relief-duty-ended-total", "reliefEnded"],
        [hclicReliefAll?.rows, "secured-accommodation-6-months", "reliefSecured"],
        [hclicReliefAll?.rows, "56-days-elapsed", "relief56Days"],
        [hclicMainAll?.rows, "main-duty-decisions-total", "mainDutyTotal"],
        [hclicMainAll?.rows, "priority-need-unintentionally-homeless", "mainDutyAccepted"],
        [hclicMainAll?.rows, "priority-need-intentionally-homeless", "mainDutyIntentional"],
        [hclicMainAll?.rows, "homeless-no-priority-need", "mainDutyNoPriority"],
        [hclicMainAll?.rows, "not-homeless", "mainDutyNotHomeless"],
      ];
      const isPlace = (c: string) => /^E(0[6789]|12)/.test(c);
      const placeRec = new Map<string, HousingV1["insecurity"]["pathwayPlaces"][number]>();
      const pathwayPlaces: HousingV1["insecurity"]["pathwayPlaces"] = [];
      for (const [rows, series, key] of PATH_SERIES) {
        const sub = (rows ?? []).filter((r) => isPlace(r.geography_code) && dimSeries(r) === series);
        const latestP = sub.reduce((m, r) => (r.period_start > m ? r.period_start : m), "");
        for (const r of sub) {
          if (r.period_start !== latestP) continue;
          let rec = placeRec.get(r.geography_code);
          if (!rec) {
            rec = {
              code: r.geography_code,
              name: r.geography_label,
              kind: r.geography_code.startsWith("E12") ? "region" : "local",
              period: r.period_start,
              v: {},
              ta: null,
            };
            placeRec.set(r.geography_code, rec);
            pathwayPlaces.push(rec);
          }
          rec.v[key] = r.value;
        }
      }
      const taLatest = new Map<string, { p: string; v: number | null }>();
      for (const r of taHhPlaces?.rows ?? []) {
        if (!isPlace(r.geography_code)) continue;
        const cur = taLatest.get(r.geography_code);
        if (!cur || r.period_start > cur.p) taLatest.set(r.geography_code, { p: r.period_start, v: r.value });
      }
      for (const rec of pathwayPlaces) rec.ta = taLatest.get(rec.code)?.v ?? null;
      pathwayPlaces.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "region" ? -1 : 1));

      // CORE lettings by rent type (SR / AR / IR) and needs type (GN / SH), England.
      const letBy = new Map<number, Record<string, number>>();
      for (const r of lettingsAll?.rows ?? []) {
        if (r.value === null) continue;
        const t = Number(r.period_start.slice(0, 4));
        letBy.set(t, { ...(letBy.get(t) ?? {}), [dimSeries(r)]: r.value });
      }
      const sumOf = (rec: Record<string, number>, re: RegExp) =>
        Object.entries(rec).reduce((acc, [k, v]) => (re.test(k) ? acc + v : acc), 0);
      const lettingsBreakdown = [...letBy.entries()]
        .flatMap(([t, rec]) => {
          const total = rec["lettings-total"];
          if (total == null || total <= 0) return [];
          const social = sumOf(rec, /^sr-/);
          const affordable = sumOf(rec, /^ar-/);
          const intermediate = sumOf(rec, /^ir-/);
          // Only keep years where the published parts reconcile to the published total.
          if (Math.abs(social + affordable + intermediate - total) > 1) return [];
          return [
            {
              t,
              total,
              social,
              affordable,
              intermediate,
              generalNeeds: sumOf(rec, /-general-needs-/),
              supported: sumOf(rec, /-supported-housing-/),
            },
          ];
        })
        .sort((a, b) => a.t - b.t);
      const taHouseholds = toPts(taHhEng?.rows ?? []);
      const taChildren = toPts(taChildEng?.rows ?? []);
      const roughSleeping = toPts(roughEng?.rows ?? []);
      const waitingList = toPts(waitingEng?.rows ?? []);
      const lettingsPts = toPts(lettings?.rows ?? []);
      const possessionMortgageClaims = seriesPts(possession, "mortgage-claims");
      const possessionLandlordClaims = seriesPts(possession, "landlord-claims");
      const possessionLandlordOrders = seriesPts(possession, "landlord-orders-total");
      const possessionLandlordWarrants = seriesPts(possession, "landlord-warrants");
      const possessionLandlordRepossessions = seriesPts(possession, "landlord-bailiff-repossessions");
      const supportNeedsSeries = seriesPts(supportNeeds, "one-or-more-support-needs");
      const COMP_LABEL: Record<string, string> = {
        "with-dependent-children": "With dependent children",
        "one-adult-with-children": "One adult with children",
        "two-adults-with-children": "Two adults with children",
        "adult-only": "Adult only",
      };
      const taHouseholdComposition = Object.entries(COMP_LABEL).flatMap(([id, label]) => {
        const pts = seriesPts(taHhAll, id);
        const v = last(pts);
        return v != null ? [{ id, label, v }] : [];
      });
      const concealedTotal = last(seriesPts(concealed, "concealed-families-total"));
      const supportOnePlus = last(seriesPts(supportNeeds, "one-or-more-support-needs"));
      const devolvedRows = (devolvedTa?.rows ?? [])
        .filter((r) => r.value !== null)
        .map((r) => ({
          id: r.geography_code,
          label: r.geography_label,
          v: r.value as number,
          period: r.period_start,
        }))
        .sort((a, b) => a.label.localeCompare(b.label) || b.period.localeCompare(a.period));
      // Keep latest per nation for the Data panel.
      const devolvedLatest: typeof devolvedRows = [];
      for (const row of devolvedRows) {
        if (!devolvedLatest.some((d) => d.id === row.id)) devolvedLatest.push(row);
      }
      return {
        assessmentsOwed,
        assessmentsTotal,
        preventionEnded,
        preventionSecured,
        reliefEnded,
        reliefSecured,
        mainDutyAccepted,
        preventionOwed,
        reliefOwed,
        relief56Days,
        mainDutyTotal,
        mainDutyIntentional,
        mainDutyNoPriority,
        mainDutyNotHomeless,
        taHouseholds,
        taChildren,
        taWithChildren,
        taDurationMatrix,
        taDurationDate: durEng[0]?.period_start ?? "",
        taPlaces,
        pathwayPlaces,
        lettingsBreakdown,
        taByType: taByTypeLines,
        taDurationBands,
        taHouseholdComposition,
        taRates: taRatesRows,
        taOutOfArea: taOutRows,
        roughSleeping,
        roughSleepingRegions: roughRegionLatest,
        waitingList,
        lettings: lettingsPts,
        possessionMortgageClaims,
        possessionLandlordClaims,
        possessionLandlordOrders,
        possessionLandlordWarrants,
        possessionLandlordRepossessions,
        supportNeedsSeries,
        devolvedTa: devolvedLatest,
        headlines: {
          taHouseholds: last(taHouseholds),
          taChildren: last(taChildren),
          assessmentsOwed: last(assessmentsOwed),
          roughSleeping: last(roughSleeping),
          waitingList: last(waitingList),
          lettings: last(lettingsPts),
          concealedFamilies: concealedTotal,
          supportNeeds: supportOnePlus,
          mortgageClaims: last(possessionMortgageClaims),
          landlordClaims: last(possessionLandlordClaims),
          homelessnessSpendNet: last(
            seriesPts(taSpend, "homelessness-total-net"),
          ),
          roughSleepingMonth: last(toPts(roughMonth?.rows ?? [])),
          outOfAreaEngland: last(toPts((taOutOfArea?.rows ?? []).filter((r) => r.geography_code === "E92000001"))),
        },
      };
    })(),
    ownership: (() => {
      const seriesPts = (pack: { rows: Observation[] } | null | undefined, series: string) =>
        toPts((pack?.rows ?? []).filter((r) => dimSeries(r) === series));
      const lastValue = (points: Pt[]) => (points.length ? points[points.length - 1]!.v : null);
      const share = (series: string, label: string) => {
        const points = seriesPts(mortgageBook, series);
        const v = lastValue(points);
        return v == null ? [] : [{ id: series, label, v }];
      };
      const housePurchaseApprovals = seriesPts(mortgageApprovals, "house-purchase-approvals");
      const remortgageApprovals = seriesPts(mortgageApprovals, "remortgage-approvals");
      const balancesOutstanding = seriesPts(mortgageBook, "balances-outstanding");
      const grossAdvances = seriesPts(mortgageBook, "gross-advances");
      const newCommitments = seriesPts(mortgageBook, "new-commitments");
      const arrearsBalances = seriesPts(mortgageBook, "arrears-balances");
      const bandOf = (row: Observation) =>
        row.dimensions?.category || /band=([^;]+)/.exec(row.notes ?? "")?.[1] || "";
      const wealthRows = propertyWealth?.rows ?? [];
      const ages: { id: string; label: string }[] = [
        { id: "age-under-16", label: "Under 16" },
        { id: "age-16-24", label: "16–24" },
        { id: "age-25-34", label: "25–34" },
        { id: "age-35-44", label: "35–44" },
        { id: "age-45-54", label: "45–54" },
        { id: "age-55-64", label: "55–64" },
        { id: "age-65-plus", label: "65 and over" },
        { id: "age-all-persons", label: "All people" },
      ];
      const bands: { id: string; label: string }[] = [
        { id: "do-not-own", label: "Do not own" },
        { id: "under-50", label: "Under £50,000" },
        { id: "50-to-125", label: "£50,000 to £125,000" },
        { id: "125-to-250", label: "£125,000 to £250,000" },
        { id: "250-to-375", label: "£250,000 to £375,000" },
        { id: "375-to-500", label: "£375,000 to £500,000" },
        { id: "500-or-more", label: "£500,000 or more" },
      ];
      const medianAllHouseholds = seriesPts(propertyWealth, "median-all-households");
      return {
        housePurchaseApprovals,
        remortgageApprovals,
        netSecuredLending: seriesPts(mortgageApprovals, "net-secured-lending"),
        grossSecuredLending: seriesPts(mortgageApprovals, "gross-secured-lending"),
        balancesOutstanding,
        grossAdvances,
        newCommitments,
        arrearsBalances,
        advanceShares: [
          ...share("house-purchase-share-of-advances", "House purchase"),
          ...share("first-time-buyer-share-of-advances", "Of which first-time buyers"),
          ...share("buy-to-let-share-of-advances", "Buy to let"),
          ...share("remortgage-share-of-advances", "Remortgage"),
        ],
        ltvShares: [
          ...share("ltv-up-to-75-share", "Up to 75%"),
          ...share("ltv-75-to-90-share", "75% to 90%"),
          ...share("ltv-90-to-95-share", "90% to 95%"),
          ...share("ltv-over-95-share", "Over 95%"),
        ],
        p25AllHouseholds: seriesPts(propertyWealth, "p25-all-households"),
        medianAllHouseholds,
        p75AllHouseholds: seriesPts(propertyWealth, "p75-all-households"),
        aggregateNet: seriesPts(propertyWealth, "aggregate-net"),
        ageDistribution: ages.map((age) => ({
          id: age.id,
          label: age.label,
          bands: bands.flatMap((band) => {
            const row = wealthRows.find(
              (item) => dimSeries(item) === age.id && bandOf(item) === band.id && item.value != null,
            );
            return row?.value == null ? [] : [{ id: band.id, label: band.label, v: row.value }];
          }),
        })),
        headlines: {
          housePurchaseApprovals: lastValue(housePurchaseApprovals),
          remortgageApprovals: lastValue(remortgageApprovals),
          balancesOutstanding: lastValue(balancesOutstanding),
          grossAdvances: lastValue(grossAdvances),
          newCommitments: lastValue(newCommitments),
          arrearsBalances: lastValue(arrearsBalances),
          buyToLetShare: lastValue(seriesPts(mortgageBook, "buy-to-let-share-of-advances")),
          medianNetPropertyWealth: lastValue(medianAllHouseholds),
        },
      };
    })(),
  };
  return { data, complete };
}

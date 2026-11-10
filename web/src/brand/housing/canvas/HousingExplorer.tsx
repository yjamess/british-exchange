"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Explorer,
  ExplorerHead,
  FigureStrip,
  ControlRow,
  MenuControl,
  MultiMenuControl,
  PeriodControl,
  ResetButton,
  SearchControl,
  Stage,
  EmptyStage,
  FigureRecord,
  SourceLine,
  DataTable,
  REF_ICON_PLATES,
  explorerClasses,
  type ExplorerDomain,
  type PrintOption,
  type SourceRow,
} from "../..";
import {
  ArrivalFrom,
  FollowStep,
  buildArrivalContext,
  primaryHousingConnection,
  readArrival,
  resolveHousingConnectionHref,
} from "../../connections";
import type { HousingV1, Source } from "../load";
import { apiBase } from "@/lib/api";
import { PricePaidSearch } from "./PricePaidSearch";
import { PricesData, pricesDataFoot, pricesTransactionsFoot } from "./PricesData";
import { PricesMapStage, type PricesMapPayload } from "./PricesMapStage";
import {
  AffordabilityExperiment,
  experimentFoot,
  parseScenarioParams,
  scenarioToQuery,
} from "./affordability/AffordabilityExperiment";
import { WhoCanAfford, householdsFoot } from "./affordability/WhoCanAfford";
import { AgesView, AGES_BREAKDOWN_OPTIONS, agesFoot } from "./affordability/AgesView";
import { AffordabilityData, affordabilityDataFoot } from "./affordability/AffordabilityData";
import { normaliseScenario, scenarioDefaults } from "./affordability/scenario";
import {
  ChangingHousingFabric,
  fabricFoot,
  fabricYearOptions,
} from "./stock/ChangingHousingFabric";
import { TypesView, typesFoot, typesPlaceOptions } from "./stock/TypesView";
import {
  GeographyView,
  STOCK_GEO_MEASURE_OPTIONS,
  stockGeoYearOptions,
  stockGeographyFoot,
  type StockGeoMeasure,
} from "./stock/GeographyView";
import { VacancyView, vacancyFoot } from "./stock/VacancyView";
import { TenureView, tenureFoot } from "./stock/TenureView";
import { StockData, stockDataFoot } from "./stock/StockData";
import {
  SupplyMachine,
  isTermId,
  MACHINE_PANEL_OPTIONS,
  supplyMachineFoot,
  supplyPlaceOptions,
  supplyVsOptions,
  supplyYearOptions,
  type MachinePanel,
  type SupplyMachineState,
} from "./supply/SupplyMachine";
import {
  SupplyGeography,
  GEOGRAPHY_MEASURE_OPTIONS,
  geographyFoot,
  isGeographyMeasure,
  type GeographyMeasure,
} from "./supply/SupplyGeography";
import {
  WhoBuilds,
  WHO_BUILDS_MEASURE_OPTIONS,
  whoBuildsFigures,
  whoBuildsFoot,
  type WhoBuildsMode,
} from "./supply/WhoBuilds";
import { SupplyData, supplyDataFoot } from "./supply/SupplyData";
import { LandData, landDataFoot } from "./land/LandData";
import {
  PlanningDecisionMachine,
  planningFoot,
  planningQuarterOptions,
  type StageId as PlanningStageId,
} from "./land/PlanningDecisionMachine";
import {
  DevelopmentSites,
  SITES_MEASURE_OPTIONS,
  sitesFoot,
  type SitesFocus,
} from "./land/DevelopmentSites";
import {
  GB_HISTORY_YEARS,
  gbYearLabel,
  HistoricalChange,
  GB_HISTORY_PLACE_NAMES,
  historyFoot,
  type GbHistoryYear,
} from "./land/HistoricalChange";
import { AppealsCasework, appealsFoot } from "./land/AppealsCasework";
import { LocalPlans, localPlansFigures, localPlansFoot } from "./land/LocalPlans";
import { InsideHomes, InsideHomesControls, insideHomesFoot } from "./quality/InsideHomes";
import { EnergyView, EnergyViewControls, energyViewFoot } from "./quality/EnergyView";
import { StateOfRepair, StateOfRepairControls, stateOfRepairFoot } from "./quality/StateOfRepair";
import { QualityGeography, QualityGeographyControls, qualityGeographyFoot } from "./quality/QualityGeography";
import { QualityData, QualityDataControls, qualityDataFoot } from "./quality/QualityData";
import { useQualityEvidence } from "./quality/cutaway/useEvidence";
import { ENGLAND as QUALITY_ENGLAND } from "./quality/cutaway/evidence";
import {
  parseConditionKind,
  parseEnergyCat,
  type ConditionState,
  type EnergyState,
  type GeographyState,
  type InsideState,
  type QualityDataState,
} from "./quality/state";
import { LandExplorer, explorerFoot } from "./land/LandExplorer";
import {
  Pathways,
  pathwayFoot,
  pathwayQuarterKeys,
  pathwayStageOptions,
  type PathwaysState,
} from "./insecurity/Pathways";
import {
  WHO_OWNS_OWNER_OPTIONS,
  WhoOwns,
  isOwner,
  whoOwnsFoot,
  type Owner,
} from "./ownership/WhoOwns";
import { MortgageMachine, mortgageFoot } from "./ownership/MortgageMachine";
import { UnavailableControl } from "./quality/parts";
import { PropertyWealth, wealthAgeOptions, wealthFoot } from "./ownership/PropertyWealth";
import { OwnershipData, ownershipDataFoot } from "./ownership/OwnershipData";
import { PolicyCanvas, PolicyControls, parsePolicyState, policyFigures, policyFootRows, type PolicyView } from "./policy/PolicyCanvas";
import { usePolicyData } from "./policy/usePolicyData";
import { TemporaryLife, temporaryFoot, temporaryTypeOptions } from "./insecurity/TemporaryLife";
import {
  Displacement,
  DISPLACEMENT_MEASURE_OPTIONS,
  displacementFoot,
  type DisplacementMode,
} from "./insecurity/Displacement";
import { keyParam, parseKeyParam, flowLabel, qKey } from "./insecurity/periods";
import { toT } from "../../data";
import { HousingNeed, needFoot, needYearOptions } from "./insecurity/HousingNeed";
import { CostOfInsecurity, costFoot, costYearOptions } from "./insecurity/CostOfInsecurity";
import {
  InsecurityData,
  insecurityDataFoot,
  insecurityDataOptions,
} from "./insecurity/InsecurityData";
import {
  LETTINGS_BREAKDOWN_OPTIONS,
  RentCanvas,
  lettingsFoot,
  rentDataFoot,
} from "./renting/RentCanvas";
import { MAX_RENT_PLACES, RENT_UK, applyWindow, categoryLabel, rentAreasParam } from "./renting/selection";
import { useRenting } from "./renting/useRenting";
import {
  DOMAINS,
  MAX_HISTORY_PLACES,
  ENGLAND_CODE,
  VIEWS,
  figuresFor,
  pricesMapReading,
  stageFor,
  yearOf,
  type Controls,
  type DomainId,
} from "./model";
import gen from "../../energy/generation.module.css";
import s from "./explorer.module.css";

/**
 * Housing explorer — the brand template's Explorer (web/src/brand/template) with Housing's data,
 * URL state and special stages (maps, Price Paid, affordability, stock).
 * Layout, rail, carriage, loupe, menus and dual scramble all come from the template.
 * Shareable URL: ?domain=&view=&place=&measure=&from=&to=&date=&area=&lad=
 * History `place` is comma-separated codes (uk,E12000007,…); Map keeps its own date/area/compare/type.
 * Affordability experiment: ?earn=&dep=&rate=&term=&lti=
 * Housing insecurity: Pathways ?place=&node=&q=2026Q1&read=table · Temporary ?ta= · Displacement ?area=&mode=share · Need ?yr= · Cost ?cy=
 */

const MEASURE_OPTIONS: PrintOption<Controls["measure"]>[] = [
  { value: "level", label: "Average price" },
  { value: "change", label: "Annual change" },
  { value: "real", label: "After inflation" },
];
const SEGMENT_OPTIONS: PrintOption<Controls["segment"]>[] = [
  { value: "new", label: "New vs existing" },
  { value: "ftb", label: "First-time buyer" },
  { value: "finance", label: "Cash vs mortgage" },
];

/* ——— Explorer ——— */

const DOMAIN_IDS = new Set<string>(DOMAINS.map((d) => d.id));
/** Housing domains in the template's shape: question + rail photo plate. */
const EXPLORER_DOMAINS: ExplorerDomain[] = DOMAINS.map((d) => ({
  id: d.id,
  title: d.title,
  short: d.short,
  question: d.question,
  plate: REF_ICON_PLATES[d.photo],
  status: d.status,
}));
const num = (v: string | null) => (v && /^\d{4}$/.test(v) ? Number(v) : null);

/** Parse History place layers from the URL. Default United Kingdom only. */
function parsePlaces(raw: string | null, regionCodes: Set<string>): string[] {
  const parts = (raw ?? "uk")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p === "uk" || regionCodes.has(p));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= MAX_HISTORY_PLACES) break;
  }
  return out.length > 0 ? out : ["uk"];
}

function placesParam(places: string[]): string | null {
  if (places.length === 1 && places[0] === "uk") return null;
  return places.join(",");
}

export function HousingExplorer({
  data,
  initialDomain = "prices",
  stageBar = "hairline",
  ground = "paper",
  pricesMap = null,
  rentMap = null,
  affordMap = null,
}: {
  data: HousingV1;
  initialDomain?: DomainId;
  /** Stage title bar: hairline on paper, or a solid ink block (the current thing is solid). */
  stageBar?: "hairline" | "solid";
  /** Canvas ground: plain paper, or a light dot field behind paper patches (light by density). */
  ground?: "paper" | "field";
  /** Atlas + boundaries for Domain 01 Map. */
  pricesMap?: PricesMapPayload | null;
  /** Atlas + boundaries for Domain 02 Renting Map. */
  rentMap?: PricesMapPayload | null;
  /** Atlas + boundaries for Domain 03 Affordability Map. */
  affordMap?: PricesMapPayload | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [condensed, setCondensed] = useState(false);
  /** Client-fetched map packs — avoids resending domain data when switching to Map. */
  const [clientMaps, setClientMaps] = useState<{
    prices: PricesMapPayload | null;
    rent: PricesMapPayload | null;
    afford: PricesMapPayload | null;
  }>({ prices: pricesMap, rent: rentMap, afford: affordMap });
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const mapFetchKey = useRef("");

  useEffect(() => {
    setClientMaps((cur) => ({
      prices: pricesMap ?? cur.prices,
      rent: rentMap ?? cur.rent,
      afford: affordMap ?? cur.afford,
    }));
  }, [pricesMap, rentMap, affordMap]);

  // URL is the state: every view is shareable.
  const rawDomain = searchParams.get("domain");
  const active: DomainId = rawDomain && DOMAIN_IDS.has(rawDomain) ? (rawDomain as DomainId) : initialDomain;
  const domain = DOMAINS.find((d) => d.id === active)!;
  const views = VIEWS[active] ?? [];
  const rawView = searchParams.get("view");
  const view = views.some((v) => v.id === rawView) ? rawView! : (views[0]?.id ?? "");
  const lettingsParam = searchParams.get("lettings");
  const lettingsView =
    lettingsParam === "needs" || lettingsParam === "data" || lettingsParam === "rent" ? lettingsParam : "history";
  const agesParam = searchParams.get("ages");
  const agesView =
    agesParam === "place" || agesParam === "mortgage" || agesParam === "data" ? agesParam : "share";
  // England is a place too: it sits beside the regions in every place menu.
  const regionCodes = useMemo(
    () => new Set([...(data.englandPrice.length ? [ENGLAND_CODE] : []), ...data.regions.map((r) => r.code)]),
    [data.regions, data.englandPrice],
  );
  const placeRaw = searchParams.get("place");
  const places = useMemo(() => parsePlaces(placeRaw, regionCodes), [placeRaw, regionCodes]);
  const rawMeasure = searchParams.get("measure");
  const measure: Controls["measure"] =
    rawMeasure === "change" ? "change" : rawMeasure === "real" ? "real" : "level";
  const rawSegment = searchParams.get("segment");
  const segment: Controls["segment"] =
    rawSegment === "ftb" ? "ftb" : rawSegment === "finance" ? "finance" : "new";
  const { evidence: qualityEvidence, failed: qualityFailed } = useQualityEvidence();
  const insideState = useMemo<InsideState>(
    () => ({
      feature: searchParams.get("qf") || "rating",
      archetype: searchParams.get("qarch") ?? "",
      area: searchParams.get("qar") || QUALITY_ENGLAND,
      tenure: searchParams.get("qt") || "all-tenures",
      year: num(searchParams.get("qy")),
    }),
    [searchParams],
  );
  const setInsideState = (next: Partial<InsideState>) =>
    setQuery({
      ...("feature" in next ? { qf: next.feature === "rating" ? null : (next.feature ?? null) } : {}),
      ...("archetype" in next ? { qarch: next.archetype || null } : {}),
      ...("area" in next ? { qar: next.area === QUALITY_ENGLAND || !next.area ? null : next.area } : {}),
      ...("tenure" in next ? { qt: next.tenure === "all-tenures" || !next.tenure ? null : next.tenure } : {}),
      ...("year" in next ? { qy: next.year != null ? String(next.year) : null } : {}),
    });
  const energyState = useMemo<EnergyState>(
    () => ({
      cat: parseEnergyCat(searchParams.get("qcat")),
      archetype: searchParams.get("qarch") ?? "",
      area: searchParams.get("qar") || QUALITY_ENGLAND,
      tenure: searchParams.get("qt") || "all-tenures",
      year: num(searchParams.get("qy")),
      focus: searchParams.get("qfocus"),
    }),
    [searchParams],
  );
  const setEnergyState = (next: Partial<EnergyState>) =>
    setQuery({
      ...("cat" in next ? { qcat: next.cat === "bands" || !next.cat ? null : next.cat } : {}),
      ...("archetype" in next ? { qarch: next.archetype || null } : {}),
      ...("area" in next ? { qar: next.area === QUALITY_ENGLAND || !next.area ? null : next.area } : {}),
      ...("tenure" in next ? { qt: next.tenure === "all-tenures" || !next.tenure ? null : next.tenure } : {}),
      ...("year" in next ? { qy: next.year != null ? String(next.year) : null } : {}),
      ...("focus" in next ? { qfocus: next.focus } : {}),
    });
  const conditionState = useMemo<ConditionState>(
    () => ({
      measure: searchParams.get("qm") || "ehs-decent-homes|non-decent",
      kind: parseConditionKind(searchParams.get("qk")),
      tenure: searchParams.get("qt") || "all-tenures",
      year: num(searchParams.get("qy")),
      col: searchParams.get("qcol"),
    }),
    [searchParams],
  );
  const setConditionState = (next: Partial<ConditionState>) =>
    setQuery({
      ...("measure" in next
        ? { qm: next.measure === "ehs-decent-homes|non-decent" || !next.measure ? null : next.measure }
        : {}),
      ...("kind" in next ? { qk: next.kind === "tenure" || !next.kind ? null : next.kind } : {}),
      ...("tenure" in next ? { qt: next.tenure === "all-tenures" || !next.tenure ? null : next.tenure } : {}),
      ...("year" in next ? { qy: next.year != null ? String(next.year) : null } : {}),
      ...("col" in next ? { qcol: next.col } : {}),
    });
  const geographyState = useMemo<GeographyState>(
    () => ({
      scale: searchParams.get("qscale") === "epc" ? "epc" : "survey",
      feature: searchParams.get("qf") || "fabric",
      tenure: searchParams.get("qt") || "all-tenures",
      year: num(searchParams.get("qy")),
      period: searchParams.get("qp"),
      picked: searchParams.get("qpick"),
    }),
    [searchParams],
  );
  const setGeographyState = (next: Partial<GeographyState>) =>
    setQuery({
      ...("scale" in next ? { qscale: next.scale === "epc" ? "epc" : null } : {}),
      ...("feature" in next ? { qf: next.feature === "fabric" || !next.feature ? null : next.feature } : {}),
      ...("tenure" in next ? { qt: next.tenure === "all-tenures" || !next.tenure ? null : next.tenure } : {}),
      ...("year" in next ? { qy: next.year != null ? String(next.year) : null } : {}),
      ...("period" in next ? { qp: next.period } : {}),
      ...("picked" in next ? { qpick: next.picked } : {}),
    });
  const qualityDataState = useMemo<QualityDataState>(
    () => ({
      indicator: searchParams.get("qi") ?? "",
      series: searchParams.get("qs"),
    }),
    [searchParams],
  );
  const setQualityDataState = (next: Partial<QualityDataState>) =>
    setQuery({
      ...("indicator" in next ? { qi: next.indicator || null } : {}),
      ...("series" in next ? { qs: next.series } : {}),
    });
  const qualityIndicator = qualityDataState.indicator;
  const controls = useMemo<Controls>(
    () => ({ places, measure, segment, qualityIndicator, supplyGeoYear: searchParams.get("gy") ?? undefined }),
    [places, measure, segment, qualityIndicator, searchParams],
  );
  const fromParam = num(searchParams.get("from"));
  const toParam = num(searchParams.get("to"));
  const mapDate = searchParams.get("date") ?? "";
  const mapArea = searchParams.get("area") ?? "";
  const ladRaw = searchParams.get("lad") ?? "";
  const lad = /^E0[6-9]\d{6}$/.test(ladRaw) ? ladRaw : "";
  const mapCompare = searchParams.get("compare") ?? "";
  const rawType = searchParams.get("type") ?? "";
  const mapHpi =
    rawType &&
    ["average", "detached", "semi-detached", "terraced", "flat", "new-build", "existing", "sales-volume"].includes(rawType)
      ? rawType
      : "average";

  /**
   * URL is the state, but most of it is client-only.
   *   - Map with no pack yet → history.replaceState + fetch `/api/housing/map-pack` (no RSC reload)
   *   - domain changes → router navigation to load that domain’s dependencies
   *   - controls within a domain → history.replaceState
   * Deep links with ?view=map still hydrate from the server pack when present.
   * Map HPI type changes stay on PricesMapStage via /api/housing/atlas.
   */
  const setQuery = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const url = `${pathname}?${params.toString()}`;
    const d = params.get("domain");
    const nextDomain: DomainId = d && DOMAIN_IDS.has(d) ? (d as DomainId) : initialDomain;
    const nextViews = VIEWS[nextDomain] ?? [];
    const v = params.get("view");
    const nextView = nextViews.some((x) => x.id === v) ? v : (nextViews[0]?.id ?? "");
    const packKey = nextDomain === "prices" ? "prices" : nextDomain === "renting" ? "rent" : nextDomain === "affordability" ? "afford" : null;
    const pack = packKey ? clientMaps[packKey] : null;
    if (nextDomain !== active) {
      router.push(url, { scroll: false });
      return;
    }
    window.history.replaceState(null, "", url);
    if (nextView === "map" && packKey && pack === null) {
      const type = params.get("type") ?? "average";
      const variant = packKey === "rent" ? "rent" : packKey === "afford" ? "afford" : "hpi";
      void fetchMapPack(packKey, variant, type);
    }
  };

  const fetchMapPack = async (key: "prices" | "rent" | "afford", variant: string, measure: string) => {
    const token = `${key}:${variant}:${measure}`;
    if (mapFetchKey.current === token) return;
    mapFetchKey.current = token;
    setMapLoading(true);
    setMapError("");
    try {
      const q = new URLSearchParams({ variant, measure });
      const res = await fetch(`/api/housing/map-pack?${q}`);
      if (!res.ok) throw new Error("Could not load the map. Try again.");
      const pack = (await res.json()) as PricesMapPayload;
      setClientMaps((cur) => ({ ...cur, [key]: pack }));
    } catch (e) {
      mapFetchKey.current = "";
      setMapError(e instanceof Error ? e.message : "Could not load the map.");
    } finally {
      setMapLoading(false);
    }
  };
  // Place and period persist across domains (each domain keeps what it can use); view-specific state resets.
  const selectDomain = (id: DomainId) =>
    setQuery({
      domain: id,
      view: null,
      measure: null,
      segment: null,
      vs: null,
      part: null,
      mode: null,
      type: null,
      date: null,
      area: null,
      compare: null,
      earn: null,
      dep: null,
      rate: null,
      term: null,
      lti: null,
      bench: null,
      node: null,
      q: null,
      read: null,
      ta: null,
      yr: null,
      scheme: null,
      layer: null,
      // These belong to one tab. A later domain must not inherit them.
      rent: null,
      bed: null,
      lettings: null,
      ages: null,
      own: null,
      wa: null,
      gy: null,
      // Arrival chip is for Follow hops — clear on a manual domain rail change.
      via: null,
      via_return: null,
    });

  const boeRate = data.mortgageRate[data.mortgageRate.length - 1]?.v ?? null;
  const scenarioBase = useMemo(() => scenarioDefaults({ boeRatePercent: boeRate }), [boeRate]);
  const scenarioInput = useMemo(
    () =>
      parseScenarioParams(
        {
          earn: searchParams.get("earn") ?? "",
          dep: searchParams.get("dep") ?? "",
          rate: searchParams.get("rate") ?? "",
          term: searchParams.get("term") ?? "",
          lti: searchParams.get("lti") ?? "",
        },
        scenarioBase,
      ),
    [searchParams, scenarioBase],
  );
  const rateSourceNote =
    boeRate != null
      ? `Starts at ${scenarioBase.annualRatePercent.toFixed(1)}%. Quoted two-year fixed rate for a 75% loan-to-value mortgage.`
      : null;
  // England by default: the Budget sets this price against England years of pay (AFF1).
  const defaultBench = data.englandPrice.length ? ENGLAND_CODE : "uk";
  const benchmarkCode = searchParams.get("bench") ?? defaultBench;
  const priceBenchmarks = useMemo(
    () => [
      { code: "uk", name: "United Kingdom", points: data.price },
      ...(data.englandPrice.length ? [{ code: ENGLAND_CODE, name: "England", points: data.englandPrice }] : []),
      ...[...data.regions]
        .sort((a, b) => a.name.localeCompare(b.name, "en-GB"))
        .map((place) => ({ code: place.code, name: place.name, points: place.points })),
    ],
    [data.price, data.regions, data.englandPrice],
  );
  // Keep History period and Map date/area/type when switching views — they are separate params.
  // On Renting, only the tab that owns `rent` may keep it. Data and Social rent clear it,
  // so a bedroom series cannot rename the next tab.
  const selectView = (id: string) => {
    if (active !== "renting") {
      setQuery({
        view: id,
        rent: null,
        bed: null,
        lettings: null,
        ...(active === "affordability" && id !== "ages" ? { ages: null } : {}),
        // Quality views share qf/qarch/qar/qt/qy but read them differently: a year or feature
        // picked on one view must not carry into the next (it also showed a false Reset).
        ...(active === "quality"
          ? { qf: null, qarch: null, qar: null, qt: null, qy: null, qp: null, qpick: null }
          : {}),
      });
      return;
    }
    const currentRent = searchParams.get("rent");
    const rent =
      id === "change" ? "annual-change"
      : id === "index" ? "index"
      : id === "bedrooms" ? "bedrooms"
      : id === "map" && currentRent === "annual-change" ? "annual-change"
      : null;
    setQuery({
      view: id,
      rent,
      ...(id === "tenancies" ? {} : { lettings: null }),
      ...(id === "table" ? { bed: null } : {}),
    });
  };

  // A shared or old link can still say rent=bedrooms on Data, Social rent, or the map.
  // Those tabs do not use that value, so drop it from the address.
  const droppedRent = useRef("");
  useEffect(() => {
    if (active !== "renting") return;
    const rent = searchParams.get("rent");
    if (!rent) return;
    const drop =
      view === "table" || view === "tenancies" || view === "monthly" || (view === "map" && rent !== "annual-change");
    const key = `${view}:${rent}`;
    if (!drop || droppedRent.current === key) return;
    droppedRent.current = key;
    setQuery({ rent: null });
  }, [active, view, searchParams]);

  const setPlaces = (next: string[]) => {
    const unique: string[] = [];
    for (const code of next) {
      if (code !== "uk" && !regionCodes.has(code)) continue;
      if (unique.includes(code)) continue;
      unique.push(code);
      if (unique.length >= MAX_HISTORY_PLACES) break;
    }
    setQuery({ place: placesParam(unique.length > 0 ? unique : ["uk"]) });
  };

  // Domain 05 Supply — Machine / Who builds / Geography controls in the URL.
  const supplyPanel: MachinePanel = searchParams.get("panel") === "ledger" ? "ledger" : "section";
  const whoBuildsMode: WhoBuildsMode =
    searchParams.get("wb") === "starts"
      ? "starts"
      : searchParams.get("wb") === "affordable"
        ? "affordable"
        : "completions";
  // Supply › Geography year (?gy=FY start year). Latest by default.
  const supplyGeoYear = data.supplyGeography.byYear[searchParams.get("gy") ?? ""]
    ? searchParams.get("gy")!
    : (data.supplyGeography.years[0]?.value ?? "");
  const supplyGeo = data.supplyGeography.byYear[supplyGeoYear] ?? data.supplyGeography;
  const geographyMeasure: GeographyMeasure = isGeographyMeasure(searchParams.get("gm"))
    ? (searchParams.get("gm") as GeographyMeasure)
    : "count";
  const supplyState = useMemo<SupplyMachineState>(() => {
    const known = data.supplyMachine.byPlace;
    const code = (placeRaw ?? "").split(",").map((p) => p.trim()).find((p) => p in known) ?? "E92000001";
    const vsRaw = num(searchParams.get("vs"));
    const partRaw = searchParams.get("part");
    return {
      place: code,
      year: toParam,
      vs: vsRaw,
      part: isTermId(partRaw) ? partRaw : null,
      panel: supplyPanel,
    };
  }, [data.supplyMachine.byPlace, placeRaw, toParam, searchParams, supplyPanel]);
  const setSupply = (next: Partial<SupplyMachineState>) =>
    setQuery({
      ...("place" in next ? { place: next.place === "E92000001" ? null : (next.place ?? null) } : {}),
      ...("year" in next ? { to: next.year != null ? String(next.year) : null, from: null } : {}),
      ...("vs" in next ? { vs: next.vs != null ? String(next.vs) : null } : {}),
      ...("part" in next ? { part: next.part ?? null } : {}),
      ...("panel" in next ? { panel: next.panel === "ledger" ? "ledger" : null } : {}),
    });
  const supplyPlaceOpts = useMemo(
    () => (active === "supply" ? supplyPlaceOptions(data.supplyMachine) : []),
    [active, data.supplyMachine],
  );
  const supplyYearOpts = useMemo(
    () => (active === "supply" ? supplyYearOptions(data.supplyMachine, supplyState.place) : []),
    [active, data.supplyMachine, supplyState.place],
  );
  const supplyVsOpts = useMemo(
    () => (active === "supply" ? supplyVsOptions(data.supplyMachine, supplyState.place, supplyState.year) : []),
    [active, data.supplyMachine, supplyState.place, supplyState.year],
  );
  const supplyFoot = useMemo(() => {
    if (active !== "supply") return null;
    if (view === "machine" || view === "") return supplyMachineFoot(data.supplyMachine, supplyState);
    if (view === "who-builds") return whoBuildsFoot(whoBuildsMode);
    if (view === "geography") return geographyFoot(supplyGeo, geographyMeasure);
    if (view === "table") return supplyDataFoot();
    return null;
  }, [active, view, data.supplyMachine, supplyGeo, supplyState, whoBuildsMode, geographyMeasure]);
  const qualityFoot = useMemo(() => {
    if (active !== "quality") return null;
    if (view === "inside" || view === "") return insideHomesFoot(insideState, qualityEvidence);
    if (view === "energy") return energyViewFoot(energyState, qualityEvidence);
    if (view === "condition") return stateOfRepairFoot(conditionState, qualityEvidence);
    if (view === "geography") return qualityGeographyFoot(geographyState, qualityEvidence);
    if (view === "table") return qualityDataFoot(qualityDataState, qualityEvidence);
    return null;
  }, [
    active,
    view,
    insideState,
    energyState,
    conditionState,
    geographyState,
    qualityDataState,
    qualityEvidence,
  ]);

  // Domain 04 Stock — year / place / measure in the URL.
  const stockYear = num(searchParams.get("sy"));
  const stockPlaceRaw = searchParams.get("sp");
  const stockPlace =
    stockPlaceRaw && data.dwellingTypes.places.some((p) => p.id === stockPlaceRaw)
      ? stockPlaceRaw
      : (data.dwellingTypes.places[0]?.id ?? null);
  const stockGeoMeasure: StockGeoMeasure =
    searchParams.get("sgm") === "private"
      ? "private"
      : searchParams.get("sgm") === "social"
        ? "social"
        : searchParams.get("sgm") === "total"
          ? "total"
          : "owner";
  const fabricYearOpts = useMemo(
    () => (active === "stock" ? fabricYearOptions(data.tenure) : []),
    [active, data.tenure],
  );
  const typesPlaceOpts = useMemo(
    () => (active === "stock" ? typesPlaceOptions(data.dwellingTypes) : []),
    [active, data.dwellingTypes],
  );
  const stockGeoYearOpts = useMemo(
    () => (active === "stock" ? stockGeoYearOptions(data.stockGeography) : []),
    [active, data.stockGeography],
  );
  const stockFoot = useMemo(() => {
    if (active !== "stock") return null;
    if (view === "composition" || view === "") return fabricFoot(data.tenure, stockYear);
    if (view === "types") return typesFoot(data.dwellingTypes, stockPlace);
    if (view === "geography") return stockGeographyFoot(data.stockGeography, stockGeoMeasure, stockYear);
    if (view === "vacancy") return vacancyFoot(data.vacancy, data.secondHomes);
    if (view === "tenure") return tenureFoot(data.tenure);
    if (view === "table") return stockDataFoot();
    return null;
  }, [active, view, data.tenure, data.dwellingTypes, data.stockGeography, data.vacancy, data.secondHomes, stockYear, stockPlace, stockGeoMeasure]);

  const affordFoot = useMemo(() => {
    if (active !== "affordability") return null;
    if (view === "experiment") {
      const bench = priceBenchmarks.find((p) => p.code === benchmarkCode) ?? priceBenchmarks[0];
      return experimentFoot({
        rateSourceNote,
        depositPercent: scenarioInput.depositPercent,
        benchmarkName: bench?.name,
      });
    }
    if (view === "ages") return agesFoot(agesView);
    if (view === "households") return householdsFoot(data.purchaseAffordRegions, data.purchaseAffordGrid);
    if (view === "table") return affordabilityDataFoot();
    return null;
  }, [
    active,
    view,
    priceBenchmarks,
    benchmarkCode,
    rateSourceNote,
    scenarioInput.depositPercent,
    agesView,
    data.purchaseAffordRegions,
    data.purchaseAffordGrid,
  ]);

  // Domain 09 Who owns — owner (?own=overseas) and the shared map ?area= in the URL.
  const rawOwner = searchParams.get("own");
  const titleOwner: Owner = isOwner(rawOwner) ? rawOwner : "uk";
  const [whoOwnsSearch, setWhoOwnsSearch] = useState("");
  const [supplyGeoSearch, setSupplyGeoSearch] = useState("");

  // Domain 08 Housing insecurity — view state in the URL so every reading is shareable.
  const pathwaysState = useMemo<PathwaysState>(
    () => ({
      node: searchParams.get("node"),
      q: parseKeyParam(searchParams.get("q")),
      read: searchParams.get("read") === "table" ? "table" : "diagram",
      // Shared `place` param (first code); unknown codes fall back to England.
      place:
        (placeRaw ?? "")
          .split(",")
          .map((p) => p.trim())
          .find((p) => data.insecurity.pathwayPlaces.some((x) => x.code === p)) ?? null,
    }),
    [searchParams, placeRaw, data.insecurity.pathwayPlaces],
  );
  const setPathways = (next: Partial<PathwaysState>) =>
    setQuery({
      ...("node" in next ? { node: next.node ?? null } : {}),
      ...("q" in next ? { q: next.q != null ? keyParam(next.q) : null } : {}),
      ...("read" in next ? { read: next.read === "table" ? "table" : null } : {}),
      ...("place" in next ? { place: next.place ?? null } : {}),
    });
  const taType = searchParams.get("ta");
  const displacementMode: DisplacementMode = searchParams.get("mode") === "share" ? "share" : "rate";
  const needYear = num(searchParams.get("yr"));
  const costYear = num(searchParams.get("cy"));
  const insecuritySeriesRaw = searchParams.get("is") ?? "";
  const [displacementSearch, setDisplacementSearch] = useState("");
  // Renting: local authorities are in the PIPR file but too many for a menu — find one by name.
  const [rentSearch, setRentSearch] = useState("");
  const pathwayKeys = useMemo(
    () => (active === "insecurity" ? pathwayQuarterKeys(data.insecurity) : []),
    [active, data.insecurity],
  );
  const pathwayLatest = pathwayKeys[pathwayKeys.length - 1] ?? 0;
  const insecurityDataOpts = useMemo(
    () => (active === "insecurity" ? insecurityDataOptions(data.sources, data.insecurity) : []),
    [active, data.sources, data.insecurity],
  );
  const insecuritySeries =
    insecurityDataOpts.some((o) => o.value === insecuritySeriesRaw)
      ? insecuritySeriesRaw
      : (insecurityDataOpts[0]?.value ?? "");
  const temporaryOpts = useMemo(
    () => (active === "insecurity" ? temporaryTypeOptions(data.insecurity) : []),
    [active, data.insecurity],
  );
  const needOpts = useMemo(
    () => (active === "insecurity" ? needYearOptions(data.insecurity) : []),
    [active, data.insecurity],
  );
  const costOpts = useMemo(
    () => (active === "insecurity" ? costYearOptions(data.insecurity) : []),
    [active, data.insecurity],
  );
  const insecurityFoot = useMemo(() => {
    if (active !== "insecurity") return null;
    if (view === "temporary") return temporaryFoot(data.insecurity, taType);
    if (view === "displacement") return displacementFoot(data.insecurity, displacementMode);
    if (view === "need") return needFoot(data.insecurity, needYear);
    if (view === "cost") return costFoot(data.insecurity, costYear);
    if (view === "table") return insecurityDataFoot(data.insecurity, data.sources, insecuritySeries);
    return pathwayFoot(data.insecurity, pathwaysState);
  }, [
    active,
    view,
    data.insecurity,
    data.sources,
    taType,
    displacementMode,
    needYear,
    costYear,
    insecuritySeries,
    pathwaysState,
  ]);
  const wealthAgeRaw = searchParams.get("wa");
  const wealthAgeOpts = useMemo(
    () => (active === "ownership" ? wealthAgeOptions(data.ownership) : []),
    [active, data.ownership],
  );
  const wealthAgeId =
    wealthAgeRaw && wealthAgeOpts.some((o) => o.value === wealthAgeRaw)
      ? wealthAgeRaw
      : (wealthAgeOpts.find((o) => o.value === "age-all-persons")?.value ?? wealthAgeOpts[0]?.value ?? "age-all-persons");

  const ownershipMortgageFoot = useMemo(
    () => (active === "ownership" && view === "mortgages" ? mortgageFoot(data.ownership) : null),
    [active, view, data.ownership],
  );
  const ownershipWhoOwnsFoot = useMemo(
    () =>
      active === "ownership" && (view === "ownership" || view === "")
        ? whoOwnsFoot(data.ownership.titles, titleOwner)
        : null,
    [active, view, data.ownership.titles, titleOwner],
  );
  const ownershipWealthFoot = useMemo(
    () => (active === "ownership" && view === "wealth" ? wealthFoot(data.ownership, wealthAgeId) : null),
    [active, view, data.ownership, wealthAgeId],
  );
  const ownershipDataNotes = useMemo(
    () => (active === "ownership" && view === "table" ? ownershipDataFoot() : null),
    [active, view],
  );
  const pricesFoot = useMemo(() => {
    if (active !== "prices") return null;
    if (view === "table") return pricesDataFoot(data);
    if (view === "transactions") return pricesTransactionsFoot(data);
    return null;
  }, [active, view, data]);

  // Domain 06 Planning & land — controls in the URL.
  const planningQuarterOpts = useMemo(
    () => (active === "land" ? planningQuarterOptions(data.planningFlow) : []),
    [active, data.planningFlow],
  );
  const planningQRaw = searchParams.get("pq");
  const planningQParsed = planningQRaw != null ? Number(planningQRaw) : null;
  const planningQuarterIndex =
    planningQParsed != null &&
    Number.isFinite(planningQParsed) &&
    planningQuarterOpts.some((o) => o.index === planningQParsed)
      ? planningQParsed
      : null;
  const planningFocusRaw = searchParams.get("pf");
  const planningFocus: PlanningStageId | null =
    planningFocusRaw === "received" || planningFocusRaw === "decided" || planningFocusRaw === "granted"
      ? planningFocusRaw
      : null;
  const sitesFocus: SitesFocus = searchParams.get("sm") === "authority" ? "authority" : "permission";
  const pmRaw = searchParams.get("pm");
  const planningInstrument = pmRaw === "appeals" ? "appeals" : pmRaw === "plans" ? "plans" : "p120";
  const gbyRaw = searchParams.get("gby") ?? "";
  const gbHistoryYear: GbHistoryYear = (GB_HISTORY_YEARS as readonly string[]).includes(gbyRaw)
    ? (gbyRaw as GbHistoryYear)
    : "2024-25";
  const gbpRaw = searchParams.get("gbp") ?? "";
  const gbFocusPlace =
    GB_HISTORY_PLACE_NAMES.find((n) => n.toLowerCase() === gbpRaw.toLowerCase()) ?? null;
  const [landSearch, setLandSearch] = useState("");
  const [gbPlaceSearch, setGbPlaceSearch] = useState(gbFocusPlace ?? "");
  const [landAuthorities, setLandAuthorities] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => {
    if (active !== "land") return;
    let live = true;
    fetch("/housing/land-layers/authorities")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { authorities: { code: string; name: string }[] }) => {
        if (live) setLandAuthorities(j.authorities ?? []);
      })
      .catch(() => {
        if (live) setLandAuthorities([]);
      });
    return () => {
      live = false;
    };
  }, [active]);
  const landFoot = useMemo(() => {
    if (active !== "land") return null;
    if (view === "decisions" || view === "planning") {
      return planningInstrument === "appeals"
        ? appealsFoot(data.planningAppeals)
        : planningInstrument === "plans"
          ? localPlansFoot(data.localPlans)
          : planningFoot(data.planningFlow, planningQuarterIndex);
    }
    if (view === "sites") return sitesFoot(data.brownfield);
    if (view === "history") return historyFoot(data.greenBelt, gbHistoryYear);
    if (view === "table") return landDataFoot();
    return explorerFoot();
  }, [
    active,
    view,
    data.planningFlow,
    data.planningAppeals,
    data.localPlans,
    data.brownfield,
    data.greenBelt,
    planningQuarterIndex,
    gbHistoryYear,
    planningInstrument,
  ]);

  const rent = useRenting(
    active === "renting",
    data,
    view,
    searchParams.get("rent"),
    mapArea,
    searchParams.get("bed") ?? "",
    fromParam,
    toParam,
    mapDate,
    lettingsView,
  );
  const rentFoot = useMemo(() => {
    if (active !== "renting") return null;
    if (view === "tenancies") return lettingsFoot(lettingsView);
    if (view === "table") return rentDataFoot(rent.placeName);
    return null;
  }, [active, view, lettingsView, rent.placeName]);
  const stage = useMemo(() => stageFor(active, view, controls, data), [active, view, controls, data]);
  const policyState = useMemo(() => parsePolicyState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const { data: policyData } = usePolicyData(active === "policy");
  const figures = useMemo(
    () =>
      active === "renting"
        ? rent.figures
        : active === "policy"
          ? policyFigures(view === "promise" || view === "archive" || view === "table" ? view : "time", policyState, policyData)
          : active === "supply" && view === "who-builds"
            ? whoBuildsFigures(data.whoBuilds, whoBuildsMode)
            : active === "land" && (view === "decisions" || view === "planning") && planningInstrument === "plans"
              ? localPlansFigures(data.localPlans)
              : figuresFor(active, data, view, controls),
    [active, rent.figures, data, view, controls, policyState, policyData, whoBuildsMode, planningInstrument],
  );

  // Period bounds come from the view's own series. A from/to inherited from
  // another domain is ignored when it misses this series, so the chart is not
  // emptied while the headline still quotes the latest month.
  const stageBounds = useMemo(() => {
    const ts = stage?.series.flatMap((x) => x.points.map((p) => p.t)) ?? [];
    if (ts.length === 0) return null;
    return { min: yearOf(Math.min(...ts)), max: yearOf(Math.max(...ts)) };
  }, [stage]);
  const applied = useMemo(
    () => applyWindow(stage?.series ?? [], stageBounds, fromParam, toParam),
    [stage, stageBounds, fromParam, toParam],
  );
  const isRenting = active === "renting";
  const bounds =
    isRenting && rent.seriesMin != null && rent.seriesMax != null
      ? { min: rent.seriesMin, max: rent.seriesMax }
      : stageBounds;
  const from = isRenting ? rent.from : applied.from;
  const to = isRenting ? rent.to : applied.to;
  const periodInvalid = isRenting ? rent.periodInvalid : applied.invalid;
  const clipped = applied.series;
  const years = bounds ? Array.from({ length: bounds.max - bounds.min + 1 }, (_, i) => bounds.min + i) : [];
  const sources = (
    isRenting && view === "tenancies"
      ? ["social-housing-lettings"]
      : active === "affordability" && view === "ages"
        ? agesView === "mortgage"
          ? ["ehs-mortgage-by-age"]
          : agesView === "data"
            ? ["ehs-housing-costs-by-age", "ehs-mortgage-by-age"]
            : ["ehs-housing-costs-by-age"]
        : (stage?.sourceIds ?? [])
  )
    .map((id) => data.sources[id])
    .filter(Boolean) as Source[];
  const placesAdjusted = !(places.length === 1 && places[0] === "uk");
  const adjusted =
    fromParam !== null || toParam !== null || placesAdjusted || controls.measure !== "level" || controls.segment !== "new";

  const isPricesMap = active === "prices" && view === "map";
  const isRentMap = active === "renting" && view === "map";
  const isAffordMap = active === "affordability" && view === "map";
  const isMap = isPricesMap || isRentMap || isAffordMap;
  const activeMap = isAffordMap ? clientMaps.afford : isRentMap ? clientMaps.rent : isPricesMap ? clientMaps.prices : null;

  // Deep-link / first paint on Map with no SSR pack yet — kick a client fetch.
  useEffect(() => {
    if (!isMap || activeMap || mapLoading) return;
    const key = isAffordMap ? "afford" : isRentMap ? "rent" : "prices";
    const variant = key === "rent" ? "rent" : key === "afford" ? "afford" : "hpi";
    void fetchMapPack(key, variant, mapHpi);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enter Map once when pack missing
  }, [isMap, activeMap, isAffordMap, isRentMap, mapHpi]);
  const mapVariant = isAffordMap ? "afford" : isRentMap ? "rent" : "hpi";
  const isTable = view === "table";
  const isPricesData = active === "prices" && view === "table";
  const isSegments = active === "prices" && view === "segments";
  const isTransactions = active === "prices" && view === "transactions";
  const isExperiment = active === "affordability" && view === "experiment";
  const isAffordData = active === "affordability" && view === "table";
  const isHouseholds = active === "affordability" && view === "households";
  const isAges = active === "affordability" && view === "ages";
  const isComposition = active === "stock" && view === "composition";
  const isStockTypes = active === "stock" && view === "types";
  const isStockGeography = active === "stock" && view === "geography";
  const isStockVacancy = active === "stock" && view === "vacancy";
  const isStockTenure = active === "stock" && view === "tenure";
  const isStockData = active === "stock" && view === "table";
  const isSupplyMachine = active === "supply" && (view === "machine" || view === "");
  const isSupplyGeography = active === "supply" && view === "geography";
  const isWhoBuilds = active === "supply" && view === "who-builds";
  const isSupplyData = active === "supply" && view === "table";
  const isLandSites = active === "land" && view === "sites";
  const isLandData = active === "land" && view === "table";
  const isLandHistory = active === "land" && view === "history";
  const isLandDecisionMachine = active === "land" && (view === "decisions" || view === "planning");
  // Land Explorer is the default land view (spatial layers by place)
  const isLandExplorer = active === "land" && !["sites", "history", "decisions", "planning", "table", "use"].includes(view);
  const isQualityInside = active === "quality" && (view === "inside" || view === "");
  const isQualityEnergy = active === "quality" && view === "energy";
  const isQualityGeography = active === "quality" && view === "geography";
  const isQualityCondition = active === "quality" && view === "condition";
  const isQualityData = active === "quality" && view === "table";
  const isInsecurityPathways = active === "insecurity" && (view === "pathways" || view === "");
  const isInsecurityTemporary = active === "insecurity" && view === "temporary";
  const isInsecurityDisplacement = active === "insecurity" && view === "displacement";
  const isInsecurityNeed = active === "insecurity" && view === "need";
  const isInsecurityCost = active === "insecurity" && view === "cost";
  const isInsecurityData = active === "insecurity" && view === "table";
  const isOwnershipNetwork = active === "ownership" && (view === "ownership" || view === "");
  const isOwnershipMortgages = active === "ownership" && view === "mortgages";
  const isOwnershipWealth = active === "ownership" && view === "wealth";
  const isOwnershipData = active === "ownership" && view === "table";
  const isPolicy = active === "policy";
  const policyView: PolicyView = view === "promise" || view === "archive" || view === "table" ? view : "time";
  const showPlaceControls = Boolean(stage?.place) && measure !== "real";
  const mapMode = isAffordMap ? "price" : measure === "change" ? "change" : "price";
  const mapTitle = isAffordMap
    ? "Median house price to workplace earnings by local authority"
    : isRentMap
      ? measure === "change"
        ? "Annual change in private rents by local authority"
        : "Average monthly private rent by local authority"
      : measure === "change"
        ? "Annual change in nominal average house price by local authority"
        : "Nominal average house price by local authority";
  // Map and the land explorer need the canvas width. Condense while they are open,
  // then put the index back to whatever the reader had chosen before.
  const condensedNow = useRef(condensed);
  condensedNow.current = condensed;
  const condensedBeforeWide = useRef<boolean | null>(null);
  useEffect(() => {
    const wide = isMap || isLandExplorer;
    if (wide) {
      if (condensedBeforeWide.current === null) condensedBeforeWide.current = condensedNow.current;
      setCondensed(true);
      return;
    }
    if (condensedBeforeWide.current === null) return;
    const restore = condensedBeforeWide.current;
    condensedBeforeWide.current = null;
    setCondensed(restore);
  }, [isMap, isLandExplorer]);

  const isRentBody = isRenting && view !== "map";
  const latestLetting = data.insecurity.lettingsBreakdown.at(-1);
  const lettingPeriod = latestLetting ? `${Math.floor(latestLetting.t)}–${String(Math.floor(latestLetting.t) + 1).slice(-2)}` : "";
  const showRentControls = isRenting && view !== "tenancies";
  const rentYears =
    rent.seriesMin != null && rent.seriesMax != null
      ? Array.from({ length: rent.seriesMax - rent.seriesMin + 1 }, (_, i) => rent.seriesMin! + i)
      : [];
  const rentPlaceOptions = useMemo(() => {
    const base = [
      { value: RENT_UK, label: "United Kingdom" },
      ...rent.places
        .filter((place) => place.level === "nation" || place.level === "region")
        .map((place) => ({ value: place.code, label: place.name })),
    ];
    for (const code of rent.areas) {
      if (base.some((option) => option.value === code)) continue;
      const known = rent.places.find((place) => place.code === code);
      base.push({ value: code, label: known?.name ?? "Selected place" });
    }
    const full = rent.areas.length >= MAX_RENT_PLACES;
    return base.map((option) => ({
      ...option,
      disabled: full && !rent.areas.includes(option.value),
      title: full && !rent.areas.includes(option.value) ? `At most ${MAX_RENT_PLACES} places` : undefined,
    }));
  }, [rent.areas, rent.places]);
  // Local authorities stay out of the Places menu (too many). Offer them via search suggestions.
  const rentLaSuggestions = useMemo(() => {
    const q = rentSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return rent.places
      .filter((place) => place.level === "local" && place.name.toLowerCase().includes(q))
      .slice(0, 40)
      .map((place) => ({ value: place.code, label: place.name }));
  }, [rent.places, rentSearch]);

  const showControls =
    stage &&
    !isRenting &&
    !isMap &&
    !isExperiment &&
    !isHouseholds &&
    !isAges &&
    !isComposition &&
    !isStockTypes &&
    !isStockGeography &&
    !isStockVacancy &&
    !isStockTenure &&
    !isStockData &&
    !isSupplyMachine &&
    !isSupplyGeography &&
    !isWhoBuilds &&
    !isSupplyData &&
    !isLandDecisionMachine &&
    !isLandData &&
    !isLandSites &&
    !isLandHistory &&
    !isLandExplorer &&
    !isQualityInside &&
    !isQualityEnergy &&
    !isQualityGeography &&
    !isQualityCondition &&
    !isQualityData &&
    !isInsecurityPathways &&
    !isInsecurityTemporary &&
    !isInsecurityDisplacement &&
    !isInsecurityNeed &&
    !isInsecurityCost &&
    !isInsecurityData &&
    !isOwnershipNetwork &&
    !isOwnershipMortgages &&
    !isOwnershipWealth &&
    !isOwnershipData &&
    (bounds || stage.place || stage.measure || isSegments);

  const noteRows = (notes?: string[]): SourceRow[] =>
    (notes ?? []).filter(Boolean).map((text) => ({ label: "Reading", text }));
  const catalogueFoot = !(isMap && activeMap) && !isPolicy;
  const recordRows: SourceRow[] = isMap && activeMap
    ? [
        {
          label: "Source",
          text: [activeMap.atlas.source.publisher, activeMap.atlas.source.version, activeMap.atlas.source.release].filter(Boolean).join(" · "),
        },
        ...(isPricesMap
          ? []
          : [
              {
                label: "Geography",
                text: isAffordMap
                  ? "England and Wales. Scotland and Northern Ireland are not in AFF1. The boundary file is the UK local-authority set, used only to draw places."
                  : (activeMap.geometry.source.release ?? "ONS local authority boundaries"),
              },
            ]),
        ...(isPricesMap ? noteRows([pricesMapReading(data, mapHpi, measure === "change") ?? ""]) : []),
        ...(isRentMap ? noteRows(rent.reading) : []),
      ]
    : isPolicy
      ? policyFootRows(policyView, policyState, policyData)
      : noteRows(isRenting ? rent.reading : stage?.reading);

  const arrival = readArrival(searchParams);
  const followConn =
    domain.status === "ready"
      ? primaryHousingConnection({ domain: active, view }, {})
      : null;
  const followHref = followConn
    ? resolveHousingConnectionHref(
        followConn,
        {},
        searchParams,
        buildArrivalContext({
          label: `Housing · ${domain.short}`,
          pathname,
          searchParams,
        }),
      )
    : null;

  return (
    <Explorer
      sector="Housing & Land"
      indexLabel="Housing index"
      domains={EXPLORER_DOMAINS}
      active={active}
      onSelectDomain={(id) => selectDomain(id as DomainId)}
      condensed={condensed}
      onCondensedChange={setCondensed}
      ground={ground}
    >
      <ArrivalFrom from={arrival.from} returnHref={arrival.returnHref} />
      {/* 1 · Head: where you are, the question, the views */}
      <ExplorerHead views={views} view={view} onView={selectView} />

      {/* 2 · Figures: the domain at a glance */}
      <FigureStrip figures={figures} />
      {isPolicy && <PolicyControls view={policyView} state={policyState} onChange={setQuery} />}

      {/* Renting (Domain 02) — Social rent breakdown outside the Stage. */}
      {isRenting && view === "tenancies" && (
        <ControlRow label="Social rent controls">
          <MenuControl
            label="Breakdown"
            value={lettingsView === "data" ? "history" : lettingsView}
            options={LETTINGS_BREAKDOWN_OPTIONS}
            onChange={(v) => setQuery({ lettings: v === "history" ? null : v })}
          />
          {lettingsView !== "history" && lettingsView !== "data" && (
            <ResetButton onClick={() => setQuery({ lettings: null })} />
          )}
        </ControlRow>
      )}

      {/* Affordability (Domain 03) — controls outside the Stage. */}
      {isExperiment && priceBenchmarks.length > 0 && (
        <ControlRow label="Budget controls">
          <MenuControl
            label="Price benchmark"
            value={benchmarkCode}
            options={priceBenchmarks.map((place) => ({ value: place.code, label: place.name }))}
            onChange={(v) => setQuery({ bench: v === defaultBench ? null : v })}
          />
          {benchmarkCode !== defaultBench && <ResetButton onClick={() => setQuery({ bench: null })} />}
        </ControlRow>
      )}
      {isAges && (
        <ControlRow label="Ages controls">
          <MenuControl
            label="Breakdown"
            value={agesView === "data" ? "share" : agesView}
            options={AGES_BREAKDOWN_OPTIONS}
            onChange={(v) => setQuery({ ages: v === "share" ? null : v })}
          />
          {agesView !== "share" && agesView !== "data" && (
            <ResetButton onClick={() => setQuery({ ages: null })} />
          )}
        </ControlRow>
      )}

      {/* Stock (Domain 04) — controls outside the Stage. */}
      {isComposition && fabricYearOpts.length > 0 && (
        <ControlRow label="Composition controls">
          <MenuControl
            label="As at 31 March"
            value={
              stockYear != null && fabricYearOpts.some((o) => o.value === String(stockYear))
                ? String(stockYear)
                : (fabricYearOpts[0]?.value ?? "")
            }
            options={fabricYearOpts}
            onChange={(v) => {
              const latest = fabricYearOpts[0]?.value;
              setQuery({ sy: v === latest ? null : v });
            }}
          />
          {stockYear != null && <ResetButton onClick={() => setQuery({ sy: null })} />}
        </ControlRow>
      )}
      {isStockTypes && typesPlaceOpts.length > 0 && (
        <ControlRow label="Types controls">
          <MenuControl
            label="Geography"
            value={stockPlace ?? typesPlaceOpts[0]!.value}
            options={typesPlaceOpts}
            onChange={(v) => {
              const first = typesPlaceOpts[0]?.value;
              setQuery({ sp: v === first ? null : v });
            }}
          />
          {stockPlaceRaw != null && <ResetButton onClick={() => setQuery({ sp: null })} />}
        </ControlRow>
      )}
      {isStockGeography && (
        <ControlRow label="Stock geography controls">
          <MenuControl
            label="Measure"
            value={stockGeoMeasure}
            options={STOCK_GEO_MEASURE_OPTIONS}
            onChange={(v) => setQuery({ sgm: v === "owner" ? null : v })}
          />
          {stockGeoYearOpts.length > 0 && (
            <MenuControl
              label="As at 31 March"
              value={
                stockYear != null && stockGeoYearOpts.some((o) => o.value === String(stockYear))
                  ? String(stockYear)
                  : (stockGeoYearOpts[0]?.value ?? "")
              }
              options={stockGeoYearOpts}
              onChange={(v) => {
                const latest = stockGeoYearOpts[0]?.value;
                setQuery({ sy: v === latest ? null : v });
              }}
            />
          )}
          {(stockGeoMeasure !== "owner" || stockYear != null) && (
            <ResetButton onClick={() => setQuery({ sgm: null, sy: null })} />
          )}
        </ControlRow>
      )}

      {/* Quality (Domain 07) — controls outside the Stage. */}
      {isQualityInside && (
        <InsideHomesControls
          state={insideState}
          onChange={setInsideState}
          evidence={qualityEvidence}
          failed={qualityFailed}
        />
      )}
      {isQualityEnergy && (
        <EnergyViewControls
          state={energyState}
          onChange={setEnergyState}
          evidence={qualityEvidence}
          failed={qualityFailed}
        />
      )}
      {isQualityCondition && (
        <StateOfRepairControls
          state={conditionState}
          onChange={setConditionState}
          evidence={qualityEvidence}
          failed={qualityFailed}
        />
      )}
      {isQualityGeography && (
        <QualityGeographyControls
          state={geographyState}
          onChange={setGeographyState}
          evidence={qualityEvidence}
          failed={qualityFailed}
        />
      )}
      {isQualityData && (
        <QualityDataControls
          state={qualityDataState}
          onChange={setQualityDataState}
          evidence={qualityEvidence}
          failed={qualityFailed}
        />
      )}

      {/* Supply (Domain 05) — controls outside the Stage. */}
      {isSupplyMachine && (
        <ControlRow label="Supply machine controls">
          <MenuControl
            label="View"
            value={supplyState.panel}
            options={MACHINE_PANEL_OPTIONS}
            onChange={(v) => setSupply({ panel: v })}
          />
          <MenuControl
            label="Place"
            value={supplyState.place}
            options={supplyPlaceOpts}
            onChange={(v) => setSupply({ place: v })}
          />
          {supplyYearOpts.length > 0 && (
            <MenuControl
              label="Financial year"
              value={
                supplyState.year != null && supplyYearOpts.some((o) => o.value === String(supplyState.year))
                  ? String(supplyState.year)
                  : (supplyYearOpts[0]?.value ?? "")
              }
              options={supplyYearOpts}
              onChange={(v) => setSupply({ year: Number(v) })}
            />
          )}
          <MenuControl
            label="Compare with"
            value={supplyState.vs != null ? String(supplyState.vs) : ""}
            options={supplyVsOpts}
            onChange={(v) => setSupply({ vs: v ? Number(v) : null })}
          />
          {(supplyState.panel !== "section" ||
            supplyState.place !== "E92000001" ||
            supplyState.year != null ||
            supplyState.vs != null ||
            supplyState.part != null) && (
            <ResetButton
              onClick={() =>
                setQuery({
                  panel: null,
                  place: null,
                  to: null,
                  from: null,
                  vs: null,
                  part: null,
                })
              }
            />
          )}
        </ControlRow>
      )}
      {isWhoBuilds && (
        <ControlRow label="Who builds controls">
          <MenuControl
            label="Measure"
            value={whoBuildsMode}
            options={WHO_BUILDS_MEASURE_OPTIONS}
            onChange={(v) => setQuery({ wb: v === "completions" ? null : v })}
          />
          {whoBuildsMode !== "completions" && (
            <ResetButton onClick={() => setQuery({ wb: null })} />
          )}
        </ControlRow>
      )}
      {isSupplyGeography && (
        <ControlRow label="Geography controls">
          <MenuControl
            label="Measure"
            value={geographyMeasure}
            options={GEOGRAPHY_MEASURE_OPTIONS}
            onChange={(v) => setQuery({ gm: v === "count" ? null : v })}
          />
          {data.supplyGeography.years.length > 1 && (
            <MenuControl
              label="Financial year"
              value={supplyGeoYear}
              options={data.supplyGeography.years.map((y) => ({
                value: y.value,
                label: y === data.supplyGeography.years[0] && data.supplyGeography.provisional ? `${y.label} provisional` : y.label,
              }))}
              onChange={(v) => setQuery({ gy: v === data.supplyGeography.years[0]?.value ? null : v })}
            />
          )}
          <SearchControl
            label="Find an authority"
            value={supplyGeoSearch}
            placeholder="Type a local authority"
            onChange={(v) => {
              setSupplyGeoSearch(v);
              const hit = supplyGeo.mapPlaces.find(
                (p) => p.name.toLowerCase() === v.trim().toLowerCase(),
              );
              if (hit) setQuery({ area: hit.code });
            }}
          />
          {(geographyMeasure !== "count" ||
            mapArea ||
            supplyGeoSearch ||
            supplyGeoYear !== (data.supplyGeography.years[0]?.value ?? "")) && (
            <ResetButton
              onClick={() => {
                setSupplyGeoSearch("");
                setQuery({ gm: null, area: null, gy: null });
              }}
            />
          )}
        </ControlRow>
      )}

      {/* Shelter (Domain 08) — controls outside the Stage, matching Energy Consumption. */}
      {active === "insecurity" && isInsecurityPathways && (
        <ControlRow label="Pathway controls">
          <MenuControl
            label="View"
            value={pathwaysState.read}
            options={[
              { value: "diagram", label: "This stage" },
              { value: "table", label: "All stages" },
            ]}
            onChange={(v) => setPathways({ read: v === "table" ? "table" : "diagram" })}
          />
          <MenuControl
            label="Stage"
            value={pathwaysState.node ?? "assess"}
            options={pathwayStageOptions()}
            onChange={(id) => setPathways({ node: id })}
          />
          <MenuControl
            label="Place"
            value={pathwaysState.place ?? "england"}
            options={[
              { value: "england", label: "England" },
              ...data.insecurity.pathwayPlaces.map((p) => ({
                value: p.code,
                label: p.kind === "region" ? `${p.name} (region)` : p.name,
              })),
            ]}
            onChange={(v) => setPathways({ place: v === "england" ? null : v })}
          />
          {pathwaysState.place ? (
            // Places publish the latest quarter only, so this is a fact, not a menu.
            <UnavailableControl
              label="Quarter"
              reason={`${flowLabel(
                (() => {
                  const p = data.insecurity.pathwayPlaces.find((x) => x.code === pathwaysState.place);
                  return p ? qKey(toT(p.period)) : pathwayLatest;
                })(),
              )} only · latest for places`}
            />
          ) : (
            <MenuControl
              label="Quarter"
              value={keyParam(pathwaysState.q != null && pathwayKeys.includes(pathwaysState.q) ? pathwaysState.q : pathwayLatest)}
              options={[...pathwayKeys].reverse().map((k) => ({ value: keyParam(k), label: flowLabel(k) }))}
              onChange={(v) => {
                const next = parseKeyParam(v);
                setPathways({ q: next == null || next === pathwayLatest ? null : next });
              }}
            />
          )}
          {(pathwaysState.node || pathwaysState.q != null || pathwaysState.place || pathwaysState.read === "table") && (
            <ResetButton onClick={() => setPathways({ node: null, q: null, place: null, read: "diagram" })} />
          )}
        </ControlRow>
      )}
      {isInsecurityTemporary && (
        <ControlRow label="Temporary accommodation controls">
          <MenuControl
            label="Accommodation type"
            value={taType ?? temporaryOpts[0]?.value ?? "all-types"}
            options={temporaryOpts}
            onChange={(id) => setQuery({ ta: id === "all-types" ? null : id })}
          />
          {taType && <ResetButton onClick={() => setQuery({ ta: null })} />}
        </ControlRow>
      )}
      {isInsecurityDisplacement && (
        <ControlRow label="Displacement controls">
          <MenuControl
            label="Measure"
            value={displacementMode}
            options={DISPLACEMENT_MEASURE_OPTIONS}
            onChange={(m) => setQuery({ mode: m === "rate" ? null : m })}
          />
          <SearchControl
            label="Find an authority"
            value={displacementSearch}
            placeholder="Type a local authority"
            onChange={(v) => {
              setDisplacementSearch(v);
              const hit = data.insecurity.taPlaces.find(
                (p) => p.name.toLowerCase() === v.trim().toLowerCase(),
              );
              if (hit) setQuery({ area: hit.code });
            }}
          />
          {(displacementMode !== "rate" || mapArea || displacementSearch) && (
            <ResetButton
              onClick={() => {
                setDisplacementSearch("");
                setQuery({ mode: null, area: null });
              }}
            />
          )}
        </ControlRow>
      )}
      {isInsecurityNeed && needOpts.length > 0 && (
        <ControlRow label="Housing need controls">
          <MenuControl
            label="Year"
            value={String(needYear ?? needOpts[0]!.year)}
            options={needOpts.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => {
              const next = Number(v);
              setQuery({ yr: next === needOpts[0]!.year ? null : String(next) });
            }}
          />
          {needYear != null && <ResetButton onClick={() => setQuery({ yr: null })} />}
        </ControlRow>
      )}
      {isInsecurityCost && costOpts.length > 0 && (
        <ControlRow label="Cost of insecurity controls">
          <MenuControl
            label="Financial year"
            value={String(costYear ?? costOpts[0]!.year)}
            options={costOpts.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => {
              const next = Number(v);
              setQuery({ cy: next === costOpts[0]!.year ? null : String(next) });
            }}
          />
          {costYear != null && <ResetButton onClick={() => setQuery({ cy: null })} />}
        </ControlRow>
      )}
      {isInsecurityData && insecurityDataOpts.length > 0 && (
        <ControlRow label="Insecurity data">
          <MenuControl
            label="Series"
            value={insecuritySeries}
            options={insecurityDataOpts}
            onChange={(id) =>
              setQuery({ is: id === insecurityDataOpts[0]?.value ? null : id })
            }
          />
          {insecuritySeriesRaw && <ResetButton onClick={() => setQuery({ is: null })} />}
        </ControlRow>
      )}
      {isOwnershipNetwork && (
        <ControlRow label="Who owns controls">
          <MenuControl
            label="Owner"
            value={titleOwner}
            options={WHO_OWNS_OWNER_OPTIONS}
            onChange={(id) => setQuery({ own: id === "uk" ? null : id })}
          />
          <SearchControl
            label="Find an authority"
            value={whoOwnsSearch}
            placeholder="Type a local authority"
            onChange={(v) => {
              setWhoOwnsSearch(v);
              const hit = data.ownership.titles[titleOwner].places.find(
                (p) => p.name.toLowerCase() === v.trim().toLowerCase(),
              );
              if (hit) setQuery({ area: hit.code });
            }}
          />
          {(titleOwner !== "uk" || mapArea || whoOwnsSearch) && (
            <ResetButton
              onClick={() => {
                setWhoOwnsSearch("");
                setQuery({ own: null, area: null });
              }}
            />
          )}
        </ControlRow>
      )}
      {isOwnershipWealth && wealthAgeOpts.length > 0 && (
        <ControlRow label="Wealth controls">
          <MenuControl
            label="Age"
            value={wealthAgeId}
            options={wealthAgeOpts}
            onChange={(v) => setQuery({ wa: v === "age-all-persons" ? null : v })}
          />
          {wealthAgeRaw != null && <ResetButton onClick={() => setQuery({ wa: null })} />}
        </ControlRow>
      )}

      {/* Planning & land (Domain 06) — controls outside the Stage. */}
      {isLandExplorer && (
        <ControlRow label="Land explorer controls">
          <SearchControl
            label="Find a council"
            value={landSearch}
            placeholder="Type a local authority"
            onChange={(v) => {
              setLandSearch(v);
              const hit = landAuthorities.find(
                (a) => a.name.toLowerCase() === v.trim().toLowerCase() || a.code.toLowerCase() === v.trim().toLowerCase(),
              );
              if (hit) setQuery({ lad: hit.code });
            }}
          />
          {lad && (
            <ResetButton
              onClick={() => {
                setLandSearch("");
                setQuery({ lad: null });
              }}
            />
          )}
        </ControlRow>
      )}
      {isLandSites && (
        <ControlRow label="Development sites controls">
          <MenuControl
            label="Measure"
            value={sitesFocus}
            options={SITES_MEASURE_OPTIONS}
            onChange={(id) => setQuery({ sm: id === "permission" ? null : id })}
          />
          {sitesFocus !== "permission" && (
            <ResetButton onClick={() => setQuery({ sm: null })} />
          )}
        </ControlRow>
      )}
      {isLandHistory && (
        <ControlRow label="Historical change controls">
          <MenuControl
            label="Map date"
            value={gbHistoryYear}
            options={[...GB_HISTORY_YEARS].reverse().map((y) => ({ value: y, label: gbYearLabel(y) }))}
            onChange={(id) => setQuery({ gby: id === "2024-25" ? null : id })}
          />
          <SearchControl
            label="Find a place"
            value={gbPlaceSearch}
            placeholder="London, Manchester, York…"
            note="Cities each Green Belt surrounds"
            onChange={(v) => {
              setGbPlaceSearch(v);
              const hit = GB_HISTORY_PLACE_NAMES.find((n) => n.toLowerCase() === v.trim().toLowerCase());
              if (hit) setQuery({ gbp: hit });
              else if (!v.trim()) setQuery({ gbp: null });
            }}
          />
          {(gbyRaw !== "" || gbFocusPlace) && (
            <ResetButton
              onClick={() => {
                setGbPlaceSearch("");
                setQuery({ gby: null, gbp: null });
              }}
            />
          )}
        </ControlRow>
      )}
      {isLandDecisionMachine && (
        <ControlRow label="Planning decisions controls">
          <MenuControl
            label="Measure"
            value={planningInstrument}
            options={[
              { value: "p120", label: "Planning applications" },
              { value: "appeals", label: "Appeals" },
              { value: "plans", label: "Local plans" },
            ]}
            onChange={(id) => setQuery({ pm: id === "p120" ? null : id, pq: null, pf: null })}
          />
          {planningInstrument === "p120" && planningQuarterOpts.length > 0 && (
            <MenuControl
              label="Quarter"
              value={String(planningQuarterIndex ?? planningQuarterOpts[0]!.index)}
              options={planningQuarterOpts.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => {
                const next = Number(v);
                const latest = planningQuarterOpts[0]!.index;
                setQuery({ pq: next === latest ? null : String(next) });
              }}
            />
          )}
          {(planningInstrument !== "p120" || planningQuarterIndex != null || planningFocus != null) && (
            <ResetButton onClick={() => setQuery({ pm: null, pq: null, pf: null })} />
          )}
        </ControlRow>
      )}

      {showRentControls && rent.periodNote ? (
        <p className="bo-label">{rent.periodNote}</p>
      ) : periodInvalid ? (
        <p className="bo-label">The period in the link does not cover this series, so the full series is shown.</p>
      ) : showControls && stage && view !== "pipeline" && (fromParam !== null || toParam !== null) ? (
        <p className="bo-label">Headline figures: latest available. Chart and exact values: selected period.</p>
      ) : null}

      {showRentControls && (
        <ControlRow>
          {view === "map" || view === "bedrooms" ? (
            <MenuControl
              label="Place"
              value={rent.areas[0] ?? RENT_UK}
              options={rentPlaceOptions.map(({ value, label }) => ({ value, label }))}
              onChange={(code) => setQuery({ area: rentAreasParam([code]) })}
            />
          ) : (
            <MultiMenuControl
              label="Places"
              values={rent.areas}
              options={rentPlaceOptions}
              onChange={(next) => setQuery({ area: rentAreasParam(next.length > 0 ? next : [RENT_UK]) })}
            />
          )}
          <SearchControl
            label="Find an authority"
            value={rentSearch}
            placeholder="Type a local authority (334 districts)"
            note="Nations and regions are in Places. Search picks a local authority."
            suggestions={rentLaSuggestions}
            onChange={(v) => {
              setRentSearch(v);
              const hit = rent.places.find(
                (p) => p.level === "local" && p.name.toLowerCase() === v.trim().toLowerCase(),
              );
              if (!hit) return;
              const single = view === "map" || view === "bedrooms";
              const next = single
                ? [hit.code]
                : [...rent.areas.filter((c) => c !== hit.code), hit.code].slice(-MAX_RENT_PLACES);
              setQuery({ area: rentAreasParam(next) });
              setRentSearch("");
            }}
          />
          {rent.homeOptions.length > 1 && (
            <MenuControl
              label="Property"
              value={rent.category}
              options={rent.homeOptions.map((id) => ({ value: id, label: categoryLabel(id) }))}
              onChange={(id) => setQuery({ bed: id === "all" ? null : id })}
            />
          )}
          {rentYears.length > 0 && (
            <PeriodControl
              label="Period"
              years={rentYears}
              from={rent.from}
              to={rent.to}
              onChange={(nextFrom, nextTo) => setQuery({ from: String(nextFrom), to: String(nextTo) })}
            />
          )}
          {(rent.area || rent.category !== "all" || fromParam != null || toParam != null || searchParams.get("rent")) && (
            <ResetButton onClick={() => setQuery({ area: null, bed: null, from: null, to: null, rent: null, date: null })} />
          )}
        </ControlRow>
      )}

      {/* 3 · Controls for chart views; Map carries its own instrument toolbar */}
      {showControls && stage && (
        <ControlRow>
          {showPlaceControls && (
            <MultiMenuControl
              label="Places"
              values={places}
              onChange={setPlaces}
              options={[
                { value: "uk", label: "United Kingdom" },
                ...[
                  ...(data.englandPrice.length ? [{ code: ENGLAND_CODE, name: "England" }] : []),
                  ...[...data.regions].sort((a, b) => a.name.localeCompare(b.name, "en-GB")),
                ].map((r) => {
                  const blocked = !places.includes(r.code) && places.length >= MAX_HISTORY_PLACES;
                  return {
                    value: r.code,
                    label: r.name,
                    disabled: blocked,
                    title: blocked ? `At most ${MAX_HISTORY_PLACES} places` : undefined,
                  };
                }),
              ]}
            />
          )}
          {stage.measure && (
            <MenuControl
              label="Measure"
              value={controls.measure}
              options={MEASURE_OPTIONS}
              onChange={(v) => setQuery({ measure: v === "level" ? null : v })}
            />
          )}
          {isSegments && (
            <MenuControl
              label="Segment"
              value={controls.segment}
              options={SEGMENT_OPTIONS}
              onChange={(v) => setQuery({ segment: v === "new" ? null : v, from: null, to: null })}
            />
          )}
          {bounds && (
            <PeriodControl
              label="Period"
              years={years}
              from={from}
              to={to}
              onChange={(f, t) => setQuery({ from: String(f), to: String(t) })}
            />
          )}
          {adjusted && <ResetButton onClick={() => setQuery({ place: null, measure: null, segment: null, from: null, to: null })} />}
        </ControlRow>
      )}

      {/* 4 · Stage: figure bar → plot → source. Fixed frame; every state fills it. */}
      <Stage
        title={
          isRenting
            ? view === "tenancies"
                ? lettingsView === "needs"
                  ? `New lettings by housing needs type · England · ${lettingPeriod}`
                  : lettingsView === "rent"
                    ? "New social lettings by rent type · England"
                    : "New social housing lettings · England"
                : view === "map"
                  ? rent.mapTitle
                  : view === "table"
                    ? "Rent series on this page"
                    : rent.title
            : isAges
              ? agesView === "place"
                ? "Private rent · ages 16–34 · English regions"
                : agesView === "mortgage"
                  ? "Mortgage payment by age · England"
                  : "Housing costs by age · England"
              : isOwnershipNetwork
                ? titleOwner === "overseas"
                  ? "Titles held by overseas companies · England and Wales"
                  : "Titles held by UK companies · England and Wales"
              : isMap
                ? mapTitle
                : isLandDecisionMachine && planningInstrument === "plans"
                  ? "Local plans: who has one, and how old it is"
                  : (stage?.title ?? domain.title)
        }
        bar={stageBar}
        framed={!(active === "supply" && view === "pipeline")}
        size={isMap ? "wide" : isRenting && view === "tenancies" && lettingsView === "needs" ? "compact" : "normal"}
        expandable={false}
        follow={
          followConn ? (
            <FollowStep
              connection={followConn}
              href={followHref}
              destination={followConn.destinationLabel}
            />
          ) : null
        }
        foot={
          domain.status === "preparation" ? undefined : insecurityFoot ? (
            <FigureRecord
              source={insecurityFoot.source}
              dataHref={
                "dataHref" in insecurityFoot && typeof insecurityFoot.dataHref === "string"
                  ? insecurityFoot.dataHref
                  : undefined
              }
              definition={insecurityFoot.definition}
              method={insecurityFoot.method}
            />
          ) : ownershipMortgageFoot ? (
            <FigureRecord
              source={ownershipMortgageFoot.source}
              dataHref={ownershipMortgageFoot.dataHref}
              definition={ownershipMortgageFoot.definition}
              method={ownershipMortgageFoot.method}
            />
          ) : ownershipWhoOwnsFoot ? (
            <FigureRecord
              source={ownershipWhoOwnsFoot.source}
              dataHref={ownershipWhoOwnsFoot.dataHref}
              definition={ownershipWhoOwnsFoot.definition}
              method={ownershipWhoOwnsFoot.method}
            />
          ) : ownershipWealthFoot ? (
            <FigureRecord
              source={ownershipWealthFoot.source}
              dataHref={ownershipWealthFoot.dataHref}
              definition={ownershipWealthFoot.definition}
              method={ownershipWealthFoot.method}
            />
          ) : ownershipDataNotes ? (
            <FigureRecord
              source={ownershipDataNotes.source}
              dataHref={ownershipDataNotes.dataHref}
              definition={ownershipDataNotes.definition}
              method={ownershipDataNotes.method}
            />
          ) : pricesFoot ? (
            <FigureRecord
              source={pricesFoot.source}
              dataHref={pricesFoot.dataHref}
              definition={pricesFoot.definition}
              method={pricesFoot.method}
            />
          ) : supplyFoot ? (
            <FigureRecord
              source={supplyFoot.source}
              dataHref={supplyFoot.dataHref}
              definition={supplyFoot.definition}
              method={supplyFoot.method}
            />
          ) : qualityFoot ? (
            <FigureRecord
              source={qualityFoot.source}
              dataHref={qualityFoot.dataHref}
              definition={qualityFoot.definition}
              method={qualityFoot.method}
            />
          ) : stockFoot ? (
            <FigureRecord
              source={stockFoot.source}
              dataHref={stockFoot.dataHref}
              definition={stockFoot.definition}
              method={stockFoot.method}
            />
          ) : affordFoot ? (
            <FigureRecord
              source={affordFoot.source}
              dataHref={affordFoot.dataHref}
              definition={affordFoot.definition}
              method={affordFoot.method}
            />
          ) : rentFoot ? (
            <FigureRecord
              source={rentFoot.source}
              dataHref={rentFoot.dataHref}
              definition={rentFoot.definition}
              method={rentFoot.method}
            />
          ) : landFoot ? (
            <FigureRecord
              source={landFoot.source}
              dataHref={"dataHref" in landFoot ? (landFoot.dataHref as string | undefined) : undefined}
              definition={landFoot.definition}
              method={landFoot.method}
            />
          ) : (
            <SourceLine
              sources={catalogueFoot ? sources : []}
              rows={recordRows}
              derived={stage?.derived}
            />
          )
        }
      >
        {domain.status === "preparation" ? (
          <EmptyStage label="In preparation">Ready series will appear here once they pass validation. No estimated figures.</EmptyStage>
        ) : isMap && activeMap ? (
          <>
            <PricesMapStage
            atlas={activeMap.atlas}
            geometry={activeMap.geometry}
            mode={isRentMap && rent.mapMeasure === "annual-change" ? "change" : mapMode}
            date={isRentMap && rent.mapMonth ? rent.mapMonth.slice(0, 7) : mapDate}
            area={mapArea.includes(",") ? "" : mapArea}
            compare={mapCompare}
            hpiType={mapHpi}
            variant={mapVariant}
            rentCategory={isRentMap ? rent.category : "all"}
            rentMeasure={isRentMap ? rent.mapMeasure : "average-rent"}
            rentPublished={isRentMap ? rent.mapPublished : true}
            yearFrom={isRentMap ? rent.from : undefined}
            yearTo={isRentMap ? rent.to : undefined}
            onDate={(period) => setQuery({ date: period })}
            onArea={(code) => setQuery({ area: code })}
            onCompare={(code) => setQuery({ compare: code })}
            onHpiType={(id) => setQuery({ type: id })}
            onMode={(next) =>
              isRentMap
                ? setQuery({ rent: next === "change" ? "annual-change" : null })
                : setQuery({ measure: next === "change" ? "change" : null })
            }
          />
          </>
        ) : isMap && mapError ? (
          <EmptyStage label="Map unavailable">{mapError}</EmptyStage>
        ) : isMap ? (
          <EmptyStage label="Loading map">Fetching atlas and boundaries…</EmptyStage>
        ) : !stage ? (
          <EmptyStage label="No view">Choose a view above.</EmptyStage>
        ) : isExperiment ? (
          <AffordabilityExperiment
            input={scenarioInput}
            onChange={(next) => setQuery(scenarioToQuery(next, scenarioBase))}
            onReset={() => setQuery(scenarioToQuery(normaliseScenario(scenarioBase), scenarioBase))}
            afford={data.afford}
            benchmarks={priceBenchmarks}
            benchmarkCode={benchmarkCode}
            defaults={scenarioBase}
            rateSourceNote={rateSourceNote}
          />
        ) : isHouseholds ? (
          <WhoCanAfford regions={data.purchaseAffordRegions} grid={data.purchaseAffordGrid} />
        ) : isAges ? (
          <AgesView
            display={agesView}
            costs={data.ehsHousingCostsByAge}
            mortgage={data.ehsMortgageByAge}
          />
        ) : isComposition ? (
          <ChangingHousingFabric tenure={data.tenure} year={stockYear} />
        ) : isStockTypes ? (
          <TypesView types={data.dwellingTypes} placeId={stockPlace} />
        ) : isStockGeography ? (
          <GeographyView geography={data.stockGeography} measure={stockGeoMeasure} year={stockYear} />
        ) : isStockVacancy ? (
          <VacancyView vacancy={data.vacancy} secondHomes={data.secondHomes} />
        ) : isStockTenure ? (
          <TenureView tenure={data.tenure} />
        ) : isStockData ? (
          <StockData data={data} />
        ) : isSupplyMachine ? (
          <SupplyMachine machine={data.supplyMachine} state={supplyState} onChange={setSupply} />
        ) : isSupplyGeography ? (
          <SupplyGeography
            geography={supplyGeo}
            measure={geographyMeasure}
            area={mapArea}
            onArea={(code) => setQuery({ area: code })}
          />
        ) : isWhoBuilds ? (
          <WhoBuilds whoBuilds={data.whoBuilds} mode={whoBuildsMode} />
        ) : isSupplyData ? (
          <SupplyData data={data} />
        ) : isLandData ? (
          <LandData data={data} />
        ) : isLandDecisionMachine ? (
          planningInstrument === "appeals" ? (
            <AppealsCasework appeals={data.planningAppeals} />
          ) : planningInstrument === "plans" ? (
            <LocalPlans plans={data.localPlans} />
          ) : (
            <PlanningDecisionMachine
              planning={data.planningFlow}
              quarterIndex={planningQuarterIndex}
              focus={planningFocus}
              onFocus={(next) => setQuery({ pf: next })}
            />
          )
        ) : isLandExplorer ? (
          <LandExplorer england={data.brownfield} code={lad || null} onCode={(next) => setQuery({ lad: next })} />
        ) : isLandSites ? (
          <DevelopmentSites sites={data.brownfield} focus={sitesFocus} />
        ) : isLandHistory ? (
          <HistoricalChange
            greenBelt={data.greenBelt}
            year={gbHistoryYear}
            focusPlace={gbFocusPlace}
            onFocusPlace={(name) => {
              setGbPlaceSearch(name ?? "");
              setQuery({ gbp: name });
            }}
          />
        ) : isQualityInside ? (
          <InsideHomes
            state={insideState}
            onChange={setInsideState}
            evidence={qualityEvidence}
            failed={qualityFailed}
          />
        ) : isQualityEnergy ? (
          <EnergyView
            state={energyState}
            onChange={setEnergyState}
            evidence={qualityEvidence}
            failed={qualityFailed}
          />
        ) : isQualityGeography ? (
          <QualityGeography
            state={geographyState}
            onChange={setGeographyState}
            evidence={qualityEvidence}
            failed={qualityFailed}
          />
        ) : isQualityCondition ? (
          <StateOfRepair
            state={conditionState}
            onChange={setConditionState}
            evidence={qualityEvidence}
            failed={qualityFailed}
          />
        ) : isQualityData ? (
          <QualityData
            state={qualityDataState}
            onChange={setQualityDataState}
            evidence={qualityEvidence}
            failed={qualityFailed}
          />
        ) : isInsecurityPathways ? (
          <Pathways insecurity={data.insecurity} state={pathwaysState} />
        ) : isInsecurityTemporary ? (
          <TemporaryLife insecurity={data.insecurity} type={taType} />
        ) : isInsecurityDisplacement ? (
          <Displacement
            insecurity={data.insecurity}
            area={mapArea}
            mode={displacementMode}
            onArea={(code) => setQuery({ area: code })}
          />
        ) : isInsecurityNeed ? (
          <HousingNeed insecurity={data.insecurity} year={needYear} />
        ) : isInsecurityCost ? (
          <CostOfInsecurity insecurity={data.insecurity} year={costYear} />
        ) : isInsecurityData ? (
          <InsecurityData insecurity={data.insecurity} sources={data.sources} seriesId={insecuritySeries} />
        ) : isOwnershipNetwork ? (
          <WhoOwns
            titles={data.ownership.titles}
            owner={titleOwner}
            area={mapArea}
            onArea={(code) => setQuery({ area: code })}
          />
        ) : isOwnershipMortgages ? (
          <MortgageMachine ownership={data.ownership} mortgageRate={data.mortgageRate} />
        ) : isOwnershipWealth ? (
          <PropertyWealth ownership={data.ownership} ageId={wealthAgeId} />
        ) : isOwnershipData ? (
          <OwnershipData ownership={data.ownership} />
        ) : isPolicy ? (
          <PolicyCanvas view={policyView} state={policyState} onChange={setQuery} />
        ) : isRentBody ? (
          <RentCanvas
            view={view}
            lettingsView={lettingsView}
            placeName={rent.placeName}
            focus={rent.focus}
            unit={rent.unit}
            plotted={rent.plotted}
            table={rent.table}
            emptyReason={rent.emptyReason}
            loading={rent.loading}
            error={rent.error}
            insecurity={data.insecurity}
          />
        ) : isPricesData ? (
          <PricesData data={data} />
        ) : isAffordData ? (
          <AffordabilityData data={data} />
        ) : isTable ? (
          <DataTable series={clipped} cadence={stage.cadence} format={stage.format} />
        ) : isTransactions ? (
          <div className={gen.stack}>
            <PricePaidSearch apiBase={apiBase()} meta={data.pricePaid} />
            <section className={gen.panel} aria-labelledby="hpi-volume-title">
              <h3 id="hpi-volume-title" className={explorerClasses.stageTitle}>
                Monthly transaction count
              </h3>
              {stage.plot(clipped, stage.cadence)}
            </section>
          </div>
        ) : (
          stage.plot(clipped, stage.cadence)
        )}
      </Stage>
    </Explorer>
  );
}

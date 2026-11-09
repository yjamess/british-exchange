"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Stage,
  EmptyStage,
  FigureRecord,
  SourceLine,
  DataTable,
  REF_ICON_PLATES,
  type ExplorerDomain,
  type PrintOption,
  type SourceRow,
} from "../..";
import type { HousingV1, Source } from "../load";
import { apiBase } from "@/lib/api";
import { CornerCloud } from "../CornerCloud";
import { PricePaidSearch } from "./PricePaidSearch";
import { PricesData } from "./PricesData";
import { PricesMapStage, type PricesMapPayload } from "./PricesMapStage";
import {
  AffordabilityExperiment,
  parseScenarioParams,
  scenarioToQuery,
} from "./affordability/AffordabilityExperiment";
import { WhoCanAfford } from "./affordability/WhoCanAfford";
import { AgesView, agesReading } from "./affordability/AgesView";
import { AffordabilityData } from "./affordability/AffordabilityData";
import { normaliseScenario, scenarioDefaults } from "./affordability/scenario";
import { ChangingHousingFabric } from "./stock/ChangingHousingFabric";
import { TypesView } from "./stock/TypesView";
import { GeographyView } from "./stock/GeographyView";
import { VacancyView } from "./stock/VacancyView";
import { TenureView } from "./stock/TenureView";
import { StockData } from "./stock/StockData";
import { SupplyMachine, isTermId, type SupplyMachineState } from "./supply/SupplyMachine";
import { SupplyGeography } from "./supply/SupplyGeography";
import { WhoBuilds } from "./supply/WhoBuilds";
import { SupplyData } from "./supply/SupplyData";
import { LandData } from "./land/LandData";
import { PlanningDecisionMachine } from "./land/PlanningDecisionMachine";
import { DevelopmentSites } from "./land/DevelopmentSites";
import { HistoricalChange } from "./land/HistoricalChange";
import { InsideHomes, type InsideFoot } from "./quality/InsideHomes";
import { EnergyView } from "./quality/EnergyView";
import { StateOfRepair } from "./quality/StateOfRepair";
import { QualityGeography } from "./quality/QualityGeography";
import { QualityData } from "./quality/QualityData";
import { LandExplorer } from "./land/LandExplorer";
import { Pathways, type PathwaysState } from "./insecurity/Pathways";
import { WhoOwns, isCategory, isRecordId, type Category, type RecordId } from "./ownership/WhoOwns";
import { MortgageMachine } from "./ownership/MortgageMachine";
import { PropertyWealth } from "./ownership/PropertyWealth";
import { OwnershipData } from "./ownership/OwnershipData";
import { PolicyCanvas } from "./policy/PolicyCanvas";
import { POLICY_RETRIEVED, coverage as policyCoverage, eventById, formatIso as policyDate } from "./policy/events";
import { TemporaryLife } from "./insecurity/TemporaryLife";
import { Displacement, type DisplacementMode } from "./insecurity/Displacement";
import { keyParam, parseKeyParam } from "./insecurity/periods";
import { HousingNeed } from "./insecurity/HousingNeed";
import { InsecurityData } from "./insecurity/InsecurityData";
import { RentCanvas } from "./renting/RentCanvas";
import { MAX_RENT_PLACES, RENT_UK, applyWindow, categoryLabel, rentAreasParam } from "./renting/selection";
import { useRenting } from "./renting/useRenting";
import {
  DOMAINS,
  MAX_HISTORY_PLACES,
  VIEWS,
  figuresFor,
  pricesMapReading,
  stageFor,
  transactionVolumeLead,
  yearOf,
  type Controls,
  type DomainId,
} from "./model";
import s from "./explorer.module.css";

/**
 * Housing explorer — the brand template's Explorer (web/src/brand/template) with Housing's data,
 * URL state and special stages (maps, Price Paid, affordability, stock).
 * Layout, rail, carriage, loupe, menus and dual scramble all come from the template.
 * Shareable URL: ?domain=&view=&place=&measure=&from=&to=&date=&area=&lad=
 * History `place` is comma-separated codes (uk,E12000007,…); Map keeps its own date/area/compare/type.
 * Affordability experiment: ?earn=&dep=&rate=&term=&lti=
 * Housing insecurity: Pathways ?place=&node=&q=2026Q1&read=table · Temporary ?ta= · Displacement ?area=&mode=share · Need ?yr=
 */

const MEASURE_OPTIONS: PrintOption<Controls["measure"]>[] = [
  { value: "level", label: "Average price" },
  { value: "change", label: "Annual change" },
  { value: "real", label: "Real price (CPI)" },
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
  const regionCodes = useMemo(() => new Set(data.regions.map((r) => r.code)), [data.regions]);
  const placeRaw = searchParams.get("place");
  const places = useMemo(() => parsePlaces(placeRaw, regionCodes), [placeRaw, regionCodes]);
  const rawMeasure = searchParams.get("measure");
  const measure: Controls["measure"] =
    rawMeasure === "change" ? "change" : rawMeasure === "real" ? "real" : "level";
  const rawSegment = searchParams.get("segment");
  const segment: Controls["segment"] =
    rawSegment === "ftb" ? "ftb" : rawSegment === "finance" ? "finance" : "new";
  const [qualityIndicator, setQualityIndicator] = useState(searchParams.get("qi") ?? "");
  const [insideFoot, setInsideFoot] = useState<InsideFoot | null>(null);
  const onInsideFoot = useCallback((next: InsideFoot) => {
    setInsideFoot((cur) =>
      cur &&
      cur.source === next.source &&
      cur.coverage === next.coverage &&
      cur.dataHref === next.dataHref &&
      cur.caveats.join("\n") === next.caveats.join("\n") &&
      (cur.definition ?? []).join("\n") === (next.definition ?? []).join("\n")
        ? cur
        : next,
    );
  }, []);
  const controls = useMemo<Controls>(
    () => ({ places, measure, segment, qualityIndicator }),
    [places, measure, segment, qualityIndicator],
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
  const benchmarkCode = searchParams.get("bench") ?? "uk";
  const priceBenchmarks = useMemo(
    () => [
      { code: "uk", name: "United Kingdom", points: data.price },
      ...[...data.regions]
        .sort((a, b) => a.name.localeCompare(b.name, "en-GB"))
        .map((place) => ({ code: place.code, name: place.name, points: place.points })),
    ],
    [data.price, data.regions],
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

  // Domain 05 Supply Machine — place (England or an English region), FY start year, comparison, term.
  const supplyState = useMemo<SupplyMachineState>(() => {
    const known = data.supplyMachine.byPlace;
    const code = (placeRaw ?? "").split(",").map((p) => p.trim()).find((p) => p in known) ?? "E92000001";
    const vsRaw = num(searchParams.get("vs"));
    const partRaw = searchParams.get("part");
    return { place: code, year: toParam, vs: vsRaw, part: isTermId(partRaw) ? partRaw : null };
  }, [data.supplyMachine.byPlace, placeRaw, toParam, searchParams]);
  const setSupply = (next: Partial<SupplyMachineState>) =>
    setQuery({
      ...("place" in next ? { place: next.place === "E92000001" ? null : (next.place ?? null) } : {}),
      ...("year" in next ? { to: next.year != null ? String(next.year) : null, from: null } : {}),
      ...("vs" in next ? { vs: next.vs != null ? String(next.vs) : null } : {}),
      ...("part" in next ? { part: next.part ?? null } : {}),
    });

  // Domain 09 Who owns — the network's category filter and selected record.
  const rawCat = searchParams.get("cat");
  const rawRec = searchParams.get("rec");
  const networkCategory: Category = isCategory(rawCat) ? rawCat : "all";
  const networkRecord: RecordId | null = isRecordId(rawRec) ? rawRec : null;
  const setNetwork = (next: { category?: Category; record?: RecordId | null }) =>
    setQuery({
      ...("category" in next ? { cat: next.category === "all" ? null : (next.category ?? null) } : {}),
      ...("record" in next ? { rec: next.record ?? null } : {}),
    });

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
  const stage = useMemo(() => stageFor(active, view, controls, data), [active, view, controls, data]);
  const figures = useMemo(
    () => (active === "renting" ? rent.figures : figuresFor(active, data, view, controls)),
    [active, rent.figures, data, view, controls],
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
  const isInsecurityData = active === "insecurity" && view === "table";
  const isOwnershipNetwork = active === "ownership" && (view === "ownership" || view === "");
  const isOwnershipMortgages = active === "ownership" && view === "mortgages";
  const isOwnershipWealth = active === "ownership" && view === "wealth";
  const isOwnershipData = active === "ownership" && view === "table";
  const isPolicy = active === "policy";
  const policyEventId = searchParams.get("event");
  const policyEraId = searchParams.get("era");
  const policyEvent = isPolicy ? eventById(policyEventId) : null;
  const policyView =
    view === "eras" || view === "observatory" || view === "promise" || view === "archive" || view === "time" || view === "table"
      ? view
      : "time";
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
    !isInsecurityData &&
    !isOwnershipNetwork &&
    !isOwnershipMortgages &&
    !isOwnershipWealth &&
    !isOwnershipData &&
    (bounds || stage.place || stage.measure || isSegments);

  const noteRows = (notes?: string[]): SourceRow[] =>
    (notes ?? []).filter(Boolean).map((text) => ({ label: "Reading", text }));
  const catalogueFoot = !(isMap && activeMap) && !isPolicy && !isOwnershipNetwork;
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
      ? [
          policyEvent
            ? {
                label: "Primary record",
                text: policyEvent.title,
                linkLabel: policyEvent.citation,
              }
            : {
                label: "Register",
                text: "data/housing/policy-events",
                linkLabel: `${policyCoverage().total} records checked against their primary sources, ${policyDate(POLICY_RETRIEVED)}`,
              },
        ]
      : isOwnershipNetwork
          ? [
              {
                label: "Register",
                text: "Commercial and corporate ownership data · HM Land Registry",
                linkLabel: "Illustrative records. No named company or title is drawn until a CCOD or OCOD release is pinned.",
              },
            ]
          : isRenting && view === "tenancies"
            ? [
                {
                  label: "Reading",
                  text:
                    lettingsView === "needs"
                      ? "General needs: housing not designated for a specific group requiring support. Supported housing: facilities or features for a group requiring support. Neither describes tenancy length or security."
                      : lettingsView === "rent"
                        ? "Social rent, affordable rent and intermediate rent are three ways of charging for the same new lettings. They are not monthly rents in pounds."
                        : lettingsView === "data"
                          ? "New social housing lettings in England, financial years April to March. Rent type and needs type are separate breakdowns of the same total."
                          : "Counts are new lettings, not unique households, newly built homes or private tenancy starts. Existing homes can be relet.",
                },
              ]
            : [
                ...noteRows(isRenting ? rent.reading : stage?.reading),
                ...(isAges ? noteRows([agesReading(agesView)]) : []),
              ];

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
      decor={<CornerCloud />}
    >
      {/* 1 · Head: where you are, the question, the views */}
      <ExplorerHead views={views} view={view} onView={selectView} />

      {/* 2 · Figures: the domain at a glance */}
      <FigureStrip figures={figures} />
      {showRentControls && rent.periodNote ? (
        <p className="bo-label">{rent.periodNote}</p>
      ) : periodInvalid ? (
        <p className="bo-label">The period in the link does not cover this series, so the full series is shown.</p>
      ) : showControls && stage && view !== "pipeline" && (fromParam !== null || toParam !== null) ? (
        <p className="bo-label">Headline figures: latest available. Chart and exact values: selected period.</p>
      ) : null}

      {showRentControls && (
        <ControlRow>
          <MultiMenuControl
            label="Places"
            values={rent.areas}
            options={rentPlaceOptions}
            onChange={(next) => setQuery({ area: rentAreasParam(next.length > 0 ? next : [RENT_UK]) })}
          />
          <MenuControl
            label="Property"
            value={rent.category}
            options={rent.homeOptions.map((id) => ({ value: id, label: categoryLabel(id) }))}
            onChange={(id) => setQuery({ bed: id === "all" ? null : id })}
          />
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
                ...data.regions.map((r) => {
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
                ? "Private rent · ages 16–34 · England"
                : agesView === "mortgage"
                  ? "Mortgage payment by age · England"
                  : "Housing costs by age · England"
              : isMap
                ? mapTitle
                : (stage?.title ?? domain.title)
        }
        bar={stageBar}
        framed={!(active === "supply" && view === "pipeline")}
        size={isMap ? "wide" : isRenting && view === "tenancies" && lettingsView === "needs" ? "compact" : "normal"}
        expandable={active === "insecurity" || isOwnershipNetwork}
        foot={
          domain.status === "preparation" ? undefined : (isQualityInside || isQualityEnergy || isQualityCondition || isQualityGeography || isQualityData || isStockGeography || isSupplyGeography || isLandDecisionMachine || active === "ownership") && insideFoot ? (
            <FigureRecord
              source={insideFoot.source}
              dataHref={insideFoot.dataHref}
              definition={insideFoot.definition}
              method={[
                insideFoot.coverage ? `Coverage. ${insideFoot.coverage}` : "",
                insideFoot.caveats.length ? `Caveats. ${insideFoot.caveats.join(" ")}` : "",
                ...(Array.isArray(stage?.derived) ? stage.derived : stage?.derived ? [stage.derived] : []),
              ].filter(Boolean)}
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
            onBenchmark={(code) => setQuery({ bench: code === "uk" ? null : code })}
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
            onBreakdown={(value) => setQuery({ view: "ages", ages: value === "share" ? null : value })}
          />
        ) : isComposition ? (
          <ChangingHousingFabric tenure={data.tenure} />
        ) : isStockTypes ? (
          <TypesView types={data.dwellingTypes} />
        ) : isStockGeography ? (
          <GeographyView geography={data.stockGeography} onFoot={onInsideFoot} />
        ) : isStockVacancy ? (
          <VacancyView vacancy={data.vacancy} secondHomes={data.secondHomes} />
        ) : isStockTenure ? (
          <TenureView tenure={data.tenure} />
        ) : isStockData ? (
          <StockData data={data} />
        ) : isSupplyMachine ? (
          <SupplyMachine machine={data.supplyMachine} state={supplyState} onChange={setSupply} />
        ) : isSupplyGeography ? (
          <SupplyGeography geography={data.supplyGeography} onFoot={onInsideFoot} />
        ) : isWhoBuilds ? (
          <WhoBuilds whoBuilds={data.whoBuilds} />
        ) : isSupplyData ? (
          <SupplyData data={data} />
        ) : isLandData ? (
          <LandData data={data} />
        ) : isLandDecisionMachine ? (
          <PlanningDecisionMachine planning={data.planningFlow} onFoot={onInsideFoot} />
        ) : isLandExplorer ? (
          <LandExplorer england={data.brownfield} code={lad || null} onCode={(next) => setQuery({ lad: next })} />
        ) : isLandSites ? (
          <DevelopmentSites sites={data.brownfield} />
        ) : isLandHistory ? (
          <HistoricalChange greenBelt={data.greenBelt} />
        ) : isQualityInside ? (
          <InsideHomes onFoot={onInsideFoot} />
        ) : isQualityEnergy ? (
          <EnergyView onFoot={onInsideFoot} />
        ) : isQualityGeography ? (
          <QualityGeography onFoot={onInsideFoot} />
        ) : isQualityCondition ? (
          <StateOfRepair onFoot={onInsideFoot} />
        ) : isQualityData ? (
          <QualityData
            indicator={qualityIndicator}
            onIndicator={(id) => {
              setQualityIndicator(id);
              setQuery({ qi: id });
            }}
            onFoot={onInsideFoot}
          />
        ) : isInsecurityPathways ? (
          <Pathways insecurity={data.insecurity} state={pathwaysState} onChange={setPathways} />
        ) : isInsecurityTemporary ? (
          <TemporaryLife insecurity={data.insecurity} type={taType} onType={(id) => setQuery({ ta: id })} />
        ) : isInsecurityDisplacement ? (
          <Displacement
            insecurity={data.insecurity}
            area={mapArea}
            mode={displacementMode}
            onChange={(next) =>
              setQuery({
                ...("area" in next ? { area: next.area ?? null } : {}),
                ...("mode" in next ? { mode: next.mode ?? null } : {}),
              })
            }
          />
        ) : isInsecurityNeed ? (
          <HousingNeed
            insecurity={data.insecurity}
            year={needYear}
            onYear={(y) => setQuery({ yr: y != null ? String(y) : null })}
          />
        ) : isInsecurityData ? (
          <InsecurityData insecurity={data.insecurity} sources={data.sources} />
        ) : isOwnershipNetwork ? (
          <WhoOwns category={networkCategory} record={networkRecord} onChange={setNetwork} onFoot={onInsideFoot} />
        ) : isOwnershipMortgages ? (
          <MortgageMachine
            ownership={data.ownership}
            mortgageRate={data.mortgageRate}
            onFoot={onInsideFoot}
          />
        ) : isOwnershipWealth ? (
          <PropertyWealth ownership={data.ownership} onFoot={onInsideFoot} />
        ) : isOwnershipData ? (
          <OwnershipData sources={data.sources} onFoot={onInsideFoot} />
        ) : isPolicy ? (
          <PolicyCanvas
            view={policyView}
            eventId={policyEventId}
            eraId={policyEraId}
            onSelect={(id) => setQuery({ event: id })}
            onEra={(id) => setQuery({ era: id, event: null })}
          />
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
            onLettings={(value) => setQuery({ view: "tenancies", lettings: value === "history" ? null : value })}
          />
        ) : isPricesData ? (
          <PricesData data={data} />
        ) : isAffordData ? (
          <AffordabilityData data={data} />
        ) : isTable ? (
          <DataTable series={clipped} cadence={stage.cadence} format={stage.format} />
        ) : isTransactions ? (
          <div className={s.transactionsStage}>
            <PricePaidSearch apiBase={apiBase()} meta={data.pricePaid} />
            <section className={s.transactionsVolume} aria-labelledby="hpi-volume-title">
              <h3 id="hpi-volume-title" className={s.sectionTitle}>
                Monthly transaction count
              </h3>
              <p className={s.pricePaidLead}>{transactionVolumeLead(data)}</p>
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

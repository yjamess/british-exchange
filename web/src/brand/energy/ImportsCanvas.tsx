"use client";

/**
 * Energy Domain 05 — Energy Imports & Security.
 * Flagship Study D: The lifelines map = country choropleth (Oil/Gas) + measured ranks
 * (no invented routes). LNG stays RankBars until terminal coordinates are pinned.
 * Supporting: Resilience Test · Shock and response · Britain's connectors · Gross trade.
 * Net ≠ gross. GWh ≠ ktoe ≠ thousand tonnes. Never one fabricated security score.
 * Dependency Dial retired. Gross trade is the home for ktoe imports/exports.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { WorldChoropleth } from "../map";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { DecisionLedger, type LedgerEvent } from "../policy";
import {
  ControlRow,
  EmptyStage,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  ResetButton,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
} from "../template";
import {
  EnergyStageFollow,
} from "../connections";
import { ENERGY_SOURCE } from "./citations";
import { energySource } from "./source";
import { viewReset } from "./reset";
import { ImportsData } from "./ImportsData";
import { IMPORTS_VIEWS } from "./views";
import {
  BASES,
  GAS_MODES,
  GAS_TRADE_BY_PARTNER_ID,
  IMPORT_DEPENDENCY_ID,
  IMPORTS_EXPORTS_ID,
  INTERCONNECTOR_FLOWS,
  INTERCONNECTOR_FLOWS_ID,
  LIFELINE_FUELS,
  LIFELINE_LIST_MODES,
  LIFELINE_RANK_TOP,
  LNG_IMPORTS_BY_TERMINAL_ID,
  OIL_IMPORTS_BY_COUNTRY_ID,
  dependencySeries,
  gasStorageSeries,
  dependencyValueInYear,
  flowsForFuel,
  fmtDependencyPct,
  fmtGWh,
  fmtKtoe,
  fmtLifeline,
  fmtMw,
  gasPartnerRanks,
  gasPartnerSeries,
  interconnectorBuiltCapacityRanks,
  interconnectorCapacityPinDate,
  interconnectorCorridorYearTable,
  interconnectorSeries,
  interconnectorYearSum,
  lifelineYears,
  lngTerminalRanks,
  lngTerminalSeries,
  oilPartnerRanks,
  oilPartnerSeries,
  ratioSeries,
  ratioValueInYear,
  tradeAnnualSum,
  tradeGrossSeries,
  yearsOf,
  type DependencyBasis,
  type GasMode,
  type ImportsPack,
  type InterconnectorFlow,
  type LifelineFlow,
  type LifelineFuel,
  type LifelineListMode,
} from "./imports-model";
import { isoForPartnerLabel } from "./partner-geo";
import {
  EMPTY_SHOCK_EVENTS_PACK,
  SHOCK_KIND_LABEL,
  defaultShockId,
  formatMarkDate,
  markYear as shockMarkYear,
  shockById,
  type ShockEvent,
  type ShockEventsPack,
} from "./imports-shock-events";
import s from "./generation.module.css";

/** One unit per cable panel: TWh, two decimals (a small corridor reads 0.44 TWh, not 441 GWh). */
const fmtTWhFixed = (gwh: number) => `${gwh < 0 ? "−" : ""}${(Math.abs(gwh) / 1000).toFixed(2)} TWh`;
/** ISO date → "5 November 2026". */
const fmtDay = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

function shockToLedgerEvent(event: ShockEvent): LedgerEvent {
  const primary = event.sources.find((src) => src.role === "primary") ?? event.sources[0];
  return {
    id: event.id,
    year: String(shockMarkYear(event)),
    title: event.title,
    typeLabel: SHOCK_KIND_LABEL[event.kind],
    summary: event.summary,
    extent: `${event.jurisdiction}. ${event.alternate_reading.replace(/\b(?:Quarterly\s+)?ET\s*\d+(?:\.\d+)?\s*/g, "Quarterly ").replace(/Quarterly Quarterly /g, "Quarterly ")}`,
    citation: primary?.label ?? event.title,
    markLabel: event.mark_label,
    markValue: formatMarkDate(event.mark_date),
    status: "",
    applies: event.jurisdiction,
    commencement: "",
    sources: event.sources.map((src) => ({ label: src.label, href: src.url })),
    context: event.follow.map((f, i) => ({
      id: `${event.id}-follow-${i}`,
      title: f.label,
      href: f.href,
      note: "Opens in Energy imports and security",
    })),
  };
}

const VIEWS: ExplorerView[] = [...IMPORTS_VIEWS];

/** Retired Dependency Dial → Resilience (ratio lives there; gross trade is its own tab). */
const RETIRED_VIEWS: Record<string, string> = { dependency: "resilience" };

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function asBasis(v: string | null): DependencyBasis {
  return BASES.includes(v as DependencyBasis) ? (v as DependencyBasis) : "annual";
}

function asIcFlow(v: string | null): InterconnectorFlow {
  return INTERCONNECTOR_FLOWS.includes(v as InterconnectorFlow)
    ? (v as InterconnectorFlow)
    : "Net imports";
}

function asFuel(v: string | null): LifelineFuel {
  return LIFELINE_FUELS.includes(v as LifelineFuel) ? (v as LifelineFuel) : "oil";
}

function asListMode(v: string | null): LifelineListMode {
  return LIFELINE_LIST_MODES.includes(v as LifelineListMode) ? (v as LifelineListMode) : "top";
}

function asLifelineFlow(v: string | null, fuel: LifelineFuel): LifelineFlow {
  const allowed = flowsForFuel(fuel);
  if (v && allowed.includes(v as LifelineFlow)) return v as LifelineFlow;
  return allowed[0]!;
}

function asGasMode(v: string | null): GasMode {
  return GAS_MODES.includes(v as GasMode) ? (v as GasMode) : "Combined";
}

function initialViewFromParams(v: string | null): string {
  if (v && RETIRED_VIEWS[v]) return RETIRED_VIEWS[v]!;
  return VIEWS.some((x) => x.id === v) ? v! : "lifelines";
}

export function ImportsCanvas({
  pack,
  shockEvents = EMPTY_SHOCK_EVENTS_PACK,
}: {
  pack: ImportsPack;
  shockEvents?: ShockEventsPack;
}) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("imports");
  const events = shockEvents.events;
  const shockRetrieved = shockEvents.retrieved_at;
  const depRows = pack.dependency?.observations ?? [];
  const tradeRows = pack.trade?.observations ?? [];
  const icRows = pack.interconnectors?.observations ?? [];
  const icCapRows = pack.interconnectorCapacity?.observations ?? [];
  const oilRows = pack.oilPartners?.observations ?? [];
  const gasRows = pack.gasPartners?.observations ?? [];
  const lngRows = pack.lngTerminals?.observations ?? [];
  const fossilRows = pack.fossilDependency?.observations ?? [];
  const lowCarbonRows = pack.lowCarbonShare?.observations ?? [];
  const gasStorageRows = pack.gasStorage?.observations ?? [];

  const [view, setView] = useState(() => initialViewFromParams(searchParams.get("view")));
  const [basis, setBasis] = useState<DependencyBasis>(() => asBasis(searchParams.get("basis")));
  const [fuel, setFuel] = useState<LifelineFuel>(() => asFuel(searchParams.get("fuel")));
  const [flow, setFlow] = useState<LifelineFlow>(() =>
    asLifelineFlow(
      initialViewFromParams(searchParams.get("view")) === "lifelines"
        ? searchParams.get("flow")
        : null,
      asFuel(searchParams.get("fuel")),
    ),
  );
  const [icFlow, setIcFlow] = useState<InterconnectorFlow>(() =>
    asIcFlow(
      initialViewFromParams(searchParams.get("view")) === "connectors"
        ? searchParams.get("flow")
        : null,
    ),
  );
  const [mode, setMode] = useState<GasMode>(() => asGasMode(searchParams.get("mode")));
  const [partner, setPartner] = useState(() => searchParams.get("partner") ?? "");
  const [listMode, setListMode] = useState<LifelineListMode>(() => asListMode(searchParams.get("list")));
  const [eventId, setEventId] = useState(() => {
    const fromUrl = searchParams.get("event");
    return shockById(events, fromUrl) ? fromUrl! : defaultShockId(events);
  });

  const tradeSeries = tradeGrossSeries(tradeRows).map((sr) => ({
    ...sr,
    label: sr.id === "trade-exports" ? "Exports" : "Imports",
    points: sr.points.map((pt) => ({ ...pt, v: Math.abs(pt.v) })),
  }));
  const depYears = yearsOf(depRows.filter((r) => (r.notes ?? "").includes("basis=annual")));
  const tradeYears = yearsOf(tradeRows);
  const icYears = yearsOf(icRows);
  const gasYears = yearsOf(gasRows);
  const lineYears = lifelineYears(fuel, oilRows, gasRows, lngRows);
  const latest =
    lineYears.at(-1) ??
    depYears.at(-1) ??
    tradeYears.at(-1) ??
    icYears.at(-1) ??
    2025;
  const [year, setYear] = useState(() =>
    clampYear(
      Number(searchParams.get("year") || latest),
      lineYears.length ? lineYears : depYears.length ? depYears : [latest],
      latest,
    ),
  );

  // Rewrite retired ?view=dependency bookmarks onto Resilience.
  useEffect(() => {
    if (searchParams.get("view") !== "dependency") return;
    writeUrl({ view: "resilience" });
  }, [searchParams, writeUrl]);

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        year: number;
        basis: DependencyBasis;
        ic_flow: InterconnectorFlow;
        fuel: LifelineFuel;
        flow: LifelineFlow;
        mode: GasMode;
        partner: string;
        list: LifelineListMode;
        event: string | null;
      }>,
    ) => {
      const nextView = patch.view ?? view;
      const nextFuel = patch.fuel ?? fuel;
      const nextFlow =
        patch.flow !== undefined
          ? asLifelineFlow(patch.flow, nextFuel)
          : patch.fuel
            ? asLifelineFlow(null, nextFuel)
            : asLifelineFlow(flow, nextFuel);
      const nextIc = patch.ic_flow ?? icFlow;
      const nextPartner = patch.fuel && patch.partner === undefined ? "" : (patch.partner ?? partner);
      const nextList = patch.list ?? listMode;
      const nextEvent =
        patch.event !== undefined
          ? patch.event === null || patch.event === ""
            ? ""
            : (shockById(events, patch.event)?.id ?? "")
          : patch.view === "shock" && !eventId
            ? defaultShockId(events)
            : eventId;
      const shockEv = shockById(events, nextEvent);
      const nextYear =
        patch.year !== undefined
          ? patch.year
          : patch.event !== undefined && shockEv
            ? shockMarkYear(shockEv)
            : patch.view === "shock" && shockEv
              ? shockMarkYear(shockEv)
              : year;
      const nextBasis = patch.basis ?? basis;
      const nextMode = patch.mode ?? mode;

      setView(nextView);
      setYear(nextYear);
      setBasis(nextBasis);
      setIcFlow(nextIc);
      setFuel(nextFuel);
      setFlow(nextFlow);
      setMode(nextMode);
      setPartner(nextPartner);
      setListMode(nextList);
      setEventId(nextEvent);

      writeUrl({
        view: nextView,
        year: nextYear,
        basis: nextBasis,
        fuel: nextFuel,
        mode: nextMode,
        // `flow` is view-scoped: lifelines partners vs connectors corridors.
        flow: nextView === "connectors" ? nextIc : nextFlow,
        partner: nextPartner || null,
        list: nextView === "lifelines" && nextList !== "top" ? nextList : null,
        event: nextView === "shock" && nextEvent ? nextEvent : null,
        ic_flow: null,
      });
    },
    [view, year, basis, icFlow, fuel, flow, mode, partner, listMode, eventId, events, writeUrl],
  );

  const fossilYears = yearsOf(fossilRows.filter((r) => (r.notes ?? "").includes("basis=annual")));
  const lowCarbonYears = yearsOf(
    lowCarbonRows.filter((r) => (r.notes ?? "").includes("basis=annual")),
  );
  // Prefer years common to every loaded ratio series; if a pack failed to load, do not
  // empty the menu by requiring the missing series (Session A: intermittent fossil null).
  const resilienceYearSets = [depYears, fossilYears, lowCarbonYears].filter((ys) => ys.length > 0);
  const resilienceYears =
    resilienceYearSets.length === 0
      ? []
      : resilienceYearSets
          .slice(1)
          .reduce((acc, ys) => acc.filter((yy) => ys.includes(yy)), resilienceYearSets[0]!);
  const yearPool =
    view === "lifelines" ? lineYears
      : view === "resilience" ? resilienceYears
        : view === "connectors" ? icYears
          : view === "trade" ? tradeYears : [];
  const y = clampYear(year, yearPool, latest);

  const oilRank = useMemo(() => oilPartnerRanks(oilRows, y), [oilRows, y]);
  const gasRank = useMemo(() => gasPartnerRanks(gasRows, y, flow, mode), [gasRows, y, flow, mode]);
  const lngRank = useMemo(() => lngTerminalRanks(lngRows, y), [lngRows, y]);

  const rankList =
    fuel === "oil" ? oilRank.partners : fuel === "gas" ? gasRank.partners : lngRank.terminals;
  const rankTotal =
    fuel === "oil" ? oilRank.total : fuel === "gas" ? gasRank.total : lngRank.total;
  const netOnly = fuel === "gas" && gasRank.netOnly;

  const activePartner = useMemo(() => {
    if (netOnly) return "net";
    if (partner && (rankList.some((r) => r.id === partner) || partner === "total")) return partner;
    return rankList[0]?.id ?? (rankTotal ? "total" : "");
  }, [partner, rankList, rankTotal, netOnly]);

  const history = useMemo(() => {
    if (fuel === "oil") return oilPartnerSeries(oilRows, activePartner || "total");
    if (fuel === "gas") return gasPartnerSeries(gasRows, activePartner || "total", flow, mode);
    return lngTerminalSeries(lngRows, activePartner || "total");
  }, [fuel, oilRows, gasRows, lngRows, activePartner, flow, mode]);

  const valuedRanks = rankList.filter((r) => r.value !== 0 || fuel === "lng");
  const topRanks = valuedRanks.slice(0, LIFELINE_RANK_TOP);
  const shownRanks = listMode === "all" ? valuedRanks : topRanks;
  const fmtLine = (v: number) => fmtLifeline(fuel, v);

  const mapRows = useMemo(() => {
    if (fuel === "lng" || netOnly) return [];
    const out: { id: string; value: number | null; display: string; partnerId: string }[] = [];
    for (const r of valuedRanks) {
      const iso = isoForPartnerLabel(r.label);
      if (!iso) continue;
      out.push({
        id: iso,
        value: Math.abs(r.value),
        display: `${r.label} · ${fmtLifeline(fuel, r.value)}`,
        partnerId: r.id,
      });
    }
    return out;
  }, [fuel, netOnly, valuedRanks]);

  const selectedIso = useMemo(() => {
    const row = valuedRanks.find((r) => r.id === activePartner);
    return row ? isoForPartnerLabel(row.label) : null;
  }, [valuedRanks, activePartner]);

  const isoToPartnerId = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of mapRows) m.set(row.id, row.partnerId);
    return m;
  }, [mapRows]);

  const depY = dependencyValueInYear(depRows, y, "annual");
  const importsY = tradeAnnualSum(tradeRows, "Imports", y);
  const exportsY = tradeAnnualSum(tradeRows, "Exports", y);
  const icUkNet = interconnectorYearSum(icRows, y, "UK-total", icFlow);
  const icUkSeries = interconnectorSeries(icRows, "UK-total", icFlow);
  const icTable = interconnectorCorridorYearTable(icRows, y, icFlow);
  const icCapRanks = useMemo(
    () => interconnectorBuiltCapacityRanks(icCapRows),
    [icCapRows],
  );
  const icCapPin = interconnectorCapacityPinDate(icCapRows);
  const icCapTotal = icCapRanks.reduce((s, r) => s + r.value, 0);

  const depReady = Boolean(pack.dependency?.observations.length);
  const tradeReady = Boolean(pack.trade?.observations.length);
  const icReady = Boolean(pack.interconnectors?.observations.length);
  const icCapReady = Boolean(pack.interconnectorCapacity?.observations.length);
  const oilReady = Boolean(pack.oilPartners?.observations.length);
  const gasReady = Boolean(pack.gasPartners?.observations.length);
  const lngReady = Boolean(pack.lngTerminals?.observations.length);
  const fossilReady = Boolean(pack.fossilDependency?.observations.length);
  const lowCarbonReady = Boolean(pack.lowCarbonShare?.observations.length);
  const gasStorageReady = Boolean(pack.gasStorage?.observations.length);
  /** Any of the three ET 1.3 ratios is enough to draw; EmptyStage only when none loaded. */
  const resilienceReady = depReady || fossilReady || lowCarbonReady;
  const stockSeries = gasStorageSeries(gasStorageRows, "stock", "gas-stock", "Stock");
  const capacitySeries = gasStorageSeries(
    gasStorageRows,
    "storage_capacity",
    "gas-capacity",
    "Storage capacity",
  );
  const storageLines = [stockSeries, capacitySeries].filter((s) => s.points.length > 0);
  const lifelinesReady =
    (fuel === "oil" && oilReady) || (fuel === "gas" && gasReady) || (fuel === "lng" && lngReady);

  const fossilY = ratioValueInYear(fossilRows, y, "annual");
  const lowCarbonY = ratioValueInYear(lowCarbonRows, y, "annual");
  const fossilSeries = ratioSeries(fossilRows, basis, "fossil", "Fossil fuel dependency");
  const lowCarbonSeries = ratioSeries(lowCarbonRows, basis, "low-carbon", "Low carbon share");
  const resilienceLines = [
    ratioSeries(depRows, basis, "import-dep", "Import dependency"),
    fossilSeries,
    lowCarbonSeries,
  ].filter((series) => series.points.length > 0);

  const shockEvent = shockById(events, eventId);
  const shockSeries = useMemo(() => {
    if (!shockEvent) return [] as { id: string; label: string; points: { t: number; v: number; provisional?: boolean }[] }[];
    const chart = shockEvent.chart;
    if (chart.kind === "interconnector") {
      const series = interconnectorSeries(icRows, chart.corridor, chart.flow);
      return series.points.length ? [series] : [];
    }
    if (chart.kind === "gas-partners") {
      return chart.partners
        .map((id) => gasPartnerSeries(gasRows, id, chart.flow, chart.mode))
        .filter((s): s is NonNullable<typeof s> => Boolean(s?.points.length));
    }
    if (chart.kind === "oil-partner") {
      const series = oilPartnerSeries(oilRows, chart.partner);
      return series?.points.length ? [series] : [];
    }
    if (chart.kind === "lng-total") {
      const series = lngTerminalSeries(lngRows, "total");
      return series?.points.length ? [series] : [];
    }
    const series = dependencySeries(depRows, "annual");
    return series.points.length ? [series] : [];
  }, [shockEvent, icRows, gasRows, oilRows, lngRows, depRows]);

  const shockCadence =
    shockEvent?.chart.kind === "interconnector" ? ("quarterly" as const) : ("annual" as const);
  const shockUnitNote =
    shockEvent?.chart.kind === "interconnector"
      ? "Electricity · GWh"
      : shockEvent?.chart.kind === "gas-partners"
        ? "Gas · GWh"
        : shockEvent?.chart.kind === "oil-partner"
          ? "Oil · thousand tonnes"
          : shockEvent?.chart.kind === "lng-total"
            ? "LNG · GWh"
            : "Share of UK energy from abroad";
  const shockFmt =
    shockEvent?.chart.kind === "interconnector" ||
    shockEvent?.chart.kind === "gas-partners" ||
    shockEvent?.chart.kind === "lng-total"
      ? fmtGWh
      : shockEvent?.chart.kind === "oil-partner"
        ? (v: number) => fmtLifeline("oil", v)
        : fmtDependencyPct;
  const shockReady = shockSeries.length > 0;

  const figures: ExplorerFigure[] =
    view === "shock"
      ? shockEvent
        ? [
            {
              label: shockEvent.mark_label,
              value: formatMarkDate(shockEvent.mark_date),
              note: SHOCK_KIND_LABEL[shockEvent.kind],
            },
            {
              label: "Chart shows",
              value:
                shockEvent.chart.kind === "interconnector"
                  ? shockEvent.chart.corridor
                  : shockEvent.chart.kind === "gas-partners"
                    ? shockEvent.chart.partners.map((p) => p.toUpperCase()).join(" · ")
                    : shockEvent.chart.kind === "oil-partner"
                      ? shockEvent.chart.partner
                      : shockEvent.chart.kind === "lng-total"
                        ? "Total LNG"
                        : "Import dependency",
              note: shockUnitNote,
            },
            {
              label: "Sources",
              value: String(shockEvent.sources.length),
              note: `Checked ${fmtDay(shockRetrieved)}`,
            },
          ]
        : [
            {
              label: "Events",
              value: String(events.length),
              note: `Checked ${fmtDay(shockRetrieved)}`,
            },
            {
              label: "Event",
              value: "—",
              note: "Choose an event below",
            },
            {
              label: "Chart",
              value: "—",
              note: "Opens with the event",
            },
          ]
      : view === "resilience"
      ? [
          {
            label: `${y} import dependency`,
            value: depY != null ? fmtDependencyPct(depY) : "—",
            note: depY != null && depY < 0 ? "Below zero · Britain exported more than it imported" : "Share of UK energy from abroad",
          },
          {
            label: `${y} fossil fuel dependency`,
            value: fossilY != null ? fmtDependencyPct(fossilY) : "—",
            note: "Share of UK energy from coal, oil and gas",
          },
          {
            label: `${y} low carbon share`,
            value: lowCarbonY != null ? fmtDependencyPct(lowCarbonY) : "—",
            note: "Of total energy consumption",
          },
        ]
      : view === "lifelines"
      ? [
          {
            label: `${y} · ${fuel === "lng" ? "Top terminal" : "Top partner"}`,
            value: netOnly
              ? rankTotal
                ? fmtLine(rankTotal.value)
                : "—"
              : topRanks[0]
                ? topRanks[0].label
                : "—",
            note: netOnly
              ? "UK net · not by partner"
              : topRanks[0]
                ? fmtLine(topRanks[0].value)
                : "No valued partners this year",
          },
          {
            label: rankTotal?.label ?? "Published total",
            value: rankTotal ? fmtLine(rankTotal.value) : "—",
            note:
              fuel === "oil"
                ? "Thousand tonnes"
                : fuel === "lng"
                  ? "GWh"
                  : "GWh",
          },
          {
            label: fuel === "lng" ? "Terminals" : "Partners shown",
            value: netOnly
              ? "UK total"
              : listMode === "all"
                ? String(valuedRanks.length)
                : String(Math.min(LIFELINE_RANK_TOP, valuedRanks.length)),
            note: netOnly
              ? "Net is aggregate only"
              : listMode === "all"
                ? `All ${valuedRanks.length} ranked`
                : valuedRanks.length > LIFELINE_RANK_TOP
                  ? `Top ${LIFELINE_RANK_TOP} of ${valuedRanks.length}`
                  : "Ranked by absolute volume",
          },
        ]
      : view === "trade"
        ? [
            {
              label: `${y} imports`,
              value: importsY != null ? `${(importsY.value / 1000).toFixed(1)} Mtoe` : "—",
              note: importsY
                ? importsY.quarters < 4
                  ? `${importsY.quarters} of 4 quarters so far`
                  : "Energy coming into the UK"
                : "Million tonnes of oil equivalent",
            },
            {
              label: `${y} exports`,
              value: exportsY != null ? `${(Math.abs(exportsY.value) / 1000).toFixed(1)} Mtoe` : "—",
              note: "Energy leaving the UK",
            },
            {
              label: `${y} balance`,
              value:
                importsY != null && exportsY != null
                  ? `${((importsY.value - Math.abs(exportsY.value)) / 1000).toFixed(1)} Mtoe`
                  : "—",
              note: "Imports minus exports · same year",
            },
          ]
        : [
            {
              label: `${y} UK · ${icFlow.toLowerCase()}`,
              value: icUkNet != null ? fmtGWh(icUkNet.value) : "—",
              note: icUkNet
                ? icUkNet.quarters < 4 ? `${icUkNet.quarters} of 4 quarters so far` : "Electricity through undersea cables"
                : "Electricity corridors only",
            },
            {
              label: "Cable capacity",
              value: icCapReady && icCapRanks.length ? fmtMw(icCapTotal) : "—",
              note: icCapPin
                ? `Import capacity · as of ${fmtDay(icCapPin)}`
                : "Import capacity",
            },
            {
              label: "Top corridor",
              value: icTable[0] ? icTable[0].corridor : "—",
              note: icTable[0] ? fmtGWh(icTable[0].value) : "By absolute flow this year",
            },
          ];

  const yearOptions = yearPool.map((yy) => ({
    value: String(yy),
    label: String(yy),
  }));

  const footSource =
    view === "lifelines"
      ? fuel === "oil"
        ? ENERGY_SOURCE.importsLifelinesOil
        : fuel === "lng"
          ? ENERGY_SOURCE.importsLifelinesLng
          : ENERGY_SOURCE.importsLifelinesGas
      : view === "resilience"
        ? gasStorageReady
          ? ENERGY_SOURCE.importsResilienceStorage
          : ENERGY_SOURCE.importsResilience
        : view === "shock"
          ? ENERGY_SOURCE.importsShock
          : view === "connectors"
            ? ENERGY_SOURCE.importsConnectors
            : view === "trade"
              ? ENERGY_SOURCE.importsTrade
              : ENERGY_SOURCE.importsResilience;

  const footDefinition =
    view === "lifelines"
      ? [
          "Countries are shaded by how much oil or gas the UK took from them that year. The map shows where fuel came from, not shipping routes.",
          fuel === "oil"
            ? "Oil: imports by country of origin, in thousand tonnes (DESNZ, Digest of UK Energy Statistics)."
            : fuel === "lng"
              ? "LNG: liquefied gas arriving by ship, by UK terminal, in GWh (DESNZ, Digest of UK Energy Statistics)."
              : "Gas: imports and exports by country, by pipeline or as LNG by ship, in GWh (DESNZ, Digest of UK Energy Statistics).",
        ]
      : view === "resilience"
        ? [
            "Import dependency: the share of UK energy that came from abroad. Below zero means Britain exported more energy than it imported.",
            "Fossil fuel dependency: the share of UK energy from coal, oil and gas. Low carbon share: the share from nuclear and renewables.",
            "Gas in storage and storage capacity are shown separately, in GWh. Totals for all fuels imported and exported are on Imports and exports (ktoe). None of these are combined into a single security score.",
          ]
        : view === "shock"
          ? [
              "Each event has a date, a short account and its sources, with a chart of the fuel flow it affected.",
              shockEvent?.alternate_reading ??
                "The chart is context for the dated event — not proof that the event caused the movement.",
            ]
          : view === "trade"
            ? [
                "All energy imported into and exported from the UK, in thousand tonnes of oil equivalent (ktoe). DESNZ, Energy Trends.",
                "DESNZ publishes exports as negative numbers; they are shown here as positive amounts leaving the UK.",
              ]
            : view === "connectors"
              ? [
                  "Electricity flowing through the undersea cables that link Britain to other countries, by country, in GWh. DESNZ, Energy Trends.",
                  "Cable capacity is how much electricity each cable can carry into Britain at once, in MW, from the National Energy System Operator register. It is not how much flowed.",
                ]
              : [
                  "Tables of the figures used in this section.",
                  "Country, cable and ratio charts are on the other tabs.",
                ];

  const footMethod =
    view === "lifelines"
      ? [
          "Click a country on the map or in the list to see its history. The list shows the top 10; choose All for every country.",
          "Groups of countries that are not a single place stay in the list only.",
          "Oil is in thousand tonnes here (DESNZ). Production charts elsewhere may use million tonnes — each chart keeps its unit labelled.",
          "Gas by pipeline and by ship can be shown together or separately. Oil and gas are never drawn on the same scale.",
        ]
      : view === "resilience"
        ? [
            "All three shares are as published by DESNZ (Energy Trends), shown as percentages.",
            "From 2016 the gas in storage includes LNG held at terminals, so figures before and after 2016 are not directly comparable.",
            "Gas on this page is in GWh (as published for storage). Oil and gas production elsewhere on Energy may use tonnes or cubic metres — the units stay labelled on each chart.",
          ]
        : view === "shock"
          ? [
              "Event dates and wording come from the sources listed with each event. The line on the chart marks the year of the event.",
              "Each chart keeps its own unit as published.",
              `Events chosen by British Exchange; sources checked ${shockRetrieved}.`,
            ]
          : view === "trade"
            ? [
                "Quarterly figures as published. Yearly figures add up the quarters in that year; a year with fewer than four quarters is marked.",
                "These are totals in each direction, not the difference between them. Imports by country are on The lifelines map.",
              ]
            : view === "connectors"
              ? [
                  "Yearly figures add up the quarters in that year; a year with fewer than four quarters is marked as part year.",
                  "Bars show the size of the flow whichever way it went.",
                  "Capacity covers Great Britain; flows cover the UK. Moyle (to Northern Ireland) cannot always run at its full 500 MW. Flows to and from France are published as one total for three cables.",
                ]
              : [
                  "Tables for import dependency, fossil fuel and low carbon shares, imports and exports, gas storage, and cable capacity.",
                  "Figures by country and by cable are on The lifelines map and Britain's connectors.",
                ];

  const dataHref =
    view === "lifelines"
      ? fuel === "oil"
        ? `/data?record=${OIL_IMPORTS_BY_COUNTRY_ID}`
        : fuel === "lng"
          ? `/data?record=${LNG_IMPORTS_BY_TERMINAL_ID}`
          : `/data?record=${GAS_TRADE_BY_PARTNER_ID}`
      : view === "resilience"
        ? `/data?record=${IMPORT_DEPENDENCY_ID}`
        : view === "shock"
          ? shockEvent?.chart.kind === "interconnector"
            ? `/data?record=${INTERCONNECTOR_FLOWS_ID}`
            : shockEvent?.chart.kind === "gas-partners"
              ? `/data?record=${GAS_TRADE_BY_PARTNER_ID}`
              : shockEvent?.chart.kind === "oil-partner"
                ? `/data?record=${OIL_IMPORTS_BY_COUNTRY_ID}`
                : shockEvent?.chart.kind === "lng-total"
                  ? `/data?record=${LNG_IMPORTS_BY_TERMINAL_ID}`
                  : `/data?record=${IMPORT_DEPENDENCY_ID}`
          : view === "connectors"
            ? `/data?record=${INTERCONNECTOR_FLOWS_ID}`
            : view === "trade"
              ? `/data?record=${IMPORTS_EXPORTS_ID}`
              : `/data?record=${IMPORT_DEPENDENCY_ID}`;

  const fuelLabel =
    fuel === "oil"
      ? "Oil"
      : fuel === "lng"
        ? "LNG terminals"
        : mode === "Pipeline"
          ? "Gas · pipeline"
          : mode === "LNG"
            ? "Gas · by ship"
            : "Gas · pipeline and ship";

  const resetState = { year: y, basis, ic_flow: icFlow, fuel, flow, mode, partner, list: listMode, event: eventId };
  // Default year = what a URL without `year` opens on (latest clamped into this view's pool),
  // so Reset stays hidden at defaults on Connectors / Trade where the pools end later.
  const resetDefaults: typeof resetState = { year: clampYear(latest, yearPool, latest), basis: "annual", ic_flow: "Net imports", fuel: "oil", flow: "Imports", mode: "Combined", partner: "", list: "top", event: defaultShockId(events) };
  const resetKeys: (keyof typeof resetState)[] = view === "shock" ? ["event"]
    : view === "resilience" ? ["year", "basis"]
      : view === "connectors" ? ["year", "ic_flow"]
        : view === "trade" ? ["year"] : ["year", "fuel", "flow", "mode", "partner", "list"];
  const resetPatch = viewReset(resetState, resetDefaults, resetKeys);

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {(view === "lifelines" ||
        view === "resilience" ||
        view === "shock" ||
        view === "trade" ||
        view === "connectors") && <FigureStrip figures={figures} />}

      {view !== "data" && (
        <ControlRow>
          {view !== "shock" &&
            !(view === "resilience" && basis === "quarterly") &&
            yearOptions.length > 1 && (
              <MenuControl
                label="Year"
                value={String(y)}
                options={yearOptions}
                onChange={(v) => sync({ year: Number(v) })}
              />
            )}
          {view === "lifelines" && (
            <>
              <MenuControl
                label="Fuel"
                value={fuel}
                options={[
                  { value: "oil", label: "Oil" },
                  { value: "gas", label: "Gas" },
                  { value: "lng", label: "Liquefied natural gas terminals" },
                ]}
                onChange={(v) => sync({ fuel: v as LifelineFuel })}
              />
              {flowsForFuel(fuel).length > 1 && (
                <MenuControl
                  label="Direction"
                  value={flow}
                  options={flowsForFuel(fuel).map((f) => ({
                    value: f,
                    label:
                      f === "Imports" ? "Imports" : f === "Exports" ? "Exports" : "Net imports",
                  }))}
                  onChange={(v) => sync({ flow: v as LifelineFlow })}
                />
              )}
              {fuel === "gas" && flow !== "Net imports" && (
                <MenuControl
                  label="How it arrives"
                  value={mode}
                  options={[
                    { value: "Pipeline", label: "Pipeline" },
                    { value: "LNG", label: "By ship" },
                    { value: "Combined", label: "Pipeline and ship" },
                  ]}
                  onChange={(v) => sync({ mode: v as GasMode })}
                />
              )}
              {!netOnly && (
                <MenuControl
                  label="List"
                  value={listMode}
                  options={[
                    { value: "top", label: `Top ${LIFELINE_RANK_TOP}` },
                    { value: "all", label: "All" },
                  ]}
                  onChange={(v) => sync({ list: v as LifelineListMode })}
                />
              )}
            </>
          )}
          {view === "resilience" && depReady && (
            <MenuControl
              label="Period"
              value={basis}
              options={[
                { value: "annual", label: "Year by year" },
                { value: "quarterly", label: "Quarter by quarter" },
              ]}
              onChange={(v) => sync({ basis: v as DependencyBasis })}
            />
          )}
          {view === "connectors" && icReady && (
            <MenuControl
              label="Direction"
              value={icFlow}
              options={INTERCONNECTOR_FLOWS.map((f) => ({
                value: f,
                label: f === "Imports" ? "Imports" : f === "Exports" ? "Exports" : "Net imports",
              }))}
              onChange={(v) => sync({ ic_flow: v as InterconnectorFlow })}
            />
          )}
          {Object.keys(resetPatch).length > 0 && <ResetButton onClick={() => sync(resetPatch)} />}
        </ControlRow>
      )}

      <Stage
        title={
          view === "data"
            ? "Data · Energy imports and security"
            : view === "lifelines"
              ? `The lifelines map · ${fuelLabel} · ${flow} · ${y}`
              : view === "resilience"
                ? basis === "quarterly"
                  ? "The resilience test · by quarter"
                  : `The resilience test · ${y}`
                : view === "shock"
                  ? shockEvent
                    ? `${shockEvent.title} · ${formatMarkDate(shockEvent.mark_date)}`
                    : "Shock and response"
                  : view === "trade"
                    ? `UK energy imports and exports · ${y}`
                    : `Electricity cables · ${icFlow.toLowerCase()} · ${y}`
        }
        meta={
          view === "lifelines"
            ? fuel === "oil"
              ? "United Kingdom · thousand tonnes"
              : fuel === "lng"
                ? "United Kingdom · GWh · terminals"
                : "United Kingdom · GWh"
            : view === "resilience"
              ? "United Kingdom · shares of energy · gas in storage"
              : view === "shock"
                ? "What happened · what the figures show around that date"
                : view === "trade"
                  ? "United Kingdom · thousand tonnes of oil equivalent"
                  : view === "connectors"
                    ? "United Kingdom · electricity flows and cable capacity"
                    : "Archive tables"
        }
        follow={
          <EnergyStageFollow
            domain="imports"
            view={view}
            selection={{ year: y }}
            label={`Imports · ${view}`}
          />
        }
        foot={
          <FigureRecord
            source={energySource("imports", view, footSource)}
            definition={footDefinition}
            method={footMethod}
            dataHref={dataHref}
          />
        }
      >
        {view === "data" ? (
          <ImportsData pack={pack} />
        ) : view === "resilience" ? (
          <div className={s.stack}>
            {!resilienceReady ? (
              <EmptyStage label="Resilience ratios unavailable">
                The import dependency and energy share figures are not available right now.
              </EmptyStage>
            ) : (
              <>
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    Import dependency, fossil fuels and low carbon ·{" "}
                    {basis === "quarterly" ? "by quarter" : "by year"} ·{" "}
                    {resilienceYears[0] ?? "—"}–{resilienceYears.at(-1) ?? "—"}
                  </h3>
                  {resilienceLines.length === 0 ? (
                    <EmptyStage label="No figures for this period">
                      Choose year by year.
                    </EmptyStage>
                  ) : (
                    <TimeChart
                      label="Import dependency, fossil fuel dependency and low carbon share"
                      series={resilienceLines}
                      cadence={basis === "annual" ? "annual" : "quarterly"}
                      kind="line"
                      format={(v) => fmtDependencyPct(v)}
                      rules={
                        basis === "annual"
                          ? [{ id: "year", t: y, label: String(y), active: true }]
                          : []
                      }
                    />
                  )}
                </section>

                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    Gas in storage and storage capacity · GWh ·{" "}
                    {stockSeries.points[0] ? Math.trunc(stockSeries.points[0].t) : "—"}–
                    {stockSeries.points.at(-1)
                      ? Math.trunc(stockSeries.points.at(-1)!.t)
                      : "—"}
                  </h3>
                  {!gasStorageReady || storageLines.length === 0 ? (
                    <EmptyStage label="Gas storage series unavailable">
                      Gas storage figures are not available right now.
                    </EmptyStage>
                  ) : (
                    <TimeChart
                      label="Natural gas stock and storage capacity"
                      series={storageLines}
                      cadence="annual"
                      kind="line"
                      format={(v) => fmtGWh(v)}
                      rules={[
                        { id: "year", t: y, label: String(y), active: true },
                        { id: "break-2016", t: 2016, label: "2016 · LNG added", active: false },
                      ]}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        ) : view === "shock" ? (
          <div className={s.stack}>
            {events.length === 0 ? (
              <EmptyStage label="No events yet">
                No dated events have been checked yet.
              </EmptyStage>
            ) : (
              <section className={s.panel}>
                <DecisionLedger
                  events={events.map(shockToLedgerEvent)}
                  openId={shockEvent?.id ?? null}
                  onSelect={(id) => sync({ event: id })}
                  empty="No shock events match."
                  idPrefix="imports-shock"
                  renderOpen={(ledgerEvent) => {
                    const open = shockById(events, ledgerEvent.id);
                    if (!open) return null;
                    const openYear = shockMarkYear(open);
                    const openReady = open.id === shockEvent?.id && shockReady;
                    return (
                      <>
                        <p className="bo-label">
                          {shockUnitNote} · {openYear}
                        </p>
                        {!openReady ? (
                          <EmptyStage label="Chart unavailable">
                            The figures for this event are not available right now.
                          </EmptyStage>
                        ) : (
                          <TimeChart
                            label={open.title}
                            series={shockSeries}
                            cadence={shockCadence}
                            kind="line"
                            format={shockFmt}
                            rules={[
                              {
                                id: "shock-mark",
                                t: openYear,
                                label: String(openYear),
                                active: true,
                              },
                            ]}
                          />
                        )}
                      </>
                    );
                  }}
                />
              </section>
            )}
          </div>
        ) : view === "lifelines" ? (
          <div className={s.stack}>
            {!lifelinesReady ? (
              <EmptyStage label="Lifelines series unavailable">
                Import figures by country are not available right now.
              </EmptyStage>
            ) : netOnly ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  UK net imports · GWh · {gasYears[0] ?? "—"}–{gasYears.at(-1) ?? "—"}
                </h3>
                {history && history.points.length > 0 ? (
                  <TimeChart
                    label="UK gas net imports"
                    series={[history]}
                    cadence="annual"
                    kind="line"
                    format={fmtLine}
                    rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  />
                ) : (
                  <EmptyStage label="No net-import points">
                    Net gas imports are published for the UK as a whole only.
                  </EmptyStage>
                )}
              </section>
            ) : (
              <>
                {fuel !== "lng" ? (
                  <>
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>
                        Partner countries · {flow}
                        {fuel === "gas" ? ` · ${mode}` : ""} · {y}
                        {fuel === "oil" ? " · thousand tonnes" : " · GWh"}
                      </h3>
                      {mapRows.length === 0 ? (
                        <EmptyStage label="No mappable partners this year">
                          No country in this selection could be placed on the map. Try another year,
                          flow or mode.
                        </EmptyStage>
                      ) : (
                        <WorldChoropleth
                          key={`lifelines-map-${fuel}-${flow}-${mode}-${y}`}
                          label={`${fuelLabel} · ${flow} · ${y}`}
                          data={mapRows.map(({ id, value, display }) => ({
                            id,
                            value,
                            display,
                          }))}
                          selected={selectedIso}
                          onSelect={(iso) => {
                            const id = isoToPartnerId.get(iso);
                            if (id) sync({ partner: id });
                          }}
                          legendFormat={fmtLine}
                          legendUnit={fuel === "oil" ? "thousand tonnes" : "GWh"}
                          size="stage"
                        />
                      )}
                    </section>

                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>
                        Partners · {flow}
                        {fuel === "gas" ? ` · ${mode}` : ""} · {y}
                        {listMode === "all"
                          ? valuedRanks.length
                            ? ` · all ${valuedRanks.length}`
                            : ""
                          : valuedRanks.length > LIFELINE_RANK_TOP
                            ? ` · top ${LIFELINE_RANK_TOP} of ${valuedRanks.length}`
                            : ""}
                      </h3>
                      {shownRanks.length === 0 ? (
                        <EmptyStage label="No valued partners this year">
                          Try another year, flow or mode.
                        </EmptyStage>
                      ) : (
                        <RankBars
                          key={`lifelines-${fuel}-${flow}-${mode}-${y}-${listMode}`}
                          label={`${fuelLabel} · ${flow} · ${y}`}
                          rows={shownRanks.map((r) => ({
                            id: r.id,
                            label: r.label,
                            v: Math.abs(r.value),
                            active: r.id === activePartner,
                          }))}
                          reference={
                            rankTotal
                              ? { label: rankTotal.label, v: Math.abs(rankTotal.value) }
                              : undefined
                          }
                          format={fmtLine}
                          onSelect={(id) => sync({ partner: id })}
                        />
                      )}
                    </section>
                  </>
                ) : (
                  <section className={s.panel}>
                    <h3 className={t.stageTitle}>
                      Terminals · {flow} · {y}
                      {listMode === "all"
                        ? valuedRanks.length
                          ? ` · all ${valuedRanks.length}`
                          : ""
                        : valuedRanks.length > LIFELINE_RANK_TOP
                          ? ` · top ${LIFELINE_RANK_TOP} of ${valuedRanks.length}`
                          : ""}
                    </h3>
                    {shownRanks.length === 0 ? (
                      <EmptyStage label="No valued terminals this year">
                        Try another year.
                      </EmptyStage>
                    ) : (
                      <RankBars
                        key={`lifelines-lng-${y}-${listMode}`}
                        label={`${fuelLabel} · ${flow} · ${y}`}
                        rows={shownRanks.map((r) => ({
                          id: r.id,
                          label: r.label,
                          v: Math.abs(r.value),
                          active: r.id === activePartner,
                        }))}
                        reference={
                          rankTotal
                            ? { label: rankTotal.label, v: Math.abs(rankTotal.value) }
                            : undefined
                        }
                        format={fmtLine}
                        onSelect={(id) => sync({ partner: id })}
                      />
                    )}
                  </section>
                )}

                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    {history?.label ?? (fuel === "lng" ? "Terminal" : "Partner")} over time
                    {fuel === "oil" ? " · thousand tonnes" : " · GWh"} · {lineYears[0] ?? "—"}–
                    {lineYears.at(-1) ?? "—"}
                  </h3>
                  {!history || history.points.length === 0 ? (
                    <EmptyStage label="No history for this selection">
                      Choose another country or terminal on the map or in the list.
                    </EmptyStage>
                  ) : (
                    <TimeChart
                      label={history.label}
                      series={[history]}
                      cadence="annual"
                      kind="line"
                      marks
                      format={fmtLine}
                      rules={[{ id: "year", t: y, label: String(y), active: true }]}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        ) : view === "connectors" ? (
          <div className={s.stack}>
            {!icReady ? (
              <EmptyStage label="Interconnector flows unavailable">
                Electricity cable figures are not available right now.
              </EmptyStage>
            ) : (
              <>
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    UK · electricity {icFlow.toLowerCase()} · each quarter · TWh · {icYears[0] ?? "—"}–{icYears.at(-1) ?? "—"}
                  </h3>
                  {icUkSeries.points.length === 0 ? (
                    <EmptyStage label="No UK figures for this flow">
                      Try another flow, or a year with valued quarters.
                    </EmptyStage>
                  ) : (
                    <TimeChart
                      label={`UK · electricity ${icFlow.toLowerCase()}`}
                      series={[{ ...icUkSeries, label: `UK total · ${icFlow.toLowerCase()}` }]}
                      cadence="quarterly"
                      kind="line"
                      format={fmtTWhFixed}
                      rules={[{ id: "year", t: y, label: String(y), active: true }]}
                    />
                  )}
                </section>

                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    By country · {icFlow.toLowerCase()} · {y} · TWh
                  </h3>
                  {icTable.length === 0 ? (
                    <EmptyStage label="No corridor totals for this year">
                      No cable figures for this year; pick a later year.
                    </EmptyStage>
                  ) : (
                    <>
                      <RankBars
                        key={`ic-corridors-${icFlow}-${y}`}
                        label={`By country · ${icFlow} · ${y}`}
                        rows={icTable.map((row) => ({
                          id: row.corridor,
                          label: row.corridor,
                          v: icFlow === "Net imports" ? row.value : Math.abs(row.value),
                          active: false,
                        }))}
                        reference={
                          icUkNet
                            ? {
                                label: `UK total · ${y}`,
                                v: icFlow === "Net imports" ? icUkNet.value : Math.abs(icUkNet.value),
                              }
                            : undefined
                        }
                        format={fmtTWhFixed}
                      />
                    </>
                  )}
                </section>

                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    Cable capacity into Britain · MW
                    {icCapPin ? ` · as of ${fmtDay(icCapPin)}` : ""}
                  </h3>
                  {!icCapReady || icCapRanks.length === 0 ? (
                    <EmptyStage label="Interconnector capacity unavailable">
                      Cable capacity figures are not available right now.
                    </EmptyStage>
                  ) : (
                    <>
                      <RankBars
                        key={`ic-cap-${icCapPin ?? "pin"}`}
                        label="Built interconnector import capacity"
                        rows={icCapRanks.map((r) => ({
                          id: r.id,
                          label: r.label,
                          v: r.value,
                        }))}
                        format={(v) => fmtMw(v)}
                      />
                    </>
                  )}
                </section>
              </>
            )}
          </div>
        ) : view === "trade" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                UK energy imports and exports · each quarter · ktoe · {tradeYears[0] ?? "—"}–{tradeYears.at(-1) ?? "—"}
              </h3>
              {!tradeReady || tradeSeries.every((series) => series.points.length === 0) ? (
                <EmptyStage label="Trade series unavailable">
                  Import and export figures are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="UK energy imports and exports"
                  series={tradeSeries}
                  cadence="quarterly"
                  kind="line"
                  format={(v) => fmtKtoe(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
          </div>
        ) : null}
      </Stage>
    </>
  );
}

"use client";

/**
 * Energy Domain 04 — Oil, Gas & Fossil Fuels.
 * Flagship: North Sea fields (NSTA fields + PPRS; ceased register when Status = ceased).
 * Supporting: Extraction Century · Production Gap · Reserves glossary.
 */

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { FieldPointMap, type FieldMapGroup } from "../charts/FieldPointMap";
import { TimeChart } from "../instrument/TimeChart";
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
import { EnergyStageFollow } from "../connections";
import { ENERGY_SOURCE } from "./citations";
import { energySource } from "./source";
import { FossilsData, FOSSILS_DATA_SERIES, type FossilsDataSeries } from "./FossilsData";
import {
  ATLAS_FUELS,
  ATLAS_SCALES,
  FIELD_YEAR_STATES,
  asAtlasFuel,
  asAtlasScale,
  fieldFuelMax,
  fieldFuelValue,
  fieldOilEquivalentTonnes,
  fieldMatchesFuel,
  fieldStartYear,
  fieldTimelines,
  fieldYearState,
  fieldYearStateKeyLabel,
  fieldYearStateLabel,
  clipSeriesToYears,
  fmtBcm,
  fmtKt,
  isSuppressedGas,
  ksm3ToBcm,
  offshoreFieldSumSeries,
  sharedStartYear,
  suppressedGasRows,
  productionArchiveSpan,
  GAS_GWH_PER_BCM,
  type AtlasFuel,
  type AtlasScale,
  type FieldPoint,
  type FieldYearState,
  CRUDE_OIL_ID,
  NSTA_FIELD_PRODUCTION_ID,
  NSTA_FIELDS_ID,
  UK_RESERVES_ID,
  closureDecadeCounts,
  coalMtSeries,
  coalValueInYear,
  crudeOilSeries,
  crudeValueInYear,
  fieldProductionSeries,
  fieldStatusGroup,
  fmtMt,
  fmtMtoe,
  gasAnnualSeries,
  gasAnnualValue,
  isCeasedField,
  oilImportsMtSeries,
  primaryFossilStack,
  primaryFossilTotalSeries,
  reservesMeasureSeries,
  tradeAnnualMtoe,
  yearsOf,
  type FossilsPack,
} from "./fossils-model";
import { dependencySeries, fmtDependencyPct } from "./imports-model";
import s from "./generation.module.css";

import { FOSSIL_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...FOSSIL_VIEWS];

/** Legacy tabs: closures → North Sea ceased; fuels → Extraction Century. */
function resolveView(raw: string | null): string {
  if (raw === "closures") return "northsea";
  if (raw === "fuels") return "extraction";
  return VIEWS.some((v) => v.id === raw) ? raw! : "northsea";
}

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "producing", label: "Producing" },
  { value: "ceased", label: "Production ceased" },
  { value: "other", label: "Other" },
] as const;

/** One ink: states are told apart by print, never by colour. */
const YEAR_STATE_FILL: Record<FieldYearState, Pick<FieldMapGroup, "print">> = {
  reported: { print: "solid" },
  quiet: { print: "stipple" },
  after: { print: "hatch" },
  archive: { print: "cross" },
  undated: { print: "open" },
};

function fieldTypeLabel(type: string): string {
  const u = type.toUpperCase();
  return u === "OIL" ? "Oil" : u === "GAS" ? "Gas" : u === "COND" ? "Gas condensate" : type || "—";
}

function sentence(text: string): string {
  const l = text.toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

export function FossilsCanvas({ pack }: { pack: FossilsPack }) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("fossil");
  const crudeRows = pack.crude?.observations ?? [];
  const gasRows = pack.gas?.observations ?? [];
  const primaryRows = pack.primary?.observations ?? [];
  const coalRows = pack.coal?.observations ?? [];
  const tradeRows = pack.trade?.observations ?? [];
  const reserveRows = pack.reserves?.observations ?? [];
  const oilImportRows = pack.oilImports?.observations ?? [];
  const dependencyRows = pack.dependency?.observations ?? [];

  const crudeSeries = crudeOilSeries(crudeRows);
  const gasSeries = gasAnnualSeries(gasRows);
  const coalSeries = coalMtSeries(coalRows);
  const primaryStack = primaryFossilStack(primaryRows);
  const crudeYears = yearsOf(crudeRows);
  const gasYears = gasSeries.points.map((p) => p.t);
  const coalYears = coalSeries.points.map((p) => p.t);
  const primaryYears = [
    ...new Set(primaryStack.flatMap((s) => s.points.map((p) => p.t))),
  ].sort((a, b) => a - b);
  const oil2pYears = reservesMeasureSeries(reserveRows, "oil_2p_mt").points.map((p) => p.t);
  // Offer only years every drawn Reserves line covers (S18/S19): a union let 1970–72 in from
  // oil extracted alone, with no 2P point to show. A series that failed to load is skipped
  // rather than emptying the menu.
  const reserveYearSets = [
    oil2pYears,
    reservesMeasureSeries(reserveRows, "gas_2p_bcm").points.map((p) => p.t),
    reservesMeasureSeries(reserveRows, "oil_production_mt").points.map((p) => p.t),
  ].filter((ys) => ys.length > 0);
  const reserveYears =
    reserveYearSets.length === 0
      ? []
      : reserveYearSets
          .slice(1)
          .reduce((acc, ys) => acc.filter((yy) => ys.includes(yy)), [...new Set(reserveYearSets[0]!)])
          .sort((a, b) => a - b);

  const timelines = useMemo(() => fieldTimelines(pack.fieldProduction), [pack.fieldProduction]);
  const archive = useMemo(() => productionArchiveSpan(pack.fieldProduction), [pack.fieldProduction]);
  const atlasYears = useMemo(() => {
    const ys = pack.fields
      .map((f) => fieldStartYear(f, timelines.get(f.name)))
      .filter((y): y is number => y != null);
    const min = Math.min(ys.length ? Math.min(...ys) : 1970, archive?.first ?? Infinity);
    const max = Math.max(ys.length ? Math.max(...ys) : 2025, archive?.last ?? -Infinity);
    const out: number[] = [];
    for (let y = min; y <= max; y += 1) out.push(y);
    return out.length ? out : [2025];
  }, [pack.fields, timelines, archive]);

  const [view, setView] = useState(() => resolveView(searchParams.get("view")));
  const menuYears =
    view === "reserves"
      ? reserveYears
      : crudeYears.length
        ? crudeYears
        : gasYears.length
          ? gasYears
          : primaryYears;
  const latest = menuYears.at(-1) ?? crudeYears.at(-1) ?? gasYears.at(-1) ?? primaryYears.at(-1) ?? 2025;
  const earliest = crudeYears[0] ?? coalYears[0] ?? 1920;

  const [year, setYear] = useState(() =>
    clampYear(Number(searchParams.get("year") || latest), menuYears.length ? menuYears : [latest], latest),
  );
  /** Default to the last year with a full twelve months of field reports; later years stay selectable. */
  const atlasDefault = useMemo(() => {
    // A year is complete when most fields report twelve months (a field can carry two records,
    // so a single row's months can exceed 12; the typical value is the honest test).
    const counts = new Map<number, Map<number, number>>();
    for (const r of pack.fieldProduction) {
      const m = counts.get(r.year) ?? new Map<number, number>();
      m.set(r.months, (m.get(r.months) ?? 0) + 1);
      counts.set(r.year, m);
    }
    const full = [...counts.entries()]
      .filter(([, m]) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] === 12)
      .map(([y]) => y);
    return full.length ? Math.max(...full) : (atlasYears.at(-1) ?? 2025);
  }, [pack.fieldProduction, atlasYears]);
  /** 0 = no year chosen: follow atlasDefault, which is only known once field production has loaded. */
  const [atlasYear, setAtlasYear] = useState(() => Number(searchParams.get("atlas_year") || searchParams.get("year") || 0));
  const [scale, setScale] = useState<AtlasScale>(() =>
    searchParams.get("view") === "closures" ? "field" : asAtlasScale(searchParams.get("scale")),
  );
  const [fuel, setFuel] = useState<AtlasFuel>(() => asAtlasFuel(searchParams.get("fuel")));
  const [status, setStatus] = useState(() => {
    if (searchParams.get("view") === "closures") return "ceased";
    const raw = searchParams.get("status") || "all";
    return STATUS_FILTERS.some((f) => f.value === raw) ? raw : "all";
  });
  const [fieldId, setFieldId] = useState(() => searchParams.get("field") || "");
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [dataSeries, setDataSeries] = useState<FossilsDataSeries>(() => {
    const d = searchParams.get("dataset");
    return FOSSILS_DATA_SERIES.some((x) => x.id === d) ? (d as FossilsDataSeries) : "crude";
  });

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        year: number;
        atlas_year: number;
        status: string;
        field: string;
        scale: AtlasScale;
        fuel: AtlasFuel;
        q: string;
      }>,
    ) => {
      const mergedView = resolveView(patch.view ?? view);
      const next = {
        year,
        atlas_year: atlasYear,
        status,
        field: fieldId,
        scale,
        fuel,
        q: query,
        ...patch,
        view: mergedView,
        ...(patch.view === "closures" ? { status: "ceased" as const, scale: "field" as const } : {}),
      };
      setView(next.view);
      setYear(next.year);
      setAtlasYear(next.atlas_year);
      setStatus(next.status);
      setFieldId(next.field);
      setScale(next.scale);
      setFuel(next.fuel);
      setQuery(next.q);
      writeUrl({
        view: next.view,
        year: next.year,
        atlas_year: next.view === "northsea" && next.atlas_year ? next.atlas_year : null,
        status: next.view === "northsea" ? next.status : null,
        scale: next.view === "northsea" ? next.scale : null,
        fuel: next.view === "northsea" ? next.fuel : null,
        field: next.view === "northsea" && next.field ? next.field : null,
        q: next.view === "northsea" && next.q ? next.q : null,
        dataset: next.view === "data" ? dataSeries : null,
      });
    },
    [view, year, atlasYear, status, fieldId, scale, fuel, query, dataSeries, writeUrl],
  );

  const y = clampYear(year, menuYears.length ? menuYears : [latest], latest);
  const ay = atlasYear ? clampYear(atlasYear, atlasYears, atlasDefault) : atlasDefault;
  const crudeY = crudeValueInYear(crudeRows, y);
  const gasY = gasAnnualValue(gasRows, y);
  const coalY = coalValueInYear(coalRows, y);
  const peakPt = crudeSeries.points.reduce<{ t: number; v: number } | null>((best, p) => {
    if (best == null || p.v > best.v) return { t: p.t, v: p.v };
    return best;
  }, null);
  const crudeReady = Boolean(pack.crude?.observations.length);
  const gasReady = Boolean(pack.gas?.observations.length);
  const primaryReady = Boolean(pack.primary?.observations.length);
  const coalReady = Boolean(pack.coal?.observations.length);
  const fieldsReady = pack.fields.length > 0;

  const stateOf = useCallback(
    (f: FieldPoint) => fieldYearState(f, timelines.get(f.name), ay, archive),
    [timelines, ay, archive],
  );
  const rowIn = useCallback((f: FieldPoint, yy: number) => timelines.get(f.name)?.byYear.get(yy), [timelines]);

  const visibleFields = useMemo(() => {
    let list = pack.fields.filter(
      (f) => !timelines.get(f.name)?.onshore && stateOf(f) != null && fieldMatchesFuel(f, fuel),
    );
    if (status !== "all") list = list.filter((f) => fieldStatusGroup(f.status) === status);
    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((f) =>
        [f.name, f.nameShort, f.operator, f.licence, f.fieldType, f.status]
          .filter(Boolean)
          .some((part) => part!.toLowerCase().includes(needle)),
      );
    }
    const rank = (f: FieldPoint) => {
      const r = rowIn(f, ay);
      // All fuels: oil plus gas converted to oil by energy content (suppressed gas = 0).
      return fuel === "all" ? fieldOilEquivalentTonnes(r) : fieldFuelValue(r, fuel);
    };
    // Pin locale so Node SSR and the browser sort ties the same way (hydration).
    return list.toSorted((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, "en-GB"));
  }, [pack.fields, timelines, stateOf, rowIn, fuel, status, ay, query]);
  const reportingFields = visibleFields.filter((f) => stateOf(f) === "reported");
  const listFields = reportingFields.length && status !== "ceased" ? reportingFields : visibleFields;

  const fuelMax = useMemo(
    () => ({ oil: fieldFuelMax(pack.fieldProduction, "oil"), gas: fieldFuelMax(pack.fieldProduction, "gas") }),
    [pack.fieldProduction],
  );
  const yearGroups: FieldMapGroup[] = FIELD_YEAR_STATES.map((id) => ({
    id,
    label: fieldYearStateKeyLabel(id, ay),
    ...YEAR_STATE_FILL[id],
  }));

  const selectedField = pack.fields.find((f) => f.id === fieldId) ?? null;
  const selectedTimeline = selectedField ? timelines.get(selectedField.name) : undefined;
  const selectedState = selectedField ? stateOf(selectedField) : null;
  const selectedRow = selectedField ? rowIn(selectedField, ay) : undefined;
  const oilFieldSeries = selectedField
    ? fieldProductionSeries(pack.fieldProduction, selectedField.name, "oil")
    : null;
  const gasFieldSeries = selectedField
    ? fieldProductionSeries(pack.fieldProduction, selectedField.name, "gas")
    : null;
  const showOil = fuel !== "gas";
  const showGas = fuel !== "oil";
  const oilSum = offshoreFieldSumSeries(pack.fieldProduction, "oil");
  const gasSum = offshoreFieldSumSeries(pack.fieldProduction, "gas");
  const atYear = (pts: { t: number; v: number }[], yy: number) => pts.find((p) => p.t === yy)?.v ?? null;
  const ayRule = [{ id: "year", t: ay, label: String(ay), active: true }];
  const hasOil = Boolean(oilFieldSeries?.points.some((p) => p.v > 0));
  const hasGas = Boolean(gasFieldSeries?.points.some((p) => p.v > 0));
  const suppressed = suppressedGasRows(pack.fieldProduction);
  const gasCell = (r: { gasToPipelineKsm3: number } & Parameters<typeof isSuppressedGas>[0]) =>
    isSuppressedGas(r) ? "Suppressed" : fmtBcm(ksm3ToBcm(r.gasToPipelineKsm3));

  const ceasedFields = useMemo(
    () =>
      pack.fields
        .filter(isCeasedField)
        .filter((f) => f.prodYear != null)
        .sort((a, b) => (b.prodYear ?? 0) - (a.prodYear ?? 0)),
    [pack.fields],
  );

  const fossilTotalFull = primaryFossilTotalSeries(primaryRows);
  const importsMtoeFull = tradeAnnualMtoe(tradeRows, "Imports");
  const exportsMtoeFull = tradeAnnualMtoe(tradeRows, "Exports");
  const oilImportsFull = oilImportsMtSeries(oilImportRows);
  const oil2p = reservesMeasureSeries(reserveRows, "oil_2p_mt");
  const oilProdBook = reservesMeasureSeries(reserveRows, "oil_production_mt");
  const gas2p = reservesMeasureSeries(reserveRows, "gas_2p_bcm");
  const depAnnualFull = {
    ...dependencySeries(dependencyRows, "annual"),
    label: "Import dependency",
  };
  const closureDecades = closureDecadeCounts(pack.fields);

  /** Shared time windows so gap charts can be read across. */
  const gapEnergyFrom = sharedStartYear([fossilTotalFull, importsMtoeFull, exportsMtoeFull, depAnnualFull]);
  const gapOilFrom = sharedStartYear([crudeSeries, oilImportsFull]);
  const gapTo = Math.max(
    fossilTotalFull.points.at(-1)?.t ?? 0,
    importsMtoeFull.points.at(-1)?.t ?? 0,
    depAnnualFull.points.at(-1)?.t ?? 0,
    crudeSeries.points.at(-1)?.t ?? 0,
    oilImportsFull.points.at(-1)?.t ?? 0,
    y,
  );
  const fossilTotal =
    gapEnergyFrom != null ? clipSeriesToYears(fossilTotalFull, gapEnergyFrom, gapTo) : fossilTotalFull;
  const importsMtoe =
    gapEnergyFrom != null ? clipSeriesToYears(importsMtoeFull, gapEnergyFrom, gapTo) : importsMtoeFull;
  const exportsMtoe =
    gapEnergyFrom != null ? clipSeriesToYears(exportsMtoeFull, gapEnergyFrom, gapTo) : exportsMtoeFull;
  const depAnnual =
    gapEnergyFrom != null ? clipSeriesToYears(depAnnualFull, gapEnergyFrom, gapTo) : depAnnualFull;
  const oilImports =
    gapOilFrom != null ? clipSeriesToYears(oilImportsFull, gapOilFrom, gapTo) : oilImportsFull;
  const crudeGap =
    gapOilFrom != null ? clipSeriesToYears(crudeSeries, gapOilFrom, gapTo) : crudeSeries;

  const figures: ExplorerFigure[] =
    view === "northsea"
      ? [
          ...(scale === "national"
            ? [
                {
                  label: `${ay} UK crude oil`,
                  value: (() => {
                    const v = crudeValueInYear(crudeRows, ay);
                    return v != null ? fmtMt(v) : "—";
                  })(),
                  note: "UK total",
                },
                {
                  label: `${ay} UK gas`,
                  value: (() => {
                    const v = gasAnnualValue(gasRows, ay);
                    return v != null ? fmtBcm(v) : "—";
                  })(),
                  note: gasYears.length ? `UK total · from ${gasYears[0]} · bcm` : "UK total · bcm",
                },
              ]
            : scale === "fuel"
              ? [
                  {
                    label: `${ay} oil · offshore fields`,
                    value: (() => {
                      const v = atYear(oilSum.points, ay);
                      return v != null ? fmtMt(v) : "—";
                    })(),
                    note: "Sum of fields reporting · not a UK total",
                  },
                  {
                    label: `${ay} gas · offshore fields`,
                    value: (() => {
                      const v = atYear(gasSum.points, ay);
                      return v != null ? fmtBcm(v) : "—";
                    })(),
                    note: "Sum of fields reporting · bcm · not a UK total",
                  },
                ]
              : status === "ceased"
                ? [
                    {
                      label: "Ceased fields",
                      value: String(ceasedFields.length),
                      note: "Status today · production ceased",
                    },
                    {
                      label: `On the map in ${ay}`,
                      value: String(visibleFields.length),
                      note: "Started by this year · ceased today",
                    },
                  ]
                : [
                    {
                      label: `Fields started by ${ay}`,
                      value: String(visibleFields.filter((f) => stateOf(f) !== "undated").length),
                      note: `Plus ${visibleFields.filter((f) => stateOf(f) === "undated").length} without a start date`,
                    },
                    {
                      label: `Reporting in ${ay}`,
                      value: archive && ay < archive.first ? "—" : String(reportingFields.length),
                      note:
                        archive && ay < archive.first
                          ? `Field records begin ${archive.first}`
                          : "Fields with oil or gas reported that year",
                    },
                  ]),
          ...(scale === "field"
            ? [
                {
                  label: "Selected field",
                  value: selectedField
                    ? sentence(selectedField.nameShort || selectedField.name)
                    : "—",
                  note: selectedField
                    ? selectedState
                      ? fieldYearStateLabel(selectedState, ay)
                      : `Not started by ${ay}`
                    : "Choose a square or a name in the list",
                },
              ]
            : [
                {
                  label: "View by",
                  value: scale === "national" ? "United Kingdom" : "Fuel totals",
                  note:
                    scale === "national"
                      ? "National DESNZ series · not a field sum"
                      : "Offshore fields reporting · not a UK total",
                },
              ]),
        ]
      : view === "gap"
        ? [
            {
              label: `${y} UK fossil fuels`,
              value: (() => {
                const pt = fossilTotal.points.find((p) => p.t === y);
                return pt ? fmtMtoe(pt.v) : "—";
              })(),
              note: "Coal, crude oil and NGLs, and gas · oil-equivalent",
            },
            {
              label: `${y} energy imports`,
              value: (() => {
                const pt = importsMtoe.points.find((p) => p.t === y);
                return pt ? fmtMtoe(pt.v) : "—";
              })(),
              note: "All fuels · oil-equivalent",
            },
            {
              label: "Import dependency",
              value: (() => {
                const pt = depAnnual.points.find((p) => p.t === y);
                return pt ? fmtDependencyPct(pt.v) : "—";
              })(),
              note: "Published share · full chart on Imports › Resilience",
            },
          ]
        : view === "reserves"
            ? [
                {
                  label: `${y} oil still counted as recoverable`,
                  value: (() => {
                    const pt = oil2p.points.find((p) => p.t === y);
                    return pt ? fmtMt(pt.v) : "—";
                  })(),
                  note: "Remaining estimate · not extraction",
                },
                {
                  label: `${y} gas still counted as recoverable`,
                  value: (() => {
                    const pt = gas2p.points.find((p) => p.t === y);
                    return pt ? fmtBcm(pt.v) : "—";
                  })(),
                  note: "Remaining estimate · bcm",
                },
                {
                  label: `${y} oil extracted`,
                  value: (() => {
                    const pt = oilProdBook.points.find((p) => p.t === y);
                    return pt ? fmtMt(pt.v) : "—";
                  })(),
                  note: "That year's extraction · separate scale",
                },
              ]
              : [
                  {
                    label: `${y} crude oil`,
                    value: crudeY != null ? fmtMt(crudeY) : "—",
                    note: peakPt ? `Peak ${peakPt.t} · ${fmtMt(peakPt.v)}` : "UK production · Mt",
                  },
                  {
                    label: `${y} gas`,
                    value: gasY != null ? fmtBcm(gasY) : "—",
                    note: "UK production · bcm",
                  },
                  {
                    label: `${y} coal`,
                    value: coalY != null ? fmtMt(coalY) : "—",
                    note: "UK production · Mt",
                  },
                ];

  const yearOptions = menuYears.map((yy) => ({
    value: String(yy),
    label: String(yy),
  }));
  const atlasYearOptions = atlasYears.map((yy) => ({ value: String(yy), label: String(yy) }));

  // Reset covers only what the current tab exposes, compared with that tab's real default
  // (the value the page opens with when the URL has no params). Settings from other tabs stay
  // untouched and never make Reset appear. `null` = nothing to reset on this tab.
  const defaultAtlasYear = atlasDefault;
  const resetAction: (() => void) | null = (() => {
    if (view === "data") {
      if (dataSeries === "crude") return null;
      return () => {
        setDataSeries("crude");
        writeUrl({ view: "data", dataset: "crude" });
      };
    }
    if (view === "northsea") {
      if (!fieldsReady) return null;
      // Status filter and search only exist (and only filter) when viewing by field.
      const fieldOnlyDirty = scale === "field" && (status !== "all" || Boolean(query));
      const dirty =
        ay !== defaultAtlasYear || scale !== "field" || fuel !== "all" || Boolean(fieldId) || fieldOnlyDirty;
      if (!dirty) return null;
      return () =>
        sync({ atlas_year: defaultAtlasYear, status: "all", field: "", scale: "field", fuel: "all", q: "" });
    }
    // extraction · gap · reserves share the single Year control.
    if (!crudeReady || y === latest) return null;
    return () => sync({ year: latest });
  })();

  const footSource =
    view === "northsea" && scale === "national"
      ? ENERGY_SOURCE.fossilsFuels
      : view === "northsea"
      ? ENERGY_SOURCE.fossilsNorthSea
      : view === "reserves"
        ? ENERGY_SOURCE.fossilsReserves
        : view === "gap"
          ? ENERGY_SOURCE.fossilsGap
            : ENERGY_SOURCE.fossilsCrude;

  const footDefinition =
    view === "northsea"
      ? scale === "national"
        ? [
            "UK crude oil (million tonnes) and UK natural gas (bcm), as published by DESNZ — gas converted from gigawatt hours for this domain.",
            "These UK totals are never built by adding up the field records on the Field and Fuel views.",
          ]
        : [
            "Each square is an offshore oil or gas field on the UK Continental Shelf, placed at the centre of the NSTA field outline. Britain's coast is drawn on the main map and again in the corner locator, so a zoomed field still shows where it sits relative to the UK.",
            "The print of each square shows what the production records say for that field in the chosen year. With one fuel chosen, square area is that field's reported production that year, on one fixed scale for every year.",
            "Fuel sums add up the offshore fields that reported that year. They are not UK totals. The full field and production files sit under Data.",
            ...(status === "ceased"
              ? [
                  "Status today = Production ceased also opens the ceased-field chronology: fields by production-start decade, not closure year. Not a coal-mine register.",
                ]
              : []),
          ]
      : view === "gap"
        ? [
            "UK fossil fuel production set beside energy imports and exports (oil-equivalent), and crude oil beside oil imports (tonnes).",
            "The figure strip shows this year's published import-dependency share. The full dependency history lives on Imports › The resilience test — not duplicated here.",
          ]
        : view === "reserves"
            ? [
                "Still counted as recoverable means remaining oil or gas judged commercial. 2P is proven plus probable; 1P is proven only; 3P adds possible. Not what was extracted in a year.",
                "Contingent (2C) means discovered volumes not yet ready for commercial development. Undiscovered potential is not plotted here.",
                "Oil extracted that year is on its own chart because remaining estimates dwarf annual extraction.",
              ]
            : view === "data"
                ? [
                    "Archive tables for the Domain 04 series behind this explorer. Unit is in the title; cells are figures only.",
                    "Open the catalogue record for definition, caveats, download and release provenance. The publisher requires attribution.",
                  ]
                : [
                    "UK production of crude oil, natural gas and coal over time, plus fossil fuels as oil-equivalent energy.",
                    "Oil and coal are million tonnes. Gas is billion cubic metres (bcm). The oil-equivalent chart uses a different energy unit and is not the same as tonnes of crude.",
                  ];

  const footMethod =
    view === "northsea"
      ? scale === "national"
        ? [
            "Crude oil is the UK total in million tonnes. Gas is the UK total in bcm (converted from published monthly gigawatt hours); years with missing months are marked provisional (dotted).",
            "Gas figures begin in 1996 on this series; earlier years are shown as not published, not zero.",
          ]
        : [
            "Field start: the NSTA published production start date; if none, the first year with production in the NSTA field production records (PPRS). Fields with neither are shown as start date not published.",
            `Production records cover ${archive ? `${archive.first}–${archive.last}` : "the published years"}; earlier years cannot show reported production. "After last reported production" means no later year is reported — closure dates are not published on this layer. "Status today" is the current NSTA status, not the status in the chosen year.`,
            "Wytch Farm, the one onshore field in these records, is left out of the offshore map, table and sums.",
            `Gas figures that cannot be real are suppressed, not corrected: a field-year over 5 billion m³ and more than 20 times the gas that field produced (${[...new Set(suppressed.map((r) => `${sentence(r.fieldName)} ${r.year}`))].join(", ") || "none"}). Fuel sums leave those years as gaps rather than adding a wrong figure.`,
            "Oil: monthly tonnes summed to years (shown as million tonnes). Gas: gas sent to pipeline, monthly thousand m³ summed to years and shown as bcm. Before the mid-1980s few fields report gas sent to pipeline, so early gas sums are low. Part years are dotted. Records are joined to the map by field name; fields whose names do not match show no production. " +
              pack.attribution,
            ...(pack.outlineAttribution
              ? [pack.outlineAttribution.replace(/\s+/g, " ").trim()]
              : ["Geographic outline from ONS and Ordnance Survey open data where available."]),
            ...(status === "ceased"
              ? [
                  "Ceased = NSTA status containing CEASED, or POST-COP. Decade bars count ceased fields by published production-start decade — not closure year. Coalfield geography and employment joins are not in this release.",
                ]
              : []),
          ]
      : view === "gap"
        ? [
            "UK fossil fuel production is coal, crude oil and NGLs (natural gas liquids), and gas added as oil-equivalent energy. Imports and exports use the same energy unit. Charts share one start year so they can be read across.",
            "Crude oil (Mt) beside oil imports (Mt) is a separate oil panel — not the same as the oil-equivalent energy chart above.",
            "Import dependency (ET 1.3) is one published share in the figure strip; follow Imports › Resilience for the time series and sibling ratios.",
          ]
        : view === "reserves"
            ? [
                "Still counted as recoverable (2P, proven plus probable) means remaining oil or gas judged commercial at that date. Extracted that year is a separate flow on its own chart because the two differ hugely in size.",
                "Classification changes (notably around 2015) break long-run comparability. Remaining estimates are never the same as a year's extraction.",
              ]
              : view === "data"
                ? [
                    "Series control chooses one archive. Field production sums add reporting offshore fields only — they are not UK totals.",
                    "UK totals must not be fabricated from incomplete field maps.",
                  ]
                : [
                    `Crude oil and coal are million tonnes as published. Gas is shown in bcm, converted from published gigawatt hours at about ${GAS_GWH_PER_BCM} GWh per bcm (roughly 11 kWh per cubic metre).`,
                    "The oil-equivalent chart (coal, crude oil and NGLs, gas) uses a different energy unit — do not read it as tonnes of crude. Through 1962 crude includes shale oil. Years without production are omitted, not zeroed.",
                  ];

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {view !== "data" && <FigureStrip figures={figures} />}

      <ControlRow>
        {view === "data" && (
          <MenuControl
            label="Series"
            value={dataSeries}
            options={FOSSILS_DATA_SERIES.map((x) => ({ value: x.id, label: x.label }))}
            onChange={(v) => {
              setDataSeries(v as FossilsDataSeries);
              writeUrl({ view: "data", dataset: v });
            }}
          />
        )}
        {(view === "extraction" || view === "gap" || view === "reserves") && yearOptions.length > 1 && (
          <MenuControl
            label="Year"
            value={String(y)}
            options={yearOptions}
            onChange={(v) => sync({ year: Number(v) })}
          />
        )}
        {view === "northsea" && fieldsReady && (
          <>
            <MenuControl
              label="Year"
              value={String(ay)}
              options={atlasYearOptions}
              onChange={(v) => sync({ atlas_year: Number(v) })}
            />
            <MenuControl
              label="View by"
              value={scale}
              options={ATLAS_SCALES}
              onChange={(v) => sync({ scale: asAtlasScale(v) })}
            />
            <MenuControl
              label="Fuel"
              value={fuel}
              options={ATLAS_FUELS}
              onChange={(v) => sync({ fuel: asAtlasFuel(v) })}
            />
            {scale === "field" && (
              <MenuControl
                label="Status today"
                value={status}
                options={[...STATUS_FILTERS]}
                onChange={(v) => sync({ status: v, field: "" })}
              />
            )}
            {scale === "field" && (
              <label className={s.stationSearch}>
                Find a field
                <input
                  type="search"
                  value={query}
                  placeholder="Name, operator or licence"
                  onChange={(e) => sync({ q: e.target.value, field: "" })}
                />
              </label>
            )}
          </>
        )}
        {resetAction && <ResetButton onClick={resetAction} />}
      </ControlRow>

      <Stage
        title={
          view === "data"
            ? `Data · ${FOSSILS_DATA_SERIES.find((x) => x.id === dataSeries)?.label ?? "archive"}`
            : view === "northsea"
              ? scale === "national"
                ? `UK oil and gas production · national totals · ${ay}`
                : scale === "fuel"
                  ? `Offshore fields · reported production by fuel · ${ay}`
                  : status === "ceased"
                    ? `Ceased offshore fields · ${ay}`
                    : `Offshore oil and gas fields · ${ay}`
              : view === "gap"
                ? `The production gap · ${y}`
                : view === "reserves"
                  ? `What's left · ${y}`
                    : `The extraction century · ${y}`
        }
        meta={
          view === "northsea"
            ? scale === "national"
              ? "United Kingdom · DESNZ"
              : status === "ceased" && scale === "field"
                ? `UK Continental Shelf · status today ceased · not coal mines${archive ? ` · records ${archive.first}–${archive.last}` : ""}`
                : `UK Continental Shelf · offshore${archive ? ` · production records ${archive.first}–${archive.last}` : ""}`
            : view === "gap"
              ? "Production beside imports · labelled units"
              : view === "reserves"
                ? "Estimates of what remains · not what was extracted"
                : view === "data"
                    ? "Archive table · figures only · unit in the title"
                    : `UK · ${earliest}–${latest} · Mt · bcm · oil-equivalent`
        }
        follow={
          <EnergyStageFollow
            domain="fossil"
            view={view}
            selection={{ year: y }}
            label={`Fossil fuels · ${view}`}
          />
        }
        foot={
          <FigureRecord
            source={energySource("fossil", view, footSource)}
            definition={footDefinition}
            method={footMethod}
            dataHref={
              view === "data"
                ? `/data?record=${FOSSILS_DATA_SERIES.find((x) => x.id === dataSeries)?.record ?? CRUDE_OIL_ID}`
                : view === "northsea" && scale === "national"
                  ? `/data?record=${CRUDE_OIL_ID}`
                  : view === "northsea" && scale === "fuel"
                    ? `/data?record=${NSTA_FIELD_PRODUCTION_ID}`
                    : view === "northsea"
                      ? `/data?record=${NSTA_FIELDS_ID}`
                      : view === "reserves"
                        ? `/data?record=${UK_RESERVES_ID}`
                        : `/data?record=${CRUDE_OIL_ID}`
            }
          />
        }
      >
        {view === "data" ? (
          <FossilsData pack={pack} series={dataSeries} />
        ) : view === "northsea" ? (
          !fieldsReady && scale !== "national" ? (
            <EmptyStage label="Field map unavailable">Offshore field records are not available right now.</EmptyStage>
          ) : (
            <div className={s.stack}>
              {scale === "field" && (
                <section className={s.panel}>
                  {visibleFields.length === 0 ? (
                    <EmptyStage label={query.trim() ? "No fields match that search" : `No fields match in ${ay}`}>
                      {query.trim()
                        ? "Clear the search or try another name, operator or licence."
                        : `No ${fuel === "all" ? "" : `${fuel} `}field had started by ${ay} with this status today.`}
                    </EmptyStage>
                  ) : (
                    <div className={s.atlasLayout}>
                      <div className={s.atlasMap}>
                        <FieldPointMap
                          points={visibleFields}
                          label={`UK offshore oil and gas fields, ${ay}`}
                          outline={pack.outline}
                          selectedId={fieldId || null}
                          onSelect={(id) => sync({ field: id === fieldId ? "" : id })}
                          groups={yearGroups}
                          groupOf={(p) => stateOf(p) ?? "undated"}
                          sizeOf={
                            fuel === "all"
                              ? undefined
                              : (p) => {
                                  if (stateOf(p) !== "reported" || fuelMax[fuel] <= 0) return null;
                                  const v = fieldFuelValue(rowIn(p, ay), fuel);
                                  return v > 0 ? v / fuelMax[fuel] : null;
                                }
                          }
                          sizeLabel={
                            fuel === "all"
                              ? undefined
                              : `Square area = ${fuel} reported in ${ay} · largest field year ${
                                  fuel === "oil" ? fmtKt(fuelMax.oil / 1000) : fmtBcm(ksm3ToBcm(fuelMax.gas))
                                }`
                          }
                          describe={(p) => {
                            const st = stateOf(p);
                            const r = rowIn(p, ay);
                            const v =
                              st === "reported" && r
                                ? ` · oil ${fmtKt(r.oilTonnes / 1000)} · gas ${gasCell(r)}`
                                : "";
                            return `${sentence(p.name)} · ${st ? fieldYearStateLabel(st, ay) : "not started"}${v}`;
                          }}
                        />
                      </div>
                      <aside className={s.stationPanel} aria-label="Field record">
                        {selectedField ? (
                          <>
                            <button type="button" className={t.textButton} onClick={() => sync({ field: "" })}>
                              All fields
                            </button>
                            <p className="bo-label">
                              {fieldTypeLabel(selectedField.fieldType)}
                              {selectedField.status
                                ? ` · ${sentence(selectedField.status.replace(/^PRODUCTION\s+/i, ""))}`
                                : ""}
                            </p>
                            <h3 className={s.stationName}>{sentence(selectedField.name)}</h3>
                            {selectedState === "reported" && selectedRow ? (
                              <p className={s.stationValue}>
                                {fuel !== "gas" ? (
                                  <>
                                    <span className="bo-fig">{fmtKt(selectedRow.oilTonnes / 1000)}</span>
                                    <span className="bo-label">oil · {ay}</span>
                                  </>
                                ) : null}
                                {fuel !== "oil" ? (
                                  <>
                                    {fuel !== "gas" ? <span className="bo-label">·</span> : null}
                                    <span className="bo-fig">{gasCell(selectedRow)}</span>
                                    <span className="bo-label">gas · {ay}</span>
                                  </>
                                ) : null}
                              </p>
                            ) : (
                              <p className={s.stationValue}>
                                <span className="bo-label">
                                  {selectedState ? fieldYearStateLabel(selectedState, ay) : `Not started by ${ay}`}
                                </span>
                              </p>
                            )}
                            <dl className={s.stationMeta}>
                              <div>
                                <dt className="bo-label">Discovered</dt>
                                <dd className="bo-fig">{selectedField.discYear ?? "—"}</dd>
                              </div>
                              <div>
                                <dt className="bo-label">Started</dt>
                                <dd className="bo-fig">{selectedField.prodYear ?? "—"}</dd>
                              </div>
                              <div>
                                <dt className="bo-label">In the records</dt>
                                <dd className="bo-fig">
                                  {selectedTimeline?.first != null
                                    ? `${selectedTimeline.first}–${selectedTimeline.last}`
                                    : "—"}
                                </dd>
                              </div>
                              {selectedField.operator ? (
                                <div>
                                  <dt className="bo-label">Operator</dt>
                                  <dd>{selectedField.operator}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </>
                        ) : (
                          <>
                            <p className="bo-label">
                              {query.trim()
                                ? "Matching fields"
                                : status === "ceased"
                                  ? "Ceased fields"
                                  : fuel === "all"
                                    ? `Largest in ${ay} · oil and gas, in oil equivalent`
                                    : `Largest in ${ay}`}
                            </p>
                            <h3 className={s.stationName}>
                              <span className="bo-fig">{listFields.length}</span>
                            </h3>
                            <ul className={s.stationList}>
                              {listFields.slice(0, 12).map((f) => {
                                const r = rowIn(f, ay);
                                const start = fieldStartYear(f, timelines.get(f.name));
                                const preferGas = fuel === "gas";
                                const value =
                                  status === "ceased"
                                    ? start
                                      ? String(start)
                                      : "—"
                                    : fuel === "all"
                                      ? r
                                        ? fmtKt(fieldOilEquivalentTonnes(r) / 1000)
                                        : "—"
                                    : preferGas
                                      ? r
                                        ? gasCell(r)
                                        : "—"
                                      : r ? fmtKt(r.oilTonnes / 1000) : "—";
                                return (
                                  <li key={f.id}>
                                    <button type="button" onClick={() => sync({ field: f.id })}>
                                      <span>{sentence(f.name)}</span>
                                      <span className="bo-fig">{value}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        )}
                      </aside>
                    </div>
                  )}
                </section>
              )}

              {scale === "fuel" && (
                <>
                  {showOil && (
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>Oil from offshore fields · million tonnes</h3>
                      {oilSum.points.length === 0 ? (
                        <EmptyStage label="Field production unavailable">
                          Field oil figures are not available right now.
                        </EmptyStage>
                      ) : (
                        <TimeChart
                          label="Oil from offshore fields"
                          series={[oilSum]}
                          cadence="annual"
                          kind="line"
                          format={(v) => fmtMt(v)}
                          rules={ayRule}
                          showTable={false}
                        />
                      )}
                    </section>
                  )}
                  {showGas && (
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>Gas from offshore fields · bcm</h3>
                      {gasSum.points.length === 0 ? (
                        <EmptyStage label="Field production unavailable">
                          Field gas figures are not available right now.
                        </EmptyStage>
                      ) : (
                        <TimeChart
                          label="Gas from offshore fields"
                          series={[gasSum]}
                          cadence="annual"
                          kind="line"
                          format={(v) => fmtBcm(v)}
                          rules={ayRule}
                          showTable={false}
                        />
                      )}
                    </section>
                  )}
                </>
              )}

              {scale === "national" && (
                <>
                  {showOil && (
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>UK crude oil · million tonnes</h3>
                      {!crudeReady || crudeSeries.points.length === 0 ? (
                        <EmptyStage label="Crude oil unavailable">
                          UK crude oil figures are not available right now.
                        </EmptyStage>
                      ) : (
                        <TimeChart
                          label="UK crude oil"
                          series={[crudeSeries]}
                          cadence="annual"
                          kind="line"
                          format={(v) => fmtMt(v)}
                          rules={ayRule}
                          showTable={false}
                        />
                      )}
                    </section>
                  )}
                  {showGas && (
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>UK gas · bcm</h3>
                      {!gasReady || gasSeries.points.length === 0 ? (
                        <EmptyStage label="Gas unavailable">UK gas figures are not available right now.</EmptyStage>
                      ) : (
                        <TimeChart
                          label="UK gas"
                          series={[{ id: gasSeries.id, label: gasSeries.label, points: gasSeries.points }]}
                          cadence="annual"
                          kind="line"
                          format={(v) => fmtBcm(v)}
                          rules={ayRule}
                          showTable={false}
                        />
                      )}
                    </section>
                  )}
                </>
              )}

              {selectedField && (
                <>
                  {showOil && (
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>
                        {sentence(selectedField.name)} · oil · thousand tonnes
                      </h3>
                      {hasOil && oilFieldSeries ? (
                        <TimeChart
                          label={`${sentence(selectedField.name)} · oil`}
                          series={[oilFieldSeries]}
                          cadence="annual"
                          kind="line"
                          format={(v) => fmtKt(v)}
                          rules={ayRule}
                          showTable={false}
                        />
                      ) : (
                        <EmptyStage label="No oil reported">
                          The production records show no oil for this field.
                        </EmptyStage>
                      )}
                    </section>
                  )}
                  {showGas && (
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>
                        {sentence(selectedField.name)} · gas · bcm
                      </h3>
                      {hasGas && gasFieldSeries ? (
                        <TimeChart
                          label={`${sentence(selectedField.name)} · gas`}
                          series={[gasFieldSeries]}
                          cadence="annual"
                          kind="line"
                          format={(v) => fmtBcm(v)}
                          rules={ayRule}
                          showTable={false}
                        />
                      ) : (
                        <EmptyStage label="No gas reported">
                          The records show no gas for this field.
                        </EmptyStage>
                      )}
                    </section>
                  )}
                </>
              )}

              {scale === "field" && status === "ceased" && (
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>Ceased fields · by production-start decade</h3>
                  {closureDecades.points.length === 0 ? (
                    <EmptyStage label="No ceased fields with start years">
                      Ceased fields need a published production-start year for the decade chart.
                    </EmptyStage>
                  ) : (
                    <TimeChart
                      label="Ceased fields by production-start decade"
                      series={[closureDecades]}
                      cadence="annual"
                      kind="bars"
                      format={(v) => `${v.toLocaleString("en-GB")} fields`}
                      showTable={false}
                    />
                  )}
                </section>
              )}

            </div>
          )
        ) : view === "gap" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                UK fossil fuels beside energy imports and exports · oil-equivalent
                {gapEnergyFrom != null ? ` · from ${gapEnergyFrom}` : ""}
              </h3>
              {fossilTotal.points.length === 0 || importsMtoe.points.length === 0 ? (
                <EmptyStage label="Production gap unavailable">
                  UK fossil production or energy trade figures are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="UK fossil fuels beside energy imports and exports"
                  series={[fossilTotal, importsMtoe, exportsMtoe]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtMtoe(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                UK crude oil beside oil imports · million tonnes
                {gapOilFrom != null ? ` · from ${gapOilFrom}` : ""}
              </h3>
              {crudeGap.points.length === 0 || oilImports.points.length === 0 ? (
                <EmptyStage label="Oil gap series unavailable">
                  Crude oil or oil import figures are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="UK crude oil beside oil imports"
                  series={[crudeGap, oilImports]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtMt(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
          </div>
        ) : view === "reserves" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>Oil still counted as recoverable · million tonnes</h3>
              {oil2p.points.length === 0 ? (
                <EmptyStage label="Remaining oil series unavailable">
                  Remaining oil estimates are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Oil still counted as recoverable"
                  series={[oil2p]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtMt(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>Oil extracted that year · million tonnes</h3>
              {oilProdBook.points.length === 0 ? (
                <EmptyStage label="Oil extraction series unavailable">
                  The oil extraction column is not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Oil extracted that year"
                  series={[oilProdBook]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtMt(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>Gas still counted as recoverable · bcm</h3>
              {gas2p.points.length === 0 ? (
                <EmptyStage label="Remaining gas series unavailable">
                  Remaining gas estimates are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Gas still counted as recoverable"
                  series={[gas2p]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtBcm(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
          </div>
        ) : !crudeReady ? (
          <EmptyStage label="Crude oil unavailable">
            UK crude oil figures are not available right now.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                UK crude oil · million tonnes · {crudeYears[0]}–{crudeYears.at(-1)}
              </h3>
              <TimeChart
                label="UK crude oil"
                series={[crudeSeries]}
                cadence="annual"
                kind="line"
                format={(v) => fmtMt(v)}
                rules={[
                  { id: "year", t: y, label: String(y), active: true },
                  ...(peakPt ? [{ id: "peak", t: peakPt.t, label: `Peak ${peakPt.t}`, active: false }] : []),
                ]}
                showTable={false}
              />
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                UK gas · bcm · {gasYears[0] ?? "—"}–{gasYears.at(-1) ?? "—"}
              </h3>
              {!gasReady || gasSeries.points.length === 0 ? (
                <EmptyStage label="Gas series unavailable">UK gas figures are not available right now.</EmptyStage>
              ) : (
                <TimeChart
                  label="UK gas"
                  series={[{ id: gasSeries.id, label: gasSeries.label, points: gasSeries.points }]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtBcm(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                UK coal · million tonnes · {coalYears[0] ?? "—"}–{coalYears.at(-1) ?? "—"}
              </h3>
              {!coalReady || coalSeries.points.length === 0 ? (
                <EmptyStage label="Coal series unavailable">UK coal figures are not available right now.</EmptyStage>
              ) : (
                <TimeChart
                  label="UK coal"
                  series={[coalSeries]}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtMt(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Fossil fuels as oil-equivalent energy · coal, crude oil and NGLs, and gas ·{" "}
                {primaryYears[0] ?? "—"}–{primaryYears.at(-1) ?? "—"}
              </h3>
              {!primaryReady || primaryStack.every((sr) => sr.points.length === 0) ? (
                <EmptyStage label="Oil-equivalent series unavailable">
                  Fossil fuel energy figures are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Fossil fuels as oil-equivalent energy"
                  series={primaryStack}
                  cadence="annual"
                  kind="line"
                  format={(v) => fmtMtoe(v)}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  showTable={false}
                />
              )}
            </section>
          </div>
        )}
      </Stage>
    </>
  );
}

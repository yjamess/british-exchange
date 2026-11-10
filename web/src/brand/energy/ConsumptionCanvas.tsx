"use client";

/**
 * Energy Domain 02 — Energy Consumption flagship.
 * Linked stacked sector composition + W1 spine (≥1998).
 * Useful / rejected lives on Useful Energy Experiment, not this metabolism strip.
 * One Notes foot; chart titles use explorer stageTitle.
 */

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { RegionMap } from "../map";
import {
  ControlRow,
  EmptyStage,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  ResetButton,
  SearchControl,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
} from "../template";
import { EnergyStageFollow } from "../connections";
import { ENERGY_SOURCE } from "./citations";
import { energySource } from "./source";
import { viewReset } from "./reset";
import { ConsumptionAppetite } from "./ConsumptionAppetite";
import type { AppetiteLens } from "./appetite-model";
import {
  USEFUL_SECTORS,
  endUsesOf,
  flowItems,
  formatOverrides,
  latestYear as usefulLatestYear,
  parseOverrides,
  sectorLabel as usefulSectorLabel,
  totals,
  yearsOf as usefulYearsOf,
  type Assume,
  type UsefulPack,
  type UsefulScope,
} from "./useful-model";
import { ConsumptionUseful } from "./ConsumptionUseful";
import {
  CONSUMPTION_DATA_SERIES,
  ConsumptionData,
  consumptionDataFoot,
  type ConsumptionDataSeries,
} from "./ConsumptionData";
import {
  DOMESTIC_END_USES,
  DOMESTIC_END_USE_ID,
  FINAL_CONSUMPTION_ID,
  FLOW_STAGES,
  PRIMARY_FLOW_ID,
  SECTORS,
  SUBNATIONAL_ID,
  USEFUL_FROM,
  authorityRankRows,
  crossEndUseSectorRows,
  crossEndUseStack,
  endUseFuelRows,
  endUseStack,
  flowRowsFor,
  regionCodeForAuthorityLabel,
  fmtKtoe,
  fuelRowsFor,
  geographyRankRows,
  populationFor,
  sectorStack,
  toePerResident,
  yearsOf,
  type AppetiteMeasure,
  type ConsumptionPack,
  type DomesticEndUseId,
  type SectorId,
} from "./consumption-model";
import s from "./generation.module.css";

import { CONSUMPTION_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...CONSUMPTION_VIEWS];

type GeoSector = "all" | "domestic" | "transport" | "industry-commercial";
type GeoMeasure = "total" | "intensity";

const W1_FROM = 1998;
const INDEX_BASE_DEFAULT = 1970;

function fmtToePerResident(v: number): string {
  if (v >= 10) return `${v.toFixed(1)} toe/person`;
  if (v >= 1) return `${v.toFixed(2)} toe/person`;
  return `${v.toFixed(3)} toe/person`;
}

type Measure = AppetiteMeasure;

export type { ConsumptionPack };

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

export function ConsumptionCanvas({ pack }: { pack: ConsumptionPack }) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("consumption");
  const finalRows = pack.final?.observations ?? [];
  const flowRows = pack.flow?.observations ?? [];
  const years = yearsOf(finalRows);
  const latest = years.at(-1) ?? 2025;
  const earliest = years[0] ?? 1970;

  const [view, setView] = useState(() => (VIEWS.some((v) => v.id === searchParams.get("view")) ? searchParams.get("view")! : "metabolism"));
  const [measure, setMeasure] = useState<Measure>(() => {
    const m = searchParams.get("measure");
    return m === "share" || m === "index" || m === "absolute" ? m : "absolute";
  });
  const [year, setYear] = useState(() => clampYear(Number(searchParams.get("year") || latest), years, latest));
  const [compare, setCompare] = useState(() =>
    clampYear(Number(searchParams.get("compare") || earliest), years, earliest),
  );
  const [indexBase, setIndexBase] = useState(() =>
    clampYear(Number(searchParams.get("base") || INDEX_BASE_DEFAULT), years, INDEX_BASE_DEFAULT),
  );
  const [lens, setLens] = useState<AppetiteLens>(() => (searchParams.get("lens") === "fuel" ? "fuel" : "sector"));
  const [sector, setSector] = useState<SectorId>(() => {
    const s = searchParams.get("sector");
    return SECTORS.some((x) => x.id === s) ? (s as SectorId) : "all-final";
  });
  const [endUse, setEndUse] = useState<"all" | DomesticEndUseId>(() => {
    const e = searchParams.get("end_use");
    if (e === "all") return "all";
    return DOMESTIC_END_USES.includes(e as DomesticEndUseId) ? (e as DomesticEndUseId) : "all";
  });
  const [effEndUse, setEffEndUse] = useState(() => searchParams.get("eff_end_use") || "all");
  const [useSector, setUseSector] = useState<UsefulScope>(() => {
    const v = searchParams.get("use_sector");
    return USEFUL_SECTORS.some((x) => x.id === v) ? (v as UsefulScope) : "all";
  });
  const [assume, setAssume] = useState<Assume>(() => (searchParams.get("assume") === "scenario" ? "scenario" : "published"));
  const [effOver, setEffOver] = useState(() => searchParams.get("eff") || "");
  const [geoSector, setGeoSector] = useState<GeoSector>(() => {
    const g = searchParams.get("geo_sector");
    return g === "domestic" || g === "transport" || g === "industry-commercial" || g === "all" ? g : "all";
  });
  const [place, setPlace] = useState(() => searchParams.get("place") || "");
  const [endScope, setEndScope] = useState<"domestic" | "cross">(() =>
    searchParams.get("end_scope") === "cross" ? "cross" : "domestic",
  );
  const [crossEnd, setCrossEnd] = useState(() => {
    const c = searchParams.get("cross_end");
    if (!c || c === "all" || /^total$/i.test(c)) return "all";
    return c;
  });
  const [region, setRegion] = useState(() => searchParams.get("region") || "");
  const [geoMeasure, setGeoMeasure] = useState<GeoMeasure>(() =>
    searchParams.get("geo_measure") === "intensity" ? "intensity" : "total",
  );
  /** Local LA search — filters the authority ranks; selection still syncs via `place`. */
  const [placeQ, setPlaceQ] = useState("");
  const [dataSeries, setDataSeries] = useState<ConsumptionDataSeries>(() => {
    const d = searchParams.get("dataset");
    return CONSUMPTION_DATA_SERIES.some((x) => x.id === d) ? (d as ConsumptionDataSeries) : "c1";
  });

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        measure: Measure;
        year: number;
        compare: number;
        indexBase: number;
        lens: AppetiteLens;
        sector: SectorId;
        endUse: "all" | DomesticEndUseId;
        effEndUse: string;
        useSector: UsefulScope;
        assume: Assume;
        effOver: string;
        geoSector: GeoSector;
        place: string;
        endScope: "domestic" | "cross";
        crossEnd: string;
        region: string;
        geoMeasure: GeoMeasure;
        dataSeries: ConsumptionDataSeries;
      }>,
    ) => {
      const next = {
        view,
        measure,
        year,
        compare,
        indexBase,
        lens,
        sector,
        endUse,
        effEndUse,
        useSector,
        assume,
        effOver,
        geoSector,
        place,
        endScope,
        crossEnd,
        region,
        geoMeasure,
        dataSeries,
        ...patch,
      };
      setView(next.view);
      setMeasure(next.measure);
      setYear(next.year);
      setCompare(next.compare);
      setIndexBase(next.indexBase);
      setLens(next.lens);
      setSector(next.sector);
      setEndUse(next.endUse);
      setEffEndUse(next.effEndUse);
      setUseSector(next.useSector);
      setAssume(next.assume);
      setEffOver(next.effOver);
      setGeoSector(next.geoSector);
      setPlace(next.place);
      setEndScope(next.endScope);
      setCrossEnd(next.crossEnd);
      setRegion(next.region);
      setGeoMeasure(next.geoMeasure);
      setDataSeries(next.dataSeries);
      writeUrl({
        view: next.view,
        measure: next.measure,
        year: next.year,
        compare: next.compare,
        base: next.indexBase,
        lens: next.lens,
        sector: next.sector,
        end_use: next.endUse,
        eff_end_use: next.effEndUse,
        use_sector: next.useSector,
        assume: next.assume,
        eff: next.effOver || null,
        geo_sector: next.geoSector,
        end_scope: next.endScope,
        cross_end: next.crossEnd,
        geo_measure: next.geoMeasure,
        place: next.place || null,
        region: next.region || null,
        // c1 is the default table: leave it out of the URL so Reset (and a first visit) stay quiet.
        dataset: next.dataSeries === "c1" ? null : next.dataSeries,
        useful: null,
      });
    },
    [
      writeUrl,
      view,
      measure,
      year,
      compare,
      indexBase,
      lens,
      sector,
      endUse,
      effEndUse,
      useSector,
      assume,
      effOver,
      geoSector,
      place,
      endScope,
      crossEnd,
      region,
      geoMeasure,
      dataSeries,
    ],
  );

  if (!pack.final || finalRows.length === 0) {
    return (
      <>
        <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
        <Stage title="Energy metabolism">
          <EmptyStage label="Consumption series unavailable">
            Final energy consumption figures are not available right now. Try again after the next data refresh.
          </EmptyStage>
        </Stage>
      </>
    );
  }

  const endUseRows = pack.endUse?.observations ?? [];
  const crossRows = pack.crossEndUse?.observations ?? [];
  const endUseYears = yearsOf(endUseRows);
  const crossYears = yearsOf(crossRows);
  const geoYears = pack.geography?.years ?? [];
  const usefulPack = pack.efficiencies as UsefulPack | null;
  const usefulLatest = usefulLatestYear(usefulPack);
  const usefulEndUses = endUsesOf(usefulPack, useSector);
  const usefulEndUse = (useSector !== "all" && usefulEndUses.find((e) => e.toLowerCase() === effEndUse.toLowerCase())) || "all";
  /** End-use detail and coefficients exist for the latest year only; scenarios use the coefficients. */
  const usefulYears = usefulEndUse !== "all" || assume === "scenario" ? [usefulLatest] : usefulYearsOf(usefulPack);
  const overrides = parseOverrides(effOver);
  const ambientByYear = new Map(
    flowRows
      .filter((r) => (r.notes ?? "").includes("stage=Ambient heat") && typeof r.value === "number")
      .map((r) => [Number(r.period_start.slice(0, 4)), r.value as number]),
  );
  const yearPool =
    view === "end-use"
      ? endScope === "cross" && crossYears.length
        ? crossYears
        : endUseYears
      : (view === "geography" || (view === "data" && dataSeries === "geography")) && geoYears.length
        ? geoYears
        : view === "useful" && usefulYears.length
          ? usefulYears
          : years;
  const y = clampYear(year, yearPool.length ? yearPool : years, (yearPool.length ? yearPool : years).at(-1) ?? latest);
  const yearA = clampYear(compare, years, earliest);
  const yearB = y;
  const baseY = clampYear(indexBase, years, INDEX_BASE_DEFAULT);
  const stackAll = sectorStack(finalRows, measure === "index" ? "absolute" : measure, baseY);
  /** Fuel sector filters the metabolism chart + fuel breakdown; All final users keeps the full stack. */
  const stack = sector === "all-final" ? stackAll : stackAll.filter((s) => s.id === sector);
  const fuelSector: SectorId = sector;
  const fuels = fuelRowsFor(finalRows, fuelSector, y);
  const sectorLabel = SECTORS.find((x) => x.id === sector)?.label ?? sector;
  const flow = flowRowsFor(flowRows, y);
  /** Where + End use: All shows the full composition; a named end use drills into one series. */
  const endStackAll = endUseStack(endUseRows);
  const endStack = endUse === "all" ? endStackAll : endStackAll.filter((sr) => sr.id === endUse);
  const endFuels = endUse !== "all" ? endUseFuelRows(endUseRows, endUse, y) : [];
  const crossEndOptions = [
    ...new Set(
      crossRows
        .map((r) => {
          const n = (r.notes ?? "").split(";").find((p) => p.startsWith("end_use="));
          return n ? n.slice("end_use=".length) : "";
        })
        .filter((id) => id && !/^total$/i.test(id)),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const crossEndActive =
    crossEnd === "all" || !crossEndOptions.includes(crossEnd) ? "all" : crossEnd;
  const crossStackAll = crossEndUseStack(crossRows);
  const crossStack =
    crossEndActive === "all" ? crossStackAll : crossStackAll.filter((sr) => sr.id === crossEndActive);
  const crossSectors =
    crossEndActive === "all" ? [] : crossEndUseSectorRows(crossRows, crossEndActive, y);
  /** Data tab cites the series it shows, not always Table C1. */
  const dataFoot = view === "data" ? consumptionDataFoot(dataSeries, pack) : null;
  const popPack = pack.geography?.population ?? null;
  const intensityOn = geoMeasure === "intensity" && !!popPack;
  const geoRanks = geographyRankRows(
    pack.geography?.places ?? [],
    y,
    geoSector,
    popPack,
    intensityOn,
  );
  // The choropleth only has English-region shapes, so anything said about "the map" (largest
  // area, legend) must come from the same set. Nations stay in the Data tab ranks.
  const geoMapRanks = geoRanks.filter((r) => r.id.startsWith("E12"));
  const geoPlaces = pack.geography?.places ?? [];
  const geoAuthorities = pack.geography?.authorities ?? [];
  // Plain compute (not useMemo): this block sits after an early return, and Hooks
  // must not run conditionally — https://react.dev/reference/rules/rules-of-hooks
  const laRanks = (() => {
    const q = placeQ.trim().toLowerCase();
    const ranked = authorityRankRows(
      geoAuthorities,
      y,
      geoSector,
      400,
      popPack,
      intensityOn,
    );
    let rows = ranked;
    if (q) {
      rows = ranked.filter((r) => r.label.toLowerCase().includes(q));
    } else if (region) {
      rows = ranked.filter((r) => regionCodeForAuthorityLabel(r.label, geoPlaces) === region);
    }
    return rows.slice(0, 20);
  })();
  const selectedPlace = geoAuthorities.find((p) => p.code === place);
  const selectedPop = selectedPlace ? populationFor(popPack, selectedPlace.code, y) : null;
  const selectedKtoe = selectedPlace?.sectors[geoSector]?.[String(y)];
  const selectedRegionCode =
    (selectedPlace && regionCodeForAuthorityLabel(selectedPlace.label, geoPlaces)) || region;
  const selectedRegionPlace = geoPlaces.find((p) => p.code === selectedRegionCode);
  const mapRegion = selectedRegionCode.startsWith("E12") ? selectedRegionCode : region.startsWith("E12") ? region : "";
  const earliestGeo = geoYears[0] ?? 2005;
  const selectedThen = selectedPlace?.sectors[geoSector]?.[String(earliestGeo)];
  const selectedChangePct =
    typeof selectedKtoe === "number" &&
    typeof selectedThen === "number" &&
    selectedThen > 0
      ? ((selectedKtoe - selectedThen) / selectedThen) * 100
      : null;
  const regionKtoe = selectedRegionPlace?.sectors[geoSector]?.[String(y)];
  const placeShareOfRegion =
    typeof selectedKtoe === "number" && typeof regionKtoe === "number" && regionKtoe > 0
      ? (selectedKtoe / regionKtoe) * 100
      : null;
  const ukAll = geoPlaces.find((p) => p.code === "K02000001")?.sectors.all?.[String(y)];
  const openPlace = (code: string) => {
    const auth = geoAuthorities.find((p) => p.code === code);
    const parent = auth ? regionCodeForAuthorityLabel(auth.label, geoPlaces) : "";
    sync({ place: code, region: parent || region });
  };
  const denomYears = [
    ...new Set(
      [...geoRanks, ...laRanks]
        .map((r) => r.denomYear)
        .filter((d): d is number => typeof d === "number"),
    ),
  ];
  const intensityDenomNote =
    intensityOn && denomYears.length
      ? denomYears.every((d) => d === y)
        ? `Denominator: mid-${y} usually resident population (ONS MYE/MYEB).`
        : `Denominator: mid-year usually resident population (ONS). Where a mid-${y} figure is missing (English regions outside 2024), mid-2024 is used and labelled in Notes.`
      : null;
  const allTotal = finalRows.find((r) => {
    const n = r.notes ?? "";
    return r.period_start.startsWith(String(y)) && n.includes("sector=all-final") && n.includes("fuel=Total");
  });
  const totalKtoe = allTotal?.value;

  /** One unit per chart: Mtoe, two decimals for small end uses (lighting is a fraction of 1 Mtoe). */
  const fmtMtoeAxis = (v: number) => `${(v / 1000).toFixed(Math.abs(v) < 1000 && v !== 0 ? 2 : 1)} Mtoe`;
  const topSector = SECTORS.filter((x) => x.stack)
    .map((x) => {
      const row = finalRows.find(
        (r) =>
          r.period_start.startsWith(String(y)) &&
          (r.notes ?? "").includes(`sector=${x.id}`) &&
          (r.notes ?? "").includes("fuel=Total"),
      );
      return { label: x.label, v: (row?.value as number) ?? 0 };
    })
    .sort((p, q) => q.v - p.v)[0];
  const topShare = topSector && typeof totalKtoe === "number" && totalKtoe > 0 ? (topSector.v / totalKtoe) * 100 : null;
  const figures: ExplorerFigure[] = [
    {
      label: `${y} final consumption`,
      value: typeof totalKtoe === "number" ? fmtKtoe(totalKtoe) : "—",
      note: "All final users",
    },
    {
      label: "Largest sector",
      value: topSector?.label ?? "—",
      note: topShare != null ? `${topShare.toFixed(0)}% of final consumption · ${y}` : String(y),
    },
    {
      label: "Primary energy",
      value: y >= W1_FROM && flow.length ? fmtKtoe(flow.find((f) => f.id === "Primary energy")?.v ?? 0) : "—",
      note: y >= W1_FROM ? "Official statistics in development" : `Starts ${W1_FROM}`,
    },
  ];

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {(view === "metabolism" ||
        view === "end-use" ||
        view === "geography" ||
        view === "appetite" ||
        view === "useful") && (
        <FigureStrip
          figures={
            view === "useful"
              ? (() => {
                  const it = totals(flowItems(usefulPack, ambientByYear, useSector, usefulEndUse, y, assume, overrides));
                  const tag = assume === "scenario" ? "User scenario — not a DESNZ statistic" : "Published estimate";
                  const scopeName = usefulEndUse !== "all" ? `${usefulSectorLabel(useSector)} · ${usefulEndUse}` : usefulSectorLabel(useSector);
                  return [
                    { label: `Useful energy · ${y}`, value: fmtKtoe(it.useful), note: `${scopeName} · ${tag}` },
                    { label: `Lost energy · ${y}`, value: fmtKtoe(it.rejected), note: `${(it.useful + it.rejected > 0 ? (it.rejected / (it.useful + it.rejected)) * 100 : 0).toFixed(1)}% of the total` },
                    {
                      label: "Heat from surroundings",
                      value: fmtKtoe(it.ambient),
                      note: it.ambient > 0 ? "Drawn in by heat pumps" : "None in this selection",
                    },
                  ];
                })()
              : view === "geography"
              ? [
                  {
                    label: `${y} UK subnational total`,
                    value: typeof ukAll === "number" ? fmtKtoe(ukAll) : "—",
                    note: "All fuels · DESNZ subnational",
                  },
                  {
                    label: "Largest English region",
                    value: geoMapRanks[0]?.label ?? "—",
                    note: geoMapRanks[0] ? fmtKtoe(geoMapRanks[0].v) : String(y),
                  },
                  {
                    label: "Smallest English region",
                    value: geoMapRanks.at(-1)?.label ?? "—",
                    note: geoMapRanks.at(-1) ? fmtKtoe(geoMapRanks.at(-1)!.v) : String(y),
                  },
                ]
              : figures
          }
        />
      )}
      <ControlRow label="Consumption controls">
        {(view === "metabolism" || view === "appetite") && (
          <MenuControl
            label="Measure"
            value={measure === "index" && view === "metabolism" ? "absolute" : measure}
            options={
              view === "appetite"
                ? [
                    { value: "absolute", label: "Energy consumed" },
                    { value: "share", label: "Share of total" },
                    { value: "index", label: `Index (${baseY} = 100)` },
                  ]
                : [
                    { value: "absolute", label: "Energy consumed" },
                    { value: "share", label: "Share of all final" },
                  ]
            }
            onChange={(v) => sync({ measure: v })}
          />
        )}
        {view === "appetite" && (
          <MenuControl
            label="Break down by"
            value={lens}
            options={[
              { value: "sector", label: "Sector" },
              { value: "fuel", label: "Fuel" },
            ]}
            onChange={(v) => sync({ lens: v as AppetiteLens })}
          />
        )}
        {view === "appetite" && lens === "fuel" && (
          <MenuControl
            label="In sector"
            value={sector}
            options={SECTORS.map((x) => ({ value: x.id, label: x.label }))}
            onChange={(v) => sync({ sector: v as SectorId })}
          />
        )}
        {(view !== "data" || dataSeries === "geography") && (
          <MenuControl
            label={view === "appetite" ? "Compare to" : "Year"}
            value={view === "appetite" ? String(yearA) : String(y)}
            options={(yearPool.length ? yearPool : years)
              .slice()
              .reverse()
              .map((yy) => ({ value: String(yy), label: String(yy) }))}
            onChange={(v) =>
              view === "appetite" ? sync({ compare: Number(v) }) : sync({ year: Number(v) })
            }
          />
        )}
        {view === "appetite" && (
          <MenuControl
            label="With year"
            value={String(y)}
            options={[...years].reverse().map((yy) => ({ value: String(yy), label: String(yy) }))}
            onChange={(v) => sync({ year: Number(v) })}
          />
        )}
        {view === "appetite" && measure === "index" && (
          <MenuControl
            label="Index base"
            value={String(baseY)}
            options={[...years].reverse().map((yy) => ({ value: String(yy), label: String(yy) }))}
            onChange={(v) => sync({ indexBase: Number(v), measure: "index" })}
          />
        )}
        {view === "metabolism" && (
          <MenuControl
            label="Fuel sector"
            value={sector}
            options={SECTORS.map((x) => ({ value: x.id, label: x.label }))}
            onChange={(v) => sync({ sector: v })}
          />
        )}
        {view === "end-use" && (
          <>
            <MenuControl
              label="Where"
              value={endScope}
              options={[
                { value: "domestic", label: "Homes" },
                { value: "cross", label: "Cross-sector" },
              ]}
              onChange={(v) => sync({ endScope: v })}
            />
            {endScope === "domestic" ? (
              <MenuControl
                label="End use"
                value={endUse}
                options={[
                  { value: "all", label: "All" },
                  ...DOMESTIC_END_USES.map((id) => ({
                    value: id,
                    label: id.charAt(0).toUpperCase() + id.slice(1),
                  })),
                ]}
                onChange={(v) => sync({ endUse: v as "all" | DomesticEndUseId })}
              />
            ) : (
              <MenuControl
                label="End use"
                value={crossEndActive}
                options={[
                  { value: "all", label: "All" },
                  ...crossEndOptions.map((id) => ({ value: id, label: id })),
                ]}
                onChange={(v) => sync({ crossEnd: v })}
              />
            )}
          </>
        )}
        {view === "useful" && (
          <>
            <MenuControl
              label="Sector"
              value={useSector}
              options={[
                { value: "all", label: "All sectors" },
                ...USEFUL_SECTORS.map((x) => ({ value: x.id, label: x.label })),
              ]}
              onChange={(v) => sync({ useSector: v as UsefulScope, effEndUse: "all" })}
            />
            {useSector !== "all" && (
              <MenuControl
                label={`End use · ${usefulLatest}`}
                value={usefulEndUse}
                options={[{ value: "all", label: "All end uses" }, ...usefulEndUses.map((id) => ({ value: id, label: id }))]}
                onChange={(v) => sync({ effEndUse: v, ...(v !== "all" ? { year: usefulLatest } : {}) })}
              />
            )}
            <MenuControl
              label="Assumptions"
              value={assume}
              options={
                usefulPack?.identity?.reproducible
                  ? [
                      { value: "published", label: "Published estimate" },
                      { value: "scenario", label: "Change assumptions" },
                    ]
                  : [{ value: "published", label: "Published estimate" }]
              }
              onChange={(v) => sync({ assume: v as Assume, ...(v === "scenario" ? { year: usefulLatest } : { effOver: "" }) })}
            />
          </>
        )}
        {view === "data" && (
          <MenuControl
            label="Series"
            value={dataSeries}
            options={CONSUMPTION_DATA_SERIES.map((x) => ({ value: x.id, label: x.label }))}
            onChange={(v) => sync({ dataSeries: v as ConsumptionDataSeries })}
          />
        )}
        {view === "data" && dataSeries === "geography" && (
          <MenuControl
            label="Sector"
            value={geoSector}
            options={[
              { value: "all", label: "Total" },
              { value: "domestic", label: "Domestic" },
              { value: "transport", label: "Transport" },
              { value: "industry-commercial", label: "Industry & commercial" },
            ]}
            onChange={(v) => sync({ geoSector: v })}
          />
        )}
        {view === "geography" && (
          <>
            <MenuControl
              label="Sector"
              value={geoSector}
              options={[
                { value: "all", label: "Total" },
                { value: "domestic", label: "Domestic" },
                { value: "transport", label: "Transport" },
                { value: "industry-commercial", label: "Industry & commercial" },
              ]}
              onChange={(v) => sync({ geoSector: v })}
            />
            <MenuControl
              label="Measure"
              value={geoMeasure}
              options={[
                { value: "total", label: "Total consumption" },
                {
                  value: "intensity",
                  label: popPack ? "Per resident" : "Per resident (needs population)",
                },
              ]}
              onChange={(v) => sync({ geoMeasure: v as GeoMeasure })}
            />
            <SearchControl
              label="Search local authority"
              value={placeQ}
              placeholder="Type a council name…"
              note={`${geoAuthorities.filter((p) => p.la !== "Unallocated").length} authorities`}
              onChange={(v) => {
                setPlaceQ(v);
                const q = v.trim().toLowerCase();
                if (!q) {
                  if (place) sync({ place: "" });
                  return;
                }
                const matches = authorityRankRows(
                  geoAuthorities,
                  y,
                  geoSector,
                  400,
                  popPack,
                  intensityOn,
                ).filter((r) => r.label.toLowerCase().includes(q));
                // One clear match (e.g. "Leeds") → open the place reading beside the map.
                if (matches.length === 1) {
                  openPlace(matches[0]!.id);
                  return;
                }
                const exact = matches.find(
                  (r) =>
                    r.label.toLowerCase().startsWith(`${q} (`) ||
                    r.label.split(" (")[0]!.toLowerCase() === q,
                );
                if (exact) {
                  openPlace(exact.id);
                  return;
                }
                if (place && !matches.some((r) => r.id === place)) sync({ place: "" });
              }}
            />
          </>
        )}
        {(() => {
          const defaultYear =
            (view === "geography" || (view === "data" && dataSeries === "geography")
              ? geoYears
              : years
            ).at(-1) ?? latest;
          const current = { measure, year: y, compare, indexBase, lens, sector, endUse, effEndUse, useSector, assume, effOver, geoSector, place, endScope, crossEnd, region, geoMeasure, dataSeries };
          const defaults: typeof current = { measure: "absolute", year: defaultYear, compare: earliest, indexBase: INDEX_BASE_DEFAULT, lens: "sector", sector: "all-final", endUse: "all", effEndUse: "all", useSector: "all", assume: "published", effOver: "", geoSector: "all", place: "", endScope: "domestic", crossEnd: "all", region: "", geoMeasure: "total", dataSeries: "c1" };
          const keys: (keyof typeof current)[] = view === "geography" ? ["year", "geoSector", "place", "region", "geoMeasure"]
            : view === "useful" ? ["year", "assume", "effOver", "effEndUse", "useSector"]
              : view === "end-use" ? ["year", "endUse", "endScope", "crossEnd", "sector"]
                : view === "data" ? ["year", "dataSeries", "geoSector", "place"]
                  : view === "appetite" ? ["year", "measure", "compare", "indexBase", "lens", "sector"]
                    : ["year", "measure", "compare", "indexBase", "sector"];
          const patch = viewReset(current, defaults, keys);
          return (Object.keys(patch).length > 0 || (view === "geography" && Boolean(placeQ))) && (
            <ResetButton onClick={() => {
              if (view === "geography") setPlaceQ("");
              sync(patch);
            }} />
          );
        })()}
      </ControlRow>

      <Stage
        title={
          view === "data"
            ? `Data · ${CONSUMPTION_DATA_SERIES.find((x) => x.id === dataSeries)?.label ?? "archive"}`
            : view === "appetite"
              ? `Long-run demand · ${earliest}–${latest}`
              : view === "useful"
                ? `Useful energy experiment · ${assume === "scenario" ? "user scenario — not a DESNZ statistic" : "published estimate"} · ${y}`
                : view === "end-use"
                  ? endScope === "cross"
                    ? `Energy use across sectors · ${crossEndActive === "all" ? "all end uses" : crossEndActive}`
                    : `Energy use in homes · ${endUse === "all" ? "all end uses" : endUse}`
                  : view === "geography"
                    ? `Energy geography · ${geoYears[0] ?? 2005}–${geoYears.at(-1) ?? 2024}`
                    : `Energy metabolism · ${earliest}–${latest} · ${measure === "share" ? "share of all final users" : "Mtoe"}`
        }
        meta={
          view === "end-use"
            ? endScope === "cross"
              ? "UK · by end use across sectors · transport excluded"
              : "UK · how homes use energy"
            : view === "geography"
              ? "English regions and local authorities · DESNZ subnational final consumption"
              : view === "useful"
                ? assume === "scenario"
                  ? "Energy used → useful and lost · user scenario — not a DESNZ statistic"
                  : "Energy used → useful and lost · DESNZ modelled estimates"
                : "UK · calendar year · final consumption"
        }
        follow={
          <EnergyStageFollow
            domain="consumption"
            view={view}
            selection={{ year: y }}
            label={`Consumption · ${view}`}
          />
        }
        foot={
          <FigureRecord
            source={energySource("consumption", view, dataFoot
                ? dataFoot.source
                : view === "geography"
                ? ENERGY_SOURCE.consumptionGeography
                : view === "end-use"
                  ? ENERGY_SOURCE.consumptionEndUse
                  : view === "useful"
                    ? ENERGY_SOURCE.consumptionUseful
                    : ENERGY_SOURCE.consumptionFinal)}
            definition={
              dataFoot
                ? dataFoot.definition
                : view === "geography"
                ? intensityOn
                  ? `Subnational final energy intensity: DESNZ ktoe ÷ ONS mid-year usually resident population (toe per person), ${geoSector}, ${y}.`
                  : "Subnational total final energy consumption (ktoe) from DESNZ, 2005–2024. The map draws the nine English regions and local authorities sit beside it; Scotland, Wales and Northern Ireland totals are in Data, not drawn here."
                : view === "end-use"
                  ? "UK domestic final energy consumption by end use and fuel (ktoe) from DESNZ ECUK Table U3."
                  : view === "useful"
                    ? "Modelled useful and lost energy from ECUK Table W1, with published Assumed Efficiencies for domestic end uses."
                    : view === "appetite"
                      ? "Long-run UK final energy demand by sector, or by fuel within a sector (ECUK Table C1) — absolute, share of the scope total, and index on a stated base year."
                      : "UK final energy consumption by sector and fuel (ktoe) from DESNZ Energy Consumption in the UK (ECUK) Table C1."
            }
            method={
              dataFoot
                ? dataFoot.method
                : view === "geography"
                ? ([
                    "This is not national ECUK Table C1. Coverage starts in 2005; methods and transport scope differ (road and rail only; unallocated rows exist).",
                    intensityOn
                      ? "Intensity = All-fuels sector ktoe × 1000 ÷ mid-year usually resident population (toe per person). Population is the People pack subnational-population-estimate (ONS MYE2 mid-2024 + MYEB1 LA series 2011–2025)."
                      : "Nation/region bars and LA ranks are totals (ktoe). Switch Measure to Per resident when the population pack is linked.",
                    intensityOn
                      ? "Resident intensity is not household intensity: places with large workplace or visitor demand (e.g. City of London) rank high because the denominator is usually resident population."
                      : null,
                    intensityDenomNote,
                    pack.geography?.population?.note,
                    pack.geography?.note,
                    pack.geography?.authoritiesNote,
                    pack.geography?.meta?.caveats,
                  ].filter(Boolean) as string[])
                : view === "end-use"
                  ? ([
                      "Homes covers how UK households use energy: space heating, water heating, cooking, lighting and appliances — only where the statistics publish them.",
                      "Cross-sector compares the same end use across industry, commercial and other non-transport sectors. Transport is not in this cut. Coverage is shorter than the homes series.",
                      "Choose Where and End use above. All shows every published function in that place; a named end use drills into its history and breakdown. This is national aggregate use — not any particular building.",
                      "Fuel totals must not be summed with their fuel splits. Some early years leave appliances or fuel cells unpublished.",
                      pack.endUse?.meta.caveats,
                      pack.crossEndUse?.meta.caveats,
                    ].filter(Boolean) as string[])
                  : view === "useful"
                    ? ([
                        "Useful energy is the heat, light, motion and other services people actually get from the energy they use. The rest is lost, mostly as waste heat. This is different from primary energy, which also counts losses before energy reaches users.",
                        "DESNZ estimates useful and lost energy by applying an assumed efficiency to each use of each fuel. These are estimates, not measurements.",
                        `Figures by sector run from ${usefulYearsOf(usefulPack)[0] ?? USEFUL_FROM} to ${usefulLatest}. Figures by end use, and the efficiencies themselves, are published for ${usefulLatest} only.`,
                        "Heat pumps also draw heat from the air, ground or water around them, so their useful output can be larger than the electricity they use. That extra heat is counted as useful energy but not as energy used.",
                        "Change assumptions lets you edit the efficiencies and recalculates with the same method DESNZ uses, which reproduces every published figure exactly. Your results are your own scenario, not official statistics.",
                        "Which assumptions matter most is our calculation, not a DESNZ figure: how much the share lost would fall if one efficiency were 10% better, with everything else unchanged.",
                        "Sectors and technologies are not ranked against each other. Heating, vehicles and lighting turn energy into very different things, so one efficiency score would mislead.",
                        "Share lost under earlier and current assumptions is DESNZ's comparison with the efficiencies it used in 2017. Differences reflect updated assumptions, not necessarily real-world improvements.",
                        "Official Statistics in Development.",
                      ].filter(Boolean) as string[])
                    : view === "appetite"
                      ? ([
                          "Same ECUK Table C1 values as Energy metabolism: absolute ktoe, share of the published Total for the chosen scope, or index on an explicit base year.",
                          "Break down by sector (Industry, Transport, Domestic, Services & other) or by fuel within a chosen sector / all final users.",
                          "Then / Now and Change use two stated years (Then year / Now year). Open markers are the Then year and solid markers the Now year. A fall beside a rise is shown, not labelled as substitution or cause.",
                          "Table C1 is not temperature corrected: unusually cold or warm years move heating demand.",
                          pack.final.meta.caveats,
                        ].filter(Boolean) as string[])
                      : ([
                          "Fuel sector filters the history chart and the fuel breakdown. All final users shows Industry, Transport, Domestic and Services & other stacked together.",
                          "All final users is the published total — not stacked as a fifth band.",
                          `Primary allocation (Table W1) appears from ${W1_FROM} and is Official Statistics in Development. It is national — Fuel sector does not filter W1.`,
                          `Modelled useful and lost energy lives under Useful energy experiment (from ${USEFUL_FROM}) — not on this metabolism strip.`,
                          `Primary allocation stages follow ECUK Table W1 order: ${FLOW_STAGES.join(" · ")}. Transfers can be signed in the source; the bars use magnitude for reading.`,
                          "The all-fuels total for each sector is published separately; the fuel rows are not added to it.",
                          pack.final.meta.caveats,
                          pack.flow?.meta.caveats,
                        ].filter(Boolean) as string[])
            }
            dataHref={`/data?record=${
              dataFoot
                ? dataFoot.recordId
                : view === "geography"
                ? SUBNATIONAL_ID
                : view === "end-use"
                  ? DOMESTIC_END_USE_ID
                  : view === "useful"
                    ? PRIMARY_FLOW_ID
                    : FINAL_CONSUMPTION_ID
            }`}
          />
        }
      >
        {view === "appetite" ? (
          <ConsumptionAppetite
            rows={finalRows}
            lens={lens}
            scope={sector}
            measure={measure}
            indexBase={baseY}
            yearA={yearA}
            yearB={yearB}
          />
        ) : view === "useful" ? (
          <ConsumptionUseful
            pack={usefulPack}
            ambientByYear={ambientByYear}
            sector={useSector}
            endUse={usefulEndUse}
            year={y}
            assume={assume}
            overrides={overrides}
            onOverride={(id, value) => {
              const next = { ...overrides };
              if (value == null) delete next[id];
              else next[id] = value;
              sync({ effOver: formatOverrides(next) });
            }}
            onRestore={() => sync({ effOver: "" })}
          />
        ) : view === "geography" ? (
          <div className={s.stack}>
            {!pack.geography || geoRanks.length === 0 ? (
              <EmptyStage label="Subnational geography unavailable">
                Regional and local energy consumption figures are not available right now.
              </EmptyStage>
            ) : (
              <div
                className={`${s.atlasLayout} ${
                  selectedPlace || region || placeQ.trim() ? "" : s.atlasLayoutMapOnly
                }`}
              >
                <div className={s.atlasMap}>
                  <RegionMap
                    size="stage"
                    data={geoMapRanks
                      .map((r) => ({
                        code: r.id,
                        value: r.v,
                        display: intensityOn ? fmtToePerResident(r.v) : fmtKtoe(r.v),
                      }))}
                    selected={mapRegion || null}
                    onSelect={(code) => {
                      setPlaceQ("");
                      sync({ region: region === code ? "" : code, place: "" });
                    }}
                    label={`Subnational final consumption by English region, ${geoSector}, ${y}${
                      intensityOn ? ", per resident" : ""
                    }`}
                    legendFormat={(v) => (intensityOn ? fmtToePerResident(v) : fmtKtoe(v))}
                    legendUnit={intensityOn ? "Tonnes of oil equivalent per person" : "Total consumption"}
                  />
                </div>

                {(selectedPlace || region || placeQ.trim()) && (
                  <aside className={s.geoPanel} aria-label="Place reading">
                    <div className={s.geoPanelHead}>
                      <p className="bo-label">
                        {y}
                        {intensityOn ? " · per resident" : " · total"}
                      </p>
                      <button
                        type="button"
                        className={t.textButton}
                        onClick={() => {
                          setPlaceQ("");
                          sync({ place: "", region: "" });
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    {selectedPlace ? (
                      <>
                        <h3 className={s.stationName}>{selectedPlace.la}</h3>
                        {selectedRegionPlace && (
                          <p className={s.links}>
                            {selectedRegionPlace.label.replace(/ \(inc unallocated\)/i, "")}
                          </p>
                        )}
                        <p className={s.stationValue}>
                          <span className="bo-fig">
                            {intensityOn && selectedPop && typeof selectedKtoe === "number"
                              ? toePerResident(selectedKtoe, selectedPop.persons).toLocaleString(
                                  "en-GB",
                                  { maximumFractionDigits: 2 },
                                )
                              : typeof selectedKtoe === "number"
                                ? (selectedKtoe / 1000).toLocaleString("en-GB", {
                                    maximumFractionDigits: 2,
                                  })
                                : "—"}
                          </span>
                          <span className="bo-label">{intensityOn ? "toe/person" : "Mtoe"}</span>
                        </p>
                        <dl className={s.geoPanelMeta}>
                          {(
                            [
                              ["domestic", "Domestic"],
                              ["transport", "Transport"],
                              ["industry-commercial", "Industry & commercial"],
                            ] as const
                          ).map(([sec, label]) => {
                            const ktoe = selectedPlace.sectors[sec]?.[String(y)] ?? 0;
                            if (ktoe <= 0) return null;
                            const v =
                              intensityOn && selectedPop
                                ? toePerResident(ktoe, selectedPop.persons)
                                : ktoe / 1000;
                            return (
                              <div key={sec}>
                                <dt>{label}</dt>
                                <dd>{v.toLocaleString("en-GB", { maximumFractionDigits: 2 })}</dd>
                              </div>
                            );
                          })}
                          {selectedChangePct != null && !intensityOn && (
                            <div>
                              <dt>
                                Change · {earliestGeo}–{y}
                              </dt>
                              <dd>
                                {selectedChangePct > 0 ? "+" : ""}
                                {selectedChangePct.toFixed(1)}%
                              </dd>
                            </div>
                          )}
                          {placeShareOfRegion != null && (
                            <div>
                              <dt>Share of region</dt>
                              <dd>{placeShareOfRegion.toFixed(1)}%</dd>
                            </div>
                          )}
                          {selectedPop && (
                            <div>
                              <dt>Residents · mid-{selectedPop.denomYear}</dt>
                              <dd>{Math.round(selectedPop.persons).toLocaleString("en-GB")}</dd>
                            </div>
                          )}
                        </dl>
                      </>
                    ) : region && !placeQ.trim() ? (
                      <>
                        <h3 className={s.stationName}>
                          {selectedRegionPlace?.label.replace(/ \(inc unallocated\)/i, "") ??
                            "Region"}
                        </h3>
                        <p className={s.stationValue}>
                          <span className="bo-fig">
                            {(() => {
                              const row = geoRanks.find((r) => r.id === region);
                              if (!row) return "—";
                              return intensityOn
                                ? row.v.toLocaleString("en-GB", { maximumFractionDigits: 2 })
                                : (row.v / 1000).toLocaleString("en-GB", {
                                    maximumFractionDigits: 1,
                                  });
                            })()}
                          </span>
                          <span className="bo-label">{intensityOn ? "toe/person" : "Mtoe"}</span>
                        </p>
                        <p className="bo-label">Authorities in this area</p>
                        {laRanks.length === 0 ? (
                          <p className={s.links}>No local-authority rows for this selection.</p>
                        ) : (
                          <ul className={s.stationList}>
                            {laRanks.map((r) => (
                              <li key={r.id}>
                                <button type="button" onClick={() => openPlace(r.id)}>
                                  <span>{r.label.replace(/ \([^)]+\)\s*$/, "")}</span>
                                  <span className="bo-fig">
                                    {intensityOn
                                      ? r.v.toLocaleString("en-GB", { maximumFractionDigits: 2 })
                                      : (r.v / 1000).toLocaleString("en-GB", {
                                          maximumFractionDigits: 2,
                                        })}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className={s.stationName}>Search</h3>
                        <p className={s.links}>
                          {laRanks.length === 0
                            ? "No matching authorities."
                            : "Choose a council to open its reading."}
                        </p>
                        {laRanks.length > 0 && (
                          <ul className={s.stationList}>
                            {laRanks.map((r) => (
                              <li key={r.id}>
                                <button type="button" onClick={() => openPlace(r.id)}>
                                  <span>{r.label}</span>
                                  <span className="bo-fig">
                                    {intensityOn
                                      ? r.v.toLocaleString("en-GB", { maximumFractionDigits: 2 })
                                      : (r.v / 1000).toLocaleString("en-GB", {
                                          maximumFractionDigits: 2,
                                        })}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </aside>
                )}
              </div>
            )}
          </div>
        ) : view === "end-use" ? (
          <div className={s.stack}>
            {endScope === "cross" ? (
              !pack.crossEndUse || crossRows.length === 0 ? (
                <EmptyStage label="Cross-sector series unavailable">
                  Cross-sector end-use data is not available yet.
                </EmptyStage>
              ) : (
                <>
                  <section className={s.panel}>
                    <h3 className={t.stageTitle}>
                      {crossEndActive === "all"
                        ? "Cross-sector end uses · over time · Mtoe"
                        : `${crossEndActive} · over time · Mtoe`}
                    </h3>
                    <TimeChart
                      key={`cross-end-${crossEndActive}`}
                      label={
                        crossEndActive === "all"
                          ? "UK end-use consumption across sectors"
                          : `UK ${crossEndActive} consumption across sectors`
                      }
                      series={crossStack}
                      cadence="annual"
                      kind="line"
                      zero
                      showTable={false}
                      format={fmtMtoeAxis}
                    />
                  </section>
                  {crossEndActive !== "all" && (
                    <section className={s.panel}>
                      <h3 className={t.stageTitle}>Who uses it · {crossEndActive} · {y}</h3>
                      {crossSectors.length > 0 ? (
                        <RankBars
                          key={`cross-sectors-${crossEndActive}-${y}`}
                          label={`${crossEndActive} by sector, ${y}`}
                          rows={crossSectors.map((r) => ({ id: r.id, label: r.label, v: r.v / 1000 }))}
                          format={(v) => `${v.toFixed(2)} Mtoe`}
                        />
                      ) : (
                        <p className={s.links}>No positive sector rows for this end use in {y}.</p>
                      )}
                    </section>
                  )}
                </>
              )
            ) : !pack.endUse || endUseRows.length === 0 ? (
              <EmptyStage label="Homes end-use series unavailable">
                Domestic end-use data is not available yet.
              </EmptyStage>
            ) : (
              <>
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    {endUse === "all"
                      ? "Homes · all end uses · over time · Mtoe"
                      : `${(endUse.charAt(0).toUpperCase() + endUse.slice(1))} in homes · over time · Mtoe`}
                  </h3>
                  <TimeChart
                    key={`end-use-${endUse}`}
                    label={
                      endUse === "all"
                        ? "UK domestic energy consumption by end use"
                        : `UK domestic ${endUse} consumption`
                    }
                    series={endStack}
                    cadence="annual"
                    kind="line"
                    zero
                    showTable={false}
                    format={fmtMtoeAxis}
                  />
                </section>
                {endUse !== "all" && (
                  <section className={s.panel}>
                    <h3 className={t.stageTitle}>
                      Fuels · {(endUse.charAt(0).toUpperCase() + endUse.slice(1))} · {y}
                    </h3>
                    {endFuels.length > 0 ? (
                      <RankBars
                        key={`end-fuels-${endUse}-${y}`}
                        label={`Domestic ${endUse} by fuel, ${y}`}
                        rows={endFuels.map((f) => ({ id: f.id, label: f.label, v: f.v / 1000 }))}
                        format={(v) => `${v.toFixed(2)} Mtoe`}
                      />
                    ) : (
                      <p className={s.links}>
                        No fuel split for this end use in {y}. Some early years leave appliances or fuels
                        unpublished — try a later year.
                      </p>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        ) : view === "metabolism" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                {sector === "all-final"
                  ? `Final consumption by sector · ${measure === "share" ? "share of all final users" : "Mtoe"}`
                  : `${sectorLabel} · ${measure === "share" ? "share of all final users" : "Mtoe"}`}
              </h3>
              <TimeChart
                key={`metabolism-${sector}-${measure}`}
                label={
                  sector === "all-final"
                    ? "UK final energy consumption by sector"
                    : `UK final energy consumption · ${sectorLabel}`
                }
                series={stack}
                cadence="annual"
                kind={sector === "all-final" && measure === "share" ? "stack" : "line"}
                zero
                showTable={false}
                format={(v) => (measure === "share" ? `${(v * 100).toFixed(0)}%` : `${(v / 1000).toFixed(1)} Mtoe`)}
              />
            </section>

            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Fuels · {SECTORS.find((x) => x.id === fuelSector)?.label} · {y} · Mtoe
              </h3>
              {fuels.length > 0 ? (
                <RankBars
                  key={`fuels-${fuelSector}-${y}`}
                  label={`Final consumption by fuel, ${fuelSector}, ${y}`}
                  rows={fuels.map((f) => ({ id: f.id, label: f.label, v: f.v / 1000 }))}
                  format={(v) => `${v.toFixed(2)} Mtoe`}
                />
              ) : (
                <p className={t.stageTitle}>No positive fuel rows for this sector and year.</p>
              )}
            </section>

            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Primary allocation · {y >= W1_FROM ? y : `from ${W1_FROM}`}
              </h3>
              {y >= W1_FROM && flow.length > 0 ? (
                <>
                  <RankBars
                    key={`flow-${y}`}
                    label={`Primary energy allocation by destination, ${y}`}
                    rows={flow.map((f) => ({
                      id: f.id,
                      label: f.label,
                      v: Math.abs(f.v) / 1000,
                    }))}
                    format={(v) => `${v.toFixed(1)} Mtoe`}
                  />
                </>
              ) : (
                <EmptyStage label={`Published from ${W1_FROM}`}>Choose {W1_FROM} or later.</EmptyStage>
              )}
            </section>
          </div>
        ) : (
          <ConsumptionData pack={pack} series={dataSeries} year={y} geoSector={geoSector} />
        )}
      </Stage>
    </>
  );
}

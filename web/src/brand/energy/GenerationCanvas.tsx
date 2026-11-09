"use client";

/**
 * Energy Domain 01 — Electricity Generation stage.
 * One Notes foot (FigureRecord) — definition/method never duplicated in the plot.
 * Multi-chart titles use explorer `stageTitle` (Housing pipeline pattern).
 */

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import {
  ChangeRows,
  RankBars,
  TimeChart,
  type ChartSeries,
} from "../instrument/TimeChart";
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
  filterStations,
  isMapped,
  normalizeRegion,
  parseStationKey,
  resolveStationSelection,
  stationGroup,
  stationKey,
  stationTechnology,
} from "./station-model";
import {
  fmtGw,
  historyDecadeFlows,
  largestClosures,
  regionCapacityRows,
  type AtlasReading,
} from "./atlas-model";
import { ENERGY_SOURCE } from "./citations";
import { FUELS, followFuel, fuelById, type FuelId } from "./fuels";
import {
  annualLabel,
  compareFuels,
  compositionRows,
  fmtShare,
  fmtTwh,
  fuelTrajectory,
  yearRow,
  yearsOf,
  type YearFuel,
} from "./generation-model";
import {
  capacityRowsForYear,
  yearMonthlyLines,
  type AtlasPack,
  type CapacityPack,
  type GenerationPack,
  type YearPack,
} from "./packs";
import { fmtT } from "../data";
import { StationPointMap, type StationPoint } from "../charts/StationPointMap";
import type { Observation } from "@/lib/api";
import { ChangingCurrent, type CurrentState } from "./ChangingCurrent";
import { CompareFlow } from "./CompareFlow";
import {
  LONG_FUELS,
  LONG_RUN_SOURCE,
  fmtPct,
  fmtTWh,
  value as lrValue,
  type Layout,
  type LongFuelId,
  type LongRunPack,
  type LongYear,
} from "./long-run";
import s from "./generation.module.css";
import { GENERATION_VIEWS, STAGE_EMPTY } from "./views";

const VIEWS: ExplorerView[] = [...GENERATION_VIEWS];

type Measure = "absolute" | "share";

type GenState = {
  view: string;
  measure: Measure;
  year: number;
  compare: number;
  fuel: FuelId;
  from: number;
  to: number;
};

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function readState(params: URLSearchParams, years: number[]): GenState {
  const latest = years.at(-1) ?? 2024;
  const earliest = years[0] ?? 1998;
  const view = VIEWS.some((v) => v.id === params.get("view")) ? params.get("view")! : "current";
  const measure: Measure = params.get("measure") === "share" ? "share" : "absolute";
  const year = clampYear(Number(params.get("year") || latest), years, latest);
  const compare = clampYear(Number(params.get("compare") || Math.max(earliest, latest - 10)), years, earliest);
  const fuel = (fuelById(params.get("fuel") || "coal")?.id ?? "coal") as FuelId;
  const from = clampYear(Number(params.get("from") || earliest), years, earliest);
  const to = clampYear(Number(params.get("to") || latest), years, latest);
  return { view, measure, year, compare, fuel, from: Math.min(from, to), to: Math.max(from, to) };
}

type LongState = { group: LongFuelId | null; layout: Layout; reading: string | null; ask: string | null };

function readLong(params: URLSearchParams): LongState {
  const g = params.get("group");
  const group = LONG_FUELS.some((f) => f.id === g && f.selectable) ? (g as LongFuelId) : null;
  return { group, layout: params.get("layout") === "stream" ? "stream" : "axis", reading: params.get("reading"), ask: params.get("ask") };
}

export function GenerationCanvas({
  pack,
  capacity,
  longRun = null,
  yearMix = null,
  atlas = null,
}: {
  pack: GenerationPack | null;
  capacity: CapacityPack | null;
  /** DESNZ Electricity since 1920 — draws Changing Current and Compare when present. */
  longRun?: LongRunPack | null;
  /** NESO GB half-hourly pin → monthly MWh for A Year in Power. */
  yearMix?: YearPack | null;
  /** REPD renewables + DUKES 5.11 fossil/nuclear stations. */
  atlas?: AtlasPack | null;
}) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("generation");
  const mix = pack?.mix ?? [];
  const years = yearsOf(mix);
  const latest = years.at(-1) ?? 2024;
  const earliest = years[0] ?? 1998;

  // Long run (1920–2025) beside ET 5.1 (1998–): `year` and `compare` clamp to either series.
  const lrMix = longRun?.mix ?? [];
  const lrYears = lrMix.map((y) => y.year);
  const allYears = [...new Set([...lrYears, ...years])].sort((a, b) => a - b);
  const state = readState(searchParams, allYears);
  const long = readLong(searchParams);
  // Shared URL utility: replaceState + prune to the active view’s declared params.
  const sync = (patch: Partial<GenState>) => writeUrl(patch);
  const syncLong = (patch: Partial<LongState>) => writeUrl(patch);

  const { view, measure, compare, fuel, from, to } = state;
  const year = view === "capacity" && capacity
    ? clampYear(state.year, capacity.years, capacity.years.at(-1) ?? latest)
    : state.year;
  const rawFamily = searchParams.get("family");
  const mapFamily: AtlasFamily = rawFamily === "renewable" || rawFamily === "storage" || rawFamily === "fossil" || rawFamily === "nuclear" ? rawFamily : "all";
  const rawReading = searchParams.get("atlas");
  const atlasReading: AtlasReading =
    rawReading === "regions" || rawReading === "openings" ? rawReading : "stations";
  const atlasRegion = searchParams.get("region") ?? "";
  const row = yearRow(mix, year);
  const compareRow = yearRow(mix, compare);
  const follow = followFuel(fuel);

  const useLong = lrMix.length > 0 && (state.view === "current" || state.view === "compare" || (state.view === "data" && searchParams.get("dataset") !== "quarterly"));
  const lrEarliest = lrYears[0] ?? LONG_RUN_SOURCE.seriesStart;
  const lrLatest = lrYears.at(-1) ?? LONG_RUN_SOURCE.seriesStart;
  const lrYear = clampYear(year, lrYears, lrLatest);
  const lrFrom = clampYear(compare, lrYears, lrEarliest);
  const lrRow = lrMix.find((y) => y.year === lrYear);
  const lrFromRow = lrMix.find((y) => y.year === lrFrom);
  const currentState: CurrentState = { measure, layout: long.layout, year: lrYear, group: long.group, reading: long.reading };
  const onCurrent = (patch: Partial<CurrentState>) => {
    const { year: y, measure: m, ...rest } = patch;
    if (y != null || m != null) sync({ ...(y != null ? { year: y } : {}), ...(m != null ? { measure: m } : {}) });
    if (Object.keys(rest).length) syncLong(rest);
  };
  const lrFigures: ExplorerFigure[] = (() => {
    if (!lrRow) return [];
    if (view === "compare" && lrFromRow) {
      const d = lrRow.total - lrFromRow.total;
      return [
        { label: `Total ${lrFrom}`, value: fmtTWh(lrFromRow.total), note: lrFromRow.estimated ? "DESNZ estimate" : "Reported" },
        { label: `Total ${lrYear}`, value: fmtTWh(lrRow.total), note: lrRow.estimated ? "DESNZ estimate" : "Reported" },
        { label: "Change", value: `${d >= 0 ? "+" : "−"}${fmtTWh(Math.abs(d))}`, note: `${fmtPct((d / lrFromRow.total) * 100)} of the ${lrFrom} total` },
      ];
    }
    const selected = LONG_FUELS.find(f => f.id === long.group);
    if (view === "current" && selected) return [
      { label: `${selected.label} · ${lrYear}`, value: fmtTWh(lrRow.v[selected.id]), note: lrRow.estimated ? "DESNZ estimate · UK" : "Reported · UK" },
      { label: "Share of generation", value: fmtPct(lrValue(lrRow, selected.id, "share")), note: `Of all UK generation in ${lrYear}` },
      { label: "All generation", value: fmtTWh(lrRow.total), note: String(lrYear) },
    ];
    const top = LONG_FUELS.filter((f) => f.selectable).reduce((a, b) => (lrRow.v[b.id] > lrRow.v[a.id] ? b : a));
    const lowCarbon = lrValue(lrRow, "nuclear", "share") + lrValue(lrRow, "renewables", "share");
    return [
      { label: "Total generation", value: fmtTWh(lrRow.total), note: `${lrYear} · UK · ${lrRow.estimated ? "DESNZ estimate" : "reported"}` },
      { label: "Largest source", value: fmtPct(lrValue(lrRow, top.id, "share")), note: `${top.label}, ${lrYear}` },
      { label: "Nuclear, wind, solar, hydro", value: fmtPct(lowCarbon), note: "Share of generation; bioenergy is counted in other fuels" },
    ];
  })();

  const figures: ExplorerFigure[] = useMemo(() => {
    if (!row) return [];
    const coalShare = row.total > 0 ? (row.byFuel.coal / row.total) * 100 : 0;
    const windTwh = row.byFuel["onshore-wind"] + row.byFuel["offshore-wind"];
    return [
      {
        label: "Total generation",
        value: `${fmtTwh(row.total)} TWh`,
        note: row.partial ? `${year} · partial year (${row.quarters} quarters)` : `${year} · UK`,
      },
      { label: "Coal share", value: fmtShare(coalShare), note: "Of UK generation that year" },
      {
        label: "Wind",
        value: `${fmtTwh(windTwh)} TWh`,
        note: "Onshore + offshore components",
      },
    ];
  }, [row, year]);

  // Source line matches Housing: publisher · series (release and file ids live in Data).
  const notesFoot = useLong ? (
    <FigureRecord
      source={ENERGY_SOURCE.generationLongRun}
      definition={[
        `Estimated UK electricity generation by fuel, calendar years ${lrEarliest}–${lrLatest}, in TWh. Eight DESNZ fuel groups; coke and breeze is drawn with other fuels.`,
        "Band thickness at each year is the published value on one scale; straight segments join observed years and assert nothing between them.",
      ]}
      method={[
        `${LONG_RUN_SOURCE.seriesStart}–${LONG_RUN_SOURCE.firstReported - 1} are DESNZ estimates: published supply upscaled to generation and apportioned by fuel used. Before 1987 coverage is major power producers, transport undertakings and industrial hydro and nuclear only; 1987–1989 carry a high degree of estimation.`,
        `From ${LONG_RUN_SOURCE.unallocatedFrom} the published total exceeds the sum of DESNZ's fuel columns by 5–7 TWh. That gap is drawn as its own dashed band, not allocated to any fuel.`,
        `Wind, wave, solar and hydro are one published group; bioenergy is inside other fuels. The quarterly Energy Trends series in Data is table 5.1 (from ${LONG_RUN_SOURCE.et51Start}), a different publication: the two are never added together.`,
        "Historical estimates and modern quarterly observations are separate publications; use the Data view to inspect each series.",
      ]}
      dataHref="/data?record=electricity-generation-long-run"
    />
  ) : view === "atlas" && atlas ? (
    <FigureRecord
      source={
        atlasReading === "openings"
          ? ENERGY_SOURCE.generationOpenings
          : ENERGY_SOURCE.generationAtlas
      }
      definition={
        atlasReading === "regions"
          ? "Installed capacity (GW) summed by nation or English region for the mapped renewable and fossil/nuclear points in the current filter. Regions are labels on the register, not a spatial join to boundaries."
          : atlasReading === "openings"
            ? "Commissioned and closed (or planned-closed) nameplate capacity from DESNZ’s experimental List of Electricity Generators, shown by decade. Blank closure dates mean unknown — not still operating."
            : "Installed electrical capacity (MW) for operational renewables and storage, and for fossil and nuclear major power producers. Square area on the map is proportional to that capacity."
      }
      method={
        atlasReading === "openings"
          ? [
              atlas.history?.caveat ??
                "Experimental register compiled for an Energy Trends feature; DESNZ warns it may contain errors.",
              "Closure dates include planned closures. This register is not joined to the live station map.",
              "Openings and closures are decade totals of nameplate megawatts — not generation (TWh).",
              "The companion sheet sits beside Electricity since 1920 in the catalogue.",
            ]
          : [
              "Two registers, one map. They are not a complete UK licence list and must not be added into a single fleet total — dates and coverage differ.",
              "Renewables and storage come from the Renewable Energy Planning Database. Fossil and nuclear major power producers come from DUKES table 5.11.",
              "Coordinates are converted from Ordnance Survey grid references to latitude and longitude. Northern Ireland sites are listed in the register but not plotted (different grid).",
              atlasReading === "regions"
                ? "Region ranks use the publisher’s region or country fields on each point. Offshore renewable capacity is its own row when present."
                : "Renewable projects below 150 kW (1 MW before 2021) are out of scope. Storage is shown separately from primary generation.",
              "National generation figures beside a selected station are Energy Trends annuals for that technology — not that site’s output.",
              atlas.outlineAttribution
                ? atlas.outlineAttribution.replace(/\s+/g, " ").trim()
                : "Geographic outline from ONS and Ordnance Survey open data where available.",
            ]
      }
      dataHref={
        atlasReading === "openings"
          ? "/data?record=electricity-generation-long-run"
          : `/data?record=${atlas.meta.indicator_id}`
      }
    />
  ) : view === "year" && yearMix ? (
    <FigureRecord
      source={ENERGY_SOURCE.generationYearMix}
      definition="Great Britain electricity generation by fuel, monthly totals derived from half-hourly average megawatts. Northern Ireland is not included."
      method={[
        "Each half-hour is average megawatts; the Exchange multiplies by half an hour and sums to calendar months (TWh on the chart).",
        "This is Great Britain operational power — not the UK Energy Trends annuals. Do not add the two series together.",
        "Fuel groups on the chart collapse the operator’s labels for reading; the catalogue keeps the full taxonomy.",
        yearMix.meta.caveats,
      ].filter(Boolean)}
      dataHref={`/data?record=${yearMix.meta.indicator_id}`}
    />
  ) : view === "capacity" && capacity ? (
      <FigureRecord
        source={ENERGY_SOURCE.generationCapacity}
        definition="UK plant installed (nameplate) generating capacity in megawatts. Transmission and distribution connections are summed for each generator type."
        method={[
          "This is installed capacity (GW on the chart), not de-rated capacity and not generation (TWh).",
          "Fuel labels follow the capacity table and are not identical to Energy Trends generation labels — the two charts sit side by side; they are not a matched cohort.",
          pack
            ? "Generation panel uses calendar-year totals from Energy Trends table 5.1 component fuels (summed by the Exchange)."
            : "",
          capacity.meta.caveats,
        ].filter(Boolean)}
        dataHref={`/data?record=${capacity.meta.indicator_id}`}
      />
    ) : pack ? (
      <FigureRecord
        source={ENERGY_SOURCE.generationEt51}
        definition="UK electricity generated by fuel (TWh), all generating companies."
        method={[
          "Calendar-year totals are summed by the Exchange from the four calendar quarters of component fuels. Aggregate rows are excluded so they are never double-counted.",
          mix.some((y) => y.provisional)
            ? "Partial years (fewer than four quarters) and provisional quarters are marked on the charts; they are not interpolated."
            : "No provisional or partial years in this pin.",
          pack.meta.caveats,
        ].filter(Boolean)}
        dataHref={`/data?record=${pack.meta.indicator_id}`}
      />
    ) : (
      <FigureRecord
        definition="The Ready series could not be loaded from the Exchange API."
        dataHref="/data?record=electricity-generation-by-source"
      />
    );

  if ((!pack || mix.length === 0) && !useLong && (view === "current" || view === "compare")) {
    return (
      <>
        <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
        <Stage title="Electricity generation" foot={notesFoot}>
          <EmptyStage label={STAGE_EMPTY.unavailable.label}>
            {STAGE_EMPTY.unavailable.hint} Indicator id: electricity-generation-by-source.
          </EmptyStage>
        </Stage>
      </>
    );
  }

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {(view === "current" || view === "compare") && <FigureStrip figures={useLong ? lrFigures : figures} />}

      {(view === "current" || view === "compare" || view === "capacity") && (
        <ControlRow label="Generation controls">
          {useLong ? (
            <>
              <MenuControl
                label="Measure"
                value={measure}
                options={[
                  { value: "absolute", label: "Electricity generated (TWh)" },
                  { value: "share", label: "Share of generation (%)" },
                ]}
                onChange={(v) => sync({ measure: v })}
              />
              {view === "current" && (
                <MenuControl
                  label="Year"
                  value={String(lrYear)}
                  options={[...lrYears].reverse().map((y) => ({ value: String(y), label: String(y) }))}
                  onChange={(v) => sync({ year: Number(v) })}
                />
              )}
              {view === "compare" && (
                <>
                  <MenuControl
                    label="From"
                    value={String(lrFrom)}
                    options={lrYears.map((y) => ({ value: String(y), label: String(y) }))}
                    onChange={(v) => sync({ compare: Number(v) })}
                  />
                  <MenuControl
                    label="To"
                    value={String(lrYear)}
                    options={lrYears.map((y) => ({ value: String(y), label: String(y) }))}
                    onChange={(v) => sync({ year: Number(v) })}
                  />
                </>
              )}
              {view === "current" && (
                <MenuControl
                  label="Fuel"
                  value={long.group ?? "all"}
                  options={[
                    { value: "all", label: "All fuels" },
                    ...LONG_FUELS.filter((f) => f.selectable).map((f) => ({ value: f.id, label: f.label })),
                  ]}
                  onChange={(v) => syncLong({ group: v === "all" ? null : (v as LongFuelId), reading: null })}
                />
              )}
              <ResetButton
                onClick={() => {
                  sync({ measure: "absolute", year: lrLatest, compare: LONG_RUN_SOURCE.compareAnchor });
                  syncLong({ group: null, layout: "axis", reading: null, ask: null });
                }}
              />
            </>
          ) : (
            <>
          {(view === "current" || view === "compare") && (
            <MenuControl
              label="Measure"
              value={measure}
              options={[
                { value: "absolute", label: "Electricity generated (TWh)" },
                { value: "share", label: "Share of generation (%)" },
              ]}
              onChange={(v) => sync({ measure: v })}
            />
          )}
          {(view === "current" || view === "capacity") && (
            <MenuControl
              label="Year"
              value={String(year)}
              options={(view === "capacity" && capacity ? capacity.years : years).map((y) => ({
                value: String(y),
                // Capacity years are annual DUKES pins — no ET partial-quarter label.
                label:
                  view === "capacity"
                    ? String(y)
                    : yearRow(mix, y)?.partial
                      ? `${y} · partial`
                      : String(y),
              }))}
              onChange={(v) => sync({ year: Number(v) })}
            />
          )}
          {view === "compare" && (
            <>
              <MenuControl
                label="From"
                value={String(compare)}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
                onChange={(v) => sync({ compare: Number(v) })}
              />
              <MenuControl
                label="To"
                value={String(year)}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
                onChange={(v) => sync({ year: Number(v) })}
              />
            </>
          )}
          {view === "current" && (
            <MenuControl
              label="Fuel"
              value={fuel}
              options={FUELS.map((f) => ({ value: f.id, label: f.label }))}
              onChange={(v) => sync({ fuel: v })}
            />
          )}
          {view === "current" && (
            <MenuControl
              label="Trajectory from"
              value={String(from)}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
              onChange={(v) => sync({ from: Number(v) })}
            />
          )}
          {view === "current" && (
            <a className={t.textButton} href={follow.href} title={`${follow.why} ${follow.learn}`}>
              {follow.label}
            </a>
          )}
          <ResetButton
            onClick={() =>
              sync({
                measure: "absolute",
                year: latest,
                compare: Math.max(earliest, latest - 10),
                fuel: "coal",
                from: earliest,
                to: latest,
              })
            }
          />
            </>
          )}
        </ControlRow>
      )}

      {view === "data" && <ControlRow label="Data controls">
        <MenuControl label="Series" value={useLong ? "history" : "quarterly"} options={[
          ...(lrMix.length ? [{ value: "history", label: "Historical · annual" }] : []),
          { value: "quarterly", label: "Energy Trends · quarterly" },
        ]} onChange={dataset => writeUrl({ dataset })} />
        {useLong ? <MenuControl label="Fuel" value={long.group ?? "all"} options={[
          { value: "all", label: "All fuels" }, ...LONG_FUELS.filter(f => f.selectable).map(f => ({ value: f.id, label: f.label })),
        ]} onChange={group => syncLong({ group: group === "all" ? null : group as LongFuelId })} /> :
          <MenuControl label="Fuel" value={fuel} options={FUELS.map(f => ({ value: f.id, label: f.label }))} onChange={fuel => sync({ fuel: fuel as FuelId })} />}
      </ControlRow>}
      {view === "atlas" && (
        <ControlRow label="Map controls">
          <MenuControl
            label="Reading"
            value={atlasReading}
            options={[
              { value: "stations", label: "Stations" },
              { value: "regions", label: "Regions" },
              { value: "openings", label: "Openings & closures" },
            ]}
            onChange={(atlasMode) =>
              writeUrl({
                atlas: atlasMode === "stations" ? null : atlasMode,
                station: atlasMode === "stations" ? searchParams.get("station") : null,
              })
            }
          />
          {atlasReading !== "openings" && (
            <>
              <MenuControl
                label="Stations"
                value={mapFamily}
                options={[
                  { value: "all", label: "All stations" },
                  { value: "renewable", label: "Renewables" },
                  { value: "storage", label: "Storage" },
                  { value: "fossil", label: "Fossil" },
                  { value: "nuclear", label: "Nuclear" },
                ]}
                onChange={(family) => writeUrl({ family, technology: null, station: null })}
              />
              <MenuControl
                label="Technology"
                value={searchParams.get("technology") ?? ""}
                options={[
                  { value: "", label: "All technologies" },
                  ...Array.from(
                    new Set(
                      [...(atlas?.renewablePoints ?? []), ...(atlas?.stations?.points ?? [])]
                        .filter((p) => mapFamily === "all" || stationGroup(p) === mapFamily)
                        .map(stationTechnology),
                    ),
                  )
                    .sort()
                    .map((value) => ({ value, label: value })),
                ]}
                onChange={(technology) => writeUrl({ technology: technology || null, station: null })}
              />
            </>
          )}
          {atlasReading === "stations" && (
            <label className={s.stationSearch}>
              Find a station
              <input
                type="search"
                value={searchParams.get("q") ?? ""}
                placeholder="Name, region, operator or technology"
                onChange={(e) => writeUrl({ q: e.target.value || null, station: null })}
              />
            </label>
          )}
          <ResetButton
            onClick={() =>
              writeUrl({
                atlas: null,
                family: null,
                technology: null,
                q: null,
                station: null,
                region: null,
              })
            }
          />
        </ControlRow>
      )}
      <Stage
        title={
          useLong
            ? view === "compare"
              ? `Compare · ${lrFrom} → ${lrYear} · ${measure === "share" ? "share" : "TWh"}`
              : view === "data" ? "Historical generation · annual observations" : `${long.group ? LONG_FUELS.find(f => f.id === long.group)?.label : "UK generation mix"} · ${lrEarliest}–${lrLatest} · ${measure === "share" ? "% of generation" : "TWh"}`
            : view === "atlas"
              ? atlasReading === "regions"
                ? `Installed capacity by region${atlasRegion ? ` · ${atlasRegion}` : ""}`
                : atlasReading === "openings"
                  ? "Openings and closures · nameplate MW by decade"
                  : atlasRegion
                    ? `UK power stations · ${atlasRegion}`
                    : "UK power stations · installed capacity"
              : stageTitle(view, year, compare, fuel, measure)
        }
        size={view === "atlas" ? "wide" : "normal"}
        foot={notesFoot}
      >
        {view === "current" && useLong && longRun && (
          <ChangingCurrent mix={lrMix} detail={mix} related={longRun.related} state={currentState} onChange={onCurrent} />
        )}
        {view === "compare" && useLong && (
          <CompareFlow
            mix={lrMix}
            from={lrFrom}
            to={lrYear}
            measure={measure}
          />
        )}
        {view === "current" && !useLong && row && (
          <CurrentStage
            row={row}
            mix={mix}
            measure={measure}
            fuel={fuel}
            from={from}
            to={to}
            />
        )}
        {view === "compare" && !useLong && row && compareRow && <CompareStage a={compareRow} b={row} measure={measure} />}
        {view === "data" && (useLong ? <HistoryData mix={lrMix} group={long.group} /> : pack ? <DataStage observations={pack.observations} fuel={fuel} /> : <EmptyStage label="Series unavailable">No observations are available.</EmptyStage>)}
        {view === "capacity" && (
          <CapacityStage year={year} capacity={capacity} generationYear={yearRow(mix, year)} />
        )}
        {view === "year" && <YearStage yearMix={yearMix} />}
        {view === "atlas" && (
          <AtlasStage
            atlas={atlas}
            reading={atlasReading}
            family={mapFamily}
            technology={searchParams.get("technology") ?? ""}
            search={searchParams.get("q") ?? ""}
            region={atlasRegion}
            selectedId={parseStationKey(searchParams.get("station")) ? searchParams.get("station") : null}
            onSelect={(station) => writeUrl({ station: parseStationKey(station) ? station : null })}
            onRegion={(region) => writeUrl({ region, atlas: null, station: null })}
            mix={mix}
          />
        )}
      </Stage>

    </>
  );
}

function CurrentStage({
  row,
  mix,
  measure,
  fuel,
  from,
  to,
}: {
  row: YearFuel;
  mix: YearFuel[];
  measure: Measure;
  fuel: FuelId;
  from: number;
  to: number;
}) {
  const format = measure === "share" ? fmtShare : (v: number) => `${fmtTwh(v)} TWh`;
  const traj = fuelTrajectory(mix, fuel, measure, from, to);
  const fuelLabel = fuelById(fuel)?.label ?? fuel;
  const series: ChartSeries[] = [{ id: fuel, label: fuelLabel, points: traj }];

  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          {fuelLabel} over time · {measure === "share" ? "share of UK generation" : "TWh"}
        </h3>
        <TimeChart
          showTable={false}
          label={`${fuelLabel} generation`}
          series={series}
          cadence="annual"
          kind="line"
          marks
          zero={measure === "share"}
          format={measure === "share" ? fmtShare : (v) => fmtTwh(v)}
          periodLabel={annualLabel}
        />
      </section>


    </div>
  );
}

type AtlasFamily = "all" | "renewable" | "storage" | "fossil" | "nuclear";

function AtlasStage({
  atlas,
  reading,
  family,
  technology,
  search,
  region,
  selectedId,
  onSelect,
  onRegion,
  mix,
}: {
  atlas: AtlasPack | null;
  reading: AtlasReading;
  family: AtlasFamily;
  technology: string;
  search: string;
  region: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRegion: (region: string | null) => void;
  mix: YearFuel[];
}) {
  if (!atlas) return <EmptyStage label="Station data unavailable">The station register could not be loaded.</EmptyStage>;
  const all: StationPoint[] = [...atlas.renewablePoints, ...(atlas.stations?.points ?? [])];
  const points = filterStations(all, family, technology, search, region);
  // Portable selection (identity · tech · dates · geography honesty) — not Atlas-only state.
  const selection = resolveStationSelection(all, selectedId, mix);
  const shortlist = [...points].sort((a, b) => b.mw - a.mw).slice(0, 8);
  const capacity = (rows: StationPoint[]) =>
    (rows.reduce((sum, p) => sum + p.mw, 0) / 1000).toLocaleString("en-GB", { maximumFractionDigits: 2 });
  const repd = points.filter((p) => p.family === "renewable");
  const dukes = points.filter((p) => p.family !== "renewable");
  const peers = selection
    ? all.filter(
        (p) =>
          isMapped(p) &&
          (p.family === "renewable") === (selection.ref.register === "repd") &&
          stationTechnology(p) === selection.technology,
      )
    : [];
  const peerMw = peers.reduce((sum, p) => sum + p.mw, 0);
  const groups = new Map<string, number>();
  points.forEach((p) => groups.set(stationTechnology(p), (groups.get(stationTechnology(p)) ?? 0) + p.mw));
  const largestTech = [...groups.entries()].sort((a, b) => b[1] - a[1])[0];

  if (reading === "regions") {
    const rows = regionCapacityRows(filterStations(all, family, technology, "", ""));
    const totalGw = rows.reduce((s, r) => s + r.v, 0);
    return (
      <div className={s.atlasReading}>
        <RankBars
          label="Installed capacity by region"
          format={fmtGw}
          reference={totalGw > 0 ? { label: "Selection total", v: totalGw } : undefined}
          rows={rows.map((r) => ({
            id: r.id,
            label: `${r.label} · ${r.sites.toLocaleString("en-GB")} sites`,
            v: r.v,
            active: region === r.id,
          }))}
          onSelect={(id) => onRegion(region === id ? null : id)}
        />
        <p className={s.links}>
          Select a region to open its stations on the map. Totals are mapped register capacity only — not a complete UK fleet.
        </p>
      </div>
    );
  }

  if (reading === "openings") {
    if (!atlas.history?.records.length) {
      return (
        <EmptyStage label="Historical register unavailable">
          The DESNZ List of Electricity Generators companion sheet is not loaded beside the long-run workbook.
        </EmptyStage>
      );
    }
    const decades = historyDecadeFlows(atlas.history.records).filter(
      (d) => d.openedMw + d.closedMw >= 50,
    );
    const closures = largestClosures(atlas.history.records);
    // Index on the time axis (not calendar year): TimeChart's annual cadence treats a
    // 10-year decade gap as missing data and drops the solid paths. Labels still show decades.
    const openSeries: ChartSeries = {
      id: "opened",
      label: "Commissioned",
      points: decades.map((d, i) => ({ t: i, v: d.openedMw / 1000 })),
    };
    const closeSeries: ChartSeries = {
      id: "closed",
      label: "Closed or planned",
      points: decades.map((d, i) => ({ t: i, v: d.closedMw / 1000 })),
    };
    const decadeLabel = (t: number) => {
      const d = decades[Math.round(t)];
      return d ? `${d.decade}s` : "";
    };
    return (
      <div className={s.atlasReading}>
        <div className={s.atlasChart}>
          <TimeChart
            showTable={false}
            label="Nameplate capacity commissioned and closed by decade"
            series={[openSeries, closeSeries]}
            cadence="annual"
            kind="line"
            zero
            marks
            motion={false}
            height={380}
            format={(v) => `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} GW`}
            periodLabel={decadeLabel}
          />
        </div>
        <aside className={s.stationPanel} aria-label="Largest closures">
          <p className="bo-label">Largest closures in the register</p>
          <ul className={s.stationList}>
            {closures.map((r) => {
              const closed = r.closureOrPlanned ? String(r.closureOrPlanned).slice(0, 4) : null;
              const mw = (r.capacityMw ?? 0).toLocaleString("en-GB");
              return (
                <li key={r.id} aria-label={`${r.name}${r.fuel ? `, ${r.fuel}` : ""}${closed ? `, closed ${closed}` : ""}, ${mw} megawatts`}>
                  <span>
                    {r.name}
                    {r.fuel ? ` · ${r.fuel}` : ""}
                    {closed ? ` · ${closed}` : ""}
                  </span>
                  <span className="bo-fig" aria-hidden="true">
                    {mw}
                    <span className="bo-label"> MW</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={s.links}>Nameplate MW. Planned closures stay in the closed series. Notes carry the DESNZ experimental caveat.</p>
        </aside>
      </div>
    );
  }

  return (
    <div className={s.atlasLayout}>
      <div className={s.atlasMap}>
        {region && (
          <p className={s.regionChip}>
            <span className="bo-label">{normalizeRegion(region)}</span>
            <button type="button" className={t.textButton} onClick={() => onRegion(null)}>
              Clear region
            </button>
          </p>
        )}
        {points.length ? (
          <StationPointMap
            points={points}
            label="Registered power stations: installed capacity"
            outline={atlas.outline}
            selectedId={selection?.key ?? null}
            onSelect={(id) => onSelect(parseStationKey(id) ? id : null)}
          />
        ) : (
          <EmptyStage label="No stations match">Clear the search or choose another technology.</EmptyStage>
        )}
      </div>

      <aside className={s.stationPanel} aria-label="Station evidence">
        {selection ? (
          <>
            <button type="button" className={t.textButton} onClick={() => onSelect(null)}>
              Back to matching stations
            </button>
            <p className="bo-label">
              {selection.technology}
              {selection.group === "storage" ? " · storage" : " · capacity"}
              {selection.geography.regionLabel
                ? ` · ${selection.geography.regionLabel}${
                    selection.geography.countryLabel ? ` · ${selection.geography.countryLabel}` : ""
                  }`
                : ""}
            </p>
            <h3 className={s.stationName}>{selection.name}</h3>
            <p className={s.stationValue}>
              <span className="bo-fig">
                {selection.capacityMw.toLocaleString("en-GB", { maximumFractionDigits: 1 })}
              </span>
              <span className="bo-label">MW</span>
            </p>
            <dl className={s.stationMeta}>
              {selection.opened && (
                <div>
                  <dt className="bo-label">{selection.ref.register === "repd" ? "Operational" : "Commissioned"}</dt>
                  <dd className="bo-fig">{selection.opened}</dd>
                </div>
              )}
              {selection.operator && (
                <div>
                  <dt className="bo-label">Operator</dt>
                  <dd>{selection.operator}</dd>
                </div>
              )}
              <div>
                <dt className="bo-label">Register</dt>
                <dd>{selection.ref.register === "repd" ? "REPD" : "DUKES 5.11"}</dd>
              </div>
            </dl>
            {peerMw > 0 && (
              <p className={s.links}>
                {((selection.capacityMw / peerMw) * 100).toFixed(1)}% of mapped {selection.technology.toLowerCase()}{" "}
                capacity ({peers.length.toLocaleString("en-GB")} sites in this register).
              </p>
            )}
            {selection.nationalGeneration ? (
              <div className={s.stationContext}>
                <p className="bo-label">
                  National {fuelById(selection.nationalGeneration.fuel)?.label.toLowerCase()} generation ·{" "}
                  {selection.nationalGeneration.year}
                </p>
                <p className={s.stationContextValue}>
                  <span className="bo-fig">{fmtTwh(selection.nationalGeneration.twh)}</span>
                  <span className="bo-label">
                    TWh
                    {selection.nationalGeneration.share != null
                      ? ` · ${selection.nationalGeneration.share.toFixed(1)}%`
                      : ""}
                  </span>
                </p>
                <p className={s.links}>
                  UK Energy Trends total for the technology — not this station’s output.{" "}
                  <a href={selection.nationalGeneration.href}>Inspect the series</a>
                </p>
              </div>
            ) : (
              <p className={s.links}>
                {selection.group === "storage"
                  ? "Storage shifts electricity between times; MW alone is not stored energy."
                  : "This register measures capacity, not site-level generation."}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="bo-label">Matching sites</p>
            <h3 className={s.stationName}>
              <span className="bo-fig">{points.length.toLocaleString("en-GB")}</span>
            </h3>
            <dl className={s.stationTotals}>
              <div>
                <dt className="bo-label">REPD · renewables & storage</dt>
                <dd>
                  <span className="bo-fig">{capacity(repd)}</span> GW
                </dd>
              </div>
              <div>
                <dt className="bo-label">DUKES · fossil & nuclear</dt>
                <dd>
                  <span className="bo-fig">{capacity(dukes)}</span> GW
                </dd>
              </div>
            </dl>
            {largestTech && (
              <p className={s.links}>
                Largest technology in this selection: {largestTech[0]} · {(largestTech[1] / 1000).toFixed(2)} GW.
              </p>
            )}
            <p className="bo-label">{search || region ? "Matching stations" : "Largest matching stations"}</p>
            <ul className={s.stationList}>
              {shortlist.map((p) => (
                <li key={stationKey(p)}>
                  <button type="button" onClick={() => onSelect(stationKey(p))}>
                    <span>{p.name}</span>
                    <span className="bo-fig">{p.mw.toLocaleString("en-GB")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}

function YearStage({ yearMix }: { yearMix: YearPack | null }) {
  if (!yearMix || yearMix.observations.length === 0) {
    return (
      <EmptyStage label="Year series unavailable">
        NESO GB generation mix is not loaded yet. Pin the half-hourly CSV and refresh the API.
      </EmptyStage>
    );
  }
  const lines = yearMonthlyLines(yearMix.observations);
  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          Through {yearMix.year} · monthly TWh · GB system
        </h3>
        <TimeChart
          showTable={false}
          label={`Great Britain monthly generation by fuel, ${yearMix.year}`}
          series={lines}
          cadence="monthly"
          kind="line"
          zero
          format={(v) => `${v.toFixed(1)} TWh`}
          periodLabel={(t) => fmtT(t, "monthly")}
        />
      </section>
      <p className={s.links}>Four generation sources and net imports, shown separately. Imports are not electricity generated in Great Britain; these five lines are not the full generation total.</p>
    </div>
  );
}

function CapacityStage({
  year,
  capacity,
  generationYear,
}: {
  year: number;
  capacity: CapacityPack | null;
  generationYear: YearFuel | undefined;
}) {
  if (!capacity || capacity.observations.length === 0) {
    return (
      <EmptyStage label="Capacity series unavailable">
        Installed capacity (DUKES 5.12.C) is not loaded yet. Run the energy capacity connector and refresh the API.
      </EmptyStage>
    );
  }
  const capRows = capacityRowsForYear(capacity.observations, year);
  const genRows = generationYear
    ? compositionRows(generationYear, "absolute")
        .filter((r) => r.v > 0)
        .sort((a, b) => b.v - a.v)
    : [];

  return (
    <div className={s.paired}>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>Installed capacity · {year} · GW (nameplate)</h3>
        <RankBars
          label={`UK installed generating capacity by technology, ${year}`}
          rows={capRows}
          format={(v) => `${v.toFixed(1)} GW`}
        />
      </section>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          Generation · {year}
          {generationYear?.partial ? " · partial year" : ""} · TWh
        </h3>
        {genRows.length > 0 ? (
          <RankBars
            label={`UK electricity generation by fuel, ${year}`}
            rows={genRows}
            format={(v) => `${fmtTwh(v)} TWh`}
          />
        ) : (
          <EmptyStage label="No generation year">
            ET 5.1 has no calendar-year total for {year} yet (capacity years can run ahead of the quarterly pin).
          </EmptyStage>
        )}
      </section>
    </div>
  );
}

function CompareStage({ a, b, measure }: { a: YearFuel; b: YearFuel; measure: Measure }) {
  const format = measure === "share" ? fmtShare : (v: number) => `${fmtTwh(v)} TWh`;
  const rows = compareFuels(a, b, measure);
  const unit = measure === "share" ? "share of UK generation (changes in percentage points)" : "TWh";
  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          Change by fuel · {a.year} → {b.year} · {unit}
        </h3>
        <ChangeRows
          label={`Fuel mix change ${a.year} to ${b.year}`}
          rows={rows}
          fromLabel={String(a.year)}
          toLabel={String(b.year)}
          format={format}
          reference={{
            label: "Total generation",
            from: measure === "share" ? 100 : a.total,
            to: measure === "share" ? 100 : b.total,
          }}
        />
      </section>
    </div>
  );
}

function HistoryData({ mix, group }: { mix: LongYear[]; group: LongFuelId | null }) {
  const fuels = LONG_FUELS.filter(f => group ? f.id === group : true);
  return <div className={t.tableWrap}><table className={t.table}>
    <caption>UK annual generation · TWh · DESNZ Electricity since 1920</caption>
    <thead><tr><th scope="col">Year</th>{fuels.map(f => <th scope="col" key={f.id}>{f.label}</th>)}<th scope="col">Total</th></tr></thead>
    <tbody>{[...mix].reverse().map(row => <tr key={row.year}><th scope="row">{row.year}</th>{fuels.map(f => <td key={f.id}>{fmtTwh(row.v[f.id])}</td>)}<td>{fmtTwh(row.total)}</td></tr>)}</tbody>
  </table></div>;
}

function DataStage({ observations, fuel }: { observations: Observation[]; fuel: FuelId }) {
  const def = fuelById(fuel);
  const labels = new Set(def?.sourceLabels ?? []);
  const rows = observations
    .filter((r) => {
      const m = /^fuel=(.*)$/.exec((r.notes ?? "").trim());
      return m && labels.has(m[1]!.trim());
    })
    .slice()
    .sort((a, b) => a.period_start.localeCompare(b.period_start));

  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          {def?.label ?? fuel} · quarterly ET 5.1 · All generating companies
        </h3>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead>
              <tr>
                <th scope="col">Period start</th>
                <th scope="col">Period end</th>
                <th scope="col">Fuel</th>
                <th scope="col">TWh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.period_start}-${r.notes}`}>
                  <td>{r.period_start}</td>
                  <td>{r.period_end}</td>
                  <td>{(r.notes ?? "").replace(/^fuel=/, "")}</td>
                  <td className="bo-fig">{r.value == null ? "—" : fmtTwh(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.links}>
          <Link href="/api/data/electricity-generation-by-source">Download full CSV</Link>
          {" · "}
          <Link href="/data?record=electricity-generation-by-source">Catalogue record</Link>
        </p>
      </section>
    </div>
  );
}

function stageTitle(view: string, year: number, compare: number, fuel: FuelId, measure: Measure): string {
  const fuelLabel = fuelById(fuel)?.label ?? fuel;
  if (view === "current") return `The Changing Current · ${year} · ${measure === "share" ? "share" : "TWh"}`;
  if (view === "compare") return `Compare · ${compare} → ${year}`;
  if (view === "data") return `Generation archive · ${fuelLabel}`;
  if (view === "capacity") return "Capacity ≠ Electricity";
  if (view === "atlas") return "UK power stations · installed capacity";
  if (view === "year") return "A Year in Power";
  return "Electricity generation";
}

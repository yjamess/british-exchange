"use client";

/**
 * Economy Domain 03 — Employment & Labour Market.
 * Flagship: The British Workforce — working-age composition from matched counts.
 * Outside the Workforce uses INAC reason levels. Hours · vacancies · workforce jobs
 * are Ready. Geography links Regions HI00 rates (no Economy fork). Industry uses
 * JOBS02 section levels. Discouraged workers join Outside the Workforce (LFL8).
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { ChangeRows, RankBars, TimeChart } from "../instrument/TimeChart";
import { RegionMap, type RegionDatum } from "../map";
import { fmtT } from "../data";
import type { PrintOption } from "../PrintSelect";
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
import s from "../energy/generation.module.css";
import { Plate, WORK_PLATES } from "../Plate";
import { HalftoneMotion, type MotionAtlas } from "../motion";
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import { IndustryDetailRise } from "./IndustryDetailRise";
import type { EmploymentPack, SeriesPack } from "./types";
import type { Observation } from "@/lib/api";

/** work-sections.py atlases: 20 frames, 4×5, 500px square. Frame 0 = the still plate. */
const workAtlas = (file: string): MotionAtlas => ({
  src: `/brand/plates/w-${file}-atlas-4x5-500.jpg`,
  cols: 4,
  rows: 5,
  frames: 20,
  frameWidth: 500,
  frameHeight: 500,
});

/** Sections whose kit moves (SIC letter → loop). The rest stay still plates. */
const WORK_MOTION: Partial<Record<keyof typeof WORK_PLATES, { atlas: MotionAtlas; fps: number }>> = {
  A: { atlas: workAtlas("farming"), fps: 8 },
  B: { atlas: workAtlas("mining"), fps: 6 },
  C: { atlas: workAtlas("factory"), fps: 6 },
  F: { atlas: workAtlas("construction"), fps: 5 },
  H: { atlas: workAtlas("transport"), fps: 8 },
  I: { atlas: workAtlas("hospitality"), fps: 6 },
  K: { atlas: workAtlas("finance"), fps: 5 },
  N: { atlas: workAtlas("admin"), fps: 5 },
  Q: { atlas: workAtlas("health"), fps: 4 },
  S: { atlas: workAtlas("services"), fps: 8 },
};
import {
  asRegionalLabourMeasure,
  asWorkforceShow,
  compositionSeries,
  finalObs,
  fmtPeopleShort,
  fmtPeopleThousands,
  fmtRate,
  fmtSharePct,
  industryJobsFacts,
  industryJobsPoints,
  latestIndustryJobRanks,
  latestReasonSlice,
  latestOccupationSlice,
  latestRegionalRanks,
  latestUnderemploymentRate,
  latestWorkforceSlice,
  monthlyPoints,
  underemploymentRatePoints,
  windowLabel,
  peopleRows,
  rateSeries,
  reasonSeries,
  shareChange,
  shareRows,
  workforcePeriods,
  workforceSliceAt,
  type RegionalLabourMeasure,
  type WorkforceShow,
} from "./workforce-model";
import { coerceFromYear, fromYearOptions, pointsFrom } from "./series-window";

const VIEWS: ExplorerView[] = [
  { id: "workforce", label: "The British Workforce" },
  { id: "rates", label: "Rates" },
  { id: "inactive", label: "Outside the Workforce" },
  { id: "industry", label: "What Britain Does for Work" },
  { id: "hours", label: "The Working Week" },
  { id: "vacancies", label: "The Demand for Labour" },
  { id: "geography", label: "Geography" },
  { id: "data", label: "Data" },
];

const SHOW_OPTIONS: PrintOption<WorkforceShow>[] = [
  { value: "share", label: "Share of working age" },
  { value: "people", label: "People" },
];

const GEO_MEASURE_OPTIONS: PrintOption<RegionalLabourMeasure>[] = [
  { value: "employment", label: "Employment rate" },
  { value: "unemployment", label: "Unemployment rate" },
  { value: "inactivity", label: "Inactivity rate" },
];

const GEO_MEASURE_TITLE: Record<RegionalLabourMeasure, string> = {
  employment: "Employment rate",
  unemployment: "Unemployment rate",
  inactivity: "Inactivity rate",
};

/** ONS English ITL1 regions — the shapes RegionMap can draw. */
const ENGLISH_REGION = /^E1200000[1-9]$/;
/** UK country rows in HI00 (not drawn on the English-region map). */
const NATION_CODES = new Set(["E92000001", "W92000004", "S92000003", "N92000002"]);

function asView(raw: string | null): string {
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "workforce";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Employment";
}

function labelMonth(iso: string): string {
  return fmtT(
    Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12,
    "monthly",
  );
}

export function EmploymentCanvas({ pack }: { pack: EmploymentPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [show, setShow] = useState<WorkforceShow>(() =>
    asWorkforceShow(searchParams.get("show")),
  );
  const [compareRaw, setCompare] = useState(() => searchParams.get("compare") ?? "");
  const [industryRaw, setIndustry] = useState(() => searchParams.get("industry") ?? "all");
  /** Specimen under the pointer or keyboard focus: its plate plays its loop (one at a time). */
  const [hoverIndustry, setHoverIndustry] = useState<string | null>(null);
  const [geoMeasure, setGeoMeasure] = useState<RegionalLabourMeasure>(() =>
    asRegionalLabourMeasure(searchParams.get("measure")),
  );
  const [fromRaw, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [dataSeries, setDataSeries] = useState(() => searchParams.get("series") ?? "");
  /** Selected English region on the Geography map / list (local; not a URL key yet). */
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const sync = useCallback(
    (next: {
      view?: string;
      show?: WorkforceShow;
      compare?: string;
      measure?: RegionalLabourMeasure;
      industry?: string;
      from?: string;
      series?: string;
    }) => {
      const v = next.view ?? view;
      const sh = next.show ?? show;
      const compare = next.compare ?? compareRaw;
      const measure = next.measure ?? geoMeasure;
      const ind = next.industry ?? industryRaw;
      const fr = next.from ?? fromRaw;
      const ser = next.series ?? dataSeries;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "employment");
      u.set("view", v);
      if (v === "workforce") {
        u.set("show", sh);
        if (compare) u.set("compare", compare);
        else u.delete("compare");
      } else {
        u.delete("show");
        u.delete("compare");
      }
      if (v === "geography") u.set("measure", measure);
      else u.delete("measure");
      if (v === "industry" && ind && ind !== "all") u.set("industry", ind);
      else u.delete("industry");
      if (v === "rates" || v === "inactive" || v === "hours" || v === "vacancies") {
        if (fr) u.set("from", fr);
        else u.delete("from");
      } else u.delete("from");
      if (v === "data" && ser) u.set("series", ser);
      else u.delete("series");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.show != null) setShow(next.show);
      if (next.compare != null) setCompare(next.compare);
      if (next.industry != null) setIndustry(next.industry);
      if (next.from != null) setFrom(next.from);
      if (next.series != null) setDataSeries(next.series);
      if (next.measure != null) {
        setGeoMeasure(next.measure);
        setSelectedRegion(null);
      }
    },
    [pathname, view, show, compareRaw, geoMeasure, industryRaw, fromRaw, dataSeries],
  );

  const toggleRegion = useCallback((code: string) => {
    setSelectedRegion((cur) => (cur === code ? null : code));
  }, []);

  const geoPack =
    geoMeasure === "unemployment"
      ? pack.regionalUnemploymentRate
      : geoMeasure === "inactivity"
        ? pack.regionalInactivityRate
        : pack.regionalEmploymentRate;

  const geoRanks = useMemo(
    () => latestRegionalRanks(geoPack?.observations ?? []),
    [geoPack],
  );

  const industryRanks = useMemo(
    () => latestIndustryJobRanks(pack.workforceJobsByIndustry?.observations ?? []),
    [pack.workforceJobsByIndustry],
  );
  const industryOptions = useMemo<PrintOption<string>[]>(
    () => [
      { value: "all", label: "All industries" },
      ...(industryRanks?.ranks ?? []).map((r) => ({ value: r.id, label: r.label })),
    ],
    [industryRanks],
  );
  const industry =
    industryRaw !== "all" && industryRanks?.ranks.some((r) => r.id === industryRaw)
      ? industryRaw
      : "all";
  const selectedIndustry = industry === "all" ? null : industryRanks?.ranks.find((r) => r.id === industry) ?? null;

  const chooseIndustry = useCallback(
    (id: string) => {
      sync({ industry: id === industry ? "all" : id });
    },
    [sync, industry],
  );

  const slice = useMemo(
    () =>
      latestWorkforceSlice(
        pack.employmentLevel?.observations ?? [],
        pack.unemploymentLevel?.observations ?? [],
        pack.inactivityLevel?.observations ?? [],
      ),
    [pack.employmentLevel, pack.unemploymentLevel, pack.inactivityLevel],
  );
  const periods = useMemo(
    () =>
      workforcePeriods(
        pack.employmentLevel?.observations ?? [],
        pack.unemploymentLevel?.observations ?? [],
        pack.inactivityLevel?.observations ?? [],
      ),
    [pack.employmentLevel, pack.unemploymentLevel, pack.inactivityLevel],
  );
  const comparePeriod = useMemo(() => {
    if (compareRaw && periods.includes(compareRaw)) {
      // Coerce a stored month to that year's July (or first month) when the menu is year-only.
      const y = Number(compareRaw.slice(0, 4));
      const july = `${y}-07-01`;
      if (periods.includes(july)) return july;
      return periods.find((p) => p.startsWith(`${y}-`)) ?? compareRaw;
    }
    // Default: about ten years before the latest period, still one year anchor.
    if (periods.length > 120) {
      const anchor = periods[periods.length - 121]!;
      const y = Number(anchor.slice(0, 4));
      const july = `${y}-07-01`;
      return periods.includes(july) ? july : anchor;
    }
    return periods[0] ?? "";
  }, [compareRaw, periods]);
  const compareSlice = useMemo(
    () =>
      comparePeriod
        ? workforceSliceAt(
            pack.employmentLevel?.observations ?? [],
            pack.unemploymentLevel?.observations ?? [],
            pack.inactivityLevel?.observations ?? [],
            comparePeriod,
          )
        : null,
    [pack.employmentLevel, pack.unemploymentLevel, pack.inactivityLevel, comparePeriod],
  );

  const stackSeries = useMemo(
    () =>
      compositionSeries(
        pack.employmentLevel?.observations ?? [],
        pack.unemploymentLevel?.observations ?? [],
        pack.inactivityLevel?.observations ?? [],
      ),
    [pack.employmentLevel, pack.unemploymentLevel, pack.inactivityLevel],
  );
  const linesAll = useMemo(
    () =>
      rateSeries(
        pack.employmentRate?.observations ?? [],
        pack.inactivityRate?.observations ?? [],
        pack.unemploymentRate?.observations ?? [],
      ),
    [pack.employmentRate, pack.inactivityRate, pack.unemploymentRate],
  );
  const fromSourcePts = useMemo(() => {
    if (view === "hours") return monthlyPoints(pack.averageHours?.observations ?? []);
    if (view === "vacancies") return monthlyPoints(pack.vacancies?.observations ?? []);
    if (view === "inactive") {
      const reason = reasonSeries({
        reasonStudents: pack.reasonStudents?.observations ?? [],
        reasonFamilyHome: pack.reasonFamilyHome?.observations ?? [],
        reasonTempSick: pack.reasonTempSick?.observations ?? [],
        reasonLongTermSick: pack.reasonLongTermSick?.observations ?? [],
        reasonRetired: pack.reasonRetired?.observations ?? [],
        reasonOther: pack.reasonOther?.observations ?? [],
        reasonDiscouraged: pack.reasonDiscouraged?.observations ?? [],
      });
      return reason[0]?.points ?? [];
    }
    return linesAll[0]?.points ?? [];
  }, [view, pack, linesAll]);
  const fromOpts = useMemo(() => fromYearOptions(fromSourcePts), [fromSourcePts]);
  const fromYear = coerceFromYear(fromRaw || null, fromSourcePts);
  const lines = useMemo(
    () =>
      linesAll.map((sr) => ({
        ...sr,
        points: pointsFrom(sr.points, fromYear),
      })),
    [linesAll, fromYear],
  );
  const dataSeriesOptions = useMemo(() => employmentDataSeriesOptions(pack), [pack]);
  const activeDataSeries =
    dataSeriesOptions.find((o) => o.value === dataSeries)?.value ??
    dataSeriesOptions[0]?.value ??
    "";

  const latestEmpRate = finalObs(pack.employmentRate?.observations ?? []).at(-1);
  const latestInactRate = finalObs(pack.inactivityRate?.observations ?? []).at(-1);
  const latestUnempRate = finalObs(pack.unemploymentRate?.observations ?? []).at(-1);
  const latestLabel = slice ? labelMonth(slice.periodStart) : null;

  const compareOptions: PrintOption<string>[] = useMemo(() => {
    // One anchor per calendar year (prefer July mid-month — LFS three-month label).
    const byYear = new Map<number, string>();
    for (const p of periods) {
      const y = Number(p.slice(0, 4));
      if (!byYear.has(y)) byYear.set(y, p);
      if (p.endsWith("-07-01")) byYear.set(y, p);
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([y, value]) => ({ value, label: String(y) }));
  }, [periods]);

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "rates") {
      return [
        {
          label: "Employment rate",
          value: latestEmpRate?.value != null ? fmtRate(latestEmpRate.value) : "—",
          note: "Share of people aged 16 to 64 who are in work",
        },
        {
          label: "Unemployment rate",
          value: latestUnempRate?.value != null ? fmtRate(latestUnempRate.value) : "—",
          note: "Share of people looking for work who are unemployed",
        },
        {
          label: "Inactivity rate",
          value: latestInactRate?.value != null ? fmtRate(latestInactRate.value) : "—",
          note: "Share of people aged 16 to 64 outside the labour force",
        },
      ];
    }
    if (view === "workforce" && slice) {
      if (show === "people") {
        return [
          {
            label: "In work",
            value: fmtPeopleShort(slice.employed),
            note: latestLabel ?? "—",
          },
          {
            label: "Unemployed",
            value: fmtPeopleShort(slice.unemployed),
            note: "Looking for work",
          },
          {
            label: "Outside the labour force",
            value: fmtPeopleShort(slice.inactive),
            note: "Not working and not looking",
          },
        ];
      }
      const shares = shareRows(slice);
      return shares.map((row) => ({
        label: row.label,
        value: fmtSharePct(row.v),
        // Shares of everyone aged 16 to 64, so "Unemployed" here is not the unemployment rate.
        note: latestLabel ? `Share of people aged 16 to 64 · ${latestLabel}` : "Share of people aged 16 to 64",
      }));
    }
    if (view === "inactive") {
      const reasonPacks = {
        reasonStudents: pack.reasonStudents?.observations ?? [],
        reasonFamilyHome: pack.reasonFamilyHome?.observations ?? [],
        reasonTempSick: pack.reasonTempSick?.observations ?? [],
        reasonLongTermSick: pack.reasonLongTermSick?.observations ?? [],
        reasonRetired: pack.reasonRetired?.observations ?? [],
        reasonOther: pack.reasonOther?.observations ?? [],
        reasonDiscouraged: pack.reasonDiscouraged?.observations ?? [],
      };
      const reasonSlice = latestReasonSlice(reasonPacks);
      if (!reasonSlice) return [];
      const top = [...reasonSlice.parts].sort((a, b) => b.v - a.v).slice(0, 3);
      return top.map((p) => ({
        label: p.label,
        value: fmtPeopleShort(p.v),
        note: labelMonth(reasonSlice.periodStart),
      }));
    }
    if (view === "hours") {
      const h = finalObs(pack.averageHours?.observations ?? []).at(-1);
      const pt = finalObs(pack.employmentPartTime?.observations ?? []).at(-1);
      const under = latestUnderemploymentRate(pack.underemployment?.observations ?? []);
      return [
        {
          label: "Average hours",
          value: h?.value != null ? `${(h.value as number).toFixed(1)}` : "—",
          note: h ? labelMonth(h.period_start) : "Hours per week",
        },
        {
          label: "Part-time",
          value: pt?.value != null ? fmtPeopleShort(pt.value as number) : "—",
          note: "Aged 16 and over",
        },
        {
          label: "Want more hours",
          value: under?.value != null ? fmtRate(under.value as number) : "—",
          note: under
            ? `of people in employment · ${fmtT(Number(under.period_start.slice(0, 4)) + (Number(under.period_start.slice(5, 7)) - 1) / 12, "quarterly")}`
            : "Of people in employment",
        },
      ];
    }
    if (view === "vacancies") {
      const v = finalObs(pack.vacancies?.observations ?? []).at(-1);
      return [
        {
          label: "Vacancies",
          value: v?.value != null ? fmtPeopleShort(v.value as number) : "—",
          note: v ? labelMonth(v.period_start) : "United Kingdom",
        },
        {
          label: "Measure",
          value: "Open posts",
          note: "Not hires",
        },
        {
          label: "Basis",
          value: "Survey",
          note: "Three-month average",
        },
      ];
    }
    if (view === "industry") {
      const industry = industryRanks;
      const j = finalObs(pack.workforceJobs?.observations ?? []).at(-1);
      const top = selectedIndustry ?? industry?.ranks[0];
      return [
        {
          label: "Workforce jobs",
          value:
            industry?.total != null
              ? fmtPeopleShort(industry.total)
              : j?.value != null
                ? fmtPeopleShort(j.value as number)
                : "—",
          note: industry
            ? labelMonth(industry.periodStart)
            : j
              ? labelMonth(j.period_start)
              : "United Kingdom",
        },
        {
          label: selectedIndustry ? "Selected industry" : "Largest industry",
          value: top != null ? fmtPeopleShort(top.v) : "—",
          note: top?.label ?? "By industry",
        },
        {
          label: "Unit",
          value: "Jobs",
          note: "Not people in work",
        },
      ];
    }
    if (view === "geography" && geoRanks?.ranks.length) {
      const high = geoRanks.ranks[0]!;
      const low = geoRanks.ranks[geoRanks.ranks.length - 1]!;
      return [
        {
          label: "Highest",
          value: fmtRate(high.v),
          note: high.label,
        },
        {
          label: "Lowest",
          value: fmtRate(low.v),
          note: low.label,
        },
        {
          label: "Places",
          value: String(geoRanks.ranks.length),
          note: labelMonth(geoRanks.periodStart),
        },
      ];
    }
    return [];
  }, [
    view,
    pack,
    show,
    slice,
    latestLabel,
    latestEmpRate,
    latestUnempRate,
    latestInactRate,
    geoRanks,
    industryRanks,
    selectedIndustry,
  ]);

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "workforce") {
    const change =
      slice && compareSlice && compareSlice.periodStart < slice.periodStart
        ? shareChange(compareSlice, slice)
        : [];
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.labourForce,
          "United Kingdom",
          economyPeriod("monthly", latestLabel),
        )}
        definition={[
          "People aged 16 to 64 in the United Kingdom, split into those in work, those unemployed, and those outside the labour force.",
          "Unemployed means without a job, available to start, and looking for work. Outside the labour force includes students, people looking after family, people who are long-term sick, and others who are not looking for work.",
        ]}
        method={[
          "The chart uses official headcounts for the same age group, geography and seasonally adjusted basis. Employment, inactivity and unemployment rates are not added together to make this picture.",
          "Each month is a rolling three-month average, labelled at the middle month (for example Jun–Aug appears as July).",
          "The Labour Force Survey revises. Small month-to-month moves are noisy. Claimant counts are a different measure and are not shown here.",
        ]}
      />
    );
    body = !slice || !stackSeries.every((sr) => sr.points.length) ? (
      <EmptyStage label="Not available">
        Working-age labour-force counts are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Working-age population · United Kingdom ·{" "}
            {show === "share" ? "share of people aged 16 to 64" : "people"}
          </h3>
          <TimeChart
            key={`workforce-${show}`}
            label="Working-age labour force composition"
            series={stackSeries}
            cadence="monthly"
            kind={show === "share" ? "stack" : "line"}
            showTable={false}
            format={fmtPeopleShort}
            periodLabel={(tt) => fmtT(tt, "monthly")}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Snapshot · {latestLabel} ·{" "}
            {show === "share" ? "% of working age" : "people"}
          </h3>
          <RankBars
            key={`workforce-rank-${slice.periodStart}-${show}`}
            label={`Working-age labour force, ${latestLabel}`}
            rows={show === "share" ? shareRows(slice) : peopleRows(slice)}
            format={show === "share" ? fmtSharePct : fmtPeopleThousands}
          />
        </section>
        {change.length && compareSlice ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Change in share · {labelMonth(compareSlice.periodStart)} to {latestLabel} · % of
              working age
            </h3>
            <ChangeRows
              key={`workforce-change-${compareSlice.periodStart}-${slice.periodStart}`}
              label={`Share of working age, ${labelMonth(compareSlice.periodStart)} to ${latestLabel}`}
              rows={change}
              fromLabel={labelMonth(compareSlice.periodStart)}
              toLabel={latestLabel ?? ""}
              format={fmtSharePct}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "rates") {
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.labourForceRates,
          "United Kingdom",
          economyPeriod(
            "monthly",
            latestEmpRate ? labelMonth(latestEmpRate.period_start) : null,
          ),
        )}
        definition={[
          "The employment rate and the inactivity rate are shares of everyone aged 16 to 64.",
          "The unemployment rate is a share of people who are economically active (in work or looking for work) — not of the whole working-age population.",
        ]}
        method={[
          "These three rates do not add up to 100%. Do not treat them as a single pie.",
          "Each month is a rolling three-month average. The Labour Force Survey revises; small moves are noisy.",
          "This is the United Kingdom. Average weekly earnings on Wages cover Great Britain only.",
        ]}
      />
    );
    body = !lines.every((sr) => sr.points.length) ? (
      <EmptyStage label="Not available">
        Labour-force rates are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Employment, unemployment and inactivity rates · United Kingdom · %
          </h3>
          <TimeChart
            key={`workforce-rates-${fromYear}`}
            label="Labour-force rates"
            series={lines}
            cadence="monthly"
            kind="line"
            showTable={false}
            format={fmtRate}
            periodLabel={(tt) => fmtT(tt, "monthly")}
          />
        </section>
      </div>
    );
  } else if (view === "inactive") {
    const reasonPacks = {
      reasonStudents: pack.reasonStudents?.observations ?? [],
      reasonFamilyHome: pack.reasonFamilyHome?.observations ?? [],
      reasonTempSick: pack.reasonTempSick?.observations ?? [],
      reasonLongTermSick: pack.reasonLongTermSick?.observations ?? [],
      reasonRetired: pack.reasonRetired?.observations ?? [],
      reasonOther: pack.reasonOther?.observations ?? [],
      reasonDiscouraged: pack.reasonDiscouraged?.observations ?? [],
    };
    const reasonSlice = latestReasonSlice(reasonPacks);
    const reasonLines = reasonSeries(reasonPacks).map((sr) => ({
      ...sr,
      points: pointsFrom(sr.points, fromYear),
    }));
    const reasonLabel = reasonSlice ? labelMonth(reasonSlice.periodStart) : null;
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.inactivityReasons,
          "United Kingdom",
          economyPeriod("monthly", reasonLabel),
        )}
        definition={[
          "People aged 16 to 64 who are outside the labour force, by their main reason — not in work and not looking for work.",
          "Being outside the labour force is not the same as being unemployed. Discouraged workers are people who want a job but are not looking because they believe none are available.",
        ]}
        method={[
          "Official seasonally adjusted levels in thousands (INAC01 / LMS). The seven published reason levels together leave about a one-thousand residual versus total inactivity (LF2M).",
          "Discouraged workers use the published LFL8 level — not LF77 percent × inactivity, and not the wants-a-job subset (LF8B).",
          "Charts use final months only. These are principal-reason categories, not observed person-by-person flows between reasons.",
        ]}
      />
    );
    body = !reasonSlice || !reasonLines.some((s) => s.points.length) ? (
      <EmptyStage label="Not available">
        Reasons for being outside the labour force are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Outside the labour force by reason · {reasonLabel} · thousands
          </h3>
          <RankBars
            label="Inactivity by reason"
            rows={reasonSlice.parts.map((p) => ({
              id: p.id,
              label: p.label,
              v: p.v,
            }))}
            format={fmtPeopleThousands}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Reasons over time ·{" "}
            {fmtT(reasonLines[0]!.points[0]!.t)}–
            {fmtT(reasonLines[0]!.points[reasonLines[0]!.points.length - 1]!.t)} · thousands
          </h3>
          <TimeChart
            key={`inactivity-reasons-${fromYear}`}
            label="Economic inactivity by reason"
            series={reasonLines}
            cadence="monthly"
            kind="stack"
            showTable={false}
            format={fmtPeopleShort}
            periodLabel={(tt) => fmtT(tt, "monthly")}
          />
        </section>
      </div>
    );
  } else if (view === "industry") {
    const allPts = monthlyPoints(pack.workforceJobs?.observations ?? []);
    const industryRows = pack.workforceJobsByIndustry?.observations ?? [];
    const sectionPts = selectedIndustry ? industryJobsPoints(industryRows, selectedIndustry.id) : [];
    const jobsPts = selectedIndustry ? sectionPts : allPts;
    const industryLabel = industryRanks ? labelMonth(industryRanks.periodStart) : null;
    const ranks = industryRanks?.ranks ?? [];
    const maxJobs = Math.max(...ranks.map((r) => r.v), 1e-6);
    const total = industryRanks?.total ?? null;
    const facts = selectedIndustry ? industryJobsFacts(sectionPts) : null;
    const occupation = latestOccupationSlice(pack.employmentByOccupation?.observations ?? []);
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.workforceJobsByIndustry,
          "United Kingdom",
          economyPeriod("quarterly", industryLabel),
        )}
        definition={[
          "Workforce jobs by industry — the national count of jobs in each industry group, not the number of people in work.",
        ]}
        method={[
          "ONS JOBS02 sheet WFJ SA, seasonally adjusted, thousands of jobs. Each industry's share is its published jobs divided by the published all-jobs total.",
          "Jobs are not the same as employed people (Labour Force Survey levels). Manufacturing is the same published series as Energy › Jobs — Follow there for the manufacturing cut; this tab does not fork it.",
          "The drawings are specimens of the kit each kind of work is done with; their size is not jobs or share. Pick an industry from the wall or the menu. Charts use final quarters only.",
          "Employment by occupation counts people, not jobs, from the Annual Population Survey over the twelve months ending in the quarter shown, aged 16 and over. The nine groups leave a small remainder whose occupation is not classified.",
          "Change over ten years, change since the series began and the peak quarter are read from the published quarterly levels for the chosen industry — worked out here, not an ONS statistic.",
        ]}
      />
    );
    body = !allPts.length && !ranks.length ? (
      <EmptyStage label="Not available">
        Workforce jobs by industry are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        {ranks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              {selectedIndustry
                ? `${selectedIndustry.label} · United Kingdom · ${industryLabel} · thousands of jobs`
                : `Workforce jobs by industry · United Kingdom · ${industryLabel} · thousands of jobs`}
            </h3>
            <ul
              className={s.specimens}
              data-isolated={selectedIndustry ? "true" : undefined}
              aria-label={
                selectedIndustry
                  ? `${selectedIndustry.label} · click again to show every industry`
                  : `Workforce jobs by industry · ${industryLabel}`
              }
            >
              {(selectedIndustry
                ? ranks.filter((r) => r.id === selectedIndustry.id)
                : ranks
              ).map((r) => {
                const plate = WORK_PLATES[r.id as keyof typeof WORK_PLATES];
                const motion = WORK_MOTION[r.id as keyof typeof WORK_PLATES];
                const share = total ? (r.v / total) * 100 : null;
                const on = selectedIndustry?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={s.specimen}
                      data-selected={on ? "true" : undefined}
                      aria-pressed={on}
                      aria-label={`${r.label}: ${fmtPeopleThousands(r.v)} jobs in ${industryLabel}${
                        share != null ? `, ${share.toFixed(1)}% of all jobs` : ""
                      }${on ? ". Click again to show every industry." : ""}`}
                      onClick={() => chooseIndustry(r.id)}
                      onPointerEnter={() => setHoverIndustry(r.id)}
                      onPointerLeave={() => setHoverIndustry((h) => (h === r.id ? null : h))}
                      onFocus={() => setHoverIndustry(r.id)}
                      onBlur={() => setHoverIndustry((h) => (h === r.id ? null : h))}
                    >
                      {plate && motion && (on || hoverIndustry === r.id) ? (
                        <span className={s.specimenPlate} aria-hidden="true">
                          <HalftoneMotion
                            atlas={motion.atlas}
                            fps={motion.fps}
                            cell={2.4}
                            fallbackSrc={plate.src}
                          />
                        </span>
                      ) : plate ? (
                        <Plate src={plate.src} fit="contain" className={s.specimenPlate} />
                      ) : (
                        <span className={s.specimenPlate} aria-hidden="true" />
                      )}
                      <span className={`bo-label ${s.specimenName}`}>{r.label}</span>
                      <span className={`bo-fig ${s.specimenShare}`}>{fmtPeopleShort(r.v)}</span>
                      <span className={s.specimenBar} aria-hidden="true">
                        <i style={{ width: `${(r.v / maxJobs) * 100}%` }} />
                      </span>
                      <span className={s.specimenCount}>
                        {share != null ? `${share.toFixed(1)}% of all jobs` : "jobs"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {selectedIndustry ? (
          <IndustryDetailRise industryId={selectedIndustry.id}>
            {facts ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  {selectedIndustry.label} · change · thousands of jobs
                </h3>
                <ChangeRows
                  key={`industry-change-${selectedIndustry.id}`}
                  label={`${selectedIndustry.label} jobs change`}
                  rows={[
                    ...(facts.tenYears
                      ? [
                          {
                            id: "ten-years",
                            label: "Ten years",
                            from: facts.tenYears.v,
                            to: facts.latest.v,
                          },
                        ]
                      : []),
                    {
                      id: "since-start",
                      label: `Since ${fmtT(facts.first.t, "quarterly")}`,
                      from: facts.first.v,
                      to: facts.latest.v,
                    },
                    ...(facts.peak.t !== facts.latest.t
                      ? [
                          {
                            id: "from-peak",
                            label: `From peak · ${fmtT(facts.peak.t, "quarterly")}`,
                            from: facts.peak.v,
                            to: facts.latest.v,
                          },
                        ]
                      : []),
                  ]}
                  fromLabel="Then"
                  toLabel={fmtT(facts.latest.t, "quarterly")}
                  format={fmtPeopleThousands}
                />
              </section>
            ) : null}
            {jobsPts.length ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  {selectedIndustry.label} · {fmtT(jobsPts[0]!.t, "quarterly")}–
                  {fmtT(jobsPts[jobsPts.length - 1]!.t, "quarterly")} · thousands
                </h3>
                <TimeChart
                  key={`workforce-jobs-${selectedIndustry.id}`}
                  label={`${selectedIndustry.label} jobs`}
                  series={[
                    {
                      id: `jobs-${selectedIndustry.id}`,
                      label: selectedIndustry.label,
                      points: jobsPts,
                    },
                  ]}
                  cadence="quarterly"
                  kind="line"
                  showTable={false}
                  format={fmtPeopleThousands}
                  axisFormat={fmtPeopleShort}
                  periodLabel={(tt) => fmtT(tt, "quarterly")}
                />
              </section>
            ) : (
              <EmptyStage label="Not available">
                The quarterly series for this industry is not loaded right now.
              </EmptyStage>
            )}
          </IndustryDetailRise>
        ) : (
          <>
            {jobsPts.length ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  All workforce jobs · {fmtT(jobsPts[0]!.t, "quarterly")}–
                  {fmtT(jobsPts[jobsPts.length - 1]!.t, "quarterly")} · thousands
                </h3>
                <TimeChart
                  key="workforce-jobs-all"
                  label="Workforce jobs"
                  series={[
                    {
                      id: "workforce-jobs",
                      label: "Workforce jobs",
                      points: jobsPts,
                    },
                  ]}
                  cadence="quarterly"
                  kind="line"
                  showTable={false}
                  format={fmtPeopleThousands}
                  axisFormat={fmtPeopleShort}
                  periodLabel={(tt) => fmtT(tt, "quarterly")}
                />
              </section>
            ) : null}
            {occupation ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Employment by occupation · United Kingdom · {windowLabel(occupation.window)} · % of
                  people in employment
                </h3>
                <RankBars
                  label={`Employment by occupation · ${windowLabel(occupation.window)}`}
                  rows={occupation.ranks.map((r) => ({ id: r.id, label: r.label, v: r.v }))}
                  format={(v) => `${v.toFixed(1)}%`}
                />
              </section>
            ) : null}
          </>
        )}
      </div>
    );
  } else if (view === "hours") {
    const hoursPts = pointsFrom(monthlyPoints(pack.averageHours?.observations ?? []), fromYear);
    const ftPts = pointsFrom(monthlyPoints(pack.employmentFullTime?.observations ?? []), fromYear);
    const ptPts = pointsFrom(monthlyPoints(pack.employmentPartTime?.observations ?? []), fromYear);
    const hoursLatest = finalObs(pack.averageHours?.observations ?? []).at(-1);
    const underPts = pointsFrom(
      underemploymentRatePoints(pack.underemployment?.observations ?? []),
      fromYear,
    );
    const involPts = pointsFrom(
      monthlyPoints(pack.involuntaryPartTime?.observations ?? []),
      fromYear,
    );
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.averageHours,
          "United Kingdom",
          economyPeriod("monthly", hoursLatest ? labelMonth(hoursLatest.period_start) : null),
        )}
        definition={[
          "Average actual weekly hours worked, the split between full-time and part-time employment, people who want more hours, and people working part-time because they could not find a full-time job.",
        ]}
        method={[
          "Full-time and part-time employment levels are for people aged 16 and over — not the same age span as the working-age workforce composition (16 to 64).",
          "Underemployment is the ONS count of people aged 16 and over who want more hours and could start them within two weeks, shown as a share of everyone in employment. It is quarterly and not seasonally adjusted, so compare the same quarter across years.",
          "Part-time because no full-time job could be found is a published seasonally adjusted count of people, not a share of part-time work and not the same as underemployment. Charts use final periods only.",
        ]}
      />
    );
    body = !hoursPts.length && !ftPts.length ? (
      <EmptyStage label="Not available">
        Hours and full-time / part-time employment are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        {hoursPts.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Average actual weekly hours · {fmtT(hoursPts[0]!.t)}–
              {fmtT(hoursPts[hoursPts.length - 1]!.t)} · hours
            </h3>
            <TimeChart
              key={`avg-hours-${fromYear}`}
              label="Average actual weekly hours"
              series={[
                {
                  id: "average-actual-weekly-hours",
                  label: "Hours per week",
                  points: hoursPts,
                },
              ]}
              cadence="monthly"
              kind="line"
              showTable={false}
              format={(v) => `${v.toFixed(1)}`}
              periodLabel={(tt) => fmtT(tt, "monthly")}
            />
          </section>
        ) : null}
        {ftPts.length && ptPts.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Full-time and part-time employment · aged 16 and over · thousands
            </h3>
            <TimeChart
              key={`ft-pt-${fromYear}`}
              label="Full-time and part-time employment"
              series={[
                { id: "employment-full-time", label: "Full-time", points: ftPts },
                { id: "employment-part-time", label: "Part-time", points: ptPts },
              ]}
              cadence="monthly"
              kind="line"
              showTable={false}
              format={fmtPeopleShort}
              periodLabel={(tt) => fmtT(tt, "monthly")}
            />
          </section>
        ) : null}
        {underPts.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              People who want more hours · aged 16 and over ·{" "}
              {fmtT(underPts[0]!.t, "quarterly")}–{fmtT(underPts[underPts.length - 1]!.t, "quarterly")} ·
              % of people in employment
            </h3>
            <TimeChart
              key={`underemployment-${fromYear}`}
              label="Underemployment rate"
              series={[
                { id: "underemployment-rate", label: "Want more hours", points: underPts },
              ]}
              cadence="quarterly"
              kind="line"
              showTable={false}
              format={fmtRate}
              periodLabel={(tt) => fmtT(tt, "quarterly")}
            />
          </section>
        ) : null}
        {involPts.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Part-time because no full-time job could be found · {fmtT(involPts[0]!.t)}–
              {fmtT(involPts[involPts.length - 1]!.t)} · thousands
            </h3>
            <TimeChart
              key={`involuntary-part-time-${fromYear}`}
              label="Part-time because no full-time job could be found"
              series={[
                { id: "involuntary-part-time", label: "Could not find full-time job", points: involPts },
              ]}
              cadence="monthly"
              kind="line"
              showTable={false}
              format={fmtPeopleShort}
              periodLabel={(tt) => fmtT(tt, "monthly")}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "vacancies") {
    const vacPts = pointsFrom(monthlyPoints(pack.vacancies?.observations ?? []), fromYear);
    const vacLatest = finalObs(pack.vacancies?.observations ?? []).at(-1);
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.vacancies,
          "United Kingdom",
          economyPeriod("monthly", vacLatest ? labelMonth(vacLatest.period_start) : null),
        )}
        definition={[
          "Job vacancies in the United Kingdom — open posts reported by employers, not hires or individual job offers.",
        ]}
        method={[
          "Vacancy Survey three-month average, seasonally adjusted, in thousands. Not the same as unemployment, and not a local occupational map.",
        ]}
      />
    );
    body = !vacPts.length ? (
      <EmptyStage label="Not available">
        Vacancy figures are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Vacancies · {fmtT(vacPts[0]!.t)}–{fmtT(vacPts[vacPts.length - 1]!.t)} · thousands
          </h3>
          <TimeChart
            key={`uk-vacancies-${fromYear}`}
            label="Vacancies"
            series={[{ id: "uk-vacancies", label: "Vacancies", points: vacPts }]}
            cadence="monthly"
            kind="line"
            showTable={false}
            format={fmtPeopleThousands}
            periodLabel={(tt) => fmtT(tt, "monthly")}
          />
        </section>
      </div>
    );
  } else if (view === "geography") {
    const measureTitle = GEO_MEASURE_TITLE[geoMeasure];
    const geoLabel = geoRanks ? labelMonth(geoRanks.periodStart) : null;
    const regionRanks = geoRanks?.ranks.filter((r) => ENGLISH_REGION.test(r.id)) ?? [];
    const nationRanks = geoRanks?.ranks.filter((r) => NATION_CODES.has(r.id)) ?? [];
    const geoMapData: RegionDatum[] = regionRanks.map((r) => ({
      code: r.id,
      value: r.v,
      display: fmtRate(r.v),
    }));
    const changeRows =
      geoRanks?.priorPeriodStart && geoRanks.priorRanks.length
        ? [...regionRanks, ...nationRanks]
            .map((r) => {
              const prior = geoRanks.priorRanks.find((p) => p.id === r.id);
              return prior
                ? { id: r.id, label: r.label, from: prior.v, to: r.v }
                : null;
            })
            .filter((r): r is NonNullable<typeof r> => r != null)
        : [];
    const rateUnit =
      geoMeasure === "unemployment"
        ? "% of people aged 16 and over who are economically active"
        : "% of people aged 16 to 64";
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.regionalLabour,
          "UK countries and English regions",
          economyPeriod("monthly", geoLabel),
          "ONS English regions · countries as published in HI00",
        )}
        definition={[
          "Labour Force Survey rates by UK country and English region — employment, unemployment and economic inactivity for resident people.",
          "These are headline regional rates, not Claimant Count and not employee jobs.",
        ]}
        method={[
          "ONS HI00 persons sheets, seasonally adjusted rolling three-month periods. Ownership sits with Regions & Places; this tab reads those packs and does not fork them under Economy.",
          "The map draws English regions. England, Wales, Scotland and Northern Ireland sit in the ranked list — the shared region map does not shade whole countries.",
          "HI00 has no United Kingdom or Great Britain sheet. Do not add regions together. National UK rates on the Rates tab are a different geography.",
          "Employment and inactivity rates are for people aged 16 to 64. Unemployment in HI00 is published for people aged 16 and over who are economically active. Claimant counts are not shown.",
        ]}
      />
    );
    body = !geoRanks?.ranks.length ? (
      <EmptyStage label="Not available">
        Regional labour-force rates are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        {regionRanks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              English regions · {measureTitle.toLowerCase()} · {geoLabel} · {rateUnit}
            </h3>
            <div className={s.geoSplit}>
              <RegionMap
                data={geoMapData}
                selected={selectedRegion}
                onSelect={toggleRegion}
                label={`${measureTitle} by English region`}
                legendFormat={fmtRate}
                legendUnit="Rate"
              />
              <RankBars
                key={`regional-${geoMeasure}-${geoRanks.periodStart}`}
                label={`${measureTitle} by English region`}
                rows={regionRanks.map((r) => ({
                  id: r.id,
                  label: r.label,
                  v: r.v,
                  active: selectedRegion === r.id,
                }))}
                format={fmtRate}
                onSelect={toggleRegion}
              />
            </div>
          </section>
        ) : null}
        {nationRanks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Nations · {measureTitle.toLowerCase()} · {geoLabel} · {rateUnit}
            </h3>
            <RankBars
              key={`regional-nations-${geoMeasure}-${geoRanks.periodStart}`}
              label={`${measureTitle} by nation`}
              rows={[...nationRanks]
                .sort((a, b) => b.v - a.v)
                .map((r) => ({
                  id: r.id,
                  label: r.label,
                  v: r.v,
                }))}
              format={fmtRate}
            />
          </section>
        ) : null}
        {changeRows.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Regions and nations · {labelMonth(geoRanks.priorPeriodStart!)} to {geoLabel} ·
              percentage points
            </h3>
            <ChangeRows
              key={`regional-change-${geoMeasure}`}
              label={`${measureTitle} change by place`}
              rows={changeRows}
              fromLabel={labelMonth(geoRanks.priorPeriodStart!)}
              toLabel={geoLabel ?? ""}
              format={fmtRate}
            />
          </section>
        ) : null}
      </div>
    );
  } else {
    foot = (
      <FigureRecord terms={["lfs", "unemployment", "economic-inactivity", "employment-rate", "unemployment-rate"]}
        source={economySource(
          ECONOMY_SOURCE.labourForce,
          "United Kingdom",
          economyPeriod("monthly", latestLabel),
        )}
        definition={[
          "Observation tables for the Ready United Kingdom labour-force series used in this domain.",
        ]}
        method={[
          "Latest month is provisional. Charts on the other tabs use final months only.",
        ]}
      />
    );
    body = <EmploymentData pack={pack} seriesId={activeDataSeries} />;
  }

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {figures.length ? <FigureStrip figures={figures} /> : null}
      <ControlRow>
        {view === "workforce" ? (
          <>
            <MenuControl
              label="Show"
              value={show}
              options={SHOW_OPTIONS}
              onChange={(id) => sync({ show: id as WorkforceShow })}
            />
            {compareOptions.length ? (
              <MenuControl
                label="Compare from"
                value={comparePeriod}
                options={compareOptions}
                onChange={(id) => sync({ compare: id })}
              />
            ) : null}
          </>
        ) : null}
        {(view === "rates" || view === "inactive" || view === "hours" || view === "vacancies") &&
        fromOpts.length ? (
          <MenuControl
            label="From"
            value={String(fromYear)}
            options={fromOpts}
            onChange={(id) => sync({ from: id })}
          />
        ) : null}
        {view === "industry" && industryOptions.length > 1 ? (
          <MenuControl
            label="Industry"
            value={industry}
            options={industryOptions}
            onChange={(id) => (id === "all" ? sync({ industry: "all" }) : chooseIndustry(id))}
          />
        ) : null}
        {view === "geography" ? (
          <MenuControl
            label="Measure"
            value={geoMeasure}
            options={GEO_MEASURE_OPTIONS}
            onChange={(id) => sync({ measure: id as RegionalLabourMeasure })}
          />
        ) : null}
        {view === "data" && dataSeriesOptions.length ? (
          <MenuControl
            label="Series"
            value={activeDataSeries}
            options={dataSeriesOptions}
            onChange={(id) => sync({ series: id })}
          />
        ) : null}
        <ResetButton
          onClick={() => {
            setSelectedRegion(null);
            sync({
              show: "share",
              compare: "",
              industry: "all",
              measure: "employment",
              from: "",
              series: "",
            });
          }}
        />
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          <EconomyStageFollow
            domain="employment"
            view={view}
            label={`Employment · ${viewLabel(view)}`}
          />
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

type EmploymentDataTable = {
  id: string;
  title: string;
  pack: SeriesPack | null;
  fmt: (v: number) => string;
  /** Keep only these rows (multi-series packs). */
  filter?: (r: Observation) => boolean;
  /** Period column label and formatter; default "Month" from period_start. */
  periodHeader?: string;
  period?: (r: Observation) => string;
  /** Optional middle column (e.g. occupation group). */
  extra?: { header: string; value: (r: Observation) => string };
};

function seriesNote(r: Observation, key: string): string {
  const notes = r.notes ?? "";
  const marker = `${key}=`;
  const at = notes.indexOf(marker);
  if (at < 0) return "";
  return notes.slice(at + marker.length).split(";")[0]?.trim() ?? "";
}

function employmentDataTables(pack: EmploymentPack): EmploymentDataTable[] {
  return [
    {
      id: "employment-level",
      title: "In work · people aged 16 to 64 · thousands",
      pack: pack.employmentLevel,
      fmt: fmtPeopleThousands,
    },
    {
      id: "unemployment-level",
      title: "Unemployed · people aged 16 to 64 · thousands",
      pack: pack.unemploymentLevel,
      fmt: fmtPeopleThousands,
    },
    {
      id: "economic-inactivity-level",
      title: "Outside the labour force · people aged 16 to 64 · thousands",
      pack: pack.inactivityLevel,
      fmt: fmtPeopleThousands,
    },
    {
      id: "inactivity-reason-long-term-sick",
      title: "Outside the labour force · long-term sick · thousands",
      pack: pack.reasonLongTermSick,
      fmt: fmtPeopleThousands,
    },
    {
      id: "inactivity-reason-discouraged",
      title: "Outside the labour force · discouraged workers · thousands",
      pack: pack.reasonDiscouraged,
      fmt: fmtPeopleThousands,
    },
    {
      id: "inactivity-reason-students",
      title: "Outside the labour force · students · thousands",
      pack: pack.reasonStudents,
      fmt: fmtPeopleThousands,
    },
    {
      id: "workforce-jobs-by-industry",
      title: "Workforce jobs by industry · thousands of jobs",
      pack: pack.workforceJobsByIndustry,
      fmt: fmtPeopleThousands,
    },
    {
      id: "uk-vacancies",
      title: "Vacancies · thousands",
      pack: pack.vacancies,
      fmt: fmtPeopleThousands,
    },
    {
      id: "average-actual-weekly-hours",
      title: "Average actual weekly hours",
      pack: pack.averageHours,
      fmt: (v: number) => v.toFixed(1),
    },
    {
      id: "underemployment",
      title: "People who want more hours · % of people in employment (aged 16 and over)",
      pack: pack.underemployment,
      fmt: fmtRate,
      filter: (r) => seriesNote(r, "series") === "underemployment_rate",
      periodHeader: "Quarter",
      period: (r) => fmtT(Number(r.period_start.slice(0, 4)) + (Number(r.period_start.slice(5, 7)) - 1) / 12, "quarterly"),
    },
    {
      id: "involuntary-part-time",
      title: "Part-time because no full-time job could be found · thousands",
      pack: pack.involuntaryPartTime,
      fmt: fmtPeopleThousands,
    },
    {
      id: "employment-by-occupation",
      title: "Employment by occupation · % of people in employment (aged 16 and over)",
      pack: pack.employmentByOccupation,
      fmt: fmtRate,
      filter: (r) => seriesNote(r, "series") === "share",
      periodHeader: "Twelve months",
      period: (r) => seriesNote(r, "window").replace("-", " to "),
      extra: { header: "Occupation", value: (r) => seriesNote(r, "occupation") },
    },
    {
      id: "workforce-jobs",
      title: "Workforce jobs · thousands",
      pack: pack.workforceJobs,
      fmt: fmtPeopleThousands,
    },
    {
      id: "employment-rate",
      title: "Employment rate · % of people aged 16 to 64",
      pack: pack.employmentRate,
      fmt: fmtRate,
    },
    {
      id: "unemployment-rate",
      title: "Unemployment rate · % of people looking for work (aged 16 to 64)",
      pack: pack.unemploymentRate,
      fmt: fmtRate,
    },
    {
      id: "economic-inactivity-rate",
      title: "Inactivity rate · % of people aged 16 to 64",
      pack: pack.inactivityRate,
      fmt: fmtRate,
    },
    {
      id: "employment-rate-by-region",
      title: "Employment rate by region · % of people aged 16 to 64",
      pack: pack.regionalEmploymentRate,
      fmt: fmtRate,
    },
    {
      id: "unemployment-rate-by-region",
      title: "Unemployment rate by region · % looking for work (aged 16 to 64)",
      pack: pack.regionalUnemploymentRate,
      fmt: fmtRate,
    },
    {
      id: "economic-inactivity-rate-by-region",
      title: "Inactivity rate by region · % of people aged 16 to 64",
      pack: pack.regionalInactivityRate,
      fmt: fmtRate,
    },
  ];
}

function tableRows(tbl: EmploymentDataTable): Observation[] {
  const rows = finalObs(tbl.pack?.observations ?? []);
  return tbl.filter ? rows.filter(tbl.filter) : rows;
}

function employmentDataSeriesOptions(pack: EmploymentPack): PrintOption<string>[] {
  return employmentDataTables(pack)
    .filter((tbl) => tableRows(tbl).length > 0)
    .map((tbl) => ({ value: tbl.id, label: tbl.title.split(" · ")[0] ?? tbl.title }));
}

function EmploymentData({ pack, seriesId }: { pack: EmploymentPack; seriesId: string }) {
  const tables = employmentDataTables(pack);
  const tbl =
    tables.find((x) => x.id === seriesId) ??
    tables.find((x) => tableRows(x).length > 0);
  if (!tbl) {
    return (
      <EmptyStage label="In preparation">
        Labour-force series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  const rows = tableRows(tbl).slice().reverse();
  if (!rows.length) {
    return (
      <EmptyStage label="In preparation">
        This series is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  return (
    <div className={s.stack}>
      <div className={t.tableGroup}>
        <p className={t.stageTitle}>{tbl.title}</p>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead>
              <tr>
                <th scope="col">{tbl.periodHeader ?? "Month"}</th>
                {tbl.extra ? <th scope="col">{tbl.extra.header}</th> : null}
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${tbl.id}-${r.period_start}-${r.notes ?? ""}`}>
                  <td>{tbl.period ? tbl.period(r) : labelMonth(r.period_start)}</td>
                  {tbl.extra ? <td>{tbl.extra.value(r)}</td> : null}
                  <td>{tbl.fmt(r.value as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

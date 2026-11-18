"use client";

/**
 * Economy Domain 05 — Productivity & Economic Growth.
 * Deep brief: What Britain produces.
 * Flagship: GDP · per head · labour productivity (PN2/PRDY vintage stamp in Notes).
 * Business investment Follows Domain 09 (not primary here).
 * Signature: Revisions vintage-band from `economy.gdp-vintage-band` (first estimate vs latest release, rebased).
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { ChangeRows, RankBars, TimeChart } from "../instrument/TimeChart";
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
import {
  anatomyPeriods,
  anatomyQuartersIn,
  anatomyShareChange,
  anatomySharesForPeriod,
  anatomyYears,
  fmtShare,
  servicesSharePct,
} from "./anatomy-model";
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import { ProductivityEngine } from "./ProductivityEngine";
import {
  PRE_PANDEMIC_Q4,
  asGrowthMeasure,
  asLedgerBase,
  asVintageMeasure,
  engineOutputPoints,
  engineQuarters,
  engineReading,
  engineSentence,
  finalObs,
  fmtGdpM,
  fmtIndex,
  fmtPct1,
  fmtPerHead,
  growthMeasureDefinition,
  ledgerQuartersIn,
  ledgerYears,
  periodPoints,
  quarterOf,
  qoqPct,
  rebasePoints,
  rebasedTo,
  sincePct,
  vintageIndexPoints,
  type GrowthMeasure,
  type VintageMeasure,
} from "./growth-model";
import { coerceFromYear, fromYearOptions, pointsFrom } from "./series-window";
import type { GrowthPack } from "./types";
import { toT } from "../data";

const MEASURE_OPTIONS: PrintOption<GrowthMeasure>[] = [
  { value: "gdp", label: "Total output (real GDP)" },
  { value: "per-head", label: "Per person (GDP per head)" },
  { value: "productivity", label: "Per hour worked (productivity)" },
];

/** Reference year of the live PN2 vintage — chained-volume pounds are in these prices. */
const REF_YEAR = 2024;
const PRE_PANDEMIC_LABEL = "Q4 2019";

const VINTAGE_MEASURE_OPTIONS: PrintOption<VintageMeasure>[] = [
  { value: "gdp", label: "Total output (real GDP)" },
  { value: "per-head", label: "Per person (GDP per head)" },
];

const VIEWS: ExplorerView[] = [
  { id: "produce", label: "What Britain produces" },
  { id: "ledger", label: "Growth ledger" },
  { id: "anatomy", label: "Anatomy" },
  { id: "productivity", label: "Productivity" },
  { id: "revisions", label: "Revisions" },
  { id: "data", label: "Data" },
];

const VINTAGE_NOTE =
  "The live series is the first estimate published 12 Nov 2026, in 2024 prices. Pound levels are not comparable with the earlier release in 2023 prices.";

/** ISO date → "29 Sep 2026". */
function labelDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function asView(raw: string | null): string {
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "produce";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Growth";
}

/** ISO quarter start → "Qn YYYY". */
function labelQuarter(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return fmtT(y + (m - 1) / 12, "quarterly");
}

export function GrowthCanvas({ pack }: { pack: GrowthPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [measure, setMeasure] = useState<GrowthMeasure>(() =>
    asGrowthMeasure(searchParams.get("measure")),
  );
  const [vintageMeasure, setVintageMeasure] = useState<VintageMeasure>(() =>
    asVintageMeasure(searchParams.get("measure")),
  );
  const [ledgerBase, setLedgerBase] = useState(() => searchParams.get("base") ?? PRE_PANDEMIC_Q4);
  const [engineFromRaw, setEngineFrom] = useState(() => searchParams.get("from") ?? PRE_PANDEMIC_Q4);
  const [engineToRaw, setEngineTo] = useState(() => searchParams.get("to") ?? "");
  const [anatomyPeriodRaw, setAnatomyPeriod] = useState(() => searchParams.get("period") ?? "");
  const [anatomyFromRaw, setAnatomyFrom] = useState(() => searchParams.get("compare") ?? PRE_PANDEMIC_Q4);
  /** Produce-view From year — URL key `start` (productivity owns quarter `from`). */
  const [produceStartRaw, setProduceStart] = useState(() => searchParams.get("start") ?? "");
  const [dataSeries, setDataSeries] = useState(() => searchParams.get("series") ?? "");

  const sync = useCallback(
    (next: {
      view?: string;
      measure?: GrowthMeasure;
      vintageMeasure?: VintageMeasure;
      ledgerBase?: string;
      engineFrom?: string;
      engineTo?: string;
      anatomyPeriod?: string;
      anatomyFrom?: string;
      start?: string;
      series?: string;
    }) => {
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const vm = next.vintageMeasure ?? vintageMeasure;
      const base = next.ledgerBase ?? ledgerBase;
      const ef = next.engineFrom ?? engineFromRaw;
      const et = next.engineTo ?? engineToRaw;
      const ap = next.anatomyPeriod ?? anatomyPeriodRaw;
      const af = next.anatomyFrom ?? anatomyFromRaw;
      const st = next.start ?? produceStartRaw;
      const ser = next.series ?? dataSeries;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "growth");
      u.set("view", v);
      if (v === "produce") u.set("measure", m);
      else if (v === "revisions") u.set("measure", vm);
      else u.delete("measure");
      if (v === "ledger") u.set("base", base);
      else u.delete("base");
      if (v === "produce" && st) u.set("start", st);
      else u.delete("start");
      if (v === "productivity") {
        u.set("from", ef);
        if (et) u.set("to", et);
        else u.delete("to");
      } else {
        u.delete("from");
        u.delete("to");
      }
      if (v === "anatomy") {
        if (ap) u.set("period", ap);
        else u.delete("period");
        if (af) u.set("compare", af);
        else u.delete("compare");
      } else {
        u.delete("period");
        u.delete("compare");
      }
      if (v === "data" && ser) u.set("series", ser);
      else u.delete("series");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
      if (next.vintageMeasure != null) setVintageMeasure(next.vintageMeasure);
      if (next.ledgerBase != null) setLedgerBase(next.ledgerBase);
      if (next.engineFrom != null) setEngineFrom(next.engineFrom);
      if (next.engineTo != null) setEngineTo(next.engineTo);
      if (next.anatomyPeriod != null) setAnatomyPeriod(next.anatomyPeriod);
      if (next.anatomyFrom != null) setAnatomyFrom(next.anatomyFrom);
      if (next.start != null) setProduceStart(next.start);
      if (next.series != null) setDataSeries(next.series);
    },
    [
      pathname,
      view,
      measure,
      vintageMeasure,
      ledgerBase,
      engineFromRaw,
      engineToRaw,
      anatomyPeriodRaw,
      anatomyFromRaw,
      produceStartRaw,
      dataSeries,
    ],
  );

  const active =
    measure === "per-head"
      ? pack.gdpPerHead
      : measure === "productivity"
        ? pack.productivity
        : pack.gdp;
  const rows = active?.observations ?? [];
  const ptsAll = useMemo(() => periodPoints(rows), [rows]);
  const produceFromOpts = useMemo(() => fromYearOptions(ptsAll), [ptsAll]);
  const produceFromYear = coerceFromYear(produceStartRaw || null, ptsAll);
  const pts = useMemo(() => pointsFrom(ptsAll, produceFromYear), [ptsAll, produceFromYear]);
  const dataSeriesOptions = useMemo(() => growthDataSeriesOptions(pack), [pack]);
  const activeDataSeries =
    dataSeriesOptions.find((o) => o.value === dataSeries)?.value ??
    dataSeriesOptions[0]?.value ??
    "";

  const label =
    measure === "per-head"
      ? "Output per person"
      : measure === "productivity"
        ? "Output per hour worked"
        : "Total output";
  const indicatorId =
    measure === "per-head"
      ? "real-gdp-per-head"
      : measure === "productivity"
        ? "labour-productivity"
        : "real-gdp";
  const fmt =
    measure === "per-head" ? fmtPerHead : measure === "productivity" ? fmtIndex : fmtGdpM;
  const unit =
    measure === "per-head"
      ? `£ per person · ${REF_YEAR} prices`
      : measure === "productivity"
        ? "index · 2023 = 100"
        : `£ million · ${REF_YEAR} prices`;
  const sourceLine =
    measure === "per-head"
      ? ECONOMY_SOURCE.gdpPerHead
      : measure === "productivity"
        ? ECONOMY_SOURCE.labourProductivity
        : ECONOMY_SOURCE.realGdp;

  const latestGdp = useMemo(() => {
    const f = finalObs(pack.gdp?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.gdp]);
  const latestHead = useMemo(() => {
    const f = finalObs(pack.gdpPerHead?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.gdpPerHead]);
  const latestProd = useMemo(() => {
    const f = finalObs(pack.productivity?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.productivity]);
  const gdpRows = pack.gdp?.observations ?? [];
  const basePeriod = asLedgerBase(ledgerBase, gdpRows);
  const baseLabel = labelQuarter(basePeriod);
  const baseYear = Number(basePeriod.slice(0, 4));
  const ledgerYearOptions: PrintOption<string>[] = useMemo(
    () => ledgerYears(gdpRows).slice().reverse().map((y) => ({ value: String(y), label: String(y) })),
    [gdpRows],
  );
  const ledgerQuarterOptions: PrintOption<string>[] = useMemo(
    () => ledgerQuartersIn(gdpRows, baseYear).map((p) => ({ value: p, label: `Q${quarterOf(p)}` })),
    [gdpRows, baseYear],
  );
  /** Changing the year keeps the quarter where that year has it, else its first quarter. */
  const chooseBaseYear = (y: string) => {
    const q = quarterOf(basePeriod);
    const inYear = ledgerQuartersIn(gdpRows, Number(y));
    sync({ ledgerBase: inYear.find((p) => quarterOf(p) === q) ?? inYear[0] ?? basePeriod });
  };

  const gdpQoq = qoqPct(gdpRows);
  const gdpSince = sincePct(gdpRows, basePeriod);
  const headSince = sincePct(pack.gdpPerHead?.observations ?? [], basePeriod);
  const prodSince = sincePct(pack.productivity?.observations ?? [], PRE_PANDEMIC_Q4);

  /* 01 — the three measures on one index so total, per person and per hour separate. */
  const gdpSince2019 = sincePct(gdpRows, PRE_PANDEMIC_Q4);
  const headSince2019 = sincePct(pack.gdpPerHead?.observations ?? [], PRE_PANDEMIC_Q4);
  const trio = useMemo(
    () => ({
      gdp: rebasedTo(gdpRows, PRE_PANDEMIC_Q4),
      head: rebasedTo(pack.gdpPerHead?.observations ?? [], PRE_PANDEMIC_Q4),
      hour: rebasedTo(pack.productivity?.observations ?? [], PRE_PANDEMIC_Q4),
    }),
    [gdpRows, pack.gdpPerHead, pack.productivity],
  );
  /** Window the trio to the produce From year when that still leaves points. */
  const trioWindowed = useMemo(() => {
    const gdp = pointsFrom(trio.gdp, produceFromYear);
    const head = pointsFrom(trio.head, produceFromYear);
    const hour = pointsFrom(trio.hour, produceFromYear);
    return {
      gdp: gdp.length ? gdp : trio.gdp,
      head: head.length ? head : trio.head,
      hour: hour.length ? hour : trio.hour,
    };
  }, [trio, produceFromYear]);
  const gdpRebased = useMemo(() => rebasedTo(gdpRows, basePeriod), [gdpRows, basePeriod]);
  const headRebased = useMemo(
    () => rebasedTo(pack.gdpPerHead?.observations ?? [], basePeriod),
    [pack.gdpPerHead, basePeriod],
  );
  const prodPts = useMemo(
    () => periodPoints(pack.productivity?.observations ?? []),
    [pack.productivity],
  );
  const hoursPts = useMemo(
    () => periodPoints(pack.productivityHours?.observations ?? []),
    [pack.productivityHours],
  );

  /* 03 — Productivity engine: two quarters where both hours and output per hour are final. */
  const hoursRows = pack.productivityHours?.observations ?? [];
  const perHourRows = pack.productivity?.observations ?? [];
  const engineQs = useMemo(() => engineQuarters(hoursRows, perHourRows), [hoursRows, perHourRows]);
  const engineTo = engineQs.includes(engineToRaw) ? engineToRaw : (engineQs.at(-1) ?? "");
  const engineFromCandidates = engineQs.filter((q) => q < engineTo);
  const engineFrom = engineFromCandidates.includes(engineFromRaw)
    ? engineFromRaw
    : engineFromCandidates.includes(PRE_PANDEMIC_Q4)
      ? PRE_PANDEMIC_Q4
      : (engineFromCandidates[0] ?? "");
  const engineToCandidates = engineQs.filter((q) => q > engineFrom);
  const yearsOf = (qs: string[]) => [...new Set(qs.map((q) => Number(q.slice(0, 4))))].sort((a, b) => b - a);
  const engineFromYear = Number(engineFrom.slice(0, 4));
  const engineToYear = Number(engineTo.slice(0, 4));
  const engineFromYearOptions: PrintOption<string>[] = yearsOf(engineFromCandidates).map((y) => ({ value: String(y), label: String(y) }));
  const engineFromQOptions: PrintOption<string>[] = engineFromCandidates
    .filter((q) => Number(q.slice(0, 4)) === engineFromYear)
    .map((q) => ({ value: q, label: `Q${quarterOf(q)}` }));
  const engineToYearOptions: PrintOption<string>[] = yearsOf(engineToCandidates).map((y) => ({ value: String(y), label: String(y) }));
  const engineToQOptions: PrintOption<string>[] = engineToCandidates
    .filter((q) => Number(q.slice(0, 4)) === engineToYear)
    .map((q) => ({ value: q, label: `Q${quarterOf(q)}` }));
  const pickEngineYear = (which: "from" | "to", y: string) => {
    const cands = which === "from" ? engineFromCandidates : engineToCandidates;
    const cur = which === "from" ? engineFrom : engineTo;
    const inYear = cands.filter((q) => Number(q.slice(0, 4)) === Number(y));
    const next = inYear.find((q) => quarterOf(q) === quarterOf(cur)) ?? (which === "from" ? inYear[0] : inYear.at(-1)) ?? cur;
    sync(which === "from" ? { engineFrom: next } : { engineTo: next });
  };
  const reading = useMemo(
    () => (engineFrom && engineTo ? engineReading(hoursRows, perHourRows, engineFrom, engineTo) : null),
    [hoursRows, perHourRows, engineFrom, engineTo],
  );
  const outputPts = useMemo(() => engineOutputPoints(hoursRows, perHourRows), [hoursRows, perHourRows]);
  const engineIndexed = useMemo(() => {
    if (!engineFrom) return { hours: [], perHour: [], output: [] };
    const t0 = toT(engineFrom);
    return {
      hours: rebasePoints(hoursPts, t0),
      perHour: rebasePoints(prodPts, t0),
      output: rebasePoints(outputPts, t0),
    };
  }, [hoursPts, prodPts, outputPts, engineFrom]);
  const engineFromLabel = engineFrom ? labelQuarter(engineFrom) : "";
  const engineToLabel = engineTo ? labelQuarter(engineTo) : "";

  /** Revisions pack slice — hooks stay at top level (Rules of Hooks). */
  const vintageSpotKey = vintageMeasure === "per-head" ? "real-gdp-per-head" : "real-gdp";
  const vintageFirst = pack.vintageBand?.series[vintageSpotKey]?.find((v) => v.id === "first");
  const vintageLatest = pack.vintageBand?.series[vintageSpotKey]?.find((v) => v.id === "latest");
  const vintageFirstPts = useMemo(
    () => vintageIndexPoints(vintageFirst?.index),
    [vintageFirst],
  );
  const vintageLatestPts = useMemo(
    () => vintageIndexPoints(vintageLatest?.index),
    [vintageLatest],
  );

  /* 04 — Anatomy: current-price GVA section shares. */
  const gvaRows = pack.industryGva?.observations ?? [];
  const anatomyQs = useMemo(() => anatomyPeriods(gvaRows, "quarterly"), [gvaRows]);
  const anatomyPeriod = anatomyQs.includes(anatomyPeriodRaw)
    ? anatomyPeriodRaw
    : (anatomyQs.at(-1) ?? "");
  const anatomyFromCandidates = anatomyQs.filter((q) => q < anatomyPeriod);
  const anatomyFrom = anatomyFromCandidates.includes(anatomyFromRaw)
    ? anatomyFromRaw
    : anatomyFromCandidates.includes(PRE_PANDEMIC_Q4)
      ? PRE_PANDEMIC_Q4
      : (anatomyFromCandidates[0] ?? "");
  const anatomyYear = Number(anatomyPeriod.slice(0, 4) || 0);
  const anatomyFromYear = Number(anatomyFrom.slice(0, 4) || 0);
  const anatomyYearOptions: PrintOption<string>[] = anatomyYears(anatomyQs)
    .slice()
    .reverse()
    .map((y) => ({ value: String(y), label: String(y) }));
  const anatomyQOptions: PrintOption<string>[] = anatomyQuartersIn(anatomyQs, anatomyYear).map(
    (q) => ({ value: q, label: `Q${quarterOf(q)}` }),
  );
  const anatomyFromYearOptions: PrintOption<string>[] = anatomyYears(anatomyFromCandidates)
    .slice()
    .reverse()
    .map((y) => ({ value: String(y), label: String(y) }));
  const anatomyFromQOptions: PrintOption<string>[] = anatomyQuartersIn(
    anatomyFromCandidates,
    anatomyFromYear,
  ).map((q) => ({ value: q, label: `Q${quarterOf(q)}` }));
  const anatomySlice = useMemo(
    () => anatomySharesForPeriod(gvaRows, anatomyPeriod),
    [gvaRows, anatomyPeriod],
  );
  const anatomyChange = useMemo(
    () =>
      anatomyFrom && anatomyPeriod
        ? anatomyShareChange(gvaRows, anatomyFrom, anatomyPeriod)
        : [],
    [gvaRows, anatomyFrom, anatomyPeriod],
  );
  const anatomyRanks = useMemo(
    () => anatomySlice.sections.map((s) => ({ id: s.id, label: s.label, v: s.sharePct })),
    [anatomySlice],
  );
  const pickAnatomyYear = (which: "period" | "from", y: string) => {
    const pool = which === "period" ? anatomyQs : anatomyFromCandidates;
    const cur = which === "period" ? anatomyPeriod : anatomyFrom;
    const inYear = anatomyQuartersIn(pool, Number(y));
    const next =
      inYear.find((q) => quarterOf(q) === quarterOf(cur)) ??
      (which === "period" ? inYear.at(-1) : inYear[0]) ??
      cur;
    sync(which === "period" ? { anatomyPeriod: next } : { anatomyFrom: next });
  };

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "anatomy") {
      const top = anatomySlice.sections[0];
      const mfg = anatomySlice.sections.find((s) => s.id === "C");
      const services = servicesSharePct(anatomySlice.sections);
      return [
        {
          label: "Largest industry share",
          value: top ? fmtShare(top.sharePct) : "—",
          note: top ? `${top.label} · ${labelQuarter(anatomyPeriod)}` : "Not loaded",
        },
        {
          label: "Manufacturing share",
          value: mfg ? fmtShare(mfg.sharePct) : "—",
          note: mfg ? labelQuarter(anatomyPeriod) : "Not loaded",
        },
        {
          label: "Services share",
          value: services != null ? fmtShare(services) : "—",
          note: services != null ? `All service industries · ${labelQuarter(anatomyPeriod)}` : "Not loaded",
        },
      ];
    }
    if (view === "ledger") {
      return [
        {
          label: "Total output · latest quarter",
          value: gdpQoq != null ? fmtPct1(gdpQoq) : "—",
          note: latestGdp ? `${labelQuarter(latestGdp.period_start)} · on the quarter before` : "Not loaded",
        },
        {
          label: `Total output since ${baseLabel}`,
          value: gdpSince != null ? fmtPct1(gdpSince) : "—",
          note: latestGdp ? `To ${labelQuarter(latestGdp.period_start)}` : "Not loaded",
        },
        {
          label: `Per person since ${baseLabel}`,
          value: headSince != null ? fmtPct1(headSince) : "—",
          note: latestHead ? `To ${labelQuarter(latestHead.period_start)}` : "Not loaded",
        },
      ];
    }
    if (view === "productivity") {
      const span = `${engineFromLabel} to ${engineToLabel}`;
      return [
        {
          label: "Output",
          value: reading ? fmtPct1(reading.outputPct) : "—",
          note: reading ? `${span} · hours and output per hour together` : "Choose two quarters",
        },
        {
          label: "Hours worked",
          value: reading ? fmtPct1(reading.hoursPct) : "—",
          note: reading ? `${span} · whole economy` : "Not loaded",
        },
        {
          label: "Output per hour",
          value: reading ? fmtPct1(reading.perHourPct) : "—",
          note: reading ? `${span} · productivity` : "Not loaded",
        },
      ];
    }
    if (view === "revisions") {
      const spotKey = vintageMeasure === "per-head" ? "real-gdp-per-head" : "real-gdp";
      const spot = pack.vintageBand?.spot[spotKey];
      const latest = pack.vintageBand?.series[spotKey]?.find((v) => v.id === "latest");
      const first = pack.vintageBand?.series[spotKey]?.find((v) => v.id === "first");
      const to = spot ? labelQuarter(spot.latest_period) : "";
      const gap = spot != null ? spot.latest_since_ref_pct - spot.first_since_ref_pct : null;
      return [
        {
          label: `First estimate since ${PRE_PANDEMIC_LABEL}`,
          value: spot != null ? fmtPct1(spot.first_since_ref_pct) : "—",
          note: first ? `Published ${labelDate(first.release_date)} · to ${to}` : "Not loaded",
        },
        {
          label: `Latest estimate since ${PRE_PANDEMIC_LABEL}`,
          value: spot != null ? fmtPct1(spot.latest_since_ref_pct) : "—",
          note: latest ? `Published ${labelDate(latest.release_date)} · to ${to}` : "Not loaded",
        },
        {
          label: "Revision",
          value:
            gap != null
              ? `${gap > 0.005 ? "+" : gap < -0.005 ? "−" : ""}${Math.abs(gap).toFixed(2)} points`
              : "—",
          note: `Latest less first estimate · growth to ${to}`,
        },
      ];
    }
    const since = (q: string, v: number | null) =>
      v != null ? `${q} · ${fmtPct1(v)} since ${PRE_PANDEMIC_LABEL}` : q;
    return [
      {
        label: "Total output · a quarter",
        value: latestGdp?.value != null ? fmtGdpM(latestGdp.value) : "—",
        note: latestGdp ? since(labelQuarter(latestGdp.period_start), gdpSince2019) : "Not loaded",
      },
      {
        label: "Per person · a quarter",
        value: latestHead?.value != null ? fmtPerHead(latestHead.value) : "—",
        note: latestHead ? since(labelQuarter(latestHead.period_start), headSince2019) : "Not loaded",
      },
      {
        label: "Per hour worked · index",
        value: latestProd?.value != null ? fmtIndex(latestProd.value) : "—",
        note: latestProd ? since(labelQuarter(latestProd.period_start), prodSince) : "Not loaded",
      },
    ];
  }, [
    gdpSince2019,
    headSince2019,
    view,
    vintageMeasure,
    pack.vintageBand,
    latestGdp,
    latestHead,
    latestProd,
    gdpQoq,
    gdpSince,
    headSince,
    prodSince,
    reading,
    engineFromLabel,
    engineToLabel,
    baseLabel,
    anatomySlice,
    anatomyPeriod,
  ]);

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "data") {
    foot = (
      <FigureRecord terms={["gdp", "gdp-per-head", "cvm", "productivity", "seasonally-adjusted"]}
        source={economySource(ECONOMY_SOURCE.growth, "United Kingdom", economyPeriod("quarterly"))}
        definition="The published quarterly figures behind this domain, latest first."
        method={[
          "Total output and output per person are from the ONS first quarterly estimate of GDP. Output per hour and hours worked are from the ONS labour productivity release.",
          "Business investment lives on the Investment domain.",
          "The Series menu shows one Ready table in full. Tables show final quarters only.",
        ]}
      />
    );
    body = <GrowthData pack={pack} seriesId={activeDataSeries} />;
  } else if (view === "revisions") {
    const measureLabel = vintageMeasure === "per-head" ? "Output per person" : "Total output";
    const revisionLast = vintageLatestPts.length
      ? fmtT(vintageLatestPts[vintageLatestPts.length - 1]!.t, "quarterly")
      : null;
    const firstLabel = vintageFirst ? `First estimate · ${labelDate(vintageFirst.release_date)}` : "First estimate";
    const latestLabel = vintageLatest ? `Latest estimate · ${labelDate(vintageLatest.release_date)}` : "Latest estimate";
    foot = (
      <FigureRecord terms={["gdp", "gdp-per-head", "cvm", "productivity", "seasonally-adjusted"]}
        source={economySource(
          vintageMeasure === "per-head" ? ECONOMY_SOURCE.gdpPerHead : ECONOMY_SOURCE.realGdp,
          "United Kingdom",
          economyPeriod("quarterly", revisionLast),
        )}
        definition={[
          "The ONS publishes a first estimate of each quarter's output, then revises it as fuller data arrives: first in the Quarterly National Accounts, then again each autumn.",
          `Both releases are set to 100 at ${PRE_PANDEMIC_LABEL} so the shape of growth can be compared. Pound levels are not drawn together, because the price base moves between releases.`,
        ]}
        method={[
          vintageLatest && vintageFirst
            ? `First estimate: published ${labelDate(vintageFirst.release_date)}, ${vintageFirst.reference_year} prices. Latest estimate: published ${labelDate(vintageLatest.release_date)}, ${vintageLatest.reference_year} prices; the latest release also adds one more quarter.`
            : VINTAGE_NOTE,
          "The other Growth tabs use the latest release.",
          "Output per hour is not shown here; its next release is due 17 Nov 2026.",
        ]}
      />
    );
    body = !pack.vintageBand || !vintageFirstPts.length || !vintageLatestPts.length ? (
      <EmptyStage label="Not available">
        The revisions comparison is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {measureLabel} · first and latest estimates · {PRE_PANDEMIC_LABEL} = 100 ·{" "}
            {fmtT(vintageLatestPts[0]!.t, "quarterly")}–{revisionLast}
          </h3>
          <TimeChart
            key={`growth-revisions-${vintageMeasure}`}
            label={`${measureLabel}: first estimate against latest estimate`}
            series={[
              { id: "latest", label: latestLabel, points: vintageLatestPts },
              {
                id: "first",
                label: firstLabel,
                points: vintageFirstPts,
                role: "reference",
              },
            ]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtIndex}
          />
        </section>
      </div>
    );
  } else if (view === "ledger") {
    foot = (
      <FigureRecord terms={["gdp", "gdp-per-head", "cvm", "productivity", "seasonally-adjusted"]}
        source={economySource(
          ECONOMY_SOURCE.realGdp,
          "United Kingdom",
          economyPeriod("quarterly", latestGdp ? labelQuarter(latestGdp.period_start) : null),
        )}
        definition={[
          `How total output and output per person have changed since ${baseLabel}, which is set to 100. Choose any quarter back to 1955 as the starting point.`,
          "The two lines part when the population changes: total output can grow while output per person stands still.",
        ]}
        method={[
          `The index is worked out from final ONS levels on one release (${baseLabel} = 100). It is not a published GDP figure.`,
          `Levels are in ${REF_YEAR} prices, seasonally adjusted. Charts use final quarters only; the latest quarter is provisional and is not drawn until revised.`,
        ]}
      />
    );
    const baseGdp = finalObs(gdpRows).find((r) => r.period_start === basePeriod)?.value ?? null;
    const baseHead =
      finalObs(pack.gdpPerHead?.observations ?? []).find((r) => r.period_start === basePeriod)?.value ?? null;
    const quartersElapsed = gdpRebased.length - 1;
    const annualised = (since: number | null) =>
      since != null && quartersElapsed > 0 ? (Math.pow(1 + since / 100, 4 / quartersElapsed) - 1) * 100 : null;
    body = !gdpRebased.length ? (
      <EmptyStage label="Not available">
        Real GDP is not loaded from the Exchange API right now, or the chosen starting quarter is missing on this vintage.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Total output and output per person · {baseLabel} = 100 ·{" "}
            {fmtT(gdpRebased[0]!.t, "quarterly")}–{fmtT(gdpRebased[gdpRebased.length - 1]!.t, "quarterly")}
          </h3>
          <TimeChart
            key={`growth-ledger-${basePeriod}`}
            label={`Total output and output per person since ${baseLabel}`}
            series={[
              { id: "real-gdp", label: "Total output", points: gdpRebased },
              ...(headRebased.length
                ? [{ id: "real-gdp-per-head", label: "Per person", points: headRebased }]
                : []),
            ]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtIndex}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Ledger · {baseLabel} to {latestGdp ? labelQuarter(latestGdp.period_start) : "now"} · {REF_YEAR} prices
          </h3>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">{baseLabel}</th>
                  <th scope="col">{latestGdp ? labelQuarter(latestGdp.period_start) : "Latest"}</th>
                  <th scope="col">Change</th>
                  <th scope="col">A year, on average</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total output · a quarter</td>
                  <td >{baseGdp != null ? fmtGdpM(baseGdp) : "—"}</td>
                  <td >{latestGdp?.value != null ? fmtGdpM(latestGdp.value) : "—"}</td>
                  <td >{gdpSince != null ? fmtPct1(gdpSince) : "—"}</td>
                  <td >{annualised(gdpSince) != null ? fmtPct1(annualised(gdpSince)!) : "—"}</td>
                </tr>
                <tr>
                  <td>Per person · a quarter</td>
                  <td >{baseHead != null ? fmtPerHead(baseHead) : "—"}</td>
                  <td >{latestHead?.value != null ? fmtPerHead(latestHead.value) : "—"}</td>
                  <td >{headSince != null ? fmtPct1(headSince) : "—"}</td>
                  <td >{annualised(headSince) != null ? fmtPct1(annualised(headSince)!) : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  } else if (view === "anatomy") {
    const periodLabel = anatomyPeriod ? labelQuarter(anatomyPeriod) : "";
    const fromLabel = anatomyFrom ? labelQuarter(anatomyFrom) : "";
    foot = (
      <FigureRecord terms={["gdp", "gdp-per-head", "cvm", "productivity", "seasonally-adjusted"]}
        source={economySource(
          ECONOMY_SOURCE.industryGva,
          "United Kingdom",
          economyPeriod("quarterly", periodLabel || null),
        )}
        definition={[
          "How much of Britain's measured output comes from each broad industry, as a share of total gross value added.",
          "Gross value added is the value of what industries produce after the cost of goods and services used up in production — not the same as GDP at market prices.",
        ]}
        method={[
          "Shares use pounds at the prices of the day, so the industries add up to the total (give or take rounding).",
          "Twenty broad industries, as the ONS groups them. Services means every industry from retail and transport through to health and the arts. Charts use final quarters only; the latest quarter is held back until final.",
          "Manufacturing here is its share of value added. It is not the production weight used for manufacturing on the Energy page.",
        ]}
      />
    );
    body = !anatomyRanks.length ? (
      <EmptyStage label="Not available">
        Industry gross value added is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Share of total gross value added by industry · {periodLabel} · %
          </h3>
          <RankBars
            key={`growth-anatomy-${anatomyPeriod}`}
            label={`Industry share of gross value added, ${periodLabel}`}
            rows={anatomyRanks}
            format={fmtShare}
          />
        </section>
        {anatomyChange.length && anatomyFrom ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Change in industry share · {fromLabel} to {periodLabel} · percentage points of total
            </h3>
            <ChangeRows
              key={`growth-anatomy-change-${anatomyFrom}-${anatomyPeriod}`}
              label={`Industry share change, ${fromLabel} to ${periodLabel}`}
              rows={anatomyChange}
              fromLabel={fromLabel}
              toLabel={periodLabel}
              format={fmtShare}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "productivity") {
    foot = (
      <FigureRecord terms={["gdp", "gdp-per-head", "cvm", "productivity", "seasonally-adjusted"]}
        source={economySource(
          ECONOMY_SOURCE.labourProductivityHours,
          "United Kingdom",
          economyPeriod("quarterly", engineToLabel || null),
        )}
        definition={[
          ...(reading ? [engineSentence(reading, engineFromLabel, engineToLabel)] : []),
          "This view compares changes in hours worked, output per hour, and their combined effect on measured output.",
          "This is an accounting split: it shows how the change in output divides between the two parts, not what caused either to move.",
        ]}
        method={[
          "Hours worked and output per hour are seasonally adjusted ONS indexes (2023 = 100) from the same release. Output here is the two multiplied together, so it is not the GDP figure on the other tabs.",
          "The two parts are scaled so they add up to the change in output. Both quarters must be final; the latest provisional quarter is not offered.",
          "Manufacturing productivity is on Energy › Jobs › Productivity.",
        ]}
      />
    );
    body = !engineQs.length ? (
      <EmptyStage label="Not available">
        Hours worked and output per hour are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : !reading ? (
      <EmptyStage label="Choose two quarters">
        Pick a start and an end quarter to split the change in output.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            The productivity engine
          </h3>
          <ProductivityEngine
            reading={reading}
            fromLabel={engineFromLabel}
            toLabel={engineToLabel}
            label="Change in hours worked, output per hour and their product between the two chosen quarters"
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Hours, output per hour and output · {engineFromLabel} = 100 · {engineFromLabel}–
            {prodPts.length ? fmtT(prodPts[prodPts.length - 1]!.t, "quarterly") : ""}
          </h3>
          <TimeChart
            key={`engine-index-${engineFrom}-${engineTo}`}
            label="Hours worked, output per hour and output indexed to the start quarter"
            series={[
              { id: "labour-productivity-hours", label: "Hours worked", points: engineIndexed.hours },
              { id: "labour-productivity", label: "Output per hour", points: engineIndexed.perHour },
              { id: "engine-output", label: "Output", points: engineIndexed.output },
            ]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtIndex}
            rules={[{ id: "to", t: toT(engineTo), label: engineToLabel, active: true }]}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Readings · {engineFromLabel} and {engineToLabel} · index, 2023 = 100
          </h3>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Part</th>
                  <th scope="col">{engineFromLabel}</th>
                  <th scope="col">{engineToLabel}</th>
                  <th scope="col">Change</th>
                  <th scope="col">Share of output change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Hours worked</td>
                  <td>{fmtIndex(reading.hours0)}</td>
                  <td>{fmtIndex(reading.hours1)}</td>
                  <td>{fmtPct1(reading.hoursPct)}</td>
                  <td>{fmtPct1(reading.hoursContrib)}</td>
                </tr>
                <tr>
                  <td>Output per hour</td>
                  <td>{fmtIndex(reading.perHour0)}</td>
                  <td>{fmtIndex(reading.perHour1)}</td>
                  <td>{fmtPct1(reading.perHourPct)}</td>
                  <td>{fmtPct1(reading.perHourContrib)}</td>
                </tr>
                <tr>
                  <td>Output</td>
                  <td>{fmtIndex(reading.output0)}</td>
                  <td>{fmtIndex(reading.output1)}</td>
                  <td>{fmtPct1(reading.outputPct)}</td>
                  <td>{fmtPct1(reading.outputPct)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  } else {
    foot = (
      <FigureRecord terms={["gdp", "gdp-per-head", "cvm", "productivity", "seasonally-adjusted"]}
        source={economySource(
          sourceLine,
          "United Kingdom",
          economyPeriod(
            "quarterly",
            pts.length ? fmtT(pts[pts.length - 1]!.t, "quarterly") : null,
          ),
        )}
        definition={[
          growthMeasureDefinition(measure),
          "Three different questions: how much the whole economy produces, how much that is per resident, and how much each hour of work produces. They can move apart when the population or the hours worked change.",
        ]}
        method={[
          `Total output and output per person are ONS chained-volume measures in ${REF_YEAR} prices, seasonally adjusted. Output per hour is the ONS whole-economy productivity index, 2023 = 100.`,
          `The second chart sets each series to 100 at ${PRE_PANDEMIC_LABEL}, worked out from the published levels on one release.`,
          measure === "per-head"
            ? "Output per person starts in 1955; earlier ONS placeholders are not drawn."
            : "Charts use final quarters only. The latest quarter is provisional and is not drawn until revised.",
        ]}
      />
    );
    if (!pts.length) {
      body = (
        <EmptyStage label="Not available">
          This growth series is not loaded from the Exchange API right now.
        </EmptyStage>
      );
    } else {
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      const trioSeries = [
        { id: "real-gdp", label: "Total output", points: trioWindowed.gdp },
        { id: "real-gdp-per-head", label: "Per person", points: trioWindowed.head },
        { id: "labour-productivity", label: "Per hour worked", points: trioWindowed.hour },
      ].filter((sr) => sr.points.length);
      const trioFirst = trioSeries[0]?.points[0];
      const trioLast = trioSeries[0]?.points.at(-1);
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              {label} · {fmtT(first.t, "quarterly")}–{fmtT(last.t, "quarterly")} · {unit}
            </h3>
            <TimeChart
              key={`growth-${measure}-${produceFromYear}`}
              label={label}
              series={[{ id: indicatorId, label, points: pts }]}
              cadence="quarterly"
              kind="line"
              zero={false}
              showTable={false}
              format={fmt}
            />
          </section>
          {trioSeries.length > 1 && trioFirst && trioLast ? (
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Total, per person and per hour · {PRE_PANDEMIC_LABEL} = 100 ·{" "}
                {fmtT(trioFirst.t, "quarterly")}–{fmtT(trioLast.t, "quarterly")}
              </h3>
              <TimeChart
                key={`growth-trio-${produceFromYear}`}
                label="Total output, output per person and output per hour on one index from Q4 2019"
                series={trioSeries}
                cadence="quarterly"
                kind="line"
                zero={false}
                showTable={false}
                format={fmtIndex}
              />
            </section>
          ) : null}
        </div>
      );
    }
  }

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      <FigureStrip figures={figures} />
      <ControlRow label="Growth controls">
        {view === "produce" ? (
          <>
            <MenuControl
              label="Measure"
              value={measure}
              options={MEASURE_OPTIONS}
              onChange={(id) => sync({ measure: id as GrowthMeasure })}
            />
            {produceFromOpts.length ? (
              <MenuControl
                label="From"
                value={String(produceFromYear)}
                options={produceFromOpts}
                onChange={(id) => sync({ start: id })}
              />
            ) : null}
          </>
        ) : null}
        {view === "ledger" && ledgerYearOptions.length ? (
          <>
            <MenuControl label="From year" value={String(baseYear)} options={ledgerYearOptions} onChange={chooseBaseYear} />
            <MenuControl
              label="Quarter"
              value={basePeriod}
              options={ledgerQuarterOptions}
              onChange={(id) => sync({ ledgerBase: id })}
            />
          </>
        ) : null}
        {view === "anatomy" && anatomyQs.length ? (
          <>
            <MenuControl
              label="Year"
              value={String(anatomyYear)}
              options={anatomyYearOptions}
              onChange={(y) => pickAnatomyYear("period", y)}
            />
            <MenuControl
              label="Quarter"
              value={anatomyPeriod}
              options={anatomyQOptions}
              onChange={(id) => sync({ anatomyPeriod: id })}
            />
            {anatomyFromYearOptions.length ? (
              <>
                <MenuControl
                  label="Compare from year"
                  value={String(anatomyFromYear)}
                  options={anatomyFromYearOptions}
                  onChange={(y) => pickAnatomyYear("from", y)}
                />
                <MenuControl
                  label="Quarter"
                  value={anatomyFrom}
                  options={anatomyFromQOptions}
                  onChange={(id) => sync({ anatomyFrom: id })}
                />
              </>
            ) : null}
          </>
        ) : null}
        {view === "productivity" && engineQs.length ? (
          <>
            <MenuControl label="From year" value={String(engineFromYear)} options={engineFromYearOptions} onChange={(y) => pickEngineYear("from", y)} />
            <MenuControl label="Quarter" value={engineFrom} options={engineFromQOptions} onChange={(q) => sync({ engineFrom: q })} />
            <MenuControl label="To year" value={String(engineToYear)} options={engineToYearOptions} onChange={(y) => pickEngineYear("to", y)} />
            <MenuControl label="Quarter" value={engineTo} options={engineToQOptions} onChange={(q) => sync({ engineTo: q })} />
          </>
        ) : null}
        {view === "revisions" ? (
          <MenuControl
            label="Measure"
            value={vintageMeasure}
            options={VINTAGE_MEASURE_OPTIONS}
            onChange={(id) => sync({ vintageMeasure: id as VintageMeasure })}
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
          onClick={() =>
            sync({
              measure: "gdp",
              vintageMeasure: "gdp",
              ledgerBase: PRE_PANDEMIC_Q4,
              engineFrom: PRE_PANDEMIC_Q4,
              engineTo: "",
              anatomyPeriod: "",
              anatomyFrom: PRE_PANDEMIC_Q4,
              start: "",
              series: "",
            })
          }
        />
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          <EconomyStageFollow domain="growth" view={view} label={`Growth · ${viewLabel(view)}`} />
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

const GVA_SERIES_ID = "industry-gva";

function growthDataTables(pack: GrowthPack) {
  return [
    {
      id: "real-gdp",
      title: `Total output (real GDP) · £ million · ${REF_YEAR} prices · seasonally adjusted`,
      pack: pack.gdp,
      fmt: fmtGdpM,
    },
    {
      id: "real-gdp-per-head",
      title: `Output per person (GDP per head) · £ · ${REF_YEAR} prices · seasonally adjusted`,
      pack: pack.gdpPerHead,
      fmt: fmtPerHead,
    },
    {
      id: "labour-productivity",
      title: "Output per hour worked · index · 2023 = 100",
      pack: pack.productivity,
      fmt: fmtIndex,
    },
    {
      id: "labour-productivity-hours",
      title: "Hours worked · index · 2023 = 100",
      pack: pack.productivityHours,
      fmt: fmtIndex,
    },
  ] as const;
}

function growthGvaSlice(pack: GrowthPack) {
  const gvaQs = anatomyPeriods(pack.industryGva?.observations ?? [], "quarterly");
  const gvaLatest = gvaQs.at(-1) ?? "";
  const gvaSlice = gvaLatest
    ? anatomySharesForPeriod(pack.industryGva?.observations ?? [], gvaLatest)
    : { total: null as number | null, sections: [] as ReturnType<typeof anatomySharesForPeriod>["sections"] };
  return { gvaLatest, gvaSlice };
}

function growthDataSeriesOptions(pack: GrowthPack): PrintOption<string>[] {
  const opts: PrintOption<string>[] = [];
  for (const tbl of growthDataTables(pack)) {
    if (finalObs(tbl.pack?.observations ?? []).length) {
      opts.push({ value: tbl.id, label: tbl.title.split(" · ")[0] ?? tbl.title });
    }
  }
  const { gvaSlice } = growthGvaSlice(pack);
  if (gvaSlice.sections.length) {
    opts.push({ value: GVA_SERIES_ID, label: "Value added by industry" });
  }
  return opts;
}

function GrowthData({ pack, seriesId }: { pack: GrowthPack; seriesId: string }) {
  const tables = growthDataTables(pack);
  const { gvaLatest, gvaSlice } = growthGvaSlice(pack);
  const any =
    tables.some((x) => finalObs(x.pack?.observations ?? []).length > 0) || gvaSlice.sections.length > 0;
  if (!any) {
    return (
      <EmptyStage label="In preparation">
        Growth series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  if (seriesId === GVA_SERIES_ID && gvaSlice.sections.length && gvaLatest) {
    return (
      <div className={s.stack}>
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Value added by industry · {labelQuarter(gvaLatest)} · £ million · prices of the day ·
            seasonally adjusted
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Industry</th>
                  <th scope="col">£ million</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {gvaSlice.total != null ? (
                  <tr>
                    <td>—</td>
                    <td>All industries</td>
                    <td>{fmtGdpM(gvaSlice.total)}</td>
                    <td>100%</td>
                  </tr>
                ) : null}
                {gvaSlice.sections.map((sec) => (
                  <tr key={sec.id}>
                    <td>{sec.id}</td>
                    <td>{sec.label}</td>
                    <td>{fmtGdpM(sec.value)}</td>
                    <td>{fmtShare(sec.sharePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const tbl =
    tables.find((x) => x.id === seriesId) ??
    tables.find((x) => finalObs(x.pack?.observations ?? []).length > 0);
  if (!tbl) {
    return (
      <EmptyStage label="Not available">This series is not available right now.</EmptyStage>
    );
  }
  const rows = finalObs(tbl.pack?.observations ?? []).slice().reverse();
  if (!rows.length) {
    return (
      <EmptyStage label="Not available">This series is not available right now.</EmptyStage>
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
                <th scope="col">Quarter</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${tbl.id}-${r.period_start}`}>
                  <td>{fmtT(periodPoints([r])[0]!.t, "quarterly")}</td>
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

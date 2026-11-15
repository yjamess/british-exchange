"use client";

/**
 * Economy Domain 02 — Wages & Earnings.
 * Deep brief: Pay cheque vs prices · Value of Work · Wage ladder (ASHE Table 1)
 * · Geography of Pay (ASHE Table 7 workplace).
 * 01 Pay cheque vs prices: GB cash AWE against UK CPIH (index from a chosen year,
 *    then 12-month growth against inflation); real pay figures alongside.
 * Ladder: UK ASHE weekly gross percentiles — not AWE, not manufacturing ASHE.
 * Geography: workplace medians by English region (+ nations RankBars).
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { ChangeRows, RankBars, TimeChart } from "../instrument/TimeChart";
import { MapLegend, RegionMap, type RegionDatum } from "../map";
import { AreaMap } from "../housing/atlas/AreaMap";
import { breaks, formatValue, type Area } from "../housing/atlas/model";
import { useGeometry } from "../housing/canvas/insecurity/Displacement";
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
  SearchControl,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
} from "../template";
import s from "../energy/generation.module.css";
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import { WageLadder } from "./WageLadder";
import { PayStrip } from "./PayStrip";
import {
  annualAverages,
  asAsheSheet,
  asheEditionLabel,
  asheEditions,
  asheIndustryPoints,
  asheLadderRanks,
  asheRegionIndustryByIndustry,
  asheRegionIndustryByPlace,
  asheSections,
  asheSheetLabel,
  asheRegionalPoints,
  asheRegionalValue,
  asheStatistic,
  compareWork,
  drawdownPoints,
  finalObs,
  fmtGbpWeek,
  longestSpellBelowHigh,
  fmtIndex,
  fmtPct1,
  monthlyPoints,
  pointsFrom,
  rebasedPair,
  seriesYears,
  sicLabel,
  yoyPct,
  yoyPoints,
  type AsheSheet,
} from "./wages-model";
import type { WagesPack } from "./types";
import type { Observation } from "@/lib/api";

const ASHE_SHEET_OPTIONS: PrintOption<AsheSheet>[] = [
  { value: "All", label: "All employee jobs" },
  { value: "Full-Time", label: "Full-time" },
  { value: "Part-Time", label: "Part-time" },
];
const ALL_SHEETS: AsheSheet[] = ["All", "Full-Time", "Part-Time"];
/** Table 7 (geography) publishes All and Full-time only. */
const GEO_SHEET_OPTIONS = ASHE_SHEET_OPTIONS.filter((o) => o.value !== "Part-Time");

type GeoLens = "place" | "industry" | "local";
const GEO_LENS_OPTIONS: PrintOption<GeoLens>[] = [
  { value: "place", label: "Regions and nations" },
  { value: "industry", label: "By industry" },
  { value: "local", label: "Local areas" },
];
const LOCAL_MEASURE = "weekly-pay";
const DEFAULT_SIC = "G";
function asGeoLens(raw: string | null): GeoLens {
  return raw === "industry" || raw === "local" ? raw : "place";
}

const VIEWS: ExplorerView[] = [
  { id: "vs-prices", label: "Pay cheque vs prices" },
  { id: "value", label: "Value of work" },
  { id: "ladder", label: "Wage ladder" },
  { id: "geography", label: "Geography of pay" },
  { id: "data", label: "Data" },
];

/** Devolved nations + England for the nations RankBars (exclude UK/GB aggregates). */
const NATION_CODES = ["E92000001", "W92000004", "S92000003", "N92000002"] as const;
const UK_CODE = "K02000001";

const DEFAULT_COMPARE_YEAR = 2008;
const DEFAULT_VIEW = "vs-prices";

/** Old single-series tabs fold into Pay cheque vs prices (links keep working). */
const LEGACY_VIEW: Record<string, string> = { real: "vs-prices", cash: "vs-prices" };

function asView(raw: string | null): string {
  if (raw && LEGACY_VIEW[raw]) return LEGACY_VIEW[raw]!;
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : DEFAULT_VIEW;
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Wages";
}

export function WagesCanvas({ pack }: { pack: WagesPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [yearRaw, setYear] = useState<string>(
    () => searchParams.get("year") ?? String(DEFAULT_COMPARE_YEAR),
  );
  const [fromRaw, setFrom] = useState<string>(() => searchParams.get("from") ?? "");
  const [toRaw, setTo] = useState<string>(() => searchParams.get("to") ?? "");
  const [asheSheet, setAsheSheet] = useState<AsheSheet>(() =>
    asAsheSheet(searchParams.get("sheet")),
  );
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [lens, setLens] = useState<GeoLens>(() => asGeoLens(searchParams.get("lens")));
  const [sicRaw, setSic] = useState<string>(() => searchParams.get("sic") ?? DEFAULT_SIC);
  const [placeRaw, setPlace] = useState<string>(() => searchParams.get("place") ?? "");
  const [placeSearch, setPlaceSearch] = useState("");
  const [dataSeries, setDataSeries] = useState(() => searchParams.get("series") ?? "");
  const { geometry, error: geometryError } = useGeometry();

  const sync = useCallback(
    (next: {
      view?: string;
      year?: string;
      to?: string;
      from?: string;
      sheet?: AsheSheet;
      lens?: GeoLens;
      sic?: string;
      place?: string;
      series?: string;
    }) => {
      const v = next.view ?? view;
      const ln = next.lens ?? lens;
      const sc = next.sic ?? sicRaw;
      const pl = next.place ?? placeRaw;
      const y = next.year ?? yearRaw;
      const to = next.to ?? toRaw;
      const f = next.from ?? fromRaw;
      const sheet = next.sheet ?? asheSheet;
      const ser = next.series ?? dataSeries;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "wages");
      u.set("view", v);
      u.delete("measure");
      if (v === "value") u.set("year", y);
      else u.delete("year");
      if (v === "value" && to) u.set("to", to);
      else u.delete("to");
      if (v === "vs-prices" && f) u.set("from", f);
      else u.delete("from");
      if (v === "ladder" || v === "geography") u.set("sheet", sheet);
      else u.delete("sheet");
      if (v === "geography") u.set("lens", ln);
      else u.delete("lens");
      if (v === "geography" && ln === "industry") u.set("sic", sc);
      else u.delete("sic");
      if (v === "geography" && ln === "local" && pl) u.set("place", pl);
      else u.delete("place");
      if (v === "data" && ser) u.set("series", ser);
      else u.delete("series");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) {
        setView(next.view);
        if (next.view !== "geography") setSelectedRegion(null);
      }
      if (next.year != null) setYear(next.year);
      if (next.from != null) setFrom(next.from);
      if (next.to != null) setTo(next.to);
      if (next.lens != null) setLens(next.lens);
      if (next.sic != null) setSic(next.sic);
      if (next.place != null) setPlace(next.place);
      if (next.series != null) setDataSeries(next.series);
      if (next.sheet != null) {
        setAsheSheet(next.sheet);
        setSelectedRegion(null);
      }
    },
    [pathname, view, yearRaw, toRaw, fromRaw, asheSheet, lens, sicRaw, placeRaw, dataSeries],
  );

  const realRows = pack.real?.observations ?? [];
  const cashRows = pack.nominal?.observations ?? [];
  const cpihRows = pack.cpihIndex?.observations ?? [];
  const cpihRateRows = pack.cpihRate?.observations ?? [];
  const asheRows = pack.ashe?.observations ?? [];
  const asheRegionalRows = pack.asheRegional?.observations ?? [];
  const asheIndustryRows = pack.asheIndustry?.observations ?? [];
  const asheRegionIndustryRows = pack.asheRegionIndustry?.observations ?? [];
  /* 03 — Wage ladder: latest edition drawn, the one before laid over and compared. */
  const editions = useMemo(() => asheEditions(asheRows), [asheRows]);
  const latestEdition = editions.at(-1) ?? null;
  const priorEdition = editions.length > 1 ? editions[editions.length - 2]! : null;
  const latestEditionLabel = asheEditionLabel(asheRows, latestEdition);
  const priorEditionLabel = asheEditionLabel(asheRows, priorEdition);
  const ladderRanks = useMemo(
    () => asheLadderRanks(asheRows, asheSheet, false, latestEdition),
    [asheRows, asheSheet, latestEdition],
  );
  const priorRanks = useMemo(
    () => (priorEdition ? asheLadderRanks(asheRows, asheSheet, false, priorEdition) : []),
    [asheRows, asheSheet, priorEdition],
  );
  /* One pay scale per coverage sheet, fixed across editions, so the chosen ladder fills the stage. */
  const ladderAxisMax = useMemo(() => {
    let maxPay = 0;
    for (const ed of editions) {
      for (const r of asheLadderRanks(asheRows, asheSheet, false, ed)) maxPay = Math.max(maxPay, r.v);
    }
    const step = maxPay > 1000 ? 250 : 100;
    return Math.max(step, Math.ceil((maxPay * 1.12) / step) * step);
  }, [asheRows, asheSheet, editions]);
  const asheMedian = asheStatistic(asheRows, asheSheet, "median", latestEdition);
  const asheP10 = asheStatistic(asheRows, asheSheet, "p10", latestEdition);
  const asheP90 = asheStatistic(asheRows, asheSheet, "p90", latestEdition);
  const asheMean = asheStatistic(asheRows, asheSheet, "mean", latestEdition);
  const priorMedian = asheStatistic(asheRows, asheSheet, "median", priorEdition);
  const priorMean = asheStatistic(asheRows, asheSheet, "mean", priorEdition);
  const geoSheet: AsheSheet = asheSheet === "Part-Time" ? "All" : asheSheet;
  const regionalRegions = useMemo(
    () => asheRegionalPoints(asheRegionalRows, geoSheet, "region"),
    [asheRegionalRows, geoSheet],
  );
  const regionalNations = useMemo(() => {
    const byCode = new Map(
      asheRegionalPoints(asheRegionalRows, geoSheet, "nation").map((p) => [p.code, p]),
    );
    return NATION_CODES.map((code) => byCode.get(code)).filter(
      (p): p is NonNullable<typeof p> => p != null,
    );
  }, [asheRegionalRows, geoSheet]);
  /* 04 — Geography of pay: two Table 7 editions, plus Table 4 / Table 5 for the industry lens. */
  const geoEditions = useMemo(() => asheEditions(asheRegionalRows), [asheRegionalRows]);
  const geoLatest = geoEditions.at(-1) ?? null;
  const geoPrior = geoEditions.length > 1 ? geoEditions[geoEditions.length - 2]! : null;
  const geoLatestLabel = asheEditionLabel(asheRegionalRows, geoLatest);
  const geoPriorLabel = asheEditionLabel(asheRegionalRows, geoPrior);
  const priorRegions = useMemo(
    () => (geoPrior ? asheRegionalPoints(asheRegionalRows, geoSheet, "region", geoPrior) : []),
    [asheRegionalRows, geoSheet, geoPrior],
  );
  const priorNations = useMemo(
    () => (geoPrior ? asheRegionalPoints(asheRegionalRows, geoSheet, "nation", geoPrior) : []),
    [asheRegionalRows, geoSheet, geoPrior],
  );
  const priorUkMedian = geoPrior ? asheRegionalValue(asheRegionalRows, geoSheet, UK_CODE, geoPrior) : null;
  const sections = useMemo(() => asheSections(asheRegionIndustryRows), [asheRegionIndustryRows]);
  const sic = sections.includes(sicRaw) ? sicRaw : (sections[0] ?? DEFAULT_SIC);
  const sicOptions: PrintOption<string>[] = useMemo(
    () => sections.map((c) => ({ value: c, label: sicLabel(c) })),
    [sections],
  );
  const industryLabel = asheEditionLabel(asheRegionIndustryRows, asheEditions(asheRegionIndustryRows).at(-1) ?? null);
  const ukIndustries = useMemo(() => asheIndustryPoints(asheIndustryRows, geoSheet), [asheIndustryRows, geoSheet]);
  const ukIndustryMedian = ukIndustries.find((p) => p.sic === sic)?.v ?? null;
  const industryPlaces = useMemo(
    () => asheRegionIndustryByPlace(asheRegionIndustryRows, geoSheet, sic),
    [asheRegionIndustryRows, geoSheet, sic],
  );
  const placeIndustries = useMemo(
    () => (selectedRegion ? asheRegionIndustryByIndustry(asheRegionIndustryRows, geoSheet, selectedRegion) : ukIndustries),
    [asheRegionIndustryRows, geoSheet, selectedRegion, ukIndustries],
  );
  /* Local areas: Table 7 local-authority rows on Housing's boundary map. */
  const localPoints = useMemo(
    () => asheRegionalPoints(asheRegionalRows, geoSheet, "local_authority"),
    [asheRegionalRows, geoSheet],
  );
  const priorLocalPoints = useMemo(
    () => (geoPrior ? asheRegionalPoints(asheRegionalRows, geoSheet, "local_authority", geoPrior) : []),
    [asheRegionalRows, geoSheet, geoPrior],
  );
  const localAreas: Area[] = useMemo(
    () => localPoints.map((p) => ({ code: p.code, name: p.label, level: "local" as const, values: [p.v] })),
    [localPoints],
  );
  const localPlace = localPoints.find((p) => p.code === placeRaw) ?? null;
  const localSuggestions = useMemo(() => {
    const q = placeSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return localPoints
      .filter((p) => p.label.toLowerCase().includes(q))
      .slice(0, 12)
      .map((p) => ({ value: p.code, label: p.label }));
  }, [localPoints, placeSearch]);
  const localRank = localPlace ? localPoints.findIndex((p) => p.code === localPlace.code) + 1 : 0;
  const ukWorkplaceMedian = asheRegionalValue(asheRegionalRows, geoSheet, UK_CODE);
  const londonWorkplaceMedian = asheRegionalValue(
    asheRegionalRows,
    geoSheet,
    "E12000007",
  );
  const lowestRegion = regionalRegions.length
    ? regionalRegions[regionalRegions.length - 1]!
    : null;
  const realPts = useMemo(() => monthlyPoints(realRows), [realRows]);
  const cashPts = useMemo(() => monthlyPoints(cashRows), [cashRows]);
  const cpihPts = useMemo(() => monthlyPoints(cpihRows), [cpihRows]);
  const latestReal = useMemo(() => {
    const finals = finalObs(realRows);
    return finals[finals.length - 1] ?? null;
  }, [realRows]);
  const latestCash = useMemo(() => {
    const finals = finalObs(cashRows);
    return finals[finals.length - 1] ?? null;
  }, [cashRows]);
  const realYoy = yoyPct(realRows);
  const cashYoy = yoyPct(cashRows);
  const cpihRatePts = useMemo(() => monthlyPoints(cpihRateRows), [cpihRateRows]);
  const latestCpihRate = cpihRatePts.at(-1) ?? null;
  const cashYoyPts = useMemo(() => yoyPoints(cashRows), [cashRows]);

  /* 01 — Pay cheque vs prices: cash pay against CPIH from a chosen year. */
  const fromYears = useMemo(() => seriesYears(cashPts).slice(0, -1), [cashPts]);
  const fromOptions: PrintOption<string>[] = useMemo(
    () => fromYears.map((y) => ({ value: String(y), label: String(y) })),
    [fromYears],
  );
  const fromYear = fromYears.includes(Number(fromRaw)) ? Number(fromRaw) : (fromYears[0] ?? 2000);
  const pair = useMemo(
    () => rebasedPair(pointsFrom(cashPts, fromYear), pointsFrom(cpihPts, fromYear)),
    [cashPts, cpihPts, fromYear],
  );
  const growthCash = useMemo(() => pointsFrom(cashYoyPts, fromYear), [cashYoyPts, fromYear]);
  const growthPrices = useMemo(
    () => pointsFrom(cpihRatePts, fromYear).filter((p) => p.t >= (growthCash[0]?.t ?? fromYear)),
    [cpihRatePts, fromYear, growthCash],
  );

  const yearOptions: PrintOption<string>[] = useMemo(
    () =>
      [...annualAverages(realRows).keys()]
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: String(y) })),
    [realRows],
  );
  const compareYear = yearOptions.some((o) => o.value === yearRaw)
    ? Number(yearRaw)
    : Number(
        yearOptions.find((o) => o.value === String(DEFAULT_COMPARE_YEAR))?.value ??
          yearOptions.at(-1)?.value ??
          DEFAULT_COMPARE_YEAR,
      );
  const toOptions: PrintOption<string>[] = useMemo(
    () => [
      { value: "", label: "Now" },
      ...yearOptions.filter((o) => Number(o.value) > compareYear),
    ],
    [yearOptions, compareYear],
  );
  const toYear = toOptions.some((o) => o.value === toRaw && o.value !== "") ? Number(toRaw) : null;
  const worth = useMemo(
    () => compareWork(realRows, compareYear, toYear),
    [realRows, compareYear, toYear],
  );
  const drawdown = useMemo(() => drawdownPoints(realPts), [realPts]);
  const spell = useMemo(
    () => (worth ? longestSpellBelowHigh(realPts, worth.fromYear, worth.toT) : null),
    [realPts, worth],
  );
  const realRange = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of realPts) {
      if (p.v < lo) lo = p.v;
      if (p.v > hi) hi = p.v;
    }
    return { lo, hi };
  }, [realPts]);

  const dataSeriesOptions = useMemo(() => wagesDataSeriesOptions(pack), [pack]);
  const activeDataSeries =
    dataSeriesOptions.find((o) => o.value === dataSeries)?.value ??
    dataSeriesOptions[0]?.value ??
    "";

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "value") {
      if (!worth) return [];
      const verdict =
        worth.verdict === "more"
          ? "A week's pay buys more than"
          : worth.verdict === "less"
            ? "A week's pay buys less than"
            : "A week's pay buys about the same as";
      return [
        {
          label: `${worth.fromYear} average`,
          value: fmtGbpWeek(worth.fromAvg),
          note: "Real weekly pay · 2015 prices · Great Britain",
        },
        {
          label: worth.toYear != null ? `${worth.toYear} average` : "Now",
          value: fmtGbpWeek(worth.toValue),
          note:
            worth.toYear != null
              ? `Against ${worth.fromYear} · ${fmtPct1(worth.changePct)}`
              : `${fmtT(worth.toT)} · against ${worth.fromYear} · ${fmtPct1(worth.changePct)}`,
        },
        {
          label: "Verdict",
          value: fmtPct1(worth.changePct),
          note: `${verdict} in ${worth.fromYear}`,
        },
      ];
    }
    if (view === "ladder") {
      const medianMove =
        asheMedian != null && priorMedian != null && priorMedian !== 0
          ? ((asheMedian - priorMedian) / priorMedian) * 100
          : null;
      return [
        {
          label: "Median weekly pay",
          value: asheMedian != null ? fmtGbpWeek(asheMedian) : "—",
          note: `${asheSheetLabel(asheSheet)} employee jobs · UK · ${latestEditionLabel}${
            medianMove != null ? ` · ${fmtPct1(medianMove)} on ${priorEditionLabel.replace(" revised", "")}` : ""
          }`,
        },
        {
          label: "Lowest tenth · highest tenth",
          value:
            asheP10 != null && asheP90 != null
              ? `${fmtGbpWeek(asheP10)} · ${fmtGbpWeek(asheP90)}`
              : "—",
          note: "A tenth of jobs pay less than the first; a tenth pay more than the second",
        },
        {
          label: "Top against bottom",
          value: asheP10 != null && asheP90 != null && asheP10 > 0 ? `${(asheP90 / asheP10).toFixed(1)}×` : "—",
          note: "The 90th percentile as a multiple of the 10th · cash £",
        },
      ];
    }
    if (view === "geography") {
      const sheetWord = asheSheetLabel(geoSheet);
      if (lens === "local") {
        const top = localPoints[0] ?? null;
        const bottom = localPoints.length ? localPoints[localPoints.length - 1]! : null;
        const prior = localPlace ? priorLocalPoints.find((p) => p.code === localPlace.code) : null;
        const move = localPlace && prior && prior.v !== 0 ? ((localPlace.v - prior.v) / prior.v) * 100 : null;
        return [
          {
            label: localPlace ? localPlace.label : "Highest",
            value: localPlace ? fmtGbpWeek(localPlace.v) : top ? fmtGbpWeek(top.v) : "—",
            note: localPlace
              ? `Median weekly gross · ${sheetWord} employee jobs · place of work · ${geoLatestLabel}${
                  localRank ? ` · ${localRank} of ${localPoints.length} areas` : ""
                }`
              : top
                ? `${top.label} · place of work · ${geoLatestLabel}`
                : "Local areas",
          },
          {
            label: localPlace ? "Against the UK" : "Lowest",
            value:
              localPlace && ukWorkplaceMedian != null
                ? fmtPct1(((localPlace.v - ukWorkplaceMedian) / ukWorkplaceMedian) * 100)
                : bottom
                  ? fmtGbpWeek(bottom.v)
                  : "—",
            note:
              localPlace && ukWorkplaceMedian != null
                ? `UK median ${fmtGbpWeek(ukWorkplaceMedian)} · ${sheetWord} employee jobs`
                : bottom
                  ? `${bottom.label} · place of work · ${geoLatestLabel}`
                  : "Local areas",
          },
          {
            label: localPlace ? `On ${geoPriorLabel.replace(" revised", "")}` : "Areas published",
            value: localPlace ? (move != null ? fmtPct1(move) : "—") : String(localPoints.length),
            note: localPlace
              ? prior
                ? `${fmtGbpWeek(prior.v)} in ${geoPriorLabel}`
                : "Not published in the earlier edition"
              : "Great Britain local authorities · Northern Ireland not in Table 7",
          },
        ];
      }
      if (lens === "industry") {
        const top = industryPlaces[0] ?? null;
        const bottom = industryPlaces.length ? industryPlaces[industryPlaces.length - 1]! : null;
        const selected = industryPlaces.find((r) => r.code === selectedRegion) ?? null;
        return [
          {
            label: `${sicLabel(sic)} · UK`,
            value: ukIndustryMedian != null ? fmtGbpWeek(ukIndustryMedian) : "—",
            note: `Median weekly gross · ${sheetWord} employee jobs · ${industryLabel}`,
          },
          {
            label: selected ? selected.label : top ? `Highest · ${top.label}` : "Highest",
            value: selected ? fmtGbpWeek(selected.v) : top ? fmtGbpWeek(top.v) : "—",
            note: `${sicLabel(sic)} · place of work`,
          },
          {
            label: selected && ukIndustryMedian != null ? "Against the UK" : bottom ? `Lowest · ${bottom.label}` : "Lowest",
            value:
              selected && ukIndustryMedian != null
                ? fmtPct1(((selected.v - ukIndustryMedian) / ukIndustryMedian) * 100)
                : bottom
                  ? fmtGbpWeek(bottom.v)
                  : "—",
            note:
              selected && ukIndustryMedian != null
                ? `${sicLabel(sic)} pay in ${selected.label} against the UK median for the industry`
                : `${sicLabel(sic)} · place of work`,
          },
        ];
      }
      const selected = regionalRegions.find((r) => r.code === selectedRegion);
      const ukMove =
        ukWorkplaceMedian != null && priorUkMedian != null && priorUkMedian !== 0
          ? ((ukWorkplaceMedian - priorUkMedian) / priorUkMedian) * 100
          : null;
      return [
        {
          label: "UK median",
          value: ukWorkplaceMedian != null ? fmtGbpWeek(ukWorkplaceMedian) : "—",
          note: `${sheetWord} employee jobs · place of work · ${geoLatestLabel}${
            ukMove != null ? ` · ${fmtPct1(ukMove)} on ${geoPriorLabel.replace(" revised", "")}` : ""
          }`,
        },
        {
          label: selected ? selected.label : "London",
          value: selected
            ? fmtGbpWeek(selected.v)
            : londonWorkplaceMedian != null
              ? fmtGbpWeek(londonWorkplaceMedian)
              : "—",
          note: selected ? "English region · place of work" : "Highest English region · place of work",
        },
        {
          label: selected && ukWorkplaceMedian != null ? "Against the UK" : "Lowest region",
          value:
            selected && ukWorkplaceMedian != null
              ? fmtPct1(((selected.v - ukWorkplaceMedian) / ukWorkplaceMedian) * 100)
              : lowestRegion
                ? fmtGbpWeek(lowestRegion.v)
                : "—",
          note:
            selected && ukWorkplaceMedian != null
              ? "Selected region against the UK median"
              : lowestRegion
                ? `${lowestRegion.label} · English regions`
                : "English regions",
        },
      ];
    }
    return [
      {
        label: "Cash weekly pay",
        value: latestCash?.value != null ? fmtGbpWeek(latestCash.value) : "—",
        note: latestCash
          ? `${fmtT(monthlyPoints([latestCash])[0]!.t)} · Great Britain${
              cashYoy != null ? ` · ${fmtPct1(cashYoy)} on a year` : ""
            }`
          : "Cash pay not loaded",
      },
      {
        label: "Prices · 12 months",
        value: latestCpihRate ? fmtPct1(latestCpihRate.v) : "—",
        note: latestCpihRate
          ? `CPIH · ${fmtT(latestCpihRate.t)} · United Kingdom`
          : "CPIH rate not loaded",
      },
      {
        label: "Real weekly pay",
        value: latestReal?.value != null ? fmtGbpWeek(latestReal.value) : "—",
        note: latestReal
          ? `${fmtT(monthlyPoints([latestReal])[0]!.t)} · 2015 prices${
              realYoy != null ? ` · ${fmtPct1(realYoy)} on a year` : ""
            }`
          : "Real pay not loaded",
      },
    ];
  }, [
    view,
    worth,
    latestReal,
    latestCash,
    realYoy,
    cashYoy,
    latestCpihRate,
    asheSheet,
    asheMedian,
    asheP10,
    asheP90,
    priorMedian,
    latestEditionLabel,
    priorEditionLabel,
    ukWorkplaceMedian,
    londonWorkplaceMedian,
    lowestRegion,
    regionalRegions,
    selectedRegion,
    geoSheet,
    lens,
    sic,
    industryPlaces,
    ukIndustryMedian,
    industryLabel,
    priorUkMedian,
    geoLatestLabel,
    geoPriorLabel,
    localPoints,
    priorLocalPoints,
    localPlace,
    localRank,
  ]);

  const geoMapData: RegionDatum[] = useMemo(
    () =>
      (lens === "industry" ? industryPlaces.filter((r) => r.classification === "region") : regionalRegions).map((r) => ({
        code: r.code,
        value: r.v,
        display: fmtGbpWeek(r.v),
      })),
    [regionalRegions, industryPlaces, lens],
  );

  const toggleRegion = (code: string) => {
    setSelectedRegion((cur) => (cur === code ? null : code));
  };

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "value") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.realEarnings,
          "Great Britain",
          economyPeriod("monthly", worth ? fmtT(worth.latestT) : null),
        )}
        definition={[
          "What a week's average work buys, in real terms, in one year against another year or the latest month, and how far pay sits below its highest month in this series.",
          "This is whole-economy average weekly earnings (regular pay) after prices, not an individual's take-home pay, household income or median salary.",
        ]}
        method={[
          "ONS real average weekly earnings as published (CPIH, 2015 prices), seasonally adjusted, Great Britain. Final months only.",
          "A year is the average of its twelve months. 'Now' is the latest final month.",
          "Below the previous high is an Exchange calculation from the published series: each month against the highest month before it. Zero means a new high. The peak is the highest month in this series since 2000, not a claim about all time.",
          "The measured strip reads the difference in pounds a week and, times 52, an approximate yearly figure. The spell is the longest run of months below an earlier high that overlaps the chosen interval, from the month the high was set to the month it was regained.",
        ]}
      />
    );
    body = !worth ? (
      <EmptyStage label="Not available">
        Real earnings are not available for this comparison right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Real weekly pay · Great Britain · {fmtT(realPts[0]!.t)}–{fmtT(worth.latestT)} · £ ·
            2015 prices
          </h3>
          <TimeChart
            key={`value-${worth.fromYear}-${worth.toYear ?? "now"}`}
            label="Real average weekly earnings with the compared years and the observed peak"
            series={[{ id: "real-earnings", label: "Real pay · Great Britain", points: realPts }]}
            cadence="monthly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtGbpWeek}
            rules={[
              { id: "from", t: worth.fromYear + 0.5, label: String(worth.fromYear), active: true },
              ...(worth.toYear != null
                ? [{ id: "to", t: worth.toYear + 0.5, label: String(worth.toYear), active: true }]
                : []),
              { id: "peak", t: worth.peak.t, label: "Peak" },
            ]}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Below the previous high · derived from real pay · {fmtT(drawdown[0]!.t)}–{fmtT(worth.latestT)} · %
          </h3>
          <TimeChart
            key="value-drawdown"
            label="Real pay as a percentage below its highest earlier month"
            series={[{ id: "real-earnings-drawdown", label: "Below the previous high", points: drawdown }]}
            cadence="monthly"
            kind="line"
            zero
            showTable={false}
            format={fmtPct1}
            axisFormat={(v) => `${v.toFixed(0)}%`}
            rules={[
              { id: "from", t: worth.fromYear + 0.5, label: String(worth.fromYear), active: true },
              ...(worth.toYear != null
                ? [{ id: "to", t: worth.toYear + 0.5, label: String(worth.toYear), active: true }]
                : []),
            ]}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Lost and gained · {worth.fromYear} average to {worth.toYear != null ? `${worth.toYear} average` : fmtT(worth.toT)} · £ a week · 2015 prices
          </h3>
          <PayStrip
            fromLabel={`${worth.fromYear} average`}
            fromValue={worth.fromAvg}
            toLabel={worth.toYear != null ? `${worth.toYear} average` : fmtT(worth.toT)}
            toValue={worth.toValue}
            seriesMin={realRange.lo}
            seriesMax={realRange.hi}
            spell={spell}
            windowEndT={worth.toT}
            label="Real weekly pay at the two chosen dates, the difference between them, and the longest spell below a previous high"
          />
        </section>
      </div>
    );
  } else if (view === "ladder") {
    const sheetWord = asheSheetLabel(asheSheet);
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.asheNational,
          "United Kingdom",
          `Annual · ${latestEditionLabel}${priorEditionLabel ? ` and ${priorEditionLabel}` : ""}`,
        )}
        definition={[
          "Weekly gross pay across employee jobs in the United Kingdom, from the lowest paid to the highest paid, using the percentiles ONS publishes from the Annual Survey of Hours and Earnings.",
          "This is pay per job before tax, not take-home pay, household income or self-employed earnings. It is a different survey from the average weekly earnings on the other tabs.",
        ]}
        method={[
          "Every rung is a published figure: the pay at the 10th, 20th, 25th, 30th, 40th, 50th, 60th, 70th, 75th, 80th and 90th percentiles. One tenth of jobs sits between each pair of decile rungs. Nothing between the rungs is estimated.",
          "The ladder runs dashed below the 10th and above the 90th percentile because ONS does not publish where the lowest and highest tenths start or end.",
          `Coverage sheets: all employee jobs, full-time and part-time. Median is ONS's preferred average; the mean is higher because of high earners (${
            asheMean != null ? fmtGbpWeek(asheMean) : "—"
          } for ${sheetWord} jobs in ${latestEditionLabel.replace(" provisional", "")}).`,
          "Cash pounds, not real terms. The latest April is provisional and will be revised; the earlier April is the revised edition.",
        ]}
      />
    );
    body = !ladderRanks.length ? (
      <EmptyStage label="Not available">
        National ASHE percentiles are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            The ladder · {sheetWord} employee jobs · UK · {latestEditionLabel} · £ a week
          </h3>
          <WageLadder
            ranks={ladderRanks}
            axisMax={ladderAxisMax}
            editionLabel={latestEditionLabel}
            sheetLabel={sheetWord}
            label="Weekly gross pay at each published percentile, drawn as rungs on one pay scale"
          />
        </section>
        {priorRanks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Each rung · {priorEditionLabel} to {latestEditionLabel} · {sheetWord} employee jobs · £ a week
            </h3>
            <ChangeRows
              key={`ashe-change-${asheSheet}`}
              label="Weekly gross pay at each percentile, earlier edition to latest"
              rows={ladderRanks
                .map((r) => {
                  const prior = priorRanks.find((p) => p.id === r.id);
                  return prior ? { id: r.id, label: r.label, from: prior.v, to: r.v } : null;
                })
                .filter((r): r is NonNullable<typeof r> => r != null)}
              reference={
                asheMean != null && priorMean != null
                  ? { label: "Mean", from: priorMean, to: asheMean }
                  : undefined
              }
              fromLabel={priorEditionLabel}
              toLabel={latestEditionLabel}
              format={fmtGbpWeek}
            />
          </section>
        ) : (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Each rung · {sheetWord} employee jobs · UK · {latestEditionLabel} · £ a week
            </h3>
            <RankBars
              key={`ashe-ladder-${asheSheet}`}
              label="ASHE weekly gross percentiles"
              rows={ladderRanks.map((r) => ({
                id: r.id,
                label: r.label,
                v: r.v,
                active: r.id === "median",
              }))}
              reference={asheMean != null ? { label: "Mean", v: asheMean } : undefined}
              format={fmtGbpWeek}
            />
          </section>
        )}
      </div>
    );
  } else if (view === "geography") {
    const sheetWord = asheSheetLabel(geoSheet);
    if (lens === "local") {
      const thresholds = breaks(LOCAL_MEASURE, "price");
      const choose = (code: string) => sync({ place: code === placeRaw ? "" : code });
      const topRows = localPoints.slice(0, 12);
      const rankRows =
        localPlace && !topRows.some((r) => r.code === localPlace.code) ? [...topRows, localPlace] : topRows;
      const changeFor = (pts: typeof localPoints) =>
        pts
          .map((r) => {
            const prior = priorLocalPoints.find((p) => p.code === r.code);
            return prior ? { id: r.code, label: r.label, from: prior.v, to: r.v } : null;
          })
          .filter((r): r is NonNullable<typeof r> => r != null);
      const changeRows = [
        ...(localPlace ? changeFor([localPlace]) : []),
        ...changeFor(localPoints.slice(0, 5)).filter((r) => r.id !== placeRaw),
        ...changeFor(localPoints.slice(-5)).filter((r) => r.id !== placeRaw),
      ];
      foot = (
        <FigureRecord
          source={economySource(
            ECONOMY_SOURCE.asheRegional,
            "Great Britain local authorities · workplace",
            `Annual · ${geoLatestLabel}${geoPriorLabel ? ` and ${geoPriorLabel}` : ""}`,
          )}
          definition={[
            "Median weekly gross pay for employee jobs in each local authority, by place of work, from the Annual Survey of Hours and Earnings. Where people work, not where they live.",
            "This is pay per job before tax, not household income or take-home pay. A high-paying area is often one that people travel into.",
          ]}
          method={[
            "Table 7, weekly pay gross, local-authority rows. Sheets: all employee jobs and full-time. Cash pounds, not real terms.",
            "Boundaries are ONS December 2025 local authorities. Northern Ireland is not in Table 7 and is left unshaded, as is any area ONS does not publish.",
            "The latest April is provisional; the earlier April is the revised edition. Small areas carry wider sampling error than regions.",
          ]}
        />
      );
      body = !localPoints.length ? (
        <EmptyStage label="Not available">
          Local-authority pay is not loaded from the Exchange API right now.
        </EmptyStage>
      ) : (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Local authorities · median weekly gross · {sheetWord} employee jobs · place of work · {geoLatestLabel} · £ a week
            </h3>
            <div className={s.geoSplit}>
              <div className={s.stack}>
                {geometry ? (
                  <AreaMap
                    shapes={geometry.shapes}
                    areas={localAreas}
                    month={0}
                    measure={LOCAL_MEASURE}
                    mode="price"
                    selected={placeRaw}
                    comparison=""
                    onSelect={choose}
                    flow
                    compact
                    coverage="Local authorities · Great Britain"
                    mapLabel="Map of local authorities shaded by median weekly gross pay for jobs located there"
                  />
                ) : (
                  <EmptyStage label={geometryError ? "Map unavailable" : "Loading map"}>
                    {geometryError || "Fetching local-authority boundaries…"}
                  </EmptyStage>
                )}
                <MapLegend
                  title="£ a week"
                  thresholds={thresholds}
                  format={(v) => formatValue(v, LOCAL_MEASURE, "price", true)}
                />
              </div>
              <RankBars
                key={`ashe-local-${geoSheet}-${placeRaw}`}
                label="Highest-paying local authorities by place of work, with the chosen place"
                rows={rankRows.map((r) => ({ id: r.code, label: r.label, v: r.v, active: r.code === placeRaw }))}
                reference={ukWorkplaceMedian != null ? { label: "UK median", v: ukWorkplaceMedian } : undefined}
                format={fmtGbpWeek}
                onSelect={choose}
              />
            </div>
          </section>
          {changeRows.length ? (
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                {localPlace ? `${localPlace.label}, the ` : "The "}highest five and lowest five · {geoPriorLabel} to {geoLatestLabel} · {sheetWord} employee jobs · £ a week
              </h3>
              <ChangeRows
                key={`ashe-local-change-${geoSheet}-${placeRaw}`}
                label="Median weekly gross pay by local authority, earlier edition to latest"
                rows={changeRows}
                reference={
                  ukWorkplaceMedian != null && priorUkMedian != null
                    ? { label: "United Kingdom", from: priorUkMedian, to: ukWorkplaceMedian }
                    : undefined
                }
                fromLabel={geoPriorLabel}
                toLabel={geoLatestLabel}
                format={fmtGbpWeek}
              />
            </section>
          ) : null}
        </div>
      );
    } else if (lens === "industry") {
      const placeLabel = selectedRegion
        ? (industryPlaces.find((r) => r.code === selectedRegion)?.label ?? regionalRegions.find((r) => r.code === selectedRegion)?.label ?? "Selected place")
        : "United Kingdom";
      foot = (
        <FigureRecord
          source={economySource(
            `${ECONOMY_SOURCE.asheRegional} and industry`,
            "United Kingdom · workplace",
            `Annual · ${industryLabel}`,
          )}
          definition={[
            "Median weekly gross pay for employee jobs by industry and by place of work, from the Annual Survey of Hours and Earnings. Industries are the broad sections of the standard industrial classification.",
            "This is pay per job before tax at the workplace, not where people live, and not average weekly earnings, household income or take-home pay.",
          ]}
          method={[
            "Places by industry use Table 5 (English regions, Wales and Scotland). The UK figure for an industry uses Table 4. England and Northern Ireland are not published by industry in Table 5.",
            "Sheets: all employee jobs and full-time. Cash pounds, not real terms. The latest April is provisional. Some small industries are not published for some places and are left out rather than estimated.",
            "Manufacturing pay in more detail is on Energy › Jobs › Pay.",
          ]}
        />
      );
      body = !industryPlaces.length && !ukIndustries.length ? (
        <EmptyStage label="Not available">
          Industry pay by place is not loaded from the Exchange API right now.
        </EmptyStage>
      ) : (
        <div className={s.stack}>
          {industryPlaces.length ? (
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                {sicLabel(sic)} · median weekly gross by place of work · {sheetWord} employee jobs · {industryLabel} · £ a week
              </h3>
              <div className={s.geoSplit}>
                <RegionMap
                  data={geoMapData}
                  selected={selectedRegion}
                  onSelect={toggleRegion}
                  label={`Median weekly gross pay in ${sicLabel(sic)} by English region, place of work`}
                  legendFormat={fmtGbpWeek}
                  legendUnit="£ a week"
                />
                <RankBars
                  key={`ashe-industry-places-${geoSheet}-${sic}`}
                  label={`Median weekly gross in ${sicLabel(sic)} by place, workplace`}
                  rows={industryPlaces.map((r) => ({
                    id: r.code,
                    label: r.label,
                    v: r.v,
                    active: selectedRegion === r.code,
                  }))}
                  reference={ukIndustryMedian != null ? { label: "UK", v: ukIndustryMedian } : undefined}
                  format={fmtGbpWeek}
                  onSelect={toggleRegion}
                />
              </div>
            </section>
          ) : null}
          {placeIndustries.length ? (
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                {placeLabel} · median weekly gross by industry · {sheetWord} employee jobs · place of work · {industryLabel} · £ a week
              </h3>
              <RankBars
                key={`ashe-place-industries-${geoSheet}-${selectedRegion ?? "uk"}`}
                label={`Median weekly gross by industry in ${placeLabel}, workplace`}
                rows={placeIndustries.map((r) => ({
                  id: r.sic,
                  label: r.label,
                  v: r.v,
                  active: r.sic === sic,
                }))}
                reference={
                  selectedRegion
                    ? (() => {
                        const v = regionalRegions.find((r) => r.code === selectedRegion)?.v ?? industryPlaces.find((r) => r.code === selectedRegion)?.v;
                        return v != null ? { label: "All industries", v } : undefined;
                      })()
                    : ukWorkplaceMedian != null
                      ? { label: "All industries", v: ukWorkplaceMedian }
                      : undefined
                }
                format={fmtGbpWeek}
                onSelect={(id) => sync({ sic: id })}
              />
            </section>
          ) : null}
        </div>
      );
    } else {
      foot = (
        <FigureRecord
          source={economySource(
            ECONOMY_SOURCE.asheRegional,
            "United Kingdom · workplace",
            `Annual · ${geoLatestLabel}${geoPriorLabel ? ` and ${geoPriorLabel}` : ""}`,
          )}
          definition={[
            "Median weekly gross pay for employee jobs by place of work, from the Annual Survey of Hours and Earnings. Where people work, not where they live.",
            "This is pay per job before tax, not average weekly earnings, household income or take-home pay.",
          ]}
          method={[
            "Table 7, weekly pay gross. Sheets: all employee jobs and full-time. The map draws English regions; nations sit in the ranked list.",
            "Cash pounds, not real terms. The latest April is provisional; the earlier April is the revised edition.",
            "Local-authority rows are loaded for later maps; this view shows regions and nations.",
          ]}
        />
      );
      const changeRows = [...regionalRegions, ...regionalNations]
        .map((r) => {
          const prior = [...priorRegions, ...priorNations].find((p) => p.code === r.code);
          return prior ? { id: r.code, label: r.label, from: prior.v, to: r.v } : null;
        })
        .filter((r): r is NonNullable<typeof r> => r != null)
        .sort((a, b) => b.to - a.to);
      body =
        !regionalRegions.length && !regionalNations.length ? (
          <EmptyStage label="Not available">
            Regional ASHE workplace medians are not loaded from the Exchange API right now.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            {regionalRegions.length > 0 ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  English regions · median weekly gross · {sheetWord} employee jobs · place of work · {geoLatestLabel} · £ a week
                </h3>
                <div className={s.geoSplit}>
                  <RegionMap
                    data={geoMapData}
                    selected={selectedRegion}
                    onSelect={toggleRegion}
                    label="Median weekly gross pay by English region, place of work"
                    legendFormat={fmtGbpWeek}
                    legendUnit="£ a week"
                  />
                  <RankBars
                    key={`ashe-geo-regions-${geoSheet}`}
                    label="Median weekly gross by English region, workplace"
                    rows={regionalRegions.map((r) => ({
                      id: r.code,
                      label: r.label,
                      v: r.v,
                      active: selectedRegion === r.code,
                    }))}
                    reference={ukWorkplaceMedian != null ? { label: "UK median", v: ukWorkplaceMedian } : undefined}
                    format={fmtGbpWeek}
                    onSelect={toggleRegion}
                  />
                </div>
              </section>
            ) : null}
            {changeRows.length ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Regions and nations · {geoPriorLabel} to {geoLatestLabel} · {sheetWord} employee jobs · place of work · £ a week
                </h3>
                <ChangeRows
                  key={`ashe-geo-change-${geoSheet}`}
                  label="Median weekly gross pay by place, earlier edition to latest"
                  rows={changeRows}
                  reference={
                    ukWorkplaceMedian != null && priorUkMedian != null
                      ? { label: "United Kingdom", from: priorUkMedian, to: ukWorkplaceMedian }
                      : undefined
                  }
                  fromLabel={geoPriorLabel}
                  toLabel={geoLatestLabel}
                  format={fmtGbpWeek}
                />
              </section>
            ) : regionalNations.length > 0 ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Nations · median weekly gross · {sheetWord} employee jobs · place of work · {geoLatestLabel} · £ a week
                </h3>
                <RankBars
                  key={`ashe-geo-nations-${geoSheet}`}
                  label="Median weekly gross by nation, workplace"
                  rows={[...regionalNations].sort((a, b) => b.v - a.v).map((r) => ({ id: r.code, label: r.label, v: r.v }))}
                  reference={ukWorkplaceMedian != null ? { label: "UK median", v: ukWorkplaceMedian } : undefined}
                  format={fmtGbpWeek}
                />
              </section>
            ) : null}
          </div>
        );
    }
  } else if (view === "vs-prices") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.payVsPrices,
          "Great Britain / United Kingdom",
          economyPeriod(
            "monthly",
            latestCash ? fmtT(monthlyPoints([latestCash])[0]!.t) : null,
          ),
          "earnings GB; prices UK",
        )}
        definition={[
          "Average weekly earnings in cash (regular pay, seasonally adjusted) set against consumer prices (CPIH). Where pay has risen faster than prices since the chosen year, a week's pay buys more; where prices have risen faster, it buys less.",
          "This is average pay per employee across the whole economy, not median pay, household income or take-home pay. Real pay is the same series after CPIH, in 2015 prices, as ONS publishes it.",
        ]}
        method={[
          "Both lines are set to 100 in January of the chosen year, so the chart shows growth, not pound levels.",
          "Growth panel: change on the same month a year earlier, for cash pay and for the CPIH all-items rate.",
          "Earnings cover Great Britain; prices cover the United Kingdom. Final months only.",
        ]}
      />
    );
    if (!pair.a.length || !pair.b.length) {
      body = (
        <EmptyStage label="Not available">
          Need Great Britain cash earnings and UK CPIH from the Exchange API for this comparison.
        </EmptyStage>
      );
    } else {
      const first = pair.a[0]!;
      const last = pair.a[pair.a.length - 1]!;
      const gFirst = growthCash[0] ?? first;
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Cash pay and prices since {fromYear} · {fmtT(first.t)}–{fmtT(last.t)} · {fmtT(first.t)} = 100
            </h3>
            <TimeChart
              key={`pay-vs-prices-${fromYear}`}
              label="Cash average weekly earnings (Great Britain) against CPIH (United Kingdom), both rebased"
              series={[
                { id: "nominal-earnings", label: "Cash pay · Great Britain", points: pair.a },
                { id: "cpih-index", label: "Prices (CPIH) · United Kingdom", points: pair.b },
              ]}
              cadence="monthly"
              kind="line"
              zero={false}
              showTable={false}
              format={fmtIndex}
              inspect={(tt) => {
                const a = pair.a.find((p) => Math.abs(p.t - tt) < 1 / 24);
                const b = pair.b.find((p) => Math.abs(p.t - tt) < 1 / 24);
                if (!a || !b) return [];
                const gap = (a.v / b.v - 1) * 100;
                return [
                  {
                    label: `A week's pay buys, against ${fromYear}`,
                    value: fmtPct1(gap),
                  },
                ];
              }}
            />
          </section>
          {growthCash.length && growthPrices.length ? (
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Pay growth against inflation · change on a year earlier · {fmtT(gFirst.t)}–{fmtT(last.t)} · %
              </h3>
              <TimeChart
                key={`pay-growth-${fromYear}`}
                label="Twelve-month change in cash average weekly earnings against the CPIH annual rate"
                series={[
                  { id: "nominal-earnings-growth", label: "Cash pay growth · Great Britain", points: growthCash },
                  { id: "cpih-inflation", label: "Inflation (CPIH) · United Kingdom", points: growthPrices },
                ]}
                cadence="monthly"
                kind="line"
                zero
                showTable={false}
                format={fmtPct1}
                axisFormat={(v) => `${v.toFixed(0)}%`}
              />
            </section>
          ) : null}
        </div>
      );
    }
  } else if (view === "data") {
    foot = (
      <FigureRecord
        source={economySource(ECONOMY_SOURCE.earnings, "Great Britain", economyPeriod("monthly"))}
        definition="Observation tables for Ready earnings series on this domain."
        method={[
          "The Series menu shows one Ready table in full. Real and cash average weekly earnings use final months only.",
          "Annual Survey of Hours and Earnings, weekly gross pay: ladder percentiles (UK), nations and regions by place of work, industries (UK) and industry by place. The latest April is provisional; the earlier April is revised.",
          "Local-authority rows are on the Geography of pay tab under Local areas.",
        ]}
      />
    );
    body = <WagesData pack={pack} seriesId={activeDataSeries} />;
  } else {
    foot = null;
    body = <EmptyStage label="Not available">Unknown wages view.</EmptyStage>;
  }

  const followViews = new Set(["vs-prices", "value", "ladder", "geography", "data"]);

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      <FigureStrip figures={figures} />
      <ControlRow label="Wages controls">
        {view === "vs-prices" && fromOptions.length ? (
          <MenuControl
            label="From"
            value={String(fromYear)}
            options={fromOptions}
            onChange={(id) => sync({ from: id })}
          />
        ) : null}
        {view === "value" && yearOptions.length ? (
          <>
            <MenuControl
              label="Compare year"
              value={String(compareYear)}
              options={yearOptions}
              onChange={(id) => sync({ year: id, to: "" })}
            />
            <MenuControl
              label="Against"
              value={toYear != null ? String(toYear) : ""}
              options={toOptions}
              onChange={(id) => sync({ to: id })}
            />
          </>
        ) : null}
        {view === "ladder" ? (
          <MenuControl
            label="Coverage"
            value={asheSheet}
            options={ASHE_SHEET_OPTIONS}
            onChange={(id) => sync({ sheet: id as AsheSheet })}
          />
        ) : null}
        {view === "geography" ? (
          <>
            <MenuControl
              label="Lens"
              value={lens}
              options={GEO_LENS_OPTIONS}
              onChange={(id) => sync({ lens: id as GeoLens })}
            />
            {lens === "industry" && sicOptions.length ? (
              <MenuControl
                label="Industry"
                value={sic}
                options={sicOptions}
                onChange={(id) => sync({ sic: id })}
              />
            ) : null}
            {lens === "local" ? (
              <SearchControl
                label="Find a place"
                value={placeSearch}
                placeholder={localPlace ? localPlace.label : "Local authority"}
                suggestions={localSuggestions}
                onChange={(v) => {
                  setPlaceSearch(v);
                  const hit = localPoints.find((p) => p.label.toLowerCase() === v.trim().toLowerCase());
                  if (hit) {
                    sync({ place: hit.code });
                    setPlaceSearch("");
                  }
                }}
              />
            ) : null}
            <MenuControl
              label="Coverage"
              value={geoSheet}
              options={GEO_SHEET_OPTIONS}
              onChange={(id) => sync({ sheet: id as AsheSheet })}
            />
          </>
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
              view: DEFAULT_VIEW,
              year: String(DEFAULT_COMPARE_YEAR),
              to: "",
              from: "",
              sheet: "All",
              lens: "place",
              sic: DEFAULT_SIC,
              place: "",
              series: "",
            });
          }}
        />
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        size={view === "geography" ? "wide" : "normal"}
        follow={
          followViews.has(view) ? (
            <EconomyStageFollow
              domain="wages"
              view={view}
              label={`Wages · ${viewLabel(view)}`}
            />
          ) : undefined
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

function wagesDataSeriesOptions(pack: WagesPack): PrintOption<string>[] {
  const opts: PrintOption<string>[] = [];
  if (finalObs(pack.real?.observations ?? []).length) {
    opts.push({ value: "real-earnings", label: "Real AWE" });
  }
  if (finalObs(pack.nominal?.observations ?? []).length) {
    opts.push({ value: "nominal-earnings", label: "Cash AWE" });
  }
  const asheRows = pack.ashe?.observations ?? [];
  for (const sheet of ALL_SHEETS) {
    const eds = asheEditions(asheRows);
    if (eds.some((ed) => asheLadderRanks(asheRows, sheet, true, ed).length)) {
      opts.push({
        value: `ladder-${sheet}`,
        label: `Pay ladder · ${asheSheetLabel(sheet)}`,
      });
    }
  }
  const geoRows = pack.asheRegional?.observations ?? [];
  for (const sheet of ["All", "Full-Time"] as AsheSheet[]) {
    if (asheRegionalPoints(geoRows, sheet, "region").length) {
      opts.push({
        value: `geo-${sheet}`,
        label: `Nations and regions · ${asheSheetLabel(sheet)}`,
      });
    }
  }
  const indRows = pack.asheIndustry?.observations ?? [];
  if (asheIndustryPoints(indRows, "All").length) {
    opts.push({ value: "industries", label: "Industries · UK" });
  }
  const regIndRows = pack.asheRegionIndustry?.observations ?? [];
  if (asheEditions(regIndRows).length && asheSections(regIndRows).length) {
    opts.push({ value: "industry-by-place", label: "Industry by place" });
  }
  return opts;
}

function WagesData({ pack, seriesId }: { pack: WagesPack; seriesId: string }) {
  const aweTables = [
    { id: "real-earnings", title: "Real AWE · £ per week · 2015 prices · Great Britain", pack: pack.real },
    { id: "nominal-earnings", title: "Cash AWE · £ per week · Great Britain", pack: pack.nominal },
  ];
  const asheRows = pack.ashe?.observations ?? [];
  const geoRows = pack.asheRegional?.observations ?? [];
  const indRows = pack.asheIndustry?.observations ?? [];
  const regIndRows = pack.asheRegionIndustry?.observations ?? [];
  const asheEds = asheEditions(asheRows);
  const geoEds = asheEditions(geoRows);
  const indEds = asheEditions(indRows);
  const regIndLatest = asheEditions(regIndRows).at(-1) ?? null;
  const edLabel = (rows: Observation[], ed: string) => asheEditionLabel(rows, ed);
  const cell = (v: number | null | undefined) => (v == null ? "—" : fmtGbpWeek(v));

  const anyAwe = aweTables.some((x) => finalObs(x.pack?.observations ?? []).length > 0);
  const hasLadder = ALL_SHEETS.some((sheet) =>
    asheEds.some((ed) => asheLadderRanks(asheRows, sheet, true, ed).length),
  );
  const hasGeo = (["All", "Full-Time"] as AsheSheet[]).some(
    (sheet) => asheRegionalPoints(geoRows, sheet, "region").length > 0,
  );
  const hasIndustry = asheIndustryPoints(indRows, "All").length > 0;
  const hasRegInd = !!regIndLatest && asheSections(regIndRows).length > 0;
  if (!anyAwe && !hasLadder && !hasGeo && !hasIndustry && !hasRegInd) {
    return (
      <EmptyStage label="In preparation">
        Earnings series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const awe = aweTables.find((x) => x.id === seriesId);
  if (awe) {
    const rows = finalObs(awe.pack?.observations ?? []).slice().reverse();
    if (!rows.length) {
      return <EmptyStage label="Not available">This series is not available right now.</EmptyStage>;
    }
    return (
      <div className={s.stack}>
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>{awe.title}</p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Value</th>
                  <th scope="col">Geography</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${awe.id}-${r.period_start}`}>
                    <td>{fmtT(monthlyPoints([r])[0]!.t)}</td>
                    <td>{fmtGbpWeek(r.value as number)}</td>
                    <td>Great Britain</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (seriesId.startsWith("ladder-")) {
    const sheet = asAsheSheet(seriesId.slice("ladder-".length));
    const byEd = asheEds.map((ed) => asheLadderRanks(asheRows, sheet, true, ed));
    const ids = byEd[byEd.length - 1]?.map((r) => ({ id: r.id, label: r.label })) ?? [];
    if (!ids.length) {
      return <EmptyStage label="Not available">This series is not available right now.</EmptyStage>;
    }
    return (
      <div className={s.stack}>
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Pay ladder · weekly gross · {asheSheetLabel(sheet)} employee jobs · UK · £ a week
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Statistic</th>
                  {asheEds.map((ed) => (
                    <th key={ed} scope="col">{edLabel(asheRows, ed)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ids.map((row) => (
                  <tr key={`ladder-${sheet}-${row.id}`}>
                    <td>{row.label}</td>
                    {byEd.map((ranks, i) => (
                      <td key={asheEds[i]}>{cell(ranks.find((r) => r.id === row.id)?.v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (seriesId.startsWith("geo-")) {
    const sheet = asAsheSheet(seriesId.slice("geo-".length));
    const byEd = geoEds.map((ed) => [
      ...asheRegionalPoints(geoRows, sheet, "nation", ed).filter((p) =>
        (NATION_CODES as readonly string[]).includes(p.code),
      ),
      ...asheRegionalPoints(geoRows, sheet, "region", ed),
    ]);
    const places = byEd[byEd.length - 1] ?? [];
    if (!places.length) {
      return <EmptyStage label="Not available">This series is not available right now.</EmptyStage>;
    }
    return (
      <div className={s.stack}>
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Nations and regions · median weekly gross · place of work · {asheSheetLabel(sheet)} employee
            jobs · £ a week
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Place</th>
                  {geoEds.map((ed) => (
                    <th key={ed} scope="col">{edLabel(geoRows, ed)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {places.map((p) => (
                  <tr key={`geo-${sheet}-${p.code}`}>
                    <td>{p.label}</td>
                    {byEd.map((pts, i) => (
                      <td key={geoEds[i]}>{cell(pts.find((q) => q.code === p.code)?.v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (seriesId === "industries") {
    const industryTable = (["All", "Full-Time"] as AsheSheet[])
      .flatMap((sheet) => indEds.map((ed) => ({ sheet, ed, pts: asheIndustryPoints(indRows, sheet, ed) })))
      .filter((c) => c.pts.length);
    const industryIds = asheSections(indRows);
    if (!industryTable.length) {
      return <EmptyStage label="Not available">This series is not available right now.</EmptyStage>;
    }
    return (
      <div className={s.stack}>
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>Industries · median weekly gross · UK · £ a week</p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Industry</th>
                  {industryTable.map((c) => (
                    <th key={`${c.sheet}-${c.ed}`} scope="col">
                      {asheSheetLabel(c.sheet)} · {edLabel(indRows, c.ed)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {industryIds.map((sic) => (
                  <tr key={`ind-${sic}`}>
                    <td>{sicLabel(sic)}</td>
                    {industryTable.map((c) => (
                      <td key={`${c.sheet}-${c.ed}-${sic}`}>
                        {cell(c.pts.find((p) => p.sic === sic)?.v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (seriesId === "industry-by-place") {
    const regIndPlaces = regIndLatest
      ? [...new Map(
          regIndRows
            .filter((r) => r.period_start === regIndLatest)
            .map((r) => [r.geography_code, r.geography_label] as const),
        ).entries()].sort((a, b) => a[1].localeCompare(b[1]))
      : [];
    const regIndSections = asheSections(regIndRows);
    const regIndValue = (code: string, sic: string) =>
      asheRegionIndustryByIndustry(regIndRows, "All", code, regIndLatest).find((p) => p.sic === sic)?.v ??
      null;
    if (!regIndPlaces.length) {
      return <EmptyStage label="Not available">This series is not available right now.</EmptyStage>;
    }
    return (
      <div className={s.stack}>
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Industry by place · median weekly gross · all employee jobs · place of work ·{" "}
            {asheEditionLabel(regIndRows, regIndLatest)} · £ a week
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Industry</th>
                  {regIndPlaces.map(([code, label]) => (
                    <th key={code} scope="col">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regIndSections.map((sic) => (
                  <tr key={`regind-${sic}`}>
                    <td>{sicLabel(sic)}</td>
                    {regIndPlaces.map(([code]) => (
                      <td key={`${code}-${sic}`}>{cell(regIndValue(code, sic))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return <EmptyStage label="Not available">This series is not available right now.</EmptyStage>;
}

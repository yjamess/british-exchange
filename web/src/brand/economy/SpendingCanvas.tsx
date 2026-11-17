"use client";

/**
 * Economy Domain 07 — Public Spending & Services.
 * Flagship: What the state spends — ONS EBFT Total Managed Expenditure.
 * Where spending goes — HMT TES / COFOG (Table 5.4).
 * DEL and AME — HMT Table 1.1 control totals.
 * Real terms — Tables 1.2 / 4.3 at 2025-26 prices (not monthly EBFT).
 * Services — TES vs accounting adjustments vs table TME (nominal bridge).
 * Long run — Table 4.2 £bn span on Where spending goes.
 * ESA — ONS Table 11 general government (calendar year; not TES).
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { fmtT } from "../data";
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
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import { finalObs, fmtFlowBn, periodPoints, rolling12mSum } from "./debt-model";
import {
  calendarYearLabel,
  delAmeFinancialYears,
  delAmeLatestFinalYear,
  delAmeRanks,
  delAmeStack,
  esaCalendarYears,
  esaFunctionRanks,
  esaFunctionStack,
  esaLatestYear,
  fmtSpendingBn,
  fmtSpendingShare,
  FUNCTION_SPAN_OPTIONS,
  REAL_INSTRUMENT_OPTIONS,
  SPENDING_MEASURE_OPTIONS,
  tesFinancialYears,
  tesFunctionRanks,
  tesFunctionStack,
  tesLatestFinalYear,
  tesServicesBridge,
  type SpendingMeasure,
} from "./spending-function-model";
import type { SpendingPack } from "./types";

const VIEWS: ExplorerView[] = [
  { id: "spends", label: "What the state spends" },
  { id: "function", label: "Where spending goes" },
  { id: "delame", label: "DEL and AME" },
  { id: "real", label: "Real terms" },
  { id: "services", label: "Services and the total" },
  { id: "esa", label: "ESA functions" },
  { id: "data", label: "Data" },
];

type RealInstrument = "delame" | "function";
type FunctionSpan = "recent" | "long";

function asRealInstrument(raw: string | null): RealInstrument {
  return raw === "function" ? "function" : "delame";
}

function asFunctionSpan(raw: string | null): FunctionSpan {
  return raw === "long" ? "long" : "recent";
}

function fyLabel(tt: number): string {
  const y = Math.floor(tt);
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

function asView(raw: string | null): string {
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "spends";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Spending";
}

function labelMonth(iso: string): string {
  return fmtT(Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12, "monthly");
}

function asMeasure(raw: string | null): SpendingMeasure {
  return raw === "share" ? "share" : "absolute";
}

export function SpendingCanvas({ pack }: { pack: SpendingPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [measure, setMeasure] = useState<SpendingMeasure>(() => asMeasure(searchParams.get("measure")));
  const [fy, setFy] = useState<string | null>(() => searchParams.get("fy"));
  const [realInst, setRealInst] = useState<RealInstrument>(() =>
    asRealInstrument(searchParams.get("ri")),
  );
  const [span, setSpan] = useState<FunctionSpan>(() => asFunctionSpan(searchParams.get("span")));

  const sync = useCallback(
    (next: {
      view?: string;
      measure?: SpendingMeasure;
      fy?: string | null;
      ri?: RealInstrument;
      span?: FunctionSpan;
    }) => {
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const year = next.fy !== undefined ? next.fy : fy;
      const ri = next.ri ?? realInst;
      const sp = next.span ?? span;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "spending");
      u.set("view", v);
      if (
        v === "function" ||
        v === "delame" ||
        v === "real" ||
        v === "services" ||
        v === "esa"
      ) {
        if (v !== "services") u.set("measure", m);
        else u.delete("measure");
        if (year) u.set("fy", year);
        else u.delete("fy");
        if (v === "real") u.set("ri", ri);
        else u.delete("ri");
        if (v === "function") u.set("span", sp);
        else u.delete("span");
      } else {
        u.delete("measure");
        u.delete("fy");
        u.delete("ri");
        u.delete("span");
      }
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
      if (next.fy !== undefined) setFy(next.fy);
      if (next.ri != null) setRealInst(next.ri);
      if (next.span != null) setSpan(next.span);
    },
    [pathname, view, measure, fy, realInst, span],
  );

  const rows = pack.totalManagedExpenditure?.observations ?? [];
  const tesRows = pack.tesByFunction?.observations ?? [];
  const tesLongRows = pack.tesByFunctionLongRun?.observations ?? [];
  const delRows = pack.tmeDelAme?.observations ?? [];
  const delRealRows = pack.tmeDelAmeReal?.observations ?? [];
  const tesRealRows = pack.tesByFunctionReal?.observations ?? [];
  const esaRows = pack.esaGgByFunction?.observations ?? [];

  const monthPts = useMemo(() => periodPoints(rows), [rows]);
  const rollPts = useMemo(() => rolling12mSum(rows), [rows]);
  const latest = finalObs(rows).at(-1);
  const latestRoll = rollPts.at(-1);
  const yoy =
    latest && finalObs(rows).length >= 13
      ? (() => {
          const ok = finalObs(rows);
          const now = ok[ok.length - 1]!;
          const prior = ok[ok.length - 13];
          if (!prior?.value || !now.value) return null;
          return ((now.value as number) / (prior.value as number) - 1) * 100;
        })()
      : null;

  const functionLong = span === "long" && tesLongRows.length > 0;
  const functionRows = functionLong ? tesLongRows : tesRows;
  const functionUnit = functionLong ? "billion" : "million";

  const tesYears = useMemo(() => tesFinancialYears(tesRows), [tesRows]);
  const tesLongYears = useMemo(() => tesFinancialYears(tesLongRows), [tesLongRows]);
  const functionYears = functionLong ? tesLongYears : tesYears;
  const delYears = useMemo(() => delAmeFinancialYears(delRows), [delRows]);
  const tesRealYears = useMemo(() => tesFinancialYears(tesRealRows), [tesRealRows]);
  const delRealYears = useMemo(() => delAmeFinancialYears(delRealRows), [delRealRows]);
  const esaYears = useMemo(() => esaCalendarYears(esaRows), [esaRows]);
  const tesFy =
    fy && functionYears.includes(fy)
      ? fy
      : (tesLatestFinalYear(functionRows) ?? functionYears.at(-1) ?? null);
  const servicesFy =
    fy && tesYears.includes(fy) ? fy : (tesLatestFinalYear(tesRows) ?? tesYears.at(-1) ?? null);
  const delFy =
    fy && delYears.includes(fy) ? fy : (delAmeLatestFinalYear(delRows) ?? delYears.at(-1) ?? null);
  const tesRealFy =
    fy && tesRealYears.includes(fy)
      ? fy
      : (tesLatestFinalYear(tesRealRows) ?? tesRealYears.at(-1) ?? null);
  const delRealFy =
    fy && delRealYears.includes(fy)
      ? fy
      : (delAmeLatestFinalYear(delRealRows) ?? delRealYears.at(-1) ?? null);
  const esaYear =
    fy && esaYears.includes(fy) ? fy : (esaLatestYear(esaRows) ?? esaYears.at(-1) ?? null);

  const tesLatest = useMemo(
    () => (tesFy ? tesFunctionRanks(functionRows, tesFy, measure, functionUnit) : null),
    [functionRows, tesFy, measure, functionUnit],
  );
  const tesStack = useMemo(
    () => tesFunctionStack(functionRows, measure, functionUnit),
    [functionRows, measure, functionUnit],
  );
  const delLatest = useMemo(
    () => (delFy ? delAmeRanks(delRows, delFy, measure) : null),
    [delRows, delFy, measure],
  );
  const delStack = useMemo(() => delAmeStack(delRows, measure), [delRows, measure]);
  const tesRealLatest = useMemo(
    () => (tesRealFy ? tesFunctionRanks(tesRealRows, tesRealFy, measure, "billion") : null),
    [tesRealRows, tesRealFy, measure],
  );
  const tesRealStack = useMemo(
    () => tesFunctionStack(tesRealRows, measure, "billion"),
    [tesRealRows, measure],
  );
  const delRealLatest = useMemo(
    () => (delRealFy ? delAmeRanks(delRealRows, delRealFy, measure) : null),
    [delRealRows, delRealFy, measure],
  );
  const delRealStack = useMemo(() => delAmeStack(delRealRows, measure), [delRealRows, measure]);
  const servicesBridge = useMemo(
    () => (servicesFy ? tesServicesBridge(tesRows, servicesFy) : null),
    [tesRows, servicesFy],
  );
  const esaLatest = useMemo(
    () => (esaYear ? esaFunctionRanks(esaRows, esaYear, measure) : null),
    [esaRows, esaYear, measure],
  );
  const esaStack = useMemo(() => esaFunctionStack(esaRows, measure), [esaRows, measure]);

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "spends") {
      return [
        {
          label: "Latest month",
          value: latest?.value != null ? fmtFlowBn(latest.value as number) : "—",
          note: latest ? labelMonth(latest.period_start) : "Total managed expenditure",
        },
        {
          label: "12-month sum",
          value: latestRoll != null ? fmtFlowBn(latestRoll.v) : "—",
          note: "Worked out here from monthly figures",
        },
        {
          label: "Change on a year",
          value:
            yoy != null ? `${yoy >= 0 ? "+" : "−"}${Math.abs(yoy).toFixed(1)}%` : "—",
          note: "Same month a year earlier",
        },
      ];
    }
    if (view === "function" && tesLatest && tesFy) {
      const top = tesLatest.ranks[0];
      const fmtAbs = (rawPublished: number, chartBn: number) =>
        functionLong ? fmtSpendingBn(chartBn) : fmtFlowBn(rawPublished);
      return [
        {
          label: "Services total",
          value: functionLong ? fmtSpendingBn(tesLatest.tesM) : fmtFlowBn(tesLatest.tesM),
          note: `${tesFy} · ${functionLong ? "Table 4.2 · £ billion" : "total expenditure on services"}`,
        },
        {
          label: top ? top.label : "Largest function",
          value:
            measure === "share"
              ? fmtSpendingShare(top?.v ?? NaN)
              : top
                ? fmtAbs(top.v * (functionLong ? 1 : 1000), top.v)
                : "—",
          note: measure === "share" ? "Share of services total" : "Largest function that year",
        },
        {
          label: "To managed expenditure",
          value: functionLong
            ? fmtSpendingBn(tesLatest.adjustmentsM)
            : fmtFlowBn(tesLatest.adjustmentsM),
          note: "Accounting adjustments bridge (not a function)",
        },
      ];
    }
    if (view === "delame" && delLatest && delFy) {
      const del = delLatest.ranks.find((r) => r.id === "total-del");
      return [
        {
          label: "This table’s total",
          value: fmtFlowBn(delLatest.tableTmeM),
          note: `${delFy} · not the monthly managed-expenditure line`,
        },
        {
          label: "Total DEL",
          value:
            measure === "share"
              ? fmtSpendingShare(del?.v ?? NaN)
              : del
                ? fmtFlowBn(del.v * 1000)
                : "—",
          note: "Published Total DEL row",
        },
        {
          label: "Control totals",
          value: String(delLatest.ranks.length),
          note: "Total DEL · departmental AME · other AME",
        },
      ];
    }
    if (view === "real" && realInst === "delame" && delRealLatest && delRealFy) {
      const del = delRealLatest.ranks.find((r) => r.id === "total-del");
      return [
        {
          label: "Real table total",
          value: fmtFlowBn(delRealLatest.tableTmeM),
          note: `${delRealFy} · 2025-26 prices`,
        },
        {
          label: "Total DEL",
          value:
            measure === "share"
              ? fmtSpendingShare(del?.v ?? NaN)
              : del
                ? fmtFlowBn(del.v * 1000)
                : "—",
          note: "Real Total DEL",
        },
        {
          label: "Price base",
          value: "2025-26",
          note: "ONS GDP deflators · not monthly managed expenditure",
        },
      ];
    }
    if (view === "real" && realInst === "function" && tesRealLatest && tesRealFy) {
      const top = tesRealLatest.ranks[0];
      return [
        {
          label: "Real services total",
          value: fmtSpendingBn(tesRealLatest.tesM),
          note: `${tesRealFy} · 2025-26 prices · £ billion table`,
        },
        {
          label: top ? top.label : "Largest function",
          value:
            measure === "share"
              ? fmtSpendingShare(top?.v ?? NaN)
              : top
                ? fmtSpendingBn(top.v)
                : "—",
          note: "Largest function that year",
        },
        {
          label: "Price base",
          value: "2025-26",
          note: "ONS GDP deflators · not monthly managed expenditure",
        },
      ];
    }
    if (view === "services" && servicesBridge && servicesFy) {
      return [
        {
          label: "Services",
          value: fmtFlowBn(servicesBridge.tesM),
          note: `${servicesFy} · expenditure on services`,
        },
        {
          label: "Adjustments",
          value: fmtFlowBn(servicesBridge.adjustmentsM),
          note: "Bridge to this table’s managed expenditure",
        },
        {
          label: "Table total",
          value: fmtFlowBn(servicesBridge.tableTmeM),
          note: "Not the monthly ONS managed-expenditure line",
        },
      ];
    }
    if (view === "esa" && esaLatest && esaYear) {
      const top = esaLatest.ranks[0];
      return [
        {
          label: "General government",
          value: fmtFlowBn(esaLatest.totalM),
          note: `${esaYear} calendar year · ESA total expenditure`,
        },
        {
          label: top ? top.label : "Largest function",
          value:
            measure === "share"
              ? fmtSpendingShare(top?.v ?? NaN)
              : top
                ? fmtFlowBn(top.v * 1000)
                : "—",
          note: "Not TES · not public-sector managed expenditure",
        },
        {
          label: "Years",
          value: String(esaYears.length),
          note: "Calendar years · United Kingdom general government",
        },
      ];
    }
    return [];
  }, [
    view,
    latest,
    latestRoll,
    yoy,
    tesLatest,
    tesFy,
    functionLong,
    delLatest,
    delFy,
    delRealLatest,
    delRealFy,
    tesRealLatest,
    tesRealFy,
    servicesBridge,
    servicesFy,
    esaLatest,
    esaYear,
    esaYears.length,
    measure,
    realInst,
  ]);

  let foot: React.ReactNode;
  let body: React.ReactNode;
  const share = measure === "share";
  const fmt = share ? fmtSpendingShare : fmtSpendingBn;

  if (view === "spends") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.totalManagedExpenditure,
          "United Kingdom",
          economyPeriod("monthly", latest ? labelMonth(latest.period_start) : null),
        )}
        definition={[
          "Total managed expenditure — what the public sector spends each month, in current pounds.",
          "This is the Office for National Statistics National Accounts aggregate, not a departmental cash outturn table.",
        ]}
        method={[
          "Figures are seasonally unadjusted. Months swing with the spending calendar. The 12-month sum is worked out here to show the trend.",
          "These are month levels, not financial-year-to-date totals. The latest month in each release is provisional and is left off the chart.",
          "Treasury budgeting presents managed expenditure as DEL plus AME — those control totals are on the DEL and AME tab from a separate HMT table.",
          "This total is not the same as services people receive (Treasury TES / COFOG on Where spending goes). Do not treat receipts minus spending as borrowing on this page.",
        ]}
      />
    );
    body = !monthPts.length ? (
      <EmptyStage label="Not available">
        Total managed expenditure is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Total managed expenditure · month and 12-month sum ·{" "}
            {fmtT(monthPts[0]!.t)}–{fmtT(monthPts[monthPts.length - 1]!.t)} · £bn
          </h3>
          <TimeChart
            key="tme-spends"
            label="Public-sector total managed expenditure"
            series={[
              ...(rollPts.length
                ? [{ id: "tme-12m", label: "12-month sum", points: rollPts }]
                : []),
              {
                id: "total-managed-expenditure",
                label: "Month",
                points: monthPts,
                role: "reference" as const,
              },
            ]}
            cadence="monthly"
            kind="line"
            zero
            showTable={false}
            format={fmtFlowBn}
            periodLabel={(tt) => fmtT(tt, "monthly")}
          />
        </section>
      </div>
    );
  } else if (view === "function") {
    foot = (
      <FigureRecord
        source={economySource(
          functionLong ? ECONOMY_SOURCE.tesByFunctionLongRun : ECONOMY_SOURCE.tesByFunction,
          "United Kingdom public sector",
          economyPeriod("annual", tesFy),
        )}
        definition={[
          "Where public-sector spending on services goes, by United Nations function of government — health, education, social protection and others.",
          "This is Treasury Total Expenditure on Services (TES / COFOG), not a split of the monthly managed-expenditure line on What the state spends.",
        ]}
        method={
          functionLong
            ? [
                "HM Treasury Public Spending Statistics Table 4.2, £ billion, financial year from 2003-04. Published function totals (current and capital already summed).",
                "Rounding can leave gaps of about £0.1–0.2 billion versus the published services total. The published total is used. EU transactions sit outside the ten function bars.",
                "Long run is a companion to the recent £ million table — not a rescaled monthly managed-expenditure series.",
              ]
            : [
                "HM Treasury Public Spending Statistics Table 5.4, £ million, financial year. Each function is current plus capital. Charts use the published services total as the share denominator.",
                "Level-1 functions can miss the published services total by up to about £2 million; the published total is used. EU transactions sit inside services but outside the ten functions and are not drawn as a bar.",
                "Accounting adjustments bridge services to this table’s managed-expenditure total — they are not a function. That table total is not the same as the monthly ONS series.",
                "2025-26 is a first outturn estimate. Do not treat receipts minus spending as borrowing on this page.",
              ]
        }
      />
    );
    body = !tesLatest || !tesStack.length || !tesFy ? (
      <EmptyStage label="Not available">
        Function-of-government series are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Expenditure on services by function · {tesFy} ·{" "}
            {share ? "share of services total" : "£bn"}
            {functionLong ? " · long run" : ""}
          </h3>
          <RankBars
            key={`tes-ranks-${span}-${tesFy}-${measure}`}
            label="TES by COFOG function"
            rows={tesLatest.ranks.map((r) => ({
              id: r.id,
              label: r.label,
              v: r.v,
            }))}
            format={fmt}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {share ? "Share of services total · " : "Each function · "}
            {functionYears[0]}–{functionYears[functionYears.length - 1]} · {share ? "%" : "£bn"}
          </h3>
          <TimeChart
            key={`tes-stack-${span}-${measure}`}
            label="TES by function over time"
            series={tesStack}
            cadence="annual"
            kind={share ? "stack" : "line"}
            zero
            showTable={false}
            format={fmt}
            periodLabel={fyLabel}
          />
        </section>
      </div>
    );
  } else if (view === "delame") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.tmeDelAme,
          "United Kingdom",
          economyPeriod("annual", delFy),
        )}
        definition={[
          "How Treasury presents managed expenditure in budgeting — Total DEL, departmental AME, and other AME.",
          "These three published control totals add to this table’s managed-expenditure total. That total is not the monthly ONS managed-expenditure line.",
        ]}
        method={[
          "HM Treasury Public Spending Statistics Table 1.1, £ million, financial year. Other AME stays in the chart — a two-bar drawing would drop a large published component.",
          "Total DEL is the published row. It is not rebuilt from resource DEL plus capital DEL.",
          "2025-26 is a first outturn estimate. Do not invent a residual identity with tax receipts or monthly managed expenditure on this page.",
        ]}
      />
    );
    body = !delLatest || !delStack.length || !delFy ? (
      <EmptyStage label="Not available">
        DEL and AME control totals are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            DEL and AME · {delFy} · {share ? "share of this table’s total" : "£bn"}
          </h3>
          <RankBars
            key={`del-ranks-${delFy}-${measure}`}
            label="DEL and AME control totals"
            rows={delLatest.ranks.map((r) => ({
              id: r.id,
              label: r.label,
              v: r.v,
            }))}
            format={fmt}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {share ? "Share of this table’s total · " : "Control totals · "}
            {delYears[0]}–{delYears[delYears.length - 1]} · {share ? "%" : "£bn"}
          </h3>
          <TimeChart
            key={`del-stack-${measure}`}
            label="DEL and AME over time"
            series={delStack}
            cadence="annual"
            kind={share ? "stack" : "line"}
            zero
            showTable={false}
            format={fmt}
            periodLabel={fyLabel}
          />
        </section>
      </div>
    );
  } else if (view === "real") {
    const realDel = realInst === "delame";
    const realFy = realDel ? delRealFy : tesRealFy;
    const realYears = realDel ? delRealYears : tesRealYears;
    const realLatest = realDel ? delRealLatest : tesRealLatest;
    const realStack = realDel ? delRealStack : tesRealStack;
    foot = (
      <FigureRecord
        source={economySource(
          realDel ? ECONOMY_SOURCE.tmeDelAmeReal : ECONOMY_SOURCE.tesByFunctionReal,
          realDel ? "United Kingdom" : "United Kingdom public sector",
          economyPeriod("annual", realFy),
        )}
        definition={
          realDel
            ? [
                "DEL and AME control totals in real terms — the same Treasury budgeting presentation, restated at 2025-26 prices.",
                "These are official HMT real series. They are not a deflated copy of the monthly ONS managed-expenditure line.",
              ]
            : [
                "Expenditure on services by function in real terms — Treasury TES / COFOG restated at 2025-26 prices.",
                "This is an official HMT real table (£ billion). It is not a deflated copy of the monthly ONS managed-expenditure line.",
              ]
        }
        method={[
          realDel
            ? "HM Treasury Public Spending Statistics Table 1.2, £ million, 2025-26 prices. Other AME stays in the chart."
            : "HM Treasury Public Spending Statistics Table 4.3, £ billion, 2025-26 prices. Functions are published totals.",
          "Price base uses ONS GDP deflators (workbook: released 30 June 2026). In 2025-26, real equals nominal.",
          "Do not treat this as monthly real managed expenditure. Do not invent a residual with tax receipts.",
        ]}
      />
    );
    body = !realLatest || !realStack.length || !realFy ? (
      <EmptyStage label="Not available">
        Real-terms spending series are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {realDel ? "DEL and AME · real terms" : "Services by function · real terms"} ·{" "}
            {realFy} · 2025-26 prices · {share ? "share" : "£bn"}
          </h3>
          <RankBars
            key={`real-ranks-${realInst}-${realFy}-${measure}`}
            label={realDel ? "Real DEL and AME" : "Real TES by function"}
            rows={realLatest.ranks.map((r) => ({
              id: r.id,
              label: r.label,
              v: r.v,
            }))}
            format={fmt}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {share ? "Share · " : "History · "}
            {realYears[0]}–{realYears[realYears.length - 1]} · 2025-26 prices ·{" "}
            {share ? "%" : "£bn"}
          </h3>
          <TimeChart
            key={`real-stack-${realInst}-${measure}`}
            label={realDel ? "Real DEL and AME over time" : "Real TES by function over time"}
            series={realStack}
            cadence="annual"
            kind={share ? "stack" : "line"}
            zero
            showTable={false}
            format={fmt}
            periodLabel={fyLabel}
          />
        </section>
      </div>
    );
  } else if (view === "services") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.tesByFunction,
          "United Kingdom public sector",
          economyPeriod("annual", servicesFy),
        )}
        definition={[
          "How expenditure on services relates to this table’s managed-expenditure total — services, then the published accounting adjustments, then the table total.",
          "Services are not the same as “what people receive” in everyday language, and the table total is not the monthly ONS managed-expenditure line.",
        ]}
        method={[
          "HM Treasury Public Spending Statistics Table 5.4 bridge rows. In 2024-25, services plus accounting adjustments equal this table’s managed-expenditure total.",
          "The ten functions alone are not the services total (EU transactions sit inside services). Do not treat receipts minus spending as borrowing on this page.",
        ]}
      />
    );
    body = !servicesBridge || !servicesFy ? (
      <EmptyStage label="Not available">
        The services-to-total bridge is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Services, adjustments, and this table’s total · {servicesFy} · £bn
          </h3>
          <RankBars
            key={`services-bridge-${servicesFy}`}
            label="TES to table TME bridge"
            rows={servicesBridge.ranks.map((r) => ({
              id: r.id,
              label: r.label,
              v: r.v,
            }))}
            format={fmtSpendingBn}
          />
        </section>
      </div>
    );
  } else if (view === "esa") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.esaGgByFunction,
          "United Kingdom general government",
          economyPeriod("annual", esaYear),
        )}
        definition={[
          "How general government spent, by United Nations function of government — calendar-year ESA Table 11.",
          "This is not Treasury Total Expenditure on Services, and it is not public-sector managed expenditure on What the state spends.",
        ]}
        method={[
          "Office for National Statistics ESA Table 11, £ million, calendar year. Charts use the published general-government total as the share denominator.",
          "General government is narrower than the public sector. Do not stack these bars against TES or monthly managed expenditure.",
        ]}
      />
    );
    body = !esaLatest || !esaStack.length || !esaYear ? (
      <EmptyStage label="Not available">
        ESA general-government function series are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            General government by function · {esaYear} ·{" "}
            {share ? "share of ESA total" : "£bn"}
          </h3>
          <RankBars
            key={`esa-ranks-${esaYear}-${measure}`}
            label="ESA Table 11 by function"
            rows={esaLatest.ranks.map((r) => ({
              id: r.id,
              label: r.label,
              v: r.v,
            }))}
            format={fmt}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {share ? "Share of ESA total · " : "Each function · "}
            {esaYears[0]}–{esaYears[esaYears.length - 1]} · {share ? "%" : "£bn"}
          </h3>
          <TimeChart
            key={`esa-stack-${measure}`}
            label="ESA Table 11 over time"
            series={esaStack}
            cadence="annual"
            kind={share ? "stack" : "line"}
            zero
            showTable={false}
            format={fmt}
            periodLabel={calendarYearLabel}
          />
        </section>
      </div>
    );
  } else {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.totalManagedExpenditure,
          "United Kingdom",
          economyPeriod("monthly", latest ? labelMonth(latest.period_start) : null),
        )}
        definition={[
          "Observation tables for monthly managed expenditure, TES by function (recent and long-run), DEL / AME, real-terms companions, and ESA Table 11.",
        ]}
        method={[
          "Latest month on the monthly series is provisional. Function and DEL tables are financial-year outturn; 2025-26 is estimated. ESA is calendar year.",
          "TES / COFOG, DEL / AME, real-terms HMT tables, and ESA general government are not slices of the monthly managed-expenditure total.",
        ]}
      />
    );
    body = <SpendingData pack={pack} />;
  }

  const yearOptions =
    view === "function"
      ? functionYears.map((y) => ({ value: y, label: y }))
      : view === "services"
        ? tesYears.map((y) => ({ value: y, label: y }))
        : view === "delame"
          ? delYears.map((y) => ({ value: y, label: y }))
          : view === "real"
            ? (realInst === "delame" ? delRealYears : tesRealYears).map((y) => ({
                value: y,
                label: y,
              }))
            : view === "esa"
              ? esaYears.map((y) => ({ value: y, label: y }))
              : [];
  const activeFy =
    view === "function"
      ? tesFy
      : view === "services"
        ? servicesFy
        : view === "delame"
          ? delFy
          : view === "real"
            ? realInst === "delame"
              ? delRealFy
              : tesRealFy
            : view === "esa"
              ? esaYear
              : null;
  const yearControlLabel = view === "esa" ? "Calendar year" : "Financial year";

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {figures.length ? <FigureStrip figures={figures} /> : null}
      <ControlRow>
        {view === "function" ||
        view === "delame" ||
        view === "real" ||
        view === "services" ||
        view === "esa" ? (
          <>
            {view === "function" && tesLongRows.length > 0 ? (
              <MenuControl
                label="Span"
                value={span}
                options={FUNCTION_SPAN_OPTIONS}
                onChange={(v) => sync({ span: asFunctionSpan(v), fy: null })}
              />
            ) : null}
            {view === "real" ? (
              <MenuControl
                label="Instrument"
                value={realInst}
                options={REAL_INSTRUMENT_OPTIONS}
                onChange={(v) => sync({ ri: asRealInstrument(v), fy: null })}
              />
            ) : null}
            {view !== "services" ? (
              <MenuControl
                label="Measure"
                value={measure}
                options={SPENDING_MEASURE_OPTIONS}
                onChange={(v) => sync({ measure: asMeasure(v) })}
              />
            ) : null}
            {yearOptions.length && activeFy ? (
              <MenuControl
                label={yearControlLabel}
                value={activeFy}
                options={[...yearOptions].reverse()}
                onChange={(v) => sync({ fy: v })}
              />
            ) : null}
            <ResetButton
              onClick={() =>
                sync({
                  view,
                  measure: "absolute",
                  fy: null,
                  ri: "delame",
                  span: "recent",
                })
              }
            />
          </>
        ) : view === "spends" ? (
          <ResetButton onClick={() => sync({ view: "spends" })} />
        ) : null}
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          <EconomyStageFollow
            domain="spending"
            view={view}
            label={`Spending · ${viewLabel(view)}`}
          />
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

function SpendingData({ pack }: { pack: SpendingPack }) {
  const rows = finalObs(pack.totalManagedExpenditure?.observations ?? [])
    .slice()
    .reverse()
    .slice(0, 24);
  const tesFy = tesLatestFinalYear(pack.tesByFunction?.observations ?? []);
  const tes = tesFy
    ? tesFunctionRanks(pack.tesByFunction?.observations ?? [], tesFy, "absolute")
    : null;
  const tesLongFy = tesLatestFinalYear(pack.tesByFunctionLongRun?.observations ?? []);
  const tesLong = tesLongFy
    ? tesFunctionRanks(
        pack.tesByFunctionLongRun?.observations ?? [],
        tesLongFy,
        "absolute",
        "billion",
      )
    : null;
  const delFy = delAmeLatestFinalYear(pack.tmeDelAme?.observations ?? []);
  const del = delFy
    ? delAmeRanks(pack.tmeDelAme?.observations ?? [], delFy, "absolute")
    : null;
  const esaY = esaLatestYear(pack.esaGgByFunction?.observations ?? []);
  const esa = esaY
    ? esaFunctionRanks(pack.esaGgByFunction?.observations ?? [], esaY, "absolute")
    : null;

  if (!rows.length && !tes && !tesLong && !del && !esa) {
    return (
      <EmptyStage label="In preparation">
        Spending series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  return (
    <div className={s.stack}>
      {rows.length ? (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>Total managed expenditure · £ billion</p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period_start}>
                    <td>{labelMonth(r.period_start)}</td>
                    <td>{fmtFlowBn(r.value as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {tes && tesFy ? (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Expenditure on services by function · {tesFy} · £ billion
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Function</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {tes.ranks.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{fmtFlowBn(r.v * 1000)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {tesLong && tesLongFy ? (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Long-run services by function · {tesLongFy} · £ billion
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Function</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {tesLong.ranks.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{fmtSpendingBn(r.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {del && delFy ? (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>DEL and AME · {delFy} · £ billion</p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Control total</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {del.ranks.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{fmtFlowBn(r.v * 1000)}</td>
                  </tr>
                ))}
                <tr>
                  <td>This table’s total</td>
                  <td>{fmtFlowBn(del.tableTmeM)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {esa && esaY ? (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            ESA general government by function · {esaY} · £ billion
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Function</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {esa.ranks.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{fmtFlowBn(r.v * 1000)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

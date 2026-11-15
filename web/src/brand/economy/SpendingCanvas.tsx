"use client";

/**
 * Economy Domain 07 — Public Spending & Services.
 * Flagship: What the state spends — ONS EBFT Total Managed Expenditure.
 * Where spending goes — HMT TES / COFOG (Table 5.4).
 * DEL and AME — HMT Table 1.1 control totals.
 * Real terms — Tables 1.2 / 4.3 at 2025-26 prices (not monthly EBFT).
 * Services — TES vs accounting adjustments vs table TME (nominal bridge).
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
  delAmeFinancialYears,
  delAmeLatestFinalYear,
  delAmeRanks,
  delAmeStack,
  fmtSpendingBn,
  fmtSpendingShare,
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
  { id: "data", label: "Data" },
];

type RealInstrument = "delame" | "function";

function asRealInstrument(raw: string | null): RealInstrument {
  return raw === "function" ? "function" : "delame";
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

  const sync = useCallback(
    (next: {
      view?: string;
      measure?: SpendingMeasure;
      fy?: string | null;
      ri?: RealInstrument;
    }) => {
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const year = next.fy !== undefined ? next.fy : fy;
      const ri = next.ri ?? realInst;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "spending");
      u.set("view", v);
      if (v === "function" || v === "delame" || v === "real" || v === "services") {
        if (v !== "services") u.set("measure", m);
        else u.delete("measure");
        if (year) u.set("fy", year);
        else u.delete("fy");
        if (v === "real") u.set("ri", ri);
        else u.delete("ri");
      } else {
        u.delete("measure");
        u.delete("fy");
        u.delete("ri");
      }
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
      if (next.fy !== undefined) setFy(next.fy);
      if (next.ri != null) setRealInst(next.ri);
    },
    [pathname, view, measure, fy, realInst],
  );

  const rows = pack.totalManagedExpenditure?.observations ?? [];
  const tesRows = pack.tesByFunction?.observations ?? [];
  const delRows = pack.tmeDelAme?.observations ?? [];
  const delRealRows = pack.tmeDelAmeReal?.observations ?? [];
  const tesRealRows = pack.tesByFunctionReal?.observations ?? [];

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

  const tesYears = useMemo(() => tesFinancialYears(tesRows), [tesRows]);
  const delYears = useMemo(() => delAmeFinancialYears(delRows), [delRows]);
  const tesRealYears = useMemo(() => tesFinancialYears(tesRealRows), [tesRealRows]);
  const delRealYears = useMemo(() => delAmeFinancialYears(delRealRows), [delRealRows]);
  const tesFy =
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

  const tesLatest = useMemo(
    () => (tesFy ? tesFunctionRanks(tesRows, tesFy, measure) : null),
    [tesRows, tesFy, measure],
  );
  const tesStack = useMemo(() => tesFunctionStack(tesRows, measure), [tesRows, measure]);
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
    () => (tesFy ? tesServicesBridge(tesRows, tesFy) : null),
    [tesRows, tesFy],
  );

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
      return [
        {
          label: "Services total",
          value: fmtFlowBn(tesLatest.tesM),
          note: `${tesFy} · total expenditure on services`,
        },
        {
          label: top ? top.label : "Largest function",
          value:
            measure === "share"
              ? fmtSpendingShare(top?.v ?? NaN)
              : top
                ? fmtFlowBn(top.v * 1000)
                : "—",
          note: measure === "share" ? "Share of services total" : "Largest function that year",
        },
        {
          label: "To managed expenditure",
          value: fmtFlowBn(tesLatest.adjustmentsM),
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
    if (view === "services" && servicesBridge && tesFy) {
      return [
        {
          label: "Services",
          value: fmtFlowBn(servicesBridge.tesM),
          note: `${tesFy} · expenditure on services`,
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
    return [];
  }, [
    view,
    latest,
    latestRoll,
    yoy,
    tesLatest,
    tesFy,
    delLatest,
    delFy,
    delRealLatest,
    delRealFy,
    tesRealLatest,
    tesRealFy,
    servicesBridge,
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
          ECONOMY_SOURCE.tesByFunction,
          "United Kingdom public sector",
          economyPeriod("annual", tesFy),
        )}
        definition={[
          "Where public-sector spending on services goes, by United Nations function of government — health, education, social protection and others.",
          "This is Treasury Total Expenditure on Services (TES / COFOG), not a split of the monthly managed-expenditure line on What the state spends.",
        ]}
        method={[
          "HM Treasury Public Spending Statistics Table 5.4, £ million, financial year. Each function is current plus capital. Charts use the published services total as the share denominator.",
          "Level-1 functions can miss the published services total by up to about £2 million; the published total is used. EU transactions sit inside services but outside the ten functions and are not drawn as a bar.",
          "Accounting adjustments bridge services to this table’s managed-expenditure total — they are not a function. That table total is not the same as the monthly ONS series.",
          "2025-26 is a first outturn estimate. Do not treat receipts minus spending as borrowing on this page.",
        ]}
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
          </h3>
          <RankBars
            key={`tes-ranks-${tesFy}-${measure}`}
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
            {tesYears[0]}–{tesYears[tesYears.length - 1]} · {share ? "%" : "£bn"}
          </h3>
          <TimeChart
            key={`tes-stack-${measure}`}
            label="TES by function over time"
            series={tesStack}
            cadence="annual"
            kind={share ? "stack" : "line"}
            zero
            showTable={false}
            format={fmt}
            periodLabel={(tt) => {
              const y = Math.floor(tt);
              return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
            }}
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
          economyPeriod("annual", tesFy),
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
    body = !servicesBridge || !tesFy ? (
      <EmptyStage label="Not available">
        The services-to-total bridge is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Services, adjustments, and this table’s total · {tesFy} · £bn
          </h3>
          <RankBars
            key={`services-bridge-${tesFy}`}
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
  } else {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.totalManagedExpenditure,
          "United Kingdom",
          economyPeriod("monthly", latest ? labelMonth(latest.period_start) : null),
        )}
        definition={[
          "Observation tables for monthly managed expenditure, TES by function, DEL / AME, and real-terms companions.",
        ]}
        method={[
          "Latest month on the monthly series is provisional. Function and DEL tables are financial-year outturn; 2025-26 is estimated.",
          "TES / COFOG, DEL / AME, and real-terms HMT tables are not slices of the monthly managed-expenditure total.",
        ]}
      />
    );
    body = <SpendingData pack={pack} />;
  }

  const yearOptions =
    view === "function" || view === "services"
      ? tesYears.map((y) => ({ value: y, label: y }))
      : view === "delame"
        ? delYears.map((y) => ({ value: y, label: y }))
        : view === "real"
          ? (realInst === "delame" ? delRealYears : tesRealYears).map((y) => ({
              value: y,
              label: y,
            }))
          : [];
  const activeFy =
    view === "function" || view === "services"
      ? tesFy
      : view === "delame"
        ? delFy
        : view === "real"
          ? realInst === "delame"
            ? delRealFy
            : tesRealFy
          : null;

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {figures.length ? <FigureStrip figures={figures} /> : null}
      <ControlRow>
        {view === "function" || view === "delame" || view === "real" || view === "services" ? (
          <>
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
                label="Financial year"
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
  const delFy = delAmeLatestFinalYear(pack.tmeDelAme?.observations ?? []);
  const del = delFy
    ? delAmeRanks(pack.tmeDelAme?.observations ?? [], delFy, "absolute")
    : null;

  if (!rows.length && !tes && !del) {
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
    </div>
  );
}

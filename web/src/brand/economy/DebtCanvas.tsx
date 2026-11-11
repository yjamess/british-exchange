"use client";

/**
 * Economy Domain 08 — Public Debt & Government Finances.
 * Deep brief: What the state owes, borrows, and pays in interest.
 * Flagship: Debt dial — separate measures; %GDP is official HF6X (never ABMI).
 * Flows (borrowing · interest): monthly + 12-month rolling sum (derived, labelled).
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { TimeChart } from "../instrument/TimeChart";
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
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import {
  DEBT_MEASURES,
  asDebtMeasure,
  finalObs,
  fmtDebtBn,
  fmtFlowBn,
  fmtPctGdp,
  periodPoints,
  rolling12mSum,
  type DebtMeasure,
} from "./debt-model";
import type { DebtPack } from "./types";

const VIEWS: ExplorerView[] = [
  { id: "dial", label: "Debt dial" },
  { id: "borrowing", label: "Borrowing" },
  { id: "interest", label: "Interest" },
  { id: "data", label: "Data" },
];

const MEASURE_OPTIONS: PrintOption<DebtMeasure>[] = DEBT_MEASURES;

const PSF_NOTE =
  "ONS Public Sector Finances · release 2026-10-20 · next 20 Nov 2026. Excludes public-sector banks where the series is ex-banks.";

function asView(raw: string | null): string {
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "dial";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Debt";
}

/** ISO month → "Mon YYYY". */
function labelMonth(iso: string): string {
  return fmtT(Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12);
}

export function DebtCanvas({ pack }: { pack: DebtPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [measure, setMeasure] = useState<DebtMeasure>(() =>
    asDebtMeasure(searchParams.get("measure")),
  );

  const sync = useCallback(
    (next: { view?: string; measure?: DebtMeasure }) => {
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "debt");
      u.set("view", v);
      if (v === "dial") u.set("measure", m);
      else u.delete("measure");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
    },
    [pathname, view, measure],
  );

  const latestDebt = useMemo(() => {
    const f = finalObs(pack.debt?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.debt]);
  const latestPct = useMemo(() => {
    const f = finalObs(pack.percentGdp?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.percentGdp]);
  const latestBor = useMemo(() => {
    const f = finalObs(pack.borrowing?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.borrowing]);
  const latestInt = useMemo(() => {
    const f = finalObs(pack.interest?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.interest]);

  const debtPts = useMemo(() => periodPoints(pack.debt?.observations ?? []), [pack.debt]);
  const pctPts = useMemo(
    () => periodPoints(pack.percentGdp?.observations ?? []),
    [pack.percentGdp],
  );
  const borPts = useMemo(
    () => periodPoints(pack.borrowing?.observations ?? []),
    [pack.borrowing],
  );
  const borRoll = useMemo(
    () => rolling12mSum(pack.borrowing?.observations ?? []),
    [pack.borrowing],
  );
  const intPts = useMemo(
    () => periodPoints(pack.interest?.observations ?? []),
    [pack.interest],
  );
  const intRoll = useMemo(
    () => rolling12mSum(pack.interest?.observations ?? []),
    [pack.interest],
  );

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "borrowing") {
      const roll = borRoll[borRoll.length - 1];
      return [
        {
          label: "Borrowing · month",
          value: latestBor?.value != null ? fmtFlowBn(latestBor.value) : "—",
          note: latestBor
            ? `${labelMonth(latestBor.period_start)} · NSA · ex banks`
            : "DZLS",
        },
        {
          label: "12-month sum",
          value: roll != null ? fmtFlowBn(roll.v) : "—",
          note: "Derived · trailing year of final months",
        },
        {
          label: "Kind",
          value: "Flow",
          note: "£ million published · shown as £bn",
        },
      ];
    }
    if (view === "interest") {
      const roll = intRoll[intRoll.length - 1];
      return [
        {
          label: "Interest · month",
          value: latestInt?.value != null ? fmtFlowBn(latestInt.value) : "—",
          note: latestInt
            ? `${labelMonth(latestInt.period_start)} · central government`
            : "NMFX",
        },
        {
          label: "12-month sum",
          value: roll != null ? fmtFlowBn(roll.v) : "—",
          note: "Derived · trailing year of final months",
        },
        {
          label: "Scope",
          value: "Central gov",
          note: "Not whole public sector interest",
        },
      ];
    }
    return [
      {
        label: "Net debt",
        value: latestDebt?.value != null ? fmtDebtBn(latestDebt.value) : "—",
        note: latestDebt
          ? `${labelMonth(latestDebt.period_start)} · stock · ex banks`
          : "HF6W",
      },
      {
        label: "Debt % of GDP",
        value: latestPct?.value != null ? fmtPctGdp(latestPct.value) : "—",
        note: "Official HF6X — not derived from ABMI",
      },
      {
        label: "Net borrowing",
        value: latestBor?.value != null ? fmtFlowBn(latestBor.value) : "—",
        note: latestBor ? `${labelMonth(latestBor.period_start)} · month` : "DZLS",
      },
    ];
  }, [view, latestDebt, latestPct, latestBor, latestInt, borRoll, intRoll]);

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "data") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.publicFinances,
          "United Kingdom",
          economyPeriod("monthly"),
        )}
        definition="Observation tables for Ready public-finance series on this domain."
        method={[
          "Debt HF6W (£bn stock). Borrowing DZLS (£m flow). Interest NMFX (£m, central government). Debt % GDP HF6X (official).",
          "Never compute % of GDP from real-gdp (ABMI) — that is chained volume, not the PSF denominator.",
          "Tables show final months only.",
        ]}
      />
    );
    body = <DebtData pack={pack} />;
  } else if (view === "borrowing") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.netBorrowing,
          "United Kingdom",
          economyPeriod(
            "monthly",
            latestBor ? labelMonth(latestBor.period_start) : null,
          ),
        )}
        definition={[
          "Public sector net borrowing excluding public-sector banks (current prices, not seasonally adjusted).",
          "Monthly levels swing with tax and spending seasons — the 12-month sum is the readable trend.",
        ]}
        method={[
          "Monthly series is the official DZLS pin. The 12-month sum is Exchange-labelled derived.",
          PSF_NOTE,
          "Charts use final months only.",
        ]}
      />
    );
    body = !borPts.length ? (
      <EmptyStage label="Not available">
        Net borrowing is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Net borrowing · month and 12-month sum · {fmtT(borPts[0]!.t)}–
            {fmtT(borPts[borPts.length - 1]!.t)} · £bn
          </h3>
          <TimeChart
            key="debt-borrowing"
            label="Public sector net borrowing"
            series={[
              ...(borRoll.length
                ? [
                    {
                      id: "borrowing-12m",
                      label: "12-month sum (derived)",
                      points: borRoll,
                    },
                  ]
                : []),
              {
                id: "public-sector-net-borrowing",
                label: "Month (NSA)",
                points: borPts,
                role: "reference" as const,
              },
            ]}
            cadence="monthly"
            kind="line"
            zero
            showTable={false}
            format={fmtFlowBn}
          />
        </section>
      </div>
    );
  } else if (view === "interest") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.debtInterest,
          "United Kingdom",
          economyPeriod(
            "monthly",
            latestInt ? labelMonth(latestInt.period_start) : null,
          ),
        )}
        definition={[
          "Central government net interest payable (current prices, NSA) — not whole public-sector interest.",
          "Index-linked gilt effects make single months noisy; the 12-month sum is the trend reading.",
        ]}
        method={[
          "Monthly series is the official NMFX pin. The 12-month sum is Exchange-labelled derived.",
          PSF_NOTE,
          "Charts use final months only.",
        ]}
      />
    );
    body = !intPts.length ? (
      <EmptyStage label="Not available">
        Debt interest is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Central government debt interest · month and 12-month sum ·{" "}
            {fmtT(intPts[0]!.t)}–{fmtT(intPts[intPts.length - 1]!.t)} · £bn
          </h3>
          <TimeChart
            key="debt-interest"
            label="Central government debt interest"
            series={[
              ...(intRoll.length
                ? [
                    {
                      id: "interest-12m",
                      label: "12-month sum (derived)",
                      points: intRoll,
                    },
                  ]
                : []),
              {
                id: "public-sector-debt-interest",
                label: "Month (NSA)",
                points: intPts,
                role: "reference" as const,
              },
            ]}
            cadence="monthly"
            kind="line"
            zero
            showTable={false}
            format={fmtFlowBn}
          />
        </section>
      </div>
    );
  } else {
    // Debt dial
    const activePts =
      measure === "percent"
        ? pctPts
        : measure === "borrowing"
          ? borPts
          : measure === "interest"
            ? intPts
            : debtPts;
    const rollPts = measure === "borrowing" ? borRoll : measure === "interest" ? intRoll : [];
    const label =
      measure === "borrowing"
        ? "Public sector net borrowing"
        : measure === "interest"
          ? "Central government debt interest"
          : measure === "percent"
            ? "Public sector net debt · % of GDP"
            : "Public sector net debt";
    const indicatorId =
      measure === "borrowing"
        ? "public-sector-net-borrowing"
        : measure === "interest"
          ? "public-sector-debt-interest"
          : measure === "percent"
            ? "public-sector-net-debt-percent-gdp"
            : "public-sector-net-debt";
    const sourceLine =
      measure === "borrowing"
        ? ECONOMY_SOURCE.netBorrowing
        : measure === "interest"
          ? ECONOMY_SOURCE.debtInterest
          : measure === "percent"
            ? ECONOMY_SOURCE.debtPercentGdp
            : ECONOMY_SOURCE.netDebt;
    const fmt =
      measure === "percent" ? fmtPctGdp : measure === "debt" ? fmtDebtBn : fmtFlowBn;
    const unit =
      measure === "percent"
        ? "% of GDP"
        : measure === "debt"
          ? "£ billion"
          : "£ million (shown as £bn)";
    const latestIso =
      measure === "percent"
        ? latestPct?.period_start
        : measure === "borrowing"
          ? latestBor?.period_start
          : measure === "interest"
            ? latestInt?.period_start
            : latestDebt?.period_start;

    foot = (
      <FigureRecord
        source={economySource(
          sourceLine,
          "United Kingdom",
          economyPeriod("monthly", latestIso ? labelMonth(latestIso) : null),
        )}
        definition={[
          `${label}. Excludes public-sector banks where the ONS series is ex-banks.`,
          measure === "interest"
            ? "Interest is central government net interest payable — not whole public sector."
            : measure === "percent"
              ? "Official ONS ratio (HF6X). Do not derive from real GDP (ABMI)."
              : "Debt is a stock; borrowing and interest are monthly flows — never one shared axis.",
        ]}
        method={[
          `Indicator id: ${indicatorId}.`,
          measure === "borrowing" || measure === "interest"
            ? "Dial shows the monthly level; Borrowing / Interest tabs add the derived 12-month sum."
            : "Each dial position is a separate official series — do not mix units on one axis.",
          PSF_NOTE,
          "Charts use final months only.",
        ]}
      />
    );

    body = !activePts.length ? (
      <EmptyStage label="Not available">
        This public-finance series is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {label} · {fmtT(activePts[0]!.t)}–{fmtT(activePts[activePts.length - 1]!.t)} ·{" "}
            {unit}
          </h3>
          <TimeChart
            key={`debt-dial-${measure}`}
            label={label}
            series={
              rollPts.length
                ? [
                    {
                      id: `${indicatorId}-12m`,
                      label: "12-month sum (derived)",
                      points: rollPts,
                    },
                    {
                      id: indicatorId,
                      label: "Month (NSA)",
                      points: activePts,
                      role: "reference",
                    },
                  ]
                : [{ id: indicatorId, label, points: activePts }]
            }
            cadence="monthly"
            kind="line"
            zero={measure !== "percent"}
            showTable={false}
            format={fmt}
          />
        </section>
      </div>
    );
  }

  const followViews = new Set(["dial", "borrowing", "interest", "data"]);

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      <FigureStrip figures={figures} />
      <ControlRow label="Debt controls">
        {view === "dial" ? (
          <MenuControl
            label="Measure"
            value={measure}
            options={MEASURE_OPTIONS}
            onChange={(id) => sync({ measure: id as DebtMeasure })}
          />
        ) : null}
        <ResetButton onClick={() => sync({ view: "dial", measure: "debt" })} />
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          followViews.has(view) ? (
            <EconomyStageFollow domain="debt" view={view} label={`Debt · ${viewLabel(view)}`} />
          ) : undefined
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

function DebtData({ pack }: { pack: DebtPack }) {
  const tables = [
    { id: "public-sector-net-debt", title: "Net debt · £ billion", pack: pack.debt, fmt: fmtDebtBn },
    {
      id: "public-sector-net-debt-percent-gdp",
      title: "Net debt · % of GDP (official)",
      pack: pack.percentGdp,
      fmt: fmtPctGdp,
    },
    {
      id: "public-sector-net-borrowing",
      title: "Net borrowing · £ million (shown £bn)",
      pack: pack.borrowing,
      fmt: fmtFlowBn,
    },
    {
      id: "public-sector-debt-interest",
      title: "Debt interest · £ million (shown £bn)",
      pack: pack.interest,
      fmt: fmtFlowBn,
    },
  ];
  const any = tables.some((x) => finalObs(x.pack?.observations ?? []).length > 0);
  if (!any) {
    return (
      <EmptyStage label="In preparation">
        Public-finance series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  return (
    <div className={s.stack}>
      {tables.map((tbl) => {
        const rows = finalObs(tbl.pack?.observations ?? []).slice().reverse().slice(0, 24);
        if (!rows.length) return null;
        return (
          <div key={tbl.id} className={t.tableGroup}>
            <p className={t.stageTitle}>{tbl.title}</p>
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
                    <tr key={`${tbl.id}-${r.period_start}`}>
                      <td>{fmtT(periodPoints([r])[0]!.t)}</td>
                      <td className="bo-fig">{tbl.fmt(r.value as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

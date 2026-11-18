"use client";

/**
 * Economy Domain 08 — Public Debt & Government Finances.
 * §7–§9: What Britain owes · Debt anatomy · Who owns the debt · Repayment calendar ·
 * Borrowing · Cash to debt (CG REC3) · Cost of debt · Data.
 * Stock, flow and ratio stay separate; %GDP is official HF6X (never derived from real GDP).
 * Flows: monthly + 12-month rolling sum (derived).
 *
 * Debt instruments (G3, EC-DB-08d) are three different measures and none is public sector
 * net debt (HF6W): Anatomy = DMO uplifted nominal · Ownership = ONS market value ·
 * Repayment = DMO D8B net of government holdings. See debt-instruments-model.ts.
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
import {
  BRIDGE_CASH,
  BRIDGE_CHANGE,
  bridgePeriods,
  bridgeRoll,
  bridgeSlice,
  type BridgePeriod,
} from "./debt-bridge-model";
import {
  PORTFOLIO_BASIS_OPTIONS,
  asPortfolioBasis,
  fmtBn,
  fmtMillionAsBn,
  fmtSharePct,
  fyLabel,
  giltBands,
  holdingsByMonth,
  labelDateIso,
  labelQuarterIso,
  ownershipPeriods,
  ownershipShareChange,
  ownershipSlice,
  portfolioPeriods,
  portfolioSlice,
  redemptionPoints,
  redemptionReading,
  type PortfolioBasis,
} from "./debt-instruments-model";
import { coerceFromYear, fromYearOptions, pointsFrom } from "./series-window";
import type { DebtPack } from "./types";

const VIEWS: ExplorerView[] = [
  { id: "dial", label: "What Britain owes" },
  { id: "ownership", label: "Who owns the debt" },
  { id: "anatomy", label: "Debt anatomy" },
  { id: "repayment", label: "Repayment calendar" },
  { id: "borrowing", label: "Borrowing" },
  { id: "machine", label: "Cash to debt" },
  { id: "interest", label: "Cost of debt" },
  { id: "data", label: "Data" },
];

const MEASURE_OPTIONS: PrintOption<DebtMeasure>[] = DEBT_MEASURES;

type OwnerShow = "share" | "value";
const OWNER_SHOW_OPTIONS: PrintOption<OwnerShow>[] = [
  { value: "share", label: "Share of total" },
  { value: "value", label: "£ billion" },
];
const BASIS_OPTIONS: PrintOption<PortfolioBasis>[] = PORTFOLIO_BASIS_OPTIONS;

const PSF_NOTE =
  "ONS Public Sector Finances · released 20 Oct 2026 · next 20 Nov 2026.";

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

  // Empty string = "use the default" (latest quarter) and keeps the URL clean.
  const [anatomyPeriodRaw, setAnatomyPeriod] = useState(() => searchParams.get("period") ?? "");
  const [basis, setBasis] = useState<PortfolioBasis>(() => asPortfolioBasis(searchParams.get("basis")));
  const [ownerPeriodRaw, setOwnerPeriod] = useState(() => searchParams.get("period") ?? "");
  const [ownerShow, setOwnerShow] = useState<OwnerShow>(() =>
    searchParams.get("show") === "value" ? "value" : "share",
  );
  const [bridgePeriodRaw, setBridgePeriod] = useState(() => searchParams.get("period") ?? "");
  /** Trajectory From year for dial / borrowing / interest (Generation pattern). */
  const [fromRaw, setFrom] = useState(() => searchParams.get("from") ?? "");
  /** Data tab series filter (Generation / Consumption pattern). */
  const [dataSeries, setDataSeries] = useState(() => searchParams.get("series") ?? "");

  const sync = useCallback(
    (next: {
      view?: string;
      measure?: DebtMeasure;
      anatomyPeriod?: string;
      basis?: PortfolioBasis;
      ownerPeriod?: string;
      ownerShow?: OwnerShow;
      bridgePeriod?: string;
      from?: string;
      series?: string;
    }) => {
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const ap = next.anatomyPeriod ?? anatomyPeriodRaw;
      const b = next.basis ?? basis;
      const op = next.ownerPeriod ?? ownerPeriodRaw;
      const os = next.ownerShow ?? ownerShow;
      const bp = next.bridgePeriod ?? bridgePeriodRaw;
      const fr = next.from ?? fromRaw;
      const ser = next.series ?? dataSeries;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "debt");
      u.set("view", v);
      if (v === "dial") u.set("measure", m);
      else u.delete("measure");
      // `period` is shared by Anatomy, Ownership and the Machine; only the active view writes it.
      const period = v === "anatomy" ? ap : v === "ownership" ? op : v === "machine" ? bp : "";
      if (period) u.set("period", period);
      else u.delete("period");
      if (v === "anatomy") u.set("basis", b);
      else u.delete("basis");
      if (v === "ownership") u.set("show", os);
      else u.delete("show");
      if (v === "dial" || v === "borrowing" || v === "interest") {
        if (fr) u.set("from", fr);
        else u.delete("from");
      } else u.delete("from");
      if (v === "data" && ser) u.set("series", ser);
      else u.delete("series");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
      if (next.anatomyPeriod != null) setAnatomyPeriod(next.anatomyPeriod);
      if (next.basis != null) setBasis(next.basis);
      if (next.ownerPeriod != null) setOwnerPeriod(next.ownerPeriod);
      if (next.ownerShow != null) setOwnerShow(next.ownerShow);
      if (next.bridgePeriod != null) setBridgePeriod(next.bridgePeriod);
      if (next.from != null) setFrom(next.from);
      if (next.series != null) setDataSeries(next.series);
    },
    [
      pathname,
      view,
      measure,
      anatomyPeriodRaw,
      basis,
      ownerPeriodRaw,
      ownerShow,
      bridgePeriodRaw,
      fromRaw,
      dataSeries,
    ],
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

  /** From-year window for long monthly charts (dial / borrowing / interest). */
  const fromSourcePts = useMemo(() => {
    if (view === "borrowing") return borPts;
    if (view === "interest") return intPts;
    if (measure === "percent") return pctPts;
    if (measure === "borrowing") return borPts;
    if (measure === "interest") return intPts;
    return debtPts;
  }, [view, measure, debtPts, pctPts, borPts, intPts]);
  const fromOpts = useMemo(() => fromYearOptions(fromSourcePts), [fromSourcePts]);
  const fromYear = coerceFromYear(fromRaw || null, fromSourcePts);
  const debtPtsW = useMemo(() => pointsFrom(debtPts, fromYear), [debtPts, fromYear]);
  const pctPtsW = useMemo(() => pointsFrom(pctPts, fromYear), [pctPts, fromYear]);
  const borPtsW = useMemo(() => pointsFrom(borPts, fromYear), [borPts, fromYear]);
  const borRollW = useMemo(() => pointsFrom(borRoll, fromYear), [borRoll, fromYear]);
  const intPtsW = useMemo(() => pointsFrom(intPts, fromYear), [intPts, fromYear]);
  const intRollW = useMemo(() => pointsFrom(intRoll, fromYear), [intRoll, fromYear]);

  const dataSeriesOptions = useMemo(() => debtDataSeriesOptions(pack), [pack]);
  const activeDataSeries =
    dataSeriesOptions.find((o) => o.value === dataSeries)?.value ??
    dataSeriesOptions[0]?.value ??
    "";

  /* Debt anatomy — DMO portfolio (uplifted nominal) + gilts in issue snapshot. */
  const portfolioRows = useMemo(() => pack.portfolio?.observations ?? [], [pack.portfolio]);
  const portfolioQs = useMemo(() => portfolioPeriods(portfolioRows), [portfolioRows]);
  const anatomyPeriod = portfolioQs.includes(anatomyPeriodRaw)
    ? anatomyPeriodRaw
    : (portfolioQs.at(-1) ?? "");
  const anatomyOptions: PrintOption<string>[] = useMemo(
    () => portfolioQs.slice().reverse().map((p) => ({ value: p, label: labelQuarterIso(p) })),
    [portfolioQs],
  );
  const anatomySlice = useMemo(
    () => (anatomyPeriod ? portfolioSlice(portfolioRows, anatomyPeriod, basis) : { total: null, parts: [] }),
    [portfolioRows, anatomyPeriod, basis],
  );
  const gilts = useMemo(() => giltBands(pack.giltsInIssue?.observations ?? []), [pack.giltsInIssue]);

  /* Who owns the debt — ONS sector holdings at market value. */
  const ownerRows = useMemo(() => pack.ownership?.observations ?? [], [pack.ownership]);
  const ownerPeriods = useMemo(() => ownershipPeriods(ownerRows), [ownerRows]);
  // Default to the latest quarter that is not provisional; the menu still offers every quarter.
  const ownerDefault =
    [...ownerPeriods].reverse().find((p) => !p.provisional)?.period ?? ownerPeriods.at(-1)?.period ?? "";
  const ownerPeriod = ownerPeriods.some((p) => p.period === ownerPeriodRaw) ? ownerPeriodRaw : ownerDefault;
  const ownerProvisional = ownerPeriods.find((p) => p.period === ownerPeriod)?.provisional ?? false;
  const ownerOptions: PrintOption<string>[] = useMemo(
    () =>
      ownerPeriods
        .slice()
        .reverse()
        .map((p) => ({
          value: p.period,
          label: `${labelQuarterIso(p.period)}${p.provisional ? " · provisional" : ""}`,
        })),
    [ownerPeriods],
  );
  const ownerSliceRaw = useMemo(
    () => (ownerPeriod ? ownershipSlice(ownerRows, ownerPeriod) : { total: null, sectors: [] }),
    [ownerRows, ownerPeriod],
  );
  // Holders under half a percent are grouped so the bars read; the Data tab keeps every sector.
  const ownerSlice = useMemo(() => {
    const small = ownerSliceRaw.sectors.filter((x) => x.sharePct < 0.5);
    if (small.length < 2) return ownerSliceRaw;
    const big = ownerSliceRaw.sectors.filter((x) => x.sharePct >= 0.5);
    return {
      total: ownerSliceRaw.total,
      sectors: [
        ...big,
        {
          ...small[0]!,
          id: "other-holders",
          label: "Other holders",
          value: small.reduce((a, x) => a + x.value, 0),
          sharePct: small.reduce((a, x) => a + x.sharePct, 0),
        },
      ],
    };
  }, [ownerSliceRaw]);
  const ownerFirst = ownerPeriods[0]?.period ?? "";
  const ownerChange = useMemo(() => {
    if (!(ownerFirst && ownerPeriod && ownerFirst < ownerPeriod)) return [];
    const keep = new Set(ownerSlice.sectors.map((x) => x.id));
    return ownershipShareChange(ownerRows, ownerFirst, ownerPeriod).filter((r) => keep.has(r.id));
  }, [ownerRows, ownerFirst, ownerPeriod, ownerSlice]);

  /* Repayment calendar — D8B financial years. */
  const redRows = useMemo(() => pack.redemptions?.observations ?? [], [pack.redemptions]);
  const redTotal = useMemo(() => redemptionPoints(redRows, "total"), [redRows]);
  const redIl = useMemo(() => redemptionPoints(redRows, "index_linked"), [redRows]);
  const redReading = useMemo(() => redemptionReading(redTotal), [redTotal]);

  /* Cash to debt — REC3 central government cash requirement → change in net debt. */
  const bridgeRows = useMemo(() => pack.cashBridge?.observations ?? [], [pack.cashBridge]);
  const bridgeOptions = useMemo(() => bridgePeriods(bridgeRows), [bridgeRows]);
  const bridgePeriod: BridgePeriod | null =
    bridgeOptions.find((p) => p.value === bridgePeriodRaw) ?? bridgeOptions[0] ?? null;
  const bridge = useMemo(
    () => (bridgePeriod ? bridgeSlice(bridgeRows, bridgePeriod) : null),
    [bridgeRows, bridgePeriod],
  );
  // The long run duplicates Borrowing's shape; from 2010 the gap between cash and debt change is legible.
  const bridgeCashRoll = useMemo(
    () => bridgeRoll(bridgeRows, BRIDGE_CASH).filter((p) => p.t >= 2010),
    [bridgeRows],
  );
  const bridgeChangeRoll = useMemo(
    () => bridgeRoll(bridgeRows, BRIDGE_CHANGE).filter((p) => p.t >= 2010),
    [bridgeRows],
  );

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "anatomy") {
      const il = anatomySlice.parts.find((p) => p.id === "index-linked-gilts");
      const bills = anatomySlice.parts.find((p) => p.id === "treasury-bills");
      const q = anatomyPeriod ? labelQuarterIso(anatomyPeriod) : "";
      const basisWord = basis === "net" ? "net" : "gross";
      return [
        {
          label: "Debt portfolio",
          value: anatomySlice.total != null ? fmtBn(anatomySlice.total) : "—",
          note: anatomySlice.total != null ? `${q} · ${basisWord === "net" ? "held outside government" : "all in issue"}` : "Not loaded",
        },
        {
          label: "Index-linked gilts",
          value: il ? fmtSharePct(il.sharePct) : "—",
          note: il ? `Share of the portfolio · ${q}` : "Not loaded",
        },
        {
          label: "Treasury bills",
          value: bills ? fmtBn(bills.value) : "—",
          note: bills ? `${q} · held for debt management` : "Not loaded",
        },
      ];
    }
    if (view === "ownership") {
      const q = ownerPeriod ? labelQuarterIso(ownerPeriod) : "";
      const overseas = ownerSlice.sectors.find((x) => x.id === "overseas");
      const insurers = ownerSlice.sectors.find((x) => x.id === "insurance-pension-funds");
      return [
        {
          label: "Gilts held · market value",
          value: ownerSlice.total != null ? fmtMillionAsBn(ownerSlice.total) : "—",
          note: ownerSlice.total != null ? `${q}${ownerProvisional ? " · provisional" : ""} · all holders` : "Not loaded",
        },
        {
          label: "Overseas holders",
          value: overseas ? fmtSharePct(overseas.sharePct) : "—",
          note: overseas ? `Share of gilts at market value · ${q}` : "Not loaded",
        },
        {
          label: "Insurers and pension funds",
          value: insurers ? fmtSharePct(insurers.sharePct) : "—",
          note: insurers ? `Share of gilts at market value · ${q}` : "Not loaded",
        },
      ];
    }
    if (view === "repayment") {
      const first = redReading.firstFy;
      const ilFirst = first ? redIl.find((p) => p.t === first.t) : undefined;
      return [
        {
          label: "Next full year due",
          value: first ? fmtMillionAsBn(first.v) : "—",
          note: first ? `${fyLabel(first.t)} · due to the market` : "Not loaded",
        },
        {
          label: "Of which index-linked",
          value: ilFirst ? fmtMillionAsBn(ilFirst.v) : "—",
          note: ilFirst ? `${fyLabel(ilFirst.t)} · inflation top-up partly included` : "Not loaded",
        },
        {
          label: "Next five years",
          value: redReading.nextFiveSum != null ? fmtMillionAsBn(redReading.nextFiveSum) : "—",
          note:
            redReading.nextFiveFrom != null && redReading.nextFiveTo != null
              ? `${fyLabel(redReading.nextFiveFrom)} to ${fyLabel(redReading.nextFiveTo)}`
              : "Not loaded",
        },
      ];
    }
    if (view === "borrowing") {
      const roll = borRoll[borRoll.length - 1];
      return [
        {
          label: "Net borrowing",
          value: latestBor?.value != null ? fmtFlowBn(latestBor.value) : "—",
          note: latestBor
            ? `${labelMonth(latestBor.period_start)}`
            : "Not loaded",
        },
        {
          label: "12-month sum",
          value: roll != null ? fmtFlowBn(roll.v) : "—",
          note: "Trailing year",
        },
        {
          label: "A year earlier",
          value: borRoll.length > 12 ? fmtFlowBn(borRoll[borRoll.length - 13]!.v) : "—",
          note: "12-month sum",
        },
      ];
    }
    if (view === "machine") {
      const when = bridgePeriod?.label ?? "Not loaded";
      return [
        {
          label: "Cash borrowed",
          value: bridge ? fmtFlowBn(bridge.cash) : "—",
          note: `${when} · central government`,
        },
        {
          label: "Adjustments",
          value: bridge ? fmtFlowBn(bridge.change - bridge.cash) : "—",
          note: bridge ? `${bridge.adjustments.length} named lines` : "Not loaded",
        },
        {
          label: "Change in debt",
          value: bridge ? fmtFlowBn(bridge.change) : "—",
          note: `${when} · central government`,
        },
      ];
    }
    if (view === "interest") {
      const roll = intRoll[intRoll.length - 1];
      return [
        {
          label: "Debt interest",
          value: latestInt?.value != null ? fmtFlowBn(latestInt.value) : "—",
          note: latestInt
            ? `${labelMonth(latestInt.period_start)} · central government`
            : "Not loaded",
        },
        {
          label: "12-month sum",
          value: roll != null ? fmtFlowBn(roll.v) : "—",
          note: "Trailing year",
        },
        {
          label: "A year earlier",
          value: intRoll.length > 12 ? fmtFlowBn(intRoll[intRoll.length - 13]!.v) : "—",
          note: "12-month sum",
        },
      ];
    }
    if (view === "data") {
      const monthly = [pack.debt, pack.percentGdp, pack.borrowing, pack.interest].filter(
        (p) => finalObs(p?.observations ?? []).length > 0,
      ).length;
      const giltTables = instrumentTables(pack).length;
      return [
        {
          label: "Tables",
          value: String(monthly + giltTables),
          note: `${monthly} public finance · ${giltTables} gilt market`,
        },
        {
          label: "Latest month",
          value: latestDebt ? labelMonth(latestDebt.period_start) : "—",
          note: "Public finance series",
        },
        {
          label: "Released",
          value: "20 Oct 2026",
          note: "Next 20 Nov 2026",
        },
      ];
    }
    return [
      {
        label: "Net debt",
        value: latestDebt?.value != null ? fmtDebtBn(latestDebt.value) : "—",
        note: latestDebt
          ? `${labelMonth(latestDebt.period_start)} · end of month`
          : "Not loaded",
      },
      {
        label: "Debt % of GDP",
        value: latestPct?.value != null ? fmtPctGdp(latestPct.value) : "—",
        note: latestPct ? labelMonth(latestPct.period_start) : "Not loaded",
      },
      {
        label: "Net borrowing",
        value: latestBor?.value != null ? fmtFlowBn(latestBor.value) : "—",
        note: latestBor ? `${labelMonth(latestBor.period_start)} · month` : "Not loaded",
      },
    ];
  }, [
    view,
    pack,
    bridge,
    bridgePeriod,
    latestDebt,
    latestPct,
    latestBor,
    latestInt,
    borRoll,
    intRoll,
    anatomySlice,
    anatomyPeriod,
    basis,
    ownerSlice,
    ownerPeriod,
    ownerProvisional,
    redReading,
    redIl,
  ]);

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "data") {
    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          ECONOMY_SOURCE.publicFinances,
          "United Kingdom",
          economyPeriod("monthly"),
        )}
        definition="Observation tables for Ready public-finance and gilt-market series on this domain."
        method={[
          "Net debt is a £ billion stock. Borrowing and interest are £ million flows (shown as £bn). Debt % of GDP is the official ONS ratio.",
          "Interest is central government only. Never rebuild debt as a share of GDP from real GDP.",
          "Public-finance tables show final months only — the latest month in the release is provisional.",
          "Gilt tables are from the Debt Management Office; the sector holdings are ONS estimates published in the DMO Quarterly Review. Portfolio, ownership, redemptions and public sector net debt are four different measures and do not add up to one another.",
          "Gilts held by government bodies are official holdings of the government's own gilts. They are not a table of who owns the debt.",
          "The Series menu shows one Ready table in full. Charts on the other tabs use final months only.",
        ]}
      />
    );
    body = <DebtData pack={pack} seriesId={activeDataSeries} />;
  } else if (view === "anatomy") {
    const q = anatomyPeriod ? labelQuarterIso(anatomyPeriod) : "";
    const basisLabel = basis === "net" ? "held outside government" : "all in issue";
    const anatomyFirst = portfolioQs[0] ?? "";
    const anatomyChange =
      anatomyFirst && anatomyPeriod && anatomyFirst < anatomyPeriod
        ? portfolioSlice(portfolioRows, anatomyFirst, basis).parts.flatMap((p) => {
            const now = anatomySlice.parts.find((x) => x.id === p.id);
            return now ? [{ id: p.id, label: p.label, from: p.sharePct, to: now.sharePct }] : [];
          })
        : [];
    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          ECONOMY_SOURCE.debtPortfolio,
          "United Kingdom",
          economyPeriod("quarterly", q || null),
        )}
        definition={[
          "What central government's traded debt is made of: conventional gilts, index-linked gilts and Treasury bills held for debt management. Amounts are face value, with index-linked gilts raised for inflation to date.",
          "Held outside government leaves out gilts the Debt Management Office holds itself. All in issue includes them.",
        ]}
        method={[
          "These are central government debt instruments, not public sector net debt. The two cover different things and are valued differently, so this total does not match What Britain owes.",
          "Treasury bills are those issued for debt management only. Bills used for cash management and National Savings products are left out.",
          "Shares are worked out here from the published amounts. The maturity chart is a single-day snapshot of all gilts in issue, including those the government holds.",
        ]}
      />
    );
    body = !anatomySlice.parts.length ? (
      <EmptyStage label="Not available">
        The debt portfolio is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Debt portfolio by instrument · {q} · {basisLabel} · £bn
          </h3>
          <RankBars
            key={`debt-anatomy-${anatomyPeriod}-${basis}`}
            label={`Debt portfolio by instrument, ${q}, ${basisLabel}`}
            rows={anatomySlice.parts.map((p) => ({ id: p.id, label: p.label, v: p.value }))}
            format={fmtBn}
          />
        </section>
        {anatomyChange.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Change in share by instrument · {labelQuarterIso(anatomyFirst)} to {q} · {basisLabel} · % of the total
            </h3>
            <ChangeRows
              key={`debt-anatomy-change-${anatomyFirst}-${anatomyPeriod}-${basis}`}
              label={`Share of the debt portfolio by instrument, ${labelQuarterIso(anatomyFirst)} to ${q}`}
              rows={anatomyChange}
              fromLabel={labelQuarterIso(anatomyFirst)}
              toLabel={q}
              format={fmtSharePct}
            />
          </section>
        ) : null}
        {gilts.bands.length && gilts.asOf ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Gilts in issue by maturity · {labelDateIso(gilts.asOf)} · £bn nominal
            </h3>
            <RankBars
              key="debt-anatomy-gilts-in-issue"
              label={`Gilts in issue by maturity band, ${labelDateIso(gilts.asOf)}`}
              rows={gilts.bands.map((b) => ({ id: b.id, label: b.label, v: b.v }))}
              format={fmtBn}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "ownership") {
    const q = ownerPeriod ? labelQuarterIso(ownerPeriod) : "";
    const qTag = `${q}${ownerProvisional ? " · provisional" : ""}`;
    const showValue = ownerShow === "value";
    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          ECONOMY_SOURCE.giltOwnership,
          "United Kingdom",
          economyPeriod("quarterly", q || null),
        )}
        definition={[
          "Who holds gilts, by sector of the economy, valued at market prices. Shares are each sector's part of the sector total.",
          "This is who holds the gilts, not who the government owes the whole public debt to.",
        ]}
        method={[
          "Figures are Office for National Statistics estimates, published through the Debt Management Office's Quarterly Review, at market value in £ million — not face value. Market and face value can differ widely when gilt prices move.",
          "This is not public sector net debt, and an overseas share is not a share of that debt. The government's own holdings of its gilts are a separate measure, shown on the Data tab.",
          "Holders with under half a percent are grouped as other holders. The ONS can revise these figures after publication. A quarter marked provisional is the newest and the most likely to change. Banks here leave out the Bank of England, which appears through its Asset Purchase Facility.",
        ]}
      />
    );
    body = !ownerSlice.sectors.length ? (
      <EmptyStage label="Not available">
        Gilt holdings by sector are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Holders of gilts · {qTag} · {showValue ? "£bn, market value" : "% of the total, market value"}
          </h3>
          <RankBars
            key={`debt-owners-${ownerPeriod}-${ownerShow}`}
            label={`Holders of gilts by sector, ${qTag}`}
            rows={ownerSlice.sectors.map((x) => ({
              id: x.id,
              label: x.label,
              v: showValue ? x.value / 1000 : x.sharePct,
            }))}
            format={showValue ? fmtBn : fmtSharePct}
          />
        </section>
        {ownerChange.length && ownerFirst ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Change in share held · {labelQuarterIso(ownerFirst)} to {qTag} · % of the total
            </h3>
            <ChangeRows
              key={`debt-owners-change-${ownerFirst}-${ownerPeriod}`}
              label={`Share of gilts held by sector, ${labelQuarterIso(ownerFirst)} to ${qTag}`}
              rows={ownerChange}
              fromLabel={labelQuarterIso(ownerFirst)}
              toLabel={qTag}
              format={fmtSharePct}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "repayment") {
    const lastFy = redTotal.length ? fyLabel(redTotal[redTotal.length - 1]!.t) : null;
    const nearTerm = redTotal.slice(0, 10);
    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          ECONOMY_SOURCE.giltRedemptions,
          "United Kingdom",
          economyPeriod("annual", lastFy),
        )}
        definition={[
          "How much of the gilts held outside government is due to be repaid in each financial year (1 April to 31 March): conventional gilts, index-linked gilts and the two together.",
          "Amounts are £ million, shown as £bn. A gilt is repaid on its redemption date; the chart adds those up by year.",
        ]}
        method={[
          "Gilts the government holds itself are left out, so this is the amount due to the market. It starts with 2027–28 and leaves out the rest of 2026–27.",
          "Index-linked amounts include only part of the inflation top-up. The rest is paid in the year of repayment and counted in borrowing then. The total will not match the portfolio on Debt anatomy.",
          "The calendar changes with every new gilt sale, so every year is provisional. It is not a forecast of future gilt sales and is not public sector net debt.",
        ]}
      />
    );
    body = !redTotal.length ? (
      <EmptyStage label="Not available">
        The gilt repayment calendar is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        {nearTerm.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              The next {nearTerm.length} financial years · all gilts due · £bn
            </h3>
            <RankBars
              key="debt-repayment-near-term"
              label="Gilts due to be repaid in each of the next financial years"
              rows={nearTerm.map((p) => ({ id: String(p.t), label: fyLabel(p.t), v: p.v / 1000 }))}
              format={fmtBn}
            />
          </section>
        ) : null}
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Gilts due to be repaid each financial year · {fyLabel(redTotal[0]!.t)} to {lastFy} · £bn
          </h3>
          <TimeChart
            key="debt-repayment-calendar"
            label="Gilts due to be repaid each financial year: all gilts and index-linked"
            series={[
              { id: "total", label: "All gilts", points: redTotal },
              ...(redIl.length
                ? [{ id: "index_linked", label: "Index-linked", points: redIl, role: "reference" as const }]
                : []),
            ]}
            cadence="annual"
            kind="line"
            zero
            showTable={false}
            format={fmtMillionAsBn}
            periodLabel={fyLabel}
          />
        </section>
      </div>
    );
  } else if (view === "borrowing") {
    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          ECONOMY_SOURCE.netBorrowing,
          "United Kingdom",
          economyPeriod(
            "monthly",
            latestBor ? labelMonth(latestBor.period_start) : null,
          ),
        )}
        definition={[
          "What the public sector borrows each month. Public-sector banks are left out.",
          "Months swing with the tax and spending calendar. The 12-month sum shows the trend.",
        ]}
        method={[
          "The monthly figure is the ONS series. The 12-month sum is worked out here.",
          PSF_NOTE,
          "The latest month in each release is provisional and is left off the chart.",
        ]}
      />
    );
    body = !borPtsW.length ? (
      <EmptyStage label="Not available">
        Net borrowing is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Net borrowing · month and 12-month sum · {fmtT(borPtsW[0]!.t)}–
            {fmtT(borPtsW[borPtsW.length - 1]!.t)} · £bn
          </h3>
          <TimeChart
            key={`debt-borrowing-${fromYear}`}
            label="Public sector net borrowing"
            series={[
              ...(borRollW.length
                ? [
                    {
                      id: "borrowing-12m",
                      label: "12-month sum",
                      points: borRollW,
                    },
                  ]
                : []),
              {
                id: "public-sector-net-borrowing",
                label: "Net borrowing",
                points: borPtsW,
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
  } else if (view === "machine") {
    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          ECONOMY_SOURCE.cashBridge,
          "United Kingdom · central government",
          economyPeriod("monthly", bridgePeriod ? bridgePeriod.label : null),
        )}
        definition={[
          "How the cash central government borrows in a period turns into the change in its debt. The two are not the same: the named adjustments between them are published by the ONS and add up exactly.",
          "Central government only. The whole public sector, which also takes in local councils and public bodies, is covered by Borrowing and What Britain owes, and the two cannot be joined this way.",
        ]}
        method={[
          "Cash borrowed is the central government net cash requirement. Change in debt is the change in central government net debt. Both leave out two former bank bodies and Network Rail, as the published table does.",
          "Period figures add the published monthly figures. Lines under £5 million are left off the bars. The 12-month sums on the chart are worked out here.",
          PSF_NOTE,
          "The latest month in each release is provisional and is left out.",
        ]}
      />
    );
    body = !bridge || !bridgePeriod ? (
      <EmptyStage label="Not available">
        The central government cash-to-debt table is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Cash borrowed to change in debt · {bridgePeriod.label} · £bn
          </h3>
          <RankBars
            key={`debt-bridge-${bridgePeriod.value}`}
            label={`Central government cash borrowed and the adjustments that bring it to the change in debt, ${bridgePeriod.label}`}
            rows={[
              { id: "cash", label: "Cash borrowed", v: bridge.cash, active: true },
              ...bridge.adjustments,
            ]}
            reference={{ label: "Change in debt", v: bridge.change }}
            format={fmtFlowBn}
          />
        </section>
        {bridgeCashRoll.length && bridgeChangeRoll.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Cash borrowed and change in debt · 12-month sums · {fmtT(bridgeCashRoll[0]!.t)}–
              {fmtT(bridgeCashRoll[bridgeCashRoll.length - 1]!.t)} · £bn
            </h3>
            <TimeChart
              key="debt-bridge-roll"
              label="Central government cash borrowed and change in net debt, 12-month sums"
              series={[
                { id: "bridge-change-12m", label: "Change in debt", points: bridgeChangeRoll },
                {
                  id: "bridge-cash-12m",
                  label: "Cash borrowed",
                  points: bridgeCashRoll,
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
        ) : null}
      </div>
    );
  } else if (view === "interest") {
    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          ECONOMY_SOURCE.debtInterest,
          "United Kingdom",
          economyPeriod(
            "monthly",
            latestInt ? labelMonth(latestInt.period_start) : null,
          ),
        )}
        definition={[
          "What central government pays on its debt each month, net of interest it receives.",
          "Central government only, not the whole public sector. Months swing with the gilt calendar. The 12-month sum shows the trend.",
        ]}
        method={[
          "The monthly figure is the ONS series. The 12-month sum is worked out here.",
          "Interest and net debt cover different parts of government, so one is not divided by the other.",
          PSF_NOTE,
          "The latest month in each release is provisional and is left off the chart.",
        ]}
      />
    );
    body = !intPtsW.length ? (
      <EmptyStage label="Not available">
        Debt interest is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Debt interest · month and 12-month sum · {fmtT(intPtsW[0]!.t)}–
            {fmtT(intPtsW[intPtsW.length - 1]!.t)} · £bn
          </h3>
          <TimeChart
            key={`debt-interest-${fromYear}`}
            label="Central government debt interest"
            series={[
              ...(intRollW.length
                ? [{ id: "interest-12m", label: "12-month sum", points: intRollW }]
                : []),
              {
                id: "public-sector-debt-interest",
                label: "Debt interest",
                points: intPtsW,
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
    // What Britain owes (debt dial)
    const activePts =
      measure === "percent"
        ? pctPtsW
        : measure === "borrowing"
          ? borPtsW
          : measure === "interest"
            ? intPtsW
            : debtPtsW;
    const rollPts = measure === "borrowing" ? borRollW : measure === "interest" ? intRollW : [];
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
          : "£ billion";
    const latestIso =
      measure === "percent"
        ? latestPct?.period_start
        : measure === "borrowing"
          ? latestBor?.period_start
          : measure === "interest"
            ? latestInt?.period_start
            : latestDebt?.period_start;

    foot = (
      <FigureRecord terms={["psnb", "psnd", "gilt", "index-linked-gilt", "debt-interest"]}
        source={economySource(
          sourceLine,
          "United Kingdom",
          economyPeriod("monthly", latestIso ? labelMonth(latestIso) : null),
        )}
        definition={[
          `${label}. Public-sector banks are left out.`,
          measure === "interest"
            ? "Interest is what central government pays on its debt, net of interest it receives. It is not the whole public sector."
            : measure === "percent"
              ? "The ratio is published by the ONS. More debt in pounds does not always mean a higher ratio."
              : "Debt is what is owed at the end of the month. Borrowing and interest are what happened in the month.",
        ]}
        method={[
          measure === "borrowing" || measure === "interest"
            ? "The 12-month sum adds the last twelve months together. It is worked out here, not published."
            : "Each measure is its own published series.",
          measure === "percent"
            ? "Recent months use forecast GDP and change as actual figures arrive."
            : "Debt as a share of GDP is the published ratio, not worked out here.",
          PSF_NOTE,
          "The latest month in each release is provisional and is left off the chart.",
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
            {label} · {fmtT(activePts[0]!.t)}–
            {fmtT(activePts[activePts.length - 1]!.t)} · {unit}
          </h3>
          <TimeChart
            key={`debt-dial-${measure}-${fromYear}`}
            label={label}
            series={
              rollPts.length
                ? [
                    {
                      id: `${indicatorId}-12m`,
                      label: "12-month sum",
                      points: rollPts,
                    },
                    {
                      id: indicatorId,
                      label,
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

  // A Follow step only renders where a connection is registered for the view (connections/economy.ts).
  const followViews = new Set([
    "dial",
    "anatomy",
    "ownership",
    "repayment",
    "borrowing",
    "machine",
    "interest",
    "data",
  ]);

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
        {(view === "dial" || view === "borrowing" || view === "interest") && fromOpts.length ? (
          <MenuControl
            label="From"
            value={String(fromYear)}
            options={fromOpts}
            onChange={(id) => sync({ from: id })}
          />
        ) : null}
        {view === "anatomy" && anatomyOptions.length ? (
          <>
            <MenuControl
              label="Quarter"
              value={anatomyPeriod}
              options={anatomyOptions}
              onChange={(id) => sync({ anatomyPeriod: id })}
            />
            <MenuControl
              label="Basis"
              value={basis}
              options={BASIS_OPTIONS}
              onChange={(id) => sync({ basis: id })}
            />
          </>
        ) : null}
        {view === "ownership" && ownerOptions.length ? (
          <>
            <MenuControl
              label="Quarter"
              value={ownerPeriod}
              options={ownerOptions}
              onChange={(id) => sync({ ownerPeriod: id })}
            />
            <MenuControl
              label="Show"
              value={ownerShow}
              options={OWNER_SHOW_OPTIONS}
              onChange={(id) => sync({ ownerShow: id })}
            />
          </>
        ) : null}
        {view === "machine" && bridgeOptions.length && bridgePeriod ? (
          <MenuControl
            label="Period"
            value={bridgePeriod.value}
            options={bridgeOptions.map((p) => ({ value: p.value, label: p.label }))}
            onChange={(id) => sync({ bridgePeriod: id })}
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
        {view === "dial" ||
        view === "borrowing" ||
        view === "interest" ||
        view === "anatomy" ||
        view === "ownership" ||
        view === "machine" ||
        view === "data" ? (
          <ResetButton
            onClick={() =>
              sync({
                measure: "debt",
                anatomyPeriod: "",
                basis: "net",
                ownerPeriod: "",
                ownerShow: "share",
                bridgePeriod: "",
                from: "",
                series: "",
              })
            }
          />
        ) : null}
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

function debtDataSeriesOptions(pack: DebtPack): PrintOption<string>[] {
  const opts: PrintOption<string>[] = [];
  const push = (id: string, label: string, has: boolean) => {
    if (has) opts.push({ value: id, label });
  };
  push("public-sector-net-debt", "Net debt · £ billion", !!finalObs(pack.debt?.observations ?? []).length);
  push(
    "public-sector-net-debt-percent-gdp",
    "Net debt · % of GDP",
    !!finalObs(pack.percentGdp?.observations ?? []).length,
  );
  push(
    "public-sector-net-borrowing",
    "Net borrowing · £ billion",
    !!finalObs(pack.borrowing?.observations ?? []).length,
  );
  push(
    "public-sector-debt-interest",
    "Debt interest · £ billion",
    !!finalObs(pack.interest?.observations ?? []).length,
  );
  for (const tbl of instrumentTables(pack)) {
    opts.push({ value: tbl.id, label: tbl.title.split(" · ")[0] ?? tbl.title });
  }
  return opts;
}

function DebtData({ pack, seriesId }: { pack: DebtPack; seriesId: string }) {
  const tables = [
    { id: "public-sector-net-debt", title: "Net debt · £ billion", pack: pack.debt, fmt: fmtDebtBn },
    {
      id: "public-sector-net-debt-percent-gdp",
      title: "Net debt · % of GDP",
      pack: pack.percentGdp,
      fmt: fmtPctGdp,
    },
    {
      id: "public-sector-net-borrowing",
      title: "Net borrowing · £ billion",
      pack: pack.borrowing,
      fmt: fmtFlowBn,
    },
    {
      id: "public-sector-debt-interest",
      title: "Debt interest · central government · £ billion",
      pack: pack.interest,
      fmt: fmtFlowBn,
    },
  ];
  const instruments = instrumentTables(pack);
  const monthly = tables.find((x) => x.id === seriesId);
  const instrument = instruments.find((x) => x.id === seriesId);
  if (!monthly && !instrument) {
    return (
      <EmptyStage label="In preparation">
        Public-finance series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  if (monthly) {
    const rows = finalObs(monthly.pack?.observations ?? []).slice().reverse();
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
          <p className={t.stageTitle}>{monthly.title}</p>
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
                  <tr key={`${monthly.id}-${r.period_start}`}>
                    <td>{fmtT(periodPoints([r])[0]!.t)}</td>
                    <td>{monthly.fmt(r.value as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={s.stack}>
      <div className={t.tableGroup}>
        <p className={t.stageTitle}>{instrument!.title}</p>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead>
              <tr>
                {instrument!.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instrument!.rows.map((cells) => (
                <tr key={`${instrument!.id}-${cells[0]}-${cells[1]}`}>
                  {cells.map((c, i) => (
                    <td key={`${instrument!.head[i]}-${c}`}>{c}</td>
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

type InstrumentTable = { id: string; title: string; head: string[]; rows: string[][] };

/**
 * Gilt-market observation tables for the Data view — built from the same model the charts use,
 * so a number on a chart is always in a table. A table with no rows is simply left out.
 */
function instrumentTables(pack: DebtPack): InstrumentTable[] {
  const out: InstrumentTable[] = [];
  const dash = (v: number | null | undefined, fmt: (n: number) => string) =>
    v != null ? fmt(v) : "—";

  const portfolioRows = pack.portfolio?.observations ?? [];
  const qs = portfolioPeriods(portfolioRows).slice().reverse();
  const portfolioBody = qs.flatMap((p) =>
    (["net", "gross"] as const).map((b) => {
      const sl = portfolioSlice(portfolioRows, p, b);
      const val = (id: string) => sl.parts.find((x) => x.id === id)?.value;
      return [
        labelQuarterIso(p),
        b === "net" ? "Net of DMO holdings" : "Gross",
        dash(val("conventional-gilts"), fmtBn),
        dash(val("index-linked-gilts"), fmtBn),
        dash(val("treasury-bills"), fmtBn),
        dash(sl.total, fmtBn),
      ];
    }),
  );
  if (portfolioBody.length) {
    out.push({
      id: "dmo-debt-portfolio-composition",
      title: "Debt portfolio by instrument · £ billion, uplifted nominal · central government, not public sector net debt",
      head: ["Quarter", "Basis", "Conventional gilts", "Index-linked gilts", "Treasury bills", "Portfolio"],
      rows: portfolioBody,
    });
  }

  const gilts = giltBands(pack.giltsInIssue?.observations ?? []);
  if (gilts.bands.length && gilts.asOf) {
    out.push({
      id: "dmo-gilts-in-issue",
      title: `Gilts in issue · ${labelDateIso(gilts.asOf)} · £ billion nominal (index-linked including uplift)`,
      head: ["Group", "Gilts", "£ billion"],
      rows: [
        ...gilts.bands.map((b) => [b.label, String(b.count), fmtBn(b.v)]),
        ["All gilts in issue", String(gilts.bands.reduce((n, b) => n + b.count, 0)), dash(gilts.totalBn, fmtBn)],
      ],
    });
  }

  const ownerRows = pack.ownership?.observations ?? [];
  const ownerQs = ownershipPeriods(ownerRows).slice().reverse();
  if (ownerQs.length) {
    const latest = ownerQs[0]!.period;
    const slices = ownerQs.map((p) => ({ p, sl: ownershipSlice(ownerRows, p.period) }));
    const sectors = ownershipSlice(ownerRows, latest).sectors;
    if (sectors.length) {
      out.push({
        id: "gilt-holdings-by-sector",
        title: "Gilts held by sector · £ billion, market value · ONS estimates, may be revised",
        head: [
          "Sector",
          ...slices.map(({ p }) => `${labelQuarterIso(p.period)}${p.provisional ? " · provisional" : ""}`),
        ],
        rows: [
          ...sectors.map((sec) => [
            sec.label,
            ...slices.map(({ sl }) =>
              dash(sl.sectors.find((x) => x.id === sec.id)?.value, (n) => fmtBn(n / 1000)),
            ),
          ]),
          ["Total", ...slices.map(({ sl }) => dash(sl.total, (n) => fmtBn(n / 1000)))],
        ],
      });
    }
  }

  const redTotal = redemptionPoints(pack.redemptions?.observations ?? [], "total");
  if (redTotal.length) {
    const conv = new Map(redemptionPoints(pack.redemptions?.observations ?? [], "conventional").map((p) => [p.t, p.v]));
    const il = new Map(redemptionPoints(pack.redemptions?.observations ?? [], "index_linked").map((p) => [p.t, p.v]));
    out.push({
      id: "dmo-gilt-future-redemptions",
      title: "Gilts due to be repaid by financial year · £ billion · net of government holdings · provisional",
      head: ["Financial year", "Conventional", "Index-linked", "All gilts"],
      rows: redTotal.map((p) => [
        fyLabel(p.t),
        dash(conv.get(p.t), fmtMillionAsBn),
        dash(il.get(p.t), fmtMillionAsBn),
        fmtMillionAsBn(p.v),
      ]),
    });
  }

  const holdings = holdingsByMonth(pack.governmentHoldings?.observations ?? []);
  if (holdings.length) {
    out.push({
      id: "dmo-government-holdings",
      title: "Gilts held by government bodies · £ billion nominal · the government's own holdings, not who owns the debt",
      head: ["Month", "Conventional", "Index-linked", "All gilts"],
      rows: holdings.map((h) => [
        labelMonth(h.period),
        dash(h.conventional, fmtMillionAsBn),
        dash(h.indexLinked, fmtMillionAsBn),
        dash(h.total, fmtMillionAsBn),
      ]),
    });
  }

  const bridgeAll = pack.cashBridge?.observations ?? [];
  const bridgeYears = bridgePeriods(bridgeAll).filter((p) => p.value !== "last12");
  if (bridgeYears.length) {
    out.push({
      id: "cg-cash-debt-reconciliation",
      title: "Cash borrowed to change in debt · central government · £ billion · financial years",
      head: ["Year", "Cash borrowed", "Adjustments", "Change in debt"],
      rows: bridgeYears.map((p) => {
        const sl = bridgeSlice(bridgeAll, p);
        return [p.label, fmtFlowBn(sl.cash), fmtFlowBn(sl.change - sl.cash), fmtFlowBn(sl.change)];
      }),
    });
  }
  return out;
}

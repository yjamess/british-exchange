"use client";

/**
 * Economy Domain 06 — Taxation & Revenue.
 * Flagship: What Britain Raises — ONS AHHY public-sector taxes + NICs (not HMRC cash).
 * Anatomy: Appendix D composition under AHHY (MF6P + AIIH + NMHM + AHGR),
 * with optional CG drill under MF6P (NMBY + NMCU + LIQR).
 * Tax Machine: educational statute calculator (Validated rules) — not tax advice.
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
import tm from "./taxMachine.module.css";
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import { finalObs, fmtFlowBn, periodPoints, rolling12mSum } from "./debt-model";
import type { TaxPack } from "./types";
import {
  ANATOMY_LEVEL_OPTIONS,
  REVENUE_MEASURE_OPTIONS,
  anatomyCgLatestRanks,
  anatomyCgRollingSeries,
  anatomyCgRows,
  anatomyLatestRanks,
  anatomyRollingSeries,
  anatomyRows,
  fmtAnatomyBn,
  fmtAnatomyShare,
  type AnatomyLevel,
  type RevenueMeasure,
} from "./tax-anatomy-model";
import { RevenueRows } from "./RevenueRows";
import {
  BURDEN_VIEW_OPTIONS,
  asBurdenView,
  burdenRows,
  fmtBurdenGbp,
  fmtBurdenShare,
  isBurdenViewShare,
  type BurdenView,
} from "./tax-burden-model";
import { BurdenRows } from "./BurdenRows";
import {
  GAP_HISTORY_OPTIONS,
  GAP_MODE_OPTIONS,
  fmtGapBn,
  fmtGapPercent,
  gapByBehaviourRanks,
  gapByTaxRanks,
  gapHeadline,
  gapHistoryPoints,
  gapPeriodLabel,
  type GapHistoryMeasure,
  type GapMode,
} from "./tax-gap-model";
import {
  TAX_MACHINE_INCOMES,
  TAX_MACHINE_JURISDICTIONS,
  formatGbp,
  rulesFromObservations,
  runTaxMachine,
  taxYearLabel,
  type TaxJurisdiction,
} from "./tax-machine-model";
import {
  archiveFromObservations,
  fiscalDragFigures,
  fiscalDragHasCounterfactual,
  fiscalDragProfile,
  fiscalDragProfileOptions,
  fiscalDragTaxSeries,
  fmtGbpWhole,
  fmtPercent,
  fmtPp,
  historyPeriodLabel,
  incomeTaxYearOptions,
  timeMachineFigures,
  yearRows,
  yearRulesFromArchive,
} from "./tax-timemachine-model";
import { TaxDragRows, TaxRuleStrips, TaxYearRows } from "./TaxMachine";
import { Term } from "../term";

/** Notion Domain 06 six experiences + Data (brief order). */
const VIEWS: ExplorerView[] = [
  { id: "raises", label: "What Britain raises" },
  { id: "machine", label: "The Tax Machine" },
  { id: "burden", label: "Who Bears the Tax Burden?" },
  { id: "gap", label: "The Tax Gap" },
  { id: "data", label: "Data" },
];

const DEFAULT_GROSS = "80000";
const DEFAULT_JURIS: TaxJurisdiction = "england-wales-ni";

/** The Tax Machine runs on one rules archive; its focus turns the year dial or walks the years. */
type MachineFocus = "rules" | "history" | "drag";
const MACHINE_FOCUS_OPTIONS: { value: MachineFocus; label: string }[] = [
  { value: "rules", label: "This year's rules" },
  { value: "history", label: "How the rules changed" },
  { value: "drag", label: "Frozen thresholds" },
];

function asView(raw: string | null): string {
  if (raw === "timemachine") return "machine";
  if (raw === "anatomy") return "raises";
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "raises";
}

function asFocus(raw: string | null, view: string | null): MachineFocus {
  if (MACHINE_FOCUS_OPTIONS.some((m) => m.value === raw)) return raw as MachineFocus;
  if (view === "timemachine") return raw === "fiscal-drag" ? "drag" : "history";
  return "rules";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Tax";
}

function labelMonth(iso: string): string {
  return fmtT(Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12, "monthly");
}

function asJuris(raw: string | null): TaxJurisdiction {
  return TAX_MACHINE_JURISDICTIONS.some((j) => j.value === raw)
    ? (raw as TaxJurisdiction)
    : DEFAULT_JURIS;
}

function asGross(raw: string | null): string {
  return TAX_MACHINE_INCOMES.some((i) => i.value === raw) ? (raw as string) : DEFAULT_GROSS;
}

function asGapMode(raw: string | null): GapMode {
  return GAP_MODE_OPTIONS.some((m) => m.value === raw) ? (raw as GapMode) : "by_tax";
}

function asGapHistory(raw: string | null): GapHistoryMeasure {
  return GAP_HISTORY_OPTIONS.some((m) => m.value === raw)
    ? (raw as GapHistoryMeasure)
    : "gbp";
}

function asRevenueMeasure(raw: string | null, view: string | null): RevenueMeasure {
  if (REVENUE_MEASURE_OPTIONS.some((m) => m.value === raw)) return raw as RevenueMeasure;
  if (view === "anatomy") return "absolute";
  return "total";
}

function asAnatomyLevel(raw: string | null): AnatomyLevel {
  return ANATOMY_LEVEL_OPTIONS.some((m) => m.value === raw)
    ? (raw as AnatomyLevel)
    : "ahhy";
}

export function TaxCanvas({ pack }: { pack: TaxPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [taxYear, setTaxYear] = useState(() => searchParams.get("ty") ?? "");
  const [juris, setJuris] = useState<TaxJurisdiction>(() => asJuris(searchParams.get("juris")));
  const [gross, setGross] = useState(() => asGross(searchParams.get("gross")));
  const [anatomyLevel, setAnatomyLevel] = useState<AnatomyLevel>(() =>
    asAnatomyLevel(searchParams.get("al")),
  );
  const [revenueMeasure, setRevenueMeasure] = useState<RevenueMeasure>(() =>
    asRevenueMeasure(searchParams.get("measure"), searchParams.get("view")),
  );
  const anatomyMeasure = revenueMeasure === "share" ? "share" : "absolute";
  const [burdenView, setBurdenView] = useState<BurdenView>(() =>
    asBurdenView(searchParams.get("bm")),
  );
  const [gapMode, setGapMode] = useState<GapMode>(() => asGapMode(searchParams.get("gm")));
  const [gapHistory, setGapHistory] = useState<GapHistoryMeasure>(() =>
    asGapHistory(searchParams.get("gh")),
  );
  const [focus, setFocus] = useState<MachineFocus>(() =>
    asFocus(searchParams.get("tf"), searchParams.get("view")),
  );
  const [dragProfileId, setDragProfileId] = useState(() => searchParams.get("dp") ?? "");

  const yearRules = useMemo(
    () => rulesFromObservations(pack.taxMachineRules?.observations ?? []),
    [pack.taxMachineRules],
  );
  const historyArchive = useMemo(
    () => archiveFromObservations(pack.taxTimeMachine?.observations ?? []),
    [pack.taxTimeMachine],
  );
  const dragProfileOptions = useMemo(
    () => fiscalDragProfileOptions(pack.fiscalDrag),
    [pack.fiscalDrag],
  );
  const activeDragProfileId = useMemo(() => {
    if (dragProfileId && dragProfileOptions.some((o) => o.value === dragProfileId)) {
      return dragProfileId;
    }
    return dragProfileOptions[0]?.value ?? "";
  }, [dragProfileId, dragProfileOptions]);
  const activeDragProfile = useMemo(
    () => fiscalDragProfile(pack.fiscalDrag, activeDragProfileId),
    [pack.fiscalDrag, activeDragProfileId],
  );
  const dragFigures = useMemo(() => fiscalDragFigures(activeDragProfile), [activeDragProfile]);
  /** Tax years the machine can run: every pinned archive year for the place, else the statute pin. */
  const yearOptions = useMemo(() => {
    const fromArchive = incomeTaxYearOptions(historyArchive, juris);
    if (fromArchive.length) return fromArchive;
    return yearRules.map((r) => ({ value: r.taxYear, label: taxYearLabel(r.taxYear) }));
  }, [historyArchive, juris, yearRules]);
  const activeYearId = useMemo(() => {
    if (taxYear && yearOptions.some((o) => o.value === taxYear)) return taxYear;
    return yearOptions[yearOptions.length - 1]?.value ?? "";
  }, [taxYear, yearOptions]);
  /** The Ready statute pin when it covers the year (annual NI thresholds); otherwise the archive. */
  const activeRules = useMemo(() => {
    if (!activeYearId) return null;
    return (
      yearRules.find((r) => r.taxYear === activeYearId) ??
      yearRulesFromArchive(historyArchive, activeYearId)
    );
  }, [yearRules, historyArchive, activeYearId]);
  const result = useMemo(() => {
    if (!activeRules) return null;
    return runTaxMachine(activeRules, juris, Number(gross));
  }, [activeRules, juris, gross]);
  const machineRows = useMemo(() => yearRows(historyArchive, juris), [historyArchive, juris]);
  const tmFigures = useMemo(
    () => timeMachineFigures(historyArchive, juris, "income-tax"),
    [historyArchive, juris],
  );
  const dragJuris: TaxJurisdiction =
    activeDragProfile?.jurisdiction === "scotland" ? "scotland" : "england-wales-ni";
  const dragRows = useMemo(() => {
    if (!activeDragProfile) return [];
    const wanted = new Set(activeDragProfile.years.map((y) => y.tax_year));
    return yearRows(historyArchive, dragJuris).filter((r) => wanted.has(r.taxYear));
  }, [historyArchive, activeDragProfile, dragJuris]);
  const showDrag = focus === "drag" && !!activeDragProfile;

  const sync = useCallback(
    (next: {
      view?: string;
      ty?: string;
      juris?: TaxJurisdiction;
      gross?: string;
      al?: AnatomyLevel;
      measure?: RevenueMeasure;
      bm?: BurdenView;
      gm?: GapMode;
      gh?: GapHistoryMeasure;
      tf?: MachineFocus;
      dp?: string;
    }) => {
      const v = next.view ?? view;
      const ty = next.ty ?? activeYearId;
      const j = next.juris ?? juris;
      const g = next.gross ?? gross;
      const al = next.al ?? anatomyLevel;
      const m = next.measure ?? revenueMeasure;
      const bm = next.bm ?? burdenView;
      const gm = next.gm ?? gapMode;
      const gh = next.gh ?? gapHistory;
      const tf = next.tf ?? focus;
      const dp = next.dp ?? activeDragProfileId;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "tax");
      u.set("view", v);
      for (const k of ["ty", "juris", "gross", "al", "measure", "bm", "gm", "gh", "ts", "tf", "dp", "hty"]) {
        u.delete(k);
      }
      if (v === "machine") {
        u.set("tf", tf);
        if (tf === "drag") {
          if (dp) u.set("dp", dp);
        } else {
          u.set("juris", j);
          u.set("gross", g);
          if (tf === "rules" && ty) u.set("ty", ty);
        }
      } else if (v === "raises") {
        u.set("measure", m);
        if (m !== "total") u.set("al", al);
      } else if (v === "burden") {
        u.set("bm", bm);
      } else if (v === "gap") {
        u.set("gm", gm);
        if (gm === "history") u.set("gh", gh);
      }
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.ty != null) setTaxYear(next.ty);
      if (next.juris != null) setJuris(next.juris);
      if (next.gross != null) setGross(next.gross);
      if (next.al != null) setAnatomyLevel(next.al);
      if (next.measure != null) setRevenueMeasure(next.measure);
      if (next.bm != null) setBurdenView(next.bm);
      if (next.gm != null) setGapMode(next.gm);
      if (next.gh != null) setGapHistory(next.gh);
      if (next.tf != null) setFocus(next.tf);
      if (next.dp != null) setDragProfileId(next.dp);
    },
    [
      pathname,
      view,
      activeYearId,
      juris,
      gross,
      anatomyLevel,
      revenueMeasure,
      burdenView,
      gapMode,
      gapHistory,
      focus,
      activeDragProfileId,
    ],
  );

  const compositionRows = pack.taxComposition?.observations ?? [];
  const cgCompositionRows = pack.taxCgComposition?.observations ?? [];
  const anatomyStack = useMemo(
    () =>
      anatomyLevel === "cg"
        ? anatomyCgRollingSeries(cgCompositionRows)
        : anatomyRollingSeries(compositionRows),
    [anatomyLevel, cgCompositionRows, compositionRows],
  );
  const anatomyLatest = useMemo(
    () =>
      anatomyLevel === "cg"
        ? anatomyCgLatestRanks(cgCompositionRows, anatomyMeasure)
        : anatomyLatestRanks(compositionRows, anatomyMeasure),
    [anatomyLevel, cgCompositionRows, compositionRows, anatomyMeasure],
  );
  const revenueRows = useMemo(
    () => (anatomyLevel === "cg" ? anatomyCgRows(cgCompositionRows) : anatomyRows(compositionRows)),
    [anatomyLevel, cgCompositionRows, compositionRows],
  );
  const burdenSlice = useMemo(
    () => burdenRows(pack.taxBurden?.observations ?? [], burdenView),
    [pack.taxBurden, burdenView],
  );
  const gapRows = pack.taxGap?.observations ?? [];
  const gapHead = useMemo(() => gapHeadline(gapRows), [gapRows]);
  const gapTaxSlice = useMemo(() => gapByTaxRanks(gapRows), [gapRows]);
  const gapBehSlice = useMemo(() => gapByBehaviourRanks(gapRows), [gapRows]);
  const gapHistPts = useMemo(
    () => gapHistoryPoints(gapRows, gapHistory),
    [gapRows, gapHistory],
  );

  const rows = pack.taxReceipts?.observations ?? [];
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

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "raises" && revenueMeasure === "total") {
      return [
        {
          label: "Latest month",
          value: latest?.value != null ? fmtFlowBn(latest.value as number) : "—",
          note: latest ? labelMonth(latest.period_start) : "Taxes and National Insurance",
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
    if (view === "raises" && anatomyLatest) {
      const top = anatomyLatest.ranks[0];
      const cg = anatomyLevel === "cg";
      return [
        {
          label: "Composition total",
          value: fmtAnatomyBn(anatomyLatest.totalM / 1000),
          note: cg
            ? `${labelMonth(anatomyLatest.period)} · three heads under central government`
            : `${labelMonth(anatomyLatest.period)} · all four heads`,
        },
        {
          label: top?.label ?? "Largest head",
          value:
            anatomyMeasure === "share"
              ? fmtAnatomyShare(top?.v ?? 0)
              : fmtAnatomyBn(top?.v ?? 0),
          note: anatomyMeasure === "share" ? "Share of that month’s total" : "Largest head that month",
        },
        {
          label: "Heads in the stack",
          value: String(anatomyLatest.ranks.length),
          note: cg
            ? "Production · income and wealth · other CG"
            : "Central government · NICs · council tax · other local",
        },
      ];
    }
    if (view === "burden" && burdenSlice) {
      const fmt = isBurdenViewShare(burdenView) ? fmtBurdenShare : fmtBurdenGbp;
      const pick = (id: string) => burdenSlice.rows.find((r) => r.id === id);
      const val = (id: string) => {
        const r = pick(id);
        const v = r?.all ?? r?.indirect ?? null;
        return v != null ? fmt(v) : "—";
      };
      const what = burdenView === "gross" ? "All taxes" : burdenView === "gbp" ? "Direct and indirect" : "Indirect taxes";
      return [
        { label: `Lowest-income fifth · ${what}`, value: val("bottom"), note: burdenSlice.periodLabel },
        { label: `Highest-income fifth · ${what}`, value: val("top"), note: "Households ranked by income, in five equal groups" },
        { label: `All households · ${what}`, value: val("all"), note: "Survey group average — not one household" },
      ];
    }
    if (view === "machine" && focus === "rules" && result) {
      return [
        {
          label: "Income tax",
          value: formatGbp(result.incomeTax),
          note: `${taxYearLabel(result.taxYear)} · modelled statutory liability`,
        },
        {
          label: "Employee National Insurance",
          value: result.employeeNics != null ? formatGbp(result.employeeNics) : "—",
          note:
            result.employeeNics != null
              ? "Class 1 category A — separate stage"
              : "Rates changed during this tax year",
        },
        {
          label: "Sum of both stages",
          value: result.combined != null ? formatGbp(result.combined) : "—",
          note: "Not a single blended tax rate",
        },
      ];
    }
    if (view === "gap" && gapHead) {
      return [
        {
          label: "Tax gap",
          value: fmtGapBn(gapHead.gapBn),
          note: gapHead.provisional
            ? `${gapHead.taxYearLabel} · provisional`
            : gapHead.taxYearLabel,
        },
        {
          label: "Share of theoretical liabilities",
          value: fmtGapPercent(gapHead.gapPercent),
          note: "HMRC estimate — not cash collected",
        },
        {
          label: "Theoretical liabilities",
          value: fmtGapBn(gapHead.theoreticalBn),
          note: "Tax year total HMRC estimates as due",
        },
      ];
    }
    if (view === "machine" && showDrag && activeDragProfile) {
      return [
        {
          label: "Effective income-tax rate",
          value:
            dragFigures.effectiveRateEnd != null
              ? fmtPercent(dragFigures.effectiveRateEnd)
              : "—",
          note: dragFigures.spanLabel
            ? `End year · ${dragFigures.spanLabel}`
            : "Hypothetical profile",
        },
        {
          label: "Change in effective rate",
          value:
            dragFigures.effectiveRateChangePp != null
              ? fmtPp(dragFigures.effectiveRateChangePp)
              : "—",
          note: "Income tax only · National Insurance excluded",
        },
        {
          label: fiscalDragHasCounterfactual(activeDragProfile)
            ? "Extra tax vs indexed thresholds"
            : "Profile window",
          value: fiscalDragHasCounterfactual(activeDragProfile)
            ? dragFigures.extraTaxEnd != null
              ? fmtGbpWhole(dragFigures.extraTaxEnd)
              : "—"
            : dragFigures.spanLabel,
          note: fiscalDragHasCounterfactual(activeDragProfile)
            ? "England, Wales & NI · end year"
            : "Scotland · actual Scottish bands",
        },
      ];
    }
    if (view === "machine" && focus === "history" && historyArchive.incomeTaxYears.length) {
      return [
        {
          label: "Personal allowance",
          value:
            tmFigures.personalAllowance != null
              ? fmtGbpWhole(tmFigures.personalAllowance)
              : "—",
          note: tmFigures.yearLabel
            ? `Latest pinned · ${tmFigures.yearLabel}`
            : "Latest pinned year",
        },
        {
          label: "Basic rate",
          value: tmFigures.basicRate != null ? fmtPercent(tmFigures.basicRate) : "—",
          note: "Income-tax basic (or starter) rate",
        },
        {
          label: "Archive span",
          value: tmFigures.spanLabel,
          note: "Tax years in the pinned archive",
        },
      ];
    }
    return [];
  }, [
    view,
    revenueMeasure,
    latest,
    latestRoll,
    yoy,
    result,
    anatomyLatest,
    anatomyLevel,
    anatomyMeasure,
    burdenSlice,
    burdenView,
    gapHead,
    historyArchive.incomeTaxYears.length,
    tmFigures,
    focus,
    showDrag,
    activeDragProfile,
    dragFigures,
  ]);

  const jurisLabel =
    TAX_MACHINE_JURISDICTIONS.find((j) => j.value === juris)?.label ?? juris;

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "raises" && revenueMeasure === "total") {
    foot = (
      <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
        source={economySource(
          ECONOMY_SOURCE.taxReceipts,
          "United Kingdom",
          economyPeriod("monthly", latest ? labelMonth(latest.period_start) : null),
        )}
        definition={[
          "Public-sector taxes and National Insurance contributions raised each month, in current pounds.",
          "This is the Office for National Statistics public-finances measure — not HMRC's monthly cash receipts bulletin.",
        ]}
        method={[
          "Figures are seasonally unadjusted. Months swing with the tax calendar. The 12-month sum is worked out here to show the trend.",
          "These are month levels, not financial-year-to-date totals. The latest month in each release is provisional and is left off the chart.",
          "Do not treat this as a share of GDP — that needs a separate official ratio series.",
        ]}
      />
    );
    body = !monthPts.length ? (
      <EmptyStage label="Not available">
        Tax and National Insurance receipts are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Taxes and National Insurance · month and 12-month sum ·{" "}
            {fmtT(monthPts[0]!.t)}–{fmtT(monthPts[monthPts.length - 1]!.t)} · £bn
          </h3>
          <TimeChart
            key="tax-raises"
            label="Public-sector taxes and National Insurance contributions"
            series={[
              ...(rollPts.length
                ? [{ id: "tax-12m", label: "12-month sum", points: rollPts }]
                : []),
              {
                id: "tax-receipts",
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
  } else if (view === "raises") {
    const anatomyPeriodLabel = anatomyLatest ? labelMonth(anatomyLatest.period) : null;
    const cg = anatomyLevel === "cg";
    const share = revenueMeasure === "share";
    foot = (
      <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
        source={economySource(
          cg
            ? ECONOMY_SOURCE.taxReceiptsCgComposition
            : ECONOMY_SOURCE.taxReceiptsComposition,
          "United Kingdom",
          economyPeriod("monthly", anatomyPeriodLabel),
        )}
        definition={
          cg
            ? [
                "How central government tax receipts break down under the central-government taxes total — taxes on production, taxes on income and wealth, and other central government taxes.",
                "These heads are the Office for National Statistics public-finances (accruals) drill. Their sum matches the central government taxes head (MF6P), not the full public-sector total.",
              ]
            : [
                "How public-sector tax and National Insurance receipts break down — central government taxes, social contributions, council tax, and other local government taxes.",
                "These heads are the Office for National Statistics public-finances (accruals) breakdown. Their sum matches the Total receipts measure.",
              ]
        }
        method={
          cg
            ? [
                "Published identity: taxes on production + taxes on income and wealth + other central government taxes = central government taxes (MF6P).",
                "Accruals / National Accounts — not HMRC monthly cash receipts. Charts use final months only, and only months where all three heads are present. Deeper tax-type leaves are not shown here.",
                "The rows take the latest complete month and the same calendar month every five years back, so the tax calendar does not distort the comparison. The chart sums each head over the latest 12 months, worked out here, and the share divides each head by that 12-month total.",
              ]
            : [
                "Published identity: central government taxes + social contributions + council tax + other local government taxes = total public-sector taxes and National Insurance (AHHY).",
                "Accruals / National Accounts — not HMRC monthly cash receipts. Charts use final months only, and only months where all four heads are present. Other local government taxes can be a small negative and then take no length in the rows.",
                "The rows take the latest complete month and the same calendar month every five years back, so the tax calendar does not distort the comparison. The chart sums each head over the latest 12 months, worked out here, and the share divides each head by that 12-month total.",
              ]
        }
      />
    );
    body = !anatomyStack.some((sr) => sr.points.length) || !anatomyLatest || !revenueRows.length ? (
      <EmptyStage label="Not available">
        {cg
          ? "Central government tax composition series are not loaded from the Exchange API right now."
          : "Tax composition series are not loaded from the Exchange API right now."}
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {cg ? "Central government taxes" : "Taxes and National Insurance"} · by head ·{" "}
            {revenueRows[0]!.label} to {revenueRows[revenueRows.length - 1]!.label} · every five years ·{" "}
            {share ? "share of the month" : "£bn"}
          </h3>
          <RevenueRows
            key={`tax-revenue-rows-${anatomyLevel}-${revenueMeasure}`}
            rows={revenueRows}
            measure={share ? "share" : "absolute"}
            label={cg ? "Central government tax composition" : "Tax composition by head"}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {share ? "Share of the 12-month total · " : "Each head · 12-month sum · "}
            {fmtT(anatomyStack[0]!.points[0]!.t, "monthly")}–{anatomyPeriodLabel} · {share ? "%" : "£bn"}
          </h3>
          <TimeChart
            key={`tax-anatomy-${anatomyLevel}-${revenueMeasure}`}
            label={cg ? "Central government tax composition" : "Public-sector tax composition"}
            series={anatomyStack}
            cadence="monthly"
            kind={share ? "stack" : "line"}
            zero
            showTable={false}
            format={fmtAnatomyBn}
            periodLabel={(tt) => fmtT(tt, "monthly")}
          />
        </section>
      </div>
    );
  } else if (view === "machine") {
    const profileMenuLabel = activeDragProfile
      ? (dragProfileOptions.find((o) => o.value === activeDragProfile.profile_id)?.label ??
        activeDragProfile.label)
      : "";
    const fromPin = activeRules?.basis === "pin";
    if (focus === "drag") {
      foot = (
        <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
          source={economySource(
            ECONOMY_SOURCE.taxFiscalDrag,
            "Great Britain (earnings path) · England, Wales & NI or Scotland (tax rules)",
            economyPeriod("annual", dragFigures.spanLabel !== "—" ? dragFigures.spanLabel : null),
          )}
          definition={[
            "Educational worked examples of how income-tax liability changes when personal allowance and basic-rate thresholds stay frozen while a labelled earnings path rises — not tax advice and not a personal tax calculation.",
            "Profiles are hypothetical. The earnings growth path is observed average weekly earnings regular pay for Great Britain (ONS series KAI7), annualised by tax year. National Insurance is excluded from these examples.",
          ]}
          method={[
            "England, Wales and Northern Ireland examples hold the pinned personal allowance and basic-rate upper limit across 2021–22…2025–26, and compare that freeze with a counterfactual where those two thresholds rise with the same KAI7 path (rates unchanged; additional-rate threshold follows actual statute).",
            "The Scotland example uses the same earnings path but actual pinned Scottish bands each year — no invented Scotland freeze and no copy of England, Wales and Northern Ireland thresholds. Starting levels are labelled hypothetical; growth is not invented. Not ASHE; not Northern Ireland earnings; not take-home pay.",
            "The rule runs £0 to £140,000 in every drawing so bands can be compared across years and places on one scale.",
          ]}
        />
      );
    } else if (focus === "history") {
      foot = (
        <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
          source={economySource(
            ECONOMY_SOURCE.taxTimeMachine,
            jurisLabel,
            economyPeriod("annual", historyArchive.spanLabel !== "—" ? historyArchive.spanLabel : null),
          )}
          definition={[
            "How income-tax rates, allowances and thresholds have changed since 2010–11, drawn on one gross-income rule, one row per tax year. Employee Class 1 National Insurance thresholds are marked beneath each row as a separate stage.",
            "Educational illustration of dated statutory rules — not tax advice and not a substitute for HMRC guidance or a personal tax calculation.",
          ]}
          method={[
            "Pinned from HMRC Tables A.1 (allowances), A.2 (income-tax rates) and A.4 (National Insurance). Scotland 2010–11…2016–17 mirrors England, Wales and Northern Ireland (labelled on the row). Scotland 2017–18…2022–23 from gov.scot / HMRC Scottish Income Tax tables; 2023–24…2026–27 from GOV.UK.",
            "Band edges are statute after-allowance figures placed on the gross rule by adding that year's personal allowance. National Insurance marks are the published weekly thresholds ×52 for education only. Tax years 2022–23 and 2023–24 changed National Insurance rates mid-year and carry no marks.",
            "The rule runs £0 to £140,000 in every drawing so bands can be compared across years and places on one scale. The chosen income fills each year's bands up to that point.",
          ]}
        />
      );
    } else {
      foot = (
        <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
          source={economySource(
            fromPin ? ECONOMY_SOURCE.taxMachineRules : ECONOMY_SOURCE.taxTimeMachine,
            jurisLabel,
            economyPeriod("annual", activeYearId ? taxYearLabel(activeYearId) : null),
          )}
          definition={[
            "How a taxable activity becomes a calculated liability — personal allowance, income-tax bands and employee Class 1 National Insurance as separate stages, drawn on one gross-income rule.",
            "Educational illustration of dated statutory rules — not tax advice and not a substitute for HMRC guidance or a personal tax calculation.",
          ]}
          method={[
            "Hypothetical taxable employment income only. Presets stay at or below £100,000 so the personal-allowance taper is not used. Scotland uses a labelled alternate band table; National Insurance thresholds are UK-wide for Class 1 category A.",
            fromPin
              ? "Liabilities are modelled from Validated GOV.UK rate tables served by the Exchange API. The sum of income tax and National Insurance is not a single blended tax rate. Statutory incidence is not the same as economic incidence."
              : "Liabilities for this tax year are modelled from the pinned HMRC archive. National Insurance thresholds are the published weekly figures ×52 for education only and may differ from the annual PAYE thresholds. Tax years 2022–23 and 2023–24 changed National Insurance rates mid-year, so no single National Insurance liability is drawn for them.",
            "Band segments are the band's width in gross pounds; the block beneath each band is the tax it takes, on the same pounds scale. The rule runs £0 to £140,000 in every drawing.",
            "Out of scope here: pensions relief, marriage allowance, student loans, benefits in kind, savings and dividend income, employer National Insurance, and other taxes.",
          ]}
        />
      );
    }

    if (focus === "drag") {
      if (!activeDragProfile) {
        body = (
          <EmptyStage label="Not available">
            Frozen-threshold examples are not loaded from the Exchange API right now.
          </EmptyStage>
        );
      } else {
        const taxSeries = fiscalDragTaxSeries(activeDragProfile);
        const hasCf = fiscalDragHasCounterfactual(activeDragProfile);
        body = (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Where average earnings sit in the bands · {profileMenuLabel} · {dragFigures.spanLabel}
              </h3>
              <TaxDragRows
                profile={activeDragProfile}
                rows={dragRows}
                label="Earnings path across frozen income-tax bands"
              />
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Income tax · {profileMenuLabel} · {dragFigures.spanLabel} · £
              </h3>
              {taxSeries.actual.length ? (
                <TimeChart
                  key={`tax-tm-drag-tax-${activeDragProfile.profile_id}`}
                  label="Income tax"
                  series={
                    hasCf && taxSeries.counterfactual.length
                      ? [
                          { id: "tax-actual", label: "Under frozen thresholds", points: taxSeries.actual },
                          {
                            id: "tax-cf",
                            label: "If thresholds rose with earnings",
                            points: taxSeries.counterfactual,
                            role: "reference" as const,
                          },
                        ]
                      : [{ id: "tax-actual", label: "Income tax under actual bands", points: taxSeries.actual }]
                  }
                  cadence="annual"
                  kind="line"
                  zero
                  showTable={false}
                  format={fmtGbpWhole}
                  periodLabel={historyPeriodLabel}
                  inspect={(tt) => {
                    const y = activeDragProfile.years.find(
                      (yr) => Number(yr.tax_year.slice(0, 4)) === Math.floor(tt + 1e-6),
                    );
                    if (!y) return [];
                    const cf = y.counterfactual_thresholds_indexed_to_awe;
                    const rows = [
                      { label: "Average earnings that year", value: fmtGbpWhole(y.awe_annualised_x52_gbp) },
                      { label: "Personal allowance", value: fmtGbpWhole(y.actual_statutory.personal_allowance_applied_gbp) },
                      { label: "Effective income-tax rate", value: fmtPercent(y.actual_statutory.effective_income_tax_rate_percent) },
                    ];
                    if (cf) {
                      rows.push(
                        { label: "Allowance if it rose with earnings", value: fmtGbpWhole(cf.personal_allowance_gbp) },
                        { label: "Extra tax from the freeze", value: fmtGbpWhole(cf.extra_tax_vs_counterfactual_gbp) },
                      );
                    }
                    return rows;
                  }}
                />
              ) : (
                <EmptyStage label="Not available">
                  Income-tax figures for this profile are not in the loaded pack.
                </EmptyStage>
              )}
            </section>
          </div>
        );
      }
    } else if (focus === "history") {
      body = !machineRows.length ? (
        <EmptyStage label="Not available">
          The rules archive is not loaded from the Exchange API right now.
        </EmptyStage>
      ) : (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Income-tax bands by tax year · {jurisLabel} · {historyArchive.spanLabel} · gross £
            </h3>
            <TaxYearRows rows={machineRows} gross={Number(gross)} label="Income-tax bands by tax year" />
          </section>
        </div>
      );
    } else if (!activeRules) {
      body = (
        <EmptyStage label="Not available">
          Tax Machine statute tables are not loaded from the Exchange API right now.
        </EmptyStage>
      );
    } else if (!result) {
      body = (
        <EmptyStage label="Not available">
          This combination of tax year, place and income is outside the pinned educational
          scenarios.
        </EmptyStage>
      );
    } else {
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              {taxYearLabel(result.taxYear)} · {jurisLabel} · gross {fmtGbpWhole(result.gross)} · £
            </h3>
            <TaxRuleStrips
              result={result}
              label="The Tax Machine"
              nicsNote="Rates changed during this tax year · no single rule to draw"
            />
            <details className={tm.exact}>
              <summary className="bo-disclosure">Exact steps · income tax and National Insurance</summary>
              <div className={t.tableWrap}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th scope="col">Income tax</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.incomeTaxSteps.map((step) => (
                      <tr key={step.step}>
                        <td>{step.detail}</td>
                        <td>{formatGbp(step.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.nicsSteps.length ? (
                <div className={t.tableWrap}>
                  <table className={t.table}>
                    <thead>
                      <tr>
                        <th scope="col">Employee National Insurance · Class 1 category A</th>
                        <th scope="col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.nicsSteps.map((step) => (
                        <tr key={step.step}>
                          <td>{step.detail}</td>
                          <td>{formatGbp(step.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </details>
          </section>
        </div>
      );
    }
  } else if (view === "burden") {
    const share = isBurdenViewShare(burdenView);
    const viewLabel =
      BURDEN_VIEW_OPTIONS.find((m) => m.value === burdenView)?.label ?? "Tax burden";
    foot = (
      <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
        source={economySource(
          ECONOMY_SOURCE.taxBurden,
          "United Kingdom",
          economyPeriod("annual", burdenSlice?.periodLabel ?? null),
        )}
        definition={[
          "How estimated direct and indirect tax burdens differ across household income groups, drawn end to end on one rule — using only the denominators the Office for National Statistics publishes.",
          "These are survey group averages for private households, not what any one household pays, and not the public-finances receipt totals on What Britain raises.",
        ]}
        method={[
          "ONS Effects of taxes and benefits, financial year ending 2024. Households are ranked by equivalised disposable income into fifths. Direct taxes as a share of disposable income or spending are not published, so those measures draw the indirect part only.",
          "Share of gross income: direct and indirect are the published Table 8 shares and their join is the published all-taxes figure. Pounds a year: Table 2a average pounds per household; the row length is direct plus indirect.",
          "Legal liability is not the same as economic incidence. No fairness verdict is drawn here.",
        ]}
      />
    );
    body = !burdenSlice ? (
      <EmptyStage label="Not available">
        Effects of taxes and benefits figures are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {viewLabel} · households by income, in{" "}
            <Term slug="income-fifths">fifths</Term> · {burdenSlice.periodLabel} ·{" "}
            {share ? "%" : "£ a year"}
          </h3>
          <BurdenRows
            key={`tax-burden-rows-${burdenView}`}
            rows={burdenSlice.rows}
            share={share}
            label={viewLabel}
          />
        </section>
      </div>
    );
  } else if (view === "gap") {
    const gapPeriod = gapHead
      ? economyPeriod(
          "annual",
          gapHead.provisional
            ? `${gapHead.taxYearLabel} (provisional)`
            : gapHead.taxYearLabel,
        )
      : economyPeriod("annual");
    foot = (
      <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
        source={economySource(ECONOMY_SOURCE.taxGap, "United Kingdom", gapPeriod)}
        definition={[
          "HMRC’s estimate of the difference between tax theoretically due and tax actually collected — by tax type and published reason categories.",
          "This is an educational reading of HMRC’s published estimates, not a count of fraud cases.",
        ]}
        method={[
          "Measuring tax gaps 2026 edition (tax years 2005–06 to 2024–25). Tax years 2023–24 and 2024–25 are provisional projections — shown dotted on History.",
          "The tax gap is not the same as fraud. Evasion is one published behaviour category; the largest share in the latest year is failure to take reasonable care.",
          "Corporation Tax methods step around 2019–20. Behaviour shares (Table 7.1) start in 2019–20. Only HMRC’s published categories are shown — no invented components.",
        ]}
      />
    );
    if (!gapHead) {
      body = (
        <EmptyStage label="Not available">
          Measuring tax gaps figures are not loaded from the Exchange API right now.
        </EmptyStage>
      );
    } else if (gapMode === "by_tax" && gapTaxSlice) {
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Tax gap by tax type · {gapTaxSlice.taxYearLabel}
              {gapTaxSlice.provisional ? " · provisional" : ""} · £bn
            </h3>
            <RankBars
              key={`tax-gap-by-tax-${gapTaxSlice.taxYearLabel}`}
              label="Tax gap by tax type"
              rows={gapTaxSlice.ranks}
              format={fmtGapBn}
            />
          </section>
        </div>
      );
    } else if (gapMode === "by_behaviour" && gapBehSlice) {
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Share of the tax gap by behaviour · {gapBehSlice.taxYearLabel}
              {gapBehSlice.provisional ? " · provisional" : ""} · %
            </h3>
            <RankBars
              key={`tax-gap-by-behaviour-${gapBehSlice.taxYearLabel}`}
              label="Tax gap by behaviour"
              rows={gapBehSlice.ranks}
              format={fmtGapPercent}
            />
          </section>
        </div>
      );
    } else if (gapMode === "history" && gapHistPts.length) {
      const histFmt = gapHistory === "percent" ? fmtGapPercent : fmtGapBn;
      const histUnit = gapHistory === "percent" ? "% of theoretical liabilities" : "£bn";
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Total tax gap · {gapPeriodLabel(gapHistPts[0]!.t)}–
              {gapPeriodLabel(gapHistPts[gapHistPts.length - 1]!.t)} · {histUnit}
            </h3>
            <TimeChart
              key={`tax-gap-history-${gapHistory}`}
              label="Total tax gap"
              series={[
                {
                  id: "tax-gap-total",
                  label: gapHistory === "percent" ? "Share of theoretical liabilities" : "Tax gap",
                  points: gapHistPts,
                },
              ]}
              cadence="annual"
              kind="line"
              zero
              showTable={false}
              format={histFmt}
              periodLabel={gapPeriodLabel}
            />
          </section>
        </div>
      );
    } else {
      body = (
        <EmptyStage label="Not available">
          This view of the Measuring tax gaps tables is not available for the loaded release.
        </EmptyStage>
      );
    }
  } else {
    foot = (
      <FigureRecord terms={["fiscal-drag", "marginal-tax-rate", "effective-tax-rate", "tax-gap", "nics"]}
        source={economySource(
          ECONOMY_SOURCE.taxReceipts,
          "United Kingdom",
          economyPeriod("monthly", latest ? labelMonth(latest.period_start) : null),
        )}
        definition={["Monthly observation table for public-sector taxes and National Insurance."]}
        method={[
          "Latest month is provisional. Charts on the other tabs use final months only.",
          "Not HMRC cash receipts.",
        ]}
      />
    );
    body = <TaxData pack={pack} />;
  }

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      {figures.length ? <FigureStrip figures={figures} /> : null}
      <ControlRow>
        {view === "raises" ? (
          <>
            <MenuControl
              label="Measure"
              value={revenueMeasure}
              options={REVENUE_MEASURE_OPTIONS}
              onChange={(id) => sync({ measure: id as RevenueMeasure })}
            />
            {revenueMeasure !== "total" ? (
              <MenuControl
                label="Level"
                value={anatomyLevel}
                options={ANATOMY_LEVEL_OPTIONS}
                onChange={(id) => sync({ al: id as AnatomyLevel })}
              />
            ) : null}
            <ResetButton
              onClick={() => sync({ measure: "total", al: "ahhy" })}
            />
          </>
        ) : null}
        {view === "burden" ? (
          <>
            <MenuControl
              label="Measure"
              value={burdenView}
              options={BURDEN_VIEW_OPTIONS}
              onChange={(id) => sync({ bm: id as BurdenView })}
            />
            <ResetButton onClick={() => sync({ bm: "gross" })} />
          </>
        ) : null}
        {view === "machine" ? (
          <>
            <MenuControl
              label="Focus"
              value={focus}
              options={MACHINE_FOCUS_OPTIONS}
              onChange={(id) => sync({ tf: id as MachineFocus })}
            />
            {focus === "drag" ? (
              dragProfileOptions.length ? (
                <MenuControl
                  label="Profile"
                  value={activeDragProfileId}
                  options={dragProfileOptions}
                  onChange={(id) => sync({ dp: id })}
                />
              ) : null
            ) : (
              <>
                {focus === "rules" && yearOptions.length ? (
                  <MenuControl
                    label="Tax year"
                    value={activeYearId}
                    options={yearOptions}
                    onChange={(id) => sync({ ty: id })}
                  />
                ) : null}
                <MenuControl
                  label="Place"
                  value={juris}
                  options={TAX_MACHINE_JURISDICTIONS.map((j) => ({
                    value: j.value,
                    label: j.label,
                  }))}
                  onChange={(id) => sync({ juris: id as TaxJurisdiction })}
                />
                <MenuControl
                  label="Gross income"
                  value={gross}
                  options={TAX_MACHINE_INCOMES}
                  onChange={(id) => sync({ gross: id })}
                />
              </>
            )}
            <ResetButton
              onClick={() =>
                sync({
                  tf: "rules",
                  ty: yearOptions[yearOptions.length - 1]?.value ?? "",
                  juris: DEFAULT_JURIS,
                  gross: DEFAULT_GROSS,
                  dp: "",
                })
              }
            />
          </>
        ) : null}
        {view === "gap" ? (
          <>
            <MenuControl
              label="View"
              value={gapMode}
              options={GAP_MODE_OPTIONS}
              onChange={(id) => sync({ gm: id as GapMode })}
            />
            {gapMode === "history" ? (
              <MenuControl
                label="Measure"
                value={gapHistory}
                options={GAP_HISTORY_OPTIONS}
                onChange={(id) => sync({ gh: id as GapHistoryMeasure })}
              />
            ) : null}
            <ResetButton
              onClick={() => sync({ gm: "by_tax", gh: "gbp" })}
            />
          </>
        ) : null}
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={<EconomyStageFollow domain="tax" view={view} label={`Tax · ${viewLabel(view)}`} />}
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

function TaxData({ pack }: { pack: TaxPack }) {
  const rows = finalObs(pack.taxReceipts?.observations ?? []).slice().reverse().slice(0, 24);
  if (!rows.length) {
    return (
      <EmptyStage label="In preparation">
        Tax receipt series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  return (
    <div className={s.stack}>
      <div className={t.tableGroup}>
        <p className={t.stageTitle}>Taxes and National Insurance · £ billion</p>
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
    </div>
  );
}

"use client";

/**
 * Economy Domain 04 — Household Finances & Living Standards.
 * Ready: RHDI, saving ratio, Family spending, WAS financial wealth, BoE consumer credit.
 * Ledger shows LCF spending beside ETB tax shares — never as one household budget.
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Observation } from "@/lib/api";
import { EconomyStageFollow } from "../connections";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { fmtT } from "../data";
import type { PrintOption } from "../PrintSelect";
import { Term } from "../term";
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
  PRE_PANDEMIC_LABEL,
  PRE_PANDEMIC_Q4,
  REF_YEAR,
  asHouseholdMeasure,
  finiteObs,
  fmtPct1,
  fmtPerHead,
  fmtPoints,
  fmtRatio,
  fmtRhdiM,
  latestObs,
  periodPoints,
  qoqPoints,
  sincePct,
  sincePoints,
  troughSince,
  type HouseholdMeasure,
} from "./household-model";
import {
  CREDIT_SERIES_LABEL,
  ESSENTIAL_GROUPS,
  WAS_ROUND8_LABEL,
  asCostMeasure,
  asCreditMeasure,
  asLedgerMeasure,
  asSpendCategory,
  creditNoteLabel,
  parseNotes,
  creditSeriesPoints,
  fmtCreditM,
  fmtShare1,
  fmtWealthGbp,
  fmtWeekGbp,
  incomeQuintileRanks,
  incomeShareHit,
  incomeTotalByQuintile,
  labelSpendPeriod,
  labelSpendT,
  latestCredit,
  latestSpendPeriod,
  spendCategoryOptions,
  spendCategoryRanks,
  spendGroupAt,
  spendHistory,
  spendNoteLabel,
  spendTotal,
  wasAnyFormal,
  wasBandRanks,
  wasCoverageRanks,
  wasDecileMedianRanks,
  wasHighBandShare,
  wasPercentile,
  wealthNoteLabel,
  type CostMeasure,
  type CreditMeasure,
  type LedgerMeasure,
} from "./household-living-model";
import { coerceFromYear, fromYearOptions, pointsFrom } from "./series-window";
import { burdenRanks, fmtBurdenShare } from "./tax-burden-model";
import type { HouseholdPack, SeriesPack } from "./types";

const VIEWS: ExplorerView[] = [
  { id: "better-off", label: "Are we better off?" },
  { id: "saving", label: "Saving" },
  { id: "ledger", label: "The Household Ledger" },
  { id: "cost", label: "The Cost of Living" },
  { id: "buffer", label: "Britain's Financial Buffer" },
  { id: "debt", label: "The Weight of Debt" },
  { id: "data", label: "Data" },
];

const MEASURE_OPTIONS: PrintOption<HouseholdMeasure>[] = [
  { value: "total", label: "Total (all households)" },
  { value: "per-head", label: "Per person" },
];

const COST_MEASURE_OPTIONS: PrintOption<CostMeasure>[] = [
  { value: "weekly", label: "Pounds a week" },
  { value: "share", label: "Share of spending" },
];

const LEDGER_MEASURE_OPTIONS: PrintOption<LedgerMeasure>[] = [
  { value: "category", label: "By spending group" },
  { value: "quintile", label: "By income group" },
];

const CREDIT_MEASURE_OPTIONS: PrintOption<CreditMeasure>[] = [
  { value: "total", label: "Total excluding student loans" },
  { value: "credit-cards", label: "Credit cards" },
  { value: "other", label: "Other consumer credit" },
  { value: "all", label: "Total, cards and other" },
];

function asView(raw: string | null): string {
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "better-off";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Households";
}

function labelQuarter(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return fmtT(y + (m - 1) / 12, "quarterly");
}

function labelMonth(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return fmtT(y + (m - 1) / 12, "monthly");
}

/** Stable empty list so `?? []` does not rebuild memo deps every render. */
const EMPTY_OBS: Observation[] = [];

export function HouseholdCanvas({ pack }: { pack: HouseholdPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [measure, setMeasure] = useState<HouseholdMeasure>(() =>
    asHouseholdMeasure(searchParams.get("measure")),
  );
  const [costMeasure, setCostMeasure] = useState<CostMeasure>(() =>
    asCostMeasure(searchParams.get("measure")),
  );
  const [ledgerMeasure, setLedgerMeasure] = useState<LedgerMeasure>(() =>
    asLedgerMeasure(searchParams.get("measure")),
  );
  const [creditMeasure, setCreditMeasure] = useState<CreditMeasure>(() =>
    asCreditMeasure(searchParams.get("measure")),
  );
  const [fromRaw, setFrom] = useState(() => searchParams.get("start") ?? "");
  const [categoryRaw, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [dataSeries, setDataSeries] = useState(() => searchParams.get("series") ?? "");

  const sync = useCallback(
    (next: {
      view?: string;
      measure?: HouseholdMeasure;
      costMeasure?: CostMeasure;
      ledgerMeasure?: LedgerMeasure;
      creditMeasure?: CreditMeasure;
      start?: string;
      category?: string;
      series?: string;
    }) => {
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const cm = next.costMeasure ?? costMeasure;
      const lm = next.ledgerMeasure ?? ledgerMeasure;
      const dm = next.creditMeasure ?? creditMeasure;
      const st = next.start ?? fromRaw;
      const cat = next.category ?? categoryRaw;
      const ser = next.series ?? dataSeries;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "household");
      u.set("view", v);
      u.delete("measure");
      if (v === "better-off") u.set("measure", m);
      if (v === "cost") u.set("measure", cm);
      if (v === "ledger") u.set("measure", lm);
      if (v === "debt") u.set("measure", dm);
      if ((v === "better-off" || v === "saving" || v === "cost" || v === "debt") && st) {
        u.set("start", st);
      } else u.delete("start");
      if ((v === "cost" || v === "ledger") && cat) u.set("category", cat);
      else u.delete("category");
      if (v === "data" && ser) u.set("series", ser);
      else u.delete("series");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
      if (next.costMeasure != null) setCostMeasure(next.costMeasure);
      if (next.ledgerMeasure != null) setLedgerMeasure(next.ledgerMeasure);
      if (next.creditMeasure != null) setCreditMeasure(next.creditMeasure);
      if (next.start != null) setFrom(next.start);
      if (next.category != null) setCategory(next.category);
      if (next.series != null) setDataSeries(next.series);
    },
    [
      pathname,
      view,
      measure,
      costMeasure,
      ledgerMeasure,
      creditMeasure,
      fromRaw,
      categoryRaw,
      dataSeries,
    ],
  );

  const rhdiRows = pack.rhdi?.observations;
  const headRows = pack.rhdiPerHead?.observations;
  const saveRows = pack.savingRatio?.observations;
  const catRows = pack.familySpendingByCategory?.observations ?? EMPTY_OBS;
  const incRows = pack.familySpendingByIncome?.observations ?? EMPTY_OBS;
  const wealthRows = pack.householdFinancialWealth?.observations ?? EMPTY_OBS;
  const creditRows = pack.consumerCredit?.observations ?? EMPTY_OBS;
  const etbRows = pack.taxBenefits?.observations ?? EMPTY_OBS;

  const ptsAll = useMemo(
    () => periodPoints((measure === "per-head" ? headRows : rhdiRows) ?? []),
    [measure, headRows, rhdiRows],
  );
  const savePtsAll = useMemo(() => periodPoints(saveRows ?? []), [saveRows]);
  const spendPeriod = useMemo(() => latestSpendPeriod(catRows), [catRows]);
  const categoryOpts = useMemo(() => spendCategoryOptions(catRows), [catRows]);
  const essentialOpts = useMemo((): PrintOption<string>[] => {
    const out: PrintOption<string>[] = [];
    for (const id of ESSENTIAL_GROUPS) {
      const slice = incomeQuintileRanks(incRows, id, "share_pct");
      if (slice) out.push({ value: id, label: slice.label });
    }
    return out;
  }, [incRows]);
  const categoryChoices = costMeasure === "share" ? essentialOpts : categoryOpts;
  const activeCategory = asSpendCategory(categoryRaw, categoryChoices);
  const ledgerCategoryOpts = categoryOpts;
  const activeLedgerCategory = asSpendCategory(categoryRaw, ledgerCategoryOpts);

  const spendRanks = useMemo(
    () => (spendPeriod ? spendCategoryRanks(catRows, spendPeriod) : []),
    [catRows, spendPeriod],
  );
  const spendAll = spendPeriod ? spendTotal(catRows, spendPeriod) : null;
  const history = useMemo(
    () => spendHistory(catRows, activeCategory),
    [catRows, activeCategory],
  );
  const shareSlice = useMemo(
    () => incomeQuintileRanks(incRows, activeCategory, "share_pct"),
    [incRows, activeCategory],
  );
  const quintileTotals = useMemo(() => incomeTotalByQuintile(incRows), [incRows]);
  const quintileGroup = useMemo(
    () => incomeQuintileRanks(incRows, activeLedgerCategory, "weekly_gbp"),
    [incRows, activeLedgerCategory],
  );
  const burdenSlice = useMemo(() => burdenRanks(etbRows, "all_gross"), [etbRows]);
  const bandRanks = useMemo(() => wasBandRanks(wealthRows), [wealthRows]);
  const coverageRanks = useMemo(() => wasCoverageRanks(wealthRows), [wealthRows]);
  const decileRanks = useMemo(() => wasDecileMedianRanks(wealthRows), [wealthRows]);

  const creditPtsAll = useMemo(() => {
    if (creditMeasure === "all") return creditSeriesPoints(creditRows, "total");
    return creditSeriesPoints(creditRows, creditMeasure);
  }, [creditRows, creditMeasure]);
  const creditFromOpts = useMemo(() => fromYearOptions(creditPtsAll), [creditPtsAll]);
  const historyFromOpts = useMemo(() => fromYearOptions(history.points), [history.points]);
  const fromOpts = useMemo(() => {
    if (view === "saving") return fromYearOptions(savePtsAll);
    if (view === "cost") return historyFromOpts;
    if (view === "debt") return creditFromOpts;
    return fromYearOptions(ptsAll);
  }, [view, savePtsAll, ptsAll, historyFromOpts, creditFromOpts]);
  const fromYear = coerceFromYear(
    fromRaw || null,
    view === "saving"
      ? savePtsAll
      : view === "cost"
        ? history.points
        : view === "debt"
          ? creditPtsAll
          : ptsAll,
  );
  const pts = useMemo(() => pointsFrom(ptsAll, fromYear), [ptsAll, fromYear]);
  const savePts = useMemo(() => pointsFrom(savePtsAll, fromYear), [savePtsAll, fromYear]);
  const historyPts = useMemo(() => pointsFrom(history.points, fromYear), [history.points, fromYear]);
  const creditPts = useMemo(() => pointsFrom(creditPtsAll, fromYear), [creditPtsAll, fromYear]);
  const cardsPts = useMemo(
    () => pointsFrom(creditSeriesPoints(creditRows, "credit-cards"), fromYear),
    [creditRows, fromYear],
  );
  const otherPts = useMemo(
    () => pointsFrom(creditSeriesPoints(creditRows, "other"), fromYear),
    [creditRows, fromYear],
  );

  const latestTotal = useMemo(() => latestObs(rhdiRows ?? []), [rhdiRows]);
  const latestHead = useMemo(() => latestObs(headRows ?? []), [headRows]);
  const latestSave = useMemo(() => latestObs(saveRows ?? []), [saveRows]);
  const saveSince = sincePoints(saveRows ?? [], PRE_PANDEMIC_Q4);
  const activeSince = sincePct(
    (measure === "per-head" ? headRows : rhdiRows) ?? [],
    PRE_PANDEMIC_Q4,
  );
  const trough = useMemo(
    () => troughSince((measure === "per-head" ? headRows : rhdiRows) ?? [], PRE_PANDEMIC_Q4),
    [measure, headRows, rhdiRows],
  );
  const troughPct = trough
    ? sincePct((measure === "per-head" ? headRows : rhdiRows) ?? [], trough.period)
    : null;

  const dataSeriesOptions = useMemo(() => householdDataSeriesOptions(pack), [pack]);
  const activeDataSeries =
    dataSeriesOptions.find((o) => o.value === dataSeries)?.value ??
    dataSeriesOptions[0]?.value ??
    "";

  const label = measure === "per-head" ? "Income per person" : "Total household income";
  const unit =
    measure === "per-head"
      ? `£ per person · ${REF_YEAR} prices`
      : `£ million · ${REF_YEAR} prices`;
  const sourceLine = measure === "per-head" ? ECONOMY_SOURCE.rhdiPerHead : ECONOMY_SOURCE.rhdi;
  const fmt = measure === "per-head" ? fmtPerHead : fmtRhdiM;
  const indicatorId =
    measure === "per-head"
      ? "real-household-disposable-income-per-head"
      : "real-household-disposable-income";

  const housingWeek = spendPeriod ? spendGroupAt(catRows, spendPeriod, "housing_fuel_power") : null;
  const foodShareAll = incomeShareHit(incRows, "food", "all");
  const housingShareLow = incomeShareHit(incRows, "housing_fuel_power", "lowest");
  const medianWealth = wasPercentile(wealthRows, "median");
  const p25Wealth = wasPercentile(wealthRows, "p25");
  const p75Wealth = wasPercentile(wealthRows, "p75");
  const anyFormal = wasAnyFormal(wealthRows);
  const highBand = wasHighBandShare(wealthRows);
  const latestCreditTotal = latestCredit(creditRows, "total");
  const latestCards = latestCredit(creditRows, "credit-cards");
  const latestOther = latestCredit(creditRows, "other");

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "saving") {
      const note = latestSave
        ? `${labelQuarter(latestSave.period_start)}${
            latestSave.observation_status === "provisional" ? " · provisional" : ""
          }`
        : "Not loaded";
      const saveQoq = qoqPoints(saveRows ?? []);
      return [
        {
          label: "Saving ratio · latest",
          value: latestSave?.value != null ? fmtRatio(latestSave.value) : "—",
          note,
        },
        {
          label: `Since ${PRE_PANDEMIC_LABEL}`,
          value: saveSince != null ? fmtPoints(saveSince) : "—",
          note: latestSave ? `To ${labelQuarter(latestSave.period_start)}` : "Not loaded",
        },
        {
          label: "On the quarter before",
          value: saveQoq != null ? fmtPoints(saveQoq) : "—",
          note: "Change in the ratio, in percentage points — not a typical buffer",
        },
      ];
    }
    if (view === "cost") {
      const when = spendPeriod ? labelSpendPeriod(spendPeriod) : "Not loaded";
      return [
        {
          label: "All households · a week",
          value: spendAll != null ? fmtWeekGbp(spendAll) : "—",
          note: when,
        },
        {
          label: housingWeek?.label ?? "Housing (net), fuel and power",
          value: housingWeek ? fmtWeekGbp(housingWeek.value) : "—",
          note: when,
        },
        {
          label:
            costMeasure === "share"
              ? "Housing (net) · lowest-income fifth"
              : "Food · share of spending",
          value:
            costMeasure === "share"
              ? housingShareLow != null
                ? fmtShare1(housingShareLow)
                : "—"
              : foodShareAll != null
                ? fmtShare1(foodShareAll)
                : "—",
          note: "Published share · year to March 2025",
        },
      ];
    }
    if (view === "ledger") {
      const low = quintileTotals?.ranks.find((r) => r.id === "lowest");
      const high = quintileTotals?.ranks.find((r) => r.id === "highest");
      return [
        {
          label: "Lowest-income fifth · a week",
          value: low ? fmtWeekGbp(low.v) : "—",
          note: "Group average · year to March 2025",
        },
        {
          label: "Highest-income fifth · a week",
          value: high ? fmtWeekGbp(high.v) : "—",
          note: "Group average · year to March 2025",
        },
        {
          label: "All households · a week",
          value: quintileTotals?.all != null ? fmtWeekGbp(quintileTotals.all) : "—",
          note: "Not a household budget",
        },
      ];
    }
    if (view === "buffer") {
      return [
        {
          label: "Median net financial wealth",
          value: medianWealth != null ? fmtWealthGbp(medianWealth) : "—",
          note: `${WAS_ROUND8_LABEL} · accreditation suspended`,
        },
        {
          label: "Lower to upper quarter",
          value:
            p25Wealth != null && p75Wealth != null
              ? `${fmtWealthGbp(p25Wealth)} – ${fmtWealthGbp(p75Wealth)}`
              : "—",
          note: "All households · Great Britain",
        },
        {
          label: "Any formal financial assets",
          value: anyFormal != null ? fmtShare1(anyFormal) : "—",
          note:
            highBand != null
              ? `${fmtShare1(highBand)} have £100,000 or more`
              : "Share of households",
        },
      ];
    }
    if (view === "debt") {
      return [
        {
          label: "Total outstanding",
          value: latestCreditTotal?.value != null ? fmtCreditM(latestCreditTotal.value) : "—",
          note: latestCreditTotal
            ? `${labelMonth(latestCreditTotal.period_start)}${
                latestCreditTotal.observation_status === "provisional" ? " · provisional" : ""
              }`
            : "Not loaded",
        },
        {
          label: "Credit cards",
          value: latestCards?.value != null ? fmtCreditM(latestCards.value) : "—",
          note: "Seasonally adjusted · £ million stocks",
        },
        {
          label: "Other consumer credit",
          value: latestOther?.value != null ? fmtCreditM(latestOther.value) : "—",
          note: "Excludes student loans",
        },
      ];
    }
    if (view === "data") {
      return [
        {
          label: "Spending rows",
          value: (() => {
            const n = finiteObs(catRows).length + finiteObs(incRows).length;
            return n ? String(n) : "—";
          })(),
          note: "Family spending tables",
        },
        {
          label: "Wealth rows",
          value: finiteObs(wealthRows).length ? String(finiteObs(wealthRows).length) : "—",
          note: "Financial wealth survey",
        },
        {
          label: "Credit rows",
          value: finiteObs(creditRows).length ? String(finiteObs(creditRows).length) : "—",
          note: "Monthly stocks",
        },
      ];
    }
    const latest = measure === "per-head" ? latestHead : latestTotal;
    const troughNote =
      trough && trough.period !== PRE_PANDEMIC_Q4
        ? `Lowest since ${PRE_PANDEMIC_LABEL}: ${labelQuarter(trough.period)}`
        : `${PRE_PANDEMIC_LABEL} is the documented base`;
    return [
      {
        label: measure === "per-head" ? "Per person · latest" : "Total · latest",
        value: latest?.value != null ? fmt(latest.value) : "—",
        note: latest
          ? `${labelQuarter(latest.period_start)}${
              latest.observation_status === "provisional" ? " · provisional" : ""
            }`
          : "Not loaded",
      },
      {
        label: `Since ${PRE_PANDEMIC_LABEL}`,
        value: activeSince != null ? fmtPct1(activeSince) : "—",
        note: latest ? `To ${labelQuarter(latest.period_start)}` : "Not loaded",
      },
      {
        label: "Since the low point",
        value: troughPct != null ? fmtPct1(troughPct) : "—",
        note: troughNote,
      },
    ];
  }, [
    view,
    measure,
    costMeasure,
    latestTotal,
    latestHead,
    latestSave,
    saveSince,
    activeSince,
    trough,
    troughPct,
    saveRows,
    fmt,
    spendAll,
    spendPeriod,
    housingWeek,
    foodShareAll,
    housingShareLow,
    quintileTotals,
    medianWealth,
    p25Wealth,
    p75Wealth,
    anyFormal,
    highBand,
    latestCreditTotal,
    latestCards,
    latestOther,
    catRows,
    incRows,
    wealthRows,
    creditRows,
  ]);

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "data") {
    const dataSource = dataSourceLine(activeDataSeries);
    foot = (
      <FigureRecord terms={["disposable-income", "rhdi", "saving-ratio", "consumer-credit", "net-financial-wealth"]}
        source={economySource(dataSource, "United Kingdom", economyPeriod("annual"))}
        definition="The published figures behind this domain, latest first."
        method={dataMethod(activeDataSeries)}
      />
    );
    body = <HouseholdData pack={pack} seriesId={activeDataSeries} />;
  } else if (view === "saving") {
    foot = (
      <FigureRecord terms={["disposable-income", "rhdi", "saving-ratio", "consumer-credit", "net-financial-wealth"]}
        source={economySource(
          ECONOMY_SOURCE.householdSavingRatio,
          "United Kingdom",
          economyPeriod(
            "quarterly",
            savePts.length ? fmtT(savePts[savePts.length - 1]!.t, "quarterly") : null,
          ),
        )}
        definition="The share of household-sector resources left after spending, in the national accounts — a leftover, not what a typical household has in the bank."
        method={[
          "Seasonally adjusted. This is not Britain's Financial Buffer and not a survey of rainy-day savings.",
          "The 2020 spike is the lockdown leftover in these accounts. It does not mean every household saved more.",
          "The latest quarter is provisional (dotted).",
        ]}
      />
    );
    body = !savePts.length ? (
      <EmptyStage label="Not available">
        The household saving ratio is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Household saving ratio · {fmtT(savePts[0]!.t, "quarterly")}–
            {fmtT(savePts[savePts.length - 1]!.t, "quarterly")} · % of resources
          </h3>
          <TimeChart
            key={`household-saving-${fromYear}`}
            label="Household saving ratio"
            series={[
              {
                id: "household-saving-ratio",
                label: "Saving ratio",
                points: savePts,
              },
            ]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtRatio}
          />
        </section>
      </div>
    );
  } else if (view === "cost") {
    const when = spendPeriod ? labelSpendPeriod(spendPeriod) : "";
    foot = (
      <FigureRecord terms={["disposable-income", "rhdi", "saving-ratio", "consumer-credit", "net-financial-wealth", "lcf", "income-fifths"]}
        source={economySource(
          costMeasure === "share"
            ? ECONOMY_SOURCE.familySpendingByIncome
            : ECONOMY_SOURCE.familySpendingByCategory,
          "United Kingdom",
          economyPeriod("annual", when || null),
        )}
        definition="How private households spent, on average, across published spending groups — not the consumer-price basket, and not a typical household's shop."
        method={[
          "Living Costs and Food Survey, Family spending, year to March 2025. Housing (net), fuel and power excludes mortgage interest and Council Tax; those sit in other expenditure items.",
          "Shares by income group use the published two-adult ranking. No extras basket is built here. Pounds a week are in year-to-March-2025 prices.",
        ]}
      />
    );
    const costEmpty =
      costMeasure === "share" ? !shareSlice : !spendRanks.length && !historyPts.length;
    body = costEmpty ? (
      <EmptyStage label="Not available">
        Family spending figures are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        {costMeasure === "weekly" && spendRanks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Spending by group · all households · {when} · £ a week
            </h3>
            <RankBars
              key={`cost-week-${spendPeriod}`}
              label="Spending by group"
              rows={spendRanks}
              format={fmtWeekGbp}
            />
          </section>
        ) : null}
        {costMeasure === "share" && shareSlice ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              {shareSlice.label} as a share of spending · income{" "}
              <Term slug="income-fifths">fifths</Term> · {labelSpendPeriod(shareSlice.periodStart)} · %
            </h3>
            <RankBars
              key={`cost-share-${activeCategory}`}
              label={`${shareSlice.label} share of spending`}
              rows={shareSlice.ranks}
              reference={
                shareSlice.all != null ? { label: "All households", v: shareSlice.all } : undefined
              }
              format={fmtShare1}
            />
          </section>
        ) : null}
        {costMeasure === "weekly" && historyPts.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              {history.label} · {labelSpendT(historyPts[0]!.t)}–{labelSpendT(historyPts[historyPts.length - 1]!.t)}{" "}
              · £ a week · year to March 2025 prices
            </h3>
            <TimeChart
              key={`cost-history-${activeCategory}-${fromYear}`}
              label={history.label}
              series={[{ id: activeCategory, label: history.label, points: historyPts }]}
              cadence="annual"
              kind="line"
              zero={false}
              showTable={false}
              format={fmtWeekGbp}
              periodLabel={labelSpendT}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "ledger") {
    foot = (
      <FigureRecord terms={["disposable-income", "rhdi", "saving-ratio", "consumer-credit", "net-financial-wealth", "lcf", "income-fifths"]}
        source={economySource(
          ledgerSourceLine(ledgerMeasure, Boolean(burdenSlice)),
          "United Kingdom",
          economyPeriod("annual", "Year to March 2025"),
        )}
        definition="Average weekly spending from the Living Costs and Food Survey, shown beside taxes on a different survey — not a household budget you can add up."
        method={[
          "Spending is year to March 2025, private households, two-adult ranking. Taxes are Effects of taxes and benefits, year to March 2024. Different years, different groups, different pounds.",
          "Do not add these figures to household disposable income or to the national saving ratio. They are adjacent statistics, not one ledger.",
        ]}
      />
    );
    const spendBody =
      ledgerMeasure === "quintile"
        ? quintileTotals
        : spendRanks.length
          ? { ranks: spendRanks, all: spendAll }
          : null;
    body = !spendBody ? (
      <EmptyStage label="Not available">
        Family spending figures are not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        {ledgerMeasure === "category" ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Spending by group · all households · {spendPeriod ? labelSpendPeriod(spendPeriod) : ""}{" "}
              · £ a week
            </h3>
            <RankBars
              key="ledger-category"
              label="Spending by group"
              rows={spendRanks}
              format={fmtWeekGbp}
            />
          </section>
        ) : (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Total spending by income <Term slug="income-fifths">fifth</Term> · year to March 2025 ·
              £ a week
            </h3>
            <RankBars
              key="ledger-quintile"
              label="Total spending by income group"
              rows={quintileTotals!.ranks}
              reference={
                quintileTotals!.all != null
                  ? { label: "All households", v: quintileTotals!.all }
                  : undefined
              }
              format={fmtWeekGbp}
            />
          </section>
        )}
        {ledgerMeasure === "quintile" && quintileGroup ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              {quintileGroup.label} by income fifth · year to March 2025 · £ a week
            </h3>
            <RankBars
              key={`ledger-group-${activeLedgerCategory}`}
              label={`${quintileGroup.label} by income group`}
              rows={quintileGroup.ranks}
              reference={
                quintileGroup.all != null
                  ? { label: "All households", v: quintileGroup.all }
                  : undefined
              }
              format={fmtWeekGbp}
            />
          </section>
        ) : null}
        {burdenSlice ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              All taxes as a share of gross income · {burdenSlice.periodLabel} · %
            </h3>
            <RankBars
              key="ledger-etb"
              label="Taxes as a share of gross income"
              rows={burdenSlice.ranks}
              reference={
                burdenSlice.all != null ? { label: "All households", v: burdenSlice.all } : undefined
              }
              format={fmtBurdenShare}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "buffer") {
    foot = (
      <FigureRecord terms={["disposable-income", "rhdi", "saving-ratio", "consumer-credit", "net-financial-wealth", "was"]}
        source={economySource(
          ECONOMY_SOURCE.householdFinancialWealth,
          "Great Britain",
          WAS_ROUND8_LABEL,
        )}
        definition="How net financial wealth — savings, investments and financial debts, not homes — is spread across households in Great Britain."
        method={[
          "Wealth and Assets Survey, April 2020 to March 2022. Accreditation for this round is suspended. Figures are pounds of the day, Great Britain, not the United Kingdom.",
          "This is not the national saving ratio. Property wealth lives on Housing. Do not add the two.",
        ]}
      />
    );
    body = !bandRanks.length && !coverageRanks.length ? (
      <EmptyStage label="Not available">
        Household financial wealth is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        {coverageRanks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Households with formal financial assets · Great Britain · {WAS_ROUND8_LABEL} · %
            </h3>
            <RankBars
              key="buffer-coverage"
              label="Share of households with formal financial assets"
              rows={coverageRanks}
              format={fmtShare1}
            />
          </section>
        ) : null}
        {bandRanks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Share of households by net financial wealth · Great Britain · {WAS_ROUND8_LABEL} · %
            </h3>
            <RankBars
              key="buffer-bands"
              label="Share of households by net financial wealth"
              rows={bandRanks}
              format={fmtShare1}
            />
          </section>
        ) : null}
        {decileRanks.length ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Median net financial wealth by income tenth · Great Britain · {WAS_ROUND8_LABEL} · £
            </h3>
            <RankBars
              key="buffer-deciles"
              label="Median net financial wealth by income tenth"
              rows={decileRanks}
              format={fmtWealthGbp}
            />
          </section>
        ) : null}
      </div>
    );
  } else if (view === "debt") {
    const through = creditPts.length ? fmtT(creditPts[creditPts.length - 1]!.t, "monthly") : null;
    foot = (
      <FigureRecord terms={["disposable-income", "rhdi", "saving-ratio", "consumer-credit", "net-financial-wealth"]}
        source={economySource(
          ECONOMY_SOURCE.consumerCredit,
          "United Kingdom",
          economyPeriod("monthly", through),
        )}
        definition="What lenders report as outstanding consumer credit in the United Kingdom — a stock of lending, not what a household is paying back."
        method={[
          "Seasonally adjusted, excluding student loans. Credit cards plus other equals the total on this pin. The latest month is provisional (dotted).",
          "This is not the Housing mortgage book, and a quoted two-year fixed mortgage rate is not a repayment burden.",
        ]}
      />
    );
    const lines =
      creditMeasure === "all"
        ? [
            { id: "total", label: CREDIT_SERIES_LABEL.total, points: creditPts },
            { id: "credit-cards", label: CREDIT_SERIES_LABEL["credit-cards"], points: cardsPts },
            { id: "other", label: CREDIT_SERIES_LABEL.other, points: otherPts },
          ].filter((sr) => sr.points.length)
        : [{ id: creditMeasure, label: CREDIT_SERIES_LABEL[creditMeasure], points: creditPts }];
    body = !lines.some((sr) => sr.points.length) ? (
      <EmptyStage label="Not available">
        Consumer credit outstanding is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Consumer credit outstanding · United Kingdom · {fmtT(lines[0]!.points[0]!.t, "monthly")}–
            {fmtT(lines[0]!.points[lines[0]!.points.length - 1]!.t, "monthly")} · £
          </h3>
          <TimeChart
            key={`credit-${creditMeasure}-${fromYear}`}
            label="Consumer credit outstanding"
            series={lines}
            cadence="monthly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtCreditM}
            periodLabel={(tt) => fmtT(tt, "monthly")}
          />
        </section>
      </div>
    );
  } else {
    foot = (
      <FigureRecord terms={["disposable-income", "rhdi", "saving-ratio", "consumer-credit", "net-financial-wealth"]}
        source={economySource(
          sourceLine,
          "United Kingdom",
          economyPeriod(
            "quarterly",
            pts.length ? fmtT(pts[pts.length - 1]!.t, "quarterly") : null,
          ),
        )}
        definition={
          measure === "per-head"
            ? "Real household disposable income divided by population — a mean per person, not what a typical household receives."
            : "Real household disposable income for the household sector as a whole — not the median household, and not take-home pay."
        }
        method={[
          `Chained-volume measures in ${REF_YEAR} prices, seasonally adjusted, United Kingdom.`,
          "Households here means the national-accounts household sector, not charities. Per person is a companion mean; the Office for National Statistics title for that series does not print the sector code.",
          `Change is measured from ${PRE_PANDEMIC_LABEL}. The low-point figure is the lowest quarter on or after that date in this pin — not a typical household's worst year.`,
          "The latest quarter is provisional (dotted) until the next accounts round.",
        ]}
      />
    );
    body = !pts.length ? (
      <EmptyStage label="Not available">
        This household income series is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {label} · {fmtT(pts[0]!.t, "quarterly")}–{fmtT(pts[pts.length - 1]!.t, "quarterly")} ·{" "}
            {unit}
          </h3>
          <TimeChart
            key={`household-${measure}-${fromYear}`}
            label={label}
            series={[{ id: indicatorId, label, points: pts }]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmt}
          />
        </section>
      </div>
    );
  }

  const showFrom =
    (view === "better-off" || view === "saving" || view === "cost" || view === "debt") &&
    fromOpts.length &&
    (view !== "cost" || costMeasure === "weekly");
  const showCategory =
    (view === "cost" && categoryChoices.length && (costMeasure === "weekly" || costMeasure === "share")) ||
    (view === "ledger" && ledgerMeasure === "quintile" && ledgerCategoryOpts.length);

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      <FigureStrip figures={figures} />
      <ControlRow label="Household controls">
        {view === "better-off" ? (
          <MenuControl
            label="Measure"
            value={measure}
            options={MEASURE_OPTIONS}
            onChange={(id) => sync({ measure: id as HouseholdMeasure })}
          />
        ) : null}
        {view === "cost" ? (
          <MenuControl
            label="Measure"
            value={costMeasure}
            options={COST_MEASURE_OPTIONS}
            onChange={(id) => sync({ costMeasure: id as CostMeasure })}
          />
        ) : null}
        {view === "ledger" ? (
          <MenuControl
            label="Measure"
            value={ledgerMeasure}
            options={LEDGER_MEASURE_OPTIONS}
            onChange={(id) => sync({ ledgerMeasure: id as LedgerMeasure })}
          />
        ) : null}
        {view === "debt" ? (
          <MenuControl
            label="Measure"
            value={creditMeasure}
            options={CREDIT_MEASURE_OPTIONS}
            onChange={(id) => sync({ creditMeasure: id as CreditMeasure })}
          />
        ) : null}
        {showCategory ? (
          <MenuControl
            label="Group"
            value={view === "ledger" ? activeLedgerCategory : activeCategory}
            options={view === "ledger" ? ledgerCategoryOpts : categoryChoices}
            onChange={(id) => sync({ category: id })}
          />
        ) : null}
        {showFrom ? (
          <MenuControl
            label="From"
            value={String(fromYear)}
            options={fromOpts}
            onChange={(id) => sync({ start: id })}
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
              measure: "total",
              costMeasure: "weekly",
              ledgerMeasure: "category",
              creditMeasure: "total",
              start: "",
              category: "",
              series: "",
            })
          }
        />
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          <EconomyStageFollow
            domain="household"
            view={view}
            label={`Households · ${viewLabel(view)}`}
          />
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

function ledgerSourceLine(measure: LedgerMeasure, showTax: boolean): string {
  const spend =
    measure === "quintile"
      ? ECONOMY_SOURCE.familySpendingByIncome
      : ECONOMY_SOURCE.familySpendingByCategory;
  return showTax ? `${spend} and Effects of taxes and benefits` : spend;
}

function dataMethod(seriesId: string): string[] {
  const together =
    "Each Series menu item is one Ready table. These publications sit beside each other — they are not added together.";
  if (seriesId === "family-spending-by-category" || seriesId === "family-spending-by-income") {
    return [
      together,
      "Family spending is a survey of how private households spent, not the consumer-price basket, and not a household budget.",
    ];
  }
  if (seriesId === "household-financial-wealth") {
    return [
      together,
      "Financial wealth is Great Britain, not the United Kingdom. Accreditation for April 2020 to March 2022 is suspended. This is not the national saving ratio.",
    ];
  }
  if (seriesId === "consumer-credit-outstanding") {
    return [
      together,
      "Outstanding consumer credit excludes student loans. It is a stock of lending, not a repayment, and not the Housing mortgage book.",
    ];
  }
  if (seriesId === "effects-of-taxes-and-benefits") {
    return [
      together,
      "Taxes and benefits are a different survey and year from family spending. Do not treat the two as one household ledger.",
    ];
  }
  return [
    together,
    "The latest income and credit periods are marked provisional where the publisher has not yet treated them as final.",
  ];
}

function dataSourceLine(seriesId: string): string {
  if (seriesId === "real-household-disposable-income-per-head") return ECONOMY_SOURCE.rhdiPerHead;
  if (seriesId === "household-saving-ratio") return ECONOMY_SOURCE.householdSavingRatio;
  if (seriesId === "family-spending-by-category") return ECONOMY_SOURCE.familySpendingByCategory;
  if (seriesId === "family-spending-by-income") return ECONOMY_SOURCE.familySpendingByIncome;
  if (seriesId === "household-financial-wealth") return ECONOMY_SOURCE.householdFinancialWealth;
  if (seriesId === "consumer-credit-outstanding") return ECONOMY_SOURCE.consumerCredit;
  if (seriesId === "effects-of-taxes-and-benefits") return ECONOMY_SOURCE.taxBurden;
  return ECONOMY_SOURCE.rhdi;
}

function etbNoteLabel(row: Observation): string {
  const n = parseNotes(row.notes);
  const band =
    n.band_label === "Bottom"
      ? "Lowest-income fifth"
      : n.band_label === "Top"
        ? "Highest-income fifth"
        : n.band_label || n.band || "";
  return [n.tax_label || n.tax || "", band].filter(Boolean).join(" · ");
}

function observationStatusLabel(row: Observation): string {
  if (parseNotes(row.notes).accreditation === "suspended") return "Accreditation suspended";
  if (row.observation_status === "provisional") return "Provisional";
  return "Final";
}

type DataTable = {
  id: string;
  title: string;
  pack: SeriesPack | null;
  fmt: (v: number, row: Observation) => string;
  period?: (row: Observation) => string;
  extra?: { header: string; value: (row: Observation) => string };
};

function householdDataTables(pack: HouseholdPack): DataTable[] {
  return [
    {
      id: "real-household-disposable-income",
      title: `Total household income · £ million · ${REF_YEAR} prices · seasonally adjusted`,
      pack: pack.rhdi,
      fmt: fmtRhdiM,
    },
    {
      id: "real-household-disposable-income-per-head",
      title: `Income per person · £ · ${REF_YEAR} prices · seasonally adjusted`,
      pack: pack.rhdiPerHead,
      fmt: fmtPerHead,
    },
    {
      id: "household-saving-ratio",
      title: "Household saving ratio · % of household resources · seasonally adjusted",
      pack: pack.savingRatio,
      fmt: fmtRatio,
    },
    {
      id: "family-spending-by-category",
      title: "Family spending by group · £ a week · year to March 2025 prices",
      pack: pack.familySpendingByCategory,
      fmt: fmtWeekGbp,
      period: (r) => labelSpendPeriod(r.period_start),
      extra: { header: "Group", value: spendNoteLabel },
    },
    {
      id: "family-spending-by-income",
      title: "Family spending by income group · year to March 2025",
      pack: pack.familySpendingByIncome,
      fmt: (v, r) => {
        const m = parseNotes(r.notes).measure;
        return m === "share_pct" || m === "share_of_total_expenditure" ? fmtShare1(v) : fmtWeekGbp(v);
      },
      period: (r) => labelSpendPeriod(r.period_start),
      extra: { header: "Detail", value: spendNoteLabel },
    },
    {
      id: "effects-of-taxes-and-benefits",
      title: "Taxes as a share of income · adjacent, not a household budget",
      pack: pack.taxBenefits,
      fmt: fmtBurdenShare,
      period: (r) => labelSpendPeriod(r.period_start),
      extra: { header: "Detail", value: etbNoteLabel },
    },
    {
      id: "household-financial-wealth",
      title: "Household financial wealth · Great Britain · accreditation suspended on April 2020 to March 2022",
      pack: pack.householdFinancialWealth,
      fmt: (v, r) => {
        const n = parseNotes(r.notes);
        if (n.table === "5.12") return `£${v.toFixed(0)}bn`;
        if (n.table === "5.1" || n.table === "5.11" || n.series === "coverage") return fmtShare1(v);
        return fmtWealthGbp(v);
      },
      period: (r) => `${labelMonth(r.period_start)} to ${labelMonth(r.period_end)}`,
      extra: { header: "Detail", value: wealthNoteLabel },
    },
    {
      id: "consumer-credit-outstanding",
      title: "Consumer credit outstanding excluding student loans · £ million · seasonally adjusted",
      pack: pack.consumerCredit,
      fmt: fmtCreditM,
      period: (r) => labelMonth(r.period_start),
      extra: { header: "Series", value: creditNoteLabel },
    },
  ];
}

function householdDataSeriesOptions(pack: HouseholdPack): PrintOption<string>[] {
  return householdDataTables(pack)
    .filter((tbl) => finiteObs(tbl.pack?.observations ?? []).length > 0)
    .map((tbl) => ({ value: tbl.id, label: tbl.title.split(" · ")[0] ?? tbl.title }));
}

function HouseholdData({ pack, seriesId }: { pack: HouseholdPack; seriesId: string }) {
  const tables = householdDataTables(pack);
  const tbl =
    tables.find((x) => x.id === seriesId) ??
    tables.find((x) => finiteObs(x.pack?.observations ?? []).length > 0);
  if (!tbl) {
    return (
      <EmptyStage label="In preparation">
        Household series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  const rows = finiteObs(tbl.pack?.observations ?? []).slice().reverse();
  if (!rows.length) {
    return (
      <EmptyStage label="Not available">This series is not available right now.</EmptyStage>
    );
  }
  const isQuarter =
    tbl.id.startsWith("real-household") || tbl.id === "household-saving-ratio";
  return (
    <div className={s.stack}>
      <div className={t.tableGroup}>
        <p className={t.stageTitle}>{tbl.title}</p>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead>
              <tr>
                <th scope="col">Period</th>
                {tbl.extra ? <th scope="col">{tbl.extra.header}</th> : null}
                <th scope="col">Value</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${tbl.id}-${r.period_start}-${r.notes ?? ""}`}>
                  <td>
                    {tbl.period
                      ? tbl.period(r)
                      : isQuarter
                        ? labelQuarter(r.period_start)
                        : labelMonth(r.period_start)}
                  </td>
                  {tbl.extra ? <td>{tbl.extra.value(r)}</td> : null}
                  <td>{tbl.fmt(r.value as number, r)}</td>
                  <td>{observationStatusLabel(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

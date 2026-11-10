"use client";

/**
 * Domain 08 — Data. Observation tables for Ready series (Energy / Land pattern).
 * Series picker lives in HousingExplorer's outer ControlRow.
 */

import { useId, useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtT, type Pt } from "../../../data";
import type { HousingV1, Source } from "../../load";
import { flowLabel, qKey, stockLabel } from "./periods";
import gen from "../../../energy/generation.module.css";

type Ins = HousingV1["insecurity"];

type Props = {
  insecurity: Ins;
  sources: HousingV1["sources"];
  seriesId: string;
};

type SeriesDef = {
  id: string;
  label: string;
  measure: string;
  points: (d: Ins) => Pt[];
  cadence: "quarterly" | "annual" | "monthly";
  asStock?: boolean;
  /** Indicator the series comes from, when it is one series of a larger indicator. */
  source?: string;
};

/** Domain 08 series that have a loaded England time series in the pack. */
export const INSECURITY_DATA_SERIES: SeriesDef[] = [
  {
    id: "statutory-homelessness-assessments",
    label: "Assessments owed prevention or relief",
    measure: "Flow · quarter",
    points: (d) => d.assessmentsOwed,
    cadence: "quarterly",
  },
  {
    id: "assessments-total",
    label: "Initial assessments (total)",
    measure: "Flow · quarter",
    points: (d) => d.assessmentsTotal,
    cadence: "quarterly",
    source: "statutory-homelessness-assessments",
  },
  {
    id: "homelessness-prevention-outcomes",
    label: "Prevention duties ended",
    measure: "Flow · quarter",
    points: (d) => d.preventionEnded,
    cadence: "quarterly",
  },
  {
    id: "prevention-secured",
    label: "Prevention ended with accommodation secured",
    measure: "Flow · quarter",
    points: (d) => d.preventionSecured,
    cadence: "quarterly",
    source: "homelessness-prevention-outcomes",
  },
  {
    id: "homelessness-relief-outcomes",
    label: "Relief duties ended",
    measure: "Flow · quarter",
    points: (d) => d.reliefEnded,
    cadence: "quarterly",
  },
  {
    id: "relief-secured",
    label: "Relief ended with accommodation secured",
    measure: "Flow · quarter",
    points: (d) => d.reliefSecured,
    cadence: "quarterly",
    source: "homelessness-relief-outcomes",
  },
  {
    id: "homelessness-main-duty",
    label: "Main duty decisions",
    measure: "Flow · quarter",
    points: (d) => d.mainDutyTotal,
    cadence: "quarterly",
  },
  {
    id: "main-duty-accepted",
    label: "Main duty accepted",
    measure: "Flow · quarter",
    points: (d) => d.mainDutyAccepted,
    cadence: "quarterly",
    source: "homelessness-main-duty",
  },
  {
    id: "temporary-accommodation-households",
    label: "Households in temporary accommodation",
    measure: "Stock · quarter end",
    points: (d) => d.taHouseholds,
    cadence: "quarterly",
    asStock: true,
  },
  {
    id: "ta-households-with-children",
    label: "Households with children in temporary accommodation",
    measure: "Stock · quarter end",
    points: (d) => d.taWithChildren,
    cadence: "quarterly",
    asStock: true,
    source: "temporary-accommodation-households",
  },
  {
    id: "temporary-accommodation-children",
    label: "Children in temporary accommodation",
    measure: "Stock · quarter end",
    points: (d) => d.taChildren,
    cadence: "quarterly",
    asStock: true,
  },
  {
    id: "rough-sleeping-snapshot",
    label: "Rough sleeping autumn snapshot",
    measure: "Stock · one autumn night",
    points: (d) => d.roughSleeping,
    cadence: "annual",
    asStock: true,
  },
  {
    id: "possession-claims",
    label: "Landlord possession claims",
    measure: "Flow · quarter",
    points: (d) => d.possessionLandlordClaims,
    cadence: "quarterly",
  },
  {
    id: "landlord-orders",
    label: "Landlord possession orders",
    measure: "Flow · quarter",
    points: (d) => d.possessionLandlordOrders,
    cadence: "quarterly",
    source: "possession-claims",
  },
  {
    id: "landlord-warrants",
    label: "Landlord possession warrants",
    measure: "Flow · quarter",
    points: (d) => d.possessionLandlordWarrants,
    cadence: "quarterly",
    source: "possession-claims",
  },
  {
    id: "landlord-repossessions",
    label: "Landlord repossessions by bailiffs",
    measure: "Flow · quarter",
    points: (d) => d.possessionLandlordRepossessions,
    cadence: "quarterly",
    source: "possession-claims",
  },
  {
    id: "mortgage-claims",
    label: "Mortgage possession claims",
    measure: "Flow · quarter",
    points: (d) => d.possessionMortgageClaims,
    cadence: "quarterly",
    source: "possession-claims",
  },
  {
    id: "social-housing-waiting-list",
    label: "Households on housing registers",
    measure: "Stock · 31 March",
    points: (d) => d.waitingList,
    cadence: "annual",
    asStock: true,
  },
  {
    id: "social-housing-lettings",
    label: "New social housing lettings",
    measure: "Flow · financial year",
    points: (d) => d.lettings,
    cadence: "annual",
  },
  {
    id: "homelessness-support-needs",
    label: "Owed a duty with support needs",
    measure: "Flow · quarter",
    points: (d) => d.supportNeedsSeries,
    cadence: "quarterly",
  },
  {
    id: "temporary-accommodation-spend",
    label: "Homelessness net expenditure",
    measure: "Flow · £ thousand, financial year",
    points: (d) => d.spendNet,
    cadence: "annual",
  },
  {
    id: "spend-gross",
    label: "Homelessness gross expenditure",
    measure: "Flow · £ thousand, financial year",
    points: (d) => d.spendGross,
    cadence: "annual",
    source: "temporary-accommodation-spend",
  },
  {
    id: "homelessness-priority-need",
    label: "Main duty: vulnerable households",
    measure: "Flow · quarter",
    points: (d) => d.priorityNeedVulnerable,
    cadence: "quarterly",
  },
  {
    id: "temporary-accommodation-by-type",
    label: "Temporary accommodation · B&B / shared annexes",
    measure: "Stock · quarter end",
    points: (d) => d.taByType.find((line) => line.id === "bb-shared-annexes")?.points ?? [],
    cadence: "quarterly",
    asStock: true,
  },
  {
    id: "temporary-accommodation-duration",
    label: "Temporary accommodation under 6 months",
    measure: "Stock · length so far · quarter end",
    points: (d) => d.taDurationUnder6,
    cadence: "quarterly",
    asStock: true,
  },
  {
    id: "temporary-accommodation-out-of-area",
    label: "Out-of-area temporary accommodation · England",
    measure: "Stock · quarter end",
    points: (d) => d.taOutOfAreaEngland,
    cadence: "quarterly",
    asStock: true,
  },
  {
    id: "rough-sleeping-framework",
    label: "Rough sleeping framework · people seen in month",
    measure: "Management information · month",
    points: (d) => d.roughSleepingFramework,
    cadence: "monthly",
    asStock: true,
  },
  {
    id: "concealed-households",
    label: "Concealed families · England",
    measure: "Stock · Census Day",
    points: (d) => d.concealedFamilies,
    cadence: "annual",
    asStock: true,
  },
  {
    id: "homelessness-devolved-ta",
    label: "Devolved temporary accommodation",
    measure: "Stock · jurisdiction-specific",
    // Latest snapshot rows are drawn as a nation table, not a time series.
    points: () => [],
    cadence: "annual",
    asStock: true,
  },
];

export function insecurityDataOptions(
  sources: HousingV1["sources"],
  insecurity: Ins,
): { value: string; label: string }[] {
  // Offer a series when its indicator loaded and it has points — or devolved nation rows.
  return INSECURITY_DATA_SERIES.filter((row) => {
    if (!sources[row.source ?? row.id]) return false;
    if (row.id === "homelessness-devolved-ta") return insecurity.devolvedTa.length > 0;
    return row.points(insecurity).length > 0;
  }).map((row) => ({ value: row.id, label: row.label }));
}

export function insecurityDataFoot(
  insecurity: Ins,
  sources: HousingV1["sources"],
  seriesId: string,
): { definition: string; method: string[]; source: string; dataHref?: string } {
  const def = INSECURITY_DATA_SERIES.find((r) => r.id === seriesId) ?? INSECURITY_DATA_SERIES[0]!;
  const srcKey = def.source ?? def.id;
  const src = sources[srcKey];
  return {
    definition: `${def.label}. ${def.measure}.`,
    method: [
      "Stocks are point-in-time counts; flows are events in a period — they are never added together.",
      "Homelessness is not rough sleeping. England figures are not a UK rate.",
      "Housing-register totals divided by lettings is not a waiting time.",
      insecurity.headlines.homelessnessSpendNet != null
        ? "RO4 spending is annual council expenditure, not a cost per household in temporary accommodation."
        : "",
    ].filter(Boolean),
    source: src
      ? [src.publisher, src.release, src.geography, src.unit].filter(Boolean).join(" · ")
      : "Official releases · see catalogue",
    dataHref: src ? `/data?record=${srcKey}` : undefined,
  };
}

function periodCell(p: Pt, cadence: "quarterly" | "annual" | "monthly", asStock?: boolean): string {
  if (cadence === "quarterly") {
    const k = qKey(p.t);
    return asStock ? stockLabel(k) : flowLabel(k);
  }
  if (cadence === "monthly") return fmtT(p.t, "monthly");
  return fmtT(p.t, "annual");
}

export function InsecurityData({ insecurity, sources, seriesId }: Props) {
  const titleId = useId();
  const options = insecurityDataOptions(sources, insecurity);
  const activeId = options.some((o) => o.value === seriesId) ? seriesId : options[0]?.value ?? "";
  const def = INSECURITY_DATA_SERIES.find((r) => r.id === activeId) ?? INSECURITY_DATA_SERIES[0]!;
  const points = useMemo(() => [...def.points(insecurity)].sort((a, b) => b.t - a.t), [def, insecurity]);
  const srcKey = def.source ?? def.id;
  const src: Source | undefined = sources[srcKey];

  if (options.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Housing insecurity series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const showDevolved =
    insecurity.devolvedTa.length > 0 &&
    (activeId === "homelessness-devolved-ta" || activeId === "temporary-accommodation-households");

  if (points.length === 0 && !showDevolved) {
    return (
      <EmptyStage label="No observations">
        {def.label} has no loaded points in this build.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      {points.length > 0 && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle} id={titleId}>
            {def.label} · {def.measure}
            {src?.unit ? ` · ${src.unit}` : ""}
          </p>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={titleId}>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.t}>
                    <th scope="row">{periodCell(p, def.cadence, def.asStock)}</th>
                    <td>{fmt.count(p.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDevolved && (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            {activeId === "homelessness-devolved-ta"
              ? "Devolved temporary accommodation · separate legal definitions"
              : "Devolved temporary accommodation · separate legal definitions"}
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Nation</th>
                  <th scope="col">Period</th>
                  <th scope="col">Households</th>
                </tr>
              </thead>
              <tbody>
                {[...insecurity.devolvedTa]
                  .sort((a, b) => b.period.localeCompare(a.period))
                  .map((row) => (
                    <tr key={`${row.id}-${row.period}`}>
                      <th scope="row">{row.label}</th>
                      <td>{row.period}</td>
                      <td>{fmt.count(row.v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** Kept for model.tsx source-id lists. */
export const INSECURITY_RECORDS: { id: string; measure: string; area: string }[] = [
  { id: "statutory-homelessness-assessments", measure: "Flow · quarter", area: "Statutory homelessness" },
  { id: "homelessness-prevention-outcomes", measure: "Flow · quarter", area: "Prevention" },
  { id: "homelessness-relief-outcomes", measure: "Flow · quarter", area: "Prevention" },
  { id: "homelessness-main-duty", measure: "Flow · quarter", area: "Statutory homelessness" },
  { id: "homelessness-support-needs", measure: "Flow · quarter", area: "Households at risk" },
  { id: "homelessness-priority-need", measure: "Flow · quarter", area: "Households at risk" },
  { id: "temporary-accommodation-households", measure: "Stock · quarter end", area: "Temporary accommodation" },
  { id: "temporary-accommodation-children", measure: "Stock · quarter end", area: "Temporary accommodation" },
  { id: "temporary-accommodation-by-type", measure: "Stock · quarter end", area: "Temporary accommodation" },
  { id: "temporary-accommodation-duration", measure: "Stock · length so far", area: "Temporary accommodation" },
  { id: "temporary-accommodation-out-of-area", measure: "Stock · quarter end", area: "Displacement" },
  { id: "rough-sleeping-snapshot", measure: "Stock · one autumn night", area: "Rough sleeping" },
  { id: "rough-sleeping-framework", measure: "Management information · month", area: "Rough sleeping" },
  { id: "possession-claims", measure: "Flow · quarter", area: "Evictions and repossessions" },
  { id: "social-housing-waiting-list", measure: "Stock · 31 March", area: "Social housing registers" },
  { id: "social-housing-lettings", measure: "Flow · financial year", area: "Social housing lettings" },
  { id: "concealed-households", measure: "Stock · Census Day", area: "Hidden homelessness" },
  { id: "temporary-accommodation-spend", measure: "Flow · £ thousand, financial year", area: "Council spending" },
  { id: "homelessness-devolved-ta", measure: "Stock · jurisdiction-specific", area: "Devolved returns" },
];

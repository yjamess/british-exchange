"use client";

/**
 * Domain 08 — The Pathways of Housing Insecurity.
 *
 * Stage body only: one stage (or all-stages table) + history chart.
 * Controls live in HousingExplorer's outer ControlRow (Energy grammar).
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, toT, type Pt } from "../../../data";
import { TimeChart, type ChartSeries } from "../../../instrument/TimeChart";
import type { HousingV1, PathwayKey } from "../../load";
import { atQuarter, flowLabel, stockLabel, qKey } from "./periods";
import s from "./insecurity.module.css";
import gen from "../../../energy/generation.module.css";

type Ins = HousingV1["insecurity"];
type Place = Ins["pathwayPlaces"][number];

export type PathwaysState = { node: string | null; q: number | null; read: "diagram" | "table"; place: string | null };

type Props = {
  insecurity: Ins;
  state: PathwaysState;
};

type Kind = "process" | "flow" | "stock" | "context";

type NodeDef = {
  id: string;
  label: string;
  kind: Kind;
  group: string;
  series?: (d: Ins) => Pt[];
  key?: PathwayKey;
  history?: (d: Ins) => ChartSeries[];
  fixed?: (d: Ins) => { v: number | null; period: string };
  unit: string;
  meaning: string;
  statute?: string;
  table?: string;
  indicator?: string;
  geography: string;
  derived?: string;
};

const ENG = "England";

const NODES: NodeDef[] = [
  {
    id: "approach",
    label: "Approach for help",
    kind: "process",
    group: "Approach",
    unit: "",
    meaning:
      "A household asks a local housing authority for help, or a public body refers it under the duty to refer. Approaches are not published as a count, so this stage is process only.",
    statute: "Housing Act 1996 s.184; duty to refer s.213B",
    geography: ENG,
  },
  {
    id: "assess",
    label: "Initial assessment",
    kind: "flow",
    group: "Assessment",
    series: (d) => d.assessmentsTotal,
    key: "assessmentsTotal",
    unit: "households assessed",
    meaning:
      "Initial assessments recorded in the quarter. The authority decides whether the household is eligible and homeless or threatened with homelessness.",
    statute: "Housing Act 1996 s.184, s.189A",
    table: "H-CLIC A1",
    indicator: "statutory-homelessness-assessments",
    geography: ENG,
  },
  {
    id: "prevention",
    label: "Prevention duty owed",
    kind: "flow",
    group: "Duty owed",
    series: (d) => d.preventionOwed,
    key: "preventionOwed",
    unit: "households",
    meaning:
      "Threatened with homelessness within 56 days. The authority must take reasonable steps to help the household keep its home or find another before it becomes homeless.",
    statute: "Housing Act 1996 s.195",
    table: "H-CLIC A1",
    indicator: "statutory-homelessness-assessments",
    geography: ENG,
  },
  {
    id: "relief",
    label: "Relief duty owed",
    kind: "flow",
    group: "Duty owed",
    series: (d) => d.reliefOwed,
    key: "reliefOwed",
    unit: "households",
    meaning:
      "Already homeless. For up to 56 days the authority must take reasonable steps to help the household secure accommodation expected to last at least six months.",
    statute: "Housing Act 1996 s.189B",
    table: "H-CLIC A1",
    indicator: "statutory-homelessness-assessments",
    geography: ENG,
  },
  {
    id: "no-duty",
    label: "Not owed a duty",
    kind: "flow",
    group: "Duty owed",
    series: (d) => difference(d.assessmentsTotal, d.assessmentsOwed),
    unit: "households",
    meaning:
      "Households assessed in the quarter who were not owed a prevention or relief duty. Computed as all initial assessments minus those owed a duty, from the same table and quarter.",
    table: "H-CLIC A1",
    indicator: "statutory-homelessness-assessments",
    geography: ENG,
    derived: "Initial assessments − owed prevention or relief (A1, same quarter)",
  },
  {
    id: "prevention-ended",
    label: "Prevention duty ended",
    kind: "flow",
    group: "Duty ends",
    series: (d) => d.preventionEnded,
    key: "preventionEnded",
    unit: "duties ended",
    meaning:
      "Prevention duties that ended in the quarter, for any reason. Most of them began in earlier quarters.",
    statute: "Housing Act 1996 s.195(8)",
    table: "H-CLIC P1",
    indicator: "homelessness-prevention-outcomes",
    geography: ENG,
  },
  {
    id: "prevention-secured",
    label: "Secured accommodation",
    kind: "flow",
    group: "Recorded outcome",
    series: (d) => d.preventionSecured,
    key: "preventionSecured",
    unit: "duties ended",
    meaning:
      "Prevention duties that ended with accommodation secured for at least six months, either by staying in the current home or by moving.",
    table: "H-CLIC P1",
    indicator: "homelessness-prevention-outcomes",
    geography: ENG,
  },
  {
    id: "relief-ended",
    label: "Relief duty ended",
    kind: "flow",
    group: "Duty ends",
    series: (d) => d.reliefEnded,
    key: "reliefEnded",
    unit: "duties ended",
    meaning: "Relief duties that ended in the quarter, for any reason.",
    statute: "Housing Act 1996 s.189B",
    table: "H-CLIC R1",
    indicator: "homelessness-relief-outcomes",
    geography: ENG,
  },
  {
    id: "relief-secured",
    label: "Secured 6+ months",
    kind: "flow",
    group: "Recorded outcome",
    series: (d) => d.reliefSecured,
    key: "reliefSecured",
    unit: "duties ended",
    meaning: "Relief duties that ended with accommodation secured that is expected to last at least six months.",
    table: "H-CLIC R1",
    indicator: "homelessness-relief-outcomes",
    geography: ENG,
  },
  {
    id: "relief-56",
    label: "56 days elapsed",
    kind: "flow",
    group: "Recorded outcome",
    series: (d) => d.relief56Days,
    key: "relief56Days",
    unit: "duties ended",
    meaning:
      "Relief duties that ended because 56 days passed without accommodation being secured.",
    table: "H-CLIC R1",
    indicator: "homelessness-relief-outcomes",
    geography: ENG,
  },
  {
    id: "main",
    label: "Main duty decision",
    kind: "flow",
    group: "Main duty",
    series: (d) => d.mainDutyTotal,
    key: "mainDutyTotal",
    unit: "decisions",
    meaning: "Main duty decisions made in the quarter. These are decisions, not the same households as relief endings.",
    statute: "Housing Act 1996 s.193",
    table: "H-CLIC MD1",
    indicator: "homelessness-main-duty",
    geography: ENG,
  },
  {
    id: "main-owed",
    label: "Owed main duty",
    kind: "flow",
    group: "Main duty",
    series: (d) => d.mainDutyAccepted,
    key: "mainDutyAccepted",
    unit: "decisions",
    meaning:
      "Eligible, homeless, in priority need and not intentionally homeless. The authority must secure accommodation until the duty ends.",
    statute: "Housing Act 1996 s.193",
    table: "H-CLIC MD1",
    indicator: "homelessness-main-duty",
    geography: ENG,
  },
  {
    id: "main-intentional",
    label: "Intentionally homeless",
    kind: "flow",
    group: "Main duty",
    series: (d) => d.mainDutyIntentional,
    key: "mainDutyIntentional",
    unit: "decisions",
    meaning: "In priority need but found intentionally homeless. Owed advice and accommodation for a reasonable period only.",
    statute: "Housing Act 1996 s.190",
    table: "H-CLIC MD1",
    indicator: "homelessness-main-duty",
    geography: ENG,
  },
  {
    id: "main-no-priority",
    label: "No priority need",
    kind: "flow",
    group: "Main duty",
    series: (d) => d.mainDutyNoPriority,
    key: "mainDutyNoPriority",
    unit: "decisions",
    meaning: "Homeless but not in priority need. Owed advice and assistance, not the main duty.",
    statute: "Housing Act 1996 s.192",
    table: "H-CLIC MD1",
    indicator: "homelessness-main-duty",
    geography: ENG,
  },
  {
    id: "main-not-homeless",
    label: "Not homeless",
    kind: "flow",
    group: "Main duty",
    series: (d) => d.mainDutyNotHomeless,
    key: "mainDutyNotHomeless",
    unit: "decisions",
    meaning: "Found not homeless when the main duty decision was made.",
    table: "H-CLIC MD1",
    indicator: "homelessness-main-duty",
    geography: ENG,
  },
  {
    id: "ta",
    label: "Temporary accommodation",
    kind: "stock",
    group: "Accommodation",
    series: (d) => d.taHouseholds,
    unit: "households on the date",
    meaning:
      "Households living in temporary accommodation arranged by the authority on the last day of the quarter. A stock — not added to quarterly flows.",
    statute: "Housing Act 1996 s.188, s.193",
    table: "TA1",
    indicator: "temporary-accommodation-households",
    geography: ENG,
  },
  {
    id: "support",
    label: "Owed a duty, with support needs",
    kind: "context",
    group: "Alongside",
    series: (d) => d.supportNeedsSeries,
    unit: "households",
    meaning:
      "Households owed a prevention or relief duty that have one or more recorded support needs. Not a stage in the pathway.",
    table: "H-CLIC A3",
    indicator: "homelessness-support-needs",
    geography: ENG,
  },
  {
    id: "rough",
    label: "Sleeping rough, single night",
    kind: "context",
    group: "Alongside",
    series: (d) => d.roughSleeping,
    fixed: (d) => {
      const p = d.roughSleeping.at(-1);
      return { v: p?.v ?? null, period: p ? `One night, autumn ${Math.floor(p.t)}` : "—" };
    },
    unit: "people (estimate)",
    meaning:
      "Estimate of people sleeping rough on one night each autumn. Different period and unit from the statutory pathway.",
    table: "Autumn snapshot",
    indicator: "rough-sleeping-snapshot",
    geography: ENG,
  },
  {
    id: "possession",
    label: "Landlord possession claims",
    kind: "context",
    group: "Alongside",
    series: (d) => d.possessionLandlordClaims,
    history: (d) => [
      { id: "claims", label: "Claims", points: d.possessionLandlordClaims },
      { id: "orders", label: "Orders", points: d.possessionLandlordOrders },
      { id: "warrants", label: "Warrants", points: d.possessionLandlordWarrants },
      { id: "repossessions", label: "Bailiff repossessions", points: d.possessionLandlordRepossessions },
    ],
    unit: "claims · England and Wales",
    meaning:
      "Possession claims by landlords. Claims, orders, warrants and bailiff repossessions are separate court events — not one cohort.",
    table: "MoJ mortgage and landlord possession statistics",
    indicator: "possession-claims",
    geography: "England and Wales",
  },
  {
    id: "concealed",
    label: "Concealed families",
    kind: "context",
    group: "Alongside",
    fixed: (d) => ({ v: d.headlines.concealedFamilies, period: "Census Day, 21 Mar 2021" }),
    unit: "families",
    meaning:
      "Families living within another household. One strand of hidden housing need — not a full sofa-surfing count.",
    table: "Census 2021",
    indicator: "concealed-households",
    geography: ENG,
  },
];

const KIND_TAG: Record<Kind, string> = {
  process: "Process · not counted",
  flow: "Flow",
  stock: "Stock",
  context: "Measured separately",
};

function stageLabel(n: NodeDef): string {
  if (n.kind === "context") return `Not a stage · ${n.label}`;
  if (n.kind === "stock") return `Stock · ${n.label}`;
  if (n.kind === "process") return `Process · ${n.label}`;
  return n.label;
}

function difference(a: Pt[], b: Pt[]): Pt[] {
  const by = new Map(b.map((p) => [qKey(p.t), p.v]));
  return a.flatMap((p) => {
    const o = by.get(qKey(p.t));
    return o == null ? [] : [{ t: p.t, v: p.v - o }];
  });
}

function valueOf(n: NodeDef, d: Ins, key: number, place: Place | null = null): { v: number | null; period: string } {
  if (place && n.kind !== "context" && n.kind !== "process") {
    const pk = qKey(toT(place.period));
    if (n.kind === "stock") return { v: place.ta, period: stockLabel(pk) };
    if (n.id === "no-duty") {
      const t = place.v.assessmentsTotal;
      const o = place.v.assessmentsOwed;
      return { v: t != null && o != null ? t - o : null, period: flowLabel(pk) };
    }
    return { v: n.key ? (place.v[n.key] ?? null) : null, period: flowLabel(pk) };
  }
  if (n.fixed) return n.fixed(d);
  if (!n.series) return { v: null, period: "Process only" };
  const pts = n.series(d);
  if (n.kind === "stock") return { v: atQuarter(pts, key), period: stockLabel(key) };
  return { v: atQuarter(pts, key), period: flowLabel(key) };
}

/** Options for the outer Stage menu. */
export function pathwayStageOptions(): { value: string; label: string }[] {
  return NODES.map((n) => ({ value: n.id, label: stageLabel(n) }));
}

/** Quarter keys from assessments series. */
export function pathwayQuarterKeys(insecurity: Ins): number[] {
  return [...new Set(insecurity.assessmentsTotal.map((p) => qKey(p.t)))].sort((a, b) => a - b);
}

/** Notes foot material for the active stage. */
export function pathwayFoot(insecurity: Ins, state: PathwaysState): {
  definition: string;
  method: string[];
  source: string;
} {
  const keys = pathwayQuarterKeys(insecurity);
  const latest = keys[keys.length - 1] ?? 0;
  const key = state.q != null && keys.includes(state.q) ? state.q : latest;
  const active = NODES.find((n) => n.id === state.node) ?? NODES.find((n) => n.id === "assess")!;
  const place = insecurity.pathwayPlaces.find((p) => p.code === state.place) ?? null;
  const method = [
    active.kind === "stock"
      ? "Temporary accommodation is a stock on the last day of the quarter — not added to quarterly flows."
      : active.kind === "context"
        ? "This measure sits alongside the pathway with its own unit and period."
        : "Each pathway count is its own table and cohort — not the same households moving along a line.",
    active.derived ? `Derived. ${active.derived}` : "",
    place
      ? `${place.name}: detailed local authority tables for the latest quarter. Authorities that did not submit show a dash; England totals include estimates for them.`
      : "England from the H-CLIC time series. Scotland, Wales and Northern Ireland have different law and are not merged here.",
  ].filter(Boolean);
  return {
    definition: active.meaning,
    method,
    source: [
      active.table?.startsWith("H-CLIC")
        ? "MHCLG statutory homelessness"
        : active.table === "TA1"
          ? "MHCLG temporary accommodation"
          : active.table?.startsWith("MoJ")
            ? "Ministry of Justice possession statistics"
            : active.table === "Census 2021"
              ? "ONS Census 2021"
              : active.table === "Autumn snapshot"
                ? "MHCLG rough sleeping snapshot"
                : active.table,
      active.geography,
      flowLabel(key),
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export function Pathways({ insecurity, state }: Props) {
  const keys = useMemo(() => pathwayQuarterKeys(insecurity), [insecurity]);
  const latest = keys[keys.length - 1] ?? 0;
  const key = state.q != null && keys.includes(state.q) ? state.q : latest;
  const active = NODES.find((n) => n.id === state.node) ?? NODES.find((n) => n.id === "assess")!;
  const place = insecurity.pathwayPlaces.find((p) => p.code === state.place) ?? null;
  const geoName = place ? place.name : ENG;

  if (keys.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Statutory homelessness tables are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const activeVal = valueOf(active, insecurity, key, place);
  const activeGeo = place && active.kind !== "context" ? geoName : active.geography;
  const england =
    place && active.kind !== "context" && active.kind !== "process"
      ? valueOf(active, insecurity, place ? qKey(toT(place.period)) : key)
      : null;
  const history: ChartSeries[] = active.history
    ? active.history(insecurity)
    : active.series
      ? [{ id: active.id, label: active.label, points: active.series(insecurity) }]
      : [];
  const hasHistory = history.some((h) => h.points.length > 1);
  const cadence = active.id === "rough" ? "annual" : "quarterly";

  if (state.read === "table") {
    return (
      <div className={gen.stack}>
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            Pathway stages · {place ? place.name : ENG} · {flowLabel(key)}
          </h3>
          <PathwaysTable insecurity={insecurity} keyQ={key} place={place} active={active.id} />
        </section>
      </div>
    );
  }

  const figureTitle = [
    active.label,
    KIND_TAG[active.kind],
    active.kind !== "process" ? activeVal.period : null,
    activeGeo,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={gen.stack}>
      <section className={gen.panel} aria-label={active.label}>
        <h3 className={t.stageTitle}>{figureTitle}</h3>
        {active.kind !== "process" && (
          <p className={s.big}>
            <span className="bo-fig">{activeVal.v == null ? "—" : fmt.count(activeVal.v)}</span>
            <span>{activeVal.v == null ? "Not published for this period" : active.unit}</span>
          </p>
        )}
        {england && (
          <p className={s.metaLine}>
            England same quarter: {england.v == null ? "not published" : `${fmt.count(england.v)} ${active.unit}`}
          </p>
        )}
        {place && active.kind === "context" && (
          <p className={s.metaLine}>England figure only — not published for {place.name}.</p>
        )}
      </section>

      {hasHistory ? (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            Over time · {active.geography}
            {place && active.kind !== "context" ? " · chart stays England" : ""}
          </h3>
          <TimeChart
            series={history}
            cadence={cadence}
            format={fmt.count}
            axisFormat={fmt.countCompact}
            height={280}
            label={`${active.label} over time, ${active.geography}`}
          />
        </section>
      ) : (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Over time</h3>
          <EmptyStage label={active.kind === "process" ? "Process only" : "Single period"}>
            {active.kind === "process"
              ? "Approaches are not published as a count."
              : "Only one period is published, so there is no history to draw."}
          </EmptyStage>
        </section>
      )}
    </div>
  );
}

function PathwaysTable({
  insecurity,
  keyQ,
  place,
  active,
}: {
  insecurity: Ins;
  keyQ: number;
  place: Place | null;
  active: string;
}) {
  return (
    <div className={t.tableWrap}>
      <table className={t.table}>
        <caption>
          Statutory homelessness pathway · {place ? place.name : ENG} · rows are not additive
        </caption>
        <thead>
          <tr>
            <th scope="col">Stage</th>
            <th scope="col">Measure</th>
            <th scope="col">Period</th>
            <th scope="col">Count</th>
            <th scope="col">Unit</th>
            <th scope="col">Table</th>
          </tr>
        </thead>
        <tbody>
          {NODES.map((n) => {
            const { v, period } = valueOf(n, insecurity, keyQ, place);
            return (
              <tr key={n.id} data-active={active === n.id ? "true" : undefined}>
                <th scope="row">{n.label}</th>
                <td>{n.derived ? "Derived flow" : KIND_TAG[n.kind]}</td>
                <td>{n.kind === "process" ? "—" : period}</td>
                <td>{n.kind === "process" ? "—" : v == null ? "—" : fmt.count(v)}</td>
                <td>
                  {n.unit || "—"}
                  {place && n.kind === "context" ? " (England)" : n.geography !== ENG ? ` (${n.geography})` : ""}
                </td>
                <td>{n.table || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

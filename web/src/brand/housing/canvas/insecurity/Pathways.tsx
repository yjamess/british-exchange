"use client";

/**
 * Domain 08 — The Pathways of Housing Insecurity.
 *
 * One stage at a time, chosen from a menu, the same way the other housing views choose a
 * measure. The legal order is a sentence, not a diagram of every count at once. H-CLIC
 * tables count different cohorts (duties owed, duties ended, decisions), so the figures
 * are not one set of households. Temporary accommodation is a stock at quarter end.
 *
 * URL state (owned by HousingExplorer): node (stage), q (quarter, e.g. 2026Q1),
 * read (diagram = this stage, table = every stage), place.
 */

import { useMemo } from "react";
import { Control, ControlRow, MenuControl } from "../../..";
import { fmt, toT, type Pt } from "../../../data";
import { TimeChart, type ChartSeries } from "../../../instrument/TimeChart";
import type { HousingV1, PathwayKey } from "../../load";
import { atQuarter, flowLabel, keyParam, parseKeyParam, qKey, stockLabel } from "./periods";
import s from "./insecurity.module.css";

type Ins = HousingV1["insecurity"];
type Place = Ins["pathwayPlaces"][number];

export type PathwaysState = { node: string | null; q: number | null; read: "diagram" | "table"; place: string | null };

type Props = {
  insecurity: Ins;
  state: PathwaysState;
  onChange: (next: Partial<PathwaysState>) => void;
};

type Kind = "process" | "flow" | "stock" | "context";

type NodeDef = {
  id: string;
  label: string;
  kind: Kind;
  /** Where the stage sits in the legal order (table grouping and the route sentence). */
  group: string;
  series?: (d: Ins) => Pt[];
  /** Same measure in the by-place record (latest quarter, detailed LA tables). */
  key?: PathwayKey;
  /** Extra lines for the history chart (possession chain). */
  history?: (d: Ins) => ChartSeries[];
  /** Fixed-period entries (rough sleeping, Census) ignore the selected quarter. */
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
      "A household asks a local housing authority for help, or a public body refers it under the duty to refer. If the authority has reason to believe the household may be homeless or threatened with homelessness, it must make inquiries. Approaches are not published as a count, so this stage is process only.",
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
      "Initial assessments recorded in the quarter. The authority decides whether the household is eligible and homeless or threatened with homelessness, and agrees a personalised housing plan where a duty is owed.",
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
      "Households assessed in the quarter who were not owed a prevention or relief duty. Computed by the Exchange as all initial assessments minus those owed a duty, from the same table and quarter.",
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
      "Prevention duties that ended in the quarter, for any reason. Most of them began in earlier quarters, so they are not the households assessed in the same quarter.",
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
      "Relief duties that ended because 56 days passed without accommodation being secured. The authority then decides whether the household is owed the main housing duty.",
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
    meaning:
      "Main duty decisions made in the quarter. These are decisions, not the households whose relief duty ended in the same quarter.",
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
      "Eligible, homeless, in priority need and not intentionally homeless. The authority must secure accommodation until the duty ends, usually with an offer of settled housing.",
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
    meaning:
      "In priority need but found intentionally homeless. Owed advice and accommodation for a reasonable period only.",
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
      "Households living in temporary accommodation arranged by the authority on the last day of the quarter. This includes interim accommodation while duties are decided (s.188) and accommodation under the main duty (s.193). It is a stock, so it cannot be added to the quarterly flows.",
    statute: "Housing Act 1996 s.188, s.193",
    table: "TA1",
    indicator: "temporary-accommodation-households",
    geography: ENG,
  },
  // ——— Measured alongside the pathway (not stages) ———
  {
    id: "support",
    label: "Owed a duty, with support needs",
    kind: "context",
    group: "Alongside",
    series: (d) => d.supportNeedsSeries,
    unit: "households",
    meaning:
      "Households owed a prevention or relief duty that have one or more recorded support needs, such as mental ill health or a history of domestic abuse. This describes who is owed a duty. It is not a stage in the pathway or a clinical caseload.",
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
      "An estimate of people sleeping rough on one night each autumn. Most people who are homeless are not sleeping rough, and rough sleeping is not a statutory duty. The figure covers a different period and unit from every other stage here.",
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
      "Possession claims by landlords issued in the county courts. Claims, orders, warrants and bailiff repossessions are separate court events counted in each quarter. They do not follow one cohort, and none of them counts households made homeless.",
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
      "Families living within another household, for example a couple or a lone parent living with relatives. This is one piece of evidence of hidden housing need. It does not measure sofa surfing in full, and most hidden homelessness is not recorded in administrative data.",
    table: "Census 2021",
    indicator: "concealed-households",
    geography: ENG,
  },
];

/** Reading order of the Act. Temporary accommodation sits beside it as a stock. */
const ROUTE = ["Approach", "Assessment", "Duty owed", "Duty ends", "Recorded outcome", "Main duty"];

function whereItSits(n: NodeDef): string {
  if (n.kind === "context") {
    return "This is not a stage of the Act. It is published alongside the pathway, with its own unit and period.";
  }
  if (n.kind === "stock") {
    return "Temporary accommodation is a stock on the last day of the quarter. It is not the next step after a duty, and it is not added to that quarter’s flows.";
  }
  return `Legal order: ${ROUTE.join(" → ")}. This figure is ${n.group}. The counts on either side come from different tables, not the same households.`;
}

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

const KIND_TAG: Record<Kind, string> = {
  process: "Process · not counted",
  flow: "Flow",
  stock: "Stock",
  context: "Measured separately",
};

export function Pathways({ insecurity, state, onChange }: Props) {
  const keys = useMemo(
    () => [...new Set(insecurity.assessmentsTotal.map((p) => qKey(p.t)))].sort((a, b) => a - b),
    [insecurity.assessmentsTotal],
  );
  const latest = keys[keys.length - 1] ?? 0;
  const key = state.q != null && keys.includes(state.q) ? state.q : latest;
  const active = NODES.find((n) => n.id === state.node) ?? NODES.find((n) => n.id === "assess")!;
  const place = insecurity.pathwayPlaces.find((p) => p.code === state.place) ?? null;
  const geoName = place ? place.name : ENG;
  const shownKey = place ? qKey(toT(place.period)) : key;

  if (keys.length === 0) {
    return (
      <p className={s.lede}>
        Statutory homelessness tables are not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  const activeVal = valueOf(active, insecurity, key, place);
  const activeGeo = place && active.kind !== "context" ? geoName : active.geography;
  const england =
    place && active.kind !== "context" && active.kind !== "process"
      ? valueOf(active, insecurity, shownKey)
      : null;
  const history: ChartSeries[] = active.history
    ? active.history(insecurity)
    : active.series
      ? [{ id: active.id, label: active.label, points: active.series(insecurity) }]
      : [];
  const hasHistory = history.some((h) => h.points.length > 1);
  const cadence = active.id === "rough" ? "annual" : "quarterly";
  const source = [active.table, active.statute, active.derived].filter(Boolean).join(" · ");

  return (
    <div className={s.root}>
      <p className={s.lede}>
        One stage of the homelessness law at a time. Each count is its own table, so the figures
        are not the same households moving along a line. Temporary accommodation is a stock on the
        last day of the quarter.
      </p>

      <ControlRow label="Pathway controls">
        <MenuControl
          label="View"
          value={state.read}
          options={[
            { value: "diagram", label: "This stage" },
            { value: "table", label: "All stages" },
          ]}
          onChange={(v) => onChange({ read: v === "table" ? "table" : "diagram" })}
        />
        <MenuControl
          label="Stage"
          value={active.id}
          options={NODES.map((n) => ({ value: n.id, label: stageLabel(n) }))}
          onChange={(id) => onChange({ node: id })}
        />
        <MenuControl
          label="Place"
          value={place?.code ?? "england"}
          options={[
            { value: "england", label: "England" },
            ...insecurity.pathwayPlaces.map((p) => ({
              value: p.code,
              label: p.kind === "region" ? `${p.name} (region)` : p.name,
            })),
          ]}
          onChange={(v) => onChange({ place: v === "england" ? null : v })}
        />
        {place ? (
          <Control label="Quarter">
            {() => <span className={s.fixedValue}>{flowLabel(shownKey)} · latest published by place</span>}
          </Control>
        ) : (
          <MenuControl
            label="Quarter"
            value={keyParam(key)}
            options={[...keys].reverse().map((k) => ({ value: keyParam(k), label: flowLabel(k) }))}
            onChange={(v) => {
              const next = parseKeyParam(v);
              onChange({ q: next == null || next === latest ? null : next });
            }}
          />
        )}
      </ControlRow>

      {state.read === "table" ? (
        <>
          <PathwaysTable
            insecurity={insecurity}
            keyQ={key}
            place={place}
            active={active.id}
            onSelect={(id) => onChange({ node: id, read: "diagram" })}
          />
          <p className={s.note}>
            Each row is its own published table. The rows are not one set of households, and they
            do not add up. Choose a stage to read it on its own.
          </p>
        </>
      ) : (
        <section className={s.section} aria-label={active.label}>
          <p className="bo-label">
            {KIND_TAG[active.kind]}
            {active.kind !== "process" ? ` · ${activeVal.period}` : ""} · {activeGeo}
          </p>
          <p className={s.name}>{active.label}</p>
          {active.kind !== "process" && (
            <p className={s.big}>
              <span className="bo-fig">{activeVal.v == null ? "—" : fmt.count(activeVal.v)}</span>
              <span>{activeVal.v == null ? "Not published for this period" : active.unit}</span>
            </p>
          )}
          <p className={s.note}>{active.meaning}</p>
          <p className={s.note}>{whereItSits(active)}</p>
          {england && (
            <p className={s.note}>
              England in the same quarter: {england.v == null ? "not published" : `${fmt.count(england.v)} ${active.unit}`}.
            </p>
          )}
          {place && active.kind === "context" && (
            <p className={s.note}>This measure stays an England figure. It is not published here for {place.name}.</p>
          )}
          {hasHistory ? (
            <>
              <p className="bo-label">
                {active.label} over time · {active.geography}
                {place && active.kind !== "context" ? " · the chart stays England; a history by place is not loaded" : ""}
              </p>
              <TimeChart
                series={history}
                cadence={cadence}
                format={fmt.count}
                axisFormat={fmt.countCompact}
                height={280}
                label={`${active.label} over time, ${active.geography}`}
              />
            </>
          ) : (
            <p className={s.note}>
              {active.kind === "process"
                ? "Approaches are not published as a count, so there is nothing to plot."
                : "Only one period is published, so there is no history to draw."}
            </p>
          )}
          {source && <p className={s.note}>{source}</p>}
        </section>
      )}

      <p className={s.note}>
        {place
          ? `${place.name}: MHCLG detailed local authority tables for the latest quarter only. Authorities that did not submit data show a dash, and England totals include MHCLG estimates for them, so authority figures do not sum exactly to England. `
          : "England from the H-CLIC time series. Choose a region or local authority for the latest quarter. "}
        Scotland, Wales and Northern Ireland have different homelessness law and are not merged
        into these figures.
      </p>
    </div>
  );
}

function PathwaysTable({
  insecurity,
  keyQ,
  place,
  active,
  onSelect,
}: {
  insecurity: Ins;
  keyQ: number;
  place: Place | null;
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption>
          Statutory homelessness pathway and related measures · {place ? place.name : ENG} · rows are not additive
        </caption>
        <thead>
          <tr>
            <th scope="col">Stage</th>
            <th scope="col">Measure</th>
            <th scope="col">Period</th>
            <th scope="col" className={s.num}>
              Count
            </th>
            <th scope="col">Unit</th>
            <th scope="col">Table · law</th>
          </tr>
        </thead>
        <tbody>
          {NODES.map((n) => {
            const { v, period } = valueOf(n, insecurity, keyQ, place);
            return (
              <tr key={n.id}>
                <th scope="row">
                  <button type="button" className={s.rowBtn} aria-pressed={active === n.id} onClick={() => onSelect(n.id)}>
                    {n.label}
                  </button>
                </th>
                <td>{n.derived ? "Derived flow" : KIND_TAG[n.kind]}</td>
                <td>{n.kind === "process" ? "—" : period}</td>
                <td className={s.num}>{n.kind === "process" ? "—" : v == null ? "—" : fmt.count(v)}</td>
                <td>
                  {n.unit || "—"}
                  {place && n.kind === "context" ? " (England)" : n.geography !== ENG ? ` (${n.geography})` : ""}
                </td>
                <td>{[n.table, n.statute].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

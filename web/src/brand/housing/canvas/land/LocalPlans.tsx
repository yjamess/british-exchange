"use client";

/**
 * Domain 06 — Local plans. Who has a plan, how old it is, and who is writing a new one.
 * Planning Data `local-plan` snapshot (T17). Plan status — not site allocations.
 */

import { useId } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import gen from "../../../energy/generation.module.css";

type Council = {
  code: string;
  name: string;
  plan: string | null;
  adopted: string | null;
  adoptedFrom: "adopted-date" | "start-date" | null;
  ageYears: number | null;
  ageBand: string;
  periodEnd: string | null;
  requiredHousing: number | null;
  jointRequiredHousing?: number | null;
  joint: boolean;
  prepStage: string | null;
};

export type LocalPlanStatus = {
  asAt: string;
  lpaCount: number;
  withAdoptedPlan: number;
  olderThanFive: number;
  preparing: number;
  ageBands: { id: string; label: string; lpas: number }[];
  prepStages: { id: string; label: string; lpas: number }[];
  vintage: { year: number; lpas: number }[];
  councils: Council[];
  coverage: {
    planRecords: number;
    blankStageRecords: number;
    adoptedFromStartDate: number;
    withRequiredHousing: number;
    jointPlans: number;
  };
  source: { landing: string; licence: string };
};

function asAtLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortName(name: string): string {
  // "St Albans City and District Council" keeps its full name.
  if (/ and [A-Z][a-z]+ Council$/.test(name)) return name.replace(/ Council$/, "");
  return name
    .replace(/^London Borough of /, "")
    .replace(/^Royal Borough of /, "")
    .replace(/ (City|County|Borough|District|Metropolitan Borough|Metropolitan District|Unitary) Council$/, "")
    .replace(/ Council$/, "");
}

/** Plan names are long; this column wraps so the figures stay in view. */
const WRAP = { whiteSpace: "normal", textAlign: "left", minWidth: "14rem" } as const;

export function localPlansFigures(plans: LocalPlanStatus | null): { label: string; value: string; note: string }[] {
  if (!plans) return [];
  const when = asAtLabel(plans.asAt);
  return [
    {
      label: "Councils with an adopted plan",
      value: `${fmt.count(plans.withAdoptedPlan)} of ${fmt.count(plans.lpaCount)}`,
      note: `England · ${when}`,
    },
    {
      label: "Plan adopted 5 or more years ago",
      value: fmt.count(plans.olderThanFive),
      note: `${Math.round((plans.olderThanFive / Math.max(plans.withAdoptedPlan, 1)) * 100)}% of adopted plans`,
    },
    {
      label: "Writing a new plan",
      value: fmt.count(plans.preparing),
      note: "Councils with a plan in preparation",
    },
  ];
}

export function localPlansFoot(plans: LocalPlanStatus | null): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const c = plans?.coverage;
  return {
    definition:
      "A local plan is the council’s plan for what can be built where: how many homes, and which land is kept for building, jobs or open space. Planning applications are decided against it. This view shows how old each council’s adopted plan is and which councils are writing a new one.",
    method: [
      "Councils here are every current local planning authority in England, including national parks and development corporations.",
      "A plan’s age runs from the day it was adopted. National policy asks councils to review their plan at least every five years.",
      c
        ? `Planning Data is compiled from councils and has gaps. ${fmt.count(c.blankStageRecords)} of ${fmt.count(c.planRecords)} plan records have no stage; they are not counted as adopted unless they give an adoption date. Some councils with an adopted plan are missing.`
        : "Planning Data is compiled from councils and has gaps.",
      c
        ? `For ${fmt.count(c.adoptedFromStartDate)} plans the adoption date field is blank, so the record’s start date is used.`
        : "",
      "A joint plan written by several councils counts for each of them. Its housing figure covers all of them, so it is not shown against any one council.",
      "Homes required is the plan’s own figure over its whole plan period. It is not a yearly target and periods differ, so councils cannot be compared on it.",
      "New councils formed from older ones may still use their predecessors’ plans; those are not shown as the new council’s own plan.",
      "This is the status of plans, not the sites they set aside for building. Those sites are not published for England as a whole.",
    ].filter(Boolean),
    source: plans
      ? `MHCLG · Planning Data local plans and organisations · England · ${asAtLabel(plans.asAt)}`
      : "MHCLG · Planning Data local plans · England",
    dataHref: "/data#local-plan-status",
  };
}

export function LocalPlans({ plans }: { plans: LocalPlanStatus | null }) {
  const titleId = useId();
  if (!plans || plans.councils.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Local plan status is not loaded yet. Nothing is estimated in its place.
      </EmptyStage>
    );
  }

  const when = asAtLabel(plans.asAt);
  const ageRows = plans.ageBands.map((b) => ({ id: b.id, label: b.label, v: b.lpas }));
  const stageRows = plans.prepStages
    .filter((s) => s.lpas > 0)
    .map((s) => ({ id: s.id, label: s.label, v: s.lpas }));
  const stageLabel = new Map(plans.prepStages.map((s) => [s.id, s.label]));

  // Years with no adoptions are zero, not gaps: every current plan is counted.
  const years = plans.vintage.map((r) => r.year);
  const byYear = new Map(plans.vintage.map((r) => [r.year, r.lpas]));
  const vintagePts =
    years.length > 0
      ? Array.from({ length: Math.max(...years) - Math.min(...years) + 1 }, (_, i) => {
          const y = Math.min(...years) + i;
          return { t: y, v: byYear.get(y) ?? 0 };
        })
      : [];

  const rows = [...plans.councils].sort(
    (a, b) => (b.ageYears ?? -1) - (a.ageYears ?? -1) || a.name.localeCompare(b.name),
  );

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>How old each council’s local plan is · England · {when}</h3>
        <RankBars label="Local planning authorities by age of their adopted local plan" rows={ageRows} format={fmt.count} />
      </section>

      {vintagePts.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>When today’s local plans were adopted · councils by year</h3>
          <TimeChart
            kind="bars"
            series={[{ id: "adopted", label: "Plans adopted that year, still in force", points: vintagePts }]}
            cadence="annual"
            format={(v) => `${fmt.count(v)} councils`}
            axisFormat={fmt.count}
            height={260}
            label="Councils by the year their current adopted local plan was adopted"
          />
        </section>
      )}

      {stageRows.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Councils writing a new plan · furthest stage reached</h3>
          <RankBars label="Councils preparing a new local plan by stage" rows={stageRows} format={fmt.count} />
        </section>
      )}

      <section className={t.tableGroup}>
        <p className={t.stageTitle} id={titleId}>
          Every council · oldest plan first, councils with no plan in the data last
        </p>
        <div className={t.tableWrap}>
          <table className={t.table} aria-labelledby={titleId}>
            <thead>
              <tr>
                <th scope="col">Council</th>
                <th scope="col" style={WRAP}>Adopted plan</th>
                <th scope="col">Adopted</th>
                <th scope="col">Age</th>
                <th scope="col">Runs to</th>
                <th scope="col">Homes required</th>
                <th scope="col">New plan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.code}>
                  <th scope="row">{shortName(c.name)}</th>
                  <td style={WRAP}>{c.plan ?? "None in the data"}</td>
                  <td>{c.adopted ? c.adopted.slice(0, 4) : "—"}</td>
                  <td>{c.ageYears != null ? `${c.ageYears.toFixed(1)} yrs` : "—"}</td>
                  <td>{c.periodEnd ?? "—"}</td>
                  <td>{c.joint ? "Joint plan" : c.requiredHousing != null ? fmt.count(c.requiredHousing) : "—"}</td>
                  <td>{c.prepStage ? stageLabel.get(c.prepStage) ?? c.prepStage : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

/**
 * Domain 06 — Planning Decision Machine.
 * Official P120 England totals: received → decided → granted in the same quarter.
 * Quarter control lives in HousingExplorer. These are period totals, not one tracked cohort.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as xc } from "../../..";
import { fmt, fmtT, type Pt } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./land.module.css";
import gen from "../../../energy/generation.module.css";

type Props = {
  planning: HousingV1["planningFlow"];
  /** Index into planning.received times, from the outer ControlRow. */
  quarterIndex: number | null;
  focus: StageId | null;
  onFocus: (next: StageId | null) => void;
};

export type StageId = "received" | "decided" | "granted";

const STAGES: { id: StageId; label: string; definition: string }[] = [
  {
    id: "received",
    label: "Applications received",
    definition: "Applications received are district planning applications received in the quarter.",
  },
  {
    id: "decided",
    label: "Applications decided",
    definition: "Applications decided were decided in the quarter. They are not necessarily the applications received in that quarter.",
  },
  {
    id: "granted",
    label: "Decisions granted",
    definition: "Decisions granted were granted in the quarter. A grant is not a dwelling completion.",
  },
];

export function planningQuarterOptions(planning: HousingV1["planningFlow"]): {
  value: string;
  label: string;
  index: number;
}[] {
  return planning.received
    .map((p, index) => ({
      value: String(index),
      label: fmtT(p.t, "quarterly"),
      index,
    }))
    .reverse();
}

export function planningFoot(
  planning: HousingV1["planningFlow"],
  quarterIndex: number | null,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const times = planning.received.map((p) => p.t);
  const latest = times.length - 1;
  const idx =
    quarterIndex != null && quarterIndex >= 0 && quarterIndex < times.length ? quarterIndex : latest;
  const period = times[idx] != null ? fmtT(times[idx]!, "quarterly") : null;
  return {
    definition:
      "Received, decided and granted in the same quarter are separate totals — not one set of applications moving through a machine.",
    method: [
      ...STAGES.map((stage) => stage.definition),
      "The share granted is decisions granted divided by decisions in the same quarter — not a share of applications received.",
      "This is not a case file or a local plan. Case-level applications stay a labelled gap until Planning Data publishes them.",
      "Inspectorate appeals are a separate instrument on this view (Casework Database aggregates), not P120.",
      "Do not read the gap between received and granted as stalled homes.",
    ],
    source:
      period != null
        ? `MHCLG · Live Table P120 · England district planning authorities · ${period}`
        : "MHCLG · Live Table P120 · England district planning authorities",
    dataHref: "/data#planning-decisions-granted",
  };
}

export function PlanningDecisionMachine({ planning, quarterIndex, focus, onFocus }: Props) {
  const times = planning.received.map((p) => p.t);
  const latest = Math.max(0, times.length - 1);
  const safeIdx =
    quarterIndex != null && quarterIndex >= 0 && quarterIndex < times.length ? quarterIndex : latest;
  const t = times[safeIdx];

  const at = (pts: Pt[], time: number | undefined) =>
    time == null ? null : pts.find((p) => Math.abs(p.t - time) < 1e-6)?.v ?? null;

  const received = at(planning.received, t);
  const decided = at(planning.decided, t);
  const granted = at(planning.granted, t);
  const values: Record<StageId, number | null> = { received, decided, granted };
  const maxV = Math.max(1, ...Object.values(values).map((v) => v ?? 0));
  const grantRate =
    decided != null && decided > 0 && granted != null ? (granted / decided) * 100 : null;
  const period = t != null ? fmtT(t, "quarterly") : "";

  const chartSeries = useMemo(
    () => [
      { id: "received", label: "Received", points: planning.received },
      { id: "decided", label: "Decided", points: planning.decided },
      { id: "granted", label: "Granted", points: planning.granted },
    ],
    [planning],
  );

  if (times.length === 0) {
    return (
      <EmptyStage label="In preparation">
        District planning application statistics are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>
          Applications in the quarter · England · {period}
        </h3>
        <div className={s.machine}>
          <div className={s.flow}>
            {STAGES.map((stage, i) => {
              const v = values[stage.id];
              const width = v == null ? 0 : Math.min(100, (v / maxV) * 100);
              return (
                <div key={stage.id} className={s.flowStep}>
                  {i > 0 && <div className={s.flowArrow} aria-hidden />}
                  <button
                    type="button"
                    className={s.flowCard}
                    data-active={focus === stage.id ? "true" : "false"}
                    aria-pressed={focus === stage.id}
                    onClick={() => onFocus(focus === stage.id ? null : stage.id)}
                  >
                    <span className="bo-label">{stage.label}</span>
                    <span className={`bo-fig ${s.flowValue}`}>{v == null ? "—" : fmt.count(v)}</span>
                    <div className={s.flowBarWrap} aria-hidden>
                      <div className={s.flowBar} style={{ width: `${width}%` }} />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
          {grantRate != null && (
            <p className={s.metaLine}>
              Share of decisions granted · <span className="bo-fig">{grantRate.toFixed(0)}%</span>
            </p>
          )}
        </div>
      </section>

      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>Received, decided and granted · quarterly</h3>
        <TimeChart
          series={chartSeries}
          cadence="quarterly"
          format={fmt.count}
          axisFormat={fmt.countCompact}
          height={300}
          label="England district planning applications — received, decided, granted"
        />
      </section>
    </div>
  );
}

"use client";

/**
 * Domain 06 — Planning Decision Machine (statistical mode).
 * Official P120 England totals: received → decided → granted in the same quarter.
 * These are period totals, not a tracked cohort of the same applications.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { fmt, fmtT, type Pt } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import type { InsideFoot } from "../quality/InsideHomes";
import type { HousingV1 } from "../../load";
import s from "./land.module.css";

type Props = {
  planning: HousingV1["planningFlow"];
  onFoot?: (foot: InsideFoot) => void;
};

type StageId = "received" | "decided" | "granted";

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

const CAVEATS = [
  "Received, decided and granted in the same quarter are separate totals, not one set of applications.",
  "This is not a case file, a local plan, or an appeal.",
  "Do not read the gap between received and granted as stalled homes.",
  "The share granted is decisions granted divided by decisions in the same quarter. It is not a share of applications received.",
];

export function PlanningDecisionMachine({ planning, onFoot }: Props) {
  const uid = useId().replace(/:/g, "");
  const times = planning.received.map((p) => p.t);
  const [idx, setIdx] = useState(() => Math.max(0, times.length - 1));
  const [focus, setFocus] = useState<StageId | null>(null);

  const safeIdx = times.length === 0 ? 0 : Math.min(idx, times.length - 1);
  const t = times[safeIdx];

  const at = (pts: Pt[], time: number | undefined) =>
    time == null ? null : pts.find((p) => Math.abs(p.t - time) < 1e-6)?.v ?? null;

  const received = at(planning.received, t);
  const decided = at(planning.decided, t);
  const granted = at(planning.granted, t);
  const values: Record<StageId, number | null> = { received, decided, granted };
  const maxV = Math.max(1, ...Object.values(values).map((v) => v ?? 0));

  /** Official matched ratio: grants ÷ decisions in the same quarter (publisher %). */
  const grantRate =
    decided != null && decided > 0 && granted != null ? (granted / decided) * 100 : null;

  const chartSeries = useMemo(
    () => [
      { id: "received", label: "Received", points: planning.received },
      { id: "decided", label: "Decided", points: planning.decided },
      { id: "granted", label: "Granted", points: planning.granted },
    ],
    [planning],
  );

  const period = t != null ? fmtT(t, "quarterly") : "";
  const focused = focus ? STAGES.find((x) => x.id === focus) : null;
  const definition = (
    focused
      ? [focused.definition, ...STAGES.filter((stage) => stage.id !== focus).map((stage) => stage.definition)]
      : STAGES.map((stage) => stage.definition)
  ).join("\n");

  useEffect(() => {
    onFoot?.({
      source: "MHCLG · Live Table P120",
      coverage: ["England district planning authorities", period].filter(Boolean).join(" · "),
      definition: definition.split("\n"),
      caveats: CAVEATS,
      dataHref: "/data#planning-decisions-granted",
    });
  }, [onFoot, period, definition]);

  if (times.length === 0) {
    return (
      <p className={s.lede}>
        District planning application statistics are not loaded yet. The Exchange does not show
        estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Applications England’s district planning authorities received, decided, and granted in the quarter.
      </p>

      <div className={s.yearRow}>
        <label className={s.yearField} htmlFor={`${uid}-q`}>
          <span className="bo-label">Quarter</span>
          <input
            id={`${uid}-q`}
            type="range"
            min={0}
            max={times.length - 1}
            step={1}
            value={safeIdx}
            onChange={(e) => setIdx(Number(e.target.value))}
            aria-valuetext={t != null ? fmtT(t, "quarterly") : undefined}
          />
          <span className={`bo-fig ${s.yearOut}`}>{t != null ? fmtT(t, "quarterly") : "—"}</span>
        </label>
      </div>

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
                  onClick={() => setFocus((prev) => (prev === stage.id ? null : stage.id))}
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
          <p className={s.note}>
            Share of decisions granted this quarter · <span className="bo-fig">{grantRate.toFixed(0)}%</span>
          </p>
        )}

        {focused && <p className={s.note}>{focused.definition}</p>}
      </div>

      <TimeChart
        series={chartSeries}
        cadence="quarterly"
        format={fmt.count}
        axisFormat={fmt.countCompact}
        height={300}
        label="England district planning applications — received, decided, granted"
      />
    </div>
  );
}

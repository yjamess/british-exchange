"use client";

/**
 * Domain 06 — Historical change.
 * The published series is England's Green Belt area at each 31 March.
 * It is hectares, not a map of the boundary in earlier years.
 */

import { fmt, fmtT, type Pt } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import s from "./land.module.css";

export function HistoricalChange({ greenBelt }: { greenBelt: Pt[] }) {
  const first = greenBelt[0];
  const latest = greenBelt.at(-1);
  const change = first && latest ? latest.v - first.v : null;

  if (!first || !latest) {
    return (
      <p className={s.lede}>
        The Green Belt area series is not loaded yet. The Exchange does not draw a past boundary from today’s polygon.
      </p>
    );
  }

  const firstYear = fmtT(first.t, "annual");
  const latestYear = fmtT(latest.t, "annual");
  const direction = change == null ? "" : change >= 0 ? "larger" : "smaller";

  return (
    <div className={s.root}>
      <p className={s.lede}>
        England’s Green Belt at each 31 March, in hectares. Move along the line to see the designated
        area grow or shrink. This is not a map you can rewind: the boundary drawn on Land explorer is
        the current one.
      </p>
      <p className={s.note}>
        {firstYear}: {fmt.count(first.v)} ha. {latestYear}: {fmt.count(latest.v)} ha.
        {change != null
          ? ` The designated area is ${fmt.count(Math.abs(change))} ha ${direction} than in ${firstYear}.`
          : ""}
      </p>
      <TimeChart
        series={[{ id: "green-belt", label: "Green Belt", points: greenBelt }]}
        cadence="annual"
        format={(v) => `${fmt.count(v)} ha`}
        axisFormat={(v) => fmt.countCompact(v)}
        area
        height={360}
        label="England Green Belt area, hectares at 31 March"
      />
    </div>
  );
}

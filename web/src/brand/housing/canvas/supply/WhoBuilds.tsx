"use client";

/**
 * Domain 05 — Who Builds Our Homes?
 * Builder tenure (Live Table 213) and affordable products (Live Table 1000).
 * Distinguishes who built from the affordable product type of the dwelling.
 */

import { useMemo, useState } from "react";
import { fmt, fmtFY, fmtT } from "../../../data";
import { TimeChart, type ChartSeries, type Cadence } from "../../../instrument/TimeChart";
import { ControlRow, MenuControl } from "../../../template";
import type { HousingV1 } from "../../load";
import s from "./supply.module.css";

type Props = {
  whoBuilds: HousingV1["whoBuilds"];
};

type Mode = "completions" | "starts" | "affordable";

const MEASURES: { value: Mode; label: string }[] = [
  { value: "completions", label: "Builder · completions" },
  { value: "starts", label: "Builder · starts" },
  { value: "affordable", label: "Affordable products" },
];

export function WhoBuilds({ whoBuilds }: Props) {
  const [mode, setMode] = useState<Mode>("completions");

  const lines =
    mode === "completions"
      ? whoBuilds.completions
      : mode === "starts"
        ? whoBuilds.starts
        : whoBuilds.affordable;

  const series: ChartSeries[] = useMemo(
    () => lines.filter((l) => l.points.length > 0).map((l) => ({ id: l.id, label: l.label, points: l.points })),
    [lines],
  );

  const cadence: Cadence = mode === "affordable" ? "annual" : "quarterly";
  const latest = series.map((line) => {
    const pt = line.points[line.points.length - 1];
    return pt ? { label: line.label, v: pt.v, t: pt.t } : null;
  });
  const affordableAll = whoBuilds.affordableTotal[whoBuilds.affordableTotal.length - 1];

  if (series.length === 0 && mode !== "affordable") {
    return (
      <p className={s.lede}>
        Tenure-split house building is not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  if (mode === "affordable" && series.length === 0) {
    return (
      <p className={s.lede}>
        Affordable housing supply is not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        {mode === "affordable"
          ? "Additional affordable homes completed in England by product (MHCLG Live Table 1000) — not all new homes or net additions."
          : "Who started or completed new homes in England by builder (MHCLG Live Table 213) — not the tenure of occupation after completion."}
      </p>

      <ControlRow>
        <MenuControl label="Measure" value={mode} options={MEASURES} onChange={setMode} />
      </ControlRow>

      {mode === "affordable" && affordableAll && (
        <div className={s.netRow}>
          <span className={s.netLabel}>All affordable · England</span>
          <span className={`bo-fig ${s.netValue}`}>{fmt.count(affordableAll.v)}</span>
          <span className={s.caveat}>{fmtFY(affordableAll.t)} · financial year · not all completions</span>
        </div>
      )}

      {mode !== "affordable" && (
        <div className={s.netRow}>
          {latest.filter(Boolean).map((x) => (
            <span key={x!.label} className={s.caveat}>
              <strong className="bo-fig">{fmt.count(x!.v)}</strong> {x!.label.toLowerCase()} ·{" "}
              {fmtT(x!.t, cadence)}
            </span>
          ))}
        </div>
      )}

      <TimeChart
        series={series}
        cadence={cadence}
        periodLabel={mode === "affordable" ? fmtFY : undefined}
        format={fmt.count}
        axisFormat={fmt.countCompact}
        height={360}
        label={
          mode === "affordable"
            ? "England additional affordable homes by tenure — completions"
            : `England house building by builder tenure — ${mode}`
        }
      />

      {mode === "affordable" ? (
        <p className={s.caveat}>
          England only, financial years. These are affordable products, not the builder. They are not
          Live Table 213 completions and not net additional dwellings. The latest year can be provisional.
        </p>
      ) : (
        <p className={s.caveat}>
          England, quarterly dwellings, by who built them. A quarter is not a financial-year total.
          A dotted stroke marks a provisional quarter.
        </p>
      )}
    </div>
  );
}

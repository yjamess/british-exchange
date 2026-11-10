"use client";

/**
 * Domain 05 — Who Builds Our Homes?
 * Builder tenure (Live Table 213) and affordable products (Live Table 1000).
 * Distinguishes who built from the affordable product type of the dwelling.
 * Measure control lives in HousingExplorer.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtFY, fmtT } from "../../../data";
import { TimeChart, type ChartSeries, type Cadence } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";
import type { Figure } from "../model";

export type WhoBuildsMode = "completions" | "starts" | "affordable";

type Props = {
  whoBuilds: HousingV1["whoBuilds"];
  mode: WhoBuildsMode;
};

export const WHO_BUILDS_MEASURE_OPTIONS: { value: WhoBuildsMode; label: string }[] = [
  { value: "completions", label: "Builder · completions" },
  { value: "starts", label: "Builder · starts" },
  { value: "affordable", label: "Affordable products" },
];

export function whoBuildsFoot(mode: WhoBuildsMode): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  if (mode === "affordable") {
    return {
      definition:
        "Additional affordable homes completed in England by product — not all new homes, and not net additions.",
      method: [
        "England only, financial years (MHCLG Live Table 1000).",
        "These are affordable products, not the builder. They are not Live Table 213 completions.",
        "The latest year can be provisional.",
      ],
      source: "MHCLG · Live Table 1000 · England · financial years",
      dataHref: "/data#affordable-housing-supply",
    };
  }
  return {
    definition:
      "Who started or completed new homes in England by builder — not the tenure of occupation after completion.",
    method: [
      "England, quarterly dwellings (MHCLG Live Table 213).",
      "A quarter is not a financial-year total.",
      "A dotted stroke marks a provisional quarter.",
    ],
    source: `MHCLG · Live Table 213 · England · ${mode}`,
    dataHref: mode === "starts" ? "/data#housing-starts" : "/data#housing-completions",
  };
}

export function whoBuildsFigures(whoBuilds: HousingV1["whoBuilds"], mode: WhoBuildsMode): Figure[] {
  if (mode === "affordable") {
    const all = whoBuilds.affordableTotal[whoBuilds.affordableTotal.length - 1];
    const lines = whoBuilds.affordable
      .map((l) => {
        const pt = l.points[l.points.length - 1];
        return pt ? { label: l.label, value: fmt.count(pt.v), note: `${fmtFY(pt.t)} · dwellings` } : null;
      })
      .filter(Boolean) as Figure[];
    return [
      all && { label: "All affordable · England", value: fmt.count(all.v), note: `${fmtFY(all.t)} · not the builder` },
      ...lines.slice(0, 2),
    ].filter(Boolean) as Figure[];
  }
  const lines = mode === "completions" ? whoBuilds.completions : whoBuilds.starts;
  return lines
    .map((l) => {
      const pt = l.points[l.points.length - 1];
      return pt
        ? {
            label: l.label,
            value: fmt.count(pt.v),
            note: `${fmtT(pt.t, "quarterly")} · dwellings`,
          }
        : null;
    })
    .filter(Boolean)
    .slice(0, 3) as Figure[];
}

export function WhoBuilds({ whoBuilds, mode }: Props) {
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

  if (series.length === 0) {
    return (
      <EmptyStage label="In preparation">
        {mode === "affordable"
          ? "Affordable housing supply is not loaded yet. No estimated figures."
          : "Tenure-split house building is not loaded yet. No estimated figures."}
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          {mode === "affordable"
            ? "England additional affordable homes by tenure — completions"
            : `England house building by builder tenure — ${mode}`}
        </h3>
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
          showTable={false}
        />
      </section>
    </div>
  );
}

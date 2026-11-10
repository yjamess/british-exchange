"use client";

/**
 * Long-run UK final energy demand (ECUK Table C1, 1970–).
 * Same explorer structure as Energy Metabolism: stageTitle panels + TimeChart / ChangeRows / RankBars.
 * Multi-series lines use TimeChart end leaders (Generation mix pattern).
 */

import { useMemo } from "react";
import { ChangeRows, RankBars, TimeChart } from "../instrument/TimeChart";
import { explorerClasses as t } from "../template";
import type { Observation } from "@/lib/api";
import type { SectorId } from "./consumption-model";
import {
  appetiteData,
  fmtKtoe,
  fmtMeasure,
  measured,
  type AppetiteLens,
  type AppetiteMeasure,
} from "./appetite-model";
import s from "./generation.module.css";

type Props = {
  rows: Observation[];
  lens: AppetiteLens;
  scope: SectorId;
  measure: AppetiteMeasure;
  indexBase: number;
  yearA: number;
  yearB: number;
};

export function ConsumptionAppetite({ rows, lens, scope, measure, indexBase, yearA, yearB }: Props) {
  const data = useMemo(() => appetiteData(rows, lens, scope), [rows, lens, scope]);

  if (!data.years.length) {
    return <p className={s.links}>Long-run energy demand figures are not available right now.</p>;
  }

  const first = data.years[0]!;
  const last = data.years.at(-1)!;
  const baseIndex = Math.max(0, data.years.indexOf(indexBase));
  const fmt = fmtMeasure(measure);
  const iA = data.years.indexOf(yearA);
  const iB = data.years.indexOf(yearB);

  const chartSeries = data.series.map((sr) => ({
    id: sr.id,
    label: sr.label,
    points: data.years
      .map((tYear, i) => ({ t: tYear, v: measured(data, sr, i, measure, baseIndex) }))
      .filter((p) => Number.isFinite(p.v)),
  }));

  const thenNowRows =
    iA >= 0 && iB >= 0
      ? data.series
          .map((sr) => {
            const from = sr.values[iA] ?? 0;
            const to = sr.values[iB] ?? 0;
            return { id: sr.id, label: sr.label, from, to, delta: to - from };
          })
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      : [];

  const totA = iA >= 0 ? (data.total[iA] ?? 0) : 0;
  const totB = iB >= 0 ? (data.total[iB] ?? 0) : 0;
  const unit =
    measure === "absolute" ? "ktoe" : measure === "share" ? `share of ${data.scopeLabel.toLowerCase()}` : `index ${indexBase} = 100`;
  const what = lens === "sector" ? "sector" : `fuel · ${data.scopeLabel}`;

  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          Demand by {what} · {first}–{last} · {unit}
        </h3>
        <TimeChart
          key={`demand-${lens}-${scope}-${measure}-${indexBase}`}
          label={`UK final energy demand by ${lens}`}
          series={chartSeries}
          cadence="annual"
          kind={measure === "index" ? "line" : "stack"}
          zero={measure !== "index"}
          showTable={false}
          format={fmt}
        />
      </section>

      {thenNowRows.length > 0 && (
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Then / Now · {yearA} → {yearB} · ktoe
          </h3>
          <ChangeRows
            label={`Final energy demand ${yearA} to ${yearB}`}
            fromLabel={String(yearA)}
            toLabel={String(yearB)}
            rows={thenNowRows.map((r) => ({ id: r.id, label: r.label, from: r.from, to: r.to }))}
            format={fmtKtoe}
          />
          <p className={s.links}>
            {data.scopeLabel}: {fmtKtoe(totA)} in {yearA} → {fmtKtoe(totB)} in {yearB}
            {totA > 0
              ? ` (${totB - totA >= 0 ? "+" : "−"}${fmtKtoe(Math.abs(totB - totA))}, ${(((totB - totA) / totA) * 100).toFixed(1)}%)`
              : ""}
            .
          </p>
        </section>
      )}

      {thenNowRows.length > 0 && (
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Change · {yearA} → {yearB} · ktoe
          </h3>
          <RankBars
            key={`delta-${lens}-${scope}-${yearA}-${yearB}`}
            label={`Change in final energy demand, ${yearA} to ${yearB}`}
            rows={thenNowRows.map((r) => ({ id: r.id, label: r.label, v: r.delta / 1000 }))}
            format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} mtoe`}
          />
        </section>
      )}
    </div>
  );
}

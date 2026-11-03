"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Observation } from "@/lib/api";
import {
  formatAxisValue,
  formatQuarterLabel,
  formatTooltipValue,
  shortUnitLabel,
} from "@/lib/format";
import styles from "./SeriesChart.module.css";

type Point = {
  period: string;
  label: string;
  value: number;
  status: string;
};

function toPoints(rows: Observation[]): Point[] {
  return rows
    .filter((row): row is Observation & { value: number } => row.value !== null)
    .map((row) => ({
      period: row.period_start,
      label: formatQuarterLabel(row.period_start),
      value: row.value,
      status: row.observation_status,
    }));
}

export function SeriesChart({
  rows,
  unit,
  seriesLabel,
  seriesId,
  geography,
}: {
  rows: Observation[];
  unit: string;
  seriesLabel: string;
  seriesId: string;
  geography: string;
}) {
  const data = toPoints(rows);
  const first = data[0];
  const last = data[data.length - 1];
  const yLabel = shortUnitLabel(unit);

  return (
    <div className={styles.root}>
      <div className={styles.caption}>
        <div>
          <p className={styles.seriesName}>{seriesLabel}</p>
          <p className={styles.meta}>
            <code>{seriesId}</code>
            <span aria-hidden="true"> · </span>
            {geography}
            <span aria-hidden="true"> · </span>
            {yLabel}
          </p>
        </div>
        {first && last ? (
          <dl className={styles.stats}>
            <div>
              <dt>Coverage</dt>
              <dd>
                {first.label} – {last.label}
              </dd>
            </div>
            <div>
              <dt>Latest</dt>
              <dd>
                {formatTooltipValue(last.value, unit)}
                <span className={styles.muted}> ({last.label})</span>
              </dd>
            </div>
            <div>
              <dt>Points plotted</dt>
              <dd>{data.length.toLocaleString("en-GB")} quarters</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div
        className={styles.wrap}
        role="img"
        aria-label={`${seriesLabel} (${seriesId}), ${geography}, ${yLabel}, ${first?.label ?? "?"} to ${last?.label ?? "?"}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
              minTickGap={36}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
              width={64}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatAxisValue(v, unit)}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                offset: 8,
                style: {
                  fill: "var(--ink-soft)",
                  fontSize: 11,
                  textAnchor: "middle",
                },
              }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
              formatter={(value, _name, item) => {
                const point = item?.payload as Point | undefined;
                const status = point?.status ? ` · ${point.status}` : "";
                return [
                  typeof value === "number"
                    ? `${formatTooltipValue(value, unit)}${status}`
                    : String(value ?? ""),
                  seriesLabel,
                ];
              }}
              labelFormatter={(label) => String(label)}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={seriesLabel}
              stroke="var(--series)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

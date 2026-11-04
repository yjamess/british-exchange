"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisValue, formatPeriodLabel, yDomainFromValues } from "@/lib/format";
import styles from "./CompareLines.module.css";

export type CompareSeries = {
  id: string;
  label: string;
  color: string;
  points: { period: string; value: number }[];
};

type Row = { label: string; period: string } & Record<string, number | string>;

function mergeSeries(
  series: CompareSeries[],
  frequency: string,
): { rows: Row[]; domain: [number, number] } {
  const byPeriod = new Map<string, Row>();
  const values: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      const label = formatPeriodLabel(p.period, undefined, frequency);
      const row = byPeriod.get(p.period) ?? { period: p.period, label };
      row[s.id] = p.value;
      byPeriod.set(p.period, row);
      values.push(p.value);
    }
  }
  const rows = [...byPeriod.values()].sort((a, b) =>
    String(a.period).localeCompare(String(b.period)),
  );
  return { rows, domain: yDomainFromValues(values) };
}

const DEFAULT_COLORS = [
  "var(--bx-chart-series-1)",
  "var(--bx-navy-bright)",
  "var(--bx-red)",
  "var(--bx-slate)",
  "#7a5c2e",
];

export function CompareLines({
  series,
  unit,
  frequency = "monthly",
  height = 320,
}: {
  series: CompareSeries[];
  unit: string;
  frequency?: string;
  height?: number;
}) {
  const colored = series.map((s, i) => ({
    ...s,
    color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]!,
  }));
  const { rows, domain } = mergeSeries(colored, frequency);
  if (rows.length === 0) {
    return <p className={styles.empty}>No observations for the selected comparison.</p>;
  }

  return (
    <div className={styles.wrap} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid
            stroke="var(--bx-chart-grid)"
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--bx-chart-axis)", fontSize: 11 }}
            minTickGap={36}
            axisLine={{ stroke: "var(--bx-line)" }}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fill: "var(--bx-chart-axis)", fontSize: 12 }}
            width={56}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatAxisValue(v, unit)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bx-cream-lift)",
              border: "1px solid var(--bx-line)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
          />
          {colored.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

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
import styles from "./SeriesChart.module.css";

type Point = { period: string; value: number | null };

function toPoints(rows: Observation[]): Point[] {
  return rows
    .filter((row) => row.value !== null)
    .map((row) => ({
      period: row.period_start.slice(0, 7),
      value: row.value,
    }));
}

export function SeriesChart({
  rows,
  unit,
}: {
  rows: Observation[];
  unit: string;
}) {
  const data = toPoints(rows);
  return (
    <div className={styles.wrap} role="img" aria-label={`Time series in ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
            minTickGap={28}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
            width={72}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            formatter={(value) => [
              typeof value === "number" ? value.toLocaleString("en-GB") : String(value ?? ""),
              unit,
            ]}
            labelFormatter={(label) => `Period ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--series)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

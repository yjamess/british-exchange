"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartMeta, Observation } from "@/lib/api";
import {
  formatAxisValue,
  formatPeriodLabel,
  formatTooltipValue,
  shortUnitLabel,
  yDomainFromValues,
} from "@/lib/format";
import styles from "./SeriesChart.module.css";

type Point = {
  period: string;
  label: string;
  value: number;
  status: string;
  category?: string;
};

function toTimePoints(rows: Observation[], frequency: string | undefined): Point[] {
  return rows
    .filter((row): row is Observation & { value: number } => row.value !== null)
    .map((row) => ({
      period: row.period_start,
      label: formatPeriodLabel(row.period_start, row.period_end, frequency),
      value: row.value,
      status: row.observation_status,
    }));
}

function toCategoryPoints(rows: Observation[], frequency: string | undefined): Point[] {
  return rows
    .filter((row): row is Observation & { value: number } => row.value !== null)
    .map((row) => {
      const dims = row.dimensions;
      const category =
        dims?.water_company_name ||
        dims?.water_company ||
        dims?.fuel ||
        dims?.demographic ||
        row.geography_label ||
        formatPeriodLabel(row.period_start, row.period_end, frequency);
      return {
        period: row.period_start,
        label: category,
        category,
        value: row.value,
        status: row.observation_status,
      };
    });
}

export function SeriesChart({
  rows,
  unit,
  seriesLabel,
  seriesId,
  geography,
  frequency,
  chart,
  sourceNote,
}: {
  rows: Observation[];
  unit: string;
  seriesLabel: string;
  seriesId: string;
  geography: string;
  frequency?: string;
  chart?: ChartMeta;
  /** Short method note only — do not repeat geography (shown at module level). */
  sourceNote?: string;
}) {
  const kind = chart?.chart_kind ?? "time_series";
  const freq = frequency ?? chart?.frequency;
  const data =
    kind === "categorical_breakdown" || kind === "geographic_comparison" || kind === "snapshot"
      ? toCategoryPoints(rows, freq)
      : toTimePoints(rows, freq);
  const last = data[data.length - 1];
  const yLabel = shortUnitLabel(unit);
  const useBars =
    kind === "categorical_breakdown" || kind === "geographic_comparison" || kind === "snapshot";
  const lineDomain = useBars
    ? ([0, "auto"] as const)
    : yDomainFromValues(data.map((d) => d.value));

  return (
    <div className={styles.root}>
      <div className={styles.caption}>
        <div>
          <p className={styles.seriesName}>{seriesLabel}</p>
          {last ? (
            <p className={styles.latest}>
              <span className={styles.latestValue}>
                {formatTooltipValue(last.value, unit)}
              </span>
              <span className={styles.latestPeriod}>{last.label}</span>
            </p>
          ) : null}
        </div>
      </div>

      {sourceNote ? (
        <p className={styles.note} role="note">
          {sourceNote}
        </p>
      ) : null}

      <div
        className={styles.wrap}
        role="img"
        aria-label={`${seriesLabel} (${seriesId}), ${geography}, ${yLabel}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {useBars ? (
            <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid
                stroke="var(--bx-chart-grid)"
                strokeDasharray="3 6"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--bx-chart-axis)", fontSize: 11 }}
                minTickGap={16}
                axisLine={{ stroke: "var(--bx-line)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
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
                formatter={(value) => [
                  typeof value === "number" ? formatTooltipValue(value, unit) : String(value ?? ""),
                  seriesLabel,
                ]}
              />
              <Bar
                dataKey="value"
                fill="var(--bx-chart-series-1)"
                isAnimationActive={false}
              />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid
                stroke="var(--bx-chart-grid)"
                strokeDasharray="3 6"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--bx-chart-axis)", fontSize: 12 }}
                minTickGap={40}
                axisLine={{ stroke: "var(--bx-line)" }}
                tickLine={false}
              />
              <YAxis
                domain={lineDomain}
                tick={{ fill: "var(--bx-chart-axis)", fontSize: 12 }}
                width={56}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatAxisValue(v, unit)}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 4,
                  style: {
                    fill: "var(--bx-chart-axis)",
                    fontSize: 11,
                    textAnchor: "middle",
                  },
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bx-cream-lift)",
                  border: "1px solid var(--bx-line)",
                  borderRadius: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
                formatter={(value) => [
                  typeof value === "number" ? formatTooltipValue(value, unit) : String(value ?? ""),
                  seriesLabel,
                ]}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={seriesLabel}
                stroke="var(--bx-chart-series-1)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

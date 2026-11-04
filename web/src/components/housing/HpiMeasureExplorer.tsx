"use client";

import { useMemo, useState } from "react";
import { CompareLines } from "@/components/CompareLines";
import type { Observation } from "@/lib/api";
import styles from "./HousingExplore.module.css";

type Mode = "price" | "type" | "volume";

const TYPE_SERIES = ["average", "detached", "semi-detached", "terraced", "flat"] as const;
const TYPE_LABELS: Record<string, string> = {
  average: "Average",
  detached: "Detached",
  "semi-detached": "Semi-detached",
  terraced: "Terraced",
  flat: "Flat",
};

function seriesKey(row: Observation): string {
  if (row.dimensions?.series) return row.dimensions.series;
  const match = /(?:^|;\s*)series=([^;]+)/i.exec(row.notes || "");
  return match?.[1]?.trim() ?? "";
}

export function HpiMeasureExplorer({
  rows,
}: {
  rows: Observation[];
}) {
  const [mode, setMode] = useState<Mode>("type");

  const { series, unit } = useMemo(() => {
    if (mode === "volume") {
      const points = rows
        .filter((r) => seriesKey(r) === "sales-volume" && r.value !== null)
        .map((r) => ({ period: r.period_start, value: r.value as number }));
      return {
        unit: "sales (count)",
        series: [{ id: "sales-volume", label: "Sales volume", color: "", points }],
      };
    }
    if (mode === "price") {
      const points = rows
        .filter((r) => seriesKey(r) === "average" && r.value !== null)
        .map((r) => ({ period: r.period_start, value: r.value as number }));
      return {
        unit: "£ (UK HPI)",
        series: [{ id: "average", label: "Average price", color: "", points }],
      };
    }
    // by type — from 2010 for readability (matches SoB-style window option)
    const cutoff = "2010-01-01";
    return {
      unit: "£ (UK HPI)",
      series: TYPE_SERIES.map((id) => ({
        id,
        label: TYPE_LABELS[id] ?? id,
        color: "",
        points: rows
          .filter(
            (r) =>
              seriesKey(r) === id &&
              r.value !== null &&
              r.period_start >= cutoff,
          )
          .map((r) => ({ period: r.period_start, value: r.value as number })),
      })),
    };
  }, [mode, rows]);

  return (
    <div className={styles.explorer}>
      <div className={styles.modeRow} role="tablist" aria-label="UK HPI view">
        {(
          [
            ["price", "Price"],
            ["type", "By type"],
            ["volume", "Volume"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? styles.modeOn : styles.mode}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className={styles.hint}>
        {mode === "type"
          ? "United Kingdom · property types from 2010"
          : mode === "volume"
            ? "United Kingdom · monthly sales count"
            : "United Kingdom · average house price"}
      </p>
      <CompareLines series={series} unit={unit} frequency="monthly" height={340} />
    </div>
  );
}

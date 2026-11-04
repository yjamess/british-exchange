"use client";

import { useMemo, useState } from "react";
import { CompareLines } from "@/components/CompareLines";
import type { Observation } from "@/lib/api";
import styles from "./HousingExplore.module.css";

const PREFERRED = [
  "United Kingdom",
  "England",
  "London",
  "South East",
  "North East",
  "Scotland",
  "Wales",
  "Northern Ireland",
];

function seriesFromRows(
  rows: Observation[],
  geos: string[],
): { id: string; label: string; color: string; points: { period: string; value: number }[] }[] {
  return geos.map((geo) => ({
    id: geo,
    label: geo,
    color: "",
    points: rows
      .filter((r) => r.geography_label === geo && r.value !== null)
      .map((r) => ({ period: r.period_start, value: r.value as number })),
  }));
}

export function RegionPriceExplorer({
  rows,
  unit,
}: {
  rows: Observation[];
  unit: string;
}) {
  const available = useMemo(() => {
    const labels = [...new Set(rows.map((r) => r.geography_label).filter(Boolean))];
    return labels.sort((a, b) => {
      const ia = PREFERRED.indexOf(a);
      const ib = PREFERRED.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [rows]);

  const [selected, setSelected] = useState<string[]>(() =>
    ["United Kingdom", "London", "North East"].filter((g) => available.includes(g)),
  );

  function toggle(geo: string) {
    setSelected((prev) => {
      if (prev.includes(geo)) {
        return prev.filter((g) => g !== geo);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), geo];
      }
      return [...prev, geo];
    });
  }

  const series = seriesFromRows(rows, selected);

  return (
    <div className={styles.explorer}>
      <div className={styles.controls} role="group" aria-label="Compare regions">
        {available.map((geo) => {
          const on = selected.includes(geo);
          return (
            <button
              key={geo}
              type="button"
              className={on ? styles.chipOn : styles.chip}
              aria-pressed={on}
              onClick={() => toggle(geo)}
            >
              {geo === "West Midlands Region" ? "West Midlands" : geo}
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>Select up to four places. Latest UK HPI average prices.</p>
      <CompareLines series={series} unit={unit} frequency="monthly" height={340} />
    </div>
  );
}

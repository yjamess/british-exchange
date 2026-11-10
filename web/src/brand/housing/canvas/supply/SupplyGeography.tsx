"use client";

/**
 * Domain 05 — Where Britain Is Building (chart-led Geography).
 * Latest financial-year net additions by English region (Table 118) and top LAs (Table 122).
 * Region choropleth (ONS BUC) selects a region and lights the matching ranked bar.
 * Measure control lives in HousingExplorer.
 */

import { useMemo, useState } from "react";
import { RegionMap, type RegionDatum } from "@/brand/map";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";
import s from "./supply.module.css";

type Props = {
  geography: HousingV1["supplyGeography"];
  measure: GeographyMeasure;
};

export type GeographyMeasure = "count" | "share";

export const GEOGRAPHY_MEASURE_OPTIONS: { value: GeographyMeasure; label: string }[] = [
  { value: "count", label: "Dwellings" },
  { value: "share", label: "Share of England" },
];

export function geographyFoot(
  geography: HousingV1["supplyGeography"],
  measure: GeographyMeasure,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const yearLabel = geography.yearLabel;
  const measureLabel = measure === "count" ? "Net additions" : "Share of England";
  return {
    definition: `Where net additional dwellings were added in England${yearLabel ? ` in ${yearLabel}` : ""}${geography.provisional ? " (provisional)" : ""}.`,
    method: [
      geography.england != null
        ? `England total: ${fmt.count(geography.england)} net additional dwellings${yearLabel ? `, ${yearLabel}` : ""}${geography.provisional ? ", provisional" : ""}.`
        : "",
      "Regions are Live Table 118. The district rank is Live Table 122. Metropolitan counties are totals of those districts, so they are not listed beside them.",
      "Counts are net additions, not quarterly building-control completions.",
      `${measureLabel} is the map and ranked-region reading.`,
    ].filter(Boolean),
    source: [
      "MHCLG · Live Table 118 · Live Table 122",
      "Boundaries: ONS Regions (December 2025)",
      yearLabel,
      geography.provisional ? "provisional" : "",
    ]
      .filter(Boolean)
      .join(" · "),
    dataHref: "/data#net-additional-dwellings",
  };
}

export function SupplyGeography({ geography, measure }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const yearLabel = geography.yearLabel;
  const measureLabel = measure === "count" ? "Net additions" : "Share of England";

  const regionBars = useMemo(() => {
    const rows = geography.regions.map((r) => ({
      id: r.id,
      label: r.label,
      v: measure === "count" ? r.v : r.shareOfEngland * 100,
      active: selected === r.id,
    }));
    return rows.filter((r) => r.v !== 0).sort((a, b) => b.v - a.v);
  }, [geography.regions, measure, selected]);

  const mapData: RegionDatum[] = useMemo(() => {
    return geography.regions.map((r) => {
      const v = measure === "count" ? r.v : r.shareOfEngland * 100;
      return {
        code: r.id,
        value: v !== 0 ? v : null,
        display: v !== 0 ? (measure === "count" ? fmt.countCompact(v) : `${v.toFixed(1)}%`) : "—",
      };
    });
  }, [geography.regions, measure]);

  const toggle = (code: string) => {
    if (!geography.regions.some((r) => r.id === code)) return;
    setSelected((cur) => (cur === code ? null : code));
  };

  if (geography.regions.length === 0 && geography.authorities.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Regional and local-authority net additions are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      {regionBars.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            English regions · {measureLabel.toLowerCase()}
            {yearLabel ? ` · ${yearLabel}` : ""}
          </h3>
          <div className={s.geoSplit}>
            <RegionMap
              data={mapData}
              selected={selected}
              onSelect={toggle}
              label="Net additional dwellings by English region"
              legendFormat={(v) => (measure === "count" ? fmt.countCompact(v) : `${v.toFixed(1)}%`)}
              legendUnit={measure === "count" ? "net additions" : "of England"}
            />
            <RankBars
              label="Net additional dwellings by English region"
              rows={regionBars}
              format={measure === "count" ? fmt.count : (v) => `${v.toFixed(1)}%`}
              onSelect={toggle}
            />
          </div>
        </section>
      )}

      {geography.authorities.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Local authority districts · highest net additions</h3>
          <RankBars
            label="Net additional dwellings by local authority (top)"
            rows={geography.authorities.slice(0, 15).map((a) => ({
              id: a.id,
              label: a.label,
              v: a.v,
            }))}
            format={fmt.count}
          />
        </section>
      )}
    </div>
  );
}

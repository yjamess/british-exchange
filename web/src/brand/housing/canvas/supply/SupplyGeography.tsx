"use client";

/**
 * Domain 05 — Where Britain Is Building (chart-led Geography).
 * Latest financial-year net additions by English region (Table 118) and top LAs (Table 122).
 * Region choropleth (ONS BUC) selects a region and lights the matching ranked bar.
 */

import { useEffect, useMemo, useState } from "react";
import { RegionMap, type RegionDatum } from "@/brand/map";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./supply.module.css";

type Foot = { source: string; coverage: string; caveats: string[] };

type Props = {
  geography: HousingV1["supplyGeography"];
  onFoot?: (foot: Foot) => void;
};

type Measure = "count" | "share";

export function SupplyGeography({ geography, onFoot }: Props) {
  const [measure, setMeasure] = useState<Measure>("count");
  const [selected, setSelected] = useState<string | null>(null);
  const yearLabel = geography.yearLabel;

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

  const measureLabel = measure === "count" ? "Net additions" : "Share of England";
  const coverage = [yearLabel ? `English regions · ${measureLabel} · ${yearLabel}` : `English regions · ${measureLabel}`, geography.provisional ? "provisional" : ""]
    .filter(Boolean)
    .join(" · ");
  const caveats = [
    geography.england != null
      ? `England total: ${fmt.count(geography.england)} net additional dwellings${yearLabel ? `, ${yearLabel}` : ""}${geography.provisional ? ", provisional" : ""}.`
      : "",
    "Regions are Live Table 118. The district rank is Live Table 122. Metropolitan counties are totals of those districts, so they are not listed beside them.",
    "Counts are net additions, not quarterly building-control completions.",
  ].filter(Boolean);
  const caveatText = caveats.join(" ");

  useEffect(() => {
    onFoot?.({
      source: "MHCLG · Live Table 118 · Live Table 122 · Boundaries: ONS Regions (December 2025)",
      coverage,
      caveats: caveatText ? [caveatText] : [],
    });
  }, [onFoot, coverage, caveatText]);

  if (geography.regions.length === 0 && geography.authorities.length === 0) {
    return (
      <p className={s.lede}>
        Regional and local-authority net additions are not loaded yet. The Exchange does not show
        estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        {`Where net additional dwellings were added in England${yearLabel ? ` in ${yearLabel}` : ""}${geography.provisional ? " (provisional)" : ""}.`}
      </p>

      <div className={s.measureRow} role="group" aria-label="Geography measure">
        {(
          [
            { id: "count" as const, label: "Dwellings" },
            { id: "share" as const, label: "Share of England" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={measure === m.id}
            className={s.measureTab}
            data-active={measure === m.id ? "true" : "false"}
            onClick={() => setMeasure(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {regionBars.length > 0 && (
        <div className={s.geoSplit}>
          <div className={s.block}>
            <p className={s.sectionTitle}>
              English regions · {measureLabel.toLowerCase()}
              {yearLabel ? ` · ${yearLabel}` : ""}
            </p>
            <RegionMap
              data={mapData}
              selected={selected}
              onSelect={toggle}
              label="Net additional dwellings by English region"
              legendFormat={(v) => (measure === "count" ? fmt.countCompact(v) : `${v.toFixed(1)}%`)}
              legendUnit={measure === "count" ? "net additions" : "of England"}
            />
          </div>
          <div className={s.block}>
            <p className={s.sectionTitle}>Ranked regions</p>
            <RankBars
              label="Net additional dwellings by English region"
              rows={regionBars}
              format={measure === "count" ? fmt.count : (v) => `${v.toFixed(1)}%`}
              onSelect={toggle}
            />
          </div>
        </div>
      )}

      {geography.authorities.length > 0 && (
        <div className={s.block}>
          <p className={s.sectionTitle}>Local authority districts · highest net additions</p>
          <RankBars
            label="Net additional dwellings by local authority (top)"
            rows={geography.authorities.slice(0, 15).map((a) => ({
              id: a.id,
              label: a.label,
              v: a.v,
            }))}
            format={fmt.count}
          />
        </div>
      )}
    </div>
  );
}

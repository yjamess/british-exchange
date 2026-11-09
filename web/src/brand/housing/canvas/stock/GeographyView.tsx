"use client";

/**
 * Domain 04 — Geography of Ownership (Gate 2, chart-led).
 * Regional tenure from Live Table 109; largest local-authority stocks from Table 100.
 * Region choropleth (ONS BUC) selects a region and lights the matching ranked bar.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { RegionMap, type RegionDatum } from "@/brand/map";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

type Foot = { source: string; coverage: string; caveats: string[] };

type Props = {
  geography: HousingV1["stockGeography"];
  onFoot?: (foot: Foot) => void;
};

type Measure = "owner" | "private" | "social" | "total";

const MEASURES: { id: Measure; label: string }[] = [
  { id: "owner", label: "Owner-occupied" },
  { id: "private", label: "Private rented" },
  { id: "social", label: "Social rented" },
  { id: "total", label: "All dwellings" },
];

function measureValue(
  r: { owner: number; privateRented: number; social: number; total: number },
  measure: Measure,
): number {
  if (measure === "owner") return r.owner;
  if (measure === "private") return r.privateRented;
  if (measure === "social") return r.social;
  return r.total;
}

export function GeographyView({ geography, onFoot }: Props) {
  const uid = useId();
  const [measure, setMeasure] = useState<Measure>("owner");
  const [selected, setSelected] = useState<string | null>(null);
  const [yearIdx, setYearIdx] = useState(() => Math.max(0, geography.years.length - 1));
  const safeIdx = Math.min(yearIdx, Math.max(0, geography.years.length - 1));
  const year = geography.years[safeIdx] ?? null;
  const slice = geography.byYear.find((pack) => pack.year === year) ?? null;
  const regions = slice?.regions ?? [];

  const regionBars = useMemo(() => {
    return regions
      .map((r) => {
        const v = measureValue(r, measure);
        return { id: r.id, label: r.label, v, active: selected === r.id };
      })
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v);
  }, [regions, measure, selected]);

  const mapData: RegionDatum[] = useMemo(() => {
    return regions.map((r) => {
      const v = measureValue(r, measure);
      return {
        code: r.id,
        value: v > 0 ? v : null,
        display: v > 0 ? fmt.countCompact(v) : "—",
      };
    });
  }, [regions, measure]);

  const toggle = (code: string) => {
    if (!regions.some((r) => r.id === code)) return;
    setSelected((cur) => (cur === code ? null : code));
  };

  const measureLabel = MEASURES.find((m) => m.id === measure)?.label ?? "";
  const coverage = year != null ? `English regions · ${measureLabel} · 31 March ${year}` : "";
  const caveats = [
    "Social rented combines local-authority, private-registered-provider and other-public-sector dwellings.",
    slice?.england && slice.england.total > 0 && year != null
      ? `England all dwellings, 31 March ${year}: ${fmt.count(slice.england.total)}. That total is the national sum, not a region on the map.`
      : "",
    geography.districtYear != null
      ? `The local-authority list is Live Table 100, all dwellings, 31 March ${geography.districtYear}, the 15 largest districts. It does not follow the year above, and that table does not split owner-occupied from private rented.`
      : "",
  ].filter(Boolean);
  const caveatText = caveats.join(" ");

  useEffect(() => {
    onFoot?.({
      source: "MHCLG · Live Table 109 · Live Table 100 · Boundaries: ONS Regions (December 2025)",
      coverage,
      caveats: caveatText ? [caveatText] : [],
    });
  }, [onFoot, coverage, caveatText]);

  if (geography.years.length === 0) {
    return (
      <p className={s.lede}>
        Regional dwelling-stock series is not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>Dwelling stock by English region, counted at 31 March.</p>

      <div className={s.yearRow}>
        <label className={s.yearField} htmlFor={`${uid}-year`}>
          <span className="bo-label">As at 31 March</span>
          <input
            id={`${uid}-year`}
            type="range"
            min={0}
            max={geography.years.length - 1}
            step={1}
            value={safeIdx}
            onChange={(e) => setYearIdx(Number(e.target.value))}
            aria-valuetext={year != null ? String(year) : undefined}
          />
          <output className={`bo-fig ${s.yearOut}`}>{year}</output>
        </label>
        <div className={s.yearEnds} aria-hidden="true">
          <span>{geography.years[0]}</span>
          <span>{geography.years[geography.years.length - 1]}</span>
        </div>
      </div>

      <div className={s.measureRow} role="group" aria-label="Tenure measure">
        {MEASURES.map((m) => (
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

      <div className={s.geoSplit}>
        <div className={s.block}>
          <p className={s.sectionTitle}>
            English regions · {measureLabel}
            {year != null ? ` · ${year}` : ""}
          </p>
          <RegionMap
            data={mapData}
            selected={selected}
            onSelect={toggle}
            label={`Dwelling stock by English region — ${measure}`}
            legendFormat={(v) => fmt.countCompact(v)}
            legendUnit="dwellings"
          />
        </div>

        <div className={s.block}>
          <p className={s.sectionTitle}>Ranked regions</p>
          <RankBars
            label={`Dwelling stock by English region — ${measure}`}
            rows={regionBars}
            format={fmt.count}
            onSelect={toggle}
          />
        </div>
      </div>

      {geography.districtTotals.length > 0 && (
        <div className={s.block}>
          <p className={s.sectionTitle}>
            Largest local authorities by total dwellings
            {geography.districtYear != null ? ` · 31 March ${geography.districtYear}` : ""}
          </p>
          <RankBars
            label="Total dwelling stock by local authority, largest districts"
            rows={geography.districtTotals}
            format={fmt.count}
          />
        </div>
      )}

    </div>
  );
}

"use client";

/**
 * Domain 04 — Geography of Ownership.
 * Regional tenure from Live Table 109; largest local-authority stocks from Table 100.
 * Measure and year controls live in HousingExplorer.
 */

import { useMemo, useState } from "react";
import { RegionMap, type RegionDatum } from "@/brand/map";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";
import s from "./stock.module.css";

export type StockGeoMeasure = "owner" | "private" | "social" | "total";

type Props = {
  geography: HousingV1["stockGeography"];
  measure: StockGeoMeasure;
  year: number | null;
};

export const STOCK_GEO_MEASURE_OPTIONS: { value: StockGeoMeasure; label: string }[] = [
  { value: "owner", label: "Owner-occupied" },
  { value: "private", label: "Private rented" },
  { value: "social", label: "Social rented" },
  { value: "total", label: "All dwellings" },
];

export function stockGeoYearOptions(
  geography: HousingV1["stockGeography"],
): { value: string; label: string }[] {
  return [...geography.years].reverse().map((y) => ({ value: String(y), label: String(y) }));
}

function measureValue(
  r: { owner: number; privateRented: number; social: number; total: number },
  measure: StockGeoMeasure,
): number {
  if (measure === "owner") return r.owner;
  if (measure === "private") return r.privateRented;
  if (measure === "social") return r.social;
  return r.total;
}

export function stockGeographyFoot(
  geography: HousingV1["stockGeography"],
  measure: StockGeoMeasure,
  year: number | null,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const y =
    year != null && geography.years.includes(year)
      ? year
      : (geography.years[geography.years.length - 1] ?? null);
  const slice = geography.byYear.find((pack) => pack.year === y) ?? null;
  const measureLabel = STOCK_GEO_MEASURE_OPTIONS.find((m) => m.value === measure)?.label ?? "";
  return {
    definition: "Dwelling stock by English region, counted at 31 March.",
    method: [
      y != null ? `Coverage. English regions · ${measureLabel} · 31 March ${y}.` : "",
      "Social rented combines local-authority, private-registered-provider and other-public-sector dwellings.",
      slice?.england && slice.england.total > 0 && y != null
        ? `England all dwellings, 31 March ${y}: ${fmt.count(slice.england.total)}. That total is the national sum, not a region on the map.`
        : "",
      geography.districtYear != null
        ? `The local-authority list is Live Table 100, all dwellings, 31 March ${geography.districtYear}, the 15 largest districts. It does not follow the year above, and that table does not split owner-occupied from private rented.`
        : "",
    ].filter(Boolean),
    source: "MHCLG · Live Table 109 · Live Table 100 · Boundaries: ONS Regions (December 2025)",
    dataHref: "/data#dwelling-stock-by-tenure",
  };
}

export function GeographyView({ geography, measure, year }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const y =
    year != null && geography.years.includes(year)
      ? year
      : (geography.years[geography.years.length - 1] ?? null);
  const slice = geography.byYear.find((pack) => pack.year === y) ?? null;
  const regions = slice?.regions ?? [];
  const measureLabel = STOCK_GEO_MEASURE_OPTIONS.find((m) => m.value === measure)?.label ?? "";

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

  if (geography.years.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Regional dwelling-stock series is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          English regions · {measureLabel}
          {y != null ? ` · ${y}` : ""}
        </h3>
        <div className={s.geoSplit}>
          <RegionMap
            data={mapData}
            selected={selected}
            onSelect={toggle}
            label={`Dwelling stock by English region — ${measure}`}
            legendFormat={(v) => fmt.countCompact(v)}
            legendUnit="dwellings"
          />
          <RankBars
            label={`Dwelling stock by English region — ${measure}`}
            rows={regionBars}
            format={fmt.count}
            onSelect={toggle}
          />
        </div>
      </section>

      {geography.districtTotals.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            Largest local authorities by total dwellings
            {geography.districtYear != null ? ` · 31 March ${geography.districtYear}` : ""}
          </h3>
          <RankBars
            label="Total dwelling stock by local authority, largest districts"
            rows={geography.districtTotals}
            format={fmt.count}
          />
        </section>
      )}
    </div>
  );
}

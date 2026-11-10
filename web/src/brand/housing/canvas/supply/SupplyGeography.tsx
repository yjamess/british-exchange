"use client";

/**
 * Domain 05 — Where Britain Is Building (Geography).
 * Latest financial-year net additions by English region (Table 118) and LA districts
 * (Table 122). Region choropleth selects a region; district AreaMap selects a council.
 * Rate = net additions ÷ dwelling stock at FY open × 1,000 (Tables 100 / 109).
 * Measure control lives in HousingExplorer.
 */

import { useMemo, useState } from "react";
import { RegionMap, type RegionDatum } from "@/brand/map";
import { EmptyStage, MapLegend, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import { AreaMap } from "../../atlas/AreaMap";
import { breaks, formatValue, type Area } from "../../atlas/model";
import type { SupplyGeo } from "../../load";
import { useGeometry } from "../insecurity/Displacement";
import insecurity from "../insecurity/insecurity.module.css";
import gen from "../../../energy/generation.module.css";
import s from "./supply.module.css";

type Props = {
  geography: SupplyGeo;
  measure: GeographyMeasure;
  area: string;
  onArea: (code: string | null) => void;
};

export type GeographyMeasure = "count" | "share" | "rate";

export const GEOGRAPHY_MEASURE_OPTIONS: { value: GeographyMeasure; label: string }[] = [
  { value: "count", label: "Dwellings" },
  { value: "share", label: "Share of England" },
  { value: "rate", label: "Per 1,000 dwellings" },
];

export const isGeographyMeasure = (v: string | null): v is GeographyMeasure =>
  v === "count" || v === "share" || v === "rate";

function measureLabel(measure: GeographyMeasure): string {
  if (measure === "share") return "Share of England";
  if (measure === "rate") return "Per 1,000 dwellings";
  return "Net additions";
}

function regionValue(
  r: SupplyGeo["regions"][number],
  measure: GeographyMeasure,
): number | null {
  if (measure === "share") return r.shareOfEngland * 100;
  if (measure === "rate") return r.ratePerThousand;
  return r.v;
}

function placeValue(
  p: { v: number; ratePerThousand: number | null },
  measure: GeographyMeasure,
): number | null {
  if (measure === "rate") return p.ratePerThousand;
  return p.v;
}

function formatMeasure(v: number, measure: GeographyMeasure): string {
  if (measure === "share") return `${v.toFixed(1)}%`;
  if (measure === "rate") return `${v.toFixed(1)}`;
  return fmt.count(v);
}

function formatMeasureCompact(v: number, measure: GeographyMeasure): string {
  if (measure === "share") return `${v.toFixed(1)}%`;
  if (measure === "rate") return `${v.toFixed(1)}`;
  return fmt.countCompact(v);
}

export function geographyFoot(
  geography: SupplyGeo,
  measure: GeographyMeasure,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const yearLabel = geography.yearLabel;
  const stockNote =
    geography.stockYear != null
      ? `Stock open is all dwellings at 31 March ${geography.stockYear} (Live Tables 100 and 109).`
      : "Stock open uses Live Tables 100 and 109 when the matching 31 March year is published.";
  return {
    definition: `Where net additional dwellings were added in England${yearLabel ? ` in ${yearLabel}` : ""}${geography.provisional ? " (provisional)" : ""}.`,
    method: [
      geography.england != null
        ? `England total: ${fmt.count(geography.england)} net additional dwellings${yearLabel ? `, ${yearLabel}` : ""}${geography.provisional ? ", provisional" : ""}${
            geography.englandRate != null ? ` · ${geography.englandRate.toFixed(1)} per 1,000 dwellings` : ""
          }.`
        : "",
      "Regions are Live Table 118. Districts are Live Table 122. Metropolitan counties are totals of those districts, so they are not listed beside them.",
      "Counts are net additions, not quarterly building-control completions.",
      measure === "rate"
        ? `Per 1,000 dwellings = net additions ÷ stock open × 1,000. ${stockNote}`
        : stockNote,
      `${measureLabel(measure)} is the map and ranked reading.`,
    ].filter(Boolean),
    source: [
      "MHCLG · Live Table 118 · Live Table 122 · Live Table 100 · Live Table 109",
      "Boundaries: ONS Regions (December 2025); local authorities for the district atlas",
      yearLabel,
      geography.provisional ? "provisional" : "",
    ]
      .filter(Boolean)
      .join(" · "),
    dataHref: "/data#net-additional-dwellings",
  };
}

export function SupplyGeography({ geography, measure, area, onArea }: Props) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const { geometry, error } = useGeometry();
  const yearLabel = geography.yearLabel;
  const label = measureLabel(measure);
  const atlasMeasure = measure === "rate" ? "net-additions-rate" : "net-additions";

  const regionBars = useMemo(() => {
    return geography.regions
      .map((r) => {
        const v = regionValue(r, measure);
        return {
          id: r.id,
          label: r.label,
          v: v ?? 0,
          active: selectedRegion === r.id,
          missing: v == null,
        };
      })
      .filter((r) => !r.missing && r.v !== 0)
      .sort((a, b) => b.v - a.v);
  }, [geography.regions, measure, selectedRegion]);

  const mapData: RegionDatum[] = useMemo(() => {
    return geography.regions.map((r) => {
      const v = regionValue(r, measure);
      return {
        code: r.id,
        value: v != null && v !== 0 ? v : null,
        display: v != null && v !== 0 ? formatMeasureCompact(v, measure) : "—",
      };
    });
  }, [geography.regions, measure]);

  const areas: Area[] = useMemo(() => {
    return geography.mapPlaces.map((p) => ({
      code: p.code,
      name: p.name,
      level: "local" as const,
      values: [placeValue(p, measure === "share" ? "count" : measure)],
    }));
  }, [geography.mapPlaces, measure]);

  const rankedPlaces = useMemo(() => {
    const rows = geography.mapPlaces
      .map((p) => {
        // Share of England is a region reading; the district atlas stays on count or rate.
        const v = placeValue(p, measure === "share" ? "count" : measure);
        return { id: p.code, label: p.name, v: v ?? 0, missing: v == null };
      })
      .filter((r) => !r.missing)
      .sort((a, b) => b.v - a.v);
    return rows;
  }, [geography.mapPlaces, measure]);

  const toggleRegion = (code: string) => {
    if (!geography.regions.some((r) => r.id === code)) return;
    setSelectedRegion((cur) => (cur === code ? null : code));
  };

  if (geography.regions.length === 0 && geography.mapPlaces.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Regional and local-authority net additions are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const selected = geography.mapPlaces.find((p) => p.code === area) ?? null;
  const rank = selected ? rankedPlaces.findIndex((r) => r.id === selected.code) + 1 : 0;
  const selectedValue = selected
    ? placeValue(selected, measure === "share" ? "count" : measure)
    : null;
  const districtMeasure: GeographyMeasure = measure === "share" ? "count" : measure;
  const districtLabel = measureLabel(districtMeasure);

  return (
    <div className={gen.stack}>
      {regionBars.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            English regions · {label.toLowerCase()}
            {yearLabel ? ` · ${yearLabel}` : ""}
          </h3>
          <div className={s.geoSplit}>
            <RegionMap
              data={mapData}
              selected={selectedRegion}
              onSelect={toggleRegion}
              label={`Net additional dwellings by English region · ${label.toLowerCase()}`}
              legendFormat={(v) => formatMeasureCompact(v, measure)}
              legendUnit={
                measure === "count" ? "net additions" : measure === "share" ? "of England" : "per 1,000"
              }
            />
            <RankBars
              label="Net additional dwellings by English region"
              rows={regionBars}
              format={(v) => formatMeasure(v, measure)}
              onSelect={toggleRegion}
            />
          </div>
        </section>
      )}

      {geography.mapPlaces.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            Local authority districts · {districtLabel.toLowerCase()}
            {yearLabel ? ` · ${yearLabel}` : ""}
          </h3>
          {measure === "share" && (
            <p className={insecurity.metaLine}>
              Share of England is a region reading. The district atlas shows net additions.
            </p>
          )}
          <div className={insecurity.mapGrid}>
            <div className={insecurity.mapCol}>
              {geometry ? (
                <AreaMap
                  shapes={geometry.shapes}
                  areas={areas}
                  month={0}
                  measure={atlasMeasure}
                  mode="price"
                  selected={area}
                  comparison=""
                  onSelect={(code) => onArea(code === area ? null : code)}
                  flow
                  compact
                  coverage="Local authorities · England"
                  mapLabel={`Map of English local authorities, shaded by ${districtLabel.toLowerCase()}.`}
                />
              ) : (
                <EmptyStage label={error ? "Map unavailable" : "Loading map"}>
                  {error || "Fetching local-authority boundaries…"}
                </EmptyStage>
              )}
            </div>

            <aside className={insecurity.readout} aria-live="polite" aria-label="Place record">
              <p className="bo-label">In focus</p>
              {selected ? (
                <>
                  <p className={insecurity.placeName}>{selected.name}</p>
                  <p className={`bo-fig ${insecurity.readoutValue}`}>
                    {selectedValue != null ? formatMeasure(selectedValue, districtMeasure) : "—"}
                  </p>
                  <p className={insecurity.readoutMeta}>
                    {districtLabel.toLowerCase()}
                    {rank > 0 ? ` · ${ordinal(rank)} of ${rankedPlaces.length}` : ""}
                    {yearLabel ? ` · ${yearLabel}` : ""}
                  </p>
                  <dl className={insecurity.facts}>
                    <div>
                      <dt>Net additions</dt>
                      <dd>{fmt.count(selected.v)}</dd>
                    </div>
                    <div>
                      <dt>Per 1,000 dwellings</dt>
                      <dd>
                        {selected.ratePerThousand != null
                          ? selected.ratePerThousand.toFixed(1)
                          : "Unavailable"}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <p className={insecurity.readoutMeta}>
                    Select a local authority on the map or in the ranking. No place is chosen until
                    you do.
                  </p>
                  {geography.england != null && (
                    <p className={insecurity.big}>
                      <span className="bo-fig">{fmt.count(geography.england)}</span>
                      <span>
                        net additions · England
                        {yearLabel ? ` · ${yearLabel}` : ""}
                        {geography.englandRate != null
                          ? ` · ${geography.englandRate.toFixed(1)} per 1,000`
                          : ""}
                      </span>
                    </p>
                  )}
                </>
              )}

              <MapLegend
                title={districtMeasure === "rate" ? "per 1,000" : "net additions"}
                thresholds={breaks(atlasMeasure, "price")}
                format={(v) => formatValue(v, atlasMeasure, "price", true)}
              />
            </aside>
          </div>

          <RankBars
            label="Net additional dwellings by local authority"
            rows={rankedPlaces.slice(0, 20).map((r) => ({
              ...r,
              active: area === r.id,
            }))}
            format={(v) => formatMeasure(v, districtMeasure)}
            onSelect={(code) => onArea(code === area ? null : code)}
          />
        </section>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

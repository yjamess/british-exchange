"use client";

/**
 * Shared choropleth legend — Housing atlas language.
 * One ink, seven density bands, labeled breaks. Used under RegionMap,
 * WorldChoropleth, and any other choropleth that paints with BAND_RADII.
 */

import { useId } from "react";
import { LegendBandDefs } from "./BandScreen";
import { BAND_RADII } from "./model";
import s from "./map.module.css";

export type MapLegendProps = {
  /** Sentence-case measure, e.g. "Thousand tonnes" or "ktoe (total)". */
  title?: string;
  /** Ascending break points — usually six values for seven bands. */
  thresholds: number[];
  format: (v: number) => string;
  className?: string;
};

function bandLabel(i: number, thresholds: number[], format: (v: number) => string): string {
  const first = thresholds[0];
  const last = thresholds[thresholds.length - 1];
  if (first == null || last == null) return "—";
  if (i === 0) return `Below ${format(first)}`;
  if (i >= BAND_RADII.length - 1) return `${format(last)} and above`;
  const lo = thresholds[i - 1];
  const hi = thresholds[i];
  if (lo == null || hi == null) return "—";
  return `${format(lo)} – ${format(hi)}`;
}

export function MapLegend({ title, thresholds, format, className }: MapLegendProps) {
  const uid = useId().replace(/:/g, "");

  return (
    <section className={`${s.mapLegend}${className ? ` ${className}` : ""}`} aria-label="Map legend">
      {title ? <p className={`bo-label ${s.mapLegendTitle}`}>{title}</p> : null}
      <svg className={s.legendDefs} width={0} height={0} aria-hidden="true">
        <LegendBandDefs idPrefix={uid} />
      </svg>
      {BAND_RADII.map((_, i) => (
        <div key={i} className={s.mapLegendRow}>
          <svg className={s.mapLegendSwatch} viewBox="0 0 36 14" aria-hidden="true">
            <rect width="36" height="14" fill="var(--bo-paper)" />
            <rect width="36" height="14" fill={`url(#${uid}-band-${i})`} />
            <rect width="36" height="14" fill="none" stroke="var(--bo-ink-20)" strokeWidth="1" />
          </svg>
          <span>{bandLabel(i, thresholds, format)}</span>
        </div>
      ))}
    </section>
  );
}

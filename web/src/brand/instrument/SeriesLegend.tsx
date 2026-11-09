"use client";

/**
 * Open series key for TimeChart — always sits under the plot.
 * Swatch + name (+ optional latest value). Never a bordered card.
 * See docs/visual-identity.md › Charts › Full-width stage plots.
 */

import s from "./instrument.module.css";

export type SeriesLegendItem = {
  id: string;
  label: string;
  /** CSS colour for the swatch (chart tone token or solid). */
  tone: string;
  /** Optional latest / summary figure, already formatted. */
  value?: string;
};

export function SeriesLegend({
  items,
  dense = false,
  label = "Series",
}: {
  items: SeriesLegendItem[];
  /** Grid layout for many series; still open — no box. */
  dense?: boolean;
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={s.legend} data-dense={dense ? "true" : undefined} aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          <i style={{ background: item.tone }} aria-hidden="true" />
          <span>{item.label}</span>
          {item.value != null && item.value !== "" ? <b className="bo-num">{item.value}</b> : null}
        </li>
      ))}
    </ul>
  );
}

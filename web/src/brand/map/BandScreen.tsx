/**
 * Shared 45° electric halftone defs for choropleth maps + legends.
 * One ink; density steps only — never lavender/union colour ramps.
 */

import { BAND_CELL, BAND_RADII } from "./model";

export function BandScreenDefs({
  idPrefix,
  /** Keep screen pitch constant on screen while the map zooms. */
  zoom = 1,
}: {
  idPrefix: string;
  zoom?: number;
}) {
  const scale = 1 / Math.max(0.001, zoom);
  return (
    <defs>
      {BAND_RADII.map((radius, i) => (
        <pattern
          key={i}
          id={`${idPrefix}-band-${i}`}
          width={BAND_CELL}
          height={BAND_CELL}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(45) scale(${scale})`}
        >
          <circle cx={BAND_CELL / 2} cy={BAND_CELL / 2} r={radius} fill="var(--bo-ink)" />
        </pattern>
      ))}
      <pattern
        id={`${idPrefix}-missing`}
        width={BAND_CELL}
        height={BAND_CELL}
        patternUnits="userSpaceOnUse"
        patternTransform={`rotate(45) scale(${scale})`}
      >
        {/* Dashed gap language: not observed — hairline slash, not a faded fill. */}
        <path
          d={`M0 ${BAND_CELL}L${BAND_CELL} 0`}
          stroke="var(--bo-ink-20)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </pattern>
    </defs>
  );
}

/**
 * Legend swatches are ~36×14 CSS px. The map cell (6) reads as a few giant dots
 * at that size — use a finer pitch with the same radius/cell ratios so density
 * steps match the map without looking sparse.
 */
const LEGEND_CELL = 2.5;
const LEGEND_RADII = BAND_RADII.map((r) => (r / BAND_CELL) * LEGEND_CELL);

export function LegendBandDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      {LEGEND_RADII.map((radius, i) => (
        <pattern
          key={i}
          id={`${idPrefix}-band-${i}`}
          width={LEGEND_CELL}
          height={LEGEND_CELL}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <circle cx={LEGEND_CELL / 2} cy={LEGEND_CELL / 2} r={radius} fill="var(--bo-ink)" />
        </pattern>
      ))}
    </defs>
  );
}

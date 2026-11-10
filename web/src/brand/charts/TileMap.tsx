"use client";

/**
 * TileMap — UK nations and English regions as an equal-area tile cartogram.
 * Equal tiles stop London (small, extreme) from vanishing and Scotland
 * (large, sparse) from dominating. Sequential ink tints, five bins.
 * Needs no boundary licence; the geographic Atlas can replace it later.
 */

import { useWidth } from "../useWidth";
import c from "./charts.module.css";

export type TileDatum = { code: string; value: number | null; display: string };

const LAYOUT: { code: string; short: string; name: string; col: number; row: number }[] = [
  { code: "S92000003", short: "SCO", name: "Scotland", col: 2, row: 0 },
  { code: "N92000002", short: "NI", name: "Northern Ireland", col: 0, row: 1 },
  { code: "E12000001", short: "NE", name: "North East", col: 3, row: 1 },
  { code: "E12000002", short: "NW", name: "North West", col: 2, row: 2 },
  { code: "E12000003", short: "YH", name: "Yorkshire & Humber", col: 3, row: 2 },
  { code: "W92000004", short: "WAL", name: "Wales", col: 1, row: 3 },
  { code: "E12000005", short: "WM", name: "West Midlands", col: 2, row: 3 },
  { code: "E12000004", short: "EM", name: "East Midlands", col: 3, row: 3 },
  { code: "E12000006", short: "EE", name: "East of England", col: 4, row: 3 },
  { code: "E12000009", short: "SW", name: "South West", col: 2, row: 4 },
  { code: "E12000008", short: "SE", name: "South East", col: 3, row: 4 },
  { code: "E12000007", short: "LDN", name: "London", col: 4, row: 4 },
];

export const TILE_NAMES = Object.fromEntries(LAYOUT.map((l) => [l.code, l.name]));

const BINS = 5;

export function TileMap({
  data,
  selected,
  onSelect,
  label,
  legendFormat,
}: {
  data: TileDatum[];
  selected: string | null;
  onSelect: (code: string) => void;
  label: string;
  legendFormat: (v: number) => string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>(320);
  const by = new Map(data.map((d) => [d.code, d]));
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const bin = (v: number) => Math.min(BINS - 1, Math.floor(((v - lo) / (hi - lo || 1)) * BINS));
  const tint = (b: number) => `color-mix(in srgb, var(--bo-ink) ${18 + b * 20.5}%, var(--bo-paper))`;

  const gap = 6;
  const size = Math.min(118, (w - gap * 4) / 5);
  const H = size * 5 + gap * 4;

  return (
    <div ref={ref} className={c.chart}>
      <svg width={w} height={H} role="group" aria-label={label}>
        {LAYOUT.map((l) => {
          const d = by.get(l.code);
          const v = d?.value ?? null;
          const b = v === null ? -1 : bin(v);
          const dark = b >= 3;
          const sel = selected === l.code;
          const tx = l.col * (size + gap) + (w - (size * 5 + gap * 4)) / 2;
          const ty = l.row * (size + gap);
          return (
            <g
              key={l.code}
              className={c.tile}
              transform={`translate(${tx},${ty})`}
              tabIndex={0}
              role="button"
              aria-pressed={sel}
              aria-label={`${l.name}: ${d?.display ?? "no data"}`}
              onClick={() => onSelect(l.code)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(l.code))}
            >
              <rect
                className={c.tileBox}
                width={size}
                height={size}
                fill={b < 0 ? "var(--bo-paper-sink)" : tint(b)}
                stroke="var(--bo-ink)"
                strokeWidth={sel ? 2.5 : 0.75}
              />
              <text className={c.tileText} x={8} y={17} style={{ fill: dark ? "var(--bo-paper)" : "var(--bo-ink)", fontWeight: 500, letterSpacing: "0.12em" }}>
                {l.short}
              </text>
              <text
                x={8}
                y={size - 10}
                style={{
                  fill: dark ? "var(--bo-paper)" : "var(--bo-ink)",
                  fontFamily: "var(--bo-f-display)",
                  fontSize: Math.max(15, size * 0.24),
                  fontWeight: 300,
                }}
              >
                {d?.display ?? "—"}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={c.legend} aria-hidden="true">
        {Array.from({ length: BINS }, (_, b) => (
          <span key={b}>
            <i style={{ background: tint(b) }} />
            {legendFormat(lo + ((hi - lo) * b) / BINS)}
          </span>
        ))}
      </div>
    </div>
  );
}

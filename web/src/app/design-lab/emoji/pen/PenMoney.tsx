/**
 * Style study — "money with wings" drawn as pen and ink, five ways.
 * The light falls from the upper left in every version, so the same parts are in shade:
 * the lower band and right edge of the note, the underside of each feather, the cast shadow.
 * Only the way the pen makes that shade changes. One ink (currentColor), SVG, no fills of tone.
 */

import type { ReactNode } from "react";

export type PenStyle = "hatch" | "crosshatch" | "contour" | "stipple" | "weighted";

export const PEN_STYLES: { id: PenStyle; name: string; note: string }[] = [
  { id: "hatch", name: "Engraved hatch", note: "One direction of hatching; tighter where the shade is deeper." },
  { id: "crosshatch", name: "Cross-hatch", note: "Shade in one direction, deep shadow crossed a second way." },
  { id: "contour", name: "Contour hatch", note: "Lines follow the form: along each feather, across the note." },
  { id: "stipple", name: "Pen stipple", note: "Shade built from placed dots, denser in deep shadow." },
  { id: "weighted", name: "Weighted line", note: "Little shading; the line thickens on the side away from the light." },
];

/* ——— geometry (200 × 200 design box) ——— */

const NOTE_ROT = -6;
const NOTE = { x: 42, y: 70, w: 116, h: 68 };

type Feather = { root: [number, number]; angle: number; len: number; width: number };
function feathers(side: 1 | -1): Feather[] {
  const root: [number, number] = side < 0 ? [46, 86] : [154, 86];
  return [0, 1, 2, 3].map((i) => ({
    root,
    // fan upward and outward; side −1 points left
    angle: side < 0 ? 200 + i * 18 : -20 - i * 18,
    len: 70 - i * 11,
    width: 15 - i * 2,
  }));
}

const rad = (d: number) => (d * Math.PI) / 180;
function along(f: Feather, t: number, off: number): [number, number] {
  const a = rad(f.angle);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  return [f.root[0] + Math.cos(a) * f.len * t + nx * off, f.root[1] + Math.sin(a) * f.len * t + ny * off];
}
const P = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Whole feather (leaf) outline. */
function leaf(f: Feather): string {
  const w = f.width / 2;
  return `M${P(f.root)} Q${P(along(f, 0.45, -w * 1.25))} ${P(along(f, 1, 0))} Q${P(along(f, 0.45, w * 1.25))} ${P(f.root)}Z`;
}
/** The half of the feather turned away from the light (the lower side on screen). */
function leafShade(f: Feather): string {
  const w = f.width / 2;
  // the "+off" side is below the axis for both wings once angles fan upward
  const sign = f.angle > 90 ? -1 : 1;
  return `M${P(f.root)} L${P(along(f, 1, 0))} Q${P(along(f, 0.45, sign * w * 1.25))} ${P(f.root)}Z`;
}

const NOTE_SHADE = `M${NOTE.x} ${NOTE.y + NOTE.h * 0.62}H${NOTE.x + NOTE.w}V${NOTE.y + NOTE.h}H${NOTE.x}Z`;
const NOTE_EDGE = `M${NOTE.x + NOTE.w} ${NOTE.y}l5 4V${NOTE.y + NOTE.h + 4}H${NOTE.x + 5}l-5-4H${NOTE.x + NOTE.w}Z`;
const CAST = { cx: 104, cy: 176, rx: 58, ry: 7 };

/* ——— pen marks ——— */

/** Parallel lines across a box at an angle, spacing s; clipped by the caller. */
function hatchLines(x0: number, y0: number, x1: number, y1: number, angle: number, s: number): string {
  const a = rad(angle);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const r = Math.hypot(x1 - x0, y1 - y0) / 2 + s;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let d = "";
  for (let o = -r; o <= r; o += s) {
    const px = cx - dy * o;
    const py = cy + dx * o;
    d += `M${(px - dx * r).toFixed(1)} ${(py - dy * r).toFixed(1)}L${(px + dx * r).toFixed(1)} ${(py + dy * r).toFixed(1)}`;
  }
  return d;
}

function hash(i: number, j: number) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Jittered pen dots over a box; density 0–1. */
function stippleDots(x0: number, y0: number, x1: number, y1: number, step: number, density: number, seed: number) {
  const dots: ReactNode[] = [];
  let n = 0;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      n += 1;
      if (hash(n, seed) > density) continue;
      const jx = (hash(n, seed + 7) - 0.5) * step;
      const jy = (hash(n, seed + 13) - 0.5) * step;
      const r = 0.7 + hash(n, seed + 29) * 0.5;
      dots.push(<circle key={`${seed}-${n}`} cx={x + jx} cy={y + jy} r={r} />);
    }
  }
  return dots;
}

/* ——— the drawing ——— */

function Outline({ weight }: { weight: number }) {
  const all = [...feathers(-1), ...feathers(1)];
  return (
    <g fill="none" stroke="currentColor" strokeWidth={weight} strokeLinejoin="round" strokeLinecap="round">
      {all.map((f, i) => (
        <path key={i} d={leaf(f)} />
      ))}
      {all.map((f, i) => (
        <path key={`s${i}`} d={`M${P(f.root)}L${P(along(f, 0.92, 0))}`} strokeWidth={weight * 0.55} />
      ))}
      <g transform={`rotate(${NOTE_ROT} 100 104)`}>
        <path d={NOTE_EDGE} />
        <rect x={NOTE.x} y={NOTE.y} width={NOTE.w} height={NOTE.h} fill="var(--pen-paper, #fdfdff)" />
        <rect x={NOTE.x + 7} y={NOTE.y + 7} width={NOTE.w - 14} height={NOTE.h - 14} strokeWidth={weight * 0.6} />
        <ellipse cx={100} cy={104} rx={21} ry={19} strokeWidth={weight * 0.8} />
      </g>
      <path d="M70 160h16M96 162h24M130 160h12" strokeWidth={weight * 0.8} />
    </g>
  );
}

function Shade({ style, uid, layer }: { style: PenStyle; uid: string; layer: "back" | "front" }) {
  const back = layer === "back";
  const front = !back;
  const all = [...feathers(-1), ...feathers(1)];
  const lw = 0.9;

  // clip regions (note regions are drawn inside the note's rotation)
  const clips = (
    <defs>
      <clipPath id={`${uid}-wings`}>
        {all.map((f, i) => (
          <path key={i} d={leafShade(f)} />
        ))}
      </clipPath>
      <clipPath id={`${uid}-note`}>
        <path d={NOTE_SHADE} />
      </clipPath>
      <clipPath id={`${uid}-edge`}>
        <path d={NOTE_EDGE} />
      </clipPath>
      <clipPath id={`${uid}-cast`}>
        <ellipse {...CAST} />
      </clipPath>
    </defs>
  );

  const ink = { stroke: "currentColor", strokeWidth: lw, fill: "none", strokeLinecap: "round" as const };

  if (style === "hatch" || style === "crosshatch") {
    return (
      <g>
        {clips}
        {back ? <path clipPath={`url(#${uid}-wings)`} d={hatchLines(0, 20, 200, 120, 45, 3.2)} {...ink} /> : null}
        {back ? <path clipPath={`url(#${uid}-cast)`} d={hatchLines(40, 160, 170, 190, 45, 2.6)} {...ink} /> : null}
        {front ? <g transform={`rotate(${NOTE_ROT} 100 104)`}>
          <path clipPath={`url(#${uid}-note)`} d={hatchLines(40, 100, 160, 140, 45, 3.6)} {...ink} />
          <path clipPath={`url(#${uid}-edge)`} d={hatchLines(40, 66, 170, 146, 45, 1.8)} {...ink} />
          {style === "crosshatch" ? (
            <>
              <path clipPath={`url(#${uid}-edge)`} d={hatchLines(40, 66, 170, 146, -45, 2)} {...ink} />
              <path
                clipPath={`url(#${uid}-note)`}
                d={hatchLines(40, 124, 160, 140, -45, 3.4)}
                {...ink}
              />
            </>
          ) : null}
        </g> : null}
        {back && style === "crosshatch" ? (
          <path clipPath={`url(#${uid}-cast)`} d={hatchLines(40, 160, 170, 190, -45, 3)} {...ink} />
        ) : null}
      </g>
    );
  }

  if (style === "contour") {
    // lines along each feather's axis inside its shaded half; horizontal rules across the note,
    // closing up toward the bottom edge; cast shadow ruled flat
    const noteRules: string[] = [];
    let y = NOTE.y + NOTE.h * 0.6;
    let gap = 4.2;
    while (y < NOTE.y + NOTE.h) {
      noteRules.push(`M${NOTE.x} ${y.toFixed(1)}H${NOTE.x + NOTE.w}`);
      y += gap;
      gap = Math.max(1.6, gap * 0.82);
    }
    return (
      <g>
        {clips}
        {back && all.map((f, i) => (
          <g key={i} clipPath={`url(#${uid}-wings)`}>
            <path
              d={[0.18, 0.36, 0.54, 0.72].map((k) => {
                const o = (f.angle > 90 ? -1 : 1) * (f.width / 2) * k;
                return `M${P(along(f, 0.06, o * 0.6))}L${P(along(f, 0.96, o * 0.2))}`;
              }).join("")}
              {...ink}
            />
          </g>
        ))}
        {back ? <path clipPath={`url(#${uid}-cast)`} d={[0, 1, 2, 3, 4].map((i) => `M40 ${170 + i * 3}H170`).join("")} {...ink} /> : null}
        {front ? <g transform={`rotate(${NOTE_ROT} 100 104)`}>
          <path clipPath={`url(#${uid}-note)`} d={noteRules.join("")} {...ink} />
          <path
            clipPath={`url(#${uid}-edge)`}
            d={Array.from({ length: 40 }, (_, i) => `M${NOTE.x + NOTE.w + 1 + (i % 2) * 2} ${NOTE.y + i * 2}v2`).join("") +
              Array.from({ length: 70 }, (_, i) => `M${NOTE.x + i * 1.8} ${NOTE.y + NOTE.h}v4`).join("")}
            {...ink}
          />
        </g> : null}
      </g>
    );
  }

  if (style === "stipple") {
    return (
      <g fill="currentColor">
        {clips}
        {back ? <g clipPath={`url(#${uid}-wings)`}>{stippleDots(0, 10, 200, 120, 3, 0.55, 3)}</g> : null}
        {back ? <g clipPath={`url(#${uid}-cast)`}>{stippleDots(40, 166, 170, 186, 2.6, 0.6, 5)}</g> : null}
        {front ? <g transform={`rotate(${NOTE_ROT} 100 104)`}>
          <g clipPath={`url(#${uid}-note)`}>{stippleDots(40, 110, 162, 140, 3.4, 0.32, 9)}</g>
          <g clipPath={`url(#${uid}-note)`}>{stippleDots(40, 126, 162, 140, 2.6, 0.45, 11)}</g>
          <g clipPath={`url(#${uid}-edge)`}>{stippleDots(40, 66, 170, 146, 1.6, 0.85, 13)}</g>
        </g> : null}
      </g>
    );
  }

  // weighted: heavy strokes along the edges away from the light, a few ticks under the feathers
  return (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {back && all.map((f, i) => {
        const sign = f.angle > 90 ? -1 : 1;
        const w = f.width / 2;
        return (
          <path
            key={i}
            d={`M${P(along(f, 0.1, sign * w * 0.6))} Q${P(along(f, 0.45, sign * w * 1.2))} ${P(along(f, 0.97, 0))}`}
            strokeWidth={3.4}
          />
        );
      })}
      {front ? <g transform={`rotate(${NOTE_ROT} 100 104)`}>
        <path d={`M${NOTE.x + 3} ${NOTE.y + NOTE.h + 2.5}H${NOTE.x + NOTE.w + 3}V${NOTE.y + 3}`} strokeWidth={4.5} />
        <path d="M101 126 a21 19 0 0 0 20 -22" strokeWidth={2.6} />
      </g> : null}
      {back ? <path d="M58 176h92" strokeWidth={3} /> : null}
    </g>
  );
}

export function PenMoney({ style, size, uid }: { style: PenStyle; size: number; uid: string }) {
  const weight = style === "weighted" ? 1.8 : 1.5;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={`Money with wings, ${style}`}>
      {/* wing and cast shade sit behind the note's paper; the note's own shade and the £ sit on top */}
      <Shade style={style} uid={uid} layer="back" />
      <Outline weight={weight} />
      <Shade style={style} uid={`${uid}f`} layer="front" />
      <g transform={`rotate(${NOTE_ROT} 100 104)`}>
          <text
          x={100}
          y={115}
          textAnchor="middle"
          fontFamily="var(--bo-f-head), Georgia, serif"
          fontSize={32}
          fill="currentColor"
          stroke="none"
        >
          £
        </text>
      </g>
    </svg>
  );
}

"use client";

/**
 * UK power-station atlas — square capacity marks on a fixed GB extent.
 * Housing map grammar: drag to pan, +/−/Home tools, Find selected, keyboard arrows.
 * Brand: square marks (never circles). One ink. A mark is a printed tint: a hairline square filled with
 * a screen of that ink (tints are dots and lines, never opacity), so overlapping stations stay
 * legible. Renewables are a dot screen, fossil a hatch, nuclear a cross-hatch, storage an open
 * square. Marks too small to hold a screen print solid.
 * Selection is ink: a frame with registration ticks and a coordinate mark, drawn above every
 * station. Focus is a Signal ring. Hover is an ink hairline.
 */

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  isMapped,
  stationGroup,
  stationKey,
  stationPlace,
  stationPosition,
  type StationGroup,
} from "../energy/station-model";
import type { AtlasPoint } from "../energy/packs";
import s from "./station-map.module.css";

export type StationPoint = AtlasPoint;

/** One ink for every family; families are told apart by print (stipple, hatch, cross, open), never by colour. */
const INK = "var(--bo-ink)";
const FILLS: Record<StationGroup, string> = {
  renewable: INK,
  storage: INK,
  fossil: INK,
  nuclear: INK,
};

const FAMILY_LABEL: Record<StationGroup, string> = {
  renewable: "Renewables",
  storage: "Storage",
  fossil: "Fossil",
  nuclear: "Nuclear",
};

const CX = MAP_WIDTH / 2;
const CY = MAP_HEIGHT / 2;
const HOME = { x: 0, y: 0, z: 1 };
const MAX_Z = 14;

/** Half-side of the square in viewBox units. sqrt(MW) keeps area ∝ capacity; hard caps stop blotting. */
function halfSide(mw: number): number {
  const raw = Math.sqrt(Math.max(0, mw)) * 0.11;
  return Math.min(7.5, Math.max(1.15, raw));
}

/** Screen pitch and dot radius in screen px (constant at every zoom). */
const SCREEN = { pitch: 3.2, r: 0.85 };
/** Below this half-side in screen px a screen cannot read; the mark prints solid. */
const SOLID_BELOW = 3.2;

function coord(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
}

const SIZE_KEY = [
  { mw: 100, px: 8 },
  { mw: 1000, px: 14 },
] as const;

export function StationPointMap({
  points,
  label,
  selectedId,
  onSelect,
  outline,
}: {
  points: StationPoint[];
  label: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  outline?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState(HOME);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; origin: typeof HOME; moved: boolean } | null>(null);
  const panMoved = useRef(false);

  // Small first, large last — capacity still reads, dense solar does not bury the coast.
  const drawn = useMemo(() => points.filter(isMapped).toSorted((a, b) => a.mw - b.mw), [points]);
  const byId = useMemo(() => new Map(drawn.map((p) => [stationKey(p), p])), [drawn]);
  const families = (["renewable", "fossil", "nuclear", "storage"] as StationGroup[]).filter((g) =>
    drawn.some((p) => stationGroup(p) === g),
  );
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const hovered = hoverId ? byId.get(hoverId) : undefined;

  const zoom = (factor: number) =>
    setView((v) => {
      const z = Math.min(MAX_Z, Math.max(1, v.z * factor));
      return z === 1 ? HOME : { x: CX - ((CX - v.x) * z) / v.z, y: CY - ((CY - v.y) * z) / v.z, z };
    });

  const focusStation = (p: StationPoint, z = 6) => {
    const [px, py] = stationPosition(p.lon, p.lat);
    const next = Math.min(MAX_Z, Math.max(4, z));
    setView({ x: CX - px * next, y: CY - py * next, z: next });
  };

  // Selecting from search / list flies the map to the site (Housing "Find", automatic).
  // Depend on byId so a late-hydrated pack still focuses once points exist.
  useEffect(() => {
    if (!selectedId) return;
    const p = byId.get(selectedId);
    if (!p) return;
    focusStation(p);
  }, [selectedId, byId]);

  // Wheel zoom needs a non-passive listener so the page does not scroll instead.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      setView((v) => {
        const z = Math.min(MAX_Z, Math.max(1, v.z * factor));
        return z === 1 ? HOME : { x: CX - ((CX - v.x) * z) / v.z, y: CY - ((CY - v.y) * z) / v.z, z };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ViewBox units per screen pixel at the current zoom, so screens, frames and labels keep a fixed printed size.
  const [plotWidth, setPlotWidth] = useState(MAP_WIDTH * 2);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setPlotWidth(e.contentRect.width || MAP_WIDTH * 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const unit = MAP_WIDTH / plotWidth / view.z;

  /** One station mark: screened square with a hairline in the family ink, solid when too small to screen. */
  const mark = (group: StationGroup, cx: number, cy: number, half: number, solid = false) => {
    const kind = group === "storage" ? "open" : solid || half / unit < SOLID_BELOW ? "solid" : "screen";
    return (
      <rect
        className={s.mark}
        data-kind={group}
        data-print={kind}
        x={cx - half}
        y={cy - half}
        width={half * 2}
        height={half * 2}
        fill={kind === "open" ? undefined : kind === "solid" ? FILLS[group] : `url(#${uid}-screen-${group})`}
        stroke={FILLS[group]}
      />
    );
  };

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  const caption = hovered
    ? `${hovered.name} · ${hovered.mw.toLocaleString("en-GB")} MW${stationPlace(hovered) ? ` · ${stationPlace(hovered)}` : ""}`
    : selected
      ? `${selected.name} · selected`
      : "Drag to pan · zoom to inspect dense areas · select a square";

  return (
    <div className={s.wrap}>
      <div className={s.surface}>
        <div className={s.caption}>
          <span className="bo-label">Great Britain · installed capacity</span>
          <span>{caption}</span>
        </div>

        <div className={s.tools} role="group" aria-label="Map controls">
          <button type="button" className={s.toolBtn} onClick={() => zoom(1.5)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className={s.toolBtn} onClick={() => zoom(1 / 1.5)} aria-label="Zoom out">
            −
          </button>
          <button type="button" className={s.toolBtn} onClick={() => setView(HOME)} aria-label="Reset view">
            ⌂
          </button>
          <button
            type="button"
            className={s.toolBtnWide}
            onClick={() => selected && focusStation(selected, 7)}
            disabled={!selected}
          >
            Find
          </button>
        </div>

        <svg
          ref={svg}
          className={s.plot}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="group"
          aria-label={`${label}. Drag to pan, plus and minus to zoom, Home to reset, Find to centre the selected station.`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Home"].includes(e.key)) {
              e.preventDefault();
            }
            if (e.key === "+" || e.key === "=") zoom(1.5);
            else if (e.key === "-") zoom(1 / 1.5);
            else if (e.key === "Home") setView(HOME);
            else if (e.key.startsWith("Arrow"))
              setView((v) => ({
                ...v,
                x: v.x + (e.key === "ArrowLeft" ? 40 : e.key === "ArrowRight" ? -40 : 0),
                y: v.y + (e.key === "ArrowUp" ? 40 : e.key === "ArrowDown" ? -40 : 0),
              }));
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const p = point(e);
            drag.current = { x: p.x, y: p.y, origin: view, moved: false };
            panMoved.current = false;
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = point(e);
            const d = drag.current;
            const dx = p.x - d.x;
            const dy = p.y - d.y;
            if (Math.hypot(dx, dy) > 6) {
              d.moved = true;
              panMoved.current = true;
              svg.current?.setPointerCapture(e.pointerId);
            }
            if (d.moved) setView({ ...d.origin, x: d.origin.x + dx, y: d.origin.y + dy });
          }}
          onPointerUp={(e) => {
            drag.current = null;
            if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onPointerLeave={() => setHoverId(null)}
        >
          <defs>
            {(["renewable", "fossil", "nuclear"] as StationGroup[]).map((g) => (
              // userSpaceOnUse inherits the zoom transform; scale it back so the screen stays a fixed pitch.
              <pattern
                key={g}
                id={`${uid}-screen-${g}`}
                width={SCREEN.pitch}
                height={SCREEN.pitch}
                patternUnits="userSpaceOnUse"
                patternTransform={`scale(${unit}) rotate(45)`}
              >
                {g === "renewable" ? (
                  <circle cx={SCREEN.pitch / 2} cy={SCREEN.pitch / 2} r={SCREEN.r} fill={FILLS[g]} />
                ) : (
                  <>
                    <line x1={SCREEN.pitch / 2} y1={0} x2={SCREEN.pitch / 2} y2={SCREEN.pitch} stroke={FILLS[g]} strokeWidth={0.9} />
                    {g === "nuclear" ? (
                      <line x1={0} y1={SCREEN.pitch / 2} x2={SCREEN.pitch} y2={SCREEN.pitch / 2} stroke={FILLS[g]} strokeWidth={0.9} />
                    ) : null}
                  </>
                )}
              </pattern>
            ))}
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
            {outline ? <path d={outline} className={s.land} /> : null}
            {drawn.map((p) => {
              const [cx, cy] = stationPosition(p.lon, p.lat);
              const id = stationKey(p);
              const group = stationGroup(p);
              const half = halfSide(p.mw);
              // Hit target grows slightly when zoomed out so dense fields stay clickable.
              const hit = Math.max(half + 2.5 / view.z, 3.5 / view.z);
              return (
                <g
                  key={id}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${p.name}, ${p.mw.toLocaleString("en-GB")} MW`}
                  aria-pressed={selectedId === id}
                  className={s.station}
                  onPointerEnter={() => setHoverId(id)}
                  onClick={() => {
                    if (!panMoved.current) onSelect?.(id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(id);
                    }
                  }}
                >
                  <title>{`${p.name} · ${p.mw.toLocaleString("en-GB")} MW · ${FAMILY_LABEL[group]}`}</title>
                  <rect className={s.hit} x={cx - hit} y={cy - hit} width={hit * 2} height={hit * 2} />
                  {mark(group, cx, cy, half)}
                </g>
              );
            })}

            {/* Above every station: hover hairline, then the selection. */}
            {hovered && hoverId !== selectedId
              ? (() => {
                  const [cx, cy] = stationPosition(hovered.lon, hovered.lat);
                  const half = halfSide(hovered.mw) + 1.5 * unit;
                  return <rect className={s.hover} x={cx - half} y={cy - half} width={half * 2} height={half * 2} />;
                })()
              : null}
            {selected
              ? (() => {
                  const [cx, cy] = stationPosition(selected.lon, selected.lat);
                  const group = stationGroup(selected);
                  const half = halfSide(selected.mw);
                  const f = half + 4 * unit; // frame half-side: 4px clear of the mark
                  const tick = 9 * unit; // registration ticks run 9px past the frame
                  const labelX = cx + f + tick + 4 * unit;
                  const rightEdge = (MAP_WIDTH - view.x) / view.z; // visible right edge, map units
                  const flip = labelX + 110 * unit > rightEdge; // label would run off: set it to the left
                  return (
                    <g
                      className={s.selection}
                      role="button"
                      tabIndex={0}
                      aria-label={`${selected.name}, ${selected.mw.toLocaleString("en-GB")} MW, selected`}
                      aria-pressed
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") e.preventDefault();
                      }}
                    >
                      <rect className={s.knock} x={cx - f} y={cy - f} width={f * 2} height={f * 2} />
                      {mark(group, cx, cy, half, true)}
                      <rect className={s.frame} x={cx - f} y={cy - f} width={f * 2} height={f * 2} />
                      <path
                        className={s.frame}
                        d={`M${cx - f - tick},${cy}H${cx - f}M${cx + f},${cy}H${cx + f + tick}M${cx},${cy - f - tick}V${cy - f}M${cx},${cy + f}V${cy + f + tick}`}
                      />
                      <rect className={s.focus} x={cx - f - 3 * unit} y={cy - f - 3 * unit} width={(f + 3 * unit) * 2} height={(f + 3 * unit) * 2} />
                      <text
                        className={s.coord}
                        x={flip ? cx - f - tick - 4 * unit : labelX}
                        y={cy}
                        textAnchor={flip ? "end" : "start"}
                        dominantBaseline="middle"
                        style={{ fontSize: 10 * unit, strokeWidth: 3 * unit }}
                      >
                        {coord(selected.lat, selected.lon)}
                      </text>
                    </g>
                  );
                })()
              : null}
          </g>
        </svg>
      </div>

      <ul className={s.key} aria-label="Station families and capacity scale">
        {families.map((g) => (
          <li key={g} className={s.keyItem}>
            <span className={s.swatch} data-kind={g} aria-hidden="true" />
            {FAMILY_LABEL[g]}
          </li>
        ))}
        <li className={s.sizeKey} aria-label="Square area shows installed capacity">
          {SIZE_KEY.map(({ mw, px }) => (
            <span key={mw} className={s.sizeMark}>
              <i style={{ width: px, height: px }} aria-hidden="true" />
              {mw.toLocaleString("en-GB")} MW
            </span>
          ))}
        </li>
      </ul>
    </div>
  );
}

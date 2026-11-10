"use client";

/**
 * Invisible Grid pilot map — SSEN SEPD + SHEPD substations and EHV/EHV+ overhead lines.
 * Housing / Station atlas grammar: drag to pan, +/−/Home, Find selected.
 * One electric ink: hairline routes + square substation marks (never circles).
 * Not spare capacity. Not a national DNO atlas.
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { MAP_HEIGHT, MAP_WIDTH, stationPosition } from "../energy/station-model";
import type { SsenLine, SsenSubstation } from "../energy/networks-model";
import s from "./station-map.module.css";

const CX = MAP_WIDTH / 2;
const CY = MAP_HEIGHT / 2;
const HOME = { x: 0, y: 0, z: 1 };
const MAX_Z = 18;
const HALF = 1.35;
/** Rough licence split for overhead lines (no owner field on the pin). */
/** Mid-gap between SEPD (≤52°N) and SHEPD (≥55.4°N) on this pin. */
const SHEPD_LAT_MIN = 54;

export type NetworkTopologyMapProps = {
  substations: SsenSubstation[];
  lines: SsenLine[];
  label: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  outline?: string;
};

function coord(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
}

function lineInArea(line: SsenLine, area: "all" | "SEPD" | "SHEPD"): boolean {
  if (area === "all") return true;
  const mid = line.coordinates[Math.floor(line.coordinates.length / 2)];
  if (!mid) return false;
  const lat = mid[1]!;
  return area === "SHEPD" ? lat >= SHEPD_LAT_MIN : lat < SHEPD_LAT_MIN;
}

export function NetworkTopologyMap({
  substations,
  lines,
  label,
  selectedId,
  onSelect,
  outline,
}: NetworkTopologyMapProps) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState(HOME);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; origin: typeof HOME; moved: boolean } | null>(null);

  const byId = useMemo(() => new Map(substations.map((p) => [p.id, p])), [substations]);
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const hovered = hoverId ? byId.get(hoverId) : undefined;

  const ehvPath = useMemo(() => {
    const parts: string[] = [];
    for (const line of lines) {
      if (line.network_type !== "EHV" || line.coordinates.length < 2) continue;
      line.coordinates.forEach(([lon, lat], i) => {
        const [x, y] = stationPosition(lon, lat);
        parts.push(`${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`);
      });
    }
    return parts.join("");
  }, [lines]);

  const ehvPlusPath = useMemo(() => {
    const parts: string[] = [];
    for (const line of lines) {
      if (line.network_type !== "EHV+" || line.coordinates.length < 2) continue;
      line.coordinates.forEach(([lon, lat], i) => {
        const [x, y] = stationPosition(lon, lat);
        parts.push(`${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`);
      });
    }
    return parts.join("");
  }, [lines]);

  const zoom = (factor: number) =>
    setView((v) => {
      const z = Math.min(MAX_Z, Math.max(1, v.z * factor));
      return z === 1 ? HOME : { x: CX - ((CX - v.x) * z) / v.z, y: CY - ((CY - v.y) * z) / v.z, z };
    });

  const focusSite = (p: SsenSubstation, z = 7) => {
    const [px, py] = stationPosition(p.lon, p.lat);
    const next = Math.min(MAX_Z, Math.max(5, z));
    setView({ x: CX - px * next, y: CY - py * next, z: next });
  };

  useEffect(() => {
    if (!selectedId) return;
    const p = byId.get(selectedId);
    if (!p) return;
    focusSite(p);
  }, [selectedId, byId]);

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

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  const focus = hovered ?? selected;
  const caption = hovered
    ? `${hovered.type} · ${hovered.owner}${hovered.locality ? ` · ${hovered.locality}` : ""}`
    : selected
      ? `${selected.type} · ${selected.owner} · selected`
      : null;

  return (
    <div className={s.wrap}>
      <div className={s.surface}>
        {caption && (
          <div className={s.caption}>
            <span>{caption}</span>
            {focus ? <span>{coord(focus.lat, focus.lon)}</span> : null}
          </div>
        )}

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
            onClick={() => selected && focusSite(selected, 8)}
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
          aria-label={`${label}. Drag to pan, plus and minus to zoom, Home to reset, Find to centre the selected substation.`}
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
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = point(e);
            const d = drag.current;
            const dx = p.x - d.x;
            const dy = p.y - d.y;
            if (Math.hypot(dx, dy) > 6) {
              d.moved = true;
              svg.current?.setPointerCapture(e.pointerId);
            }
            if (d.moved) setView({ ...d.origin, x: d.origin.x + dx, y: d.origin.y + dy });
          }}
          onPointerUp={(e) => {
            const moved = drag.current?.moved;
            drag.current = null;
            if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
            if (!moved && e.target === svg.current) onSelect?.(null);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onPointerLeave={() => setHoverId(null)}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
            {outline ? <path d={outline} className={s.land} /> : null}
            {ehvPath ? (
              <path
                d={ehvPath}
                fill="none"
                stroke="var(--bo-ink-40)"
                strokeWidth={0.55}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {ehvPlusPath ? (
              <path
                d={ehvPlusPath}
                fill="none"
                stroke="var(--bo-ink)"
                strokeWidth={0.9}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {substations.map((p) => {
              const [cx, cy] = stationPosition(p.lon, p.lat);
              const active = selectedId === p.id;
              const hit = Math.max(HALF + 2.2 / view.z, 3 / view.z);
              return (
                <g
                  key={p.id}
                  transform={`translate(${cx} ${cy})`}
                  onPointerEnter={() => setHoverId(p.id)}
                  onPointerLeave={() => setHoverId((h) => (h === p.id ? null : h))}
                  onClick={() => {
                    if (drag.current?.moved) return;
                    onSelect?.(p.id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <rect x={-hit} y={-hit} width={hit * 2} height={hit * 2} fill="transparent" />
                  <rect
                    x={-HALF}
                    y={-HALF}
                    width={HALF * 2}
                    height={HALF * 2}
                    fill={active ? "var(--bo-ink)" : "var(--bo-paper)"}
                    stroke="var(--bo-ink)"
                    strokeWidth={0.7}
                    vectorEffect="non-scaling-stroke"
                  />
                  {active ? (
                    <rect
                      x={-HALF - 1.6}
                      y={-HALF - 1.6}
                      width={(HALF + 1.6) * 2}
                      height={(HALF + 1.6) * 2}
                      fill="none"
                      stroke="var(--bo-signal)"
                      strokeWidth={1.1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export { lineInArea };

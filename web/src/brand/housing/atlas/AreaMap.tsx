"use client";

import { memo, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Area, MapShape, Mode } from "./model";
import { band, breaks, formatValue, valueAt } from "./model";
import { BandScreenDefs } from "./BandScreen";
import s from "./atlas.module.css";

const HOME = { x: 0, y: 0, z: 1 };

/**
 * Choropleth of local authorities. Fills = 45° electric screen by band.
 * Boundaries = hairline chrome; Signal outline = selection; Union dash = compare.
 */

const AreaPaths = memo(function AreaPaths({
  shapes,
  bands,
  uid,
  onSelect,
  onHover,
}: {
  shapes: MapShape[];
  bands: (number | null)[];
  uid: string;
  onSelect: (code: string) => void;
  onHover: (code: string) => void;
}) {
  return (
    <>
      {shapes.map((shape, i) => {
        const bucket = bands[i]!;
        return (
          <path
            key={shape.code}
            d={shape.path}
            fill={`url(#${uid}-${bucket === null ? "missing" : `band-${bucket}`})`}
            fillRule="evenodd"
            stroke="var(--bo-ink-20)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
            className={s.area}
            onMouseEnter={() => onHover(shape.code)}
            onMouseLeave={() => onHover("")}
            onClick={() => onSelect(shape.code)}
          >
            <title>{shape.name}</title>
          </path>
        );
      })}
    </>
  );
});

export function AreaMap({
  shapes,
  areas,
  month,
  measure,
  mode,
  selected,
  comparison,
  onSelect,
  compact = false,
  flow = false,
  coverage = "Local authorities · UK",
  mapLabel = "Interactive map of UK local-authority housing data",
}: {
  shapes: MapShape[];
  areas: Area[];
  month: number;
  measure: string;
  mode: Mode;
  selected: string;
  comparison: string;
  onSelect: (code: string) => void;
  /** Shorter surface for embedding in the housing explorer stage. */
  compact?: boolean;
  /** Size the map from its drawing, in normal flow. Use this inside a column that also has a legend. */
  flow?: boolean;
  /** Caption for the places actually drawn. Displacement is England, not the UK. */
  coverage?: string;
  /** Accessible name of the map. */
  mapLabel?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState(HOME);
  const [hover, setHover] = useState("");
  const drag = useRef<{ x: number; y: number; origin: typeof HOME; moved: boolean } | null>(null);
  const panMoved = useRef(false);

  const byCode = useMemo(() => new Map(areas.map((area) => [area.code, area])), [areas]);
  const thresholds = useMemo(() => breaks(measure, mode), [measure, mode]);
  // Precompute bands once per month/mode — play path only swaps fill urls.
  const bands = useMemo(
    () => shapes.map((shape) => band(valueAt(byCode.get(shape.code), month, mode), thresholds)),
    [shapes, byCode, month, mode, thresholds],
  );

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  const zoom = (factor: number) =>
    setView((v) => {
      const z = Math.min(14, Math.max(1, v.z * factor));
      return z === 1 ? HOME : { x: 380 - ((380 - v.x) * z) / v.z, y: 440 - ((440 - v.y) * z) / v.z, z };
    });

  const focusPlace = () => {
    const shape = shapes.find((sh) => sh.code === selected);
    if (!shape) return;
    const [x0, y0, x1, y1] = shape.bounds;
    const z = Math.min(12, 0.6 * Math.min(760 / Math.max(1, x1 - x0), 880 / Math.max(1, y1 - y0)));
    setView({ x: 380 - ((x0 + x1) / 2) * z, y: 440 - ((y0 + y1) / 2) * z, z });
  };

  const highlighted = shapes.find((sh) => sh.code === hover);
  const selectShape = shapes.find((sh) => sh.code === selected);
  const compareShape =
    comparison && comparison !== selected ? shapes.find((sh) => sh.code === comparison) : undefined;
  const hoverShape =
    hover && hover !== selected ? shapes.find((sh) => sh.code === hover) : undefined;

  return (
    <div className={`${s.mapSurface} ${compact ? s.mapSurfaceCompact : ""} ${flow ? s.mapSurfaceFlow : ""}`}>
      <div className={s.mapCaption}>
        <span className="bo-label">{coverage}</span>
        <span>
          {highlighted
            ? `${highlighted.name} · ${formatValue(valueAt(byCode.get(hover), month, mode), measure, mode)}`
            : "Select a place to update the record"}
        </span>
      </div>

      <div className={s.mapTools} role="group" aria-label="Map controls">
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
          onClick={focusPlace}
          disabled={!shapes.some((sh) => sh.code === selected)}
        >
          Find
        </button>
      </div>

      <svg
        ref={svg}
        className={s.mapSvg}
        viewBox="0 0 760 880"
        role="group"
        aria-label={mapLabel}
        aria-describedby={`${uid}-instructions`}
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
      >
        <BandScreenDefs idPrefix={uid} zoom={view.z} />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
          <AreaPaths
            shapes={shapes}
            bands={bands}
            uid={uid}
            onSelect={(code) => {
              if (!panMoved.current) onSelect(code);
            }}
            onHover={setHover}
          />
          {/* Hover / selection / compare drawn above fills so screens stay readable */}
          {hoverShape && (
            <path
              d={hoverShape.path}
              fill="none"
              stroke="var(--bo-ink)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
          {compareShape && (
            <g pointerEvents="none">
              <path
                d={compareShape.path}
                fill="none"
                stroke="var(--bo-paper)"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={compareShape.path}
                fill="none"
                stroke="var(--bo-union)"
                strokeWidth="1.75"
                strokeDasharray="5 3"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
          {selectShape && (
            <g pointerEvents="none">
              <path
                d={selectShape.path}
                fill="none"
                stroke="var(--bo-paper)"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={selectShape.path}
                fill="none"
                stroke="var(--bo-signal)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </g>
      </svg>
      <p id={`${uid}-instructions`} className={s.mapFoot}>
        Drag to pan · + / − to zoom · click a place to update focus. Home resets the view.
      </p>
    </div>
  );
}

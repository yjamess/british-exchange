"use client";

/**
 * English regions choropleth — Housing atlas instrument language (halftone bands,
 * pan/zoom, ink selection), reusable across sectors.
 */

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { BandScreenDefs } from "./BandScreen";
import { MapLegend } from "./MapLegend";
import { band, equalBreaks } from "./model";
import s from "./map.module.css";
import display from "./english-regions-display.json";

export type RegionShape = {
  code: string;
  name: string;
  path: string;
  bounds: [number, number, number, number];
  label: [number, number];
};

export type RegionDatum = { code: string; value: number | null; display: string };

export const REGION_SHAPES = display.shapes as RegionShape[];

const HOME = { x: 0, y: 0, z: 1 };
/** Map viewport centre in viewBox units (matches viewBox 760×880). */
const CX = 380;
const CY = 440;

/**
 * Reading size on screen. Labels sit under `scale(1/z)` so this is CSS px,
 * not viewBox units — keep them large enough over the halftone.
 */
const LABEL_PX = 13;

/** Official names, wrapped so the line fits the region. Sentence case. */
const LABEL_LINES: Record<string, string[]> = {
  E12000001: ["North East"],
  E12000002: ["North West"],
  E12000003: ["Yorkshire &", "the Humber"],
  E12000004: ["East", "Midlands"],
  E12000005: ["West", "Midlands"],
  E12000006: ["East of", "England"],
  E12000007: ["London"],
  E12000008: ["South East"],
  E12000009: ["South West"],
};

/** Centroids that land on a neighbour. These stay on the region they name. */
const LABEL_AT: Record<string, [number, number]> = {
  E12000004: [530, 400],
  E12000005: [365, 520],
  E12000007: [560, 634],
  E12000008: [590, 710],
};

/** Fit a region bbox into the viewport with a little margin. */
function viewForBounds(bounds: [number, number, number, number]): typeof HOME {
  const [x0, y0, x1, y1] = bounds;
  const w = Math.max(40, x1 - x0);
  const h = Math.max(40, y1 - y0);
  const z = Math.min(3.2, Math.max(1.35, Math.min((760 * 0.72) / w, (880 * 0.72) / h)));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { x: CX - cx * z, y: CY - cy * z, z };
}

function RegionName({ lines, fontSize }: { lines: string[]; fontSize: number }) {
  const lineHeight = fontSize * 1.15;
  const longest = Math.max(...lines.map((l) => l.length), 1);
  // Approximate advance width for Geist/body at this size — paper tag under the name.
  const tagW = longest * fontSize * 0.58 + 16;
  const tagH = lines.length * lineHeight + 10;
  return (
    <g pointerEvents="none">
      <rect
        x={-tagW / 2}
        y={-tagH / 2}
        width={tagW}
        height={tagH}
        rx={0}
        fill="var(--bo-paper)"
        stroke="var(--bo-ink-20)"
        strokeWidth={1}
      />
      {lines.map((line, i) => (
        <text
          key={line}
          x={0}
          y={(i - (lines.length - 1) / 2) * lineHeight + fontSize * 0.35}
          textAnchor="middle"
          fill="var(--bo-ink)"
          className={s.regionLabel}
          style={{ fontSize }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function RegionMap({
  data,
  selected,
  onSelect,
  label,
  legendFormat,
  legendUnit,
  size = "panel",
}: {
  data: RegionDatum[];
  selected: string | null;
  onSelect: (code: string) => void;
  label: string;
  legendFormat: (v: number) => string;
  /** What the ramp counts, in sentence case. "dwellings". */
  legendUnit?: string;
  /**
   * `panel` — capped width for side columns (Housing default).
   * `stage` — fills the parent (Energy Geography / wider splits).
   */
  size?: "panel" | "stage";
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState(HOME);
  const [hover, setHover] = useState("");
  const drag = useRef<{ x: number; y: number; origin: typeof HOME; moved: boolean } | null>(null);
  const panMoved = useRef(false);

  const byCode = useMemo(() => new Map(data.map((d) => [d.code, d])), [data]);
  const thresholds = useMemo(
    () => equalBreaks(data.map((d) => d.value).filter((v): v is number => v != null && Number.isFinite(v))),
    [data],
  );
  const bands = useMemo(
    () => REGION_SHAPES.map((sh) => band(byCode.get(sh.code)?.value ?? null, thresholds)),
    [byCode, thresholds],
  );

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  const zoom = (factor: number) =>
    setView((v) => {
      const z = Math.min(8, Math.max(1, v.z * factor));
      return z === 1 ? HOME : { x: CX - ((CX - v.x) * z) / v.z, y: CY - ((CY - v.y) * z) / v.z, z };
    });

  /** Zoom the map to the selected English region (Housing-style focus). */
  useEffect(() => {
    if (!selected) {
      setView(HOME);
      return;
    }
    const shape = REGION_SHAPES.find((sh) => sh.code === selected);
    if (shape) setView(viewForBounds(shape.bounds));
  }, [selected]);

  const hoverShape = hover ? REGION_SHAPES.find((sh) => sh.code === hover) : undefined;
  const selectShape = selected ? REGION_SHAPES.find((sh) => sh.code === selected) : undefined;
  const hoverData = hover ? byCode.get(hover) : undefined;

  return (
    <div className={`${s.mapSurfaceRegion} ${size === "stage" ? s.mapSurfaceStage : ""}`}>
      <div className={s.mapCaption}>
        <span>
          {hoverShape
            ? `${hoverShape.name} · ${hoverData?.display ?? "no data"}`
            : selectShape
              ? `${selectShape.name} · ${byCode.get(selectShape.code)?.display ?? "selected"}`
              : "Select a region"}
        </span>
      </div>

      <div className={s.mapTools} role="group" aria-label="Map controls">
        <button type="button" className={s.toolBtn} onClick={() => zoom(1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className={s.toolBtn} onClick={() => zoom(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={s.toolBtn} onClick={() => setView(HOME)} aria-label="Reset view">
          ⌂
        </button>
      </div>

      <svg
        ref={svg}
        className={s.mapSvg}
        viewBox="0 0 760 880"
        role="group"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Home"].includes(e.key)) {
            e.preventDefault();
          }
          if (e.key === "+" || e.key === "=") zoom(1.4);
          else if (e.key === "-") zoom(1 / 1.4);
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
          {REGION_SHAPES.map((shape, i) => {
            const bucket = bands[i]!;
            const d = byCode.get(shape.code);
            return (
              <path
                key={shape.code}
                d={shape.path}
                fill={`url(#${uid}-${bucket === null ? "missing" : `band-${bucket}`})`}
                fillRule="evenodd"
                stroke="var(--bo-ink-20)"
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
                className={s.area}
                onMouseEnter={() => setHover(shape.code)}
                onMouseLeave={() => setHover("")}
                onClick={() => {
                  if (!panMoved.current) onSelect(shape.code);
                }}
              >
                <title>{`${shape.name}: ${d?.display ?? "no data"}`}</title>
              </path>
            );
          })}

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
                stroke="var(--bo-ink)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          {/* Names sit on a paper tag at a fixed reading size, not in the map's shrunk coordinates. */}
          {REGION_SHAPES.map((shape) => {
            const [lx, ly] = LABEL_AT[shape.code] ?? shape.label;
            const lines = LABEL_LINES[shape.code] ?? [shape.name];
            return (
              <g key={`label-${shape.code}`} transform={`translate(${lx} ${ly}) scale(${1 / view.z})`}>
                <RegionName lines={lines} fontSize={LABEL_PX} />
              </g>
            );
          })}
        </g>
      </svg>

      <MapLegend title={legendUnit} thresholds={thresholds} format={legendFormat} />
    </div>
  );
}

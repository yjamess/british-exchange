"use client";

/**
 * World-country choropleth — Natural Earth 110m paths, Housing map grammar
 * (halftone bands, paper name tags, ink selection). Missing countries stay
 * empty; valued partners get labels.
 */

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { BandScreenDefs } from "./BandScreen";
import { MapLegend } from "./MapLegend";
import { band, equalBreaks } from "./model";
import s from "./map.module.css";
import display from "./world-countries-display.json";

export type WorldCountryShape = {
  id: string;
  name: string;
  path: string;
  bounds: [number, number, number, number];
  label: [number, number];
};

export type WorldCountryDatum = { id: string; value: number | null; display: string };

export const WORLD_COUNTRY_SHAPES = display.shapes as WorldCountryShape[];

const VB_W = (display.viewBox as number[])[2] ?? 960;
const VB_H = (display.viewBox as number[])[3] ?? 480;
const HOME = { x: 0, y: 0, z: 1 };
const CX = VB_W / 2;
const CY = VB_H / 2;

/** Reading size on screen (CSS px under counter-scale). */
const LABEL_PX = 12;
const LABEL_VALUE_PX = 11;

/** Max labels on the idle map — denser than this becomes unreadable. */
const LABEL_CAP = 12;

/**
 * Centroids that land in the ocean / on a neighbour / across the dateline.
 * Keep the tag on the country people mean.
 */
const LABEL_AT: Record<string, [number, number]> = {
  RUS: [580, 70],
  USA: [200, 128],
  CAN: [220, 80],
  FRA: [478, 118],
  NOR: [510, 52],
  NLD: [493.5, 104.5],
  BEL: [488, 116],
  GBR: [470, 100],
  IRL: [456, 105],
  QAT: [622, 202],
  ARE: [622, 200],
  KWT: [608, 185],
  BHR: [612, 192],
  OMN: [630, 215],
  SAU: [600, 200],
  DZA: [480, 175],
  LBY: [520, 175],
  EGY: [555, 185],
  NGA: [505, 248],
  AGO: [512, 290],
  COD: [530, 265],
  COG: [518, 260],
  IDN: [740, 265],
  AUS: [800, 320],
  CHN: [720, 155],
  IND: [665, 200],
  BRA: [320, 280],
  VEN: [300, 230],
  COL: [285, 240],
  MEX: [195, 175],
  PER: [275, 280],
  TTO: [305, 230],
  ESP: [465, 140],
  PRT: [448, 145],
  ITA: [510, 140],
  DEU: [505, 110],
  POL: [530, 105],
  TUR: [565, 145],
  IRN: [600, 165],
  IRQ: [585, 170],
  KAZ: [640, 110],
  AZE: [590, 140],
};

/** Sentence-case short names for the paper tags. */
const SHORT_NAME: Record<string, string> = {
  USA: "United States",
  RUS: "Russia",
  GBR: "United Kingdom",
  ARE: "UAE",
  COD: "DR Congo",
  COG: "Congo",
  DOM: "Dominican Rep.",
  PNG: "Papua N.G.",
  TTO: "Trinidad & Tobago",
  BIH: "Bosnia",
  CZE: "Czechia",
  SVK: "Slovakia",
  GNQ: "Eq. Guinea",
  KOR: "South Korea",
  IRN: "Iran",
  VEN: "Venezuela",
  TWN: "Taiwan",
};

function shortName(shape: WorldCountryShape): string {
  return SHORT_NAME[shape.id] ?? shape.name;
}

function unionBounds(shapes: WorldCountryShape[]): [number, number, number, number] | null {
  if (!shapes.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const sh of shapes) {
    const [a, b, c, d] = sh.bounds;
    // Skip pathological wrap (Russia spans the full frame).
    if (c - a > VB_W * 0.85) continue;
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, c);
    y1 = Math.max(y1, d);
  }
  if (!Number.isFinite(x0) || x1 <= x0) return null;
  // Pad so labels have room.
  const padX = Math.max(28, (x1 - x0) * 0.12);
  const padY = Math.max(24, (y1 - y0) * 0.14);
  return [
    Math.max(0, x0 - padX),
    Math.max(0, y0 - padY),
    Math.min(VB_W, x1 + padX),
    Math.min(VB_H, y1 + padY),
  ];
}

function viewForBounds(
  bounds: [number, number, number, number],
  { maxZ = 4.5, fill = 0.78 }: { maxZ?: number; fill?: number } = {},
): typeof HOME {
  const [x0, y0, x1, y1] = bounds;
  const w = Math.max(40, x1 - x0);
  const h = Math.max(30, y1 - y0);
  const z = Math.min(maxZ, Math.max(1, Math.min((VB_W * fill) / w, (VB_H * fill) / h)));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { x: CX - cx * z, y: CY - cy * z, z };
}

/** Focus box for selection — overseas fragments (FRA) and dateline wraps (RUS) spoil raw bounds. */
function focusBounds(shape: WorldCountryShape): [number, number, number, number] {
  const [x0, y0, x1, y1] = shape.bounds;
  const wide = x1 - x0 > VB_W * 0.45 || y1 - y0 > VB_H * 0.45;
  if (!wide) return shape.bounds;
  const [lx, ly] = LABEL_AT[shape.id] ?? shape.label;
  const rw = Math.min(90, Math.max(48, (x1 - x0) * 0.08));
  const rh = Math.min(70, Math.max(36, (y1 - y0) * 0.08));
  return [
    Math.max(0, lx - rw),
    Math.max(0, ly - rh),
    Math.min(VB_W, lx + rw),
    Math.min(VB_H, ly + rh),
  ];
}

function CountryTag({
  name,
  value,
  fontSize,
  valueSize,
  emphasis,
}: {
  name: string;
  value?: string;
  fontSize: number;
  valueSize: number;
  emphasis?: boolean;
}) {
  const lines = value ? [name, value] : [name];
  const lineHeight = fontSize * 1.15;
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const tagW = longest * fontSize * 0.56 + (value ? 18 : 14);
  const tagH = lines.length * lineHeight + (value ? 12 : 10);
  return (
    <g pointerEvents="none">
      <rect
        x={-tagW / 2}
        y={-tagH / 2}
        width={tagW}
        height={tagH}
        rx={0}
        fill="var(--bo-paper)"
        stroke={emphasis ? "var(--bo-ink)" : "var(--bo-ink-20)"}
        strokeWidth={emphasis ? 1.25 : 1}
      />
      <text
        x={0}
        y={value ? -lineHeight * 0.35 + fontSize * 0.35 : fontSize * 0.35}
        textAnchor="middle"
        fill="var(--bo-ink)"
        className={s.regionLabel}
        style={{ fontSize }}
      >
        {name}
      </text>
      {value ? (
        <text
          x={0}
          y={lineHeight * 0.55 + valueSize * 0.35}
          textAnchor="middle"
          fill="var(--bo-ink)"
          className={s.worldValueLabel}
          style={{ fontSize: valueSize }}
        >
          {value}
        </text>
      ) : null}
    </g>
  );
}

export function WorldChoropleth({
  data,
  selected,
  onSelect,
  label,
  legendFormat,
  legendUnit,
  size = "stage",
}: {
  data: WorldCountryDatum[];
  selected: string | null;
  onSelect: (id: string) => void;
  label: string;
  legendFormat: (v: number) => string;
  legendUnit?: string;
  size?: "panel" | "stage";
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState(HOME);
  const [hover, setHover] = useState("");
  const drag = useRef<{ x: number; y: number; origin: typeof HOME; moved: boolean } | null>(null);
  const panMoved = useRef(false);

  const byId = useMemo(() => new Map(data.map((d) => [d.id, d])), [data]);
  const valuedShapes = useMemo(
    () =>
      WORLD_COUNTRY_SHAPES.filter((sh) => {
        const d = byId.get(sh.id);
        return d != null && d.value != null && Number.isFinite(d.value);
      }),
    [byId],
  );

  const dataHome = useMemo(() => {
    const bounds = unionBounds(valuedShapes);
    return bounds ? viewForBounds(bounds, { maxZ: 2.4, fill: 0.86 }) : HOME;
  }, [valuedShapes]);

  const thresholds = useMemo(
    () => equalBreaks(data.map((d) => d.value).filter((v): v is number => v != null && Number.isFinite(v))),
    [data],
  );
  const bands = useMemo(
    () => WORLD_COUNTRY_SHAPES.map((sh) => band(byId.get(sh.id)?.value ?? null, thresholds)),
    [byId, thresholds],
  );

  const labelIds = useMemo(() => {
    const ranked = [...valuedShapes].sort(
      (a, b) => Math.abs(byId.get(b.id)!.value!) - Math.abs(byId.get(a.id)!.value!),
    );
    const ids = new Set(ranked.slice(0, LABEL_CAP).map((sh) => sh.id));
    if (selected) ids.add(selected);
    if (hover) ids.add(hover);
    return ids;
  }, [valuedShapes, byId, selected, hover]);

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  const zoom = (factor: number) =>
    setView((v) => {
      const z = Math.min(10, Math.max(1, v.z * factor));
      if (z <= 1.02) return dataHome;
      return { x: CX - ((CX - v.x) * z) / v.z, y: CY - ((CY - v.y) * z) / v.z, z };
    });

  // Frame valued partners on first paint / data change; zoom to selection.
  useEffect(() => {
    if (!selected) {
      setView(dataHome);
      return;
    }
    const shape = WORLD_COUNTRY_SHAPES.find((sh) => sh.id === selected);
    if (!shape) {
      setView(dataHome);
      return;
    }
    setView(viewForBounds(focusBounds(shape), { maxZ: 5.5, fill: 0.55 }));
  }, [selected, dataHome]);

  const hoverShape = hover ? WORLD_COUNTRY_SHAPES.find((sh) => sh.id === hover) : undefined;
  const selectShape = selected ? WORLD_COUNTRY_SHAPES.find((sh) => sh.id === selected) : undefined;
  const hoverData = hover ? byId.get(hover) : undefined;
  const selectData = selectShape ? byId.get(selectShape.id) : undefined;

  const captionPrimary = hoverShape
    ? shortName(hoverShape)
    : selectShape
      ? shortName(selectShape)
      : valuedShapes.length
        ? `${valuedShapes.length} partner countr${valuedShapes.length === 1 ? "y" : "ies"}`
        : "Select a country";
  const captionSecondary = hoverShape
    ? (hoverData?.display ?? "no data")
    : selectShape
      ? (selectData?.display ?? "selected")
      : "Click a filled country · drag to pan · scroll tools to zoom";

  return (
    <div
      className={`${s.mapSurfaceRegion} ${s.mapSurfaceWorld} ${size === "stage" ? s.mapSurfaceStage : ""}`}
    >
      <div className={s.mapCaption}>
        <span className={s.worldCaptionPrimary}>{captionPrimary}</span>
        <span className={s.worldCaptionSecondary}>{captionSecondary}</span>
      </div>

      <div className={s.mapTools} role="group" aria-label="Map controls">
        <button type="button" className={s.toolBtn} onClick={() => zoom(1.35)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className={s.toolBtn} onClick={() => zoom(1 / 1.35)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={s.toolBtn} onClick={() => setView(dataHome)} aria-label="Reset view">
          ⌂
        </button>
      </div>

      <svg
        ref={svg}
        className={`${s.mapSvg} ${s.worldSvg}`}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Home"].includes(e.key)) {
            e.preventDefault();
          }
          if (e.key === "+" || e.key === "=") zoom(1.35);
          else if (e.key === "-") zoom(1 / 1.35);
          else if (e.key === "Home") setView(dataHome);
          else if (e.key.startsWith("Arrow"))
            setView((v) => ({
              ...v,
              x: v.x + (e.key === "ArrowLeft" ? 36 : e.key === "ArrowRight" ? -36 : 0),
              y: v.y + (e.key === "ArrowUp" ? 36 : e.key === "ArrowDown" ? -36 : 0),
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
        <rect x={0} y={0} width={VB_W} height={VB_H} fill="var(--bo-paper)" />
        <BandScreenDefs idPrefix={uid} zoom={view.z} />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
          {WORLD_COUNTRY_SHAPES.map((shape, i) => {
            const bucket = bands[i]!;
            const d = byId.get(shape.id);
            const hasData = d != null && d.value != null;
            return (
              <path
                key={shape.id}
                d={shape.path}
                fill={`url(#${uid}-${bucket === null ? "missing" : `band-${bucket}`})`}
                fillRule="evenodd"
                stroke={hasData ? "var(--bo-ink-40)" : "var(--bo-ink-20)"}
                strokeWidth={hasData ? 0.55 : 0.35}
                vectorEffect="non-scaling-stroke"
                className={hasData ? s.area : undefined}
                style={hasData ? undefined : { cursor: "default", pointerEvents: "none" }}
                onMouseEnter={() => {
                  if (hasData) setHover(shape.id);
                }}
                onMouseLeave={() => setHover("")}
                onClick={() => {
                  if (!panMoved.current && hasData) onSelect(shape.id);
                }}
              >
                <title>{`${shortName(shape)}: ${d?.display ?? "no data"}`}</title>
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

          {[...labelIds].map((id) => {
            const shape = WORLD_COUNTRY_SHAPES.find((sh) => sh.id === id);
            if (!shape) return null;
            const d = byId.get(id);
            const [lx, ly] = LABEL_AT[id] ?? shape.label;
            const emphasis = id === selected || id === hover;
            const showValue = emphasis && d?.value != null;
            return (
              <g key={`label-${id}`} transform={`translate(${lx} ${ly}) scale(${1 / view.z})`}>
                <CountryTag
                  name={shortName(shape)}
                  value={showValue ? legendFormat(d!.value!) : undefined}
                  fontSize={LABEL_PX}
                  valueSize={LABEL_VALUE_PX}
                  emphasis={emphasis}
                />
              </g>
            );
          })}
        </g>
      </svg>

      <MapLegend
        className={s.worldLegend}
        title={legendUnit}
        thresholds={thresholds}
        format={legendFormat}
      />
    </div>
  );
}

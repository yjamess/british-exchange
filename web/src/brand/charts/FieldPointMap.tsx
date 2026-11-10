"use client";

/**
 * NSTA UKCS field atlas — square marks on a North Sea extent with Britain’s coast for place.
 * Housing / Station atlas grammar: drag to pan, +/−/Home, Find selected.
 * Marks default to status groups (producing / ceased / other). A caller may pass its own
 * groups (e.g. what the records say about each field in one year) and a measured size:
 * square area ∝ a published value on one fixed scale.
 * One ink: groups are told apart by print (solid, stipple, hatch, cross, open), never by colour.
 */

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  fieldStatusGroup,
  fieldStatusLabel,
  type FieldPoint,
  type FieldStatusGroup,
} from "../energy/fossils-model";
import { MAP_HEIGHT, MAP_WIDTH, stationPosition } from "../energy/station-model";
import s from "./station-map.module.css";

export type FieldPrint = "solid" | "stipple" | "hatch" | "cross" | "open";
export type FieldMapGroup = { id: string; label: string; print: FieldPrint };

const INK = "var(--bo-ink)";

const STATUS_PRINT: Record<FieldStatusGroup, FieldPrint> = {
  producing: "solid",
  ceased: "hatch",
  other: "stipple",
};

const STATUS_GROUPS: FieldMapGroup[] = (["producing", "ceased", "other"] as FieldStatusGroup[]).map((g) => ({
  id: g,
  label: fieldStatusLabel(g),
  print: STATUS_PRINT[g],
}));

/** Key swatch for a print: the same screen as the mark, in the one ink. */
function swatchStyle(print: FieldPrint) {
  const hatch = (deg: number, last: boolean) =>
    `repeating-linear-gradient(${deg}deg, ${INK} 0 1px, ${last ? "var(--bo-paper)" : "transparent"} 1px 3px)`;
  switch (print) {
    case "solid":
      return { background: INK, borderColor: INK };
    case "stipple":
      return {
        background: `var(--bo-paper) radial-gradient(circle, ${INK} 0.8px, transparent 1.1px) 0 0 / 3px 3px`,
        borderColor: INK,
      };
    case "hatch":
      return { background: hatch(45, true), borderColor: INK };
    case "cross":
      return { background: `${hatch(45, false)}, ${hatch(-45, true)}`, borderColor: INK };
    case "open":
      return { background: "var(--bo-paper)", borderColor: INK, borderStyle: "dashed" as const };
  }
}

const HALF = 2.4;
const HALF_MIN = 0.9;
const HALF_MAX = 5.2;
const CX = MAP_WIDTH / 2;
const CY = MAP_HEIGHT / 2;
const HOME = { x: 0, y: 0, z: 1 };
const MAX_Z = 14;
const SCREEN = { pitch: 3.2, r: 0.85 };
/** Below this half-side in screen px a screen cannot read; the mark prints solid. */
const SOLID_BELOW = 3.2;
/** Fixed corner locator — Britain stays readable when the main view is out at sea. */
const LOCATOR = { x: 10, y: MAP_HEIGHT - 178, w: 128, h: 156, pad: 10 };
/** Show the corner map once the coast has left the frame. */
const LOCATOR_AFTER_Z = 1.35;

function isMapped(p: FieldPoint): boolean {
  return (
    Number.isFinite(p.lon) &&
    Number.isFinite(p.lat) &&
    p.lon >= -8.8 &&
    p.lon <= 4 &&
    p.lat >= 49.5 &&
    p.lat <= 62
  );
}

function coord(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
}

/** Plain-language shelf place from lat/lon — enough to read “outside the UK”. */
function shelfPlace(lat: number, lon: number): string {
  if (lon < -5.5 && lat >= 58) return "West of Shetland";
  if (lat >= 59 && lon >= -4) return "Northern North Sea";
  if (lat >= 55 && lon >= -2) return "Central North Sea";
  if (lat < 55 && lon > 0) return "Southern North Sea";
  if (lon < -3 && lat < 56) return "Irish Sea";
  return "UK Continental Shelf";
}

export function FieldPointMap({
  points,
  label,
  selectedId,
  onSelect,
  outline,
  groups: groupDefs = STATUS_GROUPS,
  groupOf = (p) => fieldStatusGroup(p.status),
  sizeOf,
  sizeLabel,
  describe,
}: {
  points: FieldPoint[];
  label: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** GB land path in map coordinates — same outline as the station atlas. */
  outline?: string;
  groups?: FieldMapGroup[];
  groupOf?: (p: FieldPoint) => string;
  /** 0–1 share of the fixed maximum; null = no value (small open mark). */
  sizeOf?: (p: FieldPoint) => number | null;
  sizeLabel?: string;
  describe?: (p: FieldPoint) => string;
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState(HOME);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; origin: typeof HOME; moved: boolean } | null>(null);

  const drawn = useMemo(() => points.filter(isMapped), [points]);
  const byId = useMemo(() => new Map(drawn.map((p) => [p.id, p])), [drawn]);
  const groups = groupDefs.filter((g) => drawn.some((p) => groupOf(p) === g.id));
  const fillOf = new Map(groupDefs.map((g) => [g.id, g]));
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const hovered = hoverId ? byId.get(hoverId) : undefined;

  const zoom = (factor: number) =>
    setView((v) => {
      const z = Math.min(MAX_Z, Math.max(1, v.z * factor));
      return z === 1 ? HOME : { x: CX - ((CX - v.x) * z) / v.z, y: CY - ((CY - v.y) * z) / v.z, z };
    });

  const focusField = (p: FieldPoint, z = 6) => {
    const [px, py] = stationPosition(p.lon, p.lat);
    const next = Math.min(MAX_Z, Math.max(4, z));
    setView({ x: CX - px * next, y: CY - py * next, z: next });
  };

  useEffect(() => {
    if (!selectedId) return;
    const p = byId.get(selectedId);
    if (!p) return;
    focusField(p);
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

  const [plotWidth, setPlotWidth] = useState(MAP_WIDTH * 2);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setPlotWidth(e.contentRect.width || MAP_WIDTH * 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const unit = MAP_WIDTH / plotWidth / view.z;
  const locatorScale = (LOCATOR.w - LOCATOR.pad * 2) / MAP_WIDTH;
  const viewBox = {
    x: -view.x / view.z,
    y: -view.y / view.z,
    w: MAP_WIDTH / view.z,
    h: MAP_HEIGHT / view.z,
  };

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  const showLocator = Boolean(outline) && view.z >= LOCATOR_AFTER_Z;
  const focus = hovered ?? selected;
  const caption = hovered
    ? describe
      ? describe(hovered)
      : `${hovered.name} · ${hovered.status}${hovered.fieldType ? ` · ${hovered.fieldType}` : ""}`
    : selected
      ? `${selected.name} · selected`
      : null;
  const placeLine = focus ? shelfPlace(focus.lat, focus.lon) : null;

  return (
    <div className={s.wrap}>
      <div className={s.surface}>
        {caption && (
          <div className={s.caption}>
            <span>{caption}</span>
            {placeLine ? <span>{placeLine}</span> : null}
          </div>
        )}

        <div className={`${s.tools} ${s.toolsBottom}`} role="group" aria-label="Map controls">
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
            onClick={() => selected && focusField(selected, 7)}
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
          aria-label={`${label}. Drag to pan, plus and minus to zoom, Home to reset, Find to centre the selected field.`}
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
            drag.current = null;
            if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onPointerLeave={() => setHoverId(null)}
        >
          <defs>
            {groups
              .filter((g) => g.print === "stipple" || g.print === "hatch" || g.print === "cross")
              .map((g) => (
                <pattern
                  key={g.id}
                  id={`${uid}-screen-${g.id}`}
                  width={SCREEN.pitch}
                  height={SCREEN.pitch}
                  patternUnits="userSpaceOnUse"
                  patternTransform={`scale(${unit}) rotate(45)`}
                >
                  {g.print === "stipple" ? (
                    <circle cx={SCREEN.pitch / 2} cy={SCREEN.pitch / 2} r={SCREEN.r} fill={INK} />
                  ) : (
                    <>
                      <line x1={SCREEN.pitch / 2} y1={0} x2={SCREEN.pitch / 2} y2={SCREEN.pitch} stroke={INK} strokeWidth={0.9} />
                      {g.print === "cross" ? (
                        <line x1={0} y1={SCREEN.pitch / 2} x2={SCREEN.pitch} y2={SCREEN.pitch / 2} stroke={INK} strokeWidth={0.9} />
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
              const group = fillOf.get(groupOf(p)) ?? STATUS_GROUPS[2]!;
              const share = sizeOf ? sizeOf(p) : undefined;
              const half =
                share === undefined
                  ? HALF
                  : share == null
                    ? HALF_MIN
                    : Math.max(HALF_MIN, HALF_MAX * Math.sqrt(Math.min(1, Math.max(0, share))));
              const hit = Math.max(half + 2.5 / view.z, 3.5 / view.z);
              const active = selectedId === p.id;
              const open = group.print === "open";
              const solid = !open && (group.print === "solid" || half / unit < SOLID_BELOW);
              const print = open ? "open" : solid ? "solid" : "screen";
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
                  <rect
                    x={-hit}
                    y={-hit}
                    width={hit * 2}
                    height={hit * 2}
                    fill="transparent"
                    stroke="none"
                  />
                  <rect
                    className={s.mark}
                    data-print={print}
                    x={-half}
                    y={-half}
                    width={half * 2}
                    height={half * 2}
                    fill={
                      open
                        ? "var(--bo-paper)"
                        : solid
                          ? INK
                          : `url(#${uid}-screen-${group.id})`
                    }
                    stroke={INK}
                    strokeDasharray={open ? `${1.2 / view.z} ${1.2 / view.z}` : undefined}
                  />
                  {active && (
                    <rect
                      x={-half - 1.5}
                      y={-half - 1.5}
                      width={(half + 1.5) * 2}
                      height={(half + 1.5) * 2}
                      fill="none"
                      stroke="var(--bo-ink)"
                      strokeWidth={1.2 / view.z}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Locator: Britain + current view — fixed on the sheet so offshore zooms keep place. */}
          {showLocator ? (
            <g className={s.locator} aria-hidden="true" pointerEvents="none">
              <defs>
                <clipPath id={`${uid}-locator-clip`}>
                  <rect
                    x={LOCATOR.x + LOCATOR.pad}
                    y={LOCATOR.y + LOCATOR.pad}
                    width={LOCATOR.w - LOCATOR.pad * 2}
                    height={LOCATOR.h - LOCATOR.pad * 2}
                  />
                </clipPath>
              </defs>
              <rect
                className={s.locatorPlate}
                x={LOCATOR.x}
                y={LOCATOR.y}
                width={LOCATOR.w}
                height={LOCATOR.h}
              />
              <g clipPath={`url(#${uid}-locator-clip)`}>
                <rect
                  className={s.locatorSea}
                  x={LOCATOR.x + LOCATOR.pad}
                  y={LOCATOR.y + LOCATOR.pad}
                  width={LOCATOR.w - LOCATOR.pad * 2}
                  height={LOCATOR.h - LOCATOR.pad * 2}
                />
                <g
                  transform={`translate(${LOCATOR.x + LOCATOR.pad} ${LOCATOR.y + LOCATOR.pad}) scale(${locatorScale})`}
                >
                  <path d={outline} className={s.locatorLand} />
                  <rect
                    className={s.locatorView}
                    x={viewBox.x}
                    y={viewBox.y}
                    width={viewBox.w}
                    height={viewBox.h}
                  />
                  {selected
                    ? (() => {
                        const [px, py] = stationPosition(selected.lon, selected.lat);
                        const side = 12 / locatorScale;
                        return (
                          <rect
                            className={s.locatorMark}
                            x={px - side / 2}
                            y={py - side / 2}
                            width={side}
                            height={side}
                          />
                        );
                      })()
                    : null}
                </g>
              </g>
              <text
                className={s.locatorLabel}
                x={LOCATOR.x + LOCATOR.pad}
                y={LOCATOR.y + LOCATOR.h - 7}
              >
                Britain
              </text>
            </g>
          ) : null}
        </svg>
      </div>

      <ul className={s.key} aria-label="What the squares mean">
        {groups.map((g) => (
          <li key={g.id} className={s.keyItem}>
            <span
              className={s.swatch}
              style={swatchStyle(g.print)}
              aria-hidden="true"
            />
            {g.label}
          </li>
        ))}
        {sizeLabel && <li className={s.keyItem}>{sizeLabel}</li>}
        {showLocator ? <li className={s.keyItem}>Corner map · Britain · where you are looking</li> : null}
        {(hovered || selected) && (
          <li className={s.keyItem} aria-hidden="true">
            {coord((hovered ?? selected)!.lat, (hovered ?? selected)!.lon)}
          </li>
        )}
      </ul>
    </div>
  );
}

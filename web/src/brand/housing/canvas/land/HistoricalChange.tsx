"use client";

/**
 * Domain 06 — Historical change.
 * England Green Belt area at each 31 March (hectares) plus landmark-year
 * published boundaries. Designation snapshots — not a continuous rewound map.
 * Zoom and place search inspect the plate; hectares stay on the line chart.
 */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { EmptyStage, explorerClasses as t, formatSource } from "../../..";
import { fetchPackJson } from "@/lib/api";
import { fmt, fmtT, type Pt } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import gen from "../../../energy/generation.module.css";
import s from "./landExplorer.module.css";

type Enc = { type: "MultiPolygon"; c: [number, number][][][] };
type Bbox = [number, number, number, number];
type Plate = {
  year: string;
  label: string;
  boundary: Enc;
  bbox: Bbox;
  /** England extent — every year is drawn in this one frame so years compare. */
  frame?: Bbox | null;
  england?: Enc | null;
  source: { publisher: string; layer: string; landing: string; licence: string };
  notes: string[];
};
type HistoryIndex = {
  years: { year: string; label: string; pack_id: string }[];
};

type Cam = { x: number; y: number; w: number; h: number };

const MAP_W = 720;
const MAX_Z = 8;
const FOCUS_Z = 4.5;

/** Narrow million-hectare scales need two decimals — one rounds every tick to “1.6m”. */
function axisHa(v: number): string {
  return `${(v / 1_000_000).toFixed(2)}m`;
}

export const GB_HISTORY_YEARS = ["2010-11", "2019-20", "2020-21", "2021-22", "2023-24", "2024-25"] as const;
export type GbHistoryYear = (typeof GB_HISTORY_YEARS)[number];

/** Each published boundary is the Green Belt at 31 March at the end of its statistical year. */
export function gbYearLabel(year: string): string {
  const end = year.includes("-") ? `20${year.slice(-2)}` : year;
  return `31 March ${end}`;
}

/**
 * Cities each Green Belt was drawn around (city-centre coordinates). They name the
 * shapes on the map; they are not part of the published boundary.
 */
/** `minor` marks drop on phone widths, where labels are enlarged and would collide. */
const PLACES: { name: string; lon: number; lat: number; anchor?: "start" | "end"; minor?: boolean }[] = [
  { name: "London", lon: -0.128, lat: 51.507 },
  { name: "Birmingham", lon: -1.89, lat: 52.486 },
  { name: "Manchester", lon: -2.244, lat: 53.48 },
  { name: "Liverpool", lon: -2.983, lat: 53.408, anchor: "end" },
  { name: "Leeds", lon: -1.549, lat: 53.801 },
  { name: "Sheffield", lon: -1.47, lat: 53.381, minor: true },
  { name: "Nottingham", lon: -1.15, lat: 52.954 },
  { name: "Newcastle", lon: -1.618, lat: 54.978 },
  { name: "Bristol", lon: -2.588, lat: 51.455, anchor: "end" },
  { name: "Oxford", lon: -1.258, lat: 51.752, anchor: "end", minor: true },
  { name: "Cambridge", lon: 0.122, lat: 52.205, minor: true },
  { name: "York", lon: -1.082, lat: 53.96, minor: true },
  { name: "Stoke-on-Trent", lon: -2.18, lat: 53.003, anchor: "end", minor: true },
  { name: "Bournemouth", lon: -1.88, lat: 50.72, minor: true },
];

/** Names offered in the Historical change place search. */
export const GB_HISTORY_PLACE_NAMES = PLACES.map((p) => p.name);

export function historyFoot(
  greenBelt: Pt[],
  year: string,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const first = greenBelt[0];
  const latest = greenBelt.at(-1);
  const change = first && latest ? latest.v - first.v : null;
  const firstYear = first ? fmtT(first.t, "annual") : null;
  const latestYear = latest ? fmtT(latest.t, "annual") : null;
  return {
    definition:
      "Green Belt is land around large towns and cities where new building is tightly restricted, to stop them spreading into the countryside and into each other. Councils set its boundary in their local plans. The line is England’s total Green Belt at each 31 March, in hectares. The map shows where it lay on the chosen date.",
    method: [
      "Dashed joins bridge years the publisher did not issue (for example 2013, and sparse early releases). They are not estimates.",
      `The map is the published boundary at ${gbYearLabel(year)}, merged across councils and simplified for the screen. Read areas from the line, not the map.`,
      "Only the dates in the Boundary menu have a published national boundary file. Years between them are not drawn.",
      "City names mark the places each Green Belt surrounds. They are not part of the boundary file.",
      "Zoom and search centre a city for inspection; they do not change the national hectare total on the line.",
      "Green Belt restricts building; it does not ban it. Land Explorer shows today’s boundary for one council.",
      first && latest && change != null
        ? `${firstYear}: ${fmt.count(first.v)} ha. ${latestYear}: ${fmt.count(latest.v)} ha. The designated area is ${fmt.count(Math.abs(change))} ha ${change >= 0 ? "larger" : "smaller"} than in ${firstYear}.`
        : "",
    ].filter(Boolean),
    source: formatSource(
      "MHCLG",
      "Green Belt statistics",
      "Green Belt boundaries",
      "Boundaries: ONS England",
      "England",
      "31 March",
    ),
    dataHref: "/data#green-belt-area",
  };
}

type Projector = { to: (lon: number, lat: number) => [number, number]; height: number };

/** Equirectangular at the frame's mid-latitude — enough for an England-wide outline. */
function projector(bbox: Bbox, width = MAP_W, pad = 12): Projector {
  const [minx, miny, maxx, maxy] = bbox;
  const cos = Math.cos((((miny + maxy) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxx - minx) * cos, 1e-6);
  const spanY = Math.max(maxy - miny, 1e-6);
  const k = (width - pad * 2) / spanX;
  const height = Math.round(spanY * k + pad * 2);
  return {
    to: (lon, lat) => [pad + (lon - minx) * cos * k, pad + (maxy - lat) * k],
    height,
  };
}

function pathOf(shape: Enc, p: Projector): string {
  const parts: string[] = [];
  for (const poly of shape.c) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      parts.push(
        `M${ring
          .map(([lon, lat]) => {
            const [x, y] = p.to(lon, lat);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join("L")}Z`,
      );
    }
  }
  return parts.join("");
}

function homeCam(height: number): Cam {
  return { x: 0, y: 0, w: MAP_W, h: height };
}

/** Keep the viewBox over the England plate; allow a little slack when zoomed. */
function clampCam(c: Cam, height: number): Cam {
  const minW = MAP_W / MAX_Z;
  const aspect = height / MAP_W;
  const w = Math.min(MAP_W, Math.max(minW, c.w));
  const h = w * aspect;
  const slack = w * 0.15;
  const x = Math.min(MAP_W - w + slack, Math.max(-slack, c.x));
  const y = Math.min(height - h + slack, Math.max(-slack, c.y));
  return { x, y, w, h };
}

function camAround(px: number, py: number, z: number, height: number): Cam {
  const zoom = Math.min(MAX_Z, Math.max(1, z));
  const w = MAP_W / zoom;
  const h = height / zoom;
  return clampCam({ x: px - w / 2, y: py - h / 2, w, h }, height);
}

export function HistoricalChange({
  greenBelt,
  year,
  focusPlace = null,
  onFocusPlace,
}: {
  greenBelt: Pt[];
  year: string;
  /** City name from the control row search — centres the map. */
  focusPlace?: string | null;
  onFocusPlace?: (name: string | null) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; origin: Cam; moved: boolean } | null>(null);
  /** Survives pointerup so a pan does not also fire a city click. */
  const didPan = useRef(false);
  const first = greenBelt[0];
  const latest = greenBelt.at(-1);
  const [plate, setPlate] = useState<Plate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cam, setCam] = useState<Cam | null>(null);
  const [activePlace, setActivePlace] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const packId = `housing.green-belt-history-${year}`;
    void fetchPackJson<Plate>(packId)
      .then((next) => {
        if (!cancelled) {
          setPlate(next);
          setCam(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPlate(null);
          setError(err instanceof Error ? err.message : "Plate unavailable");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const drawn = useMemo(() => {
    if (!plate?.boundary || plate.boundary.type !== "MultiPolygon") return null;
    const p = projector(plate.frame ?? plate.bbox);
    const [minx, miny, maxx, maxy] = plate.frame ?? plate.bbox;
    return {
      height: p.height,
      belt: pathOf(plate.boundary, p),
      england: plate.england ? pathOf(plate.england, p) : null,
      places: PLACES.filter((pl) => pl.lon >= minx && pl.lon <= maxx && pl.lat >= miny && pl.lat <= maxy).map(
        (pl) => {
          const [x, y] = p.to(pl.lon, pl.lat);
          return { ...pl, x, y };
        },
      ),
    };
  }, [plate]);

  const view = cam && drawn ? clampCam(cam, drawn.height) : drawn ? homeCam(drawn.height) : null;

  // Search / URL focus: centre on that city when the name resolves on this plate.
  useEffect(() => {
    if (!drawn) return;
    if (!focusPlace) {
      setActivePlace(null);
      return;
    }
    const hit = drawn.places.find((pl) => pl.name.toLowerCase() === focusPlace.toLowerCase());
    if (!hit) return;
    setActivePlace(hit.name);
    setCam(camAround(hit.x, hit.y, FOCUS_Z, drawn.height));
  }, [focusPlace, drawn]);

  // Wheel zoom towards the pointer — non-passive so the page does not scroll instead.
  // See MDN: EventTarget.addEventListener options.passive.
  useEffect(() => {
    const el = svg.current;
    if (!el || !drawn) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
      const pt = el.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const local = pt.matrixTransform(el.getScreenCTM()!.inverse());
      setCam((prev) => {
        const c = prev ?? homeCam(drawn.height);
        const nextW = Math.min(MAP_W, Math.max(MAP_W / MAX_Z, c.w / factor));
        if (nextW === MAP_W) return homeCam(drawn.height);
        const rx = (local.x - c.x) / c.w;
        const ry = (local.y - c.y) / c.h;
        const nextH = nextW * (drawn.height / MAP_W);
        return clampCam({ x: local.x - rx * nextW, y: local.y - ry * nextH, w: nextW, h: nextH }, drawn.height);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [drawn]);

  const when = gbYearLabel(year);

  const zoomBy = (factor: number) => {
    if (!drawn) return;
    setCam((prev) => {
      const c = prev ?? homeCam(drawn.height);
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      const nextW = Math.min(MAP_W, Math.max(MAP_W / MAX_Z, c.w / factor));
      if (nextW === MAP_W) return homeCam(drawn.height);
      const nextH = nextW * (drawn.height / MAP_W);
      return clampCam({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH }, drawn.height);
    });
  };

  const focusCity = (name: string) => {
    if (!drawn) return;
    const hit = drawn.places.find((pl) => pl.name === name);
    if (!hit) return;
    setActivePlace(hit.name);
    setCam(camAround(hit.x, hit.y, FOCUS_Z, drawn.height));
    onFocusPlace?.(hit.name);
  };

  const resetView = () => {
    if (!drawn) return;
    setCam(homeCam(drawn.height));
    setActivePlace(null);
    onFocusPlace?.(null);
  };

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const p = svg.current!.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  if (!first || !latest) {
    return (
      <EmptyStage label="In preparation">
        The Green Belt area series is not loaded yet. No past boundary is drawn from today’s polygon.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          Green Belt area · England · hectares at 31 March
        </h3>
        <TimeChart
          series={[{ id: "green-belt", label: "Green Belt", points: greenBelt }]}
          cadence="annual"
          gaps="dashed"
          format={(v) => `${fmt.count(v)} ha`}
          axisFormat={axisHa}
          height={320}
          label="England Green Belt area, hectares at 31 March"
        />
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Where the Green Belt is · England · {when}</h3>
        {loading ? (
          <EmptyStage label="Loading">Drawing the Green Belt at {when}…</EmptyStage>
        ) : error || !drawn || !plate || !view ? (
          <EmptyStage label="Map unavailable">
            The boundary for {when} could not be loaded. The area line above still stands.
          </EmptyStage>
        ) : (
          <figure className={s.gbFigure}>
            <div className={s.gbSurface}>
              {activePlace && (
                <div className={s.gbCaption}>
                  <span>{activePlace}</span>
                  <span>Green Belt around this city · {when}</span>
                </div>
              )}
              <div className={s.gbTools} role="group" aria-label="Map controls">
                <button type="button" className={s.gbToolBtn} onClick={() => zoomBy(1.5)} aria-label="Zoom in">
                  +
                </button>
                <button type="button" className={s.gbToolBtn} onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">
                  −
                </button>
                <button type="button" className={s.gbToolBtn} onClick={resetView} aria-label="Reset view">
                  ⌂
                </button>
              </div>
              <svg
                ref={svg}
                viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
                role="img"
                tabIndex={0}
                aria-label={`Map of England with the Green Belt at ${when}. Drag to pan, plus and minus to zoom, Home to reset. Search or click a city to centre.`}
                className={s.gbMap}
                onKeyDown={(e) => {
                  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Home"].includes(e.key)) {
                    e.preventDefault();
                  }
                  if (e.key === "+" || e.key === "=") zoomBy(1.5);
                  else if (e.key === "-") zoomBy(1 / 1.5);
                  else if (e.key === "Home") resetView();
                  else if (e.key.startsWith("Arrow")) {
                    const step = view.w * 0.08;
                    setCam(
                      clampCam(
                        {
                          ...view,
                          x: view.x + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
                          y: view.y + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0),
                        },
                        drawn.height,
                      ),
                    );
                  }
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  didPan.current = false;
                  const p = point(e);
                  drag.current = { x: p.x, y: p.y, origin: view, moved: false };
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const p = point(e);
                  const d = drag.current;
                  const dx = p.x - d.x;
                  const dy = p.y - d.y;
                  if (Math.hypot(dx, dy) > 4) {
                    d.moved = true;
                    didPan.current = true;
                    svg.current?.setPointerCapture(e.pointerId);
                  }
                  if (d.moved) {
                    setCam(clampCam({ ...d.origin, x: d.origin.x - dx, y: d.origin.y - dy }, drawn.height));
                  }
                }}
                onPointerUp={(e) => {
                  drag.current = null;
                  if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                <defs>
                  <pattern id={`${uid}-gb`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1.4" />
                  </pattern>
                </defs>
                {drawn.england && <path d={drawn.england} className={s.gbEngland} vectorEffect="nonScalingStroke" />}
                <path
                  d={drawn.belt}
                  fill={`url(#${uid}-gb)`}
                  fillRule="evenodd"
                  className={s.gbBelt}
                  vectorEffect="nonScalingStroke"
                />
                {drawn.places.map((pl) => {
                  const end = pl.anchor === "end";
                  const on = activePlace === pl.name;
                  return (
                    <g
                      key={pl.name}
                      className={s.gbPlace}
                      data-minor={pl.minor ? "true" : undefined}
                      data-active={on ? "true" : undefined}
                      role="button"
                      tabIndex={-1}
                      onClick={() => {
                        if (didPan.current) return;
                        focusCity(pl.name);
                      }}
                    >
                      <circle cx={pl.x} cy={pl.y} r={on ? 4.5 : 3} />
                      <text x={pl.x + (end ? -7 : 7)} y={pl.y + 4} textAnchor={end ? "end" : "start"}>
                        {pl.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <figcaption className={s.gbKey} aria-label="Map key">
              <span>
                {/* Pattern is defined here — url(#…) does not cross separate SVGs reliably. */}
                <svg className={s.swatch} viewBox="0 0 18 12" aria-hidden="true">
                  <defs>
                    <pattern id={`${uid}-gb-key`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1.4" />
                    </pattern>
                  </defs>
                  <rect x="0.5" y="0.5" width="17" height="11" fill={`url(#${uid}-gb-key)`} stroke="currentColor" />
                </svg>
                Green Belt at {when}
              </span>
              {drawn.england && (
                <span>
                  <svg className={s.swatch} viewBox="0 0 18 12" aria-hidden="true">
                    <rect x="0.5" y="0.5" width="17" height="11" fill="var(--bo-paper)" stroke="currentColor" />
                  </svg>
                  England
                </span>
              )}
              <span>
                <svg className={s.swatch} viewBox="0 0 18 12" aria-hidden="true">
                  <circle cx="9" cy="6" r="3" fill="currentColor" stroke="var(--bo-paper)" strokeWidth="1.5" />
                </svg>
                City the Green Belt surrounds · click or search to zoom
              </span>
            </figcaption>
          </figure>
        )}
      </section>
    </div>
  );
}

/** Prefetch index so the year menu can fall back if packs differ. */
export async function loadGbHistoryYears(): Promise<string[]> {
  try {
    const index = await fetchPackJson<HistoryIndex>("housing.green-belt-history-index");
    const years = index.years.map((y) => y.year);
    return years.length ? years : [...GB_HISTORY_YEARS];
  } catch {
    return [...GB_HISTORY_YEARS];
  }
}

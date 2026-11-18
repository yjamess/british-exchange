/**
 * InkMap runtime + style — MapLibre over PMTiles served by the Exchange API (`/tiles/*.pmtiles`,
 * disk in dev, Supabase Storage in deploy). One electric ink on paper:
 *
 * - land = paper; sea = engraved horizontal hairlines (print, not a tint)
 * - roads knocked out in paper (over fills) or faint ink hairlines (point maps)
 * - coast = ink 70 %; nation borders dashed ink
 * - place names in Geist Mono on paper tabs (ink hairline box), never over a screen
 *
 * Every colour is read from the brand tokens at runtime and mixed toward paper in JS
 * (MapLibre cannot parse `color-mix()`).
 */
import type * as MapLibre from "maplibre-gl";
import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { apiBase } from "@/lib/api";
import { TONE_STEPS } from "./model";

let runtime: Promise<typeof MapLibre> | null = null;
/**
 * Load MapLibre + the PMTiles protocol in the browser only (never during SSR).
 * The worker is copied to /public/vendor by `npm postinstall` — webpack hides MapLibre's own path.
 */
export function loadMapRuntime(): Promise<typeof MapLibre> {
  runtime ??= Promise.all([import("maplibre-gl"), import("pmtiles")]).then(([lib, pm]) => {
    lib.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
    lib.addProtocol("pmtiles", new pm.Protocol().tile);
    return lib;
  });
  return runtime;
}

export function tilesUrl(name: "boundaries" | "gb-basemap"): string {
  return `pmtiles://${apiBase().replace(/\/$/, "")}/tiles/${name}.pmtiles`;
}

export type Ink = { ink: string; paper: string; mix: (t: number) => string };

function hex(v: string, fallback: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(v.trim()) ?? /^#?([0-9a-f]{6})$/i.exec(fallback);
  const n = parseInt(m![1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Read the electric ink and paper from the nearest BrandRoot. */
export function readInk(el: HTMLElement): Ink {
  const cs = getComputedStyle(el);
  const a = hex(cs.getPropertyValue("--bo-electric") || "#0618f5", "#0618f5");
  const b = hex(cs.getPropertyValue("--bo-paper") || "#fdfdff", "#fdfdff");
  const mix = (t: number) => {
    const c = a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  };
  return { ink: mix(1), paper: mix(0), mix };
}

const PR = 2;

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.getContext("2d")!;
}

/** Not observed: paper with a hairline slash, never a faded fill. */
function slash(ink: string, paper: string): ImageData {
  const t = 6 * PR;
  const g = canvas(t);
  g.fillStyle = paper;
  g.fillRect(0, 0, t, t);
  g.strokeStyle = ink;
  g.lineWidth = PR * 0.75;
  for (const o of [-t, 0, t]) {
    g.beginPath();
    g.moveTo(o, t);
    g.lineTo(o + t, 0);
    g.stroke();
  }
  return g.getImageData(0, 0, t, t);
}

/** Sea: engraved horizontal hairlines (Admiralty chart). */
function engrave(ink: string, pitch = 4): ImageData {
  const size = pitch * PR * 2;
  const g = canvas(size);
  g.fillStyle = ink;
  for (let y = 0; y < size; y += pitch * PR) g.fillRect(0, y, size, PR * 0.5);
  return g.getImageData(0, 0, size, size);
}

/** Paper tab with an ink hairline — stretchable box behind place names. */
function tab(ink: string, paper: string): ImageData {
  const size = 12 * PR;
  const g = canvas(size);
  g.fillStyle = paper;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = ink;
  g.lineWidth = PR;
  g.strokeRect(PR / 2, PR / 2, size - PR, size - PR);
  return g.getImageData(0, 0, size, size);
}

export function addInkImages(map: MapLibre.Map, ink: Ink) {
  map.addImage("missing", slash(ink.mix(0.4), ink.paper), { pixelRatio: PR });
  map.addImage("sea", engrave(ink.mix(0.22)), { pixelRatio: PR });
  const e = 12 * PR;
  const inset = 3 * PR;
  map.addImage("tab", tab(ink.ink, ink.paper), {
    pixelRatio: PR,
    stretchX: [[inset, e - inset]],
    stretchY: [[inset, e - inset]],
    content: [inset, inset, e - inset, e - inset],
  });
}

/** Stepped solid tone per code; codes with no band print paper (the slash layer marks them). */
export function toneMatch(bands: Record<string, number | null>, ink: Ink, key = "code"): ExpressionSpecification {
  const pairs: string[] = [];
  for (const [code, b] of Object.entries(bands)) pairs.push(code, b == null ? ink.paper : ink.mix(TONE_STEPS[b]!));
  if (pairs.length === 0) return ["literal", ink.paper] as unknown as ExpressionSpecification;
  return ["match", ["get", key], ...pairs, ink.paper] as unknown as ExpressionSpecification;
}

export const MAP_FONT = "Geist Mono";

export type Roads = "knockout" | "hair";

/**
 * Basemap in one ink. Data layers go *before* `BEFORE_DATA` so roads, coast, borders and
 * names print over the fills.
 */
export const BEFORE_DATA = "rivers";

export function inkStyle(ink: Ink, roads: Roads): StyleSpecification {
  const road = roads === "knockout" ? ink.paper : ink.mix(0.16);
  return {
    version: 8,
    "font-faces": { [MAP_FONT]: "/map-fonts/GeistMono-Medium.ttf" },
    sources: {
      base: { type: "vector", url: tilesUrl("gb-basemap") },
      areas: { type: "vector", url: tilesUrl("boundaries"), promoteId: { lad: "code", rgn: "code", ctry: "code" } },
    },
    layers: [
      { id: "paper", type: "background", paint: { "background-color": ink.paper } },
      { id: "sea", type: "background", paint: { "background-pattern": "sea" } },
      { id: "land", source: "base", "source-layer": "earth", type: "fill", paint: { "fill-color": ink.paper } },
      {
        id: "lakes",
        source: "base",
        "source-layer": "water",
        type: "fill",
        filter: ["!=", ["get", "kind"], "ocean"],
        minzoom: 6,
        paint: { "fill-pattern": "sea" },
      },
      {
        id: BEFORE_DATA,
        source: "base",
        "source-layer": "water",
        type: "line",
        filter: ["in", ["get", "kind"], ["literal", ["river", "canal"]]],
        minzoom: 8,
        paint: { "line-color": ink.mix(0.35), "line-width": 0.6 },
      },
      {
        id: "roads-major",
        source: "base",
        "source-layer": "roads",
        type: "line",
        filter: ["in", ["get", "kind"], ["literal", ["highway", "major_road"]]],
        minzoom: 7,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": road, "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 10, 1.4, 13, 3] },
      },
      {
        id: "roads-minor",
        source: "base",
        "source-layer": "roads",
        type: "line",
        filter: ["==", ["get", "kind"], "minor_road"],
        minzoom: 10,
        paint: { "line-color": road, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 13, 1.2] },
      },
      {
        id: "coast",
        source: "base",
        "source-layer": "earth",
        type: "line",
        paint: { "line-color": ink.mix(0.7), "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 10, 0.9] },
      },
      {
        id: "nations",
        source: "areas",
        "source-layer": "ctry",
        type: "line",
        paint: { "line-color": ink.ink, "line-width": 0.8, "line-dasharray": [3, 2] },
      },
    ],
  };
}

/** Town and city names from the basemap, on paper tabs. UK only (ONS boundaries mask the rest). */
export function placeNames(ink: Ink, opts: { minRank?: number } = {}): LayerSpecification {
  return {
    id: "place-names",
    source: "base",
    "source-layer": "places",
    type: "symbol",
    filter: [
      "all",
      ["==", ["get", "kind"], "locality"],
      ["<=", ["get", "min_zoom"], ["zoom"]],
      ...(opts.minRank ? [[">=", ["coalesce", ["get", "population_rank"], 0], opts.minRank]] : []),
    ] as unknown as ExpressionSpecification,
    layout: {
      "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
      "text-font": [MAP_FONT],
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 8.5, 10, 10.5],
      "text-transform": "uppercase",
      "text-letter-spacing": 0.08,
      "symbol-sort-key": ["get", "min_zoom"],
      "text-padding": 14,
      "icon-image": "tab",
      "icon-text-fit": "both",
      "icon-text-fit-padding": [1, 4, 0, 4],
    } as LayerSpecification["layout"],
    paint: { "text-color": ink.ink },
  } as LayerSpecification;
}

/** Area names (regions / nations) from a GeoJSON point source of ONS internal points. */
export function areaNames(ink: Ink, source: string): LayerSpecification {
  return {
    id: `${source}-names`,
    source,
    type: "symbol",
    layout: {
      "text-field": ["get", "label"],
      "text-font": [MAP_FONT],
      "text-size": 11,
      "text-letter-spacing": 0.04,
      "text-line-height": 1.25,
      "text-allow-overlap": true,
      "icon-allow-overlap": true,
      "icon-image": "tab",
      "icon-text-fit": "both",
      "icon-text-fit-padding": [2, 5, 1, 5],
    } as LayerSpecification["layout"],
    paint: { "text-color": ink.ink },
  } as LayerSpecification;
}

export const UK_BOUNDS: [[number, number], [number, number]] = [
  [-8.2, 49.85],
  [1.9, 60.9],
];
export const ENGLAND_BOUNDS: [[number, number], [number, number]] = [
  [-5.8, 49.9],
  [1.8, 55.85],
];

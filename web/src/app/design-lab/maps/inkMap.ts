/**
 * Design lab — one-ink MapLibre style over a Protomaps (OpenStreetMap) PMTiles basemap.
 *
 * Every colour is read from the brand tokens at runtime and mixed toward paper in JS
 * (MapLibre cannot parse `color-mix()`). Choropleth fills are the same 45° dot screen
 * as `BandScreenDefs`, rasterised into MapLibre pattern images at a fixed screen pitch.
 */
import * as maplibregl from "maplibre-gl";
import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { Protocol } from "pmtiles";
import { BAND_CELL, BAND_RADII } from "@/brand/map";

let registered = false;
export function registerPmtiles() {
  if (registered) return;
  // Webpack hides the worker that MapLibre 6 resolves next to its own module; serve a copy.
  maplibregl.setWorkerUrl("/lab-tiles/maplibre-gl-worker.mjs");
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registered = true;
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
  const inkHex = cs.getPropertyValue("--bo-electric") || "#0618f5";
  const paperHex = cs.getPropertyValue("--bo-paper") || "#fdfdff";
  const a = hex(inkHex, "#0618f5");
  const b = hex(paperHex, "#fdfdff");
  const mix = (t: number) => {
    const c = a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  };
  return { ink: mix(1), paper: mix(0), mix };
}

const PR = 2; // pattern pixel ratio
/** 45° lattice with nearest-neighbour pitch BAND_CELL → axis-aligned repeat of cell·√2. */
const TILE = Math.round(BAND_CELL * Math.SQRT2 * PR);

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return [c, c.getContext("2d")!] as const;
}

function dotScreen(radius: number, ink: string): ImageData {
  const [, g] = canvas(TILE);
  g.fillStyle = ink;
  for (const [x, y] of [[0, 0], [TILE, 0], [0, TILE], [TILE, TILE], [TILE / 2, TILE / 2]] as const) {
    g.beginPath();
    g.arc(x, y, radius * PR, 0, Math.PI * 2);
    g.fill();
  }
  return g.getImageData(0, 0, TILE, TILE);
}

/** Not observed: a hairline slash, never a faded fill. */
function slash(ink: string): ImageData {
  const [, g] = canvas(TILE);
  g.strokeStyle = ink;
  g.lineWidth = PR * 0.75;
  for (const o of [-TILE, 0, TILE]) {
    g.beginPath();
    g.moveTo(o, TILE);
    g.lineTo(o + TILE, 0);
    g.stroke();
  }
  return g.getImageData(0, 0, TILE, TILE);
}

/** Sea: engraved horizontal hairlines (Admiralty chart), so water is print, not a tint. */
function engrave(ink: string, pitch = 4): ImageData {
  const size = pitch * PR * 2;
  const [, g] = canvas(size);
  g.fillStyle = ink;
  for (let y = 0; y < size; y += pitch * PR) g.fillRect(0, y, size, PR * 0.5);
  return g.getImageData(0, 0, size, size);
}

/** Lab fill treatments for choropleths. */
export type FillMode = "tone" | "fine" | "line" | "dots";
/** Seven stepped solid tones, paper → ink (WhoCanAfford precedent). Dark steps carry paper type. */
export const TONE_STEPS = [0.07, 0.15, 0.26, 0.4, 0.56, 0.75, 1] as const;
const FINE_CELL = 3.4;
const LINE_PITCH = 4;
export const LINE_WIDTHS = [0.35, 0.6, 0.9, 1.3, 1.8, 2.4, 3.3] as const;

function fineScreen(radius: number, ink: string): ImageData {
  const tile = Math.round(FINE_CELL * Math.SQRT2 * PR);
  const [, g] = canvas(tile);
  g.fillStyle = ink;
  for (const [x, y] of [[0, 0], [tile, 0], [0, tile], [tile, tile], [tile / 2, tile / 2]] as const) {
    g.beginPath();
    g.arc(x, y, radius * PR, 0, Math.PI * 2);
    g.fill();
  }
  return g.getImageData(0, 0, tile, tile);
}

/** 45° engraved rule: same pitch everywhere, weight carries the value. */
function lineScreen(width: number, ink: string): ImageData {
  const tile = Math.round(LINE_PITCH * Math.SQRT2 * PR);
  const [, g] = canvas(tile);
  g.strokeStyle = ink;
  g.lineWidth = width * PR;
  for (const o of [-tile, 0, tile]) {
    g.beginPath();
    g.moveTo(o - 1, tile + 1);
    g.lineTo(o + tile + 1, -1);
    g.stroke();
  }
  return g.getImageData(0, 0, tile, tile);
}

/** Paper tab with an ink hairline — labels sit on a solid panel, never on the screen. */
function tab(ink: string, paper: string): ImageData {
  const size = 12 * PR;
  const [, g] = canvas(size);
  g.fillStyle = paper;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = ink;
  g.lineWidth = PR;
  g.strokeRect(PR / 2, PR / 2, size - PR, size - PR);
  return g.getImageData(0, 0, size, size);
}

export function addScreens(map: maplibregl.Map, ink: Ink) {
  BAND_RADII.forEach((r, i) => map.addImage(`band-${i}`, dotScreen(r, ink.ink), { pixelRatio: PR }));
  BAND_RADII.forEach((r, i) => map.addImage(`fine-${i}`, fineScreen((r / BAND_CELL) * FINE_CELL, ink.ink), { pixelRatio: PR }));
  LINE_WIDTHS.forEach((w, i) => map.addImage(`line-${i}`, lineScreen(w, ink.ink), { pixelRatio: PR }));
  const e = 12 * PR;
  map.addImage("tab", tab(ink.ink, ink.paper), {
    pixelRatio: PR,
    stretchX: [[3 * PR, e - 3 * PR]],
    stretchY: [[3 * PR, e - 3 * PR]],
    content: [3 * PR, 3 * PR, e - 3 * PR, e - 3 * PR],
  });
  map.addImage("missing", slash(ink.mix(0.3)), { pixelRatio: PR });
  map.addImage("sea", engrave(ink.mix(0.22)), { pixelRatio: PR });
}

/** Fill-pattern per council. MapLibre cannot drive patterns from feature-state, so this is a code → band match. */
export function bandPattern(codeKey: string, bands: Record<string, number | null>, prefix = "band"): ExpressionSpecification {
  const pairs: string[] = [];
  for (const [code, b] of Object.entries(bands)) pairs.push(code, b == null ? "missing" : `${prefix}-${b}`);
  if (pairs.length === 0) return ["literal", "missing"] as unknown as ExpressionSpecification;
  return ["match", ["get", codeKey], ...pairs, "missing"] as unknown as ExpressionSpecification;
}

/** Stepped solid tone per council; missing councils print paper (the slash layer marks them). */
export function bandTone(codeKey: string, bands: Record<string, number | null>, ink: Ink): ExpressionSpecification {
  const pairs: string[] = [];
  for (const [code, b] of Object.entries(bands)) pairs.push(code, b == null ? ink.paper : ink.mix(TONE_STEPS[b]!));
  if (pairs.length === 0) return ["literal", ink.paper] as unknown as ExpressionSpecification;
  return ["match", ["get", codeKey], ...pairs, ink.paper] as unknown as ExpressionSpecification;
}

const GLYPHS = "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf";

/**
 * Basemap in one ink. `roads: "knockout"` prints roads in paper through a choropleth screen;
 * `"hair"` draws them as faint ink hairlines on bare paper (point maps).
 */
export function inkStyle(ink: Ink, origin: string, roads: "knockout" | "hair"): StyleSpecification {
  const road = roads === "knockout" ? ink.paper : ink.mix(0.16);
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      base: {
        type: "vector",
        url: `pmtiles://${origin}/lab-tiles/uk-basemap.pmtiles`,
      },
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
      // Data fills slot in here (before "roads-major").
      {
        id: "rivers",
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
        paint: {
          "line-color": road,
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 10, 1.4, 12, 2.6],
        },
      },
      {
        id: "roads-minor",
        source: "base",
        "source-layer": "roads",
        type: "line",
        filter: ["in", ["get", "kind"], ["literal", ["minor_road"]]],
        minzoom: 11,
        paint: { "line-color": road, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 12, 1] },
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
        source: "base",
        "source-layer": "boundaries",
        type: "line",
        filter: ["<=", ["get", "kind_detail"], 4],
        paint: { "line-color": ink.ink, "line-width": 0.8, "line-dasharray": [3, 2] },
      },
    ],
  };
}

/** Place names — Geist Mono glyphs need building; Noto Sans stands in for the sketch. */
export function placeLabels(ink: Ink, look: "halo" | "tab" = "halo"): LayerSpecification {
  const tabbed = look === "tab";
  return {
    id: "places",
    source: "base",
    "source-layer": "places",
    type: "symbol",
    filter: ["all", ["==", ["get", "kind"], "locality"], ["<=", ["get", "min_zoom"], ["+", ["zoom"], tabbed ? 0 : 1]]],
    layout: {
      "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
      "text-font": ["Noto Sans Medium"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 9, 10, 12],
      "text-transform": "uppercase",
      "text-letter-spacing": 0.12,
      "symbol-sort-key": ["get", "min_zoom"],
      "text-padding": 6,
      ...(tabbed
        ? { "icon-image": "tab", "icon-text-fit": "both", "icon-text-fit-padding": [1, 4, 0, 4], "text-size": ["interpolate", ["linear"], ["zoom"], 5, 8.5, 10, 10.5], "text-letter-spacing": 0.08, "text-padding": 14 }
        : {}),
    } as LayerSpecification["layout"],
    paint: tabbed ? { "text-color": ink.ink } : { "text-color": ink.ink, "text-halo-color": ink.paper, "text-halo-width": 2 },
  };
}

export const UK_BOUNDS: [[number, number], [number, number]] = [
  [-8.2, 49.85],
  [1.9, 60.9],
];

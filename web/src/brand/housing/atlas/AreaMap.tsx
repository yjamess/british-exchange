"use client";

import type * as MapLibre from "maplibre-gl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { InkMap, type InkMapHandle } from "../../map/InkMap";
import { BEFORE_DATA, placeNames, toneMatch, type Ink } from "../../map/ink";
import { PLACES } from "../../map/places";
import type { Area, MapShape, Mode } from "./model";
import { band, breaks, formatValue, valueAt } from "./model";
import s from "./atlas.module.css";

/**
 * Choropleth of local authorities on InkMap: ONS December 2025 full-resolution boundaries,
 * stepped solid tones by band, borders knocked out in paper, town names on paper tabs.
 * Ink outline = selection; Union dash = compare. Only the councils in `shapes` are drawn.
 */

type Bounds = [[number, number], [number, number]];

function boundsOf(codes: string[]): Bounds | undefined {
  let w = 180, so = 90, e = -180, n = -90;
  for (const code of codes) {
    const p = PLACES[code];
    if (!p) continue;
    w = Math.min(w, p.bounds[0]);
    so = Math.min(so, p.bounds[1]);
    e = Math.max(e, p.bounds[2]);
    n = Math.max(n, p.bounds[3]);
  }
  return w < e ? [[w, so], [e, n]] : undefined;
}

const none = ["==", ["get", "code"], ""] as const;
const one = (code: string) => ["==", ["get", "code"], code] as unknown as MapLibre.FilterSpecification;

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
  const handle = useRef<InkMapHandle>(null);
  const inkRef = useRef<Ink | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const codes = useMemo(() => shapes.map((sh) => sh.code), [shapes]);
  const names = useMemo(() => new Map(shapes.map((sh) => [sh.code, sh.name])), [shapes]);
  const home = useMemo(() => boundsOf(codes), [codes]);
  const byCode = useMemo(() => new Map(areas.map((area) => [area.code, area])), [areas]);
  const thresholds = useMemo(() => breaks(measure, mode), [measure, mode]);
  const bands = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const code of codes) out[code] = band(valueAt(byCode.get(code), month, mode), thresholds);
    return out;
  }, [codes, byCode, month, mode, thresholds]);

  const onLoad = (map: MapLibre.Map, ink: Ink) => {
    inkRef.current = ink;
    const union = getComputedStyle(map.getContainer()).getPropertyValue("--bo-union").trim() || "#012169";
    const layer = { source: "areas", "source-layer": "lad" } as const;
    map.addLayer({ id: "area-fill", type: "fill", ...layer, filter: none as unknown as MapLibre.FilterSpecification, paint: { "fill-color": ink.paper } }, BEFORE_DATA);
    map.addLayer({ id: "area-missing", type: "fill", ...layer, filter: none as unknown as MapLibre.FilterSpecification, paint: { "fill-pattern": "missing" } }, BEFORE_DATA);
    map.addLayer(
      {
        id: "area-line",
        type: "line",
        ...layer,
        filter: none as unknown as MapLibre.FilterSpecification,
        paint: { "line-color": ink.paper, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 9, 1.2] },
      },
      BEFORE_DATA,
    );
    map.addLayer({ id: "area-hover", type: "line", ...layer, filter: one(""), paint: { "line-color": ink.ink, "line-width": 1.5 } });
    map.addLayer({ id: "area-compare-halo", type: "line", ...layer, filter: one(""), paint: { "line-color": ink.paper, "line-width": 4 } });
    map.addLayer({ id: "area-compare", type: "line", ...layer, filter: one(""), paint: { "line-color": union, "line-width": 1.75, "line-dasharray": [2.5, 1.5] } });
    map.addLayer({ id: "area-select-halo", type: "line", ...layer, filter: one(""), paint: { "line-color": ink.paper, "line-width": 4 } });
    map.addLayer({ id: "area-select", type: "line", ...layer, filter: one(""), paint: { "line-color": ink.ink, "line-width": 2 } });
    map.addLayer(placeNames(ink));
    map.on("mousemove", "area-fill", (e) => {
      const code = String(e.features?.[0]?.properties?.code ?? "");
      map.getCanvas().style.cursor = code ? "pointer" : "";
      setHover(code);
    });
    map.on("mouseleave", "area-fill", () => {
      map.getCanvas().style.cursor = "";
      setHover("");
    });
    map.on("click", "area-fill", (e) => {
      const code = String(e.features?.[0]?.properties?.code ?? "");
      if (code) onSelectRef.current(code);
    });
    setReady(true);
  };

  // Which councils this instrument draws.
  useEffect(() => {
    const map = handle.current?.map();
    if (!ready || !map) return;
    const inSet = ["in", ["get", "code"], ["literal", codes]] as unknown as MapLibre.FilterSpecification;
    map.setFilter("area-fill", inSet);
    map.setFilter("area-line", inSet);
  }, [ready, codes]);

  // Tones (play path only swaps one paint expression).
  useEffect(() => {
    const map = handle.current?.map();
    const ink = inkRef.current;
    if (!ready || !map || !ink) return;
    map.setPaintProperty("area-fill", "fill-color", toneMatch(bands, ink));
    const missing = Object.entries(bands)
      .filter(([, b]) => b == null)
      .map(([c]) => c);
    map.setFilter("area-missing", ["in", ["get", "code"], ["literal", missing]] as unknown as MapLibre.FilterSpecification);
  }, [ready, bands]);

  useEffect(() => {
    const map = handle.current?.map();
    if (!ready || !map) return;
    map.setFilter("area-hover", one(hover && hover !== selected ? hover : ""));
    const cmp = comparison && comparison !== selected ? comparison : "";
    map.setFilter("area-compare-halo", one(cmp));
    map.setFilter("area-compare", one(cmp));
    map.setFilter("area-select-halo", one(selected));
    map.setFilter("area-select", one(selected));
  }, [ready, hover, selected, comparison]);

  const focusPlace = () => {
    const p = PLACES[selected];
    if (p) handle.current?.fit([[p.bounds[0], p.bounds[1]], [p.bounds[2], p.bounds[3]]]);
  };

  const highlightedName = hover ? names.get(hover) : undefined;

  return (
    <div className={`${s.mapSurface} ${compact ? s.mapSurfaceCompact : ""} ${flow ? s.mapSurfaceFlow : ""}`}>
      <div className={s.mapCaption}>
        <span className="bo-label">{coverage}</span>
        <span>
          {highlightedName
            ? `${highlightedName} · ${formatValue(valueAt(byCode.get(hover), month, mode), measure, mode)}`
            : "Select a place to update the record"}
        </span>
      </div>

      <div className={s.mapTools} role="group" aria-label="Map controls">
        <button type="button" className={s.toolBtn} onClick={() => handle.current?.zoomBy(1.5)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className={s.toolBtn} onClick={() => handle.current?.zoomBy(1 / 1.5)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={s.toolBtn} onClick={() => handle.current?.home()} aria-label="Reset view">
          ⌂
        </button>
        <button type="button" className={s.toolBtnWide} onClick={focusPlace} disabled={!codes.includes(selected)}>
          Find
        </button>
      </div>

      <InkMap ref={handle} label={mapLabel} className={s.mapSvg} bounds={home} onLoad={onLoad} />
      <p id={`${uid}-instructions`} className={s.mapFoot}>
        Drag to pan · + / − or two fingers to zoom · click a place to update focus. Home resets the view.
      </p>
    </div>
  );
}

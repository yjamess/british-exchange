"use client";

/**
 * Region / nation choropleth on InkMap — ONS December 2025 boundaries, stepped solid tones,
 * borders knocked out in paper, names on paper tabs, ink selection. Default shapes are English
 * regions; pass `UK_NATION_SHAPES` for the four nations. Shapes supply codes and names; geometry
 * comes from the shared tiles.
 */

import type * as MapLibre from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { InkMap, type InkMapHandle } from "./InkMap";
import { BEFORE_DATA, ENGLAND_BOUNDS, UK_BOUNDS, areaNames, toneMatch, type Ink } from "./ink";
import { MapLegend } from "./MapLegend";
import { band, equalBreaks } from "./model";
import { PLACES } from "./places";
import s from "./map.module.css";
import display from "./english-regions-display.json";
import ukNationsDisplay from "./uk-nations-display.json";

export type RegionShape = {
  code: string;
  name: string;
  path: string;
  bounds: [number, number, number, number];
  label: [number, number];
};

export type RegionDatum = { code: string; value: number | null; display: string };

export const REGION_SHAPES = display.shapes as RegionShape[];
/** Four UK nations (ONS Countries December 2025 BUC) for Trade UK-nation lens. */
export const UK_NATION_SHAPES = ukNationsDisplay.shapes as RegionShape[];

const ENGLISH_LABEL_LINES: Record<string, string[]> = {
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

const UK_NATION_LABEL_LINES: Record<string, string[]> = {
  E92000001: ["England"],
  S92000003: ["Scotland"],
  W92000004: ["Wales"],
  N92000002: ["Northern", "Ireland"],
};

const one = (code: string) => ["==", ["get", "code"], code] as unknown as MapLibre.FilterSpecification;

export function RegionMap({
  data,
  selected,
  onSelect,
  label,
  legendFormat,
  legendUnit,
  size = "panel",
  shapes = REGION_SHAPES,
  labelLines,
  emptyCaption = "Select a region",
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
  /** Default: English regions. Pass `UK_NATION_SHAPES` for the four nations. */
  shapes?: RegionShape[];
  labelLines?: Record<string, string[]>;
  /** @deprecated SVG-era label offsets; names now sit on the ONS internal point. */
  labelAt?: Record<string, [number, number]>;
  emptyCaption?: string;
}) {
  const handle = useRef<InkMapHandle>(null);
  const inkRef = useRef<Ink | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const nations = shapes.some((sh) => /^[ESWN]92/.test(sh.code));
  const sourceLayer = nations ? "ctry" : "rgn";
  const home = nations ? UK_BOUNDS : ENGLAND_BOUNDS;
  const lines = labelLines ?? (nations ? UK_NATION_LABEL_LINES : ENGLISH_LABEL_LINES);
  const codes = useMemo(() => shapes.map((sh) => sh.code), [shapes]);

  const byCode = useMemo(() => new Map(data.map((d) => [d.code, d])), [data]);
  const thresholds = useMemo(
    () => equalBreaks(data.map((d) => d.value).filter((v): v is number => v != null && Number.isFinite(v))),
    [data],
  );
  const bands = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const code of codes) out[code] = band(byCode.get(code)?.value ?? null, thresholds);
    return out;
  }, [codes, byCode, thresholds]);

  const onLoad = (map: MapLibre.Map, ink: Ink) => {
    inkRef.current = ink;
    const layer = { source: "areas", "source-layer": sourceLayer } as const;
    const inSet = ["in", ["get", "code"], ["literal", codes]] as unknown as MapLibre.FilterSpecification;
    map.addLayer({ id: "region-fill", type: "fill", ...layer, filter: inSet, paint: { "fill-color": ink.paper } }, BEFORE_DATA);
    map.addLayer({ id: "region-missing", type: "fill", ...layer, filter: one(""), paint: { "fill-pattern": "missing" } }, BEFORE_DATA);
    map.addLayer(
      { id: "region-line", type: "line", ...layer, filter: inSet, paint: { "line-color": ink.paper, "line-width": 1.2 } },
      BEFORE_DATA,
    );
    map.addLayer({ id: "region-hover", type: "line", ...layer, filter: one(""), paint: { "line-color": ink.ink, "line-width": 1.5 } });
    map.addLayer({ id: "region-select-halo", type: "line", ...layer, filter: one(""), paint: { "line-color": ink.paper, "line-width": 4 } });
    map.addLayer({ id: "region-select", type: "line", ...layer, filter: one(""), paint: { "line-color": ink.ink, "line-width": 2 } });
    map.addSource("region-labels", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: shapes
          .filter((sh) => PLACES[sh.code])
          .map((sh) => ({
            type: "Feature" as const,
            properties: { code: sh.code, label: (lines[sh.code] ?? [sh.name]).join("\n") },
            geometry: { type: "Point" as const, coordinates: PLACES[sh.code]!.label },
          })),
      },
    });
    map.addLayer(areaNames(ink, "region-labels"));
    map.on("mousemove", "region-fill", (e) => {
      const code = String(e.features?.[0]?.properties?.code ?? "");
      map.getCanvas().style.cursor = code ? "pointer" : "";
      setHover(code);
    });
    map.on("mouseleave", "region-fill", () => {
      map.getCanvas().style.cursor = "";
      setHover("");
    });
    map.on("click", "region-fill", (e) => {
      const code = String(e.features?.[0]?.properties?.code ?? "");
      if (code) onSelectRef.current(code);
    });
    setReady(true);
  };

  useEffect(() => {
    const map = handle.current?.map();
    const ink = inkRef.current;
    if (!ready || !map || !ink) return;
    map.setPaintProperty("region-fill", "fill-color", toneMatch(bands, ink));
    const missing = Object.entries(bands)
      .filter(([, b]) => b == null)
      .map(([c]) => c);
    map.setFilter("region-missing", ["in", ["get", "code"], ["literal", missing]] as unknown as MapLibre.FilterSpecification);
  }, [ready, bands]);

  useEffect(() => {
    const map = handle.current?.map();
    if (!ready || !map) return;
    map.setFilter("region-hover", one(hover && hover !== selected ? hover : ""));
    map.setFilter("region-select-halo", one(selected ?? ""));
    map.setFilter("region-select", one(selected ?? ""));
  }, [ready, hover, selected]);

  /** Zoom to the selected region / nation; back home when cleared. */
  useEffect(() => {
    if (!ready) return;
    const p = selected ? PLACES[selected] : undefined;
    if (p) handle.current?.fit([[p.bounds[0], p.bounds[1]], [p.bounds[2], p.bounds[3]]], 8);
    else handle.current?.home();
  }, [ready, selected]);

  const hoverShape = hover ? shapes.find((sh) => sh.code === hover) : undefined;
  const selectShape = selected ? shapes.find((sh) => sh.code === selected) : undefined;
  const hoverData = hover ? byCode.get(hover) : undefined;

  return (
    <div className={`${s.mapSurfaceRegion} ${size === "stage" ? s.mapSurfaceStage : ""}`}>
      <div className={s.mapCaption}>
        <span>
          {hoverShape
            ? `${hoverShape.name} · ${hoverData?.display ?? "no data"}`
            : selectShape
              ? `${selectShape.name} · ${byCode.get(selectShape.code)?.display ?? "selected"}`
              : emptyCaption}
        </span>
      </div>

      <div className={s.mapTools} role="group" aria-label="Map controls">
        <button type="button" className={s.toolBtn} onClick={() => handle.current?.zoomBy(1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className={s.toolBtn} onClick={() => handle.current?.zoomBy(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={s.toolBtn} onClick={() => handle.current?.home()} aria-label="Reset view">
          ⌂
        </button>
      </div>

      <InkMap ref={handle} label={label} className={s.mapSvg} bounds={home} onLoad={onLoad} />

      <MapLegend title={legendUnit} thresholds={thresholds} format={legendFormat} />
    </div>
  );
}

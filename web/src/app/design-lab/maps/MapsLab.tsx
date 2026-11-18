"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer } from "@deck.gl/layers";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ControlRow,
  Explorer,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  Stage,
  formatSource,
} from "@/brand/template";
import { ReadoutCard } from "@/brand";
import { BAND_RADII, MapLegend, band } from "@/brand/map";
import { breaks, formatValue } from "@/brand/housing/atlas/model";
import tools from "@/brand/charts/station-map.module.css";
import { LINE_WIDTHS, TONE_STEPS, UK_BOUNDS, addScreens, bandPattern, bandTone, inkStyle, placeLabels, readInk, registerPmtiles, type FillMode, type Ink } from "./inkMap";
import s from "./maps.module.css";

export type CouncilRow = { code: string; name: string; price: number | null; rent: number | null };
export type Site = { id: string; name: string; mw: number; group: "renewable" | "storage" | "fossil" | "nuclear"; technology: string; lon: number; lat: number };
type Measure = "price" | "rent";
type LabelLook = "tab" | "halo";

const DOMAINS = [
  { id: "atlas", title: "Council atlas", short: "Atlas", question: "Could the house-price map show real places, not just outlines?", status: "ready" as const },
  { id: "sites", title: "Generation sites", short: "Sites", question: "Could every generating site sit on a real Britain, at any zoom?", status: "ready" as const },
];


/** Keep the floating readout inside the map well: flip to the pointer's other side near an edge. */
function cardAt(el: HTMLElement | null, x: number, y: number) {
  const w = el?.clientWidth ?? 0;
  const h = el?.clientHeight ?? 0;
  const dx = x > w / 2 ? "calc(-100% - 14px)" : "14px";
  const dy = y > h / 2 ? "calc(-100% - 14px)" : "14px";
  return { left: x, top: y, right: "auto", bottom: "auto", transform: `translate(${dx}, ${dy})`, maxWidth: 280 };
}

function bandLabel(i: number, t: number[], format: (v: number) => string): string {
  if (i === 0) return `Below ${format(t[0]!)}`;
  if (i >= t.length) return `${format(t[t.length - 1]!)} and above`;
  return `${format(t[i - 1]!)} – ${format(t[i]!)}`;
}

/** Legend for the lab fills — swatch draws the same treatment as the map. */
function LabLegend({ fill, title, thresholds, format }: { fill: FillMode; title: string; thresholds: number[]; format: (v: number) => string }) {
  return (
    <section className={s.legend} aria-label="Map legend">
      <p className="bo-label">{title}</p>
      {TONE_STEPS.map((step, i) => (
        <div key={i} className={s.legendRow}>
          <svg className={s.swatch} viewBox="0 0 36 14" aria-hidden="true">
            {fill === "tone" ? (
              <rect width="36" height="14" fill={`color-mix(in srgb, var(--bo-ink) ${Math.round(step * 100)}%, var(--bo-paper))`} />
            ) : fill === "line" ? (
              <>
                <defs>
                  <pattern id={`lab-line-${i}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width={LINE_WIDTHS[i]} height="4" fill="var(--bo-ink)" />
                  </pattern>
                </defs>
                <rect width="36" height="14" fill={`url(#lab-line-${i})`} />
              </>
            ) : (
              <>
                <defs>
                  <pattern id={`lab-fine-${i}`} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <circle cx="1.7" cy="1.7" r={(BAND_RADII[i]! / 6) * 3.4} fill="var(--bo-ink)" />
                  </pattern>
                </defs>
                <rect width="36" height="14" fill={`url(#lab-fine-${i})`} />
              </>
            )}
            <rect x="0.5" y="0.5" width="35" height="13" fill="none" stroke="var(--bo-ink-20)" />
          </svg>
          <span>{bandLabel(i, thresholds, format)}</span>
        </div>
      ))}
    </section>
  );
}

/* ── Sketch A: MapLibre + PMTiles council choropleth ─────────────────────────────── */

function useMap(ref: React.RefObject<HTMLDivElement | null>, roads: "knockout" | "hair", onReady: (map: maplibregl.Map, ink: Ink) => void) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerPmtiles();
    const ink = readInk(el);
    const map = new maplibregl.Map({
      container: el,
      style: inkStyle(ink, window.location.origin, roads),
      bounds: UK_BOUNDS,
      fitBoundsOptions: { padding: 16 },
      maxBounds: [
        [-16, 47],
        [10, 63],
      ],
      minZoom: 4,
      maxZoom: 14,
      dragRotate: false,
      pitchWithRotate: false,
      // Credit is drawn by <MapCredit/> in house type, not MapLibre's control.
      attributionControl: false,
    });
    map.touchZoomRotate.disableRotation();
    map.on("styleimagemissing", () => {});
    map.once("load", () => {
      addScreens(map, ink);
      onReady(map, ink);
    });
    mapRef.current = map;
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return mapRef;
}

/** OpenStreetMap licence: credit visible on the map, linked to the copyright page. */
function MapCredit() {
  return (
    <a className={s.credit} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
      © OpenStreetMap contributors
    </a>
  );
}

function MapTools({ map }: { map: React.RefObject<maplibregl.Map | null> }) {
  return (
    <div className={tools.tools} role="group" aria-label="Map controls">
      <button type="button" className={tools.toolBtn} aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
        +
      </button>
      <button type="button" className={tools.toolBtn} aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
        −
      </button>
      <button type="button" className={tools.toolBtnWide} onClick={() => map.current?.fitBounds(UK_BOUNDS, { padding: 16 })}>
        Home
      </button>
    </div>
  );
}

function CouncilAtlas({ rows, month, measure, fill, labels }: { rows: CouncilRow[]; month: string; measure: Measure; fill: FillMode; labels: LabelLook }) {
  const el = useRef<HTMLDivElement>(null);
  const inkRef = useRef<Ink | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState("");
  const byCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);
  const measureId = measure === "price" ? "average" : "average-rent";
  const thresholds = breaks(measureId, "price");

  const map = useMap(el, "knockout", (m, ink) => {
    inkRef.current = ink;
    m.addSource("lad", { type: "vector", url: `pmtiles://${window.location.origin}/lab-tiles/lad.pmtiles`, promoteId: { lad: "LAD25CD" } });
    m.addLayer({ id: "lad-tone", source: "lad", "source-layer": "lad", type: "fill", paint: { "fill-color": ink.paper } }, "rivers");
    m.addLayer({ id: "lad-fill", source: "lad", "source-layer": "lad", type: "fill", paint: { "fill-pattern": "missing" } }, "rivers");
    m.addLayer(
      { id: "lad-missing", source: "lad", "source-layer": "lad", type: "fill", filter: ["==", ["get", "LAD25CD"], ""], paint: { "fill-pattern": "missing" } },
      "rivers",
    );
    m.addLayer({ id: "lad-line", source: "lad", "source-layer": "lad", type: "line", paint: { "line-color": ink.mix(0.3), "line-width": 0.5 } });
    m.addLayer({ id: "lad-hover", source: "lad", "source-layer": "lad", type: "line", filter: ["==", ["get", "LAD25CD"], ""], paint: { "line-color": ink.ink, "line-width": 2 } });
    m.addLayer({ id: "lad-selected", source: "lad", "source-layer": "lad", type: "line", filter: ["==", ["get", "LAD25CD"], ""], paint: { "line-color": ink.ink, "line-width": 4 } });
    // Paper core inside the ink outline, so selection reads on the darkest tone too.
    m.addLayer({ id: "lad-selected-core", source: "lad", "source-layer": "lad", type: "line", filter: ["==", ["get", "LAD25CD"], ""], paint: { "line-color": ink.paper, "line-width": 1 } });
    m.addLayer(placeLabels(ink, "tab"));
    for (const id of ["lad-tone", "lad-fill"]) {
      m.on("mousemove", id, (e: maplibregl.MapLayerMouseEvent) => {
        const code = String(e.features?.[0]?.properties?.LAD25CD ?? "");
        m.getCanvas().style.cursor = code ? "pointer" : "";
        setHover(code ? { code, x: e.point.x, y: e.point.y } : null);
      });
      m.on("mouseleave", id, () => {
        m.getCanvas().style.cursor = "";
        setHover(null);
      });
      m.on("click", id, (e: maplibregl.MapLayerMouseEvent) => setSelected(String(e.features?.[0]?.properties?.LAD25CD ?? "")));
    }
    setReady(true);
  });

  useEffect(() => {
    const m = map.current;
    const ink = inkRef.current;
    if (!ready || !m || !ink) return;
    const bands: Record<string, number | null> = {};
    for (const r of rows) bands[r.code] = band(measure === "price" ? r.price : r.rent, thresholds);
    const tone = fill === "tone";
    m.setLayoutProperty("lad-tone", "visibility", tone ? "visible" : "none");
    m.setLayoutProperty("lad-fill", "visibility", tone ? "none" : "visible");
    m.setLayoutProperty("lad-missing", "visibility", tone ? "visible" : "none");
    if (tone) {
      m.setPaintProperty("lad-tone", "fill-color", bandTone("LAD25CD", bands, ink));
      const missing = Object.entries(bands).filter(([, b]) => b == null).map(([c]) => c);
      m.setFilter("lad-missing", ["in", ["get", "LAD25CD"], ["literal", missing]]);
    } else {
      m.setPaintProperty("lad-fill", "fill-pattern", bandPattern("LAD25CD", bands, fill === "dots" ? "band" : fill));
    }
    // Tones: borders knocked out in paper. Screens: faint ink hairline.
    m.setPaintProperty("lad-line", "line-color", tone ? ink.paper : ink.mix(0.3));
    m.setPaintProperty("lad-line", "line-width", tone ? ["interpolate", ["linear"], ["zoom"], 4, 0.4, 9, 1.2] : ["interpolate", ["linear"], ["zoom"], 4, 0.3, 9, 0.8]);
  }, [ready, rows, measure, thresholds, fill, map]);

  useEffect(() => {
    const m = map.current;
    const ink = inkRef.current;
    if (!ready || !m || !ink) return;
    if (m.getLayer("places")) m.removeLayer("places");
    m.addLayer(placeLabels(ink, labels));
  }, [ready, labels, map]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setFilter("lad-hover", ["==", ["get", "LAD25CD"], hover?.code ?? ""]);
    for (const id of ["lad-selected", "lad-selected-core"]) m.setFilter(id, ["==", ["get", "LAD25CD"], selected]);
  }, [ready, hover, selected, map]);

  const focus = byCode.get(hover?.code ?? selected);
  const fmt = (v: number | null) => formatValue(v, measureId, "price");

  return (
    <div className={s.mapGrid}>
      <div className={s.mapWell}>
        <div ref={el} className={s.map} aria-label="Interactive map of local authorities" />
        <MapTools map={map} />
        <MapCredit />
        {hover && focus ? (
          <ReadoutCard
            head={focus.name}
            rows={[
              { label: "Average price", value: fmt(focus.price) },
              { label: "Average rent", value: formatValue(focus.rent, "average-rent", "price") },
            ]}
            style={cardAt(el.current, hover.x, hover.y)}
          />
        ) : null}
      </div>
      <aside className={s.side}>
        {fill === "dots" ? (
          <MapLegend title={measure === "price" ? `Average price · ${month}` : `Average monthly rent · ${month}`} thresholds={thresholds} format={(v) => formatValue(v, measureId, "price", true)} />
        ) : (
          <LabLegend fill={fill} title={measure === "price" ? `Average price · ${month}` : `Average monthly rent · ${month}`} thresholds={thresholds} format={(v) => formatValue(v, measureId, "price", true)} />
        )}
        {selected && byCode.get(selected) ? (
          <ReadoutCard
            placement="inline"
            head={byCode.get(selected)!.name}
            rows={[
              { label: "Average price", value: fmt(byCode.get(selected)!.price) },
              { label: "Average rent", value: formatValue(byCode.get(selected)!.rent, "average-rent", "price") },
            ]}
          />
        ) : null}
      </aside>
    </div>
  );
}

/* ── Sketch B: deck.gl IconLayer over the same basemap ───────────────────────────── */

const GROUP_LABEL: Record<Site["group"], string> = { renewable: "Renewables", storage: "Storage", fossil: "Fossil", nuclear: "Nuclear" };
const ICON = 64;

/** One ink, told apart by print: dots, hatch, cross-hatch, open. Plus a solid "frame" for selection. */
function iconAtlas(ink: string) {
  const kinds = ["renewable", "fossil", "nuclear", "storage", "frame"] as const;
  const c = document.createElement("canvas");
  c.width = ICON * kinds.length;
  c.height = ICON;
  const g = c.getContext("2d")!;
  const mapping: Record<string, { x: number; y: number; width: number; height: number; mask: boolean }> = {};
  kinds.forEach((k, i) => {
    const x0 = i * ICON;
    mapping[k] = { x: x0, y: 0, width: ICON, height: ICON, mask: false };
    g.save();
    g.beginPath();
    g.rect(x0 + 4, 4, ICON - 8, ICON - 8);
    g.clip();
    g.fillStyle = "#fff";
    if (k !== "frame") g.fillRect(x0, 0, ICON, ICON);
    g.strokeStyle = ink;
    g.fillStyle = ink;
    g.lineWidth = 3;
    if (k === "renewable") {
      for (let y = 8; y < ICON; y += 10) for (let x = 8 + ((y / 10) % 2) * 5; x < ICON; x += 10) {
        g.beginPath();
        g.arc(x0 + x, y, 2.6, 0, Math.PI * 2);
        g.fill();
      }
    }
    const hatch = (dir: 1 | -1) => {
      for (let o = -ICON; o < ICON * 2; o += 10) {
        g.beginPath();
        g.moveTo(x0 + o, dir === 1 ? ICON : 0);
        g.lineTo(x0 + o + ICON, dir === 1 ? 0 : ICON);
        g.stroke();
      }
    };
    if (k === "fossil" || k === "nuclear") hatch(1);
    if (k === "nuclear") hatch(-1);
    g.restore();
    g.strokeStyle = ink;
    g.lineWidth = k === "frame" ? 8 : 5;
    g.strokeRect(x0 + 4, 4, ICON - 8, ICON - 8);
  });
  return { atlas: c, mapping };
}

function SiteAtlas({ sites }: { sites: Site[] }) {
  const el = useRef<HTMLDivElement>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const icons = useRef<ReturnType<typeof iconAtlas> | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ site: Site; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Site | null>(null);
  const ordered = useMemo(() => [...sites].sort((a, b) => b.mw - a.mw), [sites]);

  const map = useMap(el, "hair", (m, ink) => {
    m.addLayer(placeLabels(ink));
    icons.current = iconAtlas(ink.ink);
    overlay.current = new MapboxOverlay({ interleaved: false, layers: [] });
    m.addControl(overlay.current);
    setReady(true);
  });

  useEffect(() => {
    if (!ready || !overlay.current || !icons.current) return;
    const { atlas, mapping } = icons.current;
    const size = (mw: number) => Math.min(26, Math.max(4, Math.sqrt(mw) * 0.6));
    overlay.current.setProps({
      layers: [
        new IconLayer<Site>({
          id: "sites",
          data: ordered,
          iconAtlas: atlas as unknown as string,
          iconMapping: mapping,
          getIcon: (d) => (size(d.mw) < 9 && d.group !== "storage" ? "frame" : d.group),
          getPosition: (d) => [d.lon, d.lat],
          getSize: (d) => size(d.mw),
          sizeUnits: "pixels",
          sizeMinPixels: 5,
          pickable: true,
          onHover: (info) => setHover(info.object ? { site: info.object, x: info.x, y: info.y } : null),
          onClick: (info) => setSelected(info.object ?? null),
        }),
        new IconLayer<Site>({
          id: "selected",
          data: selected ? [selected] : [],
          iconAtlas: atlas as unknown as string,
          iconMapping: mapping,
          getIcon: () => "frame",
          getPosition: (d) => [d.lon, d.lat],
          getSize: (d) => size(d.mw) + 14,
          sizeUnits: "pixels",
        }),
      ],
    });
  }, [ready, ordered, selected]);

  const focus = hover?.site ?? null;
  const record = (p: Site) => [
    { label: "Technology", value: p.technology },
    { label: "Group", value: GROUP_LABEL[p.group] },
    { label: "Capacity", value: `${p.mw.toLocaleString("en-GB", { maximumFractionDigits: 1 })} MW` },
  ];

  return (
    <div className={s.mapGrid}>
      <div className={s.mapWell}>
        <div ref={el} className={s.map} aria-label="Interactive map of generating sites" />
        <MapTools map={map} />
        <MapCredit />
        {focus && hover ? <ReadoutCard head={focus.name} rows={record(focus)} style={cardAt(el.current, hover.x, hover.y)} /> : null}
      </div>
      <aside className={s.side}>
        {selected ? <ReadoutCard placement="inline" head={selected.name} rows={record(selected)} /> : null}
      </aside>
    </div>
  );
}

/* ── Lab shell ───────────────────────────────────────────────────────────────────── */

export function MapsLab({ rows, month, sites }: { rows: CouncilRow[]; month: string; sites: Site[] }) {
  const [domain, setDomain] = useState("atlas");
  const [measure, setMeasure] = useState<Measure>("price");
  // Lab only: ?fill=&labels= preset the comparison (client-only component, so location is safe).
  const params = new URLSearchParams(window.location.search);
  const [fill, setFill] = useState<FillMode>((params.get("fill") as FillMode) || "tone");
  const [labels, setLabels] = useState<LabelLook>((params.get("labels") as LabelLook) || "tab");
  const priced = rows.filter((r) => r.price != null).length;
  const mw = sites.reduce((a, p) => a + p.mw, 0);

  return (
    <Explorer sector="Design lab · maps" indexLabel="Map sketches" domains={DOMAINS} active={domain} onSelectDomain={setDomain}>
      {domain === "atlas" ? (
        <>
          <ExplorerHead views={[{ id: "map", label: "MapLibre + PMTiles" }]} view="map" />
          <FigureStrip
            figures={[
              { label: "Councils", value: String(rows.length), note: "Full-resolution ONS boundaries" },
              { label: "With a price", value: String(priced), note: month },
              { label: "Zoom", value: "4–14", note: "Coast, roads and towns appear as you zoom" },
            ]}
          />
          <ControlRow>
            <MenuControl<Measure>
              label="Measure"
              value={measure}
              options={[
                { value: "price", label: "Average house price" },
                { value: "rent", label: "Average monthly rent" },
              ]}
              onChange={setMeasure}
            />
            <MenuControl<FillMode>
              label="Fill"
              value={fill}
              options={[
                { value: "tone", label: "Stepped tone" },
                { value: "line", label: "Line screen" },
                { value: "fine", label: "Fine dot screen" },
                { value: "dots", label: "Current dot screen" },
              ]}
              onChange={setFill}
            />
            <MenuControl<LabelLook>
              label="Labels"
              value={labels}
              options={[
                { value: "tab", label: "Paper tab" },
                { value: "halo", label: "Halo" },
              ]}
              onChange={setLabels}
            />
          </ControlRow>
          <Stage
            size="wide"
            title={measure === "price" ? `Average house price · local authorities · ${month}` : `Average monthly private rent · local authorities · ${month}`}
            foot={
              <FigureRecord
                source={formatSource(
                  measure === "price" ? "HM Land Registry · ONS" : "ONS",
                  measure === "price" ? "UK House Price Index" : "Price Index of Private Rents",
                  "Boundaries: ONS December 2025 · local authorities, UK",
                  month,
                )}
              />
            }
          >
            <CouncilAtlas rows={rows} month={month} measure={measure} fill={fill} labels={labels} />
          </Stage>
        </>
      ) : (
        <>
          <ExplorerHead views={[{ id: "sites", label: "deck.gl over MapLibre" }]} view="sites" />
          <FigureStrip
            figures={[
              { label: "Sites", value: sites.length.toLocaleString("en-GB"), note: "Operational renewables + large stations" },
              { label: "Capacity", value: `${Math.round(mw / 1000).toLocaleString("en-GB")} GW`, note: "Sum of mapped sites" },
              { label: "Drawn on", value: "GPU", note: "WebGL marks, picking by pixel" },
            ]}
          />
          <Stage
            size="wide"
            title="Generating sites · capacity · Great Britain"
            foot={<FigureRecord source={formatSource("DESNZ", "Renewable Energy Planning Database · DUKES 5.11", "Great Britain", "Q2 2026")} />}
          >
            <SiteAtlas sites={sites} />
          </Stage>
        </>
      )}
    </Explorer>
  );
}

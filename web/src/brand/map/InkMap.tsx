"use client";

/**
 * InkMap — the one map surface for place data (docs/visual-identity.md › Charts › Geography).
 * MapLibre over the Exchange PMTiles (ONS December 2025 boundaries + a slim OpenStreetMap
 * basemap), drawn in one ink. Instruments (AreaMap, RegionMap, station / field atlases) add
 * their data layers in `onLoad` and keep their own controls, captions and readouts.
 */

import "maplibre-gl/dist/maplibre-gl.css";
import type * as MapLibre from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties, type ReactNode } from "react";
import { UK_BOUNDS, addInkImages, inkStyle, loadMapRuntime, readInk, type Ink, type Roads } from "./ink";
import s from "./map.module.css";

type Bounds = [[number, number], [number, number]];

export type InkMapHandle = {
  map: () => MapLibre.Map | null;
  zoomBy: (factor: number) => void;
  home: () => void;
  fit: (bounds: Bounds, maxZoom?: number) => void;
};

/** OpenStreetMap licence: credit visible on the map, linked to the copyright page. */
export function MapCredit() {
  return (
    <a className={s.inkCredit} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
      © OpenStreetMap contributors
    </a>
  );
}

export const InkMap = forwardRef<
  InkMapHandle,
  {
    /** Accessible name for the map region. */
    label: string;
    /** Sizing class from the owning instrument (aspect ratio, heights). */
    className?: string;
    style?: CSSProperties;
    /** Home view. */
    bounds?: Bounds;
    /** Roads knocked out in paper over fills, or faint hairlines on bare paper (points). */
    roads?: Roads;
    /** Add sources/layers/handlers. Runs once, after the style and images are ready. */
    onLoad: (map: MapLibre.Map, ink: Ink, lib: typeof MapLibre) => void;
    children?: ReactNode;
  }
>(function InkMap({ label, className, style, bounds = UK_BOUNDS, roads = "knockout", onLoad, children }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre.Map | null>(null);
  const homeRef = useRef(bounds);
  homeRef.current = bounds;
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useImperativeHandle(ref, () => ({
    map: () => mapRef.current,
    zoomBy: (factor) => {
      const m = mapRef.current;
      if (m) m.easeTo({ zoom: m.getZoom() + Math.log2(factor), duration: 250 });
    },
    home: () => mapRef.current?.fitBounds(homeRef.current, { padding: 16, duration: 300 }),
    fit: (b, maxZoom = 11) => mapRef.current?.fitBounds(b, { padding: 40, maxZoom, duration: 400 }),
  }));

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let map: MapLibre.Map | null = null;
    let cancelled = false;
    loadMapRuntime().then((lib) => {
      if (cancelled || !el.isConnected) return;
      const ink = readInk(el);
      map = new lib.Map({
        container: el,
        style: inkStyle(ink, roads),
        bounds: homeRef.current,
        fitBoundsOptions: { padding: 16 },
        maxBounds: [
          [-18, 46],
          [12, 64],
        ],
        minZoom: 3.5,
        maxZoom: 14,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false,
        // Page scroll and one-finger swipes stay with the page; Ctrl/⌘ + scroll or two fingers move the map.
        cooperativeGestures: true,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Ctrl + scroll to zoom the map",
          "CooperativeGesturesHandler.MacHelpText": "⌘ + scroll to zoom the map",
          "CooperativeGesturesHandler.MobileHelpText": "Use two fingers to move the map",
        },
      });
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      map.once("load", () => {
        if (!map) return;
        addInkImages(map, ink);
        onLoadRef.current(map, ink, lib);
      });
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // Style and roads are fixed for the life of the instrument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // touch-action / cursor reset: owners' sizing classes were written for SVG pan surfaces.
    <div className={`${s.inkWell} ${className ?? ""}`} style={{ touchAction: "auto", cursor: "auto", ...style }}>
      <div ref={host} className={s.inkCanvas} role="region" aria-label={label} />
      <MapCredit />
      {children}
    </div>
  );
});

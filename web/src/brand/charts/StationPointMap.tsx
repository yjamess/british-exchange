"use client";

/**
 * UK power-station atlas on InkMap — square capacity marks drawn by a deck.gl IconLayer over the
 * shared MapLibre basemap (faint road hairlines, place names on paper tabs).
 * Brand: square marks (never circles), area ∝ capacity on one fixed scale. One ink; families are
 * told apart by print — renewables a dot screen, fossil a hatch, nuclear a cross-hatch, storage an
 * open square. Marks too small to hold a print print solid (storage stays open).
 * Larger stations are drawn first so small ones sit on top. Selection is ink: the station reprinted
 * with a heavy frame, drawn above every other station.
 */

import type * as MapLibre from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReadoutCard } from "../instrument/ReadoutCard";
import { InkMap, type InkMapHandle } from "../map/InkMap";
import { placeNames, type Ink } from "../map/ink";
import { SOLID_BELOW_PX, loadDeck, siteIcons, squareSide, type Deck, type SiteIcons, type SitePrint } from "../map/sites";
import { isMapped, stationGroup, stationKey, stationPlace, type StationGroup } from "../energy/station-model";
import type { AtlasPoint } from "../energy/packs";
import s from "./station-map.module.css";

export type StationPoint = AtlasPoint;

type Overlay = InstanceType<Deck["MapboxOverlay"]>;

const FAMILY_LABEL: Record<StationGroup, string> = {
  renewable: "Renewables",
  storage: "Storage",
  fossil: "Fossil",
  nuclear: "Nuclear",
};

const GROUP_PRINT: Record<StationGroup, SitePrint> = {
  renewable: "dots",
  fossil: "hatch",
  nuclear: "cross",
  storage: "open",
};

/** Side in CSS px: area ∝ installed capacity (100 MW ≈ 6 px, 1 GW ≈ 19 px), capped so the coast still reads. */
const side = (mw: number) => squareSide(mw, 0.6, 4, 26);

function printOf(p: StationPoint): SitePrint {
  const group = stationGroup(p);
  if (group === "storage") return "open";
  return side(p.mw) < SOLID_BELOW_PX ? "solid" : GROUP_PRINT[group];
}

const SIZE_KEY = [100, 1000].map((mw) => ({ mw, px: Math.round(side(mw)) }));

/** Keep the floating readout inside the map: flip to the pointer's other side past the middle. */
function cardAt(el: HTMLElement | null, x: number, y: number) {
  const w = el?.clientWidth ?? 0;
  const h = el?.clientHeight ?? 0;
  const dx = x > w / 2 ? "calc(-100% - 14px)" : "14px";
  const dy = y > h / 2 ? "calc(-100% - 14px)" : "14px";
  return {
    left: x,
    top: y,
    right: "auto",
    bottom: "auto",
    transform: `translate(${dx}, ${dy})`,
    maxWidth: 300,
  };
}

/** Bounds a little way around one station, for Find / selection. */
function around(p: StationPoint): [[number, number], [number, number]] {
  const d = 0.25;
  return [
    [p.lon - d, p.lat - d],
    [p.lon + d, p.lat + d],
  ];
}

export function StationPointMap({
  points,
  label,
  selectedId,
  onSelect,
}: {
  points: StationPoint[];
  label: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** @deprecated SVG-era coastline path; the coast now comes from the shared map tiles. Ignored. */
  outline?: string;
}) {
  const handle = useRef<InkMapHandle>(null);
  const overlay = useRef<Overlay | null>(null);
  const deck = useRef<Deck | null>(null);
  const icons = useRef<SiteIcons | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{
    point: StationPoint;
    x: number;
    y: number;
  } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Large first, small last — capacity still reads and small stations are not buried.
  const drawn = useMemo(() => points.filter(isMapped).toSorted((a, b) => b.mw - a.mw), [points]);
  const byId = useMemo(() => new Map(drawn.map((p) => [stationKey(p), p])), [drawn]);
  const families = (["renewable", "fossil", "nuclear", "storage"] as StationGroup[]).filter((g) =>
    drawn.some((p) => stationGroup(p) === g),
  );
  const selected = selectedId ? byId.get(selectedId) : undefined;

  const onLoad = (map: MapLibre.Map, ink: Ink) => {
    map.addLayer(placeNames(ink));
    icons.current = siteIcons(ink.ink, ink.paper);
    loadDeck().then((d) => {
      // The map may have been removed while deck loaded.
      if (handle.current?.map() !== map) return;
      deck.current = d;
      overlay.current = new d.MapboxOverlay({ interleaved: false, layers: [] });
      map.addControl(overlay.current as unknown as MapLibre.IControl);
      setReady(true);
    });
  };

  useEffect(() => {
    const d = deck.current;
    const o = overlay.current;
    const ic = icons.current;
    if (!ready || !d || !o || !ic) return;
    const common = {
      iconAtlas: ic.atlas as unknown as string,
      iconMapping: ic.mapping,
      getPosition: (p: StationPoint) => [p.lon, p.lat] as [number, number],
      sizeUnits: "pixels" as const,
    };
    const cursor = (on: boolean) => {
      const canvas = handle.current?.map()?.getCanvas();
      if (canvas) canvas.style.cursor = on ? "pointer" : "";
    };
    o.setProps({
      layers: [
        new d.IconLayer<StationPoint>({
          ...common,
          id: "stations",
          data: drawn,
          getIcon: printOf,
          getSize: (p) => side(p.mw),
          pickable: true,
          onHover: (info) => {
            cursor(Boolean(info.object));
            setHover(info.object ? { point: info.object, x: info.x, y: info.y } : null);
          },
          onClick: (info) => {
            if (info.object) onSelectRef.current?.(stationKey(info.object));
          },
        }),
        // Selection above every station: reprinted (solid unless storage), then a heavy ink frame.
        new d.IconLayer<StationPoint>({
          ...common,
          id: "station-selected",
          data: selected ? [selected] : [],
          getIcon: (p) => (stationGroup(p) === "storage" ? "open" : "solid"),
          getSize: (p) => side(p.mw),
        }),
        new d.IconLayer<StationPoint>({
          ...common,
          id: "station-frame",
          data: selected ? [selected] : [],
          getIcon: () => "frame",
          getSize: (p) => side(p.mw) + 12,
        }),
      ],
    });
  }, [ready, drawn, selected]);

  // Selecting from search / list flies the map to the site, once per selection.
  const flown = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !selected || !selectedId) return;
    if (flown.current === selectedId) return;
    flown.current = selectedId;
    handle.current?.fit(around(selected), 9);
  }, [ready, selected, selectedId]);
  useEffect(() => {
    if (!selectedId) flown.current = null;
  }, [selectedId]);

  const focus = hover?.point;

  return (
    <div className={s.wrap}>
      <div className={s.surface}>
        <div className={s.caption}>
          <span className="bo-label">Great Britain · installed capacity</span>
        </div>

        <div className={s.tools} role="group" aria-label="Map controls">
          <button type="button" className={s.toolBtn} onClick={() => handle.current?.zoomBy(1.5)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className={s.toolBtn} onClick={() => handle.current?.zoomBy(1 / 1.5)} aria-label="Zoom out">
            −
          </button>
          <button type="button" className={s.toolBtn} onClick={() => handle.current?.home()} aria-label="Reset view">
            ⌂
          </button>
          <button
            type="button"
            className={s.toolBtnWide}
            onClick={() => selected && handle.current?.fit(around(selected), 10)}
            disabled={!selected}
          >
            Find
          </button>
        </div>

        <InkMap ref={handle} label={label} className={s.inkPlot} roads="hair" onLoad={onLoad}>
          {focus && hover ? (
            <ReadoutCard
              head={focus.name}
              style={cardAt(handle.current?.map()?.getContainer() ?? null, hover.x, hover.y)}
              rows={[
                {
                  label: "Installed capacity",
                  value: `${focus.mw.toLocaleString("en-GB")} MW`,
                },
                {
                  label: "Technology group",
                  value: FAMILY_LABEL[stationGroup(focus)],
                },
                ...(stationPlace(focus) ? [{ label: "Place", value: stationPlace(focus) }] : []),
              ]}
            />
          ) : null}
        </InkMap>
      </div>

      <ul className={s.key} aria-label="Station families and capacity scale">
        {families.map((g) => (
          <li key={g} className={s.keyItem}>
            <span className={s.swatch} data-kind={g} aria-hidden="true" />
            {FAMILY_LABEL[g]}
          </li>
        ))}
        <li className={s.sizeKey} aria-label="Square area shows installed capacity">
          {SIZE_KEY.map(({ mw, px }) => (
            <span key={mw} className={s.sizeMark}>
              <i style={{ width: px, height: px }} aria-hidden="true" />
              {mw.toLocaleString("en-GB")} MW
            </span>
          ))}
        </li>
      </ul>
    </div>
  );
}

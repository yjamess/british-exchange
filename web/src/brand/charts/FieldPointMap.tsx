"use client";

/**
 * NSTA UKCS field atlas — square marks on InkMap (MapLibre + the Exchange basemap, hairline
 * roads), drawn by a deck.gl IconLayer. Housing / Station atlas grammar: drag to pan,
 * +/−/Home, Find selected.
 * Marks default to status groups (producing / ceased / other). A caller may pass its own
 * groups (e.g. what the records say about each field in one year) and a measured size:
 * square area ∝ a published value on one fixed scale.
 * One ink: groups are told apart by print (solid, stipple, hatch, cross, open), never by colour.
 * Field prints map onto the shared site prints: stipple → dots, the rest by name.
 */

import type * as MapLibre from "maplibre-gl";
import type { MapboxOverlay } from "@deck.gl/mapbox";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ReadoutCard } from "../instrument/ReadoutCard";
import {
  fieldStatusGroup,
  fieldStatusLabel,
  type FieldPoint,
  type FieldStatusGroup,
} from "../energy/fossils-model";
import { InkMap, type InkMapHandle } from "../map/InkMap";
import { placeNames, type Ink } from "../map/ink";
import { SOLID_BELOW_PX, loadDeck, siteIcons, type Deck, type SiteIcons, type SitePrint } from "../map/sites";
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

const SITE_PRINT: Record<FieldPrint, SitePrint> = {
  solid: "solid",
  stipple: "dots",
  hatch: "hatch",
  cross: "cross",
  open: "open",
};

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
      return { background: "var(--bo-paper)", borderColor: INK };
  }
}

type Bounds = [[number, number], [number, number]];

/** Home: the UK Continental Shelf fields — Irish Sea and West of Shetland to the median line. */
const HOME: Bounds = [
  [-5.2, 52.4],
  [4.4, 61.6],
];
/** Side in CSS px with no measured size. */
const SIDE = 9;
/** Measured size: side = SIDE_MAX·√share, so square area ∝ the published value. */
const SIDE_MIN = 4;
const SIDE_MAX = 30;
/** Find / select: half-width in degrees of the box fitted around a field. */
const FIND_PAD = 0.45;
const FIND_ZOOM = 8;

function isMapped(p: FieldPoint): boolean {
  return (
    Number.isFinite(p.lon) &&
    Number.isFinite(p.lat) &&
    p.lon >= -8.8 &&
    p.lon <= 4.5 &&
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

function around(p: FieldPoint): Bounds {
  return [
    [p.lon - FIND_PAD, p.lat - FIND_PAD],
    [p.lon + FIND_PAD, p.lat + FIND_PAD],
  ];
}

/** Keep the floating readout inside the map well: flip to the pointer's other side past the middle. */
function cardAt(el: HTMLElement | null, x: number, y: number): CSSProperties {
  const w = el?.clientWidth ?? 0;
  const h = el?.clientHeight ?? 0;
  const dx = x > w / 2 ? "calc(-100% - 14px)" : "14px";
  const dy = y > h / 2 ? "calc(-100% - 14px)" : "14px";
  return { left: x, top: y, right: "auto", bottom: "auto", transform: `translate(${dx}, ${dy})`, maxWidth: 300 };
}

type Mark = { p: FieldPoint; side: number; icon: SitePrint };

export function FieldPointMap({
  points,
  label,
  selectedId,
  onSelect,
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
  /** @deprecated The basemap draws the coast; ignored. */
  outline?: string;
  groups?: FieldMapGroup[];
  groupOf?: (p: FieldPoint) => string;
  /** 0–1 share of the fixed maximum; null = no value (small open mark). */
  sizeOf?: (p: FieldPoint) => number | null;
  sizeLabel?: string;
  describe?: (p: FieldPoint) => string;
}) {
  const handle = useRef<InkMapHandle>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const deck = useRef<Deck | null>(null);
  const icons = useRef<SiteIcons | null>(null);
  const alive = useRef(true);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const drawn = useMemo(() => points.filter(isMapped), [points]);
  const byId = useMemo(() => new Map(drawn.map((p) => [p.id, p])), [drawn]);
  const groups = groupDefs.filter((g) => drawn.some((p) => groupOf(p) === g.id));
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const hovered = hover ? byId.get(hover.id) : undefined;

  // Marks: print + side, larger first so small sit on top. Callers pass fresh closures each
  // render; the key below holds the result steady unless a mark actually changes.
  const marksNow: Mark[] = drawn
    .map((p) => {
      const group = groupDefs.find((g) => g.id === groupOf(p)) ?? STATUS_GROUPS[2]!;
      const share = sizeOf ? sizeOf(p) : undefined;
      const side =
        share === undefined
          ? SIDE
          : share == null
            ? SIDE_MIN
            : Math.max(SIDE_MIN, SIDE_MAX * Math.sqrt(Math.min(1, Math.max(0, share))));
      const print = SITE_PRINT[group.print];
      const icon: SitePrint = print === "open" || side >= SOLID_BELOW_PX ? print : "solid";
      return { p, side, icon };
    })
    .sort((a, b) => b.side - a.side);
  const marksKey = marksNow.map((m) => `${m.p.id}:${m.icon}:${m.side.toFixed(2)}`).join("|");
  const marksRef = useRef<{ key: string; marks: Mark[] }>({ key: "", marks: [] });
  if (marksRef.current.key !== marksKey) marksRef.current = { key: marksKey, marks: marksNow };
  const marks = marksRef.current.marks;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const onLoad = (map: MapLibre.Map, ink: Ink) => {
    map.addLayer(placeNames(ink));
    icons.current = siteIcons(ink.ink, ink.paper);
    void loadDeck().then((d) => {
      if (!alive.current || !handle.current?.map()) return;
      deck.current = d;
      overlay.current = new d.MapboxOverlay({ interleaved: false, layers: [] });
      map.addControl(overlay.current);
      setReady(true);
    });
  };

  // Data, sizes and selection → deck.
  useEffect(() => {
    const o = overlay.current;
    const d = deck.current;
    const ic = icons.current;
    if (!ready || !o || !d || !ic) return;
    const atlas = ic.atlas as unknown as string;
    const sel = selectedId ? marks.find((m) => m.p.id === selectedId) : undefined;
    o.setProps({
      layers: [
        new d.IconLayer<Mark>({
          id: "fields",
          data: marks,
          iconAtlas: atlas,
          iconMapping: ic.mapping,
          getIcon: (m) => m.icon,
          getPosition: (m) => [m.p.lon, m.p.lat],
          getSize: (m) => m.side,
          sizeUnits: "pixels",
          pickable: true,
          onHover: (info) => {
            const id = info.object?.p.id;
            const canvas = handle.current?.map()?.getCanvas();
            if (canvas) canvas.style.cursor = id ? "pointer" : "";
            setHover(id ? { id, x: info.x, y: info.y } : null);
          },
          onClick: (info) => {
            if (info.object) onSelectRef.current?.(info.object.p.id);
          },
        }),
        new d.IconLayer<Mark>({
          id: "field-selected",
          data: sel ? [sel] : [],
          iconAtlas: atlas,
          iconMapping: ic.mapping,
          getIcon: (m) => m.icon,
          getPosition: (m) => [m.p.lon, m.p.lat],
          getSize: (m) => m.side,
          sizeUnits: "pixels",
        }),
        new d.IconLayer<Mark>({
          id: "field-frame",
          data: sel ? [sel] : [],
          iconAtlas: atlas,
          iconMapping: ic.mapping,
          getIcon: () => "frame",
          getPosition: (m) => [m.p.lon, m.p.lat],
          getSize: (m) => m.side + 12,
          sizeUnits: "pixels",
        }),
      ],
    });
  }, [ready, marks, selectedId]);

  // A new selection brings its field into view.
  useEffect(() => {
    if (!ready || !selected) return;
    handle.current?.fit(around(selected), FIND_ZOOM);
    // Only on a change of field, not when the year or filters redraw it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected?.id]);

  // Hovered field gone (filter / year change) → drop the card.
  const card = hover && hovered ? hover : null;
  const wellEl = handle.current?.map()?.getContainer() ?? null;
  const focus = hovered ?? selected;
  const record = (p: FieldPoint) => {
    const place = shelfPlace(p.lat, p.lon);
    return [
      { label: "Status", value: p.status },
      ...(p.fieldType ? [{ label: "Field type", value: p.fieldType }] : []),
      ...(describe ? [{ label: "Production record", value: describe(p) }] : []),
      { label: "Place", value: place },
    ];
  };

  return (
    <div className={s.wrap}>
      <InkMap
        ref={handle}
        label={`${label}. Drag to pan, plus and minus to zoom, Home to reset, Find to centre the selected field.`}
        className={`${s.surface} ${s.plot}`}
        bounds={HOME}
        roads="hair"
        onLoad={onLoad}
      >
        <div className={`${s.tools} ${s.toolsBottom}`} role="group" aria-label="Map controls" style={{ bottom: 30 }}>
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
            onClick={() => selected && handle.current?.fit(around(selected), FIND_ZOOM)}
            disabled={!selected}
          >
            Find
          </button>
        </div>
        {card && hovered ? (
          <ReadoutCard head={hovered.name} rows={record(hovered)} style={cardAt(wellEl, card.x, card.y)} />
        ) : null}
      </InkMap>

      <ul className={s.key} aria-label="What the squares mean">
        {groups.map((g) => (
          <li key={g.id} className={s.keyItem}>
            <span className={s.swatch} style={swatchStyle(g.print)} aria-hidden="true" />
            {g.label}
          </li>
        ))}
        {sizeLabel && <li className={s.keyItem}>{sizeLabel}</li>}
        {focus && (
          <li className={s.keyItem} aria-hidden="true">
            {coord(focus.lat, focus.lon)}
          </li>
        )}
      </ul>
    </div>
  );
}

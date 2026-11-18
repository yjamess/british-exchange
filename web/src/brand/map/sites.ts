/**
 * Site marks for InkMap point instruments (power stations, North Sea fields, …) — deck.gl
 * IconLayer over MapLibre. One ink: groups are told apart by **print**, never colour.
 * Square marks (never circles); area ∝ the published value on one fixed scale.
 *
 *   dots   — dot screen     (renewables, producing fields)
 *   hatch  — 45° hatch      (fossil)
 *   cross  — cross-hatch    (nuclear)
 *   open   — hairline only  (storage, ceased)
 *   solid  — full ink       (marks too small to hold a print)
 *   frame  — heavy outline  (selection; drawn above every mark)
 */
import type * as DeckLayers from "@deck.gl/layers";
import type * as DeckMapbox from "@deck.gl/mapbox";

export type SitePrint = "dots" | "hatch" | "cross" | "open" | "solid" | "frame";
export const SITE_PRINTS: SitePrint[] = ["dots", "hatch", "cross", "open", "solid", "frame"];

/** Below this side (CSS px) a print cannot read; the mark prints solid. */
export const SOLID_BELOW_PX = 9;

const CELL = 64;

export type SiteIcons = {
  atlas: HTMLCanvasElement;
  mapping: Record<SitePrint, { x: number; y: number; width: number; height: number; mask: boolean }>;
};

/** Rasterise the prints once per map (2× for crisp edges). */
export function siteIcons(ink: string, paper: string): SiteIcons {
  const c = document.createElement("canvas");
  c.width = CELL * SITE_PRINTS.length;
  c.height = CELL;
  const g = c.getContext("2d")!;
  const mapping = {} as SiteIcons["mapping"];
  SITE_PRINTS.forEach((print, i) => {
    const x0 = i * CELL;
    mapping[print] = { x: x0, y: 0, width: CELL, height: CELL, mask: false };
    const inset = print === "frame" ? 4 : 3;
    g.save();
    g.beginPath();
    g.rect(x0 + inset, inset, CELL - inset * 2, CELL - inset * 2);
    g.clip();
    if (print !== "frame") {
      g.fillStyle = print === "solid" ? ink : paper;
      g.fillRect(x0, 0, CELL, CELL);
    }
    g.fillStyle = ink;
    g.strokeStyle = ink;
    g.lineWidth = 3;
    if (print === "dots") {
      for (let y = 6; y < CELL; y += 9)
        for (let x = 6 + (Math.round(y / 9) % 2) * 4.5; x < CELL; x += 9) {
          g.beginPath();
          g.arc(x0 + x, y, 2.4, 0, Math.PI * 2);
          g.fill();
        }
    }
    const hatch = (dir: 1 | -1) => {
      for (let o = -CELL; o < CELL * 2; o += 9) {
        g.beginPath();
        g.moveTo(x0 + o, dir === 1 ? CELL : 0);
        g.lineTo(x0 + o + CELL, dir === 1 ? 0 : CELL);
        g.stroke();
      }
    };
    if (print === "hatch" || print === "cross") hatch(1);
    if (print === "cross") hatch(-1);
    g.restore();
    g.strokeStyle = ink;
    g.lineWidth = print === "frame" ? 8 : 4;
    g.strokeRect(x0 + inset, inset, CELL - inset * 2, CELL - inset * 2);
  });
  return { atlas: c, mapping };
}

export type Deck = { MapboxOverlay: typeof DeckMapbox.MapboxOverlay; IconLayer: typeof DeckLayers.IconLayer };

let deck: Promise<Deck> | null = null;
/** deck.gl loads in the browser only, after the map. */
export function loadDeck(): Promise<Deck> {
  deck ??= Promise.all([import("@deck.gl/mapbox"), import("@deck.gl/layers")]).then(([m, l]) => ({
    MapboxOverlay: m.MapboxOverlay,
    IconLayer: l.IconLayer,
  }));
  return deck;
}

/** Side in CSS px for a value, area ∝ value: side = k·√v, clamped. */
export function squareSide(value: number, k: number, min = 4, max = 30): number {
  return Math.min(max, Math.max(min, Math.sqrt(Math.max(0, value)) * k));
}

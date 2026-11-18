/**
 * Bounds + label anchors for every boundary in the shared tiles (ONS December 2025:
 * 361 local authorities, 9 English regions, 4 UK countries). Built by
 * `regions.connectors.map_tiles`; `label` is the ONS-published internal point.
 */
import raw from "./places.json";

export type Place = {
  name: string;
  level: "local" | "region" | "nation";
  /** [west, south, east, north] in degrees. */
  bounds: [number, number, number, number];
  /** [lon, lat] — always inside the polygon. */
  label: [number, number];
};

export const PLACES = raw as unknown as Record<string, Place>;

export function placeBounds(code: string): [[number, number], [number, number]] | null {
  const p = PLACES[code];
  if (!p) return null;
  const [w, s, e, n] = p.bounds;
  return [
    [w, s],
    [e, n],
  ];
}

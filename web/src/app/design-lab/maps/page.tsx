import { BrandRoot } from "@/brand/BrandRoot";
import { loadAtlas, loadRentAtlas } from "@/brand/housing/atlas/server";
import { fetchPackJson } from "@/lib/api";
import type { CouncilRow, Site } from "./MapsLab";
import { MapsLabClient } from "./MapsLabClient";

export const metadata = { title: "Map sketches · British Exchange design lab" };

type PackPoint = { id: string; name: string; mw: number; technology?: string; primary_fuel?: string; family: string; lon: number; lat: number };

/** Last month at which most councils have a value. */
function latestIndex(values: (number | null)[][], months: string[]): number {
  for (let i = months.length - 1; i >= 0; i--) {
    if (values.filter((v) => v[i] != null).length > values.length / 2) return i;
  }
  return months.length - 1;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Design lab: MapLibre + PMTiles and deck.gl sketches on real Exchange packs.
 * Tiles are local lab files under /public/lab-tiles (gitignored); production would read them
 * from Supabase Storage by HTTP range request.
 */
export default async function Page() {
  const [price, rent, repd, dukes] = await Promise.all([
    loadAtlas("average"),
    loadRentAtlas("average-rent"),
    fetchPackJson<{ points: PackPoint[] }>("energy.atlas"),
    fetchPackJson<{ points: PackPoint[] }>("energy.stations"),
  ]);

  const local = price.areas.filter((a) => a.level === "local");
  const pi = latestIndex(local.map((a) => a.values), price.months);
  const rentByCode = new Map(rent.areas.map((a) => [a.code, a]));
  const ri = latestIndex(rent.areas.map((a) => a.values), rent.months);

  const rows: CouncilRow[] = local.map((a) => ({
    code: a.code,
    name: a.name,
    price: a.values[pi] ?? null,
    rent: rentByCode.get(a.code)?.values[ri] ?? null,
  }));

  const sites: Site[] = [...repd.points, ...dukes.points]
    .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat))
    .map((p) => ({
      id: p.id,
      name: p.name,
      mw: p.mw ?? 0,
      technology: p.primary_fuel || p.technology || "Unspecified",
      group: /battery|storage|flywheel/i.test(p.technology ?? "") ? "storage" : (p.family as Site["group"]),
      lon: p.lon,
      lat: p.lat,
    }));

  return (
    <BrandRoot>
      <MapsLabClient rows={rows} month={monthLabel(price.months[pi]!)} sites={sites} />
    </BrandRoot>
  );
}

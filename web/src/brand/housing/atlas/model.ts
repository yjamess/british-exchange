/** Shared, unit-aware atlas contract. Null is unavailable, never zero. */
export type Mode = "price" | "change";
export type Measure = { id: string; label: string; unit: string };
export type Area = { code: string; name: string; level: "local" | "region" | "nation" | "uk"; values: (number | null)[] };
export type Evidence = { publisher: string; url: string; release: string; licence?: string; retrievedAt?: string; checksum?: string; version?: string; caveats?: string[] };
export type Atlas = { months: string[]; measures: Measure[]; areas: Area[]; source: Evidence; caveats: string[]; measure: string };
export type MapShape = { code: string; name: string; path: string; bounds: [number, number, number, number] };
export type Geometry = { shapes: MapShape[]; source: Evidence };
export type TopicRow = { period: string; value: number | null; status: string };
export type LandUseShare = { id: string; label: string; share: number | null; hectares: number | null };
export type Topics = {
  tenure: { year: number; owner: number; privateRented: number; social: number; total: number; status: string }[];
  completions: TopicRow[];
  rent: TopicRow[];
  affordability: TopicRow[];
  greenBelt: TopicRow[];
  landUse: LandUseShare[];
  planning: TopicRow[];
  sources: Record<
    "tenure" | "completions" | "rent" | "affordability" | "greenBelt" | "landUse" | "planning",
    Evidence & { unit: string; geography: string }
  >;
};
export function valueAt(area: Area | undefined, index: number, mode: Mode): number | null {
  const current = area?.values[index];
  if (current == null || !Number.isFinite(current)) return null;
  if (mode === "price") return current;
  const previous = area?.values[index - 12];
  return previous == null || previous <= 0 ? null : (current / previous - 1) * 100;
}
// Fixed across time and places; no per-frame quantile shifts.
export function breaks(measure: string, mode: Mode): number[] {
  if (measure === "index") return [90, 100, 110, 120, 130, 150];
  if (measure === "annual-change" || mode === "change") return [-10, -5, 0, 5, 10, 20];
  if (measure === "sales-volume") return [50, 100, 200, 400, 800, 1600];
  // PIPR average monthly rent (£), including bedroom and property-type rents.
  if (measure === "average-rent" || measure.startsWith("bedrooms-") || measure.startsWith("type-")) {
    return [800, 1000, 1200, 1400, 1800, 2500];
  }
  // AFF1 workplace median price-to-earnings (×)
  if (measure === "pte-median") return [4, 5, 6, 7, 8, 10];
  // MHCLG TA1 households in temporary accommodation per 1,000 households
  if (measure === "ta-per-thousand") return [0.5, 1, 2, 5, 10, 20];
  // TA9 out-of-area placements as % of the authority's TA stock (derived)
  if (measure === "ta-out-of-area-share") return [5, 10, 20, 35, 50, 75];
  // HM Land Registry CCOD / OCOD titles per local authority
  if (measure === "titles-uk-company") return [5000, 10000, 15000, 20000, 30000, 50000];
  if (measure === "titles-overseas-company") return [50, 100, 250, 500, 1000, 2500];
  // Domestic EPC lodgements in a quarter (certificates, not dwellings)
  if (measure === "epc-lodgements") return [100, 250, 500, 1000, 2000, 4000];
  // Share of lodgements in bands A–C (%)
  if (measure === "epc-band-ac-share") return [20, 30, 40, 50, 60, 75];
  // MHCLG Live Table 122 net additional dwellings (districts)
  if (measure === "net-additions") return [50, 100, 200, 400, 800, 1500];
  // Net additions per 1,000 dwellings at stock open (Table 100 / 109)
  if (measure === "net-additions-rate") return [1, 2, 4, 6, 8, 12];
  return [100000, 200000, 300000, 400000, 600000, 1000000];
}
/** Shared choropleth bands — canonical copy lives in `@/brand/map`. */
export { band, BAND_CELL, BAND_RADII } from "../../map/model";
export function formatValue(value: number | null | undefined, measure: string, mode: Mode = "price", compact = false): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  if (mode === "change" || measure === "annual-change") return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  if (measure === "index") return value.toFixed(1);
  if (measure === "pte-median") return `${value.toFixed(1)}×`;
  if (measure === "ta-per-thousand") return `${value.toFixed(1)} per 1,000`;
  if (measure === "net-additions-rate") return `${value.toFixed(1)} per 1,000`;
  if (measure === "ta-out-of-area-share") return `${value.toFixed(0)}%`;
  if (measure === "epc-band-ac-share") return `${value.toFixed(0)}%`;
  if (
    measure === "sales-volume" ||
    measure.startsWith("titles-") ||
    measure === "epc-lodgements" ||
    measure === "net-additions"
  ) {
    if (compact && Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    }
    return Math.round(value).toLocaleString("en-GB");
  }
  const prefix = "£";
  // ICU versions disagree on compact currency casing/precision during hydration.
  if (compact && Math.abs(value) >= 1000) {
    const divisor = Math.abs(value) >= 1e6 ? 1e6 : 1000;
    return `${prefix}${(value / divisor).toFixed(1).replace(/\.0$/, "")}${divisor === 1e6 ? "m" : "k"}`;
  }
  return `${prefix}${Math.round(value).toLocaleString("en-GB")}`;
}
export const periodLabel = (period: string) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;
export const periodNumber = (period: string) => Number(period.slice(0, 4)) + (Number(period.slice(5, 7)) - 1) / 12;
export function rollingFour(rows: TopicRow[]): TopicRow[] {
  const by = new Map(rows.map(row => [Math.round(periodNumber(row.period) * 4), row]));
  return rows.map(row => {
    const key = Math.round(periodNumber(row.period) * 4);
    const four = [key, key - 1, key - 2, key - 3].map(k => by.get(k));
    return { ...row, value: four.some(r => r?.value == null) ? null : four.reduce((sum, r) => sum + r!.value!, 0), status: four.some(r => r?.status === "provisional") ? "provisional" : row.status };
  });
}

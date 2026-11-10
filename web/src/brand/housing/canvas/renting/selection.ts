/**
 * Renting selection — one home, one period, one measure, and one or more places.
 * One place keeps the bedroom breakdown. Several places draw one line each.
 *
 * The chart, map, table and download all read this. A series the publisher
 * does not cross (for example annual change by bedroom) is left blank rather
 * than filled with a different rent.
 *
 * Time is a fractional year, the same as the rest of the housing charts.
 */

import { fmt, fmtT, toT, type Pt } from "../../../data";

/** United Kingdom code in the private-rent file. An empty place list means this. */
export const RENT_UK = "K02000001";
/** Same cap as house-price history, so a comparison stays readable. */
/** Five series at most on one chart (visual identity › Charts). */
export const MAX_RENT_PLACES = 5;

export type RentMeasure = "average-rent" | "annual-change" | "index";
/** Which private-rent series the reader is inspecting. Bedrooms means the £ breakdown. */
export type RentFocus = RentMeasure | "bedrooms";

export type RentColumn = {
  id: string;
  category: string;
  measure: RentMeasure;
  label: string;
  points: Pt[];
};

export type YearWindow = { from: number; to: number; invalid: boolean };

const FULL_MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Label a category id that came from the file (`bedrooms-2`, `type-detached`). */
export function categoryLabel(id: string): string {
  if (id === "all" || id === "") return "All homes";
  const numbered = /^bedrooms-(\d+)$/.exec(id);
  if (numbered) {
    const n = numbered[1]!;
    return `${n} bedroom${n === "1" ? "" : "s"}`;
  }
  if (id === "bedrooms-4-plus") return "4+ bedrooms";
  if (id.startsWith("bedrooms-")) return id.replace("bedrooms-", "") + " bedrooms";
  if (id.startsWith("type-")) {
    const text = id.slice(5).replaceAll("-", " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return id.replaceAll("-", " ");
}

/**
 * The index baseline is part of the series unit ("index Jan 2023=100"),
 * not a label we invent beside the chart.
 * Returns a sentence fragment such as "January 2023 = 100", or null if the unit does not say.
 */
export function indexBaseline(unit: string | undefined): string | null {
  const match = /index\s+\(?([A-Za-z]+)\s+(\d{4})\s*=\s*100/i.exec(unit ?? "");
  if (!match) return null;
  const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(
    match[1]!.slice(0, 3).toLowerCase(),
  );
  const month = monthIndex >= 0 ? FULL_MONTH[monthIndex]! : match[1]!;
  return `${month} ${match[2]} = 100`;
}

/** True when ONS publishes this measure for this home category. */
export function isPublished(measure: RentMeasure, category: string): boolean {
  if (category === "all" || category === "") return true;
  return measure === "average-rent";
}

export function focusForView(view: string, rentParam: string | null): RentFocus {
  if (view === "change") return "annual-change";
  if (view === "index") return "index";
  if (view === "bedrooms") return "bedrooms";
  // Data, Social rent and Monthly rent each have their own series.
  // A leftover rent=bedrooms must not rename them.
  if (view === "monthly" || view === "table" || view === "tenancies") return "average-rent";
  // The map only has a level and an annual change. Bedroom and index links do not apply.
  if (view === "map") return rentParam === "annual-change" ? "annual-change" : "average-rent";
  if (rentParam === "annual-change" || rentParam === "index" || rentParam === "bedrooms") return rentParam;
  return "average-rent";
}

export function measureForFocus(focus: RentFocus): RentMeasure {
  return focus === "bedrooms" ? "average-rent" : focus;
}

const yearOf = (t: number) => Math.floor(t + 1e-6);

export function clipPoints(points: Pt[], from: number, to: number): Pt[] {
  return points.filter((p) => yearOf(p.t) >= from && yearOf(p.t) <= to);
}

/**
 * Year window for the active series.
 * A from/to pair inherited from another view is ignored when it does not
 * overlap this series — otherwise the chart is empty while the headline
 * still quotes the latest month.
 */
export function resolveYearWindow(
  bounds: { min: number; max: number } | null,
  fromParam: number | null,
  toParam: number | null,
): YearWindow | null {
  if (!bounds) return null;
  if (fromParam == null && toParam == null) {
    return { from: bounds.min, to: bounds.max, invalid: false };
  }
  const lo = Math.min(fromParam ?? bounds.min, toParam ?? bounds.max);
  const hi = Math.max(fromParam ?? bounds.min, toParam ?? bounds.max);
  if (hi < bounds.min || lo > bounds.max) {
    return { from: bounds.min, to: bounds.max, invalid: true };
  }
  return { from: Math.max(lo, bounds.min), to: Math.min(hi, bounds.max), invalid: false };
}

/** If the window removes every point, show the full series and say the period did not apply. */
export function applyWindow<T extends { points: Pt[] }>(
  series: T[],
  bounds: { min: number; max: number } | null,
  fromParam: number | null,
  toParam: number | null,
): { from: number; to: number; invalid: boolean; series: T[] } {
  const window = resolveYearWindow(bounds, fromParam, toParam);
  if (!window) return { from: 0, to: 0, invalid: false, series };
  const clipped = series.map((item) => ({ ...item, points: clipPoints(item.points, window.from, window.to) }));
  const hadPoints = series.some((item) => item.points.length > 0);
  const noneLeft = clipped.every((item) => item.points.length === 0);
  if (hadPoints && noneLeft) {
    return { from: bounds!.min, to: bounds!.max, invalid: true, series };
  }
  return { ...window, series: clipped };
}

export function columnId(category: string, measure: RentMeasure): string {
  return `${category}|${measure}`;
}

export function columnLabel(category: string, measure: RentMeasure): string {
  if (category === "all" && measure === "annual-change") return "Annual change";
  if (category === "all" && measure === "index") return "Index";
  if (category === "all") return "All homes";
  return categoryLabel(category);
}

export function columnsFromLines(input: {
  average: Pt[];
  change: Pt[];
  index: Pt[];
  bedrooms: { id: string; label: string; points: Pt[] }[];
  propertyTypes: { id: string; label: string; points: Pt[] }[];
}): RentColumn[] {
  const columns: RentColumn[] = [];
  const push = (category: string, measure: RentMeasure, points: Pt[]) => {
    if (points.length === 0) return;
    columns.push({ id: columnId(category, measure), category, measure, label: columnLabel(category, measure), points });
  };
  push("all", "average-rent", input.average);
  push("all", "annual-change", input.change);
  push("all", "index", input.index);
  for (const line of [...input.bedrooms, ...input.propertyTypes]) {
    push(line.id, "average-rent", line.points);
  }
  return columns;
}

export function boundsOf(columns: RentColumn[]): { min: number; max: number } | null {
  const times = columns.flatMap((col) => col.points.map((p) => p.t));
  if (times.length === 0) return null;
  return { min: yearOf(Math.min(...times)), max: yearOf(Math.max(...times)) };
}

function byId(columns: RentColumn[], category: string, measure: RentMeasure): RentColumn | undefined {
  return columns.find((col) => col.category === category && col.measure === measure);
}

/** Chart series for this view. `emptyReason` is set when that cross-break is not published. */
export function chartColumns(
  columns: RentColumn[],
  view: string,
  focus: RentFocus,
  category: string,
): { columns: RentColumn[]; emptyReason: string | null } {
  const home = category || "all";
  if (view === "bedrooms" || focus === "bedrooms") {
    const beds = columns.filter((col) => col.measure === "average-rent" && col.category.startsWith("bedrooms-"));
    if (home.startsWith("bedrooms-")) {
      const one = beds.filter((col) => col.category === home);
      return one.length
        ? { columns: one, emptyReason: null }
        : { columns: [], emptyReason: `${categoryLabel(home)} is not in this place's file.` };
    }
    return beds.length
      ? { columns: beds, emptyReason: null }
      : { columns: [], emptyReason: "Bedroom rents are not in this place's file." };
  }
  const measure = view === "change" || focus === "annual-change"
    ? "annual-change"
    : view === "index" || focus === "index"
      ? "index"
      : "average-rent";
  if (!isPublished(measure, home)) {
    const what = measure === "index" ? "The rent index" : "Annual change";
    return {
      columns: [],
      emptyReason: `${what} is published for all homes, not by bedroom or property type. ${categoryLabel(home)} is a monthly rent in pounds, on Monthly rent and in the table.`,
    };
  }
  const col = byId(columns, home, measure);
  if (!col || col.points.length === 0) {
    return { columns: [], emptyReason: "Nothing is published for this place and measure." };
  }
  return { columns: [col], emptyReason: null };
}

export type RentPlaceColumns = { code: string; name: string; columns: RentColumn[] };

/** Read `area` from the URL. One code still works. Several codes are comma-separated. */
export function parseRentAreas(raw: string | null): string[] {
  const parts = (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part === "uk" ? RENT_UK : part));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of parts) {
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length >= MAX_RENT_PLACES) break;
  }
  return out.length > 0 ? out : [RENT_UK];
}

/** Write places back to the URL. United Kingdom alone leaves the param off. */
export function rentAreasParam(codes: string[]): string | null {
  const unique = codes.filter((code, index) => codes.indexOf(code) === index).slice(0, MAX_RENT_PLACES);
  if (unique.length === 0 || (unique.length === 1 && unique[0] === RENT_UK)) return null;
  return unique.join(",");
}

function measureOf(view: string, focus: RentFocus): RentMeasure {
  if (view === "change" || focus === "annual-change") return "annual-change";
  if (view === "index" || focus === "index") return "index";
  return "average-rent";
}

/**
 * Chart columns for every selected place.
 * One place uses the normal view (including every bedroom size).
 * Several places draw one line each, for the same home and measure.
 */
export function chartForPlaces(
  places: RentPlaceColumns[],
  view: string,
  focus: RentFocus,
  category: string,
): { columns: RentColumn[]; emptyReason: string | null } {
  const ready = places.filter((place) => place.columns.length > 0);
  if (ready.length <= 1) {
    return chartColumns(ready[0]?.columns ?? [], view, focus, category);
  }
  const home = category || "all";
  const comparingBedrooms = view === "bedrooms" || focus === "bedrooms";
  const categoryForPlace = comparingBedrooms && home === "all" ? "all" : home;
  const measure = comparingBedrooms ? "average-rent" : measureOf(view, focus);
  if (!isPublished(measure, categoryForPlace)) {
    const what = measure === "index" ? "The rent index" : "Annual change";
    return {
      columns: [],
      emptyReason: `${what} is published for all homes, not by bedroom or property type. ${categoryLabel(home)} is a monthly rent in pounds, on Monthly rent and in the table.`,
    };
  }
  const columns: RentColumn[] = [];
  for (const place of ready) {
    const col = byId(place.columns, categoryForPlace, measure);
    if (!col || col.points.length === 0) continue;
    const homeLabel = categoryForPlace !== "all" ? ` · ${categoryLabel(categoryForPlace)}` : "";
    columns.push({ ...col, id: `${place.code}|${col.id}`, label: `${place.name}${homeLabel}` });
  }
  if (columns.length === 0) {
    return { columns: [], emptyReason: "Nothing is published for these places and this measure." };
  }
  return { columns, emptyReason: null };
}

/** One place keeps the full table. Several places keep the compared series only. */
export function tableForPlaces(
  places: RentPlaceColumns[],
  focus: RentFocus,
  category: string,
): RentColumn[] {
  if (places.length <= 1) return tableColumns(places[0]?.columns ?? [], focus, category);
  return chartForPlaces(places, "table", focus, category).columns;
}

/**
 * Table columns follow the Property control (and focus), same as the chart.
 * "All homes" → only the all-homes measures. A bedroom or type → that category only.
 */
export function tableColumns(columns: RentColumn[], focus: RentFocus, category: string): RentColumn[] {
  const home = category || "all";
  if (home !== "all") {
    return columns.filter((col) => col.category === home);
  }
  if (focus === "bedrooms") {
    return columns.filter((col) => col.measure === "average-rent" && col.category.startsWith("bedrooms-"));
  }
  const allHomes = columns.filter((col) => col.category === "all");
  return [...allHomes].sort(
    (a, b) => (a.measure === focus ? 0 : 1) - (b.measure === focus ? 0 : 1) || a.label.localeCompare(b.label),
  );
}

export function formatRent(measure: RentMeasure, value: number): string {
  if (measure === "average-rent") return fmt.gbp(value);
  if (measure === "annual-change") return fmt.pctSigned(value);
  return value.toFixed(1);
}

/** Reader-facing notes. The source line names the publisher; this does not repeat it or the full caveat list. */
export function privateRentReading(unit: string | undefined, focus: RentFocus): string[] {
  const notes = [
    "This is the rent being paid on private tenancies, including households who have not moved. It is not the advertised rent a prospective tenant would see on a listing.",
    "Scotland’s figures are mainly advertised new lets, and Northern Ireland is advertised new lets only. The latest two months are provisional.",
  ];
  if (focus === "index") {
    const baseline = indexBaseline(unit);
    notes.unshift(
      baseline
        ? `The index baseline is ${baseline}. A reading of 110 means private rents are 10% higher than in that month.`
        : "The index is not a rent in pounds. Its baseline is the month the publisher sets equal to 100.",
    );
  }
  return notes;
}

export function rentTitle(place: string, focus: RentFocus, category: string, unit: string | undefined): string {
  const home = category && category !== "all" ? categoryLabel(category) : null;
  const where = [home, place].filter(Boolean).join(" · ");
  if (focus === "index") {
    const baseline = indexBaseline(unit);
    return `Private rental price index${baseline ? ` (${baseline})` : ""} · ${where}`;
  }
  if (focus === "annual-change") return `Annual change in private rents · ${where}`;
  if (focus === "bedrooms") {
    return home ? `Average monthly rent · ${home} · ${place}` : `Average monthly rent by bedroom · ${place}`;
  }
  return `Average monthly rent · ${where}`;
}

export type RentFigure = { label: string; value: string; note: string };

function lastIn(points: Pt[]): Pt | undefined {
  return points[points.length - 1];
}

/** Headlines from the same points the chart is drawing — not a different month. */
export function figuresForRent(
  place: string,
  plotted: RentColumn[],
  focus: RentFocus,
  emptyReason: string | null,
  singlePlace = true,
): RentFigure[] {
  if (emptyReason || plotted.length === 0) {
    return [{ label: place, value: "—", note: emptyReason ?? "No observations in this period." }];
  }
  return plotted.slice(0, singlePlace ? 3 : plotted.length).map((col) => {
    const point = lastIn(col.points);
    return {
      label: col.label,
      value: point ? formatRent(col.measure, point.v) : "—",
      note: point ? (singlePlace ? `${place} · ${fmtT(point.t)}` : fmtT(point.t)) : place,
    };
  });
}

export function rentCsv(placeCode: string, placeName: string, columns: RentColumn[]): string {
  const header = ["period", "geography_code", "geography", ...columns.map((col) => col.label)];
  const times = [...new Set(columns.flatMap((col) => col.points.map((p) => p.t)))].sort((a, b) => a - b);
  const lookups = columns.map((col) => new Map(col.points.map((p) => [p.t, p.v])));
  const lines = [header, ...times.map((t) => [fmtT(t), placeCode, placeName, ...lookups.map((lookup) => {
    const value = lookup.get(t);
    return value == null ? "" : String(value);
  })])];
  return lines
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Months in the file, as ISO dates. `date` may be YYYY-MM from the map link. */
export function resolveMonth(months: string[], date: string): { month: string; missing: boolean } {
  if (months.length === 0) return { month: "", missing: Boolean(date) };
  if (!date) return { month: months[months.length - 1]!, missing: false };
  const key = date.slice(0, 7);
  const found = months.find((month) => month.slice(0, 7) === key);
  if (found) return { month: found, missing: false };
  return { month: months[months.length - 1]!, missing: true };
}

export function monthInsideWindow(months: string[], preferred: string, from: number, to: number): string {
  const inside = months.filter((month) => {
    const year = Number(month.slice(0, 4));
    return year >= from && year <= to;
  });
  const pool = inside.length > 0 ? inside : months;
  const key = preferred.slice(0, 7);
  return pool.find((month) => month.slice(0, 7) === key) ?? pool[pool.length - 1] ?? "";
}

export function pointAtMonth(points: Pt[], iso: string): Pt | undefined {
  if (!iso) return undefined;
  const t = toT(iso);
  return points.find((p) => Math.abs(p.t - t) < 1 / 24);
}

export function columnHeader(col: RentColumn, baseline: string | null): string {
  // A comparison renames the column to the place ("London"). A single place
  // keeps the home name ("All homes", "2 bedrooms").
  const generic = columnLabel(col.category, col.measure);
  const named = col.label !== generic && col.label !== categoryLabel(col.category);
  if (col.measure === "index") {
    const index = baseline ? `Index (${baseline})` : "Index";
    return named ? `${col.label} · ${index}` : index;
  }
  if (col.measure === "annual-change") {
    return named ? `${col.label} · annual change` : `${col.category === "all" ? "All homes" : col.label} · annual change`;
  }
  if (named || col.category !== "all") return `${col.label} · £`;
  return "All homes · £";
}

/**
 * Economy Domain 09 — Trade, Investment & Business helpers.
 * Dimensions live in observation notes (series= / category= / flow=).
 * Display labels never show raw slugs, CDIDs, or note dumps.
 */

import type { Observation } from "@/lib/api";
import { toT } from "../data";

/** ISO 3166-1 alpha-2 → Natural Earth ADM0_A3 for choropleth. */
const ISO2_TO_A3: Record<string, string> = {
  AT: "AUT",
  BE: "BEL",
  BG: "BGR",
  HR: "HRV",
  CY: "CYP",
  CZ: "CZE",
  DK: "DNK",
  EE: "EST",
  FI: "FIN",
  FR: "FRA",
  DE: "DEU",
  GR: "GRC",
  HU: "HUN",
  IE: "IRL",
  IT: "ITA",
  LV: "LVA",
  LT: "LTU",
  LU: "LUX",
  MT: "MLT",
  NL: "NLD",
  PL: "POL",
  PT: "PRT",
  RO: "ROU",
  SK: "SVK",
  SI: "SVN",
  ES: "ESP",
  SE: "SWE",
  GB: "GBR",
  US: "USA",
  CN: "CHN",
  JP: "JPN",
  IN: "IND",
  CA: "CAN",
  AU: "AUS",
  BR: "BRA",
  MX: "MEX",
  KR: "KOR",
  CH: "CHE",
  NO: "NOR",
  TR: "TUR",
  SA: "SAU",
  AE: "ARE",
  SG: "SGP",
  ZA: "ZAF",
  NG: "NGA",
  EG: "EGY",
  IL: "ISR",
  RU: "RUS",
  UA: "UKR",
  NZ: "NZL",
  TW: "TWN",
  HK: "HKG",
  ID: "IDN",
  MY: "MYS",
  TH: "THA",
  VN: "VNM",
  PH: "PHL",
  PK: "PAK",
  BD: "BGD",
  AR: "ARG",
  CL: "CHL",
  CO: "COL",
  PE: "PER",
  QA: "QAT",
  KW: "KWT",
  IQ: "IRQ",
  DZ: "DZA",
  MA: "MAR",
  AL: "ALB",
  BY: "BLR",
  IR: "IRN",
  IS: "ISL",
  ME: "MNE",
  RS: "SRB",
  UY: "URY",
  VE: "VEN",
};

/**
 * ONS FDI partner geography_code (upper-case slug) → Natural Earth ADM0_A3.
 * Aggregates and territories without a 110m country fill stay off the map.
 */
const FDI_CODE_TO_A3: Record<string, string> = {
  AUSTRALIA: "AUS",
  AUSTRIA: "AUT",
  BELGIUM: "BEL",
  BRAZIL: "BRA",
  BULGARIA: "BGR",
  CANADA: "CAN",
  CHILE: "CHL",
  CHINA: "CHN",
  COLOMBIA: "COL",
  CROATIA: "HRV",
  CYPRUS: "CYP",
  "CZECH-REPUBL": "CZE",
  DENMARK: "DNK",
  ESTONIA: "EST",
  FINLAND: "FIN",
  FRANCE: "FRA",
  GERMANY: "DEU",
  GREECE: "GRC",
  HUNGARY: "HUN",
  INDIA: "IND",
  INDONESIA: "IDN",
  "IRISH-REPUBL": "IRL",
  ITALY: "ITA",
  JAPAN: "JPN",
  KENYA: "KEN",
  LATVIA: "LVA",
  LITHUANIA: "LTU",
  LUXEMBOURG: "LUX",
  MALAYSIA: "MYS",
  MEXICO: "MEX",
  NETHERLANDS: "NLD",
  "NEW-ZEALAND": "NZL",
  NIGERIA: "NGA",
  NORWAY: "NOR",
  PANAMA: "PAN",
  POLAND: "POL",
  PORTUGAL: "PRT",
  ROMANIA: "ROU",
  RUSSIA: "RUS",
  SLOVAKIA: "SVK",
  SLOVENIA: "SVN",
  "SOUTH-AFRICA": "ZAF",
  "SOUTH-KOREA": "KOR",
  SPAIN: "ESP",
  SWEDEN: "SWE",
  SWITZERLAND: "CHE",
  THAILAND: "THA",
  USA: "USA",
  ZIMBABWE: "ZWE",
};

/** FDI aggregates / territories absent from Natural Earth 110m — RankBars only. */
const FDI_OFF_MAP = new Set([
  "BELGIUM-LUXE",
  "BERMUDA",
  "GULF-ARABIAN",
  "HONG-KONG",
  "MALTA",
  "SINGAPORE",
  "UK-OFFSHORE-",
]);

const SERVICE_LABELS: Record<string, string> = {
  manufacturing: "Manufacturing services on physical inputs",
  "maintenance-and-repair": "Maintenance and repair",
  transportation: "Transport",
  travel: "Travel",
  construction: "Construction",
  "insurance-and-pension": "Insurance and pension",
  financial: "Financial",
  "intellectual-property": "Intellectual property charges",
  "telecommunications-computer-and-information-serv": "Telecoms, computer and information",
  "telecommunications-computer-and-information": "Telecoms, computer and information",
  "other-business-services": "Other business services",
  "other-business": "Other business services",
  "personal-cultural-and-recreational": "Personal, cultural and recreational",
  government: "Government goods and services",
};

export function iso2ToA3(code: string): string | null {
  const c = code.trim().toUpperCase();
  if (c.length === 3) return c;
  return ISO2_TO_A3[c] ?? null;
}

/**
 * Map an ONS FDI partner code to Natural Earth ADM0_A3.
 * Returns null for aggregates and unknown codes — never invent a country fill.
 */
export function fdiPartnerToA3(code: string): string | null {
  const c = code.trim().toUpperCase();
  if (!c || FDI_OFF_MAP.has(c)) return null;
  return FDI_CODE_TO_A3[c] ?? null;
}

export function notePart(notes: string, key: string): string {
  for (const part of notes.split(";")) {
    const chunk = part.trim();
    if (chunk.startsWith(`${key}=`)) return chunk.slice(key.length + 1).trim();
  }
  return "";
}

/** Title-case a slug without exposing it raw. */
export function humanizeSlug(raw: string): string {
  if (!raw) return "—";
  if (SERVICE_LABELS[raw]) return SERVICE_LABELS[raw];
  let text = raw
    .replace(/^sitc-\d+\s*/i, "")
    .replace(/^\d{1,2}(-\d{1,2})?\s*:\s*/, "") // "69-75 : Professional…"
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Publisher typos that would otherwise appear on the stage.
  text = text
    .replace(/manufatures/gi, "manufactures")
    .replace(/Miscellanous/gi, "Miscellaneous")
    .replace(/miscellanous/gi, "miscellaneous");
  // Publisher labels already have readable casing — keep them.
  if (/[A-Z]/.test(text)) return text;
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function displayLabel(notes: string, fallback = "—"): string {
  const labelled = notePart(notes, "label");
  if (labelled) return humanizeSlug(labelled);
  const service = notePart(notes, "service");
  if (service && service !== "total-services") return humanizeSlug(service);
  const category = notePart(notes, "category");
  if (category) return humanizeSlug(category);
  return fallback;
}

export function filterNotes(
  rows: Observation[],
  pred: (notes: string) => boolean,
): Observation[] {
  return rows.filter((r) => pred(r.notes ?? ""));
}

export function pointsFrom(rows: Observation[]): { t: number; v: number }[] {
  return rows
    .filter((r) => r.value != null && Number.isFinite(r.value))
    .map((r) => ({ t: toT(r.period_start), v: r.value as number }))
    .sort((a, b) => a.t - b.t);
}

export function quarterlyPoints(rows: Observation[]): { t: number; v: number }[] {
  return pointsFrom(rows);
}

export function annualPoints(rows: Observation[]): { t: number; v: number }[] {
  return pointsFrom(rows);
}

export function latestValue(rows: Observation[]): number | null {
  const pts = pointsFrom(rows);
  return pts.length ? pts[pts.length - 1]!.v : null;
}

export function fmtGbpM(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}bn`;
  return `${Math.round(v).toLocaleString("en-GB")}m`;
}

export function fmtCount(v: number): string {
  return Math.round(v).toLocaleString("en-GB");
}

export function periodYears(rows: Observation[]): string[] {
  const years = new Set(rows.map((r) => r.period_start.slice(0, 4)));
  return [...years].sort();
}

export function rowsForYear(rows: Observation[], year: string): Observation[] {
  return rows.filter((r) => r.period_start.startsWith(year));
}

export function latestPeriod(rows: Observation[]): string {
  const periods = [...new Set(rows.map((r) => r.period_start))].sort();
  return periods[periods.length - 1] ?? "";
}

/** Top-level EBOPS only (codes without a dot), excluding the published total. */
export function isTopLevelService(notes: string): boolean {
  const code = notePart(notes, "service_code");
  const category = notePart(notes, "category");
  if (category === "total-services" || code === "0") return false;
  if (!code) return !category.includes("-"); // weak fallback
  return !code.includes(".");
}

export function isUkEnterpriseGeo(row: Observation): boolean {
  const label = (row.geography_label || "").trim().toUpperCase();
  const code = (row.geography_code || "").trim().toUpperCase();
  return label === "UNITED KINGDOM" || code === "K02000001";
}

export function isIndustryDetail(notes: string): boolean {
  const cat = notePart(notes, "category");
  return Boolean(cat) && !cat.startsWith("total");
}

export function isAssetDetail(notes: string): boolean {
  const cat = notePart(notes, "category");
  return Boolean(cat) && cat !== "total";
}

/** England & Wales seasonally adjusted company insolvency total. */
export function isInsolvencyHeadline(row: Observation): boolean {
  const notes = row.notes ?? "";
  if (notePart(notes, "category") !== "total-sa") return false;
  const label = (row.geography_label || "").toLowerCase();
  return label.includes("england") && label.includes("wales");
}

export function formatPeriod(iso: string, cadence: "monthly" | "quarterly" | "annual"): string {
  const y = iso.slice(0, 4);
  const m = Number(iso.slice(5, 7) || "1");
  if (cadence === "annual") return y;
  if (cadence === "quarterly") {
    const q = Math.floor((m - 1) / 3) + 1;
    return `${y} Q${q}`;
  }
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[m - 1] ?? iso.slice(5, 7)} ${y}`;
}

/* ── Calendar-year totals (Trade & Investment restructure, 2026-11-16) ───────────────── */

export type Ranked = { id: string; label: string; v: number };

/** ISO 3166-1 alpha-2 country codes only — drops EU27 (B5), Non-EU (D5), World (W1), residual groups. */
export function isIsoCountry(code: string): boolean {
  return /^[A-Z]{2}$/.test(code.trim());
}

/** Months (or quarters, or years) published in each calendar year of a monthly/quarterly/annual series. */
export function periodsPerYear(rows: Observation[]): Map<string, number> {
  const seen = new Map<string, Set<string>>();
  for (const r of rows) {
    const y = r.period_start.slice(0, 4);
    const set = seen.get(y) ?? new Set<string>();
    set.add(r.period_start.slice(0, 10));
    seen.set(y, set);
  }
  return new Map([...seen].map(([y, s]) => [y, s.size]));
}

/** Latest calendar year whose every period is published (12 months, 4 quarters or 1 year). */
export function latestFullYear(rows: Observation[], perYear: 1 | 4 | 12): string {
  const counts = periodsPerYear(rows);
  const full = [...counts].filter(([, n]) => n >= perYear).map(([y]) => y).sort();
  return full[full.length - 1] ?? "";
}

/**
 * Sum one calendar year per key (category, partner, nation). Only rows passing `pred` count.
 * Flow values are additive across months in current prices — never use for rates or indices.
 */
export function yearTotals(
  rows: Observation[],
  year: string,
  keyOf: (r: Observation) => string,
  labelOf: (r: Observation) => string,
  pred: (r: Observation) => boolean = () => true,
): Ranked[] {
  const by = new Map<string, Ranked>();
  for (const r of rows) {
    if (!r.period_start.startsWith(year)) continue;
    if (r.value == null || !Number.isFinite(r.value) || !pred(r)) continue;
    const id = keyOf(r);
    if (!id) continue;
    const prev = by.get(id);
    by.set(id, { id, label: prev?.label ?? labelOf(r), v: (prev?.v ?? 0) + r.value });
  }
  return [...by.values()].sort((a, b) => b.v - a.v);
}

/**
 * One line per key, one point per complete calendar year (partial years are left out so the
 * last point is never a year-to-date dip). Points sit at mid-year.
 */
export function calendarYearSeries(
  rows: Observation[],
  perYear: 1 | 4 | 12,
  keyOf: (r: Observation) => string,
  pred: (r: Observation) => boolean = () => true,
): Map<string, { t: number; v: number }[]> {
  const kept = rows.filter((r) => r.value != null && Number.isFinite(r.value) && pred(r));
  const counts = new Map<string, Set<string>>();
  const sums = new Map<string, Map<string, number>>();
  for (const r of kept) {
    const key = keyOf(r);
    if (!key) continue;
    const y = r.period_start.slice(0, 4);
    const ck = `${key}|${y}`;
    const set = counts.get(ck) ?? new Set<string>();
    set.add(r.period_start.slice(0, 10));
    counts.set(ck, set);
    const byYear = sums.get(key) ?? new Map<string, number>();
    byYear.set(y, (byYear.get(y) ?? 0) + (r.value as number));
    sums.set(key, byYear);
  }
  const out = new Map<string, { t: number; v: number }[]>();
  for (const [key, byYear] of sums) {
    const pts = [...byYear]
      .filter(([y]) => (counts.get(`${key}|${y}`)?.size ?? 0) >= perYear)
      .map(([y, v]) => ({ t: Number(y), v }))
      .sort((a, b) => a.t - b.t);
    out.set(key, pts);
  }
  return out;
}

/** "Jan–Sep 2026" for a year to date, otherwise "2026". */
export function yearLabel(year: string, months: number): string {
  if (!year || months >= 12) return year;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Jan–${names[Math.max(0, months - 1)]} ${year}`;
}

/** FDI partner slug → display name (ONS publishes upper-case slugs as geography codes). */
export function fdiPartnerLabel(code: string, label: string): string {
  const raw = (label || code).trim();
  if (/[a-z]/.test(raw)) return raw;
  return raw
    .toLowerCase()
    .replace(/-+$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUsa\b/, "United States")
    .replace(/\bUk\b/, "UK")
    .replace(/Irish Republ$/, "Ireland")
    .replace(/Czech Republ$/, "Czech Republic")
    .replace(/Belgium Luxe$/, "Belgium and Luxembourg");
}

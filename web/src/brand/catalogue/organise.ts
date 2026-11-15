import type { IndicatorListItem } from "@/lib/api";
import { DOMAIN_SOURCES } from "../housing/domain-sources";
import { SECTOR_PAGES } from "../sector-pages";
import { SECTORS } from "../sectors";

/**
 * Catalogue organisation and plain words.
 *
 * The API speaks in registry terms (publisher acronyms, frequency codes, geography codes,
 * survey initials). The page speaks in sentences. Everything here is display-only: the
 * registry wording stays available in the record's Reference line.
 */

/* ——— Sectors and research domains ——— */

export type DomainGroup = { id: string; title: string; rows: IndicatorListItem[] };

/** Housing is the one sector not served by `sector-pages.ts`; titles follow `housing/canvas/model.tsx`. */
const HOUSING_DOMAINS: { id: keyof typeof DOMAIN_SOURCES; title: string }[] = [
  { id: "prices", title: "House prices and transactions" },
  { id: "renting", title: "Renting" },
  { id: "affordability", title: "Affordability" },
  { id: "stock", title: "Housing stock and tenure" },
  { id: "supply", title: "Construction and supply" },
  { id: "land", title: "Planning and land" },
  { id: "quality", title: "Housing quality" },
  { id: "insecurity", title: "Housing insecurity" },
  { id: "ownership", title: "Ownership and property economics" },
  { id: "policy", title: "Housing policy" },
];

function domainsFor(sectorId: string): { id: string; title: string; series: readonly string[] }[] {
  if (sectorId === "housing-land") {
    return HOUSING_DOMAINS.map((d) => ({ ...d, series: DOMAIN_SOURCES[d.id] }));
  }
  const config = Object.values(SECTOR_PAGES).find((s) => s.sectorId === sectorId);
  return config ? config.domains.map((d) => ({ id: d.id, title: d.title, series: d.series })) : [];
}

/** Rows of one sector, grouped by its research domains in rail order; the rest under "Other series". */
export function groupByDomain(sectorId: string, rows: IndicatorListItem[]): DomainGroup[] {
  const domains = domainsFor(sectorId);
  const placed = new Set<string>();
  const groups: DomainGroup[] = [];
  for (const d of domains) {
    const members = rows.filter((r) => !placed.has(r.indicator_id) && d.series.includes(r.indicator_id));
    members.forEach((m) => placed.add(m.indicator_id));
    if (members.length) groups.push({ id: d.id, title: d.title, rows: members });
  }
  const rest = rows.filter((r) => !placed.has(r.indicator_id));
  if (rest.length) groups.push({ id: "other", title: domains.length ? "Other series" : "Series", rows: rest });
  return groups;
}

export const sectorNumber = (sectorId: string) => {
  const i = SECTORS.findIndex((s) => s.id === sectorId);
  return i >= 0 ? String(i + 1).padStart(2, "0") : "";
};

/* ——— Sources (publishers) ——— */

const PUBLISHER_NAMES: Record<string, string> = {
  ONS: "Office for National Statistics",
  "Office for National Statistics": "Office for National Statistics",
  MHCLG: "Ministry of Housing, Communities and Local Government",
  DESNZ: "Department for Energy Security and Net Zero",
  NESO: "National Energy System Operator",
  NSTA: "North Sea Transition Authority",
  BoE: "Bank of England",
  HMT: "HM Treasury",
  DfT: "Department for Transport",
  DfE: "Department for Education",
  GLA: "Greater London Authority",
  "The National Archives (legislation.gov.uk)": "The National Archives",
};

/** The body that publishes it: the part before any " · " collection name. */
export function publisherKey(p: string): string {
  return p.split(" · ")[0]!.trim();
}

/** "ONS via Nomis" → "Office for National Statistics via Nomis"; "MHCLG / Planning Data" → "… and Planning Data". */
export function publisherName(p: string): string {
  const head = publisherKey(p);
  if (PUBLISHER_NAMES[head]) return PUBLISHER_NAMES[head];
  return head
    .split(/\s*[/;]\s*/)
    .map((part) => part.replace(/\b([A-Z][A-Za-z]{1,5})\b/g, (m) => PUBLISHER_NAMES[m] ?? m))
    .join(" and ");
}

/** The collection after the body, e.g. "English Housing Survey". */
export function publisherCollection(p: string): string {
  return p.split(" · ").slice(1).join(" · ").trim();
}

/* ——— How often, when, where ——— */

export type FreqKey = "monthly" | "quarterly" | "annual" | "irregular";

export function freqOf(f: string): FreqKey {
  const w = f.toLowerCase();
  if (w.startsWith("monthly")) return "monthly";
  if (w.startsWith("quarterly")) return "quarterly";
  if (w.startsWith("annual")) return "annual";
  return "irregular";
}

export const FREQ_WORDS: Record<FreqKey, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Yearly",
  irregular: "One-off",
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymd = (iso: string) => iso.slice(0, 10).split("-").map(Number) as [number, number, number];

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = ymd(iso);
  return `${d} ${MON[m - 1]} ${y}`;
}

/** "Jan 1989 to Sep 2026", "Q1 1998 to Q1 2026", "1991 to 2025", "2021". */
export function fmtSpan(it: IndicatorListItem): string {
  if (!it.coverage_start || !it.coverage_end) return "";
  const [sy, sm] = ymd(it.coverage_start);
  const [ey, em] = ymd(it.coverage_end);
  const f = freqOf(it.frequency);
  if (f === "monthly") return `${MON[sm - 1]} ${sy} to ${MON[em - 1]} ${ey}`;
  if (f === "quarterly") return `Q${Math.ceil(sm / 3)} ${sy} to Q${Math.ceil(em / 3)} ${ey}`;
  return sy === ey ? String(sy) : `${sy} to ${ey}`;
}

/** The latest period with a figure, in the dataset's own cadence: "Aug 2026", "Q2 2026", "2025". */
export function fmtLatest(it: IndicatorListItem): string {
  if (!it.coverage_end) return "—";
  const [y, m] = ymd(it.coverage_end);
  const f = freqOf(it.frequency);
  if (f === "monthly") return `${MON[m - 1]} ${y}`;
  if (f === "quarterly") return `Q${Math.ceil(m / 3)} ${y}`;
  return String(y);
}

/** "Monthly · Jan 1989 to Sep 2026". */
export function fmtPeriod(it: IndicatorListItem): string {
  const span = fmtSpan(it);
  return span ? `${FREQ_WORDS[freqOf(it.frequency)]} · ${span}` : FREQ_WORDS[freqOf(it.frequency)];
}

/**
 * Where the figures cover, in words: drop ONS codes, registry notes and "not UK" warnings.
 * "United Kingdom (K02000001); excl. Crown dependencies" → "United Kingdom".
 */
export function placeName(g: string): string {
  let s = g.split(";")[0]!;
  s = s.replace(/\s*\([^)]*\)/g, "");
  s = s.split(" — ")[0]!;
  s = s.replace(/\bUK\b/g, "United Kingdom").replace(/\bE&W\b/g, "England and Wales").replace(/\bGB\b/g, "Great Britain");
  s = s.replace(/\s+time series$/i, "");
  return s.trim() || "—";
}

/** The full geography note for the record, codes removed. */
export function placeDetail(g: string): string {
  return g.replace(/\s*\([A-Z]\d{8}(?:[–-][A-Z]?\d{8})?\)/g, "").trim();
}

/* ——— Titles and licences ——— */

const TITLE_WORDS: [RegExp, string][] = [
  [/\bEHS\b/g, "English Housing Survey"],
  [/\bBRES\b/g, "Business Register and Employment Survey"],
  [/\bASHE\b/g, "Annual Survey of Hours and Earnings"],
  [/\bEPC\b/g, "Energy Performance Certificate"],
  [/\bUKCS\b/g, "UK Continental Shelf"],
  [/\bHPI\b/g, "House Price Index"],
  [/\bNSTA\b/g, "North Sea Transition Authority"],
];

/** Survey initials spelled out; everything else as the registry titles it. */
export function plainTitle(title: string): string {
  let t = title;
  for (const [re, word] of TITLE_WORDS) t = t.replace(re, word);
  return t;
}

/** What the licence lets a reader do, in one line. */
/**
 * The licence as the source grants it. Only a plain Open Government Licence is put in everyday
 * words; mixed or other terms (Bank of England, Ofwat, NESO, NSTA, CC BY, Land Registry) are shown
 * in full so a reuser reads the actual permission.
 */
export function licenceWords(l: string): string {
  if (!l) return "Not recorded";
  if (/^\s*open government licence(\s+v?3(\.0)?)?\s*$/i.test(l)) return "Open Government Licence v3.0: free to reuse with attribution";
  return l.trim();
}

export const fmtCount = (n: number) => n.toLocaleString("en-GB");

export function fmtBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/* ——— The rail: one row per sector, plus everything ——— */

import { PLATES, type PlateName } from "../Plate";

export const ALL = "all";

const SECTOR_QUESTIONS: Record<string, string> = {
  [ALL]: "What has Britain measured about itself?",
  "housing-land": "What do we know about Britain's homes and land?",
  "economy-public-finance": "What do we know about Britain's economy and public finances?",
  "energy-industry": "What do we know about Britain's energy and industry?",
  "people-society": "What do we know about the people of Britain?",
  "government-politics": "What do we know about how Britain is governed?",
  infrastructure: "What do we know about the networks Britain shares?",
  "regions-places": "What do we know about Britain's regions and places?",
  "history-change": "What do we know about how Britain has changed?",
};

export const sectorQuestion = (id: string) => SECTOR_QUESTIONS[id] ?? "What has been measured?";

/** The sector's own hero plate, shown in the rail; the globe for everything. */
export function sectorRailPlate(id: string): { src: string; alt?: string } | undefined {
  const name: PlateName | undefined =
    id === ALL
      ? "globe"
      : id === "housing-land"
        ? "housesFull"
        : Object.values(SECTOR_PAGES).find((s) => s.sectorId === id)?.plate.name;
  if (!name) return undefined;
  const entry = PLATES[name] as { portrait?: string; wide?: string; alt: string };
  const src = entry.portrait ?? entry.wide;
  return src ? { src, alt: entry.alt } : undefined;
}

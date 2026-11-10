/**
 * Housing Domain 10 — event register helpers.
 * The register itself loads from pack `housing.policy-events` (Supabase Storage via API).
 * Never import data/housing/policy-events/*.json into the Next bundle.
 */

import { toT } from "../../../data";
import type { Era, EventType, Nation, PolicyEvent, Relationship } from "./types";

export const TYPE_LABEL: Record<EventType, string> = {
  act: "Act",
  statutory_instrument: "Regulation or order",
  programme: "Programme",
  institution: "Institution",
};
export const TYPE_PLURAL: Record<EventType, string> = {
  act: "Acts",
  statutory_instrument: "Regulations and orders",
  programme: "Programmes",
  institution: "Institutions",
};
export const MARK_DATE_LABEL: Record<EventType, string> = {
  act: "Royal Assent",
  statutory_instrument: "Made",
  programme: "Started",
  institution: "Established",
};
export const NATION_LABEL: Record<Nation, string> = {
  england: "England",
  wales: "Wales",
  scotland: "Scotland",
  "northern-ireland": "Northern Ireland",
};

/** Sentence-case label for a status slug from the register. */
export function statusLabel(status: string): string {
  const s = status.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const topicLabel = statusLabel;

/** Month and year only, for dates whose source gives no day ("June 2018"). */
export function formatIsoMonth(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  const [year, month] = iso.split("-").map(Number);
  if (!year) return "Not recorded";
  return new Date(Date.UTC(year, (month ?? 1) - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Day-first date. Null means the record did not pin a date — it is not estimated. */
export function formatIso(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year) return "Not recorded";
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The date that places an event's mark, by type. */
export function markDate(e: PolicyEvent): string | null {
  return e.type === "act" || e.type === "statutory_instrument"
    ? e.enactment_date
    : (e.start_date ?? e.enactment_date ?? null);
}
export const markT = (e: PolicyEvent): number | null => {
  const d = markDate(e);
  return d ? toT(d) : null;
};
export const markYear = (e: PolicyEvent): number | null => {
  const d = markDate(e);
  return d ? Number(d.slice(0, 4)) : null;
};

export function orderedEvents(events: PolicyEvent[]): PolicyEvent[] {
  return [...events].sort((a, b) => (markDate(a) ?? "9999").localeCompare(markDate(b) ?? "9999"));
}

export function eventById(events: PolicyEvent[], id: string | null): PolicyEvent | null {
  if (!id) return null;
  return events.find((event) => event.id === id) ?? null;
}

export function eventsInEra(era: Era, events: PolicyEvent[]): PolicyEvent[] {
  return events.filter((event) => {
    const year = markYear(event);
    if (year == null) return false;
    if (era.from != null && year < era.from) return false;
    if (era.to != null && year > era.to) return false;
    return true;
  });
}

export function eraOf(e: PolicyEvent, eras: Era[]): Era | null {
  return eras.find((era) => eventsInEra(era, [e]).length > 0) ?? null;
}

/** Edges touching an event, each with the other end resolved. */
export function relationshipsOf(
  id: string,
  relationships: Relationship[],
  events: PolicyEvent[],
): { rel: Relationship; other: PolicyEvent | null; outgoing: boolean }[] {
  return relationships
    .filter((r) => r.from === id || r.to === id)
    .map((rel) => ({
      rel,
      outgoing: rel.from === id,
      other: eventById(events, rel.from === id ? rel.to : rel.from),
    }));
}

/** Predecessors → event → successors along "succeeded" / "replaced" edges (institutional lineage). */
export function lineageOf(id: string, relationships: Relationship[], events: PolicyEvent[]): PolicyEvent[] {
  const succ = (x: string) =>
    relationships.find((r) => (r.kind === "succeeded" || r.kind === "replaced") && r.from === x)?.to;
  const pred = (x: string) =>
    relationships.find((r) => (r.kind === "succeeded" || r.kind === "replaced") && r.to === x)?.from;
  const chain: string[] = [id];
  for (let p = pred(id); p && !chain.includes(p); p = pred(p)) chain.unshift(p);
  for (let n = succ(id); n && !chain.includes(n); n = succ(n)) chain.push(n);
  return chain.map((x) => eventById(events, x)).filter((x): x is PolicyEvent => x != null);
}

/** Counts by type and the covered span — the coverage statement is always derived, never typed in. */
export function coverage(events: PolicyEvent[]) {
  const byType = (Object.keys(TYPE_LABEL) as EventType[])
    .map((t) => ({ type: t, n: events.filter((e) => e.type === t).length }))
    .filter((x) => x.n > 0);
  const years = events.map(markYear).filter((y): y is number => y != null);
  const nations = (Object.keys(NATION_LABEL) as Nation[]).map((n) => ({
    nation: n,
    n: events.filter((e) => e.nations?.includes(n)).length,
  }));
  return {
    total: events.length,
    byType,
    from: years.length ? Math.min(...years) : null,
    to: years.length ? Math.max(...years) : null,
    nations,
  };
}

export function coverageSentence(events: PolicyEvent[], retrievedAt: string): string {
  const c = coverage(events);
  const parts = c.byType.map(
    (x) => `${x.n} ${(x.n === 1 ? TYPE_LABEL[x.type] : TYPE_PLURAL[x.type]).toLowerCase()}`,
  );
  const span = c.from != null ? `, ${c.from}–${c.to}` : "";
  return `An initial collection: ${parts.join(", ")}${span}, each read against its primary source on ${formatIso(retrievedAt)}. It is not the statute book or a complete policy history.`;
}

export function normaliseEvents(events: PolicyEvent[]): PolicyEvent[] {
  return events.map((e) => ({ ...e, type: (e.type ?? "act") as EventType }));
}

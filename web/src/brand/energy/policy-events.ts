/**
 * Energy Domain 10 — industrial policy event register.
 * JSON is the record; this module only reads it. Marks = Royal Assent (acts) or start (programmes).
 */

import raw from "../../../../data/energy/industrial-policy/events.json";
import type {
  Era,
  EventRegistry,
  EventType,
  Nation,
  PolicyEvent,
  Relationship,
} from "../housing/canvas/policy/types";

const registry = raw as unknown as EventRegistry;

export const POLICY_EVENTS: PolicyEvent[] = registry.events.map((e) => ({
  ...e,
  type: (e.type ?? "act") as EventType,
}));
export const POLICY_RETRIEVED = registry.retrieved_at;
export const POLICY_NOTE = registry.note;
export const POLICY_ERAS: Era[] = registry.eras ?? [];
export const RELATIONSHIPS: Relationship[] = registry.relationships ?? [];

export const TYPE_LABEL: Record<EventType, string> = {
  act: "Act",
  statutory_instrument: "Statutory instrument",
  programme: "Programme",
  institution: "Institution",
};

export const MARK_DATE_LABEL: Record<EventType, string> = {
  act: "Royal Assent",
  statutory_instrument: "Made",
  programme: "Published",
  institution: "Established",
};

export const NATION_LABEL: Record<Nation, string> = {
  england: "England",
  wales: "Wales",
  scotland: "Scotland",
  "northern-ireland": "Northern Ireland",
};

export function statusLabel(status: string): string {
  const s = status.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

export function markDate(e: PolicyEvent): string | null {
  return e.type === "act" || e.type === "statutory_instrument"
    ? e.enactment_date
    : (e.start_date ?? e.enactment_date ?? null);
}

export function markYear(e: PolicyEvent): number | null {
  const d = markDate(e);
  return d ? Number(d.slice(0, 4)) : null;
}

export const ORDERED: PolicyEvent[] = [...POLICY_EVENTS].sort((a, b) =>
  (markDate(a) ?? "9999").localeCompare(markDate(b) ?? "9999"),
);

export function eventById(id: string | null): PolicyEvent | null {
  if (!id) return null;
  return POLICY_EVENTS.find((e) => e.id === id) ?? null;
}

export function eraOf(e: PolicyEvent): Era | null {
  const y = markYear(e);
  if (y == null) return null;
  return POLICY_ERAS.find((era) => {
    if (era.from != null && y < era.from) return false;
    if (era.to != null && y > era.to) return false;
    return true;
  }) ?? null;
}

export function relationshipsOf(id: string): Relationship[] {
  return RELATIONSHIPS.filter((r) => r.from === id || r.to === id);
}

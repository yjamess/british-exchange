/**
 * Energy Domain 10 — industrial policy event register.
 * Pack: energy.industrial-policy-events (API / Storage — never a webpack data/ import).
 */

import { fetchPackJson } from "@/lib/api";
import type {
  Era,
  EventRegistry,
  EventType,
  Nation,
  PolicyEvent,
  Relationship,
} from "../housing/canvas/policy/types";

export type PolicyEventsPack = {
  events: PolicyEvent[];
  retrieved_at: string;
  note: string;
  eras: Era[];
  relationships: Relationship[];
};

/** Fallback when the pack is not requested for this domain or the API is unavailable. */
export const EMPTY_POLICY_EVENTS_PACK: PolicyEventsPack = {
  events: [],
  retrieved_at: "",
  note: "",
  eras: [],
  relationships: [],
};

export async function loadPolicyEventsPack(): Promise<PolicyEventsPack> {
  const registry = await fetchPackJson<EventRegistry>("energy.industrial-policy-events");
  return {
    events: registry.events.map((e) => ({
      ...e,
      type: (e.type ?? "act") as EventType,
    })),
    retrieved_at: registry.retrieved_at,
    note: registry.note,
    eras: registry.eras ?? [],
    relationships: registry.relationships ?? [],
  };
}

export function orderedPolicyEvents(events: PolicyEvent[]): PolicyEvent[] {
  return [...events].sort((a, b) => (markDate(a) ?? "9999").localeCompare(markDate(b) ?? "9999"));
}

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

/** Short date for figure strips — long month names overwhelm Archivo figures. */
export function formatIsoShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year) return "—";
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
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

export function eventById(events: PolicyEvent[], id: string | null): PolicyEvent | null {
  if (!id) return null;
  return events.find((e) => e.id === id) ?? null;
}

export function eraOf(e: PolicyEvent, eras: Era[]): Era | null {
  const y = markYear(e);
  if (y == null) return null;
  return (
    eras.find((era) => {
      if (era.from != null && y < era.from) return false;
      if (era.to != null && y > era.to) return false;
      return true;
    }) ?? null
  );
}

export function relationshipsOf(relationships: Relationship[], id: string): Relationship[] {
  return relationships.filter((r) => r.from === id || r.to === id);
}

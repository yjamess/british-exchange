/**
 * Domain 05 — Shock & Response editorial register.
 * JSON is the record; this module only reads it. Overlap with Ready series is context, never cause.
 */

import raw from "../../../../data/energy/energy-imports-security/shock-events.json";
import type {
  GasMode,
  InterconnectorCorridor,
  InterconnectorFlow,
  LifelineFlow,
} from "./imports-model";

export type ShockKind = "disruption" | "commissioning" | "trade-shift";

export type ShockChart =
  | {
      kind: "interconnector";
      corridor: InterconnectorCorridor;
      flow: InterconnectorFlow;
    }
  | {
      kind: "gas-partners";
      partners: string[];
      flow: LifelineFlow;
      mode: GasMode;
    }
  | {
      kind: "oil-partner";
      partner: string;
    }
  | {
      kind: "lng-total";
    }
  | {
      kind: "dependency";
    };

export type ShockSource = {
  label: string;
  url: string;
  role: "primary" | "official" | "explanatory";
};

export type ShockFollow = {
  label: string;
  href: string;
};

export type ShockEvent = {
  id: string;
  title: string;
  kind: ShockKind;
  mark_date: string;
  mark_label: string;
  jurisdiction: string;
  summary: string;
  alternate_reading: string;
  chart: ShockChart;
  follow: ShockFollow[];
  sources: ShockSource[];
};

type ShockRegistry = {
  registry_id: string;
  title: string;
  retrieved_at: string;
  note: string;
  events: ShockEvent[];
};

const registry = raw as ShockRegistry;

export const SHOCK_EVENTS: ShockEvent[] = registry.events;
export const SHOCK_RETRIEVED = registry.retrieved_at;
export const SHOCK_NOTE = registry.note;

export const SHOCK_KIND_LABEL: Record<ShockKind, string> = {
  disruption: "Disruption",
  commissioning: "Commissioning",
  "trade-shift": "Trade shift",
};

export function shockById(id: string | null | undefined): ShockEvent | undefined {
  if (!id) return undefined;
  return SHOCK_EVENTS.find((e) => e.id === id);
}

export function defaultShockId(): string {
  return SHOCK_EVENTS[0]?.id ?? "";
}

export function markYear(event: ShockEvent): number {
  return Number(event.mark_date.slice(0, 4));
}

export function formatMarkDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

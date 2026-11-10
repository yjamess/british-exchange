/**
 * Electricity Generation — ET 5.1 fuel taxonomy for Changing Current.
 * Aggregates (Total wind, Total all generating companies) are never summed with components.
 * See docs/agent-kickoff-generation.md.
 */

import { followFuelConnection } from "../connections/energy";

export type FuelId =
  | "coal"
  | "gas"
  | "nuclear"
  | "onshore-wind"
  | "offshore-wind"
  | "solar"
  | "hydro"
  | "bioenergy"
  | "oil"
  | "other"
  | "storage";

/** Five-layer stack history for TimeChart (brand stack fills: ink / green / mustard / hatch). */
export type StackGroupId = "coal" | "gas" | "nuclear" | "renewables" | "other";

export type FuelDef = {
  id: FuelId;
  label: string;
  /** Exact ET 5.1 `fuel=` labels that roll into this display id. */
  sourceLabels: readonly string[];
  stack: StackGroupId;
};

/** Display fuels in composition order (largest historic story first). */
export const FUELS: readonly FuelDef[] = [
  { id: "coal", label: "Coal", sourceLabels: ["Coal"], stack: "coal" },
  { id: "gas", label: "Gas", sourceLabels: ["Gas"], stack: "gas" },
  { id: "nuclear", label: "Nuclear", sourceLabels: ["Nuclear"], stack: "nuclear" },
  { id: "onshore-wind", label: "Onshore wind", sourceLabels: ["Onshore wind"], stack: "renewables" },
  { id: "offshore-wind", label: "Offshore wind", sourceLabels: ["Offshore wind"], stack: "renewables" },
  { id: "solar", label: "Solar", sourceLabels: ["Solar"], stack: "renewables" },
  { id: "hydro", label: "Hydro", sourceLabels: ["Hydro (natural flow)"], stack: "renewables" },
  { id: "bioenergy", label: "Bioenergy", sourceLabels: ["Bioenergy"], stack: "renewables" },
  { id: "oil", label: "Oil", sourceLabels: ["Oil"], stack: "other" },
  {
    id: "other",
    label: "Other fuels",
    sourceLabels: ["Other fuels", "Shoreline wave / tidal"],
    stack: "other",
  },
  {
    id: "storage",
    label: "Storage",
    sourceLabels: ["Pumped storage", "Battery storage"],
    stack: "other",
  },
] as const;

export const STACK_GROUPS: { id: StackGroupId; label: string }[] = [
  { id: "coal", label: "Coal" },
  { id: "gas", label: "Gas" },
  { id: "nuclear", label: "Nuclear" },
  { id: "renewables", label: "Renewables" },
  { id: "other", label: "Other" },
];

/** Rows that must never enter a sum with components. */
export const AGGREGATE_LABELS = new Set(["Total wind", "Total all generating companies"]);

const bySource = new Map<string, FuelDef>();
for (const f of FUELS) {
  for (const label of f.sourceLabels) bySource.set(label, f);
}

export function fuelFromSourceLabel(label: string): FuelDef | null {
  if (AGGREGATE_LABELS.has(label)) return null;
  return bySource.get(label) ?? null;
}

export function fuelById(id: string): FuelDef | undefined {
  return FUELS.find((f) => f.id === id);
}

/** Contextual Follow-this-fuel hops — backed by ENERGY_CONNECTIONS. */
export function followFuel(id: FuelId): {
  type: "direct" | "contextual";
  why: string;
  learn: string;
  href: string;
  label: string;
} {
  const hit = followFuelConnection(id);
  if (hit?.href) {
    const kind = hit.connection.kind === "direct" ? "direct" : "contextual";
    return {
      type: kind,
      why: hit.connection.why,
      learn: hit.connection.learn,
      href: hit.href,
      label: hit.connection.label,
    };
  }
  // Safety net if the registry omits a fuel — still a typed direct hop.
  return {
    type: "direct",
    why: "Same official generation series, filtered to this fuel.",
    learn: "Open the Generation archive table for every observation of this fuel.",
    href: `/energy?domain=generation&view=data&fuel=${id}`,
    label: "Open this fuel in the archive",
  };
}

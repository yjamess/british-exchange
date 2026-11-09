/**
 * Electricity Generation — ET 5.1 fuel taxonomy for Changing Current.
 * Aggregates (Total wind, Total all generating companies) are never summed with components.
 * See docs/agent-kickoff-generation.md.
 */

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

/** Contextual Follow-this-fuel hops (why + destination). Direct = stay on Data for that fuel. */
export function followFuel(id: FuelId): {
  type: "direct" | "contextual";
  why: string;
  learn: string;
  href: string;
  label: string;
} {
  if (id === "gas") {
    return {
      type: "contextual",
      why: "Gas-fired generation depends on domestic production and imports — different measures, same fuel story.",
      learn: "Open Oil, gas and fossil fuels for production series already in the catalogue.",
      href: "/energy?domain=fossil",
      label: "Follow gas into fossil fuels",
    };
  }
  if (id === "coal") {
    return {
      type: "contextual",
      why: "Coal’s retreat in the mix is linked to production, imports and policy — not explained by generation alone.",
      learn: "Open fossil fuels for related production evidence (where Ready).",
      href: "/energy?domain=fossil",
      label: "Follow coal into fossil fuels",
    };
  }
  if (id === "onshore-wind" || id === "offshore-wind" || id === "solar" || id === "nuclear") {
    return {
      type: "contextual",
      why: "Low-carbon capacity and generation are related but not the same series.",
      learn: "Open Renewables and nuclear (stage still in preparation).",
      href: "/energy?domain=low-carbon",
      label: "Follow into renewables and nuclear",
    };
  }
  return {
    type: "direct",
    why: "Same official generation series, filtered to this fuel.",
    learn: "Open the Generation archive table for every observation of this fuel.",
    href: `/energy?domain=generation&view=data&fuel=${id}`,
    label: "Open this fuel in the archive",
  };
}

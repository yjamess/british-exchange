/**
 * Domain 06 — Renewables & Nuclear helpers (client-safe).
 * Study C: Capacity ≠ Output field card — MW / TWh / % on separate labelled measures.
 * Gate 3: Project Pipeline (REPD non-op) + nuclear plant load factors (DUKES 5.10).
 * Nuclear is low-carbon, not renewable. Renewable LF = DUKES 6.3; nuclear LF = DUKES 5.10.
 */

import type { IndicatorMeta, Observation } from "@/lib/api";
import type { Pt } from "../data";

export const LOAD_FACTORS_ID = "renewable-electricity-load-factors";
export const PLANT_LOAD_FACTORS_ID = "plant-load-factors";
export const PIPELINE_ID = "renewable-energy-planning-pipeline";
export const CAPACITY_ID = "electricity-capacity-by-technology";
export const GENERATION_ID = "electricity-generation-by-source";
export const REPD_ATLAS_ID = "renewable-energy-planning-operational";

export const LOAD_BASES = ["average_boe_capacity", "unchanged_configuration"] as const;
export type LoadBasis = (typeof LOAD_BASES)[number];

export type SeriesPack = {
  meta: IndicatorMeta;
  observations: Observation[];
  sourceVersion: string;
  retrievedNote: string;
};

export type RenewablesPack = {
  loadFactors: SeriesPack | null;
  pipeline: SeriesPack | null;
  plantLoadFactors: SeriesPack | null;
};

export type FieldTechId =
  | "offshore-wind"
  | "onshore-wind"
  | "solar"
  | "hydro"
  | "bioenergy"
  | "nuclear";

export type FieldTech = {
  id: FieldTechId;
  label: string;
  /** DUKES 6.3 fuel= label, or null if not in that table. */
  loadFuel: string | null;
  /** DUKES 5.12 fuel= labels (summed when several). */
  capacityFuels: string[];
  /** ET 5.1 fuel= label. */
  generationFuel: string;
  /** Nuclear is low-carbon, not renewable. */
  nuclear: boolean;
};

/** Mapped techs only — parents like "Wind" left out to avoid double-counting with children. */
export const FIELD_TECHS: FieldTech[] = [
  {
    id: "offshore-wind",
    label: "Offshore wind",
    loadFuel: "Offshore",
    capacityFuels: ["Wind (offshore)"],
    generationFuel: "Offshore wind",
    nuclear: false,
  },
  {
    id: "onshore-wind",
    label: "Onshore wind",
    loadFuel: "Onshore",
    capacityFuels: ["Wind (onshore)"],
    generationFuel: "Onshore wind",
    nuclear: false,
  },
  {
    id: "solar",
    label: "Solar",
    loadFuel: "Solar photovoltaics",
    capacityFuels: ["Solar"],
    generationFuel: "Solar",
    nuclear: false,
  },
  {
    id: "hydro",
    label: "Hydro",
    loadFuel: "Hydro",
    capacityFuels: ["Hydro (natural flow)"],
    generationFuel: "Hydro (natural flow)",
    nuclear: false,
  },
  {
    id: "bioenergy",
    label: "Bioenergy",
    loadFuel: "Bioenergy (excludes cofiring, includes non-biodegradable wastes)",
    capacityFuels: ["Bioenergy"],
    generationFuel: "Bioenergy",
    nuclear: false,
  },
  {
    id: "nuclear",
    label: "Nuclear",
    loadFuel: null,
    capacityFuels: ["Nuclear - AGR", "Nuclear - Magnox", "Nuclear - PWR"],
    generationFuel: "Nuclear",
    nuclear: true,
  },
];

export function noteMap(notes: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (notes ?? "").split(";")) {
    const t = part.trim();
    const i = t.indexOf("=");
    if (i <= 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

export function yearsOf(rows: Observation[]): number[] {
  return [
    ...new Set(rows.map((r) => Number(r.period_start.slice(0, 4))).filter((y) => Number.isFinite(y))),
  ].sort((a, b) => a - b);
}

export function fieldTechById(id: string | null): FieldTech {
  return FIELD_TECHS.find((t) => t.id === id) ?? FIELD_TECHS[0]!;
}

function fuelOf(r: Observation): string {
  return noteMap(r.notes ?? "").fuel || (r.notes ?? "").replace(/^fuel=/, "").trim();
}

export function loadFactorSeries(
  rows: Observation[],
  tech: FieldTech,
  basis: LoadBasis = "average_boe_capacity",
): { id: string; label: string; points: Pt[] } {
  if (!tech.loadFuel) {
    return { id: `lf-${tech.id}`, label: `${tech.label} · load factor`, points: [] };
  }
  const points = rows
    .filter((r) => {
      const n = noteMap(r.notes ?? "");
      return (
        n.fuel === tech.loadFuel &&
        n.basis === basis &&
        r.value != null &&
        Number.isFinite(Number(r.value))
      );
    })
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .map((r) => ({
      t: Number(r.period_start.slice(0, 4)),
      v: Number(r.value),
      provisional: r.observation_status === "provisional",
    }));
  return {
    id: `lf-${tech.id}-${basis}`,
    label: `${tech.label} · load factor`,
    points,
  };
}

export function loadFactorInYear(
  rows: Observation[],
  tech: FieldTech,
  year: number,
  basis: LoadBasis = "average_boe_capacity",
): number | null {
  if (!tech.loadFuel) return null;
  const row = rows.find((r) => {
    if (!r.period_start.startsWith(String(year)) || r.value == null) return false;
    const n = noteMap(r.notes ?? "");
    return n.fuel === tech.loadFuel && n.basis === basis;
  });
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

/** Installed capacity MW for one tech × year (sum of capacityFuels). */
export function capacityMwInYear(rows: Observation[], tech: FieldTech, year: number): number | null {
  let sum = 0;
  let any = false;
  for (const r of rows) {
    if (!r.period_start.startsWith(String(year)) || r.value == null || !Number.isFinite(Number(r.value))) {
      continue;
    }
    if (tech.capacityFuels.includes(fuelOf(r))) {
      sum += Number(r.value);
      any = true;
    }
  }
  return any ? sum : null;
}

export function capacitySeries(
  rows: Observation[],
  tech: FieldTech,
): { id: string; label: string; points: Pt[] } {
  const byYear = new Map<number, number>();
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    if (!tech.capacityFuels.includes(fuelOf(r))) continue;
    const y = Number(r.period_start.slice(0, 4));
    if (!Number.isFinite(y)) continue;
    byYear.set(y, (byYear.get(y) ?? 0) + Number(r.value));
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  return {
    id: `cap-${tech.id}`,
    label: `${tech.label} · capacity`,
    points: years.map((t) => ({ t, v: byYear.get(t)! })),
  };
}

/** Annual generation TWh = sum of quarterly observations for the tech fuel. */
export function generationTwhInYear(
  rows: Observation[],
  tech: FieldTech,
  year: number,
): { value: number; quarters: number; provisional: boolean } | null {
  const qs = rows.filter(
    (r) =>
      r.period_start.startsWith(String(year)) &&
      fuelOf(r) === tech.generationFuel &&
      r.value != null &&
      Number.isFinite(Number(r.value)),
  );
  if (!qs.length) return null;
  return {
    value: qs.reduce((s, r) => s + Number(r.value), 0),
    quarters: qs.length,
    provisional: qs.some((r) => r.observation_status === "provisional") || qs.length < 4,
  };
}

export function generationSeries(
  rows: Observation[],
  tech: FieldTech,
): { id: string; label: string; points: Pt[] } {
  const byYear = new Map<number, { sum: number; months: number; provisional: boolean }>();
  for (const r of rows) {
    if (fuelOf(r) !== tech.generationFuel || r.value == null || !Number.isFinite(Number(r.value))) {
      continue;
    }
    const y = Number(r.period_start.slice(0, 4));
    if (!Number.isFinite(y)) continue;
    const cur = byYear.get(y) ?? { sum: 0, months: 0, provisional: false };
    cur.sum += Number(r.value);
    cur.months += 1;
    if (r.observation_status === "provisional") cur.provisional = true;
    byYear.set(y, cur);
  }
  // Whole calendar years only: a part-year sum is not comparable with a full year.
  const years = [...byYear.keys()].filter((y) => byYear.get(y)!.months >= 4).sort((a, b) => a - b);
  return {
    id: `gen-${tech.id}`,
    label: `${tech.label} · generation`,
    points: years.map((t) => {
      const cur = byYear.get(t)!;
      return { t, v: cur.sum, provisional: cur.provisional };
    }),
  };
}

export function fmtGw(mw: number): string {
  const gw = mw / 1000;
  if (gw >= 10) return `${gw.toFixed(1)} GW`;
  if (gw >= 1) return `${gw.toFixed(2)} GW`;
  return `${mw.toLocaleString("en-GB", { maximumFractionDigits: 0 })} MW`;
}

export function fmtTwh(v: number): string {
  if (Math.abs(v) >= 100) return `${v.toFixed(0)} TWh`;
  if (Math.abs(v) >= 10) return `${v.toFixed(1)} TWh`;
  return `${v.toFixed(2)} TWh`;
}

export function fmtLoadPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

/* ── DUKES 5.10 plant load factors (nuclear / MPP) ─────────────────────── */

const NUCLEAR_GENERATOR = "Nuclear stations";

/** Major-power-producer plant load factor (%) for one generator type. */
export function plantLoadFactorSeries(
  rows: Observation[],
  generatorType: string = NUCLEAR_GENERATOR,
): { id: string; label: string; points: Pt[] } {
  const points = rows
    .filter((r) => {
      const n = noteMap(r.notes ?? "");
      return (
        n.generator_type === generatorType &&
        n.series === "load_factor" &&
        r.value != null &&
        Number.isFinite(Number(r.value))
      );
    })
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .map((r) => ({
      t: Number(r.period_start.slice(0, 4)),
      v: Number(r.value),
      provisional: r.observation_status === "provisional",
    }));
  return {
    id: `plant-lf-${generatorType.toLowerCase().replace(/\s+/g, "-")}`,
    label: `${generatorType} · load factor`,
    points,
  };
}

export function plantLoadFactorInYear(
  rows: Observation[],
  year: number,
  generatorType: string = NUCLEAR_GENERATOR,
): number | null {
  const row = rows.find((r) => {
    if (!r.period_start.startsWith(String(year)) || r.value == null) return false;
    const n = noteMap(r.notes ?? "");
    return n.generator_type === generatorType && n.series === "load_factor";
  });
  return row?.value != null && Number.isFinite(Number(row.value)) ? Number(row.value) : null;
}

/* ── REPD non-operational pipeline ─────────────────────────────────────── */

export const PIPELINE_LANES = ["active", "closed"] as const;
export type PipelineLane = (typeof PIPELINE_LANES)[number];

export type PipelineStage = {
  id: string;
  label: string;
  /** REPD Development Status (short) labels summed into this stage. */
  statuses: string[];
};

/** Active conveyor — planned → consented → building. Operational is on the Generation atlas. */
export const PIPELINE_ACTIVE_STAGES: PipelineStage[] = [
  {
    id: "submitted",
    label: "Submitted",
    statuses: ["Application Submitted", "Appeal Lodged", "Revised"],
  },
  {
    id: "consented",
    label: "Consented",
    statuses: ["Awaiting Construction", "No Application Required"],
  },
  {
    id: "building",
    label: "Building",
    statuses: ["Under Construction"],
  },
];

/** Closed / not proceeding — kept off the active conveyor. */
export const PIPELINE_CLOSED_STAGES: PipelineStage[] = [
  {
    id: "lost",
    label: "Refused or withdrawn",
    statuses: [
      "Application Refused",
      "Appeal Refused",
      "Appeal Withdrawn",
      "Application Withdrawn",
    ],
  },
  {
    id: "expired",
    label: "Permission expired",
    statuses: ["Planning Permission Expired"],
  },
  {
    id: "stopped",
    label: "Abandoned",
    statuses: ["Abandoned"],
  },
  {
    id: "offline",
    label: "Decommissioned",
    statuses: ["Decommissioned"],
  },
];

/** REPD technology labels that belong to a Field Guide tech (nuclear has none). */
export const PIPELINE_TECHS_BY_FIELD: Record<FieldTechId, string[] | null> = {
  "offshore-wind": ["Wind Offshore"],
  "onshore-wind": ["Wind Onshore"],
  solar: ["Solar Photovoltaics"],
  hydro: ["Large Hydro", "Small Hydro"],
  bioenergy: [
    "Biomass (dedicated)",
    "Biomass (co-firing)",
    "Anaerobic Digestion",
    "Landfill Gas",
    "EfW Incineration",
    "Advanced Conversion Technologies",
  ],
  nuclear: null,
};

export type PipelineRow = {
  status: string;
  technology: string;
  mw: number;
};

export function parsePipelineRows(rows: Observation[]): PipelineRow[] {
  const out: PipelineRow[] = [];
  for (const r of rows) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const n = noteMap(r.notes ?? "");
    const status = n.status?.trim();
    const technology = n.technology?.trim();
    if (!status || !technology) continue;
    out.push({ status, technology, mw: Number(r.value) });
  }
  return out;
}

export function pipelinePinLabel(rows: Observation[]): string {
  const start = rows[0]?.period_start;
  if (!start) return "Planning database";
  const y = Number(start.slice(0, 4));
  const m = Number(start.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return "Planning database";
  const q = Math.floor((m - 1) / 3) + 1;
  return `Planning database · Q${q} ${y}`;
}

export function stagesForLane(lane: PipelineLane): PipelineStage[] {
  return lane === "active" ? PIPELINE_ACTIVE_STAGES : PIPELINE_CLOSED_STAGES;
}

function matchesTechFilter(technology: string, techId: FieldTechId | "all"): boolean {
  if (techId === "all") return true;
  const allowed = PIPELINE_TECHS_BY_FIELD[techId];
  if (!allowed) return false;
  return allowed.includes(technology);
}

export function pipelineStageRanks(
  rows: PipelineRow[],
  lane: PipelineLane,
  techId: FieldTechId | "all" = "all",
): { id: string; label: string; v: number }[] {
  const stages = stagesForLane(lane);
  return stages
    .map((stage) => {
      const v = rows
        .filter(
          (r) =>
            stage.statuses.includes(r.status) && matchesTechFilter(r.technology, techId),
        )
        .reduce((s, r) => s + r.mw, 0);
      return { id: stage.id, label: stage.label, v };
    })
    .filter((r) => r.v > 0);
}

/** Planning-register technology names in plain sentence case. */
const REPD_TECH_LABEL: Record<string, string> = {
  "Advanced Conversion Technologies": "Advanced conversion of waste",
  "Air Source Heat Pumps": "Air source heat pumps",
  "Anaerobic Digestion": "Anaerobic digestion",
  "Biomass (co-firing)": "Biomass, burned with other fuels",
  "Biomass (dedicated)": "Biomass",
  "Compressed Air Energy Storage": "Compressed air storage",
  "EfW Incineration": "Energy from waste",
  "Fuel Cell (Hydrogen)": "Hydrogen fuel cells",
  "Hot Dry Rocks (HDR)": "Hot dry rock geothermal",
  "Landfill Gas": "Landfill gas",
  "Large Hydro": "Large hydro",
  "Liquid Air Energy Storage": "Liquid air storage",
  "Pumped Storage Hydroelectricity": "Pumped storage hydro",
  "Shoreline Wave": "Shoreline wave",
  "Small Hydro": "Small hydro",
  "Solar Photovoltaics": "Solar",
  "Tidal Lagoon": "Tidal lagoon",
  "Tidal Stream": "Tidal stream",
  "Wind Offshore": "Offshore wind",
  "Wind Onshore": "Onshore wind",
};

export function pipelineTechRanks(
  rows: PipelineRow[],
  stage: PipelineStage,
  techId: FieldTechId | "all" = "all",
  limit = 12,
): { id: string; label: string; v: number }[] {
  const byTech = new Map<string, number>();
  for (const r of rows) {
    if (!stage.statuses.includes(r.status)) continue;
    if (!matchesTechFilter(r.technology, techId)) continue;
    byTech.set(r.technology, (byTech.get(r.technology) ?? 0) + r.mw);
  }
  return [...byTech.entries()]
    .map(([label, v]) => ({ id: label, label: REPD_TECH_LABEL[label] ?? label, v }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, limit);
}

export function pipelineStageTotal(
  rows: PipelineRow[],
  stage: PipelineStage,
  techId: FieldTechId | "all" = "all",
): number {
  return rows
    .filter(
      (r) => stage.statuses.includes(r.status) && matchesTechFilter(r.technology, techId),
    )
    .reduce((s, r) => s + r.mw, 0);
}

export function pipelineLaneTotal(
  rows: PipelineRow[],
  lane: PipelineLane,
  techId: FieldTechId | "all" = "all",
): number {
  return stagesForLane(lane).reduce(
    (s, stage) => s + pipelineStageTotal(rows, stage, techId),
    0,
  );
}

export function asPipelineLane(v: string | null): PipelineLane {
  return PIPELINE_LANES.includes(v as PipelineLane) ? (v as PipelineLane) : "active";
}

export function asPipelineStageId(v: string | null, lane: PipelineLane): string {
  const stages = stagesForLane(lane);
  if (v && stages.some((s) => s.id === v)) return v;
  return stages[0]?.id ?? "building";
}

/* ── Field Guide measure + Observatory journeys ────────────────────────── */

export const GUIDE_MEASURES = ["built", "generating", "running"] as const;
export type GuideMeasure = (typeof GUIDE_MEASURES)[number];

export function asGuideMeasure(v: string | null): GuideMeasure {
  return GUIDE_MEASURES.includes(v as GuideMeasure) ? (v as GuideMeasure) : "built";
}

export type JourneyLink = {
  id: string;
  label: string;
  href: string;
  note: string;
  kind: "direct" | "context";
};

/**
 * @deprecated Prefer ENERGY_CONNECTIONS + Stage `follow` / FollowStep.
 * Kept for reference while Domain 06 migrates; no live call sites.
 */
export function journeysForTech(tech: FieldTech): JourneyLink[] {
  if (tech.id === "offshore-wind") {
    return [
      {
        id: "ow-atlas",
        label: "Where the plant stands",
        href: "/energy?domain=generation&view=atlas&family=renewable&technology=Wind%20Offshore",
        note: "Operational renewable sites on the Generation map",
        kind: "direct",
      },
      {
        id: "ow-mix",
        label: "How the mix looks now",
        href: "/energy?domain=generation&view=current",
        note: "Contextual — fuel mix, not this project's output alone",
        kind: "context",
      },
      {
        id: "ow-networks",
        label: "Power networks",
        href: "/energy?domain=networks",
        note: "Contextual — transmission and interconnectors",
        kind: "context",
      },
    ];
  }
  if (tech.id === "solar") {
    return [
      {
        id: "sol-cap",
        label: "Capacity and output",
        href: "/energy?domain=low-carbon&view=capacity&tech=solar",
        note: "Installed MW beside annual TWh and load factor",
        kind: "direct",
      },
      {
        id: "sol-use",
        label: "Domestic electricity use",
        href: "/energy?domain=consumption",
        note: "Contextual — how households use electricity",
        kind: "context",
      },
      {
        id: "sol-price",
        label: "Electricity prices",
        href: "/energy?domain=prices",
        note: "Contextual — bills and unit rates",
        kind: "context",
      },
    ];
  }
  if (tech.nuclear) {
    return [
      {
        id: "nuc-fuel",
        label: "Nuclear in the fuel mix",
        href: "/energy?domain=generation&view=current&group=nuclear",
        note: "Generation history for nuclear fuel",
        kind: "direct",
      },
      {
        id: "nuc-policy",
        label: "Industrial policy",
        href: "/energy?domain=policy",
        note: "Contextual — decisions that shape the fleet",
        kind: "context",
      },
      {
        id: "nuc-jobs",
        label: "Manufacturing and jobs",
        href: "/energy?domain=manufacturing",
        note: "Contextual — industry output and employment",
        kind: "context",
      },
    ];
  }
  return [
    {
      id: `${tech.id}-cap`,
      label: "Capacity and output",
      href: `/energy?domain=low-carbon&view=capacity&tech=${tech.id}`,
      note: "Installed MW beside annual TWh and load factor",
      kind: "direct",
    },
    {
      id: `${tech.id}-atlas`,
      label: "Where the plant stands",
      href: "/energy?domain=generation&view=atlas",
      note: "Operational renewable sites on the Generation atlas",
      kind: "context",
    },
    {
      id: `${tech.id}-pipe`,
      label: "Project pipeline",
      href: `/energy?domain=low-carbon&view=pipeline&pipe_tech=${tech.id}`,
      note: "Planning capacity still in the register",
      kind: "direct",
    },
  ];
}

/** Planned MW for a Field Guide tech from the non-operational REPD pipeline (active lane). */
export function plannedMwForTech(rows: PipelineRow[], techId: FieldTechId): number | null {
  const allowed = PIPELINE_TECHS_BY_FIELD[techId];
  if (!allowed) return null;
  const v = pipelineLaneTotal(rows, "active", techId);
  return v > 0 ? v : 0;
}

/** Topics that belong on the Domain 06 Buildout EventRail (context, not effect). */
export const BUILDOUT_EVENT_TOPICS = [
  "electricity",
  "energy",
  "renewables",
  "climate",
  "nuclear",
] as const;

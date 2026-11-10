/**
 * Domain 07 — URL state for Quality views.
 * Filters live in HousingExplorer ControlRows; the cutaway / map stay the stage instruments.
 */

export type QualityFoot = {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
};

export type EnergyCat = "bands" | "heating" | "insulation" | "improvement";

export type ConditionKind = "tenure" | "dwelling-age" | "dwelling-type" | "floor-area" | "region";

export type InsideState = {
  feature: string;
  archetype: string;
  area: string;
  tenure: string;
  year: number | null;
};

export type EnergyState = {
  cat: EnergyCat;
  archetype: string;
  area: string;
  tenure: string;
  year: number | null;
  focus: string | null;
};

export type ConditionState = {
  measure: string;
  kind: ConditionKind;
  tenure: string;
  year: number | null;
  col: string | null;
};

export type GeographyState = {
  feature: string;
  tenure: string;
  year: number | null;
  picked: string | null;
};

export type QualityDataState = {
  indicator: string;
  series: string | null;
};

export const ENERGY_CAT_OPTIONS: { value: EnergyCat; label: string }[] = [
  { value: "bands", label: "Band mix" },
  { value: "heating", label: "Heating" },
  { value: "insulation", label: "Insulation" },
  { value: "improvement", label: "Improvement potential" },
];

export const CONDITION_KIND_OPTIONS: { value: ConditionKind; label: string }[] = [
  { value: "tenure", label: "Tenure" },
  { value: "dwelling-age", label: "Dwelling age" },
  { value: "dwelling-type", label: "Dwelling type" },
  { value: "floor-area", label: "Floor area" },
  { value: "region", label: "Region" },
];

export function parseEnergyCat(raw: string | null): EnergyCat {
  if (raw === "heating" || raw === "insulation" || raw === "improvement") return raw;
  return "bands";
}

export function parseConditionKind(raw: string | null): ConditionKind {
  if (
    raw === "dwelling-age" ||
    raw === "dwelling-type" ||
    raw === "floor-area" ||
    raw === "region"
  ) {
    return raw;
  }
  return "tenure";
}

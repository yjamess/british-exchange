/**
 * Everyday basket catalogue — the ONS items in the pin, read from row notes
 * (`item=`, `size=`, `category1=`, `category2=`). The ten featured items keep their own drawn
 * specimens (b-<slug>.png); every other item shows a generic plate for its kind
 * (b-type-<type>.png), chosen from its ONS sub-group. No item is drawn one by one.
 */

import type { Observation } from "@/lib/api";
import { BASKET_ITEMS } from "./inflation-model";

export type BasketType =
  | "bottle"
  | "pint"
  | "tin"
  | "box"
  | "packet"
  | "jar"
  | "carton"
  | "fruit"
  | "veg"
  | "meat"
  | "meal"
  | "toiletry"
  | "textile"
  | "kitchenware"
  | "appliance"
  | "chair"
  | "tools"
  | "ticket"
  | "bike"
  | "car";

export type CatalogueItem = {
  slug: string;
  label: string;
  size: string | null;
  group: string;
  subgroup: string;
  featured: boolean;
  plate: string;
};

/** Plain names for the ONS top-level groups, in shelf order. */
export const BASKET_GROUPS: { id: string; label: string }[] = [
  { id: "Food and drink", label: "Food and drink" },
  { id: "Food and drink establishments", label: "Eating and drinking out" },
  { id: "Household items", label: "Household" },
  { id: "Health", label: "Health" },
  { id: "Services", label: "Services" },
  { id: "Transport", label: "Transport" },
];

/** ONS sub-group → generic plate. Keyed by "group|subgroup" where a sub-group name repeats. */
const TYPE_FOR: Record<string, BasketType> = {
  "Food and drink|Alcohol": "bottle",
  Bakery: "packet",
  Biscuits: "packet",
  Breakfast: "box",
  "Butter, spreads and oils": "jar",
  "Chilled food": "box",
  "Chocolate and sweets": "packet",
  "Coffee, tea and cocoa": "jar",
  "Cooked meats": "packet",
  Crisps: "packet",
  Dairy: "carton",
  Fish: "meat",
  "Fresh fruit": "fruit",
  "Fresh vegetables": "veg",
  "Frozen food": "box",
  "Jams, marmalades and honey": "jar",
  Meat: "meat",
  "Other food": "packet",
  Potatoes: "veg",
  "Sauces, pickles, chutney": "jar",
  "Soft drinks": "bottle",
  "Store cupboard": "tin",
  "Food and drink establishments|Alcohol": "pint",
  "Fast food and take aways": "meal",
  "Pubs, restaurants and cafes": "meal",
  Schools: "meal",
  "Glasses and contact lenses": "toiletry",
  "Personal health": "toiletry",
  "Personal hygiene and wellness": "toiletry",
  "Bed linen": "textile",
  "Carpets, rugs and flooring": "textile",
  "Chinaware and glassware": "kitchenware",
  Cleaning: "toiletry",
  Cookware: "kitchenware",
  Electrical: "appliance",
  "Furnishing fabrics and curtains": "textile",
  Furniture: "chair",
  "Household items|Maintenance and repair": "tools",
  "Solid and liquid fuels": "tools",
  Stationary: "tools",
  Travel: "tools",
  Care: "ticket",
  Hairdressing: "ticket",
  "Services|Health": "ticket",
  "Services|Maintenance and repair": "ticket",
  Other: "ticket",
  "Bikes and cycling equipment": "bike",
  "Transport|Services": "ticket",
  "Spare parts": "car",
  "Vehicle hire": "car",
};

/** Item names that say what the thing is beat the sub-group (food and drink only). */
const BY_NAME: [RegExp, BasketType][] = [
  [/\b(pint|draught|lager|bitter|cider|ale)\b/i, "pint"],
  [/\b(wine|champagne|gin|vodka|whisk(e)?y|rum|liqueur|spirit|mixer|water|cola|lemonade|juice|smoothie|squash|energy drink|soft drink)\b/i, "bottle"],
  [/\b(crisps|nuts|popcorn)\b/i, "packet"],
];
const FOOD = new Set(["Food and drink", "Food and drink establishments"]);

export function typeFor(group: string, subgroup: string, label = ""): BasketType {
  if (FOOD.has(group)) {
    for (const [re, type] of BY_NAME) if (re.test(label)) return type;
  }
  return TYPE_FOR[`${group}|${subgroup}`] ?? TYPE_FOR[subgroup] ?? "packet";
}

const FEATURED = new Map<string, string>(BASKET_ITEMS.map((i) => [i.slug, i.label]));

function field(notes: string, key: string): string | null {
  const m = notes.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return m?.[1]?.trim() ?? null;
}

export function itemSlug(row: Observation): string | null {
  return row.dimensions?.category || field(row.notes ?? "", "category");
}

/** One entry per item in the rows, featured first (in BASKET_ITEMS order), then A–Z. */
export function buildCatalogue(rows: Observation[]): CatalogueItem[] {
  const out = new Map<string, CatalogueItem>();
  for (const r of rows) {
    const slug = itemSlug(r);
    if (!slug || out.has(slug)) continue;
    const notes = r.notes ?? "";
    const size = field(notes, "size");
    const group = field(notes, "category1") ?? "Food and drink";
    const subgroup = field(notes, "category2") ?? "";
    const featured = FEATURED.has(slug);
    const label = FEATURED.get(slug) ?? field(notes, "item") ?? slug;
    out.set(slug, {
      slug,
      label,
      size: size && size !== "as priced" && size !== "one" && size !== "each" ? size : null,
      group,
      subgroup,
      featured,
      plate: featured
        ? `/brand/plates/b-${slug.replace("-sliced-bread", "-bread")}.png`
        : `/brand/plates/b-type-${typeFor(group, subgroup, label)}.png`,
    });
  }
  const order = new Map(BASKET_ITEMS.map((i, n) => [i.slug as string, n]));
  return [...out.values()].sort((a, b) => {
    const fa = order.get(a.slug);
    const fb = order.get(b.slug);
    if (fa != null || fb != null) return (fa ?? 99) - (fb ?? 99);
    return a.label.localeCompare(b.label);
  });
}

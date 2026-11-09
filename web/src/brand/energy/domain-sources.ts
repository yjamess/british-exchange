/**
 * Server data boundary for Energy & Industry.
 * A domain must declare which loaders it needs, including cross-domain packs
 * (e.g. low-carbon reuses generation + capacity; networks reuses yearMix).
 *
 * Mirrors Housing's `domain-sources.ts`: the sector route loads only the
 * selected domain's dependencies rather than every Energy pack at once.
 */

export const ENERGY_DOMAINS = [
  "generation",
  "consumption",
  "prices",
  "fossil",
  "imports",
  "low-carbon",
  "networks",
  "manufacturing",
  "industrial-work",
  "policy",
] as const;

export type EnergyDomainId = (typeof ENERGY_DOMAINS)[number];

/** Named server loaders in `load.ts` that feed EnergySector props. */
export type EnergyPackKey =
  | "generation"
  | "capacity"
  | "longRun"
  | "yearMix"
  | "atlas"
  | "consumption"
  | "prices"
  | "fossils"
  | "imports"
  | "manufacturing"
  | "renewables"
  | "networks";

/**
 * Packs required to render each domain canvas.
 * Keep this list honest: if a canvas reads another domain's series, declare it here.
 */
export const DOMAIN_PACKS = {
  generation: ["generation", "capacity", "longRun", "yearMix", "atlas"],
  consumption: ["consumption"],
  prices: ["prices"],
  fossil: ["fossils"],
  imports: ["imports"],
  "low-carbon": ["renewables", "generation", "capacity"],
  networks: ["networks", "yearMix"],
  manufacturing: ["manufacturing"],
  "industrial-work": ["manufacturing"],
  /** Decision Ledger is curated events, not observation packs. */
  policy: [],
} as const satisfies Record<EnergyDomainId, readonly EnergyPackKey[]>;

export type EnergyScope = EnergyDomainId | "all";

const DOMAIN_SET = new Set<string>(ENERGY_DOMAINS);

/** Resolve `?domain=` to a known Energy domain; default Generation. */
export function resolveEnergyDomain(raw: string | string[] | undefined): EnergyDomainId {
  const value = typeof raw === "string" ? raw : undefined;
  return value && DOMAIN_SET.has(value) ? (value as EnergyDomainId) : "generation";
}

export function packsFor(scope: EnergyScope): readonly EnergyPackKey[] {
  if (scope === "all") {
    return [
      "generation",
      "capacity",
      "longRun",
      "yearMix",
      "atlas",
      "consumption",
      "prices",
      "fossils",
      "imports",
      "manufacturing",
      "renewables",
      "networks",
    ];
  }
  return DOMAIN_PACKS[scope];
}

export function packAllowed(scope: EnergyScope, key: EnergyPackKey): boolean {
  return scope === "all" || (DOMAIN_PACKS[scope] as readonly EnergyPackKey[]).includes(key);
}

/**
 * Whether the selected domain’s primary observations are present.
 * Used to distinguish Ready-but-unavailable from In preparation (see views/types).
 */
export function primaryPackLoaded(
  domain: EnergyDomainId,
  packs: {
    generation: { observations: unknown[] } | null;
    longRun: unknown | null;
    consumption: { final: { observations: unknown[] } | null };
    prices: { domestic: { observations: unknown[] } | null };
    fossils: {
      crude: { observations: unknown[] } | null;
      fields: unknown[];
      reserves: { observations: unknown[] } | null;
    };
    imports: { dependency: { observations: unknown[] } | null };
    renewables: {
      loadFactors: { observations: unknown[] } | null;
      pipeline: { observations: unknown[] } | null;
      plantLoadFactors: { observations: unknown[] } | null;
    };
    capacity: { observations: unknown[] } | null;
    networks: { interconnectors: { observations: unknown[] } | null };
    manufacturing: {
      output: { observations: unknown[] } | null;
      employment: { observations: unknown[] } | null;
    };
  },
): boolean {
  switch (domain) {
    case "generation":
      return Boolean(packs.generation?.observations.length || packs.longRun);
    case "consumption":
      return Boolean(packs.consumption.final?.observations.length);
    case "prices":
      return Boolean(packs.prices.domestic?.observations.length);
    case "fossil":
      return Boolean(
        packs.fossils.crude?.observations.length ||
          packs.fossils.fields.length ||
          packs.fossils.reserves?.observations.length,
      );
    case "imports":
      return Boolean(packs.imports.dependency?.observations.length);
    case "low-carbon":
      return Boolean(
        packs.renewables.loadFactors?.observations.length ||
          packs.renewables.pipeline?.observations.length ||
          packs.renewables.plantLoadFactors?.observations.length ||
          packs.capacity?.observations.length,
      );
    case "networks":
      return Boolean(packs.networks.interconnectors?.observations.length);
    case "manufacturing":
      return Boolean(packs.manufacturing.output?.observations.length);
    case "industrial-work":
      return Boolean(packs.manufacturing.employment?.observations.length);
    case "policy":
      // Curated ledger — not observation packs.
      return true;
  }
}

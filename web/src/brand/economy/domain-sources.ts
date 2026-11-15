/**
 * Server data boundary for Economy & Public Finance.
 * A domain must declare which loaders it needs (Energy / Housing pattern).
 * The sector route loads only the selected domain's packs.
 */

import {
  ECONOMY_DOMAIN_IDS,
  LEGACY_ECONOMY_DOMAIN,
  type EconomyDomainId,
} from "./types";

export type { EconomyDomainId };

/** Named server loaders in `load.ts` that feed EconomySector props. */
export type EconomyPackKey =
  | "inflation"
  | "wages"
  | "employment"
  | "tax"
  | "spending"
  | "debt"
  | "growth";

/**
 * Packs required to render each domain canvas.
 * Prep domains declare [] — nothing to hydrate until their G2+G3.
 */
export const DOMAIN_PACKS = {
  inflation: ["inflation"],
  wages: ["wages"],
  employment: ["employment"],
  household: [],
  growth: ["growth"],
  tax: ["tax"],
  spending: ["spending"],
  debt: ["debt"],
  investment: [],
  policy: [],
} as const satisfies Record<EconomyDomainId, readonly EconomyPackKey[]>;

export type EconomyScope = EconomyDomainId | "all";

const DOMAIN_SET = new Set<string>(ECONOMY_DOMAIN_IDS);

/** Resolve `?domain=` to a known Economy domain; default Inflation. */
export function resolveEconomyDomain(raw: string | string[] | undefined): EconomyDomainId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "inflation";
  if (DOMAIN_SET.has(value)) return value as EconomyDomainId;
  return LEGACY_ECONOMY_DOMAIN[value] ?? "inflation";
}

export function packsFor(scope: EconomyScope): readonly EconomyPackKey[] {
  if (scope === "all") {
    return ["inflation", "wages", "employment", "tax", "spending", "debt", "growth"];
  }
  return DOMAIN_PACKS[scope];
}

/** True when this domain's primary packs are listed (Ready Wave A canvases). */
export function packAllowed(domain: EconomyDomainId, pack: EconomyPackKey): boolean {
  return (DOMAIN_PACKS[domain] as readonly EconomyPackKey[]).includes(pack);
}

/**
 * Energy adapter over the shared explorer URL contract.
 * Domain param declarations live in `views/*`; this file only maps them and
 * exposes sync helpers canvases should use instead of hand-rolled replaceState.
 */

"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  commitExplorerUrl,
  patchExplorerUrl,
  resolveExplorerUrl,
  switchExplorerDomain,
  type DomainUrlContract,
  type ExplorerUrlResult,
  type ParamValue,
} from "../navigation";
import type { EnergyDomainId } from "./domain-sources";
import { ENERGY_DOMAIN_VIEWS, type DomainViews } from "./views";

/** Calendar year is the only Energy key treated as portable across domains for now. */
const ENERGY_PORTABLE = ["year"] as const;

export function energyUrlContract(domain: EnergyDomainId): DomainUrlContract {
  const mod: DomainViews = ENERGY_DOMAIN_VIEWS[domain];
  return {
    domain: mod.domain,
    defaultView: mod.defaultView,
    views: mod.views.map((v) => ({ id: v.id, params: v.params })),
    portableParams: ENERGY_PORTABLE,
  };
}

export function resolveEnergyUrl(
  current: URLSearchParams | string,
  domain: EnergyDomainId,
): ExplorerUrlResult {
  return resolveExplorerUrl(current, energyUrlContract(domain));
}

export function patchEnergyUrl(
  current: URLSearchParams | string,
  domain: EnergyDomainId,
  patch: Record<string, ParamValue>,
): ExplorerUrlResult {
  return patchExplorerUrl(current, energyUrlContract(domain), patch);
}

export function switchEnergyDomain(
  current: URLSearchParams | string,
  to: EnergyDomainId,
  from?: EnergyDomainId | null,
  options?: { retain?: readonly string[]; view?: string | null },
): ExplorerUrlResult {
  return switchExplorerDomain(current, energyUrlContract(to), {
    source: from ? energyUrlContract(from) : null,
    retain: options?.retain,
    view: options?.view,
  });
}

/**
 * Hook for Energy canvases and the sector shell.
 * - sync(): control / view changes → replaceState, pruned to the active view
 * - goDomain(): domain hop → router.push, portable year only by default
 */
export function useEnergyNavigation(domain: EnergyDomainId) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sync = useCallback(
    (patch: Record<string, ParamValue>) => {
      const result = patchEnergyUrl(searchParams, domain, patch);
      commitExplorerUrl(result, pathname);
      return result;
    },
    [domain, pathname, searchParams],
  );

  const goDomain = useCallback(
    (next: EnergyDomainId, options?: { retain?: readonly string[]; view?: string | null }) => {
      if (next === domain) return null;
      const result = switchEnergyDomain(searchParams, next, domain, options);
      commitExplorerUrl(result, pathname, router);
      return result;
    },
    [domain, pathname, router, searchParams],
  );

  const resolved = resolveEnergyUrl(searchParams, domain);

  return { sync, goDomain, resolved, pathname, searchParams };
}

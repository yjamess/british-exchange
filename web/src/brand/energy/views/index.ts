/**
 * Energy domain view registry.
 *
 * Shared Explorer components stay in `web/src/brand/template/`.
 * Each domain’s tabs, supported URL params and evidence contract live here
 * so a new view cannot silently inherit another domain’s Notes or query keys.
 */

import type { EnergyDomainId } from "../domain-sources";
import { consumptionViews } from "./consumption";
import { fossilViews } from "./fossil";
import { generationViews } from "./generation";
import { importsViews } from "./imports";
import { industrialWorkViews } from "./industrial-work";
import { lowCarbonViews } from "./low-carbon";
import { manufacturingViews } from "./manufacturing";
import { networksViews } from "./networks";
import { policyViews } from "./policy";
import { pricesViews } from "./prices";
import {
  evidenceComplete,
  evidenceParts,
  stageAvailability,
  type DomainUiStatus,
  type DomainViews,
  type StageAvailability,
  type ViewSpec,
} from "./types";

export * from "./types";
export { GENERATION_VIEWS } from "./generation";
export { CONSUMPTION_VIEWS } from "./consumption";
export { PRICES_VIEWS } from "./prices";
export { FOSSIL_VIEWS } from "./fossil";
export { IMPORTS_VIEWS } from "./imports";
export { LOW_CARBON_VIEWS } from "./low-carbon";
export { NETWORKS_VIEWS } from "./networks";
export { MANUFACTURING_VIEWS } from "./manufacturing";
export { INDUSTRIAL_WORK_VIEWS } from "./industrial-work";
export { POLICY_VIEWS } from "./policy";

export const ENERGY_DOMAIN_VIEWS: Record<EnergyDomainId, DomainViews> = {
  generation: generationViews,
  consumption: consumptionViews,
  prices: pricesViews,
  fossil: fossilViews,
  imports: importsViews,
  "low-carbon": lowCarbonViews,
  networks: networksViews,
  manufacturing: manufacturingViews,
  "industrial-work": industrialWorkViews,
  policy: policyViews,
};

export function domainUiStatus(domain: EnergyDomainId): DomainUiStatus {
  return ENERGY_DOMAIN_VIEWS[domain].status;
}

export function viewsFor(domain: EnergyDomainId): readonly ViewSpec[] {
  return ENERGY_DOMAIN_VIEWS[domain].views;
}

export function viewSpec(domain: EnergyDomainId, viewId: string): ViewSpec | undefined {
  const mod = ENERGY_DOMAIN_VIEWS[domain];
  return mod.views.find((v) => v.id === viewId) ?? mod.views.find((v) => v.id === mod.defaultView);
}

/** Params allowed for a domain (union of its views), always including domain + view. */
export function allowedParams(domain: EnergyDomainId): ReadonlySet<string> {
  const keys = new Set<string>(["domain", "view"]);
  for (const v of ENERGY_DOMAIN_VIEWS[domain].views) {
    for (const p of v.params) keys.add(p);
  }
  return keys;
}

export function auditEvidence(domain?: EnergyDomainId): { domain: EnergyDomainId; view: string; ok: boolean; missing: string[] }[] {
  const domains = domain ? [domain] : (Object.keys(ENERGY_DOMAIN_VIEWS) as EnergyDomainId[]);
  const rows: { domain: EnergyDomainId; view: string; ok: boolean; missing: string[] }[] = [];
  for (const id of domains) {
    for (const v of ENERGY_DOMAIN_VIEWS[id].views) {
      const e = v.evidence;
      const missing: string[] = [];
      if (!e.source.trim()) missing.push("source");
      if (evidenceParts(e.definition).length === 0) missing.push("definition");
      if (evidenceParts(e.method).length === 0) missing.push("method");
      if (!e.geography.trim()) missing.push("geography");
      if (!e.period.trim()) missing.push("period");
      if (!e.dataHref.trim()) missing.push("dataHref");
      rows.push({ domain: id, view: v.id, ok: evidenceComplete(e) && missing.length === 0, missing });
    }
  }
  return rows;
}

export function domainStageState(domain: EnergyDomainId, primaryLoaded: boolean): StageAvailability {
  return stageAvailability(domainUiStatus(domain), primaryLoaded);
}

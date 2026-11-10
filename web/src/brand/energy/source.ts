import { formatSource } from "../template";
import { viewSpec } from "./views";
import type { EnergyDomainId } from "./domain-sources";

/** Use the shared view evidence for coverage and period in every Notes source row. */
export function energySource(domain: EnergyDomainId, view: string, source: string): string {
  const evidence = viewSpec(domain, view)?.evidence;
  return formatSource(source, evidence?.geography, evidence?.period);
}

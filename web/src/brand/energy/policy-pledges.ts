/**
 * Energy Domain 10 — Promise Ledger register.
 * Pack: energy.industrial-policy-pledges (API / Storage — never a webpack data/ import).
 * Same record shape as Housing's pledges, plus `match.direction` for phase-out pledges
 * (coal: delivered when a period is at or below the target, not at or above it).
 * Delivered values are never stored in the pack; they come from Ready observations via `match`.
 */

import { fetchIndicator, fetchObservations, fetchPackJson, type Observation } from "@/lib/api";
import { toT } from "../data";
import type { PolicySource } from "../housing/canvas/policy/types";

export type PledgeDirection = "at_or_above" | "at_or_below";

export type EnergyPledge = {
  id: string;
  title: string;
  made_by: string;
  made_date: string;
  made_date_precision?: "day" | "month" | null;
  made_date_note?: string;
  nations: string[];
  statement: string;
  sources: PolicySource[];
  target: {
    value: number | null;
    unit: string;
    geography_code: string | null;
    period_start: string | null;
    period_end: string | null;
    period_note: string | null;
  };
  match: {
    indicator_id: string;
    series?: string;
    geography_code: string;
    unit: string;
    aggregation: "sum" | "latest" | "per-period";
    direction?: PledgeDirection;
    dimensions?: Record<string, string>;
  } | null;
  scorable: boolean;
  measure_definition: string;
  not_scored_reason: string | null;
  linked_event_ids: string[];
  status_note: string;
};

type PledgeRegistry = { registry_id: string; retrieved_at: string; note: string; pledges: EnergyPledge[] };

export type DeliveryPoint = { t: number; v: number; period: string };
export type DeliverySource = { id: string; title: string; publisher: string; release: string; unit: string };

export type PolicyPledgesPack = {
  pledges: EnergyPledge[];
  retrieved_at: string;
  note: string;
  delivery: Record<string, { points: DeliveryPoint[]; source: DeliverySource }>;
};

export const EMPTY_POLICY_PLEDGES_PACK: PolicyPledgesPack = { pledges: [], retrieved_at: "", note: "", delivery: {} };

/** Geography + dimension match. Energy observations carry no `series` column, so it is not matched. */
function matches(o: Observation, m: NonNullable<EnergyPledge["match"]>): boolean {
  if (m.geography_code && o.geography_code !== m.geography_code) return false;
  const dims = (o.dimensions ?? {}) as Record<string, string | undefined>;
  return Object.entries(m.dimensions ?? {}).every(([k, v]) => !v || (dims[k] ?? "") === v);
}

export async function loadPolicyPledgesPack(): Promise<PolicyPledgesPack> {
  const registry = await fetchPackJson<PledgeRegistry>("energy.industrial-policy-pledges");
  const pledges = registry.pledges ?? [];
  const ids = [...new Set(pledges.flatMap((p) => (p.scorable && p.match ? [p.match.indicator_id] : [])))];
  const byId = new Map<string, { rows: Observation[]; source: DeliverySource } | null>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const [meta, obs] = await Promise.all([fetchIndicator(id), fetchObservations(id, { limit: "10000" })]);
        const rows = obs.observations as Observation[];
        const last = [...rows].sort((a, b) => a.period_start.localeCompare(b.period_start)).at(-1);
        byId.set(id, {
          rows,
          source: { id, title: meta.title, publisher: meta.publisher, release: last?.source_version ?? "", unit: meta.unit },
        });
      } catch {
        byId.set(id, null);
      }
    }),
  );
  const delivery: PolicyPledgesPack["delivery"] = {};
  for (const p of pledges) {
    if (!p.scorable || !p.match) continue;
    const data = byId.get(p.match.indicator_id);
    if (!data) continue;
    const m = p.match;
    delivery[p.id] = {
      source: data.source,
      points: data.rows
        .filter((o) => o.value != null && matches(o, m))
        .map((o) => ({ t: toT(o.period_start), v: o.value as number, period: o.period_start }))
        .sort((a, b) => a.t - b.t),
    };
  }
  return { pledges, retrieved_at: registry.retrieved_at, note: registry.note, delivery };
}

/* ——— Scoring (same rule as Housing, plus direction) ——— */

export function pledgesOf(pack: PolicyPledgesPack): EnergyPledge[] {
  return [...pack.pledges].sort((a, b) => a.made_date.localeCompare(b.made_date));
}

export function deliveredOf(p: EnergyPledge, pts: DeliveryPoint[]) {
  const t0 = p.target.period_start ? toT(p.target.period_start) : -Infinity;
  const t1 = p.target.period_end ? toT(p.target.period_end) : Infinity;
  const inside = pts.filter((x) => x.t >= t0 && x.t <= t1);
  const none = { inside, value: null as number | null, met: null as number | null };
  if (!p.match || inside.length === 0 || p.target.value == null) return none;
  if (p.match.aggregation === "sum") return { ...none, value: inside.reduce((a, x) => a + x.v, 0) };
  if (p.match.aggregation === "latest") return { ...none, value: inside.at(-1)!.v };
  const target = p.target.value;
  const hit = p.match.direction === "at_or_below" ? (v: number) => v <= target : (v: number) => v >= target;
  return { ...none, met: inside.filter((x) => hit(x.v)).length };
}

export function pledgeIsScored(p: EnergyPledge, pack: PolicyPledgesPack): boolean {
  if (!p.scorable || !p.match || p.target.value == null) return false;
  const series = pack.delivery[p.id];
  return Boolean(series) && deliveredOf(p, series!.points).inside.length > 0;
}

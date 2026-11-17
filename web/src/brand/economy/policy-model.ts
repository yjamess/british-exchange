/**
 * Economy Domain 10 — economic policy register loaders and view-model helpers.
 * Packs: economy.policy-events · economy.policy-pledges (API / Storage — never a webpack data/ import).
 * The event helpers are the shared ones Energy uses; only the pack ids and the
 * evidence-record mapping are Economy's.
 */

import {
  loadPolicyEventsPack,
  EMPTY_POLICY_EVENTS_PACK,
  MARK_DATE_LABEL,
  NATION_LABEL,
  TYPE_LABEL,
  formatIso,
  markDate,
  markYear,
  statusLabel,
  type PolicyEventsPack,
} from "../energy/policy-events";
import {
  loadPolicyPledgesPack,
  EMPTY_POLICY_PLEDGES_PACK,
  type PolicyPledgesPack,
} from "../energy/policy-pledges";
import type { LedgerContextLink, LedgerEvent, LedgerRecord } from "../policy/types";
import type { PolicyArea, PolicyEvent, Relationship } from "../housing/canvas/policy/types";

export type { PolicyEventsPack, PolicyPledgesPack };
export { EMPTY_POLICY_EVENTS_PACK, EMPTY_POLICY_PLEDGES_PACK };

export const POLICY_EVENTS_PACK_ID = "economy.policy-events";
export const POLICY_PLEDGES_PACK_ID = "economy.policy-pledges";

export function loadEconomyPolicyEvents(): Promise<PolicyEventsPack> {
  return loadPolicyEventsPack(POLICY_EVENTS_PACK_ID);
}

export function loadEconomyPolicyPledges(): Promise<PolicyPledgesPack> {
  return loadPolicyPledgesPack(POLICY_PLEDGES_PACK_ID);
}

/** The ten policy areas of the brief, in reading order. Labels are plain words for the menu. */
export const POLICY_AREA_OPTIONS: { value: PolicyArea | "all"; label: string }[] = [
  { value: "all", label: "All areas" },
  { value: "fiscal", label: "Fiscal policy" },
  { value: "monetary", label: "Monetary policy" },
  { value: "institutions", label: "Economic institutions" },
  { value: "trade", label: "Trade" },
  { value: "industrial", label: "Industrial policy" },
  { value: "labour-market", label: "Labour market" },
  { value: "welfare", label: "Welfare and pensions" },
  { value: "housing-land", label: "Housing and land" },
  { value: "financial-regulation", label: "Financial regulation" },
  { value: "crisis-response", label: "Crises and responses" },
];

export const POLICY_AREA_LABEL: Record<PolicyArea, string> = {
  fiscal: "Fiscal policy",
  monetary: "Monetary policy",
  institutions: "Economic institutions",
  trade: "Trade",
  industrial: "Industrial policy",
  "labour-market": "Labour market",
  welfare: "Welfare and pensions",
  "housing-land": "Housing and land",
  "financial-regulation": "Financial regulation",
  "crisis-response": "Crises and responses",
};

export function asPolicyArea(raw: string | null): PolicyArea | "all" {
  return POLICY_AREA_OPTIONS.some((o) => o.value === raw && o.value !== "all")
    ? (raw as PolicyArea)
    : "all";
}

const RELATIONSHIP_VERB: Record<string, string> = {
  created: "created",
  amended: "amended",
  repealed: "repealed",
  replaced: "replaced",
  administered: "administers",
  funded: "funded",
  implemented: "is made under",
  succeeded: "succeeded",
};

export function relationshipSentence(r: Relationship, titleOf: (id: string) => string): string {
  return `${titleOf(r.from)} ${RELATIONSHIP_VERB[r.kind] ?? r.kind} ${titleOf(r.to)}`;
}

export function economyViewHref(domain: string, view: string): string {
  return `/economy?domain=${encodeURIComponent(domain)}&view=${encodeURIComponent(view)}`;
}

function registerHref(registry: "housing" | "energy" | "economy", id: string): string {
  if (registry === "housing") return `/housing?domain=policy&event=${encodeURIComponent(id)}`;
  if (registry === "energy") return `/energy?domain=policy&view=ledger&event=${encodeURIComponent(id)}`;
  return `/economy?domain=policy&view=ledger&event=${encodeURIComponent(id)}`;
}

function nationLine(e: PolicyEvent): string {
  const nations = e.nations ?? [];
  if (!nations.length) return e.jurisdiction;
  return nations.map((n) => NATION_LABEL[n]).join(" · ");
}

function commencementOf(e: PolicyEvent): string {
  if (e.commencements.length > 0) {
    return e.commencements
      .map((c) => {
        const when = c.date ? formatIso(c.date) : "Date not pinned";
        const instrument = c.instrument ? ` (${c.instrument})` : "";
        return `${when}${instrument}`;
      })
      .join(" · ");
  }
  if (e.type === "programme" || e.type === "institution") return "";
  return "Not recorded in this register.";
}

function recordOf(e: PolicyEvent, titleOf: (registry: string, id: string) => string): LedgerRecord | undefined {
  const d = e.dossier;
  if (!d) return undefined;
  const related: LedgerContextLink[] = d.related.map((r) => ({
    id: `${r.registry}:${r.id}`,
    title: titleOf(r.registry, r.id),
    href: registerHref(r.registry, r.id),
    note: r.note,
  }));
  return {
    sections: [
      { heading: "Background", body: d.background },
      { heading: "Stated objectives", body: d.objectives },
      { heading: "Mechanism", body: d.mechanism },
      { heading: "Implementation", body: d.implementation },
    ],
    measures: d.measures.map((m) => ({ label: m.label, value: m.value, href: m.source?.url })),
    financial: d.financial.map((m) => ({ label: m.label, value: m.value, href: m.source?.url })),
    evaluations: d.evaluations.map((ev) => ({
      label: ev.label,
      href: ev.url,
      publisher: ev.publisher,
      date: ev.date ? formatIso(ev.date) : "",
      finding: ev.finding,
    })),
    related,
  };
}

/** Map one register record to the shared ledger view-model. */
export function toLedgerEvent(
  e: PolicyEvent,
  titleOf: (registry: string, id: string) => string,
): LedgerEvent {
  const area = e.policy_area ? POLICY_AREA_LABEL[e.policy_area] : null;
  const status = statusLabel(e.status) + (e.repealed_date ? ` · ${formatIso(e.repealed_date)}` : "");
  return {
    id: e.id,
    year: String(markYear(e) ?? "—"),
    title: e.title,
    typeLabel: area ? `${TYPE_LABEL[e.type]} · ${area}` : TYPE_LABEL[e.type],
    summary: e.summary,
    extent: e.extent,
    citation: e.citation,
    markLabel: MARK_DATE_LABEL[e.type],
    markValue: e.announcement_date
      ? `${formatIso(markDate(e))} · announced ${formatIso(e.announcement_date)}`
      : formatIso(markDate(e)),
    status,
    applies: nationLine(e),
    commencement: commencementOf(e),
    sources: e.sources.map((src) => ({ label: src.label, href: src.url })),
    context: e.linked_indicators.map((link) => ({
      id: link.id,
      title: link.title,
      href: economyViewHref(link.domain, link.view),
      note: link.note,
    })),
    record: recordOf(e, titleOf),
  };
}

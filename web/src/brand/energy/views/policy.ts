import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

/** Policy has no view tabs — one Decision Ledger stage. */
export const policyViews = {
  domain: "policy",
  status: "ready",
  defaultView: "ledger",
  views: [
    {
      id: "ledger",
      label: "The Decision Ledger",
      params: ["event"],
      evidence: {
        source: ENERGY_SOURCE.policy,
        definition: [
          "Archival Decision Ledger: one chronological list of checked industrial and energy decisions.",
          "Closed rows are electric; open a row for the catalogue card — story beside the register.",
        ],
        method: [
          "Assent, commencement and programme publication dates stay separate fields.",
          "Linked indicators are context only — never treated as effects of the decision.",
        ],
        geography: "United Kingdom (and named nations on each event)",
        period: "Event assent / commencement dates on each card",
        dataHref: "/data#energy-industry",
      },
    },
  ],
} as const satisfies DomainViews;

export const POLICY_VIEWS = policyViews.views.map(({ id, label }) => ({ id, label }));

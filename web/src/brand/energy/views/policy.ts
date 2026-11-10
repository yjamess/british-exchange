import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

/** Policy: the decision ledger, and the Promise Ledger (pledges set beside published series). */
export const policyViews = {
  domain: "policy",
  status: "ready",
  defaultView: "ledger",
  views: [
    {
      id: "ledger",
      label: "Ledger",
      instrument: "The decision ledger",
      params: ["event"],
      evidence: {
        source: ENERGY_SOURCE.policy,
        definition: [
          "The decision ledger: one chronological list of checked industrial and energy decisions.",
          "Closed rows are electric; open a row for the catalogue card — story beside the register.",
        ],
        method: [
          "Assent, commencement and programme publication dates stay separate fields.",
          "Linked indicators are context only — never treated as effects of the decision.",
        ],
        geography: "United Kingdom (and named nations on each event)",
        period: "Royal Assent or start date on each card",
        dataHref: "/data#energy-industry",
      },
    },
    {
      id: "promise",
      label: "Promises",
      instrument: "Promise vs delivery",
      params: ["pledge"],
      evidence: {
        source: ENERGY_SOURCE.policyPledges,
        definition: "Energy pledges quoted from government and party documents, each set beside a published series only when both count the same thing.",
        method: [
          "A pledge is scored only when the pledge and the series share a unit and a period, and the place matches or is bounded.",
          "Every other pledge is listed with the reason it is not scored.",
          "A pledge and a result moving together is not evidence that the policy caused the result.",
        ],
        geography: "United Kingdom, or Great Britain where the pledge says so",
        period: "Date each pledge was made; delivery from the latest release",
        dataHref: "/data#energy-industry",
      },
    },
  ],
} as const satisfies DomainViews;

export const POLICY_VIEWS = policyViews.views.map(({ id, label }) => ({ id, label }));

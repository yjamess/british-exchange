import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const networksViews = {
  domain: "networks",
  status: "ready",
  defaultView: "border",
  views: [
    {
      id: "border",
      label: "Border anatomy",
      params: ["year", "flow"],
      evidence: {
        source: ENERGY_SOURCE.networksBorder,
        definition: "Electricity interconnector flows across Britain’s borders.",
        method: [
          "Flows are metered energy, not spare capacity or a distribution map.",
          "GB interconnectors — not a UK DNO topology.",
        ],
        geography: "Great Britain interconnectors",
        period: "Annual / monthly ET 5.6 flows",
        dataHref: "/data?record=electricity-interconnector-flows",
      },
    },
    {
      id: "night",
      label: "Britain After Dark · lite",
      params: ["year"],
      evidence: {
        source: ENERGY_SOURCE.networksNight,
        definition: "Monthly GB generation mix derived from NESO half-hourly operational data — night reading lite.",
        method: [
          "GB operational mix, not UK Energy Trends annuals. Do not invent substation spare capacity from this view.",
        ],
        geography: "Great Britain",
        period: "Monthly from half-hourly NESO mix",
        dataHref: "/data?record=gb-generation-mix-half-hourly",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "year"],
      evidence: {
        source: ENERGY_SOURCE.networksBorder,
        definition: "Observation tables for interconnector flows and the GB mix series used here.",
        method: ["One table per dataset."],
        geography: "Great Britain",
        period: "As published",
        dataHref: "/data?record=electricity-interconnector-flows",
      },
    },
  ],
} as const satisfies DomainViews;

export const NETWORKS_VIEWS = networksViews.views.map(({ id, label }) => ({ id, label }));

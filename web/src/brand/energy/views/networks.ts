import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const networksViews = {
  domain: "networks",
  status: "ready",
  defaultView: "border",
  views: [
    {
      id: "border",
      label: "Border",
      instrument: "Border anatomy",
      params: ["year", "flow"],
      evidence: {
        source: ENERGY_SOURCE.networksBorder,
        definition: "Electricity interconnector flows across Britain’s borders.",
        method: [
          "Flows are metered energy, not spare capacity or a distribution map.",
          "GB interconnectors — not a UK DNO topology.",
        ],
        geography: "United Kingdom corridors (ET 5.6)",
        period: "Quarterly ET 5.6 flows",
        dataHref: "/data?record=electricity-interconnector-flows",
      },
    },
    {
      id: "queue",
      label: "Queue",
      instrument: "Connections queue",
      params: ["basis", "gate", "status"],
      evidence: {
        source: ENERGY_SOURCE.networksQueue,
        definition:
          "NESO Transmission Entry Capacity register — contracted MW lines by gate, status and technology.",
        method: [
          "Contractual Effective From dates, not speculative ETAs.",
          "Great Britain only. Not a DNO topology or spare-capacity map.",
        ],
        geography: "Great Britain",
        period: "Dated register pin",
        dataHref: "/data?record=transmission-entry-capacity-register",
      },
    },
    {
      id: "grid",
      label: "Invisible grid",
      instrument: "Invisible grid · SSEN pilot",
      params: ["area", "layer", "lines", "site"],
      evidence: {
        source: ENERGY_SOURCE.networksGrid,
        definition:
          "SSEN Distribution substations and EHV/EHV+ overhead lines in SEPD and SHEPD licence areas.",
        method: [
          "Pilot geography only — not a national DNO map.",
          "Overhead lines only. Not spare capacity by node.",
        ],
        geography: "SEPD + SHEPD licence areas",
        period: "Operator pin",
        dataHref: "/data?record=ssen-distribution-network-atlas",
      },
    },
    {
      id: "night",
      // View id stays `night` so existing links keep working; the label says what it shows.
      label: "Monthly imports",
      instrument: "GB imports · monthly totals",
      params: ["year"],
      evidence: {
        source: ENERGY_SOURCE.networksNight,
        definition:
          "Monthly totals of electricity imported into Great Britain (the Imports fuel line of the NESO generation mix), summed from half-hourly operational data. Not a night-time or after-dark reading.",
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
        definition:
          "Observation tables for border flows, TEC queue, cable capacity, SSEN pilot counts and GB Imports fuel.",
        method: ["One table per dataset."],
        geography: "United Kingdom / Great Britain / SSEN as labelled",
        period: "As published",
        dataHref: "/data?record=electricity-interconnector-flows",
      },
    },
  ],
} as const satisfies DomainViews;

export const NETWORKS_VIEWS = networksViews.views.map(({ id, label }) => ({ id, label }));

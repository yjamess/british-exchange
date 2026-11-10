import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const networksViews = {
  domain: "networks",
  status: "ready",
  defaultView: "queue",
  views: [
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
          "Contracted connection dates, not forecasts.",
          "Great Britain only. Not a DNO topology or spare-capacity map.",
        ],
        geography: "Great Britain",
        period: "Latest connections register",
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
        geography: "Southern England and the north of Scotland (SSEN)",
        period: "Latest operator release",
        dataHref: "/data?record=ssen-distribution-network-atlas",
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
        geography: "United Kingdom, Great Britain or SSEN as labelled",
        period: "Quarterly, monthly and latest registers",
        dataHref: "/data?record=electricity-interconnector-flows",
      },
    },
  ],
} as const satisfies DomainViews;

export const NETWORKS_VIEWS = networksViews.views.map(({ id, label }) => ({ id, label }));

import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const lowCarbonViews = {
  domain: "low-carbon",
  status: "ready",
  defaultView: "guide",
  views: [
    {
      id: "guide",
      label: "Field Guide",
      params: ["tech", "year", "measure", "event"],
      evidence: {
        source: ENERGY_SOURCE.renewablesField,
        definition: "Orientation to low-carbon capacity, generation and load factors for selected technologies.",
        method: [
          "Capacity (DUKES), generation (ET 5.1) and load factors (DUKES 6.3 / 5.10) are separate publications.",
          "Do not treat load factor as a plant’s metered output share for a single site.",
        ],
        geography: "United Kingdom",
        period: "Annual capacity · generation · load factors",
        dataHref: "/data?record=renewable-electricity-load-factors",
      },
    },
    {
      id: "capacity",
      label: "Capacity ≠ Output",
      params: ["tech", "year", "lf_basis"],
      evidence: {
        source: ENERGY_SOURCE.renewablesField,
        definition: "Installed capacity set beside annual generation and published load factors for one technology.",
        method: [
          "Nameplate capacity is not generation. Load-factor basis follows the selected DUKES table.",
        ],
        geography: "United Kingdom",
        period: "Annual",
        dataHref: "/data?record=electricity-capacity-by-technology",
      },
    },
    {
      id: "pipeline",
      label: "Pipeline",
      params: ["tech", "year", "lane", "stage", "pipe_tech"],
      evidence: {
        source: ENERGY_SOURCE.renewablesPipeline,
        definition: "Non-operational renewable planning pipeline from the Renewable Energy Planning Database.",
        method: [
          "Pipeline status is planning, not guaranteed build. Operational sites belong on Generation › Map.",
        ],
        geography: "United Kingdom planning register",
        period: "REPD pin · non-operational rows",
        dataHref: "/data?record=renewable-energy-planning-operational",
      },
    },
    {
      id: "buildout",
      label: "Buildout",
      params: ["tech", "year"],
      evidence: {
        source: ENERGY_SOURCE.renewablesField,
        definition: "How installed low-carbon capacity has built out over the published years.",
        method: ["Buildout uses capacity tables; it is not a forecast."],
        geography: "United Kingdom",
        period: "Annual installed capacity",
        dataHref: "/data?record=electricity-capacity-by-technology",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "tech", "year"],
      evidence: {
        source: ENERGY_SOURCE.renewablesLoadFactors,
        definition: "Observation tables for load factors, plant factors, capacity and generation used here.",
        method: ["One table per dataset."],
        geography: "United Kingdom",
        period: "As published",
        dataHref: "/data?record=renewable-electricity-load-factors",
      },
    },
  ],
} as const satisfies DomainViews;

export const LOW_CARBON_VIEWS = lowCarbonViews.views.map(({ id, label }) => ({ id, label }));

import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const industrialWorkViews = {
  domain: "industrial-work",
  status: "ready",
  defaultView: "landscape",
  views: [
    {
      id: "landscape",
      label: "The Labour Landscape",
      params: ["year", "measure"],
      evidence: {
        source: ENERGY_SOURCE.jobsLandscape,
        definition: "Manufacturing employment set beside output — the labour landscape for industrial work.",
        method: [
          "Workforce jobs and IoP are separate ONS publications aligned by year.",
          "This is national industrial work, not a local labour-market map.",
        ],
        geography: "United Kingdom",
        period: "Annual",
        dataHref: "/data?record=manufacturing-employment",
      },
    },
    {
      id: "productivity",
      label: "Productivity Machine",
      params: ["year", "measure"],
      evidence: {
        source: ENERGY_SOURCE.jobsProductivity,
        definition: "Manufacturing output per hour — labour productivity for the sector.",
        method: ["Productivity is output per hour, not a wage or a jobs total."],
        geography: "United Kingdom",
        period: "Annual labour productivity",
        dataHref: "/data?record=manufacturing-output-per-hour",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "year"],
      evidence: {
        source: ENERGY_SOURCE.jobsLandscape,
        definition: "Observation tables for manufacturing employment, output and productivity.",
        method: ["One table per dataset."],
        geography: "United Kingdom",
        period: "As published",
        dataHref: "/data?record=manufacturing-employment",
      },
    },
  ],
} as const satisfies DomainViews;

export const INDUSTRIAL_WORK_VIEWS = industrialWorkViews.views.map(({ id, label }) => ({ id, label }));

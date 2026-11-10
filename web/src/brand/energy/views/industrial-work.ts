import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const industrialWorkViews = {
  domain: "industrial-work",
  status: "ready",
  defaultView: "landscape",
  views: [
    {
      id: "landscape",
      label: "Landscape",
      instrument: "The labour landscape",
      params: ["year"],
      evidence: {
        source: ENERGY_SOURCE.jobsLandscape,
        definition:
          "Manufacturing workforce jobs set beside output and output per hour — national labour landscape.",
        method: [
          "Workforce jobs and Index of Production are separate ONS publications aligned by year.",
          "National manufacturing only — place ranks live on Manufacturing › Places.",
        ],
        geography: "United Kingdom",
        period: "Annual means of quarterly jobs and monthly volume",
        dataHref: "/data?record=manufacturing-employment",
      },
    },
    {
      id: "productivity",
      label: "Productivity",
      instrument: "Productivity machine",
      params: ["year", "measure"],
      evidence: {
        source: ENERGY_SOURCE.jobsProductivity,
        definition:
          "Official manufacturing output per hour or per job, with the published hours component.",
        method: [
          "Productivity series are ONS PRDY indexes — not volume divided by jobs.",
          "Hours is the official productivity-hours index, not Workforce Jobs.",
        ],
        geography: "United Kingdom",
        period: "Quarterly labour productivity",
        dataHref: "/data?record=manufacturing-output-per-hour",
      },
    },
    {
      id: "pay",
      label: "Pay",
      instrument: "Manufacturing pay",
      params: ["pay_measure", "sheet"],
      evidence: {
        source: ENERGY_SOURCE.jobsPay,
        definition:
          "ASHE median earnings for manufacturing section C and two-digit branches — cash pounds.",
        method: [
          "Median is ONS's preferred average. Full-time and all-employee sheets stay separate.",
          "One ASHE edition in this release (2025 revised) — annual % change is the published year-on-year figure.",
        ],
        geography: "United Kingdom",
        period: "April 2025 pay period (ASHE)",
        dataHref: "/data?record=ashe-manufacturing-earnings",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["year"],
      evidence: {
        source: ENERGY_SOURCE.jobsLandscape,
        definition:
          "Observation tables for manufacturing employment, output, productivity, pay and regional jobs.",
        method: ["One table per dataset."],
        geography: "United Kingdom · regions where published",
        period: "As published",
        dataHref: "/data?record=manufacturing-employment",
      },
    },
  ],
} as const satisfies DomainViews;

export const INDUSTRIAL_WORK_VIEWS = industrialWorkViews.views.map(({ id, label }) => ({
  id,
  label,
}));

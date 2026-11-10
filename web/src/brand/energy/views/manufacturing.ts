import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const manufacturingViews = {
  domain: "manufacturing",
  status: "ready",
  defaultView: "anatomy",
  views: [
    {
      id: "anatomy",
      label: "Anatomy",
      instrument: "The production anatomy",
      params: ["year", "from", "level", "industry", "measure"],
      evidence: {
        source: ENERGY_SOURCE.manufacturingIopBranches,
        definition:
          "Each manufacturing branch’s share of UK manufacturing, or how its volume index changed between two years.",
        method: [
          "Share of manufacturing uses the weights ONS applies in the Index of Production — they add up within a level.",
          "Volume change compares a branch’s own index between two years — not its size relative to other branches.",
        ],
        geography: "United Kingdom",
        period: "Monthly Index of Production; year figures are means of months",
        dataHref: "/data?record=manufacturing-iop-by-division",
      },
    },
    {
      id: "output-jobs",
      label: "Output and jobs",
      instrument: "Output and jobs",
      params: ["year"],
      evidence: {
        source: ENERGY_SOURCE.manufacturingLandscape,
        definition:
          "All of manufacturing, three ways: volume made, people in workforce jobs, and share of the UK economy.",
        method: [
          "Each panel is a separate ONS series with its own unit — volume index, thousands of jobs, and % of gross value added.",
          "Output per hour sits on the Data tab and the Jobs & Productivity domain, not here.",
        ],
        geography: "United Kingdom",
        period: "Monthly volume, quarterly jobs, annual economy share",
        dataHref: "/data?record=manufacturing-employment",
      },
    },
    {
      id: "places",
      label: "Places",
      instrument: "Regional employee jobs",
      // `level` picks Broad vs Detailed branches, so an `industry` id is only meaningful with it
      // (the retired Jobs Atlas carried it; Places must too or branch links lose their level).
      params: ["year", "from", "level", "industry"],
      evidence: {
        source: ENERGY_SOURCE.manufacturingBres,
        definition:
          "Where manufacturing employee jobs sit by region — all manufacturing, or one Anatomy branch.",
        method: [
          "All manufacturing uses BRES Table 4 (UK regions; 2024 has no Northern Ireland).",
          "A selected branch uses Nomis open-access BRES by SIC division × Great Britain region.",
        ],
        geography: "United Kingdom and Great Britain regions",
        period: "Annual employment survey editions",
        dataHref: "/data?record=bres-manufacturing-employee-jobs-by-region",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "year"],
      evidence: {
        source: ENERGY_SOURCE.manufacturingIop,
        definition:
          "Observation tables for manufacturing branches, national volume, economy share, employment, productivity and regional jobs.",
        method: ["One table per dataset."],
        geography: "United Kingdom and regions",
        period: "Monthly, quarterly and annual, by table",
        dataHref: "/data?record=manufacturing-iop-by-division",
      },
    },
  ],
} as const satisfies DomainViews;

export const MANUFACTURING_VIEWS = manufacturingViews.views.map(({ id, label }) => ({ id, label }));

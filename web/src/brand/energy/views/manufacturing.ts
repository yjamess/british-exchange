import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const manufacturingViews = {
  domain: "manufacturing",
  status: "ready",
  defaultView: "anatomy",
  views: [
    {
      id: "anatomy",
      label: "The Production Anatomy",
      params: ["year", "measure"],
      evidence: {
        source: ENERGY_SOURCE.manufacturingIop,
        definition: "Composition of UK manufacturing output from the Index of Production.",
        method: [
          "Volume, share, jobs and productivity dials switch published series — they are not one combined table.",
        ],
        geography: "United Kingdom",
        period: "Annual / quarterly IoP as published",
        dataHref: "/data?record=manufacturing-output-index",
      },
    },
    {
      id: "output-jobs",
      label: "Output vs Jobs",
      params: ["year", "measure"],
      evidence: {
        source: ENERGY_SOURCE.manufacturingLandscape,
        definition: "Manufacturing output set beside employment — two series, one stage.",
        method: ["Jobs and output are aligned by year; productivity is a third series when shown."],
        geography: "United Kingdom",
        period: "Annual overlap of IoP and workforce jobs",
        dataHref: "/data?record=manufacturing-employment",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "year"],
      evidence: {
        source: ENERGY_SOURCE.manufacturingIop,
        definition: "Observation tables for manufacturing output, GVA share, employment and productivity.",
        method: ["One table per dataset."],
        geography: "United Kingdom",
        period: "As published",
        dataHref: "/data?record=manufacturing-output-index",
      },
    },
  ],
} as const satisfies DomainViews;

export const MANUFACTURING_VIEWS = manufacturingViews.views.map(({ id, label }) => ({ id, label }));

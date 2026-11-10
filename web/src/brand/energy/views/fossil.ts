import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const fossilViews = {
  domain: "fossil",
  status: "ready",
  defaultView: "northsea",
  views: [
    {
      id: "northsea",
      label: "Fields",
      instrument: "North Sea fields",
      params: ["year", "atlas_year", "scale", "fuel", "status", "field", "q"],
      evidence: {
        source: ENERGY_SOURCE.fossilsNorthSea,
        definition: "UK Continental Shelf offshore fields and annual field production where published.",
        method: [
          "Field points are NSTA locations; production is PPRS annuals — not a well-by-well map.",
          "Ceased and producing statuses follow the publisher’s labels.",
        ],
        geography: "UK Continental Shelf",
        period: "Annual field production · register pin for locations",
        dataHref: "/data?record=nsta-ukcs-fields",
      },
    },
    {
      id: "extraction",
      label: "Extraction",
      instrument: "The extraction century",
      params: ["year", "fuel"],
      evidence: {
        source: ENERGY_SOURCE.fossilsFuels,
        definition: "UK crude oil, gas, coal and primary energy production over the long published span.",
        method: ["Fuels keep their published units; gas may be converted for chart reading and labelled as such."],
        geography: "United Kingdom",
        period: "Annual production series",
        dataHref: "/data?record=crude-oil-production",
      },
    },
    {
      id: "gap",
      label: "Gap",
      instrument: "The production gap",
      params: ["year"],
      evidence: {
        source: ENERGY_SOURCE.fossilsGap,
        definition: "Domestic primary production set beside imports — the production gap, not a balance-sheet residual.",
        method: ["Import and production series are aligned by year; they are not netted into a single official gap table."],
        geography: "United Kingdom",
        period: "Annual",
        dataHref: "/data?record=primary-energy-production",
      },
    },
    {
      id: "reserves",
      label: "Reserves",
      instrument: "What's left",
      params: ["year"],
      evidence: {
        source: ENERGY_SOURCE.fossilsReserves,
        definition: "Historic oil and gas reserves and contingent resources as published by NSTA.",
        method: ["Reserves are not production. Contingent resources are not proven reserves."],
        geography: "United Kingdom / UKCS as published",
        period: "Annual reserves publications",
        dataHref: "/data?record=uk-oil-gas-reserves",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "year"],
      evidence: {
        source: ENERGY_SOURCE.fossilsFuels,
        definition: "Observation tables for crude, gas, coal, primary production, fields and reserves.",
        method: ["One table per dataset. Spatial registers stay in the map view."],
        geography: "United Kingdom / UKCS by dataset",
        period: "As published per selected dataset",
        dataHref: "/data?record=crude-oil-production",
      },
    },
  ],
} as const satisfies DomainViews;

export const FOSSIL_VIEWS = fossilViews.views.map(({ id, label }) => ({ id, label }));

import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const importsViews = {
  domain: "imports",
  status: "ready",
  defaultView: "lifelines",
  views: [
    {
      id: "lifelines",
      label: "The Lifelines Map",
      params: ["year", "basis", "fuel", "flow", "mode", "partner", "list"],
      evidence: {
        source: ENERGY_SOURCE.importsLifelines,
        definition: "Where oil, pipeline gas and LNG enter Britain — partner and terminal readings.",
        method: [
          "Oil by country, gas by partner and LNG by terminal are separate DUKES tables.",
          "Map weights are published volumes, not inferred route capacity.",
        ],
        geography: "United Kingdom entry points and trade partners",
        period: "Annual DUKES trade tables",
        dataHref: "/data?record=oil-imports-by-country",
      },
    },
    {
      id: "resilience",
      label: "The Resilience Test",
      params: ["year", "basis"],
      evidence: {
        source: ENERGY_SOURCE.importsResilience,
        definition: "Import dependency, fossil dependency and low-carbon share ratios from Energy Trends.",
        method: [
          "Ratios are publisher definitions. Gas storage capacity sits beside them as context, not a resilience score.",
        ],
        geography: "United Kingdom",
        period: "Annual ET 1.3 ratios",
        dataHref: "/data?record=energy-import-dependency",
      },
    },
    {
      id: "shock",
      label: "Shock & Response",
      params: ["year", "event"],
      evidence: {
        source: ENERGY_SOURCE.importsShock,
        definition: "Checked shock-and-response event cards with linked official series as context only.",
        method: [
          "Events are curated narratives with sources. Linked series do not prove causation.",
        ],
        geography: "United Kingdom / named interconnectors as cited",
        period: "Event dates on each card",
        dataHref: "/data?record=energy-import-dependency",
      },
    },
    {
      id: "connectors",
      label: "Britain's Connectors",
      params: ["year", "flow", "basis"],
      evidence: {
        source: ENERGY_SOURCE.importsConnectors,
        definition: "Electricity interconnector flows and contracted capacity.",
        method: [
          "Flows (ET 5.6) and capacity (NESO register) are different grains — never treat flow as spare capacity.",
        ],
        geography: "Great Britain interconnectors",
        period: "Annual / monthly flows as published",
        dataHref: "/data?record=electricity-interconnector-flows",
      },
    },
    {
      id: "trade",
      label: "Imports and exports",
      params: ["year", "basis"],
      evidence: {
        source: ENERGY_SOURCE.importsTrade,
        definition: "Gross energy imports and exports from Energy Trends table 1.3.",
        method: ["Trade totals are not net dependency. Use the Resilience view for dependency ratios."],
        geography: "United Kingdom",
        period: "Annual",
        dataHref: "/data?record=energy-imports-and-exports",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "year"],
      evidence: {
        source: ENERGY_SOURCE.importsDependency,
        definition: "Observation tables for dependency, trade, interconnectors and partner series.",
        method: ["One table per dataset."],
        geography: "United Kingdom / GB interconnectors by dataset",
        period: "As published",
        dataHref: "/data?record=energy-import-dependency",
      },
    },
  ],
} as const satisfies DomainViews;

export const IMPORTS_VIEWS = importsViews.views.map(({ id, label }) => ({ id, label }));

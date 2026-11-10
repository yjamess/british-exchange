import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const consumptionViews = {
  domain: "consumption",
  status: "ready",
  defaultView: "metabolism",
  views: [
    {
      id: "metabolism",
      label: "Metabolism",
      instrument: "Energy metabolism",
      params: ["measure", "year", "compare", "base", "sector"],
      evidence: {
        source: ENERGY_SOURCE.consumptionFinal,
        definition: "UK final energy consumption by sector — how demand is allocated across the published sectors.",
        method: [
          "Final consumption, not primary supply. Index mode rebases to a chosen year.",
          "Sector totals follow ECUK table C1; do not treat them as useful energy.",
        ],
        geography: "United Kingdom",
        period: "Annual ECUK final consumption",
        dataHref: "/data?record=final-energy-consumption-by-sector",
      },
    },
    {
      id: "appetite",
      label: "Demand",
      instrument: "Long-run demand",
      params: ["measure", "year", "compare", "lens", "sector", "base"],
      evidence: {
        source: ENERGY_SOURCE.consumptionFinal,
        definition: "Long-run shape of UK final energy demand by sector or fuel lens.",
        method: [
          "Compare years use the same published series; gaps are not filled.",
          "Fuel lens regroups published fuels — it is not a second official table.",
        ],
        geography: "United Kingdom",
        period: "Annual · long-run ECUK span",
        dataHref: "/data?record=final-energy-consumption-by-sector",
      },
    },
    {
      id: "end-use",
      label: "End use",
      instrument: "Energy use",
      params: ["year", "end_use", "end_scope", "cross_end", "sector"],
      evidence: {
        source: ENERGY_SOURCE.consumptionEndUse,
        definition: "Domestic and cross-sector end-use of energy as published in ECUK.",
        method: [
          "End-use categories are the publisher’s groups. Cross-sector and domestic scopes are separate tables.",
          "Do not read end-use shares as a full UK energy balance.",
        ],
        geography: "United Kingdom",
        period: "Annual ECUK end-use tables",
        dataHref: "/data?record=domestic-end-use",
      },
    },
    {
      id: "geography",
      label: "Geography",
      instrument: "Energy geography",
      params: ["year", "geo_sector", "place", "region", "geo_measure"],
      evidence: {
        source: ENERGY_SOURCE.consumptionGeography,
        definition: "Subnational final energy consumption by local authority and sector.",
        method: [
          "Intensity uses population where published; missing places stay blank.",
          "Nation totals and LA rows are different grains — do not average LA rows into a nation.",
        ],
        geography: "United Kingdom local authorities (publisher coverage)",
        period: "Annual subnational final consumption",
        dataHref: "/data?record=subnational-final-consumption",
      },
    },
    {
      id: "useful",
      label: "Useful",
      instrument: "Useful energy experiment",
      params: ["year", "assume", "eff", "eff_end_use", "use_sector"],
      evidence: {
        source: ENERGY_SOURCE.consumptionUseful,
        definition: "Experimental useful-energy reading from published end-use and assumed conversion efficiencies.",
        method: [
          "Efficiencies are labelled assumptions, not measured plant performance.",
          "Scenario mode changes assumptions only; it does not invent new consumption totals.",
        ],
        geography: "United Kingdom",
        period: "Annual · ECUK W1 span from 1998",
        dataHref: "/data?record=cross-sector-end-use",
      },
    },
    {
      id: "data",
      label: "Data",
      params: ["dataset", "year", "geo_sector", "place"],
      evidence: {
        source: ENERGY_SOURCE.consumptionFinal,
        definition: "Observation tables for final consumption, end-use and geography series behind this domain.",
        method: ["One table per dataset or frequency. Catalogue links stay in the Notes foot."],
        geography: "United Kingdom (and LA where the geography dataset is selected)",
        period: "As published per selected dataset",
        dataHref: "/data?record=final-energy-consumption-by-sector",
      },
    },
  ],
} as const satisfies DomainViews;

export const CONSUMPTION_VIEWS = consumptionViews.views.map(({ id, label }) => ({ id, label }));

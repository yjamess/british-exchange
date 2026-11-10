import { ENERGY_SOURCE } from "../citations";
import type { DomainViews } from "./types";

export const pricesViews = {
  domain: "prices",
  status: "ready",
  defaultView: "bill",
  views: [
    {
      id: "bill",
      label: "Bill",
      instrument: "The dissected bill",
      // `vs` is the Compare-with year; it must be declared here or the URL prune drops it.
      params: ["year", "payment", "tariff", "band", "bill_fuel", "kwh", "region", "vs", "region_source", "cap_measure", "cap_period"],
      evidence: {
        source: ENERGY_SOURCE.pricesDomesticElectricity,
        definition: "Domestic electricity and gas bills dissected into unit rates, standing charges and payment method.",
        method: [
          "Cash bills as published; real terms use CPIH when selected.",
          "Typical consumption bands are publisher assumptions, not a household meter reading.",
        ],
        geography: "United Kingdom (regional layers where selected)",
        period: "Quarterly Energy Prices · annual bill averages",
        dataHref: "/data?record=domestic-electricity-bills",
      },
    },
    {
      id: "afford",
      label: "Afford",
      instrument: "What can you afford?",
      params: ["year", "bill_fuel", "payment", "tariff", "band", "vs"],
      evidence: {
        source: ENERGY_SOURCE.pricesAfford,
        definition: "Domestic bills set beside average weekly earnings — an affordability reading, not a budget.",
        method: [
          "Earnings are ONS average weekly earnings; bills are DESNZ. They are aligned by year, not by household.",
          "Do not treat the ratio as the share of income spent by a typical household.",
        ],
        geography: "United Kingdom",
        period: "Annual overlap of bills and earnings",
        dataHref: "/data?record=domestic-electricity-bills",
      },
    },
    {
      id: "shock",
      label: "Shock",
      instrument: "How far prices rose",
      params: ["year", "bill_fuel", "payment", "tariff", "band"],
      evidence: {
        source: ENERGY_SOURCE.pricesShock,
        definition: "How far domestic and industrial electricity prices moved across selected years.",
        method: ["Comparisons use the same published series; cash and real readings stay labelled."],
        geography: "United Kingdom",
        period: "Selected year versus earlier years in the series",
        dataHref: "/data?record=domestic-electricity-bills",
      },
    },
    {
      id: "regions",
      label: "Geography",
      params: ["year", "bill_fuel", "region", "region_source", "cap_measure", "cap_period"],
      evidence: {
        source: ENERGY_SOURCE.pricesRegions,
        definition: "Regional unit rates, standing charges and Ofgem cap annex readings.",
        method: [
          "DESNZ regional bills and Ofgem Annex 9 are separate publications — switch source explicitly.",
          "Missing regions stay blank; they are not filled from the GB average.",
        ],
        geography: "Great Britain regions (Ofgem) / UK nations and regions (DESNZ)",
        period: "Cap period or QEP regional year selected",
        dataHref: "/data?record=ofgem-default-tariff-cap",
      },
    },
    {
      id: "wholesale",
      label: "Wholesale",
      instrument: "Wholesale fuels",
      params: ["year", "mpp_measure"],
      evidence: {
        source: ENERGY_SOURCE.pricesWholesale,
        definition: "Fuels purchased by major power producers — wholesale input prices, not household bills.",
        method: ["MPP series are not the retail bill. Do not read them as a domestic unit rate."],
        geography: "United Kingdom major power producers",
        period: "As published in Quarterly Energy Prices",
        dataHref: "/data?record=mpp-fuel-prices",
      },
    },
  ],
} as const satisfies DomainViews;

export const PRICES_VIEWS = pricesViews.views.map(({ id, label }) => ({ id, label }));

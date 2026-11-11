/**
 * Economy connection registry — primary Follows (lab 1 + 4 chrome).
 * Domain ids match ECONOMY_DOMAIN_IDS in economy/types.ts.
 * Contract: docs/connections-contract.md
 */

import type { ArrivalContext, Connection, ConnectionSelection } from "./types";
import {
  connectionById,
  connectionsFor,
  primaryConnectionFor,
  resolveConnectionHref,
  resolveFirstConnection,
} from "./resolve";

const ECONOMY = "/economy";
const ENERGY = "/energy";
const HOUSING = "/housing";

export const ECONOMY_CONNECTIONS: readonly Connection[] = [
  // —— Inflation · Changing price → Energy bills (CPIH restatement) ——
  {
    id: "economy.inflation.rate→energy.prices.bill",
    kind: "contextual",
    from: { sector: "economy", domain: "inflation", view: "rate" },
    to: {
      pathname: ENERGY,
      domain: "prices",
      view: "bill",
      retain: [],
    },
    label: "Domestic bills in CPIH prices",
    why: "Headline inflation is not a household energy bill — Energy restates cash bills with the CPIH index.",
    learn: "Open Energy › Dissected Bill for published domestic bill components and the Exchange CPIH restatement.",
    readiness: "ready",
    honesty:
      "How household energy bills have moved, with one line adjusted for rising prices using CPIH. That adjusted line is worked out by British Exchange.",
    destinationLabel: "Energy · Dissected Bill",
    primary: true,
  },

  // —— Inflation · What a pound buys → Housing prices (CPI real house prices) ——
  {
    id: "economy.inflation.index→housing.prices",
    kind: "contextual",
    from: { sector: "economy", domain: "inflation", view: "index" },
    to: {
      pathname: HOUSING,
      domain: "prices",
      view: "history",
      retain: [],
    },
    label: "House prices over time",
    why: "The CPI index is the deflator Housing uses for real house prices — open the price reading itself.",
    learn: "Open Housing › House prices › History. Real-terms restatements stay Exchange-labelled.",
    readiness: "ready",
    honesty: "House prices over time, from a separate ONS publication. Compare how they moved, not the amounts.",
    destinationLabel: "Housing · Prices",
    primary: true,
  },

  // —— Inflation · Data → Wages (pay vs prices) ——
  {
    id: "economy.inflation.data→wages.vs-prices",
    kind: "contextual",
    from: { sector: "economy", domain: "inflation", view: "data" },
    to: {
      pathname: ECONOMY,
      domain: "wages",
      view: "vs-prices",
      retain: [],
    },
    label: "Pay against prices",
    why: "Inflation series alone do not show whether pay kept pace — Wages pairs earnings with CPIH.",
    learn: "Open Wages › Pay vs prices. AWE is Great Britain; CPIH is United Kingdom — geography chip required.",
    readiness: "ready",
    honesty: "Whether pay has kept up with prices. Pay covers Great Britain; prices cover the whole UK.",
    destinationLabel: "Wages · Pay vs prices",
    primary: true,
  },

  // —— Inflation · What's driving it → Wages Pay vs prices ——
  {
    id: "economy.inflation.categories→wages.vs-prices",
    kind: "contextual",
    from: { sector: "economy", domain: "inflation", view: "categories" },
    to: {
      pathname: ECONOMY,
      domain: "wages",
      view: "vs-prices",
      retain: [],
    },
    label: "Pay against prices",
    why: "Category rates show which goods rose fastest — Wages asks whether pay kept pace with the all-items index.",
    learn: "Open Wages › Pay vs prices. Category rates are CPIH divisions; AWE is Great Britain.",
    readiness: "ready",
    honesty: "Whether pay has kept up with prices. Pay covers Great Britain; prices cover the whole UK.",
    destinationLabel: "Wages · Pay vs prices",
    primary: true,
  },

  // —— Inflation · Everyday basket → Energy Dissected Bill ——
  {
    id: "economy.inflation.basket→energy.prices.bill",
    kind: "contextual",
    from: { sector: "economy", domain: "inflation", view: "basket" },
    to: {
      pathname: ENERGY,
      domain: "prices",
      view: "bill",
      retain: [],
    },
    label: "Domestic energy bills",
    why: "The everyday basket covers shop staples — energy bills are a separate household cost on Energy.",
    learn: "Open Energy › Dissected Bill for published domestic bill components.",
    readiness: "ready",
    honesty:
      "Energy bills are measured separately from the shop prices in this basket, by a different government department.",
    destinationLabel: "Energy · Dissected Bill",
    primary: true,
  },

  // —— Wages · Value of work → Inflation Changing price ——
  {
    id: "economy.wages.value→inflation.rate",
    kind: "contextual",
    from: { sector: "economy", domain: "wages", view: "value" },
    to: {
      pathname: ECONOMY,
      domain: "inflation",
      view: "rate",
      params: { measure: "cpih" },
      retain: [],
    },
    label: "How fast prices are rising",
    why: "Distance-to-peak is real pay only — open the CPIH rate for the price dial that sits behind the deflator.",
    learn: "Open Inflation › Changing price with CPIH selected.",
    readiness: "ready",
    honesty: "Real AWE is Great Britain; CPIH is United Kingdom. Peak is an observed high in this pin.",
    destinationLabel: "Inflation · Changing price",
    primary: true,
  },

  // —— Wages · Pay vs prices → Inflation index (CPIH level) ——
  {
    id: "economy.wages.vs-prices→inflation.index",
    kind: "contextual",
    from: { sector: "economy", domain: "wages", view: "vs-prices" },
    to: {
      pathname: ECONOMY,
      domain: "inflation",
      view: "index",
      retain: [],
    },
    label: "CPI and CPIH index levels",
    why: "The rebased comparison uses CPIH — open the index reading for absolute levels (2015 = 100).",
    learn: "Open Inflation › What a pound buys. Geography break remains: AWE is Great Britain; CPIH is United Kingdom.",
    readiness: "ready",
    honesty: "GB ≠ UK. Rebased indexes show relative growth, not pound levels.",
    destinationLabel: "Inflation · What a pound buys",
    primary: true,
  },

  // —— Wages · Pay cheque vs prices → Energy Prices affordability (secondary) ——
  {
    id: "economy.wages.vs-prices→energy.prices.afford",
    kind: "contextual",
    from: { sector: "economy", domain: "wages", view: "vs-prices" },
    to: {
      pathname: ENERGY,
      domain: "prices",
      view: "afford",
      retain: [],
    },
    label: "Bills as a share of pay",
    why: "Cash AWE is the pay denominator Energy uses for bill affordability — open the bill instrument.",
    learn: "Open Energy › Affordability. Bill pounds are DESNZ; pay is ONS AWE (Great Britain).",
    readiness: "ready",
    honesty: "Bill share of pay is an Exchange reading of two publications — not a household quote.",
    destinationLabel: "Energy · Affordability",
    primary: false,
  },

  // —— Wages · Data → Energy Jobs manufacturing ASHE (link only) ——
  {
    id: "economy.wages.data→energy.jobs.pay",
    kind: "contextual",
    from: { sector: "economy", domain: "wages", view: "data" },
    to: {
      pathname: ENERGY,
      domain: "industrial-work",
      view: "pay",
      retain: [],
    },
    label: "Manufacturing pay (ASHE)",
    why: "Whole-economy AWE is not manufacturing medians — Energy owns the manufacturing ASHE series.",
    learn: "Open Energy › Jobs › Pay for manufacturing ASHE. Do not treat it as national wage distribution.",
    readiness: "ready",
    honesty: "Link only — never fork `ashe-manufacturing-earnings` under Economy.",
    destinationLabel: "Energy · Jobs · Pay",
    primary: true,
  },

  // —— Wages · Ladder → Energy Jobs manufacturing ASHE (link only) ——
  {
    id: "economy.wages.ladder→energy.jobs.pay",
    kind: "contextual",
    from: { sector: "economy", domain: "wages", view: "ladder" },
    to: {
      pathname: ENERGY,
      domain: "industrial-work",
      view: "pay",
      retain: [],
    },
    label: "Manufacturing pay (ASHE)",
    why: "The national wage ladder is ASHE Table 1 — manufacturing medians by SIC are a different table on Energy.",
    learn: "Open Energy › Jobs › Pay for Table 4 manufacturing. Do not mix it with the national percentiles.",
    readiness: "ready",
    honesty: "Table 1 ≠ Table 4. Link only — never fork manufacturing ASHE under Economy.",
    destinationLabel: "Energy · Jobs · Pay",
    primary: true,
  },

  // —— Wages · Geography → national Wage ladder ——
  {
    id: "economy.wages.geography→wages.ladder",
    kind: "contextual",
    from: { sector: "economy", domain: "wages", view: "geography" },
    to: {
      pathname: ECONOMY,
      domain: "wages",
      view: "ladder",
      retain: ["sheet"],
    },
    label: "National wage ladder",
    why: "Geography of Pay is workplace medians by place — the national distribution is ASHE Table 1 percentiles.",
    learn: "Open Wage ladder for UK percentiles. Table 7 ≠ Table 1; workplace ≠ residence.",
    readiness: "ready",
    honesty: "Workplace medians are not the national percentile ladder.",
    destinationLabel: "Wages · Wage ladder",
    primary: true,
  },

  // —— Wages · Geography → Energy Jobs manufacturing ASHE (link only) ——
  {
    id: "economy.wages.geography→energy.jobs.pay",
    kind: "contextual",
    from: { sector: "economy", domain: "wages", view: "geography" },
    to: {
      pathname: ENERGY,
      domain: "industrial-work",
      view: "pay",
      retain: [],
    },
    label: "Manufacturing pay (ASHE)",
    why: "Regional whole-economy workplace pay is not manufacturing by SIC — Energy owns Table 4.",
    learn: "Open Energy › Jobs › Pay for manufacturing ASHE. Do not treat regional medians as industry pay.",
    readiness: "ready",
    honesty: "Table 7 geography ≠ Table 4 manufacturing. Link only.",
    destinationLabel: "Energy · Jobs · Pay",
    primary: false,
  },

  // —— Growth · What Britain produces → Energy manufacturing productivity ——
  {
    id: "economy.growth.produce→energy.industrial-work.productivity",
    kind: "contextual",
    from: { sector: "economy", domain: "growth", view: "produce" },
    to: {
      pathname: ENERGY,
      domain: "industrial-work",
      view: "productivity",
      retain: [],
    },
    label: "Manufacturing productivity",
    why: "Whole-economy output per hour is not manufacturing productivity — Energy owns the factory reading.",
    learn: "Open Energy › Jobs › Productivity. Compare growth rates, never levels, across the two.",
    readiness: "ready",
    honesty: "Link only — never fork manufacturing PRDY series under Economy.",
    destinationLabel: "Energy · Jobs · Productivity",
    primary: true,
  },

  // —— Growth · Productivity → Energy manufacturing productivity ——
  {
    id: "economy.growth.productivity→energy.industrial-work.productivity",
    kind: "contextual",
    from: { sector: "economy", domain: "growth", view: "productivity" },
    to: {
      pathname: ENERGY,
      domain: "industrial-work",
      view: "productivity",
      retain: [],
    },
    label: "Manufacturing productivity",
    why: "Whole-economy LZVB sits beside Energy's manufacturing output-per-hour — different composition.",
    learn: "Open Energy › Jobs › Productivity for the manufacturing machine.",
    readiness: "ready",
    honesty: "Compare growth rates only. Levels are not interchangeable.",
    destinationLabel: "Energy · Jobs · Productivity",
    primary: true,
  },

  // —— Growth · Ledger → Debt dial ——
  {
    id: "economy.growth.ledger→debt.dial",
    kind: "contextual",
    from: { sector: "economy", domain: "growth", view: "ledger" },
    to: {
      pathname: ECONOMY,
      domain: "debt",
      view: "dial",
      retain: [],
    },
    label: "Public debt dial",
    why: "Output growth is one side of the public-finance story — Debt holds the official debt and borrowing dials.",
    learn: "Open Debt › Dial. Debt % of GDP uses the official HF6X series — never derive from ABMI.",
    readiness: "ready",
    honesty: "GDP and public finances are different publications. No causal claim from coincident moves.",
    destinationLabel: "Debt · Dial",
    primary: true,
  },

  // —— Growth · Data → Wages real pay ——
  {
    id: "economy.growth.data→wages.vs-prices",
    kind: "contextual",
    from: { sector: "economy", domain: "growth", view: "data" },
    to: {
      pathname: ECONOMY,
      domain: "wages",
      view: "vs-prices",
      retain: [],
    },
    label: "Pay cheque vs prices",
    why: "Output growth is not the same as whether pay kept up — Wages holds the cash and real pay readings.",
    learn: "Open Wages › Pay cheque vs prices. AWE is Great Britain; GDP is United Kingdom.",
    readiness: "ready",
    honesty: "GB earnings ≠ UK output. Coincident moves are not causation.",
    destinationLabel: "Wages · Pay cheque vs prices",
    primary: true,
  },

  // —— Debt · Dial → Growth ledger ——
  {
    id: "economy.debt.dial→growth.ledger",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "dial" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "ledger",
      retain: [],
    },
    label: "How fast output is growing",
    why: "Debt % of GDP uses the official PSF ratio — Growth shows output growth, not the PSF denominator.",
    learn: "Open Growth › Ledger for GDP and per-head growth since 2019 Q4.",
    readiness: "ready",
    honesty: "HF6X must never be rebuilt from ABMI. Coincident moves are not causation.",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Borrowing → Growth ledger ——
  {
    id: "economy.debt.borrowing→growth.ledger",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "borrowing" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "ledger",
      retain: [],
    },
    label: "How fast output is growing",
    why: "Borrowing is a public-finance flow — Growth holds the output growth reading beside it.",
    learn: "Open Growth › Ledger. Do not overlay borrowing on GDP levels.",
    readiness: "ready",
    honesty: "Stock/flow and publication families differ. Link only.",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Interest → Growth ledger ——
  {
    id: "economy.debt.interest→growth.ledger",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "interest" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "ledger",
      retain: [],
    },
    label: "How fast output is growing",
    why: "Interest cost is central-government expenditure — Growth shows output, not the fiscal interest bill.",
    learn: "Open Growth › Ledger for the output side of the public-finance story.",
    readiness: "ready",
    honesty: "NMFX is CG interest, not whole public sector. No causal claim from coincident moves.",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Data → Growth data ——
  {
    id: "economy.debt.data→growth.data",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "data" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "data",
      retain: [],
    },
    label: "Growth observation tables",
    why: "Public-finance pins and national-accounts pins are different publications — keep the tables separate.",
    learn: "Open Growth › Data for GDP and productivity rows.",
    readiness: "ready",
    honesty: "Do not join PSF and QNA tables into one chart.",
    destinationLabel: "Growth · Data",
    primary: true,
  },
] as const satisfies readonly Connection[];

const REGISTRY: readonly Connection[] = ECONOMY_CONNECTIONS;

export function economyConnectionById(id: string): Connection | null {
  return connectionById(id, REGISTRY);
}

export function economyConnectionsFor(
  origin: { domain: string; view?: string | null },
  selection: ConnectionSelection = {},
): Connection[] {
  return connectionsFor(
    { sector: "economy", domain: origin.domain, view: origin.view },
    selection,
    REGISTRY,
  );
}

export function primaryEconomyConnection(
  origin: { domain: string; view?: string | null },
  selection: ConnectionSelection = {},
): Connection | null {
  return primaryConnectionFor(
    { sector: "economy", domain: origin.domain, view: origin.view },
    selection,
    REGISTRY,
  );
}

export function resolveEconomyConnectionHref(
  conn: Connection,
  selection: ConnectionSelection = {},
  current?: URLSearchParams | string | null,
  arrival?: ArrivalContext | null,
): string | null {
  return resolveConnectionHref(conn, selection, current, arrival);
}

export function firstEconomyConnection(
  origin: { domain: string; view?: string | null },
  selection: ConnectionSelection = {},
  current?: URLSearchParams | string | null,
  arrival?: ArrivalContext | null,
): { connection: Connection; href: string } | null {
  return resolveFirstConnection(
    { sector: "economy", domain: origin.domain, view: origin.view },
    selection,
    REGISTRY,
    current,
    arrival,
  );
}

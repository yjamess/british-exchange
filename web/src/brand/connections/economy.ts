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

  // —— Employment · The British Workforce → Wages (GB pay; UK labour) ——
  {
    id: "economy.employment.workforce→wages.value",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "workforce" },
    to: {
      pathname: ECONOMY,
      domain: "wages",
      view: "value",
      retain: [],
    },
    label: "What pay is worth",
    why: "Headcounts show who is in work — Wages shows whether pay has kept its value.",
    learn: "Open Wages › The Value of Work. Labour Force Survey is United Kingdom; average weekly earnings are Great Britain.",
    readiness: "ready",
    honesty: "UK labour-force counts and Great Britain pay are different geographies. Moving together is not cause and effect.",
    destinationLabel: "Wages · The Value of Work",
    primary: true,
  },

  // —— Employment · Rates → Energy manufacturing employment ——
  {
    id: "economy.employment.rates→energy.industrial-work.landscape",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "rates" },
    to: {
      pathname: ENERGY,
      domain: "industrial-work",
      view: "landscape",
      retain: [],
    },
    label: "Manufacturing jobs",
    why: "National rates are not factory employment — Energy owns manufacturing jobs and places.",
    learn: "Open Energy › Jobs › Labour Landscape. Link only — never fork manufacturing employment under Economy.",
    readiness: "ready",
    honesty: "Whole-economy LFS rates are not manufacturing jobs. Link only.",
    destinationLabel: "Energy · Jobs · Labour Landscape",
    primary: true,
  },

  // —— Employment · Data → Wages pay vs prices ——
  {
    id: "economy.employment.data→wages.vs-prices",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "data" },
    to: {
      pathname: ECONOMY,
      domain: "wages",
      view: "vs-prices",
      retain: [],
    },
    label: "Pay against prices",
    why: "Labour-force tables are not pay — Wages holds cash and real earnings.",
    learn: "Open Wages › Pay vs prices. UK LFS ≠ Great Britain AWE.",
    readiness: "ready",
    honesty: "Employment status and earnings are different publications. Geography break: UK vs Great Britain.",
    destinationLabel: "Wages · Pay vs prices",
    primary: true,
  },

  // —— Employment · What Britain Does → Energy manufacturing jobs ——
  {
    id: "economy.employment.industry→energy.industrial-work.landscape",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "industry" },
    to: {
      pathname: ENERGY,
      domain: "industrial-work",
      view: "landscape",
      retain: [],
    },
    label: "Manufacturing jobs",
    why: "National workforce jobs are not manufacturing employment — Energy owns the factory reading.",
    learn: "Open Energy › Jobs › Labour Landscape. Link only — never fork manufacturing under Economy.",
    readiness: "ready",
    honesty: "Workforce jobs (DYDC) are jobs, not people. Manufacturing stays on Energy.",
    destinationLabel: "Energy · Jobs · Labour Landscape",
    primary: true,
  },

  // —— Employment · Outside the Workforce → Workforce composition ——
  {
    id: "economy.employment.inactive→employment.workforce",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "inactive" },
    to: {
      pathname: ECONOMY,
      domain: "employment",
      view: "workforce",
      retain: [],
    },
    label: "The British Workforce",
    why: "Reasons for inactivity are a cut of people already outside the labour force — the composition shows how large that group is.",
    learn: "Open The British Workforce for employed, unemployed and inactive headcounts on the same age and seasonally adjusted basis.",
    readiness: "ready",
    honesty: "Principal-reason levels are not flows of people between reasons. They sit inside the inactive count, not beside the employed.",
    destinationLabel: "Employment · The British Workforce",
    primary: true,
  },

  // —— Employment · Working Week → Growth productivity ——
  {
    id: "economy.employment.hours→growth.productivity",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "hours" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "productivity",
      retain: [],
    },
    label: "Hours and output",
    why: "Average hours and full-time / part-time levels are labour input — Growth holds output per hour.",
    learn: "Open Growth › Productivity. Average actual hours are not the same series as whole-economy hours used in labour productivity.",
    readiness: "ready",
    honesty: "LFS average hours and productivity hours are different publications. Moving together is not cause and effect.",
    destinationLabel: "Growth · Productivity",
    primary: true,
  },

  // —— Employment · Demand for Labour → Rates ——
  {
    id: "economy.employment.vacancies→employment.rates",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "vacancies" },
    to: {
      pathname: ECONOMY,
      domain: "employment",
      view: "rates",
      retain: [],
    },
    label: "Unemployment rate",
    why: "Vacancies measure open posts reported by employers — Rates hold unemployment as a share of the economically active.",
    learn: "Open Rates for employment, unemployment and inactivity percentages. Do not treat vacancies as hires or as a local occupational map.",
    readiness: "ready",
    honesty: "Vacancy Survey posts are not the same as ILO unemployment. Different surveys, different units.",
    destinationLabel: "Employment · Rates",
    primary: true,
  },

  // —— Employment · Geography → Wages Geography of pay ——
  {
    id: "economy.employment.geography→wages.geography",
    kind: "contextual",
    from: { sector: "economy", domain: "employment", view: "geography" },
    to: {
      pathname: ECONOMY,
      domain: "wages",
      view: "geography",
      retain: [],
    },
    label: "Geography of pay",
    why: "Regional labour-force rates show who is in work — Wages shows workplace pay by place.",
    learn: "Open Wages › Geography of pay. HI00 rates are resident people; ASHE geography is workplace pay.",
    readiness: "ready",
    honesty: "Resident employment rates and workplace earnings are different surveys and geographies. Link only.",
    destinationLabel: "Wages · Geography of pay",
    primary: true,
  },

  // —— Tax · What Britain Raises → Debt borrowing ——
  {
    id: "economy.tax.raises→debt.borrowing",
    kind: "contextual",
    from: { sector: "economy", domain: "tax", view: "raises" },
    to: {
      pathname: ECONOMY,
      domain: "debt",
      view: "borrowing",
      retain: [],
    },
    label: "What the state borrows",
    why: "Tax receipts are one side of the public-finance story — Debt holds net borrowing.",
    learn: "Open Debt › Borrowing. Receipts and borrowing are related flows, not a closed identity here.",
    readiness: "ready",
    honesty: "Taxes and borrowing are different publications. Moving together is not cause and effect.",
    destinationLabel: "Debt · Borrowing",
    primary: true,
  },

  // —— Tax · Data → Debt dial ——
  {
    id: "economy.tax.data→debt.dial",
    kind: "contextual",
    from: { sector: "economy", domain: "tax", view: "data" },
    to: {
      pathname: ECONOMY,
      domain: "debt",
      view: "dial",
      retain: [],
    },
    label: "What Britain owes",
    why: "Tax tables are receipts — Debt holds the stock and borrowing readings.",
    learn: "Open Debt › What Britain owes.",
    readiness: "ready",
    honesty: "Receipts and debt are separate public-finance measures.",
    destinationLabel: "Debt · What Britain owes",
    primary: true,
  },

  // —— Tax · What Britain Raises → Spending TME ——
  {
    id: "economy.tax.raises→spending.spends",
    kind: "contextual",
    from: { sector: "economy", domain: "tax", view: "raises" },
    to: {
      pathname: ECONOMY,
      domain: "spending",
      view: "spends",
      retain: [],
    },
    label: "What the state spends",
    why: "Receipts are one side of the public-finance story — Spending holds total managed expenditure.",
    learn: "Open Spending › What the state spends. Receipts and spending are related flows, not a closed identity here.",
    readiness: "ready",
    honesty: "Taxes and managed expenditure are different publications. Do not treat receipts minus spending as borrowing on these pages.",
    destinationLabel: "Spending · What the state spends",
    primary: false,
  },

  // —— Spending · What the state spends → Tax raises (primary Follow) ——
  {
    id: "economy.spending.spends→tax.raises",
    kind: "contextual",
    from: { sector: "economy", domain: "spending", view: "spends" },
    to: {
      pathname: ECONOMY,
      domain: "tax",
      view: "raises",
      retain: [],
    },
    label: "What Britain raises",
    why: "Managed expenditure is the spending side — Tax holds public-sector taxes and National Insurance.",
    learn: "Open Tax › What Britain Raises. Do not invent a residual identity between the two.",
    readiness: "ready",
    honesty: "Spending and receipts are separate public-finance measures.",
    destinationLabel: "Tax · What Britain Raises",
    primary: true,
  },

  // —— Spending · What the state spends → Debt borrowing ——
  {
    id: "economy.spending.spends→debt.borrowing",
    kind: "contextual",
    from: { sector: "economy", domain: "spending", view: "spends" },
    to: {
      pathname: ECONOMY,
      domain: "debt",
      view: "borrowing",
      retain: [],
    },
    label: "What the state borrows",
    why: "Managed expenditure is one side of the public-finance story — Debt holds net borrowing.",
    learn: "Open Debt › Borrowing. Spending and borrowing are related flows, not a closed identity here.",
    readiness: "ready",
    honesty: "Managed expenditure and borrowing are different publications. Moving together is not cause and effect.",
    destinationLabel: "Debt · Borrowing",
    primary: false,
  },

  // —— Spending · Data → Debt dial ——
  {
    id: "economy.spending.data→debt.dial",
    kind: "contextual",
    from: { sector: "economy", domain: "spending", view: "data" },
    to: {
      pathname: ECONOMY,
      domain: "debt",
      view: "dial",
      retain: [],
    },
    label: "What Britain owes",
    why: "Spending tables are flows — Debt holds the stock and borrowing readings.",
    learn: "Open Debt › What Britain owes.",
    readiness: "ready",
    honesty: "Managed expenditure and debt are separate public-finance measures.",
    destinationLabel: "Debt · What Britain owes",
    primary: true,
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

  // —— Growth · Ledger → What Britain owes ——
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
    label: "What Britain owes",
    why: "Output growth is one side of the public-finance story — Debt holds the official debt and borrowing readings.",
    learn: "Open Debt › What Britain owes. Debt % of GDP uses the official ONS ratio — never rebuild it from real GDP.",
    readiness: "ready",
    honesty: "GDP and public finances are different publications. No causal claim from coincident moves.",
    destinationLabel: "Debt · What Britain owes",
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

  // —— Growth · Anatomy → Employment industry jobs ——
  {
    id: "economy.growth.anatomy→employment.industry",
    kind: "contextual",
    from: { sector: "economy", domain: "growth", view: "anatomy" },
    to: {
      pathname: ECONOMY,
      domain: "employment",
      view: "industry",
      retain: [],
    },
    label: "What Britain Does for Work",
    why: "Industry shares of gross value added are not the same as workforce jobs by industry.",
    learn: "Open Employment › What Britain Does for Work for JOBS02 workforce jobs. Manufacturing productivity stays on Energy.",
    readiness: "ready",
    honesty: "GVA pounds and workforce jobs are different publications. Do not treat shares as employment.",
    destinationLabel: "Employment · What Britain Does for Work",
    primary: true,
  },

  // —— Growth · Revisions → What Britain produces ——
  {
    id: "economy.growth.revisions→growth.produce",
    kind: "contextual",
    from: { sector: "economy", domain: "growth", view: "revisions" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "produce",
      retain: [],
    },
    label: "What Britain produces",
    why: "Revisions compare two dated GDP estimates as indexes — Produce holds the live latest release in pounds.",
    learn: "Open What Britain produces for the current first-estimate / latest GDP levels. Do not mix pound levels across price bases.",
    readiness: "ready",
    honesty: "The two-vintage band is not a full revision archive. Produce uses the latest release only.",
    destinationLabel: "Growth · What Britain produces",
    primary: true,
  },

  // —— Debt · What Britain owes → Growth ledger ——
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
    honesty: "Debt as a share of GDP is the published ratio, not worked out from GDP here. Moving together is not cause and effect.",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Who owns the debt → Growth ledger ——
  {
    id: "economy.debt.ownership→growth.ledger",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "ownership" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "ledger",
      retain: [],
    },
    label: "How fast output is growing",
    why: "Who holds gilts is a market-value ownership reading — Growth holds the output side of the public-finance story.",
    learn: "Open Growth › Ledger. Do not treat ownership shares as a share of GDP or of public-sector net debt.",
    readiness: "ready",
    honesty: "Gilt holdings are market value and are not public sector net debt. Moving together is not cause and effect.",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Debt anatomy → Growth ledger ——
  {
    id: "economy.debt.anatomy→growth.ledger",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "anatomy" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "ledger",
      retain: [],
    },
    label: "How fast output is growing",
    why: "Debt anatomy is the instrument mix of central government liabilities — Growth holds the output reading beside it.",
    learn: "Open Growth › Ledger. Instrument totals are not public sector net debt.",
    readiness: "ready",
    honesty: "Portfolio composition is uplifted nominal and is not public sector net debt (HF6W).",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Repayment calendar → Growth ledger ——
  {
    id: "economy.debt.repayment→growth.ledger",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "repayment" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "ledger",
      retain: [],
    },
    label: "How fast output is growing",
    why: "Scheduled gilt redemptions are a financing calendar — Growth holds the output reading beside it.",
    learn: "Open Growth › Ledger. Redemptions are not a forecast of GDP or of public-sector net debt.",
    readiness: "ready",
    honesty: "Future redemptions are net of government holdings and are not public sector net debt.",
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
    honesty: "Borrowing is a flow and output is a level. One does not explain the other.",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Cash to debt (CG REC3) → Growth ledger ——
  {
    id: "economy.debt.machine→growth.ledger",
    kind: "contextual",
    from: { sector: "economy", domain: "debt", view: "machine" },
    to: {
      pathname: ECONOMY,
      domain: "growth",
      view: "ledger",
      retain: [],
    },
    label: "How fast output is growing",
    why: "The machine shows how central government cash borrowing turns into the change in its debt — Growth holds the output reading beside it.",
    learn: "Open Growth › Ledger. Do not treat cash borrowing as GDP.",
    readiness: "ready",
    honesty: "Central government cash and debt change only — not public sector net borrowing or net debt.",
    destinationLabel: "Growth · Ledger",
    primary: true,
  },

  // —— Debt · Cost of debt → Growth ledger ——
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
    honesty: "Interest here is central government only. Moving together is not cause and effect.",
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
    honesty: "Public-finance and output tables are published separately and are not joined here.",
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

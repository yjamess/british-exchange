import type { PlateName, RefIconPlateName } from "./Plate";

/**
 * Sector pages served by the shared template (`SectorTemplate`, route `app/[sector]`).
 * Each sector is configuration only: the loud name, couplet, hero plate, and its research
 * domains with the catalogue series each will draw on. Housing has its own page (it is the
 * reference build); every other sector starts here and adds stages as series are drawn.
 *
 * Domains without a drawn rail plate show a numbered proof tile (see Explorer). Each sector's
 * hero is its own plate (observatory-imprint/scripts/sector-plates.py); Energy keeps the cooling towers.
 */

export type SectorDomainConfig = {
  id: string;
  title: string;
  short?: string;
  /** Caslon question for the domain head. */
  question: string;
  /** Catalogue indicator ids this domain will draw on (`/data#id`). */
  series: string[];
  /** Rail plate: a screened photo reference (REF_ICON_PLATES). Unset shows a numbered proof tile. */
  plate?: RefIconPlateName;
};

export type SectorConfig = {
  /** Route slug: /{slug}. */
  slug: string;
  /** Catalogue sector id (manifest `sector`), also the `/data#…` anchor. */
  sectorId: string;
  /** The one loud line. */
  name: string;
  label: string;
  /** Two-line couplet: the page description (and the hero's words if SectorPage brings them back). */
  headline: [string, string];
  plate: { name: PlateName; position?: string };
  indexLabel: string;
  domains: SectorDomainConfig[];
};

export const SECTOR_PAGES: Record<string, SectorConfig> = {
  economy: {
    slug: "economy",
    sectorId: "economy-public-finance",
    name: "Economy",
    label: "Economy & Public Finance",
    headline: ["What the country makes.", "What the state spends."],
    plate: { name: "containerPort", position: "50% 16%" },
    indexLabel: "Economy index",
    domains: [
      {
        id: "output",
        title: "Output and growth",
        short: "Output",
        question: "How much does Britain produce, and is it growing?",
        series: ["real-gdp", "real-gdp-per-head", "labour-productivity", "business-investment"],
      },
      {
        id: "prices",
        title: "Prices and inflation",
        short: "Prices",
        question: "How fast are prices rising, and what does money buy?",
        series: ["cpi-inflation", "cpi-index", "mortgage-rate-2yr-fixed"],
      },
      {
        id: "work",
        title: "Work and earnings",
        short: "Work",
        question: "Who is in work, and are their earnings keeping up?",
        series: ["employment-rate", "economic-inactivity-rate", "real-earnings"],
      },
      {
        id: "finances",
        title: "Public finances",
        short: "Finances",
        question: "What does the state raise, spend and owe?",
        series: ["tax-receipts", "total-managed-expenditure", "public-sector-net-borrowing", "public-sector-net-debt", "public-sector-debt-interest"],
      },
    ],
  },

  energy: {
    slug: "energy",
    sectorId: "energy-industry",
    name: "Energy",
    label: "Energy & Industry",
    headline: ["The power we use.", "The things we make."],
    plate: { name: "coolingTowers", position: "50% 55%" },
    indexLabel: "Energy index",
    domains: [
      {
        id: "generation",
        title: "Electricity generation",
        short: "Generation",
        question: "Where does Britain's electricity come from, and how has the mix changed?",
        series: [
          "electricity-generation-by-source",
          "electricity-capacity-by-technology",
          "gb-generation-mix-half-hourly",
          "renewable-energy-planning-operational",
        ],
        plate: "energyGeneration",
      },
      {
        id: "consumption",
        title: "Energy consumption",
        short: "Use",
        question: "Who uses Britain's energy, for what purposes, where does it go, and how has this changed over time?",
        series: [
          "final-energy-consumption-by-sector",
          "primary-energy-flow-allocation",
          "domestic-end-use",
          "cross-sector-end-use",
          "subnational-final-consumption",
          "industrial-energy-consumption",
        ],
        plate: "energyConsumption",
      },
      {
        id: "prices",
        title: "Energy prices and costs",
        short: "Prices",
        question:
          "What does energy really cost British households and industries, how has that changed, and what is being compared?",
        series: [
          "domestic-electricity-bills",
          "domestic-electricity-unit-standing",
          "domestic-gas-bills",
          "domestic-gas-unit-standing",
          "industrial-electricity-prices",
          "ofgem-default-tariff-cap",
          "cpih-index",
        ],
        plate: "energyPrices",
      },
      {
        id: "fossil",
        title: "Oil, gas and fossil fuels",
        short: "Oil & gas",
        question: "Where did Britain's fossil fuels come from, what was extracted, and how did domestic production change?",
        series: [
          "crude-oil-production",
          "primary-energy-production",
          "domestic-gas-production",
          "historical-coal-production",
          "nsta-ukcs-fields",
          "nsta-field-production",
          "uk-oil-gas-reserves",
        ],
        plate: "energyFossil",
      },
      {
        id: "imports",
        title: "Energy imports and security",
        short: "Imports",
        question: "Where does Britain's imported energy enter the system, how has reliance changed, and what does resilience actually mean?",
        series: [
          "oil-imports-by-country",
          "gas-trade-by-partner",
          "lng-imports-by-terminal",
          "energy-import-dependency",
          "fossil-fuel-dependency",
          "low-carbon-energy-share",
          "natural-gas-storage",
          "energy-imports-and-exports",
          "electricity-interconnector-flows",
          "electricity-interconnector-capacity",
        ],
        plate: "energyImports",
      },
      {
        id: "low-carbon",
        title: "Renewables and nuclear",
        short: "Low carbon",
        question:
          "How much low-carbon electricity is installed, generated and planned, and where is the new energy landscape taking shape?",
        series: [
          "renewable-electricity-load-factors",
          "electricity-capacity-by-technology",
          "electricity-generation-by-source",
          "renewable-energy-planning-operational",
        ],
        plate: "energyLowCarbon",
      },
      {
        id: "networks",
        title: "Power Networks",
        short: "Networks",
        question:
          "How does power move across Britain, where are the constraints and how is the network being changed?",
        series: [
          "electricity-interconnector-flows",
          "electricity-interconnector-capacity",
          "transmission-entry-capacity-register",
          "ssen-distribution-network-atlas",
          "gb-generation-mix-half-hourly",
        ],
        plate: "energyNetworks",
      },
      {
        id: "manufacturing",
        title: "Manufacturing and output",
        short: "Output",
        question:
          "What does Britain manufacture today, how has the composition of output changed, and where does production take place?",
        series: [
          "manufacturing-output-index",
          "manufacturing-share-of-gva",
          "manufacturing-employment",
          "manufacturing-output-per-hour",
          "manufacturing-iop-by-division",
        ],
        plate: "energyManufacturing",
      },
      {
        id: "industrial-work",
        title: "Jobs & Productivity",
        short: "Jobs",
        question:
          "Where did industrial employment change, how did output per worker or hour change, and who experienced those changes?",
        series: [
          "manufacturing-employment",
          "manufacturing-output-index",
          "manufacturing-output-per-hour",
          "manufacturing-output-per-job",
          "manufacturing-productivity-hours",
          "ashe-manufacturing-earnings",
          "bres-manufacturing-employee-jobs-by-region",
          "bres-manufacturing-jobs-by-division-region",
        ],
        plate: "energyWork",
      },
      {
        id: "policy",
        title: "Industrial policy",
        short: "Policy",
        question:
          "Which public decisions, incentives, institutions and investments shaped Britain's energy and industrial trajectory, and what can the evidence actually establish?",
        series: [
          "electricity-generation-by-source",
          "manufacturing-output-index",
          "manufacturing-employment",
          "manufacturing-output-per-hour",
          "electricity-interconnector-flows",
        ],
        plate: "energyPolicy",
      },
    ],
  },

  people: {
    slug: "people",
    sectorId: "people-society",
    name: "People",
    label: "People & Society",
    headline: ["Who we are.", "How we live, learn and age."],
    plate: { name: "crowd", position: "50% 70%" },
    indexLabel: "People index",
    domains: [
      {
        id: "population",
        title: "Population",
        question: "How many people live in Britain, and how is that changing?",
        series: ["uk-population-estimate"],
      },
      {
        id: "migration",
        title: "Migration",
        question: "How many people come to Britain, and how many leave?",
        series: ["long-term-international-net-migration"],
      },
      {
        id: "health",
        title: "Health",
        question: "How long do people live, and how long do they wait for care?",
        series: ["life-expectancy-at-birth", "nhs-elective-waiting-list"],
      },
      {
        id: "education",
        title: "Education",
        question: "How are pupils doing at the end of school?",
        series: ["gcse-grade-4-english-maths"],
      },
    ],
  },

  government: {
    slug: "government",
    sectorId: "government-politics",
    name: "Government",
    label: "Government & Politics",
    headline: ["The laws we pass.", "The votes we cast."],
    plate: { name: "pollingStation", position: "50% 46%" },
    indexLabel: "Government index",
    domains: [
      {
        id: "elections",
        title: "Elections",
        question: "How many people vote, and how has that changed?",
        series: ["general-election-turnout"],
      },
      {
        id: "legislation",
        title: "Legislation",
        question: "How much law does Parliament make each year?",
        series: ["acts-of-parliament-passed"],
      },
      {
        id: "spending",
        title: "Departmental spending",
        short: "Spending",
        question: "How is public money divided between departments?",
        series: ["departmental-expenditure-limits"],
      },
      {
        id: "state",
        title: "The shape of the state",
        short: "The state",
        question: "How many public bodies sit at arm's length from ministers?",
        series: ["arms-length-bodies-count"],
      },
    ],
  },

  infrastructure: {
    slug: "infrastructure",
    sectorId: "infrastructure",
    name: "Infrastructure",
    label: "Infrastructure",
    headline: ["The networks we share.", "How well they hold."],
    plate: { name: "viaduct", position: "50% 38%" },
    indexLabel: "Infrastructure index",
    domains: [
      {
        id: "rail",
        title: "Rail",
        question: "Do Britain's trains run on time?",
        series: ["rail-punctuality"],
      },
      {
        id: "roads",
        title: "Roads",
        question: "How much do we drive, and how has that changed?",
        series: ["road-vehicle-miles"],
      },
      {
        id: "water",
        title: "Water",
        question: "How reliable is the water supply?",
        series: ["water-supply-interruptions"],
      },
      {
        id: "digital",
        title: "Digital",
        question: "How many homes can get full-fibre broadband?",
        series: ["full-fibre-broadband-coverage"],
      },
    ],
  },

  regions: {
    slug: "regions",
    sectorId: "regions-places",
    name: "Regions",
    label: "Regions & Places",
    headline: ["Four nations, twelve regions.", "One country, unevenly shared."],
    plate: { name: "ukRelief", position: "50% 52%" },
    indexLabel: "Regions index",
    domains: [
      {
        id: "population",
        title: "Population",
        question: "How are people spread across the four nations?",
        series: ["population-by-uk-nation"],
      },
      {
        id: "output",
        title: "Output",
        question: "Where in Britain is output produced?",
        series: ["gva-by-uk-nation-and-region"],
      },
      {
        id: "work",
        title: "Work",
        question: "Where are people in work?",
        series: ["employment-rate-by-region"],
      },
      {
        id: "homes",
        title: "Homes",
        question: "How far apart are house prices across the regions?",
        series: ["house-prices-by-region"],
      },
    ],
  },

  history: {
    slug: "history",
    sectorId: "history-change",
    name: "History",
    label: "History & Change",
    headline: ["How far we have come.", "Measured in centuries."],
    plate: { name: "pithead", position: "50% 22%" },
    indexLabel: "History index",
    domains: [
      {
        id: "output",
        title: "Long-run output",
        short: "Output",
        question: "How has Britain's economy grown over the centuries?",
        series: ["bank-of-england-millennium-gdp"],
      },
      {
        id: "work",
        title: "Work",
        question: "How have unemployment and factory work risen and fallen since the 1850s?",
        series: ["uk-unemployment-rate-long-run", "long-run-manufacturing-employment"],
      },
      {
        id: "industry",
        title: "Coal and industry",
        short: "Coal",
        question: "How did coal rise, and how did it fall?",
        series: ["historical-coal-production"],
      },
    ],
  },
};

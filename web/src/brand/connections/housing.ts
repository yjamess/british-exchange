/**
 * Housing connection registry — primary Follows only (lab 1 + 4 chrome).
 * Domain ids match DOMAINS in housing/canvas/model.tsx.
 */

import type { ArrivalContext, Connection, ConnectionSelection } from "./types";
import {
  connectionById,
  connectionsFor,
  primaryConnectionFor,
  resolveConnectionHref,
  resolveFirstConnection,
} from "./resolve";

const HOUSING = "/housing";
const ENERGY = "/energy";

export const HOUSING_CONNECTIONS: readonly Connection[] = [
  // —— Prices → Affordability (price ≠ ability to pay) ——
  {
    id: "housing.prices→affordability",
    kind: "contextual",
    from: { sector: "housing", domain: "prices" },
    to: {
      pathname: HOUSING,
      domain: "affordability",
      view: "experiment",
      retain: ["from", "to"],
    },
    label: "Who can afford that price?",
    why: "An average house price is not what a household can pay.",
    learn: "Open Affordability for purchase budgets and earnings context.",
    readiness: "ready",
    honesty: "Price and affordability are different publications — not a household quote.",
    destinationLabel: "Affordability · Budget",
    primary: true,
  },

  // —— Renting → Affordability rent burden ——
  {
    id: "housing.renting→affordability.rent",
    kind: "contextual",
    from: { sector: "housing", domain: "renting" },
    to: {
      pathname: HOUSING,
      domain: "affordability",
      view: "rent",
      retain: ["from", "to"],
    },
    label: "Rent as a share of earnings",
    why: "Rent levels alone do not show the burden on earnings.",
    learn: "Open Affordability › Rent burden for the ratio reading.",
    readiness: "ready",
    honesty: "Private rents and rent-to-earnings are different series.",
    destinationLabel: "Affordability · Rent burden",
    primary: true,
  },

  // —— Affordability → Prices (sibling series behind the ratio) ——
  {
    id: "housing.affordability→prices",
    kind: "contextual",
    from: { sector: "housing", domain: "affordability" },
    to: {
      pathname: HOUSING,
      domain: "prices",
      view: "history",
      retain: ["from", "to"],
    },
    label: "House prices over time",
    why: "Affordability ratios sit on published price series — open the price reading itself.",
    learn: "Open House prices › History for the average price trajectory.",
    readiness: "ready",
    honesty: "The ratio is not the price series; definitions stay separate.",
    destinationLabel: "Prices · History",
    primary: true,
  },

  // —— Stock → Supply (stock ≠ flow) ——
  {
    id: "housing.stock→supply",
    kind: "contextual",
    from: { sector: "housing", domain: "stock" },
    to: {
      pathname: HOUSING,
      domain: "supply",
      view: "machine",
      retain: [],
    },
    label: "Homes being built",
    why: "Dwelling stock is what exists; supply is the flow of new homes.",
    learn: "Open Construction and supply › Supply machine.",
    readiness: "ready",
    honesty: "Stock and net additions are different tables — do not treat stock change as completions alone.",
    destinationLabel: "Supply · Supply machine",
    primary: true,
  },

  // —— Supply → Land (delivery ≠ permission) ——
  {
    id: "housing.supply→land.decisions",
    kind: "contextual",
    from: { sector: "housing", domain: "supply" },
    to: {
      pathname: HOUSING,
      domain: "land",
      view: "decisions",
      retain: [],
    },
    label: "Planning decisions",
    why: "Homes delivered are not the same as permissions granted.",
    learn: "Open Planning and land › Planning decisions.",
    readiness: "ready",
    honesty: "Starts, completions and decisions are separate publications.",
    destinationLabel: "Land · Planning decisions",
    primary: true,
  },

  // —— Land → Supply ——
  {
    id: "housing.land→supply",
    kind: "contextual",
    from: { sector: "housing", domain: "land" },
    to: {
      pathname: HOUSING,
      domain: "supply",
      view: "machine",
      retain: [],
    },
    label: "What gets built",
    why: "Land use and permissions shape supply — they are not the delivery count.",
    learn: "Open Construction and supply › Supply machine.",
    readiness: "ready",
    honesty: "Planning and completions stay separate instruments.",
    destinationLabel: "Supply · Supply machine",
    primary: true,
  },

  // —— Quality › Energy → Energy bills (cross-sector; different “energy”) ——
  // View-scoped first so it wins over the domain-level Quality hop below.
  {
    id: "housing.quality.energy→energy.prices",
    kind: "contextual",
    from: { sector: "housing", domain: "quality", view: "energy" },
    to: {
      pathname: ENERGY,
      domain: "prices",
      view: "bill",
      retain: [],
    },
    label: "Domestic energy bills",
    why: "Home energy ratings are not the price of electricity and gas on a bill.",
    learn: "Open Energy › Dissected Bill for published domestic bill components.",
    readiness: "ready",
    honesty:
      "English Housing Survey / EPC ratings are not DESNZ household bills — different publishers and definitions.",
    destinationLabel: "Energy · Dissected Bill",
    primary: true,
  },

  // —— Quality (other views) → Stock composition ——
  {
    id: "housing.quality→stock",
    kind: "contextual",
    from: { sector: "housing", domain: "quality" },
    to: {
      pathname: HOUSING,
      domain: "stock",
      view: "composition",
      retain: [],
    },
    label: "What homes Britain has",
    why: "Condition and energy ratings describe homes in use — not the dwelling stock count.",
    learn: "Open Housing stock › Composition for tenure and dwelling mix.",
    readiness: "ready",
    honesty: "Survey / EPC condition is not Live Table dwelling stock.",
    destinationLabel: "Stock · Composition",
    primary: true,
  },

  // —— Insecurity › Cost → Affordability (spend ≠ household cost) ——
  {
    id: "housing.insecurity.cost→affordability",
    kind: "contextual",
    from: { sector: "housing", domain: "insecurity", view: "cost" },
    to: {
      pathname: HOUSING,
      domain: "affordability",
      view: "rent",
      retain: [],
    },
    label: "What housing costs a household",
    why: "Council homelessness spend is not a household rent or purchase burden.",
    learn: "Open Affordability › Rent burden for rent as a share of earnings.",
    readiness: "ready",
    honesty: "RO4 money flows are not rent-to-earnings or purchase affordability.",
    destinationLabel: "Affordability · Rent burden",
    primary: true,
  },

  // —— Insecurity → Renting social lettings ——
  {
    id: "housing.insecurity→renting.tenancies",
    kind: "contextual",
    from: { sector: "housing", domain: "insecurity" },
    to: {
      pathname: HOUSING,
      domain: "renting",
      view: "tenancies",
      retain: [],
    },
    label: "Social housing lettings",
    why: "Homelessness pathways sit beside how social homes are let — not the same register.",
    learn: "Open Renting › Social rent for new lettings.",
    readiness: "ready",
    honesty: "Statutory homelessness and CORE lettings are different systems.",
    destinationLabel: "Renting · Social rent",
    primary: true,
  },

  // —— Ownership › Mortgages → Affordability ——
  {
    id: "housing.ownership.mortgages→affordability",
    kind: "contextual",
    from: { sector: "housing", domain: "ownership", view: "mortgages" },
    to: {
      pathname: HOUSING,
      domain: "affordability",
      view: "experiment",
      retain: [],
    },
    label: "What a mortgage costs a budget",
    why: "Mortgage volumes and rates are not a household affordability reading.",
    learn: "Open Affordability › Budget to set a purchase scenario.",
    readiness: "ready",
    honesty: "Approvals and rates are not a typical household payment.",
    destinationLabel: "Affordability · Budget",
    primary: true,
  },

  // —— Ownership (Who owns / Wealth / Data) → Stock tenure ——
  {
    id: "housing.ownership→stock.tenure",
    kind: "contextual",
    from: { sector: "housing", domain: "ownership" },
    to: {
      pathname: HOUSING,
      domain: "stock",
      view: "tenure",
      retain: [],
    },
    label: "How tenure is shared",
    why: "Company titles and property wealth are not household tenure shares.",
    learn: "Open Housing stock › Tenure over time for owner-occupation and renting.",
    readiness: "ready",
    honesty: "Land Registry company titles and ONS tenure are different universes.",
    destinationLabel: "Stock · Tenure over time",
    primary: true,
  },

  // —— Policy → Supply (history ≠ delivery) ——
  {
    id: "housing.policy→supply",
    kind: "contextual",
    from: { sector: "housing", domain: "policy" },
    to: {
      pathname: HOUSING,
      domain: "supply",
      view: "machine",
      retain: [],
    },
    label: "Homes being built",
    why: "Policy history and promises are not the flow of homes delivered.",
    learn: "Open Construction and supply › Supply machine for net additions.",
    readiness: "ready",
    honesty: "Acts and pledges are not completions or net additional dwellings.",
    destinationLabel: "Supply · Supply machine",
    primary: true,
  },
] as const satisfies readonly Connection[];

const REGISTRY: readonly Connection[] = HOUSING_CONNECTIONS;

export function housingConnectionById(id: string): Connection | null {
  return connectionById(id, REGISTRY);
}

export function housingConnectionsFor(
  origin: { domain: string; view?: string | null },
  selection: ConnectionSelection = {},
): Connection[] {
  return connectionsFor(
    { sector: "housing", domain: origin.domain, view: origin.view },
    selection,
    REGISTRY,
  );
}

export function primaryHousingConnection(
  origin: { domain: string; view?: string | null },
  selection: ConnectionSelection = {},
): Connection | null {
  return primaryConnectionFor(
    { sector: "housing", domain: origin.domain, view: origin.view },
    selection,
    REGISTRY,
  );
}

export function resolveHousingConnectionHref(
  conn: Connection,
  selection: ConnectionSelection = {},
  current?: URLSearchParams | string | null,
  arrival?: ArrivalContext | null,
): string | null {
  return resolveConnectionHref(conn, selection, current, arrival);
}

export function firstHousingConnection(
  origin: { domain: string; view?: string | null },
  selection: ConnectionSelection = {},
  current?: URLSearchParams | string | null,
  arrival?: ArrivalContext | null,
): { connection: Connection; href: string } | null {
  return resolveFirstConnection(
    { sector: "housing", domain: origin.domain, view: origin.view },
    selection,
    REGISTRY,
    current,
    arrival,
  );
}

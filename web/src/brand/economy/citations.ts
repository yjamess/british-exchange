/**
 * Human-readable source lines for Economy explorers.
 *
 * Match Energy / Housing Notes feet: `Publisher · series · geography · period`.
 * This file holds **publisher · series** only (one middle dot after the
 * publisher). Geography and period are appended at the call site via
 * `formatSource` — never bake pin codes, CDIDs, or indicator ids into this row.
 *
 * Prefer plain publication names over bare dataset acronyms. Series ids (D7G7,
 * KAI7, HF6X…) and Exchange indicator ids belong in Notes Method or the
 * catalogue — never on the source row.
 */

import { formatSource } from "../template";

/** Drop Exchange / ONS pin fragments (MM23/D7G7, EMP/KAI7, …) from user-facing copy. */
export function stripPinCode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\b[A-Z]{2,}(?:\/[A-Z0-9.]+)+\b/g, "")
    .replace(/\b[A-Z]{2,}(?:[_-][A-Z0-9.]+){1,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s·\s·/g, " · ")
    .replace(/^[\s·]+|[\s·]+$/g, "")
    .trim();
}

/**
 * Period slot for chart feet: cadence only, optionally "to Mon YYYY".
 * Never pass raw `source_version` (it carries MM23/D7G7-style pins).
 */
export function economyPeriod(
  cadence: "monthly" | "quarterly" | "annual",
  throughLabel?: string | null,
): string {
  const base =
    cadence === "monthly" ? "Monthly" : cadence === "quarterly" ? "Quarterly" : "Annual";
  const through = throughLabel?.trim();
  return through ? `${base} · to ${through}` : base;
}

/** Compose a foot source row. `publisherSeries` must already be `Publisher · series`. */
export function economySource(
  publisherSeries: string,
  geography: string,
  period: string,
  boundaries?: string | null,
): string {
  return formatSource(
    publisherSeries,
    boundaries ? `Boundaries: ${boundaries}` : null,
    geography,
    period,
  );
}

export const ECONOMY_SOURCE = {
  cpiRate: "ONS · Consumer Prices Index annual rate",
  cpihRate: "ONS · Consumer Prices Index including owner occupiers' housing costs annual rate",
  cpiIndex: "ONS · Consumer Prices Index",
  cpihIndex: "ONS · Consumer Prices Index including owner occupiers' housing costs",
  cpiCpihIndexes: "ONS · Consumer Prices Index and CPIH",
  consumerPrices: "ONS · Consumer price inflation",
  coicop: "ONS · Consumer price inflation by category",
  contributions: "ONS · Contributions to the CPIH annual rate",
  averagePrices: "ONS · Shopping prices comparison tool",

  realEarnings: "ONS · Average weekly earnings real regular pay",
  cashEarnings: "ONS · Average weekly earnings regular pay",
  earnings: "ONS · Average weekly earnings",
  payVsPrices: "ONS · Average weekly earnings and CPIH",
  asheNational: "ONS · Annual Survey of Hours and Earnings",
  asheRegional: "ONS · Annual Survey of Hours and Earnings place of work",

  realGdp: "ONS · Gross domestic product chained volume",
  gdpPerHead: "ONS · Gross domestic product per head",
  labourProductivity: "ONS · Output per hour worked",
  growth: "ONS · National accounts and productivity",

  netDebt: "ONS · Public sector net debt",
  netBorrowing: "ONS · Public sector net borrowing",
  debtInterest: "ONS · Central government debt interest",
  debtPercentGdp: "ONS · Public sector net debt as a percentage of GDP",
  publicFinances: "ONS · Public sector finances",
} as const;

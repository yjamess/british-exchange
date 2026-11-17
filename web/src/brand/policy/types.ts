/**
 * Normalised Decision Ledger view-model.
 * Sector canvases map their event records into this shape; the brand components
 * do not import housing or energy data modules.
 */

export type LedgerSource = { label: string; href: string };

export type LedgerContextLink = {
  id: string;
  title: string;
  href: string;
  note: string;
};

export type LedgerEvent = {
  id: string;
  /** Year shown on the closed slab (or "—"). */
  year: string;
  title: string;
  /** Short type label on the slab meta (Act, Programme, …). */
  typeLabel: string;
  summary: string;
  extent: string;
  citation: string;
  /** Register row label for the mark date (Royal Assent, Made, …). */
  markLabel: string;
  /** Formatted mark date. */
  markValue: string;
  /** Empty string hides the row (e.g. an incident has no legal status). */
  status: string;
  applies: string;
  /** Empty string hides the row (only laws and instruments commence). */
  commencement: string;
  sources: LedgerSource[];
  context: LedgerContextLink[];
  /** Optional evidence record (Economy Domain 10). Rendered under the summary when present. */
  record?: LedgerRecord;
};

export type LedgerRegisterRow = { label: string; value: string; href?: string };

export type LedgerRecord = {
  /** Titled prose sections in order: Background, Objectives, Mechanism, Implementation. */
  sections: { heading: string; body: string }[];
  /** Stated figures: rates, thresholds, allocations, rules. */
  measures: LedgerRegisterRow[];
  /** Official costings, forecasts and outturns. */
  financial: LedgerRegisterRow[];
  /** Published assessments. Empty means none attached, not none exist. */
  evaluations: { label: string; href: string; publisher: string; date: string; finding: string }[];
  /** Pointers to other records, here or in another sector's register. */
  related: LedgerContextLink[];
};

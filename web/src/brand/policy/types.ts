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
  status: string;
  applies: string;
  commencement: string;
  sources: LedgerSource[];
  context: LedgerContextLink[];
};

/**
 * Per-domain view configuration for Energy explorers.
 *
 * Why this exists: canvases used to bury view tabs, URL keys and Notes content
 * in large conditionals. The shared Explorer shell stays; each domain owns a
 * module that declares what every Ready view must expose so we can audit it.
 *
 * Placement contract (docs/visual-identity.md · explorer-stage):
 * - source / definition / method → one Stage foot (FigureRecord)
 * - geography / period → stage meta (and echoed in Notes when material)
 * - dataHref → catalogue link on the foot
 */

import type { EnergyDomainId } from "../domain-sources";

/** Catalogue / UI shipped state — never inferred from whether packs loaded. */
export type DomainUiStatus = "ready" | "preparation";

/**
 * What every Ready view must declare for evidence.
 * Visual consistency alone does not guarantee these fields; the audit test does.
 */
export type EvidenceContract = {
  /** Publisher · series (FigureRecord `source`). */
  source: string;
  /** What the number is (FigureRecord `definition`). */
  definition: string | readonly string[];
  /** How it was counted / what not to infer (FigureRecord `method`). */
  method: string | readonly string[];
  /** Nation or geography the figure covers. */
  geography: string;
  /** Span or grain the reader should expect (years may be refined at runtime). */
  period: string;
  /** Catalogue deep link (`/data?record=…` or sector anchor). */
  dataHref: string;
};

export type ViewSpec = {
  id: string;
  /**
   * Short task label for the view tab (Housing style: History, Map, Data).
   * Not the instrument name — that belongs on the figure Stage title.
   */
  label: string;
  /**
   * Optional instrument title for the figure (e.g. “The Production Anatomy”).
   * Tabs stay short; Stages and Notes keep the full name.
   */
  instrument?: string;
  /**
   * Query keys this view may set, besides `domain` and `view`.
   * Keeps navigation parameters from leaking across domains.
   */
  params: readonly string[];
  evidence: EvidenceContract;
};

export type DomainViews = {
  domain: EnergyDomainId;
  status: DomainUiStatus;
  defaultView: string;
  views: readonly ViewSpec[];
};

/** Normalise definition/method bodies for checks and FigureRecord. */
export function evidenceParts(body: string | readonly string[] | undefined): string[] {
  return (Array.isArray(body) ? [...body] : body ? [body] : []).map((t) => t.trim()).filter(Boolean);
}

/** True when a contract has every required field with non-empty text. */
export function evidenceComplete(e: EvidenceContract): boolean {
  return (
    e.source.trim().length > 0 &&
    evidenceParts(e.definition).length > 0 &&
    evidenceParts(e.method).length > 0 &&
    e.geography.trim().length > 0 &&
    e.period.trim().length > 0 &&
    e.dataHref.trim().length > 0
  );
}

/**
 * Stage body state for a domain that is open.
 * - preparation: domain UI not shipped
 * - unavailable: domain is Ready but primary observations did not load
 * - ok: render the canvas body
 */
export type StageAvailability = "ok" | "unavailable" | "preparation";

export function stageAvailability(status: DomainUiStatus, primaryLoaded: boolean): StageAvailability {
  if (status === "preparation") return "preparation";
  if (!primaryLoaded) return "unavailable";
  return "ok";
}

/** Labels for EmptyStage — keep copy distinct so readers are not misled. */
export const STAGE_EMPTY = {
  preparation: {
    label: "In preparation",
    hint: "This domain is still being drawn. Ready series will appear here once they pass validation.",
  },
  unavailable: {
    label: "Series unavailable",
    hint: "This domain is Ready, but its observations could not be loaded. Refresh after the API is up — this is not an unfinished page.",
  },
} as const;

/**
 * Declared Explorer connections — see docs/connections-contract.md.
 * Not a graph engine: authors register edges with honesty copy.
 */

export type ConnectionKind = "direct" | "contextual" | "analytical";

export type ConnectionReadiness = "ready" | "deferred";

/** Where the edge may fire. View omitted = any view in that domain. */
export type ConnectionOrigin = {
  sector: "energy" | "housing";
  domain: string;
  view?: string;
  /** Selection field the edge cares about (e.g. "fuel"). */
  selectionKey?: string;
  /** When set, selection[selectionKey] must be one of these values. */
  selectionValues?: readonly string[];
};

export type ConnectionDestination = {
  pathname: string;
  domain: string;
  view?: string;
  /** Fixed query params applied after retain / selection. */
  params?: Readonly<Record<string, string>>;
  /**
   * Copy these keys from the runtime selection into the destination query
   * (in addition to retain-from-current-URL).
   */
  mapSelection?: readonly string[];
  /**
   * Typed allowlist of keys that may cross from the current URL.
   * Passed through to switchExplorerDomain when navigating live.
   */
  retain: readonly string[];
};

export type Connection = {
  id: string;
  kind: ConnectionKind;
  from: ConnectionOrigin;
  to: ConnectionDestination;
  label: string;
  why: string;
  learn: string;
  readiness: ConnectionReadiness;
  honesty?: string;
  /** Shown on FollowStep meta: “Opens · {destinationLabel}”. */
  destinationLabel: string;
  /**
   * When several edges share an origin, only `primary` rows are offered as the
   * stage Follow (cap: one). Non-primary edges stay in the registry for later asides.
   */
  primary?: boolean;
};

/** Encoded on the destination URL so ArrivalFrom can show “From …” + Return. */
export type ArrivalContext = {
  label: string;
  returnHref: string;
};

/** Runtime context used to match edges and fill destination params. */
export type ConnectionSelection = Record<
  string,
  string | number | boolean | null | undefined
>;

export type ConnectionOriginQuery = {
  sector: ConnectionOrigin["sector"];
  domain: string;
  view?: string | null;
};

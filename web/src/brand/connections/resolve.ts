import type {
  ArrivalContext,
  Connection,
  ConnectionOriginQuery,
  ConnectionSelection,
} from "./types";

/**
 * Query keys always legal on Explorer URLs — arrival chip survives view prune.
 * Not `from` / `to` — Generation already uses those for the trajectory window.
 */
export const ARRIVAL_PARAMS = ["via", "via_return"] as const;

function matchesOrigin(conn: Connection, origin: ConnectionOriginQuery): boolean {
  if (conn.from.sector !== origin.sector) return false;
  if (conn.from.domain !== origin.domain) return false;
  if (conn.from.view != null) {
    if (origin.view == null || conn.from.view !== origin.view) return false;
  }
  return true;
}

function matchesSelection(conn: Connection, selection: ConnectionSelection): boolean {
  const key = conn.from.selectionKey;
  if (!key) return true;
  const raw = selection[key];
  if (raw == null || raw === "") return false;
  const value = String(raw);
  if (conn.from.selectionValues && !conn.from.selectionValues.includes(value)) {
    return false;
  }
  return true;
}

/**
 * Edges that apply at this origin given the current selection.
 * Includes deferred edges so the UI can show honest “not linked yet” copy.
 */
export function connectionsFor(
  origin: ConnectionOriginQuery,
  selection: ConnectionSelection = {},
  registry: readonly Connection[],
): Connection[] {
  return registry.filter(
    (conn) => matchesOrigin(conn, origin) && matchesSelection(conn, selection),
  );
}

/**
 * One Follow per stage: prefer `primary: true`, else the first match.
 * Deferred primaries are included so chrome can show “not linked yet”.
 */
export function primaryConnectionFor(
  origin: ConnectionOriginQuery,
  selection: ConnectionSelection = {},
  registry: readonly Connection[],
): Connection | null {
  const matches = connectionsFor(origin, selection, registry);
  if (matches.length === 0) return null;
  const primary = matches.find((c) => c.primary);
  return primary ?? matches[0] ?? null;
}

export function connectionById(
  id: string,
  registry: readonly Connection[],
): Connection | null {
  return registry.find((c) => c.id === id) ?? null;
}

/** Strip arrival keys and build a return href for the current reading. */
export function buildArrivalContext(args: {
  label: string;
  pathname: string;
  searchParams: URLSearchParams | string;
}): ArrivalContext {
  const params =
    typeof args.searchParams === "string"
      ? new URLSearchParams(args.searchParams)
      : new URLSearchParams(args.searchParams.toString());
  for (const key of ARRIVAL_PARAMS) params.delete(key);
  const query = params.toString();
  return {
    label: args.label,
    returnHref: query ? `${args.pathname}?${query}` : args.pathname,
  };
}

export function readArrival(searchParams: URLSearchParams | { get: (k: string) => string | null }): {
  from: string | null;
  returnHref: string | null;
} {
  return {
    from: searchParams.get("via"),
    returnHref: searchParams.get("via_return"),
  };
}

/**
 * Build a shareable href for a Ready connection.
 * Deferred edges always return null (never invent a live hop).
 *
 * Retain keys are copied from `current` when present; `mapSelection` and
 * static `params` then fill or override destination query values.
 * Optional `arrival` sets `from` + `return` for the destination chip.
 */
export function resolveConnectionHref(
  conn: Connection,
  selection: ConnectionSelection = {},
  current?: URLSearchParams | string | null,
  arrival?: ArrivalContext | null,
): string | null {
  if (conn.readiness !== "ready") return null;

  const params = new URLSearchParams();
  params.set("domain", conn.to.domain);
  if (conn.to.view) params.set("view", conn.to.view);

  if (current != null && current !== "") {
    const before =
      typeof current === "string" ? new URLSearchParams(current) : current;
    for (const key of conn.to.retain) {
      const value = before.get(key);
      if (value != null && value !== "") params.set(key, value);
    }
  }

  if (conn.to.mapSelection) {
    for (const key of conn.to.mapSelection) {
      const value = selection[key];
      if (value != null && value !== "") params.set(key, String(value));
    }
  }

  if (conn.to.params) {
    for (const [key, value] of Object.entries(conn.to.params)) {
      params.set(key, value);
    }
  }

  if (arrival) {
    params.set("via", arrival.label);
    params.set("via_return", arrival.returnHref);
  }

  const query = params.toString();
  return query ? `${conn.to.pathname}?${query}` : conn.to.pathname;
}

/** First Ready primary (or first match) with a live href. */
export function resolveFirstConnection(
  origin: ConnectionOriginQuery,
  selection: ConnectionSelection,
  registry: readonly Connection[],
  current?: URLSearchParams | string | null,
  arrival?: ArrivalContext | null,
): { connection: Connection; href: string } | null {
  const conn = primaryConnectionFor(origin, selection, registry);
  if (!conn) return null;
  const href = resolveConnectionHref(conn, selection, current, arrival);
  if (!href) {
    // Deferred primary — still return connection with null href for chrome.
    return null;
  }
  return { connection: conn, href };
}

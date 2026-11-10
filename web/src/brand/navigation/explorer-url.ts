/**
 * Explorer URL contract — Housing and Energy share this behaviour.
 *
 * Not a connection engine. It makes today’s navigation reliable enough that
 * cross-domain links can be added later without ad-hoc delete lists.
 *
 * | Action              | Result                                      | History   |
 * |---------------------|---------------------------------------------|-----------|
 * | Switch domain       | Shareable destination; prune incompatible   | push      |
 * | Change chart control| URL matches selection; scoped to view params| replace   |
 * | Browser Back        | Previous domain destination (pushed hops)   | —         |
 * | Shared link         | resolveExplorerUrl reconstructs view/filters| —         |
 * | Unsupported value   | Explicit fallback (recorded on result)      | —         |
 * | Future connection   | retain only portable ∩ destination-allowed  | push      |
 */

export type ParamValue = string | number | boolean | null | undefined;

export type UrlFallback = {
  key: string;
  from: string | null;
  to: string | null;
  reason: string;
};

export type ViewUrlSpec = {
  id: string;
  /** Query keys this view may set (besides domain + view). */
  params: readonly string[];
};

/**
 * Declarative URL surface for one sector domain.
 * Domain modules (Energy views/*, Housing later) supply this — canvases do not
 * maintain parallel deletion conditionals.
 */
export type DomainUrlContract = {
  domain: string;
  defaultView: string;
  views: readonly ViewUrlSpec[];
  /**
   * Keys that may survive a hop to another domain when that domain also allows them.
   * Conservative: only keys with the same meaning (e.g. calendar `year`).
   * Never put polysemous keys here (`measure`, `region`, `event`, `fuel`).
   */
  portableParams?: readonly string[];
};

export type ExplorerUrlResult = {
  params: URLSearchParams;
  href: (pathname: string) => string;
  fallbacks: UrlFallback[];
  /** push = domain hop / connection; replace = in-domain control. */
  history: "push" | "replace";
  domain: string;
  view: string;
};

/** Arrival chip keys (`via` / `via_return`) survive view prune — see connections contract. */
const CORE = ["domain", "view", "via", "via_return"] as const;

function viewIds(contract: DomainUrlContract): Set<string> {
  return new Set(contract.views.map((v) => v.id));
}

function paramsForView(contract: DomainUrlContract, viewId: string): Set<string> {
  const view = contract.views.find((v) => v.id === viewId);
  const keys = new Set<string>(CORE);
  if (view) for (const p of view.params) keys.add(p);
  return keys;
}

/** Union of every view’s params in the domain (plus domain + view). */
export function domainParamKeys(contract: DomainUrlContract): Set<string> {
  const keys = new Set<string>(CORE);
  for (const v of contract.views) for (const p of v.params) keys.add(p);
  return keys;
}

function cloneParams(source: URLSearchParams | string): URLSearchParams {
  return new URLSearchParams(typeof source === "string" ? source : source.toString());
}

function applyPatch(params: URLSearchParams, patch: Record<string, ParamValue>): void {
  for (const [key, val] of Object.entries(patch)) {
    if (val == null || val === "") params.delete(key);
    else params.set(key, String(val));
  }
}

function pruneToAllowed(params: URLSearchParams, allowed: Set<string>, fallbacks: UrlFallback[]): void {
  for (const key of [...params.keys()]) {
    if (allowed.has(key)) continue;
    fallbacks.push({
      key,
      from: params.get(key),
      to: null,
      reason: "not declared for this domain/view",
    });
    params.delete(key);
  }
}

function resolveViewId(
  contract: DomainUrlContract,
  raw: string | null,
  fallbacks: UrlFallback[],
): string {
  const ids = viewIds(contract);
  if (raw && ids.has(raw)) return raw;
  if (raw) {
    fallbacks.push({
      key: "view",
      from: raw,
      to: contract.defaultView,
      reason: "unsupported view for domain",
    });
  }
  return contract.defaultView;
}

function buildResult(
  params: URLSearchParams,
  contract: DomainUrlContract,
  view: string,
  history: "push" | "replace",
  fallbacks: UrlFallback[],
): ExplorerUrlResult {
  params.set("domain", contract.domain);
  if (contract.views.length === 1 && contract.views[0]!.id === contract.defaultView) {
    // Single-stage domains (e.g. policy ledger): keep URL quiet unless view was set.
    if (params.get("view") === contract.defaultView) params.delete("view");
  } else {
    params.set("view", view);
  }
  return {
    params,
    href: (pathname) => {
      const q = params.toString();
      return q ? `${pathname}?${q}` : pathname;
    },
    fallbacks,
    history,
    domain: contract.domain,
    view,
  };
}

/**
 * Open / share / deep-link: make params legal for this domain.
 * Unsupported view → defaultView. Foreign keys → dropped (recorded).
 */
export function resolveExplorerUrl(
  current: URLSearchParams | string,
  contract: DomainUrlContract,
): ExplorerUrlResult {
  const fallbacks: UrlFallback[] = [];
  const params = cloneParams(current);
  params.set("domain", contract.domain);
  const view = resolveViewId(contract, params.get("view"), fallbacks);
  pruneToAllowed(params, paramsForView(contract, view), fallbacks);
  return buildResult(params, contract, view, "replace", fallbacks);
}

/**
 * In-domain control change (or view tab). Uses history.replace.
 * When `view` changes, params are pruned to the destination view’s declaration
 * so measure/region/event do not silently mean something else.
 */
export function patchExplorerUrl(
  current: URLSearchParams | string,
  contract: DomainUrlContract,
  patch: Record<string, ParamValue>,
): ExplorerUrlResult {
  const fallbacks: UrlFallback[] = [];
  const params = cloneParams(current);
  params.set("domain", contract.domain);
  applyPatch(params, patch);
  const view = resolveViewId(contract, params.get("view"), fallbacks);
  pruneToAllowed(params, paramsForView(contract, view), fallbacks);
  return buildResult(params, contract, view, "replace", fallbacks);
}

/**
 * Domain switch or future connection hop. Uses history.push.
 * Retains only keys that are portable on the source, allowed on the destination,
 * and listed in `retain` when provided (connection engine will pass an allowlist).
 */
export function switchExplorerDomain(
  current: URLSearchParams | string,
  destination: DomainUrlContract,
  options?: {
    source?: DomainUrlContract | null;
    /** Extra allowlist for a typed connection (subset of portable ∩ dest). */
    retain?: readonly string[];
    /** Force view on arrival; otherwise keep if valid, else default. */
    view?: string | null;
  },
): ExplorerUrlResult {
  const fallbacks: UrlFallback[] = [];
  const before = cloneParams(current);
  const params = new URLSearchParams();
  params.set("domain", destination.domain);

  const sourcePortable = new Set(options?.source?.portableParams ?? []);
  const destPortable = new Set(destination.portableParams ?? []);
  const destKeys = domainParamKeys(destination);
  const retainExtra = new Set(options?.retain ?? []);

  for (const key of before.keys()) {
    if (key === "domain" || key === "view") continue;
    const value = before.get(key);
    if (value == null) continue;
    // Same meaning on both sides, or an explicit connection retain list.
    const portableOk = sourcePortable.has(key) && destPortable.has(key) && destKeys.has(key);
    const connectionOk = retainExtra.has(key) && destKeys.has(key);
    if (portableOk || connectionOk) {
      params.set(key, value);
    } else {
      fallbacks.push({
        key,
        from: value,
        to: null,
        reason: "not semantically portable to destination domain",
      });
    }
  }

  // View ids are domain-local — never carry unless the caller sets options.view.
  if (before.get("view")) {
    fallbacks.push({
      key: "view",
      from: before.get("view"),
      to: options?.view ?? destination.defaultView,
      reason: "view ids are domain-local; reset on domain switch",
    });
  }
  if (options?.view != null && options.view !== "") {
    params.set("view", options.view);
  }

  const view = resolveViewId(destination, params.get("view"), fallbacks);
  pruneToAllowed(params, paramsForView(destination, view), fallbacks);
  return buildResult(params, destination, view, "push", fallbacks);
}

/** History mode for a proposed URL relative to the current domain. */
export function explorerHistoryMode(currentDomain: string | null, nextDomain: string): "push" | "replace" {
  return currentDomain && currentDomain !== nextDomain ? "push" : "replace";
}

/**
 * Apply a resolved URL to the browser.
 * Domain hops push (Back works). Control patches replace (no stack spam).
 */
export function commitExplorerUrl(
  result: ExplorerUrlResult,
  pathname: string,
  router?: { push: (href: string, opts?: { scroll?: boolean }) => void },
): void {
  const href = result.href(pathname);
  if (result.history === "push") {
    if (router) router.push(href, { scroll: false });
    else window.history.pushState(null, "", href);
    return;
  }
  window.history.replaceState(null, "", href);
}

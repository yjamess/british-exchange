"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Domain hops without a server round-trip.
 *
 * The server renders the first domain's data as props. A rail click fetches the next
 * domain's payload from `endpoint?domain=…`, then commits data and URL together with
 * `history.pushState`, so the page never unmounts: no loading fallback, no scroll jump,
 * the hero band and rail state survive. Back/forward is followed by watching the URL.
 * If the fetch fails the hop falls back to a Next navigation so the reader still arrives.
 */
export function useDomainData<D extends string, T>({
  endpoint,
  initialDomain,
  initialData,
  urlDomain,
  decode,
}: {
  endpoint: string;
  initialDomain: D;
  initialData: T;
  /** Turn the route's JSON into T (e.g. `unpackTree` for a packed wire payload). */
  decode?: (json: unknown) => T;
  /** Domain the current URL resolves to (the caller's `useSearchParams` reading). */
  urlDomain: D;
}): {
  data: T;
  /** Domain the data belongs to. */
  domain: D;
  /** Domain being fetched, or null. */
  pending: D | null;
  /** Hop: fetch `next`, then push `href`. Same domain → just push. */
  go: (next: D, href: string) => void;
} {
  const router = useRouter();
  const [loaded, setLoaded] = useState<{ domain: D; data: T }>({ domain: initialDomain, data: initialData });
  const [pending, setPending] = useState<D | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  // A server re-render (fresh props, e.g. the fallback navigation) wins.
  useEffect(() => {
    setLoaded({ domain: initialDomain, data: initialData });
  }, [initialDomain, initialData]);

  const load = useCallback(
    async (next: D, href: string | null) => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setPending(next);
      try {
        const res = await fetch(`${endpoint}?domain=${encodeURIComponent(next)}`, { signal: c.signal });
        if (!res.ok) throw new Error(`domain ${next}: ${res.status}`);
        const json: unknown = await res.json();
        const data = decode ? decode(json) : (json as T);
        if (c.signal.aborted) return;
        if (href) window.history.pushState(null, "", href);
        setLoaded({ domain: next, data });
      } catch {
        if (c.signal.aborted) return;
        if (href) router.push(href, { scroll: false });
      } finally {
        if (ctrl.current === c) {
          ctrl.current = null;
          setPending(null);
        }
      }
    },
    [endpoint, router, decode],
  );

  const go = useCallback(
    (next: D, href: string) => {
      if (next === loaded.domain) {
        ctrl.current?.abort();
        window.history.pushState(null, "", href);
        return;
      }
      void load(next, href);
    },
    [load, loaded.domain],
  );

  // The URL moved under us (back / forward, an in-page link): follow it.
  useEffect(() => {
    if (urlDomain === loaded.domain || pending === urlDomain) return;
    void load(urlDomain, null);
  }, [urlDomain, loaded.domain, pending, load]);

  return { data: loaded.data, domain: loaded.domain, pending, go };
}

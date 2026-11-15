"use client";

import { usePathname, useSearchParams } from "next/navigation";

/**
 * Hero size for a sector page. A fresh load — a refresh, a shared link, a footer or index
 * click — shows the full plate whatever the URL says. The plate drops to the band only after
 * a domain hop made during this visit, so the question is not pushed down the page while
 * the reader moves around the rail.
 *
 * The first domain of the visit is kept per page in module scope, not in a component ref:
 * module scope survives any remount in the browser (Suspense, a loading boundary, HMR) and
 * is emptied only by a full page load, which is exactly "a fresh load". On the server the
 * hook always answers `full`, which is what the client's first render answers too.
 *
 * `defaultDomain` is the domain the bare sector address opens, so a control change on the
 * landing (which writes that domain into the URL) is not read as a hop. The bare address
 * is always the landing and resets the visit.
 */
const firstDomainByPage = new Map<string, string>();

export function useHeroSize(defaultDomain: string): "full" | "band" {
  const pathname = usePathname();
  const domain = useSearchParams().get("domain");
  if (typeof window === "undefined") return "full";
  if (domain === null) {
    firstDomainByPage.set(pathname, defaultDomain);
    return "full";
  }
  const first = firstDomainByPage.get(pathname);
  if (first === undefined) {
    firstDomainByPage.set(pathname, domain);
    return "full";
  }
  return domain === first ? "full" : "band";
}

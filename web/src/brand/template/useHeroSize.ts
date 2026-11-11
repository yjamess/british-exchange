"use client";

import { useSearchParams } from "next/navigation";
import { useRef } from "react";

/**
 * Hero size for a sector page. A fresh load — a refresh, a shared link, a footer or index
 * click — shows the full plate whatever the URL says. The plate drops to the band only after
 * a domain hop made during this visit, so the question is not pushed down the page while
 * the reader moves around the rail.
 *
 * `defaultDomain` is the domain the bare sector address opens, so a control change on the
 * landing (which writes that domain into the URL) is not read as a hop. The bare address
 * is always the landing and resets the visit.
 */
export function useHeroSize(defaultDomain: string): "full" | "band" {
  const domain = useSearchParams().get("domain");
  const first = useRef(domain ?? defaultDomain);
  if (domain === null) {
    first.current = defaultDomain;
    return "full";
  }
  return domain === first.current ? "full" : "band";
}

"use client";

import { useEffect, useState } from "react";
import type { PolicyPayload } from "./types";

let cached: PolicyPayload | null = null;

/**
 * Tracks, pledges and archive records from /api/housing/policy.
 * The result is kept after the first success so changing tabs does not fetch again.
 * An in-flight request is not cached: if the reader leaves before it finishes, the next view starts a new one.
 */
export function usePolicyData(): { data: PolicyPayload | null; failed: boolean } {
  const [data, setData] = useState<PolicyPayload | null>(cached);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (cached) {
      setData(cached);
      return;
    }
    const controller = new AbortController();
    fetch("/api/housing/policy", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<PolicyPayload>;
      })
      .then((payload) => {
        cached = payload;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, []);
  return { data, failed };
}

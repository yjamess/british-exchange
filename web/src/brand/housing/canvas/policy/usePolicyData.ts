"use client";

import { useEffect, useState } from "react";
import type { PolicyPayload } from "./types";

let cached: PolicyPayload | null = null;
let inflight: Promise<PolicyPayload> | null = null;

function load(): Promise<PolicyPayload> {
  if (!inflight) {
    inflight = fetch("/api/housing/policy")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<PolicyPayload>;
      })
      .then((payload) => {
        cached = payload;
        return payload;
      })
      .catch((err: unknown) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

/**
 * Tracks, pledges and archive records from /api/housing/policy.
 * One request is shared by every caller (figures, controls, stage); the result is kept after the
 * first success so changing tabs does not fetch again. A failed request is retried on next use.
 */
export function usePolicyData(enabled = true): { data: PolicyPayload | null; failed: boolean } {
  const [data, setData] = useState<PolicyPayload | null>(cached);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    if (cached) {
      setData(cached);
      return;
    }
    let live = true;
    load()
      .then((payload) => live && setData(payload))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [enabled]);
  return { data, failed };
}

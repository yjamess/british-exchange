"use client";

import { useEffect, useState } from "react";
import { decode, type Cell, type EvidencePayload, type EvidenceSource } from "./evidence";

/**
 * The Housing quality evidence table, fetched once per page and shared by every mode
 * (Inside the Home · Energy · Condition · Geography · Data). Switching modes never refetches.
 */

export type Evidence = { cells: Cell[]; sources: Record<string, EvidenceSource> };

let pending: Promise<Evidence> | null = null;

function load(): Promise<Evidence> {
  pending ??= fetch("/api/housing/quality")
    .then((r) => (r.ok ? (r.json() as Promise<EvidencePayload>) : Promise.reject(new Error(String(r.status)))))
    .then((p) => ({ cells: decode(p), sources: p.sources }))
    .catch((e) => {
      pending = null; // allow a retry on the next mount
      throw e;
    });
  return pending;
}

export function useQualityEvidence(): { evidence: Evidence | null; failed: boolean } {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    load()
      .then((e) => live && setEvidence(e))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { evidence, failed };
}

"use client";

/**
 * Domain 06 — Britain's Development Potential.
 * Brownfield register totals. Measure control lives in HousingExplorer.
 * Registration ≠ deliverable home.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt, fmtT } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import gen from "../../../energy/generation.module.css";

export type SitesFocus = "permission" | "authority";

type Props = {
  sites: HousingV1["brownfield"];
  focus: SitesFocus;
};

const PERMISSION_LABELS: Record<string, string> = {
  permissioned: "Permissioned",
  "not-permissioned": "Not permissioned",
  "pending-decision": "Pending decision",
  completed: "Completed (still listed)",
  unknown: "Unknown",
  "other-or-unclear": "Other / unclear wording",
};

export const SITES_MEASURE_OPTIONS: { value: SitesFocus; label: string }[] = [
  { value: "permission", label: "By permission status" },
  { value: "authority", label: "By local authority" },
];

export function sitesFoot(sites: HousingV1["brownfield"]): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const asAt = sites.asAt != null ? fmtT(sites.asAt, "annual") : null;
  return {
    definition:
      "A site on the brownfield register is not a deliverable, viable or available home. Ownership, infrastructure and planning outcomes still apply.",
    method: [
      sites.sitesWithEstimate != null && sites.siteCount != null
        ? `${fmt.count(sites.sitesWithEstimate)} of ${fmt.count(sites.siteCount)} sites publish a maximum dwelling figure. The rest publish none — a blank is missing, not zero.`
        : "A blank dwelling maximum is missing, not zero.",
      "Do not treat the published sum of maxima as pipeline capacity Britain can build.",
      "Free-text permission statuses outside the data standard are grouped as “Other / unclear wording”.",
      "Authority ranks use Planning Data local-authority entities — not ONS GSS codes yet.",
      "Coverage is incomplete across England.",
      "Local-plan allocations are not published as an England polygon feed. This view is the brownfield register, not plan allocations.",
    ].filter(Boolean),
    source:
      asAt != null
        ? `MHCLG · Planning Data · brownfield land register · England · as at ${asAt}`
        : "MHCLG · Planning Data · brownfield land register · England",
    dataHref: "/data#brownfield-land",
  };
}

export function DevelopmentSites({ sites, focus }: Props) {
  const permissionBars = useMemo(
    () =>
      sites.byPermission
        .map((r) => ({
          id: r.id,
          label: PERMISSION_LABELS[r.id] ?? r.id,
          v: r.v,
        }))
        .sort((a, b) => b.v - a.v),
    [sites.byPermission],
  );

  const authorityBars = useMemo(
    () =>
      sites.authorities.slice(0, 15).map((a) => ({
        id: a.id,
        label: a.label,
        v: a.v,
      })),
    [sites.authorities],
  );

  if (sites.siteCount == null) {
    return (
      <EmptyStage label="In preparation">
        Brownfield register statistics are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const asAt = sites.asAt != null ? fmtT(sites.asAt, "annual") : null;

  return (
    <div className={gen.stack}>
      {focus === "permission" && permissionBars.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            Sites by permission status · England{asAt ? ` · ${asAt}` : ""}
          </h3>
          <RankBars
            label="Brownfield sites by permission status, England"
            rows={permissionBars}
            format={fmt.count}
          />
        </section>
      )}

      {focus === "authority" && authorityBars.length > 0 && (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            Local authorities with most registered sites · England{asAt ? ` · ${asAt}` : ""}
          </h3>
          <RankBars
            label="Brownfield register sites by local authority (top)"
            rows={authorityBars}
            format={fmt.count}
          />
        </section>
      )}
    </div>
  );
}

"use client";

/**
 * Domain 06 — Britain's Development Potential (statistical inventory).
 * Brownfield register totals from Planning Data — registration ≠ deliverable home.
 */

import { useMemo, useState } from "react";
import { fmt, fmtT } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import { ControlRow, MenuControl } from "../../../template";
import type { HousingV1 } from "../../load";
import s from "./land.module.css";

type Props = {
  sites: HousingV1["brownfield"];
};

type Focus = "permission" | "authority";

const MEASURES: { value: Focus; label: string }[] = [
  { value: "permission", label: "By permission status" },
  { value: "authority", label: "By local authority" },
];

const PERMISSION_LABELS: Record<string, string> = {
  permissioned: "Permissioned",
  "not-permissioned": "Not permissioned",
  "pending-decision": "Pending decision",
  completed: "Completed (still listed)",
  unknown: "Unknown",
  "other-or-unclear": "Other / unclear wording",
};

export function DevelopmentSites({ sites }: Props) {
  const [focus, setFocus] = useState<Focus>("permission");

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
      <p className={s.lede}>
        Brownfield register statistics are not loaded yet. The Exchange does not show estimates.
      </p>
    );
  }

  const asAt = sites.asAt != null ? fmtT(sites.asAt, "annual") : null;

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Recorded brownfield land on local planning authority registers in England
        {asAt ? ` (as at ${asAt})` : ""}, via MHCLG Planning Data. A site on the register is not
        the same as a deliverable, viable, or available home — ownership willingness,
        infrastructure and planning outcomes still apply. Coverage is incomplete across England.
      </p>

      <p className={s.caveat}>
        {sites.sitesWithEstimate != null && sites.siteCount != null
          ? `${fmt.count(sites.sitesWithEstimate)} of ${fmt.count(sites.siteCount)} sites publish a maximum. The other ${fmt.count(sites.siteCount - sites.sitesWithEstimate)} publish none. A blank maximum is missing, not zero. `
          : "A blank dwelling maximum is missing, not zero. "}
        Do not treat the published sum as pipeline capacity Britain can build.
      </p>

      <ControlRow>
        <MenuControl label="Measure" value={focus} options={MEASURES} onChange={setFocus} />
      </ControlRow>

      {focus === "permission" && permissionBars.length > 0 && (
        <div className={s.block}>
          <p className="bo-label">Sites by planning-permission status (canonised)</p>
          <RankBars
            label="Brownfield sites by permission status, England"
            rows={permissionBars}
            format={fmt.count}
          />
          <p className={s.caveat}>
            Free-text LPA statuses outside the data standard are grouped as “Other / unclear
            wording”.
          </p>
        </div>
      )}

      {focus === "authority" && authorityBars.length > 0 && (
        <div className={s.block}>
          <p className="bo-label">Local authorities · most registered sites</p>
          <RankBars
            label="Brownfield register sites by local authority (top)"
            rows={authorityBars}
            format={fmt.count}
          />
          <p className={s.caveat}>
            Authority ranks use Planning Data local-authority entities — not ONS GSS codes yet.
          </p>
        </div>
      )}
    </div>
  );
}

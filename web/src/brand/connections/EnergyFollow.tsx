"use client";

/**
 * Shared Energy Follow chrome — Stage `follow` slot only (outside the frame).
 * Resolves the primary registry edge for this domain/view + selection.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { FollowStep } from "./FollowLink";
import {
  primaryEnergyConnection,
  resolveEnergyConnectionHref,
} from "./energy";
import { buildArrivalContext } from "./resolve";
import type { ConnectionSelection } from "./types";

export function EnergyStageFollow({
  domain,
  view,
  selection = {},
  label,
}: {
  domain: string;
  view?: string | null;
  selection?: ConnectionSelection;
  /** Arrival chip label, e.g. "Consumption · Metabolism". */
  label: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const connection = primaryEnergyConnection({ domain, view }, selection);
  if (!connection) return null;

  const href = resolveEnergyConnectionHref(
    connection,
    selection,
    searchParams,
    buildArrivalContext({ label, pathname, searchParams }),
  );

  const year = selection.year;
  const yearMeta =
    typeof year === "string" || typeof year === "number" ? year : null;
  return (
    <FollowStep
      connection={connection}
      href={href}
      destination={connection.destinationLabel}
      year={yearMeta !== "" ? yearMeta : null}
    />
  );
}

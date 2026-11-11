"use client";

/**
 * Shared Economy Follow chrome — Stage `follow` slot only (outside the frame).
 * Resolves the primary registry edge for this domain/view + selection.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { FollowStep } from "./FollowLink";
import {
  primaryEconomyConnection,
  resolveEconomyConnectionHref,
} from "./economy";
import { buildArrivalContext } from "./resolve";
import type { ConnectionSelection } from "./types";

export function EconomyStageFollow({
  domain,
  view,
  selection = {},
  label,
}: {
  domain: string;
  view?: string | null;
  selection?: ConnectionSelection;
  /** Arrival chip label, e.g. "Inflation · Changing price". */
  label: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const connection = primaryEconomyConnection({ domain, view }, selection);
  if (!connection) return null;

  const href = resolveEconomyConnectionHref(
    connection,
    selection,
    searchParams,
    buildArrivalContext({ label, pathname, searchParams }),
  );

  return (
    <FollowStep
      connection={connection}
      href={href}
      destination={connection.destinationLabel}
    />
  );
}

import type { CSSProperties } from "react";
import type { Connection } from "./types";
import s from "./follow.module.css";

/**
 * Locked Follow chrome (design-lab/follow · options 1 + 4).
 * Primary step under a stage; Arrival tab on the destination.
 */

export type FollowStepProps = {
  connection: Connection;
  /** Null when deferred — label still shows, no live hop. */
  href: string | null;
  /** Human destination name for the mono line, e.g. "Oil, gas and fossil fuels". */
  destination: string;
  /** Optional year (or other retained context) shown on the meta line. */
  year?: string | number | null;
  kicker?: string;
};

export function FollowStep({
  connection,
  href,
  destination,
  year,
  kicker = "Next reading",
}: FollowStepProps) {
  const honesty = connection.honesty ?? connection.why;
  const metaYear = year != null && year !== "" ? ` · ${year}` : "";

  return (
    <div className={s.followStep}>
      <p className={`bo-label ${s.kicker}`}>{kicker}</p>
      {href ? (
        <a className={s.title} href={href}>
          {connection.label}
        </a>
      ) : (
        <p className={s.titleMuted}>
          {connection.label}
        </p>
      )}
      <p className={s.honesty}>{honesty}</p>
      <p className={s.meta}>
        {href ? `Opens · ${destination}${metaYear}` : `Not linked yet · ${destination}`}
      </p>
    </div>
  );
}

export type ArrivalFromProps = {
  /** Label encoded on the hop (`via=`), e.g. "Generation · gas". */
  from: string | null | undefined;
  /** Return href encoded on the hop (`via_return=`). */
  returnHref?: string | null;
};

/**
 * Destination tab — pair with FollowStep.
 * Right-aligned electric strip under the sector name: From · origin · Return.
 * Paper on ink (same surface as the sector bar). No Caslon — that face is the question.
 */
export function ArrivalFrom({ from, returnHref }: ArrivalFromProps) {
  if (!from) return null;
  return (
    <aside className={`bo-on-ink ${s.arrival}`} role="status" aria-label={`Arrived from ${from}`}>
      <p className={`bo-label ${s.arrivalKicker}`}>From</p>
      <p className={s.arrivalOrigin}>{from}</p>
      {returnHref ? (
        <a className={s.arrivalReturn} href={returnHref}>
          Return
        </a>
      ) : null}
    </aside>
  );
}

/** @deprecated Prefer FollowStep — kept for any residual inline call sites. */
export function FollowLink({
  connection,
  href,
}: {
  connection: Connection;
  href: string | null;
}) {
  return (
    <FollowStep
      connection={connection}
      href={href}
      destination={connection.destinationLabel ?? connection.to.domain}
    />
  );
}

/** @deprecated Prefer a single FollowStep (primary only). */
export function FollowList({
  items,
  className,
  style,
  "aria-label": ariaLabel = "Related views",
}: {
  items: { connection: Connection; href: string | null; note?: string }[];
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}) {
  if (items.length === 0) return null;
  const first = items[0]!;
  return (
    <div className={className} style={style} aria-label={ariaLabel}>
      <FollowStep
        connection={first.connection}
        href={first.href}
        destination={first.connection.destinationLabel ?? first.connection.to.domain}
      />
    </div>
  );
}

/**
 * Sector “plate” — Every stamp silhouette + Nous v9 imprint finish.
 *
 * Clever motif idea (elevation):
 * Each sector borrows a Nous style *lane* as its print language, not a
 * generic icon. Faces are empty frames for art you generate (ASCII Magic /
 * nous-branding) OR a quiet stipple field until then.
 *
 * Lanes from ousiaresearch/nous-branding v9 imprint pipeline.
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import styles from "./LabImprintPlate.module.css";

export type ImprintLane =
  | "xerox" /* Energy — cyan xerox poster */
  | "stipple" /* Economy — minimal stipple / quiet */
  | "manual" /* Housing — letterpress manual cover */
  | "duotone" /* Infrastructure — industrial duotone */
  | "registration"; /* Government — blue + registration marks */

type Props = {
  label: string;
  href: string;
  lane: ImprintLane;
  kicker: string;
  tilt?: number;
};

const LANE_META: Record<
  ImprintLane,
  { field: string; ink: string; note: string }
> = {
  xerox: {
    field: "#7eb8c4",
    ink: "#0a1218",
    note: "xerox · scanline",
  },
  stipple: {
    field: "#e8dfc8",
    ink: "#1a2744",
    note: "stipple · quiet",
  },
  manual: {
    field: "#c4a882",
    ink: "#1e3d32",
    note: "letterpress · manual",
  },
  duotone: {
    field: "#1e3a6e",
    ink: "#e8d44a",
    note: "duotone · industrial",
  },
  registration: {
    field: "#143a66",
    ink: "#e8743a",
    note: "registration · seal",
  },
};

export function LabImprintPlate({
  label,
  href,
  lane,
  kicker,
  tilt = 0,
}: Props) {
  const meta = LANE_META[lane];
  const ids = {
    mask: `plate-mask-${lane}-${label}`,
    stipple: `plate-stipple-${lane}-${label}`,
  };

  return (
    <Link
      href={href}
      className={styles.plate}
      data-lane={lane}
      style={
        {
          "--plate-field": meta.field,
          "--plate-ink": meta.ink,
          "--plate-tilt": `${tilt}deg`,
        } as CSSProperties
      }
    >
      <svg className={styles.svg} viewBox="0 0 160 200" aria-hidden="true">
        <defs>
          <pattern
            id={ids.stipple}
            width="3"
            height="3"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="0.9" cy="0.9" r="0.7" fill="var(--plate-ink)" />
          </pattern>
          <mask id={ids.mask}>
            <rect width="160" height="200" fill="#fff" />
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={`t${i}`} cx={8 + i * 11.5} cy="0" r="4" fill="#000" />
            ))}
            {Array.from({ length: 14 }, (_, i) => (
              <circle key={`b${i}`} cx={8 + i * 11.5} cy="200" r="4" fill="#000" />
            ))}
            {Array.from({ length: 17 }, (_, i) => (
              <circle key={`l${i}`} cx="0" cy={8 + i * 11.5} r="4" fill="#000" />
            ))}
            {Array.from({ length: 17 }, (_, i) => (
              <circle key={`r${i}`} cx="160" cy={8 + i * 11.5} r="4" fill="#000" />
            ))}
          </mask>
        </defs>

        <g mask={`url(#${ids.mask})`}>
          <rect width="160" height="200" fill="#f3eee4" />
          <rect x="12" y="12" width="136" height="176" fill="var(--plate-field)" />

          {/* Utilitarian frame — Nous imprint grammar */}
          <rect
            x="16"
            y="16"
            width="128"
            height="168"
            fill="none"
            stroke="var(--plate-ink)"
            strokeWidth="1.2"
            opacity="0.55"
          />

          {/* Crop / registration marks */}
          <g stroke="var(--plate-ink)" strokeWidth="1.4" opacity="0.85">
            <path d="M22 28h10M22 28v10" />
            <path d="M138 28h-10M138 28v10" />
            <path d="M22 172h10M22 172v-10" />
            <path d="M138 172h-10M138 172v-10" />
            <circle cx="80" cy="100" r="3" fill="none" />
            <path d="M80 94v12M74 100h12" />
          </g>

          {/* Stipple field — stand-in until your generated art drops in */}
          <rect
            x="28"
            y="48"
            width="104"
            height="100"
            fill={`url(#${ids.stipple})`}
            opacity="0.35"
          />

          <text x="28" y="40" className={styles.label} fill="var(--plate-ink)">
            {label}
          </text>
          <text x="28" y="168" className={styles.lane} fill="var(--plate-ink)">
            {meta.note}
          </text>
        </g>
      </svg>
      <span className={styles.sr}>{`${label}: ${kicker}`}</span>
    </Link>
  );
}

/**
 * Iconography — "engraved line".
 * 24px grid · 1.25 stroke · square caps, mitred joins · no fills.
 * One engraving cue per icon at most (a hatch or a stipple), never decoration.
 */

import type { SVGProps } from "react";

const PATHS = {
  house: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
      <path d="M15.5 6.4V3.5h2v4.4" />
      <path d="M7.5 12h2m-2 2h2M14.5 12h2m-2 2h2" strokeWidth="0.9" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="12" r="4" />
      <circle cx="7.5" cy="12" r="1.2" />
      <path d="M11.5 12H21M17 12v3M20 12v2.5" />
    </>
  ),
  scales: (
    <>
      <path d="M12 4v16M8 20h8M4.5 7h15" />
      <path d="M4.5 7 2.5 13m2-6 2 6M2.5 13c.7 1.6 3.3 1.6 4 0" />
      <path d="M19.5 7l-2 6m2-6 2 6m-4 0c.7 1.6 3.3 1.6 4 0" />
      <circle cx="12" cy="4" r="0.9" />
    </>
  ),
  crane: (
    <>
      <path d="M7 21V4M3.5 5H21M7 5 4 8.5h3" />
      <path d="M7 8l2-3M7 11l2-3M7 14l2-3M7 17l2-3M9 5v16" strokeWidth="0.9" />
      <path d="M18 5v6.5M16.5 11.5h3" />
      <rect x="15" y="13" width="6" height="4" />
      <path d="M16.5 13v4M18 13v4M19.5 13v4" strokeWidth="0.7" />
      <path d="M5 21h6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-6.4-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.6" r="2.3" />
    </>
  ),
  tiles: (
    <>
      <rect x="3.5" y="3.5" width="5" height="5" />
      <rect x="9.5" y="3.5" width="5" height="5" />
      <rect x="9.5" y="9.5" width="5" height="5" />
      <rect x="15.5" y="9.5" width="5" height="5" />
      <rect x="9.5" y="15.5" width="5" height="5" />
      <path d="M16.5 15.5l3 3m-3-1 1.5 1.5M18 15.5l1.5 1.5" strokeWidth="0.7" />
    </>
  ),
  ledger: (
    <>
      <rect x="5" y="3" width="14" height="18" />
      <path d="M7.5 3v18" />
      <path d="M10 8h6.5M10 11h6.5M10 14h4" />
    </>
  ),
  trend: (
    <>
      <path d="M3 19h18" strokeWidth="0.9" />
      <path d="M3.5 16 9 10.5l3.5 3L20 6" />
      <path d="M16 6h4v4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5.5 5.5" />
    </>
  ),
  arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
  external: <path d="M8 6h10v10M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  seal: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5.5" strokeDasharray="1.2 1.6" />
      <path d="m9.5 12 1.8 1.8 3.3-3.6" />
    </>
  ),
  observed: <path d="M3 12h18" strokeWidth="1.75" />,
  provisional: <path d="M3 12h18" strokeWidth="1.75" strokeDasharray="0.1 3.2" strokeLinecap="round" />,
  unobserved: <path d="M3 12h18" strokeWidth="1.25" strokeDasharray="4 3" />,
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export function Icon({ name, size = 20, title, ...rest }: { name: IconName; size?: number; title?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

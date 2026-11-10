/**
 * Design lab — sector emoji, drawn in the house "engraved line" grammar (see brand/icons.tsx).
 * 24px grid · square caps · mitred joins · no fills · one engraving cue per emoji (hatch, stipple
 * or a dotted line). Emoji differ from UI icons by telling a small scene (wings on a note, smoke
 * from a chimney), not by adding colour.
 *
 * Stroke is optical: about 1.25px at 24px and below, rising to about 2px at 96px, so large emoji
 * stay engraved rather than turning into marker drawings. Lab only — not part of the shipped kit.
 */

import type { ReactNode, SVGProps } from "react";

type Draw = (cue: number) => ReactNode;

export type EmojiSpec = {
  id: string;
  name: string;
  sector: string;
  shortcode: string;
  /** What the one engraving cue is, for the specimen card. */
  cue: string;
  draw: Draw;
};

export const EMOJI: EmojiSpec[] = [
  {
    id: "money-with-wings",
    name: "Money with wings",
    sector: "Economy",
    shortcode: ":money-with-wings:",
    cue: "Feather hatching",
    draw: (c) => (
      <>
        <rect x="6.5" y="8" width="11" height="8" />
        <path d="M13.9 9.9a1.7 1.7 0 0 0-3.1.8c0 1.6.7 2.3-.8 3.3h4.1M9.8 12h2.8" />
        <path d="M6.5 10.5C4.3 7.8 1.8 7 .8 7.6c.6 1.7 1.8 2.8 3.4 3.3-1.3.4-2.3 1.2-2.9 2.4 1.7.5 3.4.1 5.2-1.1" />
        <path d="M17.5 10.5c2.2-2.7 4.7-3.5 5.7-2.9-.6 1.7-1.8 2.8-3.4 3.3 1.3.4 2.3 1.2 2.9 2.4-1.7.5-3.4.1-5.2-1.1" />
        <path d="M3 9.2l1.6.8M3.3 12.6l1.8-.6M21 9.2l-1.6.8M20.7 12.6l-1.8-.6" strokeWidth={c} />
        <path d="M9.5 18.8H11M13 18.8h1.5" strokeWidth={c} />
      </>
    ),
  },
  {
    id: "high-voltage",
    name: "High voltage",
    sector: "Energy",
    shortcode: ":high-voltage:",
    cue: "Hatched lower stroke",
    draw: (c) => (
      <>
        <path d="M13.5 2.5 5.5 13.5h5.6L9.5 21.5l9-12.2h-5.8L13.5 2.5Z" />
        <path d="M10.4 16.2l2.6-2.4M10.1 18.8l4.4-4.1M11.6 13.5l1.9-1.9" strokeWidth={c} />
        <path d="M18.5 4.5l1.6-1.6M19.8 7h2.2M3.6 17.8 2 19.4" />
      </>
    ),
  },
  {
    id: "house-with-smoke",
    name: "House with smoke",
    sector: "Housing",
    shortcode: ":house-with-smoke:",
    cue: "Window glazing bars",
    draw: (c) => (
      <>
        <path d="M3.5 12 12 5.2l8.5 6.8" />
        <path d="M5.5 10.4v10.1h13V10.4" />
        <path d="M10.5 20.5v-4.6h3v4.6" />
        <path d="M15.5 7.8V4.5h2v4.9" />
        <path d="M16.5 3c.8-.8 2-.4 1.9.5-.1.9 1 1.3 1.8.5" />
        <rect x="6.8" y="12.6" width="2.6" height="2.4" />
        <path d="M8.1 12.6V15M6.8 13.8h2.6" strokeWidth={c} />
      </>
    ),
  },
  {
    id: "two-people",
    name: "Two people",
    sector: "People",
    shortcode: ":two-people:",
    cue: "Stippled ground",
    draw: (c) => (
      <>
        <circle cx="7.5" cy="7.5" r="2.4" />
        <circle cx="16.5" cy="8.6" r="2.1" />
        <path d="M3.5 20v-4a4 4 0 0 1 8 0v4" />
        <path d="M13 20v-3.4a3.5 3.5 0 0 1 7 0V20" />
        <path d="M19.4 14.4l2.1-3.4" />
        <g strokeWidth={c}>
          <path d="M4 21.4h.1M7 21.4h.1M10 21.4h.1M13 21.4h.1M16 21.4h.1M19 21.4h.1" strokeLinecap="round" />
        </g>
      </>
    ),
  },
  {
    id: "ballot-box",
    name: "Ballot box",
    sector: "Government",
    shortcode: ":ballot-box:",
    cue: "Hatched lid band",
    draw: (c) => (
      <>
        <path d="M9.5 11.5V3.5h4l1.5 1.5v6.5" />
        <path d="M10.9 6l2 2m0-2-2 2" />
        <path d="M4.5 11.5h15v9h-15z" />
        <path d="M8.5 11.5h7" strokeWidth={c * 2.6} />
        <path d="M4.5 14.5h15" />
        <path d="M6 14.5l2-3M9.5 14.5l2-3M13 14.5l2-3M16.5 14.5l2-3" strokeWidth={c} />
        <path d="M10 17.5h4" />
      </>
    ),
  },
  {
    id: "train-front",
    name: "Train",
    sector: "Infrastructure",
    shortcode: ":train:",
    cue: "Ruled sleepers",
    draw: (c) => (
      <>
        <path d="M5.5 16.5V5.2c0-.9.8-1.7 1.7-1.7h9.6c.9 0 1.7.8 1.7 1.7v11.3z" />
        <path d="M7.3 6.3h9.4v4.4H7.3z" />
        <circle cx="8.6" cy="13.8" r="0.9" />
        <circle cx="15.4" cy="13.8" r="0.9" />
        <path d="M11 13.8h2" />
        <path d="M8 16.5 5.2 21.5M16 16.5l2.8 5" />
        <path d="M6.8 18.6h10.4M5.9 20.3h12.2" strokeWidth={c} />
      </>
    ),
  },
  {
    id: "map-with-pin",
    name: "Map with pin",
    sector: "Regions",
    shortcode: ":map-with-pin:",
    cue: "Dotted route",
    draw: (c) => (
      <>
        <path d="M2.5 11.5l5-2 9 2 5-2v10l-5 2-9-2-5 2z" />
        <path d="M7.5 9.5v10M16.5 11.5v10" strokeWidth={c} />
        <path d="M14 13.5s-3.3-3.1-3.3-5.8a3.3 3.3 0 0 1 6.6 0c0 2.7-3.3 5.8-3.3 5.8Z" />
        <circle cx="14" cy="7.7" r="1.1" />
        <path d="M4.5 17.6 7 16.1l3 1 2.6-2.3" strokeWidth={c * 1.4} strokeDasharray="0.1 1.9" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "hourglass",
    name: "Hourglass",
    sector: "History",
    shortcode: ":hourglass:",
    cue: "Stippled sand",
    draw: (c) => (
      <>
        <path d="M5.5 2.5h13M5.5 21.5h13" />
        <path d="M7.5 2.5c0 4.6 4.5 6.5 4.5 9.5s-4.5 4.9-4.5 9.5M16.5 2.5c0 4.6-4.5 6.5-4.5 9.5s4.5 4.9 4.5 9.5" />
        <path d="M9.6 6.6h4.8" strokeWidth={c} />
        <path d="M12 13v4" strokeWidth={c * 1.4} strokeDasharray="0.1 1.6" strokeLinecap="round" />
        <g strokeWidth={c * 1.6} strokeLinecap="round">
          <path d="M12 18.4h.1M10.6 19.9h.1M12 20.1h.1M13.4 19.9h.1M11.3 19.1h.1M12.7 19.1h.1M9.7 20.8h.1M14.3 20.8h.1" />
        </g>
      </>
    ),
  },
];

/** Rendered stroke in px for a given size: 1.25 at ≤24, ~2 at 96. */
export function opticalStroke(size: number): number {
  const px = size <= 24 ? 1.25 : 1.25 + ((Math.min(size, 128) - 24) / 72) * 0.75;
  return (px * 24) / size; // in viewBox units
}

export function SectorEmoji({
  spec,
  size = 24,
  title,
  ...rest
}: { spec: EmojiSpec; size?: number; title?: string } & SVGProps<SVGSVGElement>) {
  const w = opticalStroke(size);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {spec.draw(w * 0.56)}
    </svg>
  );
}

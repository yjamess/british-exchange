import type { CSSProperties, ReactNode } from "react";

/**
 * Halftone plate: one mask PNG (ink as alpha) printed in token colours.
 * Files live in /public/brand/plates and are drawn by the observatory-imprint skill
 * (.claude/skills/observatory-imprint/scripts/halftone-plates.py).
 *
 * Treatments are for imagery, never reading themes:
 *   print    — electric on paper (default)
 *   night    — union on electric; low contrast, imagery only
 *   negative — tones reversed; section breaks only
 * Any copy over a plate goes in a solid panel (`.bo-panel`).
 */

export type PlateTreatment = "print" | "night" | "negative";
export type PlateShape = "wide" | "portrait";

type PlateEntry = {
  wide?: string;
  portrait?: string;
  /** What the plate depicts, for aria-label when the plate carries meaning. */
  alt: string;
  /** Data-generated plates must carry a source line like any chart. */
  source?: string;
};

export const PLATES = {
  globe: {
    wide: "/brand/plates/l-04-globe-ecosystem.png",
    portrait: "/brand/plates/p-04-globe-ecosystem.png",
    alt: "Halftone globe circled by data orbits",
  },
  coolingTowers: {
    wide: "/brand/plates/l-01-cooling-towers.png",
    portrait: "/brand/plates/p-01-cooling-towers.png",
    alt: "Halftone drawing of three hyperboloid cooling towers",
  },
  offshoreWind: {
    wide: "/brand/plates/l-02-offshore-turbine.png",
    portrait: "/brand/plates/p-02-offshore-turbine.png",
    alt: "Halftone drawing of offshore wind turbines at sea",
  },
  towerBlock: {
    portrait: "/brand/plates/p-03-tower-block.png",
    alt: "Halftone drawing of a brutalist tower block",
  },
  pylons: {
    wide: "/brand/plates/l-05-pylon-line.png",
    alt: "Halftone drawing of a line of lattice electricity pylons",
  },
  regionalHousePrices: {
    wide: "/brand/plates/l-06-regions-house-prices.png",
    portrait: "/brand/plates/p-06-regions-house-prices.png",
    alt: "Twelve engraved ridges, one per UK region or nation, rising with average house prices from January 1995",
    source:
      "HM Land Registry / ONS, UK House Price Index, average price by region, Jan 1995 – Aug 2026 (release Aug 2026). Exchange indicator: house-prices-by-region.",
  },
} as const satisfies Record<string, PlateEntry>;

export type PlateName = keyof typeof PLATES;

export function Plate({
  name,
  src,
  shape = "wide",
  treatment = "print",
  position = "center",
  fit = "cover",
  label,
  className = "",
  style,
  children,
}: {
  name?: PlateName;
  /** Use a mask file directly instead of a named plate. */
  src?: string;
  shape?: PlateShape;
  treatment?: PlateTreatment;
  position?: string;
  fit?: "cover" | "contain";
  /** Set when the image carries meaning; omit for decorative use (hidden from assistive tech). */
  label?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const entry: PlateEntry | undefined = name ? PLATES[name] : undefined;
  const file = src ?? (entry ? (shape === "portrait" ? entry.portrait ?? entry.wide : entry.wide ?? entry.portrait) : undefined);
  const vars = {
    ["--bo-plate-src" as string]: file ? `url("${file}")` : "none",
    ["--bo-plate-pos" as string]: position,
    ["--bo-plate-fit" as string]: fit,
    ...style,
  } as CSSProperties;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };

  return (
    <div className={`bo-plate ${className}`.trim()} data-treatment={treatment} style={vars} {...(children ? {} : a11y)}>
      {children}
    </div>
  );
}

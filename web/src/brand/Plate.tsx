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
  terrace: {
    wide: "/brand/plates/l-07-terrace-v2.png",
    alt: "Halftone drawing of a Victorian bay-fronted terrace with garden trees and hedged fields rising behind",
  },
  energyCutaway: {
    wide: "/brand/plates/l-16-energy-cutaway.png",
    alt: "Halftone sectional cutaway of a British two-storey house showing floors, boiler, radiator, kitchen, loft cylinder and fittings — domestic end-use zones",
    source:
      "Atmosphere plate for DESNZ ECUK Table U3 domestic end uses (space heating, water heating, cooking, lighting, appliances). Not a survey dwelling.",
  },
  landPlots: {
    wide: "/brand/plates/l-08-land-plots.png",
    portrait: "/brand/plates/p-08-land-plots.png",
    alt: "Halftone drawing of Land Registry–style cadastral plots in axonometric elevation, one parcel developed",
  },
  streetHouses: {
    wide: "/brand/plates/l-09-street-houses.png",
    alt: "Halftone row of terraced houses along a street",
    source:
      "Wikimedia Commons · 1–10 Stanley Terrace, Mossley Hill, Liverpool (CC BY-SA 3.0). Screened for British Exchange.",
  },
  housesFull: {
    wide: "/brand/plates/l-09-street.png",
    alt: "Halftone aerial drawing of a curving street of interwar semi-detached houses with long back gardens",
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
  // Sector heroes (.claude/skills/observatory-imprint/scripts/sector-plates.py)
  containerPort: {
    wide: "/brand/plates/l-10-container-port.png",
    alt: "Halftone drawing of ship-to-shore cranes over a container port, stacks on the quay and a ship at the berth",
  },
  crowd: {
    wide: "/brand/plates/l-11-crowd.png",
    alt: "Halftone drawing of simple standing figures, adults and children, gathered on a paved square",
  },
  pollingStation: {
    wide: "/brand/plates/l-12-polling-station.png",
    alt: "Halftone drawing of a polling station: a padlocked ballot box on a trestle table, a row of booths behind",
  },
  viaduct: {
    wide: "/brand/plates/l-13-viaduct.png",
    alt: "Halftone drawing of a stone railway viaduct striding a valley, a train crossing the deck",
  },
  ukRelief: {
    wide: "/brand/plates/l-14-uk-relief.png",
    alt: "Halftone hill-shaded relief map of the United Kingdom, north up, on a graticule",
    source:
      "Office for National Statistics, Local Authority Districts (December 2025) Boundaries UK BUC, dissolved. Contains OS data © Crown copyright and database right 2025. Relief is illustrative, not elevation data.",
  },
  pithead: {
    wide: "/brand/plates/l-15-pithead.png",
    alt: "Halftone drawing of a colliery headframe with twin winding wheels, the engine house and a chimney stack",
  },
} as const satisfies Record<string, PlateEntry>;

/**
 * Dwelling-type specimens (dwelling-types.py) — one matched set: same camera, light, ground and
 * scale, so the buildings compare at true relative size. Keys are Census 2021 TS044 type ids.
 * 1000×1000 masks; use with fit="contain".
 */
export const DWELLING_PLATES = {
  detached: { src: "/brand/plates/d-detached.png", alt: "Halftone specimen drawing of a detached two-storey house in its own plot" },
  "semi-detached": { src: "/brand/plates/d-semi-detached.png", alt: "Halftone specimen drawing of a pair of semi-detached houses under one hipped roof" },
  terraced: { src: "/brand/plates/d-terraced.png", alt: "Halftone specimen drawing of a row of four bay-fronted terraced houses" },
  "purpose-built-flat": { src: "/brand/plates/d-flat.png", alt: "Halftone specimen drawing of a four-storey purpose-built block of flats" },
  other: { src: "/brand/plates/d-other.png", alt: "Halftone specimen drawing of a static caravan on its pitch" },
} as const satisfies Record<string, { src: string; alt: string }>;

/**
 * Tenure specimens (dwelling-types.py --only owner,private,social) — tenure read from the street,
 * in the same matched set as DWELLING_PLATES (camera, light, ground, scale): sold board and car on
 * the drive (owner), to-let boards along a terrace (private rented), council deck-access block
 * (social rented). No text baked in. Keys match Changing Housing Fabric tenure ids.
 */
export const TENURE_PLATES = {
  owner: {
    src: "/brand/plates/t-owner.png",
    alt: "Halftone specimen drawing of a semi-detached house with a sold board by the gate and a car on the drive — owner-occupied",
  },
  private: {
    src: "/brand/plates/t-private.png",
    alt: "Halftone specimen drawing of a terrace with to-let boards in the front gardens — private rented",
  },
  social: {
    src: "/brand/plates/t-social.png",
    alt: "Halftone specimen drawing of a council deck-access block with open walkways and stair towers — social rented",
  },
} as const satisfies Record<string, { src: string; alt: string }>;

/**
 * Energy Field Guide specimens (energy-tech-types.py) — one matched set for Domain 06.
 * Illustrative engineering forms only: plate area is never capacity, generation or load factor.
 * Keys match renewables-model FieldTechId values.
 */
export const ENERGY_TECH_PLATES = {
  "offshore-wind": {
    src: "/brand/plates/e-offshore.png",
    alt: "Halftone specimen drawing of an offshore wind turbine standing in open water",
  },
  "onshore-wind": {
    src: "/brand/plates/e-onshore.png",
    alt: "Halftone specimen drawing of an onshore wind turbine on open ground",
  },
  solar: {
    src: "/brand/plates/e-solar.png",
    alt: "Halftone specimen drawing of a ground-mounted solar panel array",
  },
  hydro: {
    src: "/brand/plates/e-hydro.png",
    alt: "Halftone specimen drawing of a hydroelectric dam wall and spillway",
  },
  bioenergy: {
    src: "/brand/plates/e-bioenergy.png",
    alt: "Halftone specimen drawing of a bioenergy plant hall with a flue stack",
  },
  nuclear: {
    src: "/brand/plates/e-nuclear.png",
    alt: "Halftone specimen drawing of a reactor dome beside a cooling tower — illustrative form, not a named site",
  },
} as const satisfies Record<string, { src: string; alt: string }>;

/**
 * Penship icons — 2D technical pen lines (penship-icons.py).
 * Use for condensed nav when a clear symbol reads better than a scene crop.
 */
export const ICON_PLATES = {
  housePrice: {
    src: "/brand/plates/i-pen-house-price.png",
    alt: "House with price board, penship icon",
  },
  key: {
    src: "/brand/plates/i-pen-key.png",
    alt: "Door key, penship icon",
  },
  balance: {
    src: "/brand/plates/i-pen-balance.png",
    alt: "Balance scale, penship icon",
  },
  blocks: {
    src: "/brand/plates/i-pen-blocks.png",
    alt: "Stacked dwelling blocks, penship icon",
  },
  digger: {
    src: "/brand/plates/i-pen-digger.png",
    alt: "Tracked excavator, penship icon",
  },
  plot: {
    src: "/brand/plates/i-pen-plot.png",
    alt: "Cadastral plot with survey mark, penship icon",
  },
  gauge: {
    src: "/brand/plates/i-pen-gauge.png",
    alt: "Quality rating dial, penship icon",
  },
  shelter: {
    src: "/brand/plates/i-pen-shelter.png",
    alt: "Temporary shelter, penship icon",
  },
  deed: {
    src: "/brand/plates/i-pen-deed.png",
    alt: "Title deed with seal, penship icon",
  },
  scroll: {
    src: "/brand/plates/i-pen-scroll.png",
    alt: "Statute scroll, penship icon",
  },
} as const;

/**
 * Small 3D + halftone scene crops (halftone-plates.py --size 320x320 --prefix i-3d-).
 * Same craft as hero plates — for lab comparison with penship icons.
 */
export const SCENE_ICON_PLATES = {
  terrace: {
    src: "/brand/plates/i-3d-07-terrace.png",
    alt: "Halftone terrace scene icon",
  },
  landPlots: {
    src: "/brand/plates/i-3d-08-land-plots.png",
    alt: "Halftone land plots scene icon",
  },
  towerBlock: {
    src: "/brand/plates/i-3d-03-tower-block.png",
    alt: "Halftone tower block scene icon",
  },
  globe: {
    src: "/brand/plates/i-3d-04-globe-ecosystem.png",
    alt: "Halftone globe scene icon",
  },
} as const;

/**
 * Domain-specific photo references screened to ink masks (photo-to-icon.py).
 * Sources / licences: data/icon-refs/SOURCES.json (housing), data/icon-refs/energy/SOURCES.json (energy)
 */
export const REF_ICON_PLATES = {
  prices: {
    src: "/brand/plates/i-ref-prices.png",
    alt: "Terraced houses — house prices",
  },
  renting: {
    src: "/brand/plates/i-ref-renting.png",
    alt: "Letting-agent boards on a terrace — renting",
  },
  affordability: {
    src: "/brand/plates/i-ref-affordability.png",
    alt: "Balance of time and money — affordability",
  },
  stock: {
    src: "/brand/plates/i-ref-stock.png",
    alt: "Tower blocks — housing stock",
  },
  supply: {
    src: "/brand/plates/i-ref-supply.png",
    alt: "Excavator — construction and supply",
  },
  land: {
    src: "/brand/plates/i-ref-land.png",
    alt: "Green Belt landscape — planning and land",
  },
  quality: {
    src: "/brand/plates/i-ref-quality.png",
    alt: "Thermal insulation — housing quality",
  },
  insecurity: {
    src: "/brand/plates/i-ref-insecurity.png",
    alt: "Tents on a London pavement — housing insecurity",
  },
  ownership: {
    src: "/brand/plates/i-ref-ownership.png",
    alt: "Title deed — ownership",
  },
  policy: {
    src: "/brand/plates/i-ref-policy.png",
    alt: "The Houses of Parliament — housing policy",
  },
  energyGeneration: {
    src: "/brand/plates/i-ref-energy-generation.png",
    alt: "Gas turbine stacks at Ballylumford — electricity generation",
  },
  energyConsumption: {
    src: "/brand/plates/i-ref-energy-consumption.png",
    alt: "Economy 7 meter and teleswitcher — energy consumption",
  },
  energyPrices: {
    src: "/brand/plates/i-ref-energy-prices.png",
    alt: "Smart prepayment meter — energy prices and costs",
  },
  energyFossil: {
    src: "/brand/plates/i-ref-energy-fossil.png",
    alt: "North Sea oil platform — oil, gas and fossil fuels",
  },
  energyImports: {
    src: "/brand/plates/i-ref-energy-imports.png",
    alt: "LNG storage tanks at the Isle of Grain — energy imports and security",
  },
  energyLowCarbon: {
    src: "/brand/plates/i-ref-energy-low-carbon.png",
    alt: "Sizewell B reactor dome — renewables and nuclear",
  },
  energyNetworks: {
    src: "/brand/plates/i-ref-energy-networks.png",
    alt: "Pylon over Creyke Beck substation — electricity networks",
  },
  energyManufacturing: {
    src: "/brand/plates/i-ref-energy-manufacturing.png",
    alt: "Sawtooth-roofed factory at Wainstalls — manufacturing output",
  },
  energyWork: {
    src: "/brand/plates/i-ref-energy-industrial-work.png",
    alt: "Port Talbot steelworks — industrial employment and productivity",
  },
  energyPolicy: {
    src: "/brand/plates/i-ref-energy-policy.png",
    alt: "Redcar blast furnace — industrial policy and transition",
  },
} as const;

export type PlateName = keyof typeof PLATES;
export type IconPlateName = keyof typeof ICON_PLATES;
export type SceneIconPlateName = keyof typeof SCENE_ICON_PLATES;
export type RefIconPlateName = keyof typeof REF_ICON_PLATES;

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

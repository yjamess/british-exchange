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
 * UK circulating coins (coin-types.py) — one matched set at true relative size: `mm` is the
 * Royal Mint diameter (width across for the heptagonal 50p / 20p). Faces are the King Charles III
 * reverses, reproduced under Royal Mint permission (docs/permissions/royal-mint-coins.md);
 * obverse not used. Square masks; use with fit="contain" and size the box by `mm`.
 * `pence` orders them for change-making (largest first).
 */
export const COIN_PLATES = {
  "2pound": { src: "/brand/plates/c-coin-2pound.png", mm: 28.4, pence: 200, label: "£2", alt: "Halftone two pound coin, national flowers reverse: rose, thistle, daffodil and shamrock" },
  "1pound": { src: "/brand/plates/c-coin-1pound.png", mm: 23.43, pence: 100, label: "£1", alt: "Halftone twelve-sided one pound coin, bees reverse" },
  "50p": { src: "/brand/plates/c-coin-50p.png", mm: 27.3, pence: 50, label: "50p", alt: "Halftone fifty pence coin, Atlantic salmon reverse" },
  "20p": { src: "/brand/plates/c-coin-20p.png", mm: 21.4, pence: 20, label: "20p", alt: "Halftone twenty pence coin, puffin reverse" },
  "10p": { src: "/brand/plates/c-coin-10p.png", mm: 24.5, pence: 10, label: "10p", alt: "Halftone ten pence coin, capercaillie reverse" },
  "5p": { src: "/brand/plates/c-coin-5p.png", mm: 18.0, pence: 5, label: "5p", alt: "Halftone five pence coin, oak leaves and acorns reverse" },
  "2p": { src: "/brand/plates/c-coin-2p.png", mm: 25.9, pence: 2, label: "2p", alt: "Halftone two pence coin, red squirrel reverse" },
  "1p": { src: "/brand/plates/c-coin-1p.png", mm: 20.3, pence: 1, label: "1p", alt: "Halftone one penny coin, hazel dormouse reverse" },
} as const satisfies Record<string, { src: string; mm: number; pence: number; label: string; alt: string }>;

export type CoinName = keyof typeof COIN_PLATES;

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
 * Everyday-basket specimens (basket-items.py) — one matched set for the ONS shopping-price
 * items: same tabletop camera, light, ground and screen; sizes compressed toward a common scale
 * so small items still read in a grid. Generic and unbranded: no logos, lettering or packaging
 * marks. The milks differ by cap and label band (striped = semi-skimmed, solid = whole); the
 * breads by crumb (white vs flecked brown). 1000×1000 masks; use with fit="contain".
 */
export const BASKET_PLATES = {
  bananas: { src: "/brand/plates/b-bananas.png", alt: "Halftone drawing of a bunch of bananas" },
  butter: { src: "/brand/plates/b-butter.png", alt: "Halftone drawing of a block of butter, wrapper peeled back, with a knife" },
  eggs: { src: "/brand/plates/b-eggs.png", alt: "Halftone drawing of an open box of six eggs" },
  "instant-coffee": { src: "/brand/plates/b-instant-coffee.png", alt: "Halftone drawing of a jar of instant coffee with a spoonful of granules" },
  "restaurant-coffee": { src: "/brand/plates/b-restaurant-coffee.png", alt: "Halftone drawing of a cup of coffee on a saucer with a teaspoon" },
  "semi-skimmed-milk": { src: "/brand/plates/b-semi-skimmed-milk.png", alt: "Halftone drawing of a plastic milk bottle with a striped cap — semi-skimmed" },
  "whole-milk": { src: "/brand/plates/b-whole-milk.png", alt: "Halftone drawing of a plastic milk bottle with a solid dark cap — whole milk" },
  "white-potatoes": { src: "/brand/plates/b-white-potatoes.png", alt: "Halftone drawing of a pile of potatoes" },
  "white-bread": { src: "/brand/plates/b-white-bread.png", alt: "Halftone drawing of a sliced white loaf showing white crumb" },
  "wholemeal-bread": { src: "/brand/plates/b-wholemeal-bread.png", alt: "Halftone drawing of a sliced wholemeal loaf showing flecked brown crumb" },
} as const satisfies Record<string, { src: string; alt: string }>;

export type BasketItemName = keyof typeof BASKET_PLATES;

/**
 * Basket type archetypes (basket-items.py --only types) — the generic picture for every basket
 * item that has no featured plate, chosen by item type. Same matched set as BASKET_PLATES
 * (camera, light, ground, screen); generic and unbranded. 1000×1000 masks; use with fit="contain".
 */
export const BASKET_TYPE_PLATES = {
  bottle: { src: "/brand/plates/b-type-bottle.png", alt: "Halftone drawing of a glass bottle" },
  pint: { src: "/brand/plates/b-type-pint.png", alt: "Halftone drawing of a pint glass of beer" },
  tin: { src: "/brand/plates/b-type-tin.png", alt: "Halftone drawing of a ribbed food tin with a ring pull" },
  box: { src: "/brand/plates/b-type-box.png", alt: "Halftone drawing of a cereal box" },
  packet: { src: "/brand/plates/b-type-packet.png", alt: "Halftone drawing of a sealed snack packet" },
  jar: { src: "/brand/plates/b-type-jar.png", alt: "Halftone drawing of a screw-top jar" },
  carton: { src: "/brand/plates/b-type-carton.png", alt: "Halftone drawing of a gable-top carton" },
  fruit: { src: "/brand/plates/b-type-fruit.png", alt: "Halftone drawing of an apple with a leaf beside an orange" },
  veg: { src: "/brand/plates/b-type-veg.png", alt: "Halftone drawing of carrots with their tops beside a head of broccoli" },
  meat: { src: "/brand/plates/b-type-meat.png", alt: "Halftone drawing of two cuts of meat in a wrapped tray" },
  meal: { src: "/brand/plates/b-type-meal.png", alt: "Halftone drawing of a plated meal with a knife and fork" },
  toiletry: { src: "/brand/plates/b-type-toiletry.png", alt: "Halftone drawing of a pump bottle beside a tube" },
  textile: { src: "/brand/plates/b-type-textile.png", alt: "Halftone drawing of a stack of folded towels" },
  kitchenware: { src: "/brand/plates/b-type-kitchenware.png", alt: "Halftone drawing of a saucepan beside a dinner plate" },
  appliance: { src: "/brand/plates/b-type-appliance.png", alt: "Halftone drawing of an electric kettle" },
  chair: { src: "/brand/plates/b-type-chair.png", alt: "Halftone drawing of a wooden chair" },
  tools: { src: "/brand/plates/b-type-tools.png", alt: "Halftone drawing of a toolbox with a screwdriver on the lid and a hammer beside it" },
  ticket: { src: "/brand/plates/b-type-ticket.png", alt: "Halftone drawing of two paper tickets with perforated stubs" },
  bike: { src: "/brand/plates/b-type-bike.png", alt: "Halftone drawing of a bicycle side-on" },
  car: { src: "/brand/plates/b-type-car.png", alt: "Halftone drawing of a small hatchback car" },
} as const satisfies Record<string, { src: string; alt: string }>;

export type BasketTypeName = keyof typeof BASKET_TYPE_PLATES;

/**
 * Energy Field Guide specimens (energy-tech-types.py) — one matched set for Domain 06.
 * Illustrative engineering forms only: plate area is never capacity, generation or load factor.
 * Keys match renewables-model FieldTechId values.
 */
export const ENERGY_TECH_PLATES = {
  "offshore-wind": {
    src: "/brand/plates/e-offshore.png",
    alt: "Halftone specimen drawing of an offshore wind turbine on its monopile and transition piece, with more of the farm behind in open sea",
  },
  "onshore-wind": {
    src: "/brand/plates/e-onshore.png",
    alt: "Halftone specimen drawing of an onshore wind turbine on a hilltop above hedged fields, with more turbines on the ridge behind",
  },
  solar: {
    src: "/brand/plates/e-solar.png",
    alt: "Halftone specimen drawing of rows of ground-mounted solar panels on mown grass",
  },
  hydro: {
    src: "/brand/plates/e-hydro.png",
    alt: "Halftone specimen drawing of a curved concrete dam across a valley, with the reservoir behind, a spillway and the river below",
  },
  bioenergy: {
    src: "/brand/plates/e-bioenergy.png",
    alt: "Halftone specimen drawing of a biomass power station: fuel storage domes, a conveyor to the boiler house, and a tall stack",
  },
  nuclear: {
    src: "/brand/plates/e-nuclear.png",
    alt: "Halftone specimen drawing of a coastal nuclear station: reactor dome, turbine hall and vent stack by the sea — illustrative form, not a named site",
  },
} as const satisfies Record<string, { src: string; alt: string }>;

/**
 * Manufacturing branch specimens — one per SIC 2007 broad branch (subsections CA–CM),
 * keyed by SIC code. Matched set from manufacturing-types.py: same camera, floor and light.
 * Illustrative forms of what each branch makes; plate size is not output or share.
 */
const mfg = (file: string, alt: string) => ({ src: `/brand/plates/m-${file}.png`, alt: `Halftone specimen drawing of ${alt}` });
export const MANUFACTURING_PLATES = {
  CA: mfg("food", "a pyramid of food tins"),
  CB: mfg("textiles", "a bolt of cloth on a cradle beside three cones of yarn"),
  CC: mfg("paper", "two paper reels, one standing and one lying on its side"),
  CD: mfg("refinery", "a refinery distillation column with platforms and a smaller column beside it"),
  CE: mfg("chemicals", "a chemical reactor vessel on four legs with nozzles and an agitator drive"),
  CF: mfg("pharma", "a tray of crimp-capped medicine vials"),
  CG: mfg("rubber", "an upright tyre beside a stack of bricks"),
  CH: mfg("metals", "rolled steel I-beams stacked on timber bearers"),
  CI: mfg("electronics", "a circuit board with chips, capacitors and a finned heatsink"),
  CJ: mfg("electrical", "a finned electric motor with its terminal box and shaft"),
  CK: mfg("machinery", "a centre lathe with headstock, chuck, carriage and tailstock"),
  CL: mfg("transport", "a jet engine on its transport stand"),
  CM: mfg("furniture", "a Windsor chair"),
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
  // Economy & Public Finance (data/icon-refs/economy/fetch_refs.py)
  economyInflation: {
    src: "/brand/plates/i-ref-economy-inflation.png",
    alt: "Forecourt fuel price sign, Belfast — inflation and prices",
  },
  economyWages: {
    src: "/brand/plates/i-ref-economy-wages.png",
    alt: "Clocking-on machine, Burton-upon-Trent — wages and earnings",
  },
  economyEmployment: {
    src: "/brand/plates/i-ref-economy-employment.png",
    alt: "Jobcentre Plus, Chester — employment and the labour market",
  },
  economyHousehold: {
    src: "/brand/plates/i-ref-economy-household.png",
    alt: "High-street cash machine — household finances",
  },
  economyGrowth: {
    src: "/brand/plates/i-ref-economy-growth.png",
    alt: "Canary Wharf skyline — growth and productivity",
  },
  economyTax: {
    src: "/brand/plates/i-ref-economy-tax.png",
    alt: "HMRC regional centre, Newcastle — taxation and revenue",
  },
  economySpending: {
    src: "/brand/plates/i-ref-economy-spending.png",
    alt: "NHS hospital entrance, Dumfries — public spending",
  },
  economyDebt: {
    src: "/brand/plates/i-ref-economy-debt.png",
    alt: "Bank of England, Threadneedle Street — public debt",
  },
  economyInvestment: {
    src: "/brand/plates/i-ref-economy-investment.png",
    alt: "Container cranes, Port of Felixstowe — investment and trade",
  },
  economyPolicy: {
    src: "/brand/plates/i-ref-economy-policy.png",
    alt: "HM Treasury, Horse Guards Road — economic policy",
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

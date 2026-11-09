/**
 * Inside the home — the selectable features of the cutaway and the evidence behind each.
 * The drawing is illustrative; every number comes from a published survey table (EHS) or is
 * marked "not in the Exchange yet". Nothing here estimates the condition of a real property.
 */

export type LayerId = "energy" | "damp" | "safety" | "space" | "condition";
export type Basis = "survey-estimate" | "survey-response" | "administrative-record" | "modelled-derived" | "observed-measure" | "illustrative";

export const LAYERS: { id: LayerId; label: string; pattern: string; tone: string }[] = [
  { id: "energy", label: "Energy", pattern: "stipple", tone: "var(--bo-mustard)" },
  { id: "damp", label: "Damp and mould", pattern: "waves", tone: "var(--bo-lavender)" },
  { id: "safety", label: "Safety", pattern: "cross-hatch", tone: "var(--bo-ink)" },
  { id: "space", label: "Space", pattern: "grid", tone: "var(--bo-green)" },
  { id: "condition", label: "Physical condition", pattern: "hatch", tone: "var(--bo-union)" },
];

export const BASIS: Record<Basis, { label: string; glyph: string; note: string }> = {
  "survey-estimate": {
    label: "Survey estimate",
    glyph: "◇",
    note: "Weighted estimate from a sample of surveyed dwellings. Sampling error applies. A published sample count is not a confidence interval, and these tables do not include one.",
  },
  "survey-response": {
    label: "Survey response",
    glyph: "△",
    note: "Households' own answers to a survey question — what residents report, not what a surveyor inspected.",
  },
  "administrative-record": {
    label: "Administrative record",
    glyph: "▣",
    note: "Counted from records kept for another purpose (e.g. EPC lodgements); covers only what was recorded.",
  },
  "modelled-derived": {
    label: "Modelled or derived",
    glyph: "◌",
    note: "Calculated from other measures (e.g. a modelled rating or a cost to improve); depends on the model's assumptions.",
  },
  "observed-measure": { label: "Observed measure", glyph: "●", note: "Directly measured or counted for the whole population." },
  illustrative: {
    label: "Illustrative diagram",
    glyph: "⌗",
    note: "A drawing to guide exploration — not a surveyed property, not to scale for any home.",
  },
};

export type Feature = {
  id: string;
  layer: LayerId;
  label: string;
  /** Short mono tag for the annotation. */
  tag: string;
  /** What the figure means. */
  definition: string;
  /** Phrase after the figure: "of dwellings …". */
  unit: string;
  basis: Basis;
  /** Exchange indicator id and headline series. */
  ind: string;
  series: string;
  /** Published table id(s). */
  table: string;
  direction: "higher-better" | "higher-worse";
  /** Period note, e.g. a pooled average. */
  periodNote?: string;
  /**
   * Same-indicator split, never summed into the headline.
   * `exclusive` means each dwelling is in one category (EPC bands). Otherwise categories can overlap.
   */
  types?: { title: string; items: { series: string; label: string }[]; exclusive?: boolean };
  /** A related but different measure, shown beside the headline with its own base. */
  companion?: { ind: string; series: string; label: string; unit: string; note: string };
};

export const FEATURES: Feature[] = [
  {
    id: "rating",
    layer: "energy",
    label: "Energy efficiency rating",
    tag: "EER A–C",
    definition:
      "Share of dwellings in energy-efficiency bands A to C, modelled by the English Housing Survey from surveyed characteristics. Not the EPC certificate register.",
    unit: "of dwellings in bands A–C",
    basis: "survey-estimate",
    ind: "ehs-energy-efficiency-bands",
    series: "band-a-b-c",
    table: "DA7101 · DA7102",
    direction: "higher-better",
    types: {
      title: "Band mix",
      exclusive: true,
      items: [
        { series: "band-a-b", label: "A–B" },
        { series: "band-c", label: "C" },
        { series: "band-d", label: "D" },
        { series: "band-e", label: "E" },
        { series: "band-f", label: "F" },
        { series: "band-g", label: "G" },
      ],
    },
  },
  {
    id: "loft",
    layer: "energy",
    label: "Loft insulation",
    tag: "Loft ≥ 200mm",
    definition: "Share of dwellings with a loft that have at least 200mm of loft insulation.",
    unit: "of dwellings with lofts, 200mm or more",
    basis: "survey-estimate",
    ind: "ehs-insulation",
    series: "loft-200mm-plus",
    table: "DA6201",
    direction: "higher-better",
  },
  {
    id: "walls",
    layer: "energy",
    label: "Wall insulation",
    tag: "Insulated walls",
    definition: "Share of dwellings with insulated cavity or solid walls, including walls insulated when built (headline annex series).",
    unit: "of dwellings with insulated walls",
    basis: "survey-estimate",
    ind: "ehs-insulation",
    series: "wall-insulation-annex",
    table: "AT2.9",
    direction: "higher-better",
  },
  {
    id: "glazing",
    layer: "energy",
    label: "Double glazing",
    tag: "Full double glazing",
    definition: "Share of dwellings where every window is double glazed or better.",
    unit: "of dwellings fully double glazed",
    basis: "survey-estimate",
    ind: "ehs-insulation",
    series: "full-double-glazing",
    table: "DA6201 · AT2.9",
    direction: "higher-better",
  },
  {
    id: "boiler",
    layer: "energy",
    label: "Condensing boiler",
    tag: "Condensing boiler",
    definition: "Share of dwellings heated by a condensing or condensing-combination boiler.",
    unit: "of dwellings",
    basis: "survey-estimate",
    ind: "ehs-heating",
    series: "condensing-boiler",
    table: "DA6101",
    direction: "higher-better",
  },
  {
    id: "damp",
    layer: "damp",
    label: "Damp",
    tag: "Surveyor damp",
    definition: "Share of dwellings where the surveyor recorded damp serious enough to assess under HHSRS. Minor damp is excluded.",
    unit: "of dwellings",
    basis: "survey-estimate",
    ind: "ehs-damp-surveyor",
    series: "any-damp",
    table: "DA5101 · DA5102",
    direction: "higher-worse",
    types: {
      title: "By damp type",
      items: [
        { series: "rising-damp", label: "Rising damp" },
        { series: "penetrating-damp", label: "Penetrating damp" },
        { series: "condensation-mould", label: "Condensation and mould" },
      ],
    },
    companion: {
      ind: "ehs-damp-mould-reported",
      series: "resident-reports-damp-mould",
      label: "Residents reporting damp or mould",
      unit: "of occupied households",
      note: "Households' own reports (2023–25), a different measure from surveyor-recorded damp.",
    },
  },
  {
    id: "hazards",
    layer: "safety",
    label: "Serious hazards",
    tag: "Category 1 hazard",
    definition: "Share of dwellings with at least one Category 1 hazard under the Housing Health and Safety Rating System.",
    unit: "of dwellings",
    basis: "survey-estimate",
    ind: "ehs-category-1-hazards",
    series: "any-category-1-hazard",
    table: "DA4101 · DA4102",
    direction: "higher-worse",
    types: {
      title: "By hazard",
      items: [
        { series: "excess-cold", label: "Excess cold" },
        { series: "any-falls", label: "Falls" },
        { series: "any-other-hazards", label: "Other hazards" },
      ],
    },
  },
  {
    id: "rooms",
    layer: "space",
    label: "Overcrowding",
    tag: "Bedroom standard",
    definition: "Share of households with fewer bedrooms than the bedroom standard requires.",
    unit: "of households overcrowded",
    basis: "survey-estimate",
    ind: "ehs-overcrowding",
    series: "overcrowded",
    table: "AT1.2",
    direction: "higher-worse",
    periodNote: "Three-year average of survey years",
    companion: {
      ind: "ehs-under-occupation",
      series: "under-occupied",
      label: "Under-occupied",
      unit: "of households",
      note: "Two or more bedrooms above the standard. Single survey year — not a like-for-like pair with overcrowding.",
    },
  },
  {
    id: "fabric",
    layer: "condition",
    label: "Non-decent homes",
    tag: "Non-decent",
    definition: "Share of dwellings that fail the Decent Homes Standard. The figure is the non-decent share, not the share that meets the standard.",
    unit: "of dwellings non-decent",
    basis: "survey-estimate",
    ind: "ehs-decent-homes",
    series: "non-decent",
    table: "DA3201 · DA3202 · DT3101",
    direction: "higher-worse",
    types: {
      title: "Criteria failed",
      items: [
        { series: "fails-minimum-standard", label: "Category 1 hazard" },
        { series: "fails-repair", label: "Disrepair" },
        { series: "fails-modern-facilities", label: "Modern facilities" },
        { series: "fails-thermal-comfort", label: "Thermal comfort" },
      ],
    },
  },
];

/** Tenures in display order; LA / HA appear only where a series publishes them. */
export const TENURES: { id: string; label: string; core: boolean }[] = [
  { id: "all-tenures", label: "All tenures", core: true },
  { id: "owner-occupied", label: "Owner-occupied", core: true },
  { id: "private-rented", label: "Private rented", core: true },
  { id: "social-rented", label: "Social rented", core: true },
  { id: "local-authority", label: "Local authority", core: false },
  { id: "housing-association", label: "Housing association", core: false },
];

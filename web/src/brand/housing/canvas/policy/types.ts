/**
 * Domain 10 record shapes. These mirror the registry files in data/housing/policy-events
 * (validated in Python by britain_exchange.policy_event and britain_exchange.policy_record).
 * Events, pledges and archive items are records, not statistical observations.
 */

export type SourceRole = "primary" | "explanatory_notes" | "official" | "manifesto";
export type PolicySource = { label: string; url: string; role: SourceRole | string };

export type EventType = "act" | "statutory_instrument" | "programme" | "institution";
export type Nation = "england" | "wales" | "scotland" | "northern-ireland";

export type Commencement = { date: string | null; instrument: string; citation: string; url: string; scope: string };
export type LinkedIndicator = { id: string; title: string; domain: string; view: string; relationship: "context"; note: string };

export type PolicyEvent = {
  id: string;
  title: string;
  citation: string;
  aliases: string[];
  type: EventType;
  topics?: string[];
  nations?: Nation[];
  summary: string;
  institution: string;
  jurisdiction: string;
  extent: string;
  announcement_date: string | null;
  /** Royal Assent (act) or made date (statutory instrument). Null for programmes and institutions. */
  enactment_date: string | null;
  start_date?: string | null;
  end_date?: string | null;
  date_note?: string;
  commencements: Commencement[];
  status: string;
  status_note: string;
  sources: PolicySource[];
  linked_indicators: LinkedIndicator[];
};

export type Era = { id: string; label: string; from: number | null; to: number | null; focus: string };

export type Relationship = {
  from: string;
  to: string;
  kind: "created" | "amended" | "repealed" | "replaced" | "administered" | "funded" | "implemented" | "succeeded" | string;
  date: string | null;
  note: string;
  source: PolicySource;
};

export type EventRegistry = {
  registry_id: string;
  title: string;
  sector: string;
  retrieved_at: string;
  note: string;
  eras?: Era[];
  events: PolicyEvent[];
  relationships?: Relationship[];
};

/* ——— Tracks (Time Machine) ——— */

export type TrackLineConfig = { id: string; label: string; match: Record<string, string> };
export type TrackConfig = {
  id: string;
  title: string;
  indicator_id: string;
  domain: string;
  view: string;
  unit: string;
  format: "count" | "gbp" | "pct" | "ratio";
  cadence: "monthly" | "quarterly" | "annual";
  lines: TrackLineConfig[];
  note: string;
};
export type TrackRegistry = { registry_id: string; title: string; note: string; tracks: TrackConfig[] };

export type SeriesSource = { id: string; title: string; publisher: string; sourceUrl: string; release: string; unit: string };
export type TrackPoint = { t: number; v: number; period: string };
export type TrackPayload = Omit<TrackConfig, "lines"> & {
  available: boolean;
  lines: { id: string; label: string; points: TrackPoint[] }[];
  source: SeriesSource | null;
};

/* ——— Pledges (Promise vs Delivery) ——— */

export type Pledge = {
  id: string;
  title: string;
  made_by: string;
  made_date: string;
  nations: Nation[];
  statement: string;
  sources: PolicySource[];
  target: {
    value: number;
    unit: string;
    geography_code: string | null;
    period_start: string | null;
    period_end: string | null;
    period_note: string;
  };
  measure_definition: string;
  match: {
    indicator_id: string;
    series: string;
    geography_code: string;
    unit: string;
    aggregation: "sum" | "latest" | "per-period";
    dimensions?: Record<string, string>;
  } | null;
  scorable: boolean;
  not_scored_reason: string | null;
  funding: { amount_gbp: number; period_note: string; source: PolicySource }[];
  linked_event_ids: string[];
  /** Series to read alongside the pledge. Context only — never a score. */
  context_indicator_ids?: string[];
  made_date_note?: string;
  /** "month" when the source gives only a month: show month and year, not a day. */
  made_date_precision?: "day" | "month";
  status_note: string;
};
export type PledgeRegistry = { registry_id: string; retrieved_at: string; note: string; pledges: Pledge[] };

/* ——— Archive ——— */

export type RightsStatus = "public-domain" | "ogl" | "cc-by" | "non-commercial" | "all-rights-reserved" | "unknown";
export type ArchiveItem = {
  id: string;
  title: string;
  holder: string;
  reference: string;
  date_label: string;
  date_start: string | null;
  date_end: string | null;
  kind: string;
  description: string;
  url: string;
  linked_event_ids: string[];
  topics: string[];
  rights: { status: RightsStatus; licence_url: string | null; can_reproduce: boolean; note: string };
  image_url: string | null;
};
export type ArchiveRegistry = { registry_id: string; retrieved_at: string; note: string; items: ArchiveItem[] };

/* ——— Plates (imagery screened from openly licensed photographs) ——— */

export type PlateRecord = {
  id: string;
  /** Mask file under web/public, printed by <Plate>. */
  file: string;
  title: string;
  depicts: string;
  /** When the photograph (or engraving) was made, as the source records it. */
  made_label: string;
  /** Set only when the picture itself dates from the era (a 2016 photo of a 1920s estate has none). */
  era_id: string | null;
  nations: Nation[];
  linked_event_ids: string[];
  author: string;
  licence: string;
  licence_url: string | null;
  source: PolicySource;
  derivative_note: string;
};
export type PlateRegistry = { registry_id: string; retrieved_at: string; note: string; plates: PlateRecord[] };

export type PolicyPayload = {
  /** Event register from pack `housing.policy-events` (Storage / API — never a webpack data/ import). */
  events: PolicyEvent[];
  eras: Era[];
  relationships: Relationship[];
  retrieved_at: string;
  note: string;
  plates: PlateRegistry | null;
  trackNote: string | null;
  tracks: TrackPayload[];
  pledges: PledgeRegistry | null;
  archive: ArchiveRegistry | null;
  delivery: Record<string, { points: TrackPoint[]; source: SeriesSource }>;
};

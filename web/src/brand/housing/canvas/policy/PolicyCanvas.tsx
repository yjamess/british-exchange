"use client";

/**
 * Domain 10 — How Britain came to live this way.
 * Timeline · Promise vs delivery · Archive · Data.
 *
 * Shell: the explorer draws the figures (policyFigures), the control row (PolicyControls) and the
 * one Notes foot (policyFootRows); this module draws the stage body only. Every control lives in
 * the URL (parsePolicyState), so a shared link opens the same picture.
 *
 * Timeline: the era scopes the rail and the ledger, so the reader reads one era at a time. Context
 * series are off by default — the reader opts in via Context series; charts keep full history and
 * mark only the era bounds and the selected record. Records come from pack housing.policy-events
 * (Supabase Storage via /api/housing/policy); every plotted value comes from the Exchange API.
 * A mark sits on Royal Assent (or the made / start date for other record types). An overlapping
 * series is context, never an effect.
 */

import { useMemo, type ReactNode } from "react";
import {
  ControlRow,
  DecisionLedger,
  EventRail,
  MenuControl,
  MultiMenuControl,
  Plate,
  PromiseVerdict,
  ResetButton,
  SearchControl,
  TimeChart,
  explorerClasses as tc,
  fmt,
  type ChartRule,
  type ExplorerFigure,
  type LedgerEvent,
  type RailMark,
  type SourceRow,
} from "../../..";
import { toT } from "../../../data";
import ledger from "../../../policy/policy.module.css";
import q from "../plate.module.css";
import {
  MARK_DATE_LABEL,
  NATION_LABEL,
  TYPE_LABEL,
  TYPE_PLURAL,
  coverage,
  eraOf,
  eventById,
  eventsInEra,
  formatIso,
  formatIsoMonth,
  markDate,
  markT,
  markYear,
  orderedEvents,
  relationshipsOf,
  statusLabel,
  topicLabel,
} from "./events";
import type { ArchiveItem, Era, EventType, Nation, PlateRecord, Pledge, PolicyEvent, PolicyPayload, TrackPayload } from "./types";
import { usePolicyData } from "./usePolicyData";
import s from "./policy.module.css";

/** Event register from the policy API payload (Storage pack). Empty until loaded. */
function reg(data: PolicyPayload | null) {
  const events = orderedEvents(data?.events ?? []);
  return {
    events,
    eras: data?.eras ?? [],
    relationships: data?.relationships ?? [],
    retrieved: data?.retrieved_at ?? "",
  };
}

export type PolicyView = "time" | "promise" | "archive" | "table";
export const POLICY_VIEWS: { id: PolicyView; label: string }[] = [
  { id: "time", label: "Timeline" },
  { id: "promise", label: "Promise vs delivery" },
  { id: "archive", label: "Archive" },
  { id: "table", label: "Data" },
];

/* ——— URL state ——— */

export type PolicyState = {
  event: string | null;
  /** Era id, "all", or null = the latest era with records. */
  era: string | null;
  topic: string;
  rtype: "all" | EventType;
  nation: "all" | Nation;
  q: string;
  /** Context series ids; null = the first two available. */
  tracks: string[] | null;
  pledge: string | null;
  holder: string;
  akind: string;
  set: "records" | "pledges" | "archive";
};

/** URL keys owned by the policy domain (cleared by Reset and when leaving a view). */
export const POLICY_KEYS = ["event", "era", "topic", "rtype", "nation", "q", "tracks", "pledge", "holder", "akind", "set"] as const;

const ALL_TYPES = Object.keys(TYPE_LABEL) as EventType[];
const ALL_NATIONS = Object.keys(NATION_LABEL) as Nation[];

export function parsePolicyState(p: URLSearchParams): PolicyState {
  const rtype = p.get("rtype");
  const nation = p.get("nation");
  const set = p.get("set");
  const tracks = p.get("tracks");
  return {
    event: p.get("event"),
    era: p.get("era"),
    topic: p.get("topic") || "all",
    rtype: ALL_TYPES.includes(rtype as EventType) ? (rtype as EventType) : "all",
    nation: ALL_NATIONS.includes(nation as Nation) ? (nation as Nation) : "all",
    q: p.get("q") ?? "",
    tracks: tracks != null ? tracks.split(",").filter(Boolean) : null,
    pledge: p.get("pledge"),
    holder: p.get("holder") ?? "all",
    akind: p.get("akind") ?? "all",
    set: set === "pledges" || set === "archive" ? set : "records",
  };
}

type Patch = Record<string, string | null>;

/* ——— Derived selections (shared by figures, controls, foot and body) ——— */

function filtered(st: PolicyState, events: PolicyEvent[]): PolicyEvent[] {
  const needle = st.q.trim().toLowerCase();
  return orderedEvents(events)
    .filter((e) => markT(e) != null)
    .filter((e) => st.rtype === "all" || e.type === st.rtype)
    .filter((e) => st.nation === "all" || (e.nations ?? []).includes(st.nation))
    .filter((e) => st.topic === "all" || (e.topics ?? []).includes(st.topic))
    .filter((e) => !needle || [e.title, e.citation, e.summary, e.institution, ...e.aliases].join(" ").toLowerCase().includes(needle));
}

/** The era in force: explicit id, "all" (null era), or the latest era that has records. */
function activeEra(st: PolicyState, shown: PolicyEvent[], eras: Era[]): Era | null {
  if (st.era === "all") return null;
  const byId = eras.find((x) => x.id === st.era);
  if (byId) return byId;
  return [...eras].reverse().find((era) => eventsInEra(era, shown).length > 0) ?? null;
}

function availableTracks(data: PolicyPayload | null): TrackPayload[] {
  return (data?.tracks ?? []).filter((t) => t.available && t.lines.some((l) => l.points.length > 1));
}

/** Context charts only when the reader picks them — never auto-load the first two tracks. */
function activeTracks(st: PolicyState, data: PolicyPayload | null): TrackPayload[] {
  const avail = availableTracks(data);
  if (st.tracks == null || st.tracks.length === 0) return [];
  return avail.filter((t) => st.tracks!.includes(t.id));
}

function pledgesOf(data: PolicyPayload | null): Pledge[] {
  return [...(data?.pledges?.pledges ?? [])].sort((a, b) => a.made_date.localeCompare(b.made_date));
}

/** Open pledge from the URL — Promise Ledger starts closed until the reader opens a slab. */
function activePledge(st: PolicyState, data: PolicyPayload | null): Pledge | null {
  return pledgesOf(data).find((p) => p.id === st.pledge) ?? null;
}

function pledgeIsScored(p: Pledge, data: PolicyPayload | null): boolean {
  if (!p.scorable || !p.match) return false;
  const series = data?.delivery[p.id];
  if (!series) return false;
  return deliveredOf(p, series.points).inside.length > 0;
}

function archiveOf(data: PolicyPayload | null, st: PolicyState): ArchiveItem[] {
  return [...(data?.archive?.items ?? [])]
    .filter((i) => Boolean(i.date_start)) // no undated (n.d.) pieces in the reading list
    .sort((a, b) => (a.date_start ?? "").localeCompare(b.date_start ?? ""))
    .filter((i) => (st.holder === "all" || i.holder === st.holder) && (st.akind === "all" || i.kind === st.akind));
}

function deliveredOf(p: Pledge, pts: { t: number; v: number; period: string }[]) {
  const t0 = p.target.period_start ? toT(p.target.period_start) : -Infinity;
  const t1 = p.target.period_end ? toT(p.target.period_end) : Infinity;
  const inside = pts.filter((x) => x.t >= t0 && x.t <= t1);
  if (!p.match || inside.length === 0) return { inside, value: null as number | null, met: null as number | null };
  if (p.match.aggregation === "sum") return { inside, value: inside.reduce((a, x) => a + x.v, 0), met: null };
  if (p.match.aggregation === "latest") return { inside, value: inside.at(-1)!.v, met: null };
  return { inside, value: null, met: inside.filter((x) => x.v >= p.target.value).length };
}

const madeDate = (p: Pledge) => (p.made_date_precision === "month" ? formatIsoMonth(p.made_date) : formatIso(p.made_date));
const unitLabel = (u: string) => u.replace(/-/g, " ");
/** Counts round to whole numbers; a small target (a ratio such as 1 per sale) keeps two decimals. */
const pledgeFormat = (p: Pledge) => (p.target.value < 10 ? (v: number) => v.toFixed(2) : fmt.count);
const nationsLabel = (ns: (Nation | string)[]) =>
  ns
    .filter(Boolean)
    .map((n) => NATION_LABEL[n as Nation] ?? n)
    .join(", ");
const eraSpan = (era: Era | null) =>
  era ? (era.from == null ? `before ${(era.to ?? 1900) + 1}` : era.to == null ? `${era.from}–present` : `${era.from}–${era.to}`) : "all eras";

/* ——— Figures (explorer FigureStrip) ——— */

export function policyFigures(view: PolicyView, st: PolicyState, data: PolicyPayload | null): ExplorerFigure[] {
  if (view === "promise") {
    const all = pledgesOf(data);
    const scoredN = all.filter((p) => pledgeIsScored(p, data)).length;
    const p = activePledge(st, data);
    return [
      { label: "Listed", value: String(all.length), note: "Pledges in the register" },
      { label: "Scored", value: String(scoredN), note: scoredN ? "Same place, period and unit" : "None yet meet the match rule" },
      {
        label: "Open verdict",
        value: p ? p.made_date.slice(0, 4) : "—",
        note: p ? (pledgeIsScored(p, data) ? "Scored" : "Listed · not scored") : "Select a pledge",
      },
    ];
  }
  if (view === "archive") {
    const items = archiveOf(data, st);
    const years = items.map((i) => Number(i.date_start?.slice(0, 4))).filter((y) => Number.isFinite(y) && y > 0);
    const open = items.find((i) => i.id === st.event);
    return [
      {
        label: "Records",
        value: String(items.length),
        note: st.holder === "all" ? "In this reading list" : st.holder,
      },
      {
        label: "Archives",
        value: String(new Set(items.map((i) => i.holder)).size),
        note: "Where the originals are kept",
      },
      {
        label: "Open piece",
        value: open?.date_start ? open.date_start.slice(0, 4) : years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—",
        note: open ? archiveKindLabel(open.kind) : "Select a record",
      },
    ];
  }
  const { events, eras, retrieved } = reg(data);
  if (view === "table") {
    const c = coverage(events);
    return [
      { label: "Records", value: String(c.total), note: `${c.from ?? "—"}–${c.to ?? "—"}` },
      { label: "Pledges", value: String(pledgesOf(data).length), note: `${pledgesOf(data).filter((p) => p.scorable).length} scored` },
      { label: "Archive items", value: String(data?.archive?.items.length ?? 0), note: "Catalogue records" },
    ];
  }
  const shown = filtered(st, events);
  const era = activeEra(st, shown, eras);
  const inEra = era ? eventsInEra(era, shown) : shown;
  const first = inEra[0];
  const last = inEra.at(-1);
  return [
    {
      label: "Records",
      value: String(inEra.length),
      note: era
        ? `${era.label} · of ${events.length} checked`
        : `All eras · of ${events.length} checked${retrieved ? ` · ${formatIso(retrieved)}` : ""}`,
    },
    { label: "Earliest", value: first ? String(markYear(first)) : "—", note: first?.title ?? "" },
    { label: "Latest", value: last ? String(markYear(last)) : "—", note: last?.title ?? "" },
  ];
}

/* ——— Notes foot rows (explorer SourceLine) ——— */

export function policyFootRows(view: PolicyView, st: PolicyState, data: PolicyPayload | null): SourceRow[] {
  const rows: SourceRow[] = [];
  const { events, eras, retrieved } = reg(data);
  const event = eventById(events, st.event);
  if (view === "time") {
    const era = activeEra(st, filtered(st, events), eras);
    if (era) rows.push({ label: "Era", text: `${era.label}. ${era.focus}` });
    for (const t of activeTracks(st, data)) {
      rows.push({
        label: "Context series",
        text: t.source ? `${t.source.publisher} · ${t.source.title}${t.source.release ? ` · ${t.source.release}` : ""}` : t.title,
        href: `/housing?domain=${t.domain}&view=${t.view}`,
        linkLabel: t.note,
      });
    }
  }
  if (view === "promise") {
    const p = activePledge(st, data);
    const series = p ? data?.delivery[p.id] : undefined;
    if (p && series) {
      rows.push({
        label: "Delivery series",
        text: `${series.source.publisher} · ${series.source.title}${series.source.release ? ` · ${series.source.release}` : ""}`,
        linkLabel: p.target.period_note,
      });
    }
    if (p) rows.push({ label: "Pledge", text: p.title, linkLabel: p.status_note });
  }
  if (view === "archive") {
    const piece = archiveOf(data, st).find((i) => i.id === st.event);
    if (piece) {
      rows.push({
        label: "Reference",
        text: piece.reference,
        href: piece.url,
        linkLabel: `Open at ${piece.holder}`,
      });
      rows.push({
        label: "Licence",
        text: RIGHTS[piece.rights.status],
        href: piece.rights.licence_url ?? undefined,
        linkLabel: piece.rights.licence_url ? "Licence terms" : undefined,
      });
    }
  }
  rows.push(
    event && view === "time"
      ? { label: "Primary record", text: event.title, linkLabel: event.citation }
      : {
          label: "Register",
          text: "Housing policy register",
          linkLabel: events.length
            ? `${events.length} records checked against their primary sources${retrieved ? `, ${formatIso(retrieved)}` : ""}. An initial collection, not the whole statute book.`
            : "Loading from Storage pack housing.policy-events…",
        },
  );
  return rows;
}

/* ——— Control row (explorer, above the stage) ——— */

export function PolicyControls({ view, state: st, onChange }: { view: PolicyView; state: PolicyState; onChange: (patch: Patch) => void }) {
  const { data } = usePolicyData();
  const clear = Object.fromEntries(POLICY_KEYS.map((k) => [k, null])) as Patch;

  if (view === "promise") {
    // Selection lives on the Promise Ledger slabs — no pledge dropdown.
    if (!st.pledge) return null;
    return (
      <ControlRow>
        <ResetButton onClick={() => onChange(clear)} />
      </ControlRow>
    );
  }

  if (view === "archive") {
    const items = data?.archive?.items ?? [];
    if (items.length === 0) return null;
    const holders = [...new Set(items.map((i) => i.holder))].sort();
    const kinds = [...new Set(items.map((i) => i.kind))].sort();
    return (
      <ControlRow>
        <MenuControl
          label="Kept by"
          value={st.holder}
          options={[{ value: "all", label: "All archives" }, ...holders.map((h) => ({ value: h, label: h }))]}
          onChange={(v) => onChange({ holder: v === "all" ? null : v, event: null })}
        />
        <MenuControl
          label="Type"
          value={st.akind}
          options={[{ value: "all", label: "All types" }, ...kinds.map((k) => ({ value: k, label: archiveKindLabel(k) }))]}
          onChange={(v) => onChange({ akind: v === "all" ? null : v, event: null })}
        />
        {(st.holder !== "all" || st.akind !== "all" || st.event) && <ResetButton onClick={() => onChange(clear)} />}
      </ControlRow>
    );
  }

  if (view === "table") {
    return (
      <ControlRow>
        <MenuControl
          label="Table"
          value={st.set}
          options={[
            { value: "records", label: "Policy records" },
            { value: "pledges", label: "Pledges" },
            { value: "archive", label: "Archive records" },
          ]}
          onChange={(v) => onChange({ set: v === "records" ? null : v })}
        />
      </ControlRow>
    );
  }

  const { events, eras } = reg(data);
  const types = ALL_TYPES.filter((t) => events.some((e) => e.type === t));
  const nations = ALL_NATIONS.filter((n) => events.some((e) => e.nations?.includes(n)));
  const topics = [...new Set(events.flatMap((e) => e.topics ?? []))].sort();
  const shown = filtered(st, events);
  const era = activeEra(st, shown, eras);
  const avail = availableTracks(data);
  const tracks = activeTracks(st, data).map((t) => t.id);
  const dirty = st.era != null || st.topic !== "all" || st.rtype !== "all" || st.nation !== "all" || st.q !== "" || st.tracks != null || st.event != null;
  return (
    <ControlRow>
      <MenuControl
        label="Era"
        value={era?.id ?? "all"}
        options={[
          ...eras.map((x) => ({ value: x.id, label: `${x.label} · ${eventsInEra(x, shown).length}` })),
          { value: "all", label: `All eras · ${shown.length}` },
        ]}
        onChange={(v) => onChange({ era: v, event: null })}
      />
      {types.length > 1 && (
        <MenuControl
          label="Record"
          value={st.rtype}
          options={[{ value: "all" as const, label: "All records" }, ...types.map((t) => ({ value: t, label: TYPE_PLURAL[t] }))]}
          onChange={(v) => onChange({ rtype: v === "all" ? null : v, event: null })}
        />
      )}
      {topics.length > 0 && (
        <MenuControl
          label="Topic"
          value={st.topic}
          options={[{ value: "all", label: "All topics" }, ...topics.map((t) => ({ value: t, label: topicLabel(t) }))]}
          onChange={(v) => onChange({ topic: v === "all" ? null : v, event: null })}
        />
      )}
      {nations.length > 0 && (
        <MenuControl
          label="Applies to"
          value={st.nation}
          options={[{ value: "all" as const, label: "All nations" }, ...nations.map((n) => ({ value: n, label: NATION_LABEL[n] }))]}
          onChange={(v) => onChange({ nation: v === "all" ? null : v, event: null })}
        />
      )}
      {avail.length > 0 && (
        <MultiMenuControl
          label="Context series"
          values={tracks}
          options={avail.map((t) => ({ value: t.id, label: t.title }))}
          onChange={(next) => onChange({ tracks: next.join(",") || "none" })}
          summary={(labels) => (labels.length === 0 ? "None" : labels.length === 1 ? labels[0]! : `${labels.length} series`)}
        />
      )}
      <SearchControl label="Find a record" value={st.q} onChange={(v) => onChange({ q: v || null, era: v ? "all" : null, event: null })} placeholder="Title, citation or text" />
      {dirty && <ResetButton onClick={() => onChange(clear)} />}
    </ControlRow>
  );
}

/* ——— Stage body ——— */

type Props = {
  view: PolicyView;
  state: PolicyState;
  onChange: (patch: Patch) => void;
};

export function PolicyCanvas({ view, state, onChange }: Props) {
  if (view === "promise") return <PromiseView state={state} onChange={onChange} />;
  if (view === "archive") return <Archive state={state} onChange={onChange} />;
  if (view === "table") return <PolicyData state={state} />;
  return <Timeline state={state} onChange={onChange} />;
}

function commencementOf(e: PolicyEvent): string {
  if (e.type === "act" || e.type === "statutory_instrument") {
    if (e.commencements.length > 0) {
      return e.commencements.map((c) => `${c.date ? formatIso(c.date) : "Date not recorded"} · ${c.citation}`).join("; ");
    }
    return "Not recorded in this register.";
  }
  return e.end_date ? `Ended ${formatIso(e.end_date)}` : "No separate commencement date for this record type.";
}

/** Map a housing registry event into the brand Decision Ledger view-model. */
function toLedgerEvent(e: PolicyEvent): LedgerEvent {
  return {
    id: e.id,
    year: String(markYear(e) ?? "—"),
    title: e.title,
    typeLabel: TYPE_LABEL[e.type],
    summary: e.summary,
    extent: e.extent,
    citation: e.citation,
    markLabel: MARK_DATE_LABEL[e.type],
    markValue: formatIso(markDate(e)),
    status: statusLabel(e.status),
    applies: e.nations?.length ? nationsLabel(e.nations) : e.jurisdiction,
    commencement: commencementOf(e),
    sources: e.sources.filter((x) => x.role !== "explanatory_notes").map((src) => ({ label: src.label, href: src.url })),
    context: e.linked_indicators.map((link) => ({
      id: link.id,
      title: link.title,
      href: `/housing?domain=${link.domain}&view=${link.view}&event=${e.id}`,
      note: link.note,
    })),
  };
}

const FORMAT: Record<TrackPayload["format"], (v: number) => string> = {
  count: fmt.count,
  gbp: (v) => `£${fmt.count(v)}`,
  pct: (v) => `${v.toFixed(1)}%`,
  ratio: (v) => v.toFixed(1),
};

function Timeline({ state: st, onChange }: { state: PolicyState; onChange: (patch: Patch) => void }) {
  const { data } = usePolicyData();
  const { events, eras } = reg(data);
  const shown = useMemo(() => filtered(st, events), [st, events]);
  const era = activeEra(st, shown, eras);
  const inEra = era ? eventsInEra(era, shown) : shown;
  const selected = inEra.find((e) => e.id === st.event) ?? null;
  const tracks = activeTracks(st, data);

  const years = inEra.map((e) => markT(e)!);
  const now = new Date().getUTCFullYear() + 1;
  const lo = era?.from ?? (years.length ? Math.floor(Math.min(...years)) - 2 : 1900);
  const hi = era?.to != null ? era.to + 1 : now;
  const time: [number, number] = [lo, hi];

  const marks: RailMark[] = inEra.map((e) => ({ id: e.id, t: markT(e)!, label: String(markYear(e)), title: e.title, kind: e.type }));
  /** Context charts keep their full history; they mark the era bounds and the selected record only. */
  const rules: ChartRule[] = [
    ...(era?.from != null ? [{ id: "era-from", t: era.from, label: String(era.from) }] : []),
    ...(era?.to != null ? [{ id: "era-to", t: era.to + 1, label: String(era.to) }] : []),
    ...(selected ? [{ id: selected.id, t: markT(selected)!, label: `${MARK_DATE_LABEL[selected.type]} ${markYear(selected)}`, active: true }] : []),
  ];
  const select = (id: string | null) => onChange({ event: id });

  return (
    <div className={s.machine}>
      {inEra.length > 0 && (
        <section className={q.section} aria-label="Policy records by date">
          <h3 className={tc.stageTitle}>
            Policy records · {era ? (era.label === eraSpan(era) ? era.label : `${era.label} · ${eraSpan(era)}`) : "all eras"}
          </h3>
          <EventRail marks={marks} time={time} selected={selected?.id ?? null} onSelect={select} label="Policy records by date" />
        </section>
      )}

      <DecisionLedger
        events={inEra.map(toLedgerEvent)}
        openId={selected?.id ?? null}
        onSelect={select}
        empty="No checked record matches these filters."
        idPrefix="housing-policy"
        renderOpen={(ev) => (
          <Connections
            id={ev.id}
            onOpen={(id) => {
              const next = eventById(events, id);
              onChange({ event: id, era: next ? (eraOf(next, eras)?.id ?? "all") : "all" });
            }}
          />
        )}
      />

      {tracks.map((t) => (
        <section key={t.id} className={q.section} aria-label={t.title}>
          <h3 className={tc.stageTitle}>
            {t.title} · {t.unit}
          </h3>
          <TimeChart
            series={t.lines.map((l) => ({ id: l.id, label: l.label, points: l.points.map((p) => ({ t: p.t, v: p.v })) }))}
            cadence={t.cadence}
            format={FORMAT[t.format]}
            rules={rules}
            height={220}
            label={`${t.title}${selected ? `, with ${selected.title} marked` : ""}`}
          />
        </section>
      ))}
    </div>
  );
}

/** Sourced links between records, inside the open ledger card — same type as Energy CatalogueDossier. */
function Connections({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const { data } = usePolicyData();
  const { events, relationships } = reg(data);
  const links = relationshipsOf(id, relationships, events).filter((x) => x.other);
  if (links.length === 0) return null;
  return (
    <section aria-label="Connected records">
      <h4 className={ledger.sec}>Connected records</h4>
      <ul className={ledger.destList}>
        {links.map(({ rel, other, outgoing }) => (
          <li key={`${rel.from}-${rel.kind}-${rel.to}`}>
            <button type="button" onClick={() => onOpen(other!.id)}>
              {other!.title}
            </button>
            <span className={ledger.destNote}>
              {rel.date ? rel.date.slice(0, 4) : "—"} ·{" "}
              {outgoing ? statusLabel(rel.kind) : `${statusLabel(rel.kind)} by`} ·{" "}
              <a href={rel.source.url} target="_blank" rel="noreferrer">
                {rel.source.label}
              </a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ——— Promise vs delivery — Promise Ledger (verdict panel, shared slabs) ——— */

function pledgeToLedger(p: Pledge, data: PolicyPayload | null): LedgerEvent {
  const scored = pledgeIsScored(p, data);
  const { events, eras } = reg(data);
  return {
    id: p.id,
    year: p.made_date.slice(0, 4),
    title: p.title,
    typeLabel: scored ? "Scored" : "Listed",
    summary: p.statement,
    extent: p.not_scored_reason ?? p.status_note,
    citation: p.made_by,
    markLabel: "Made",
    markValue: madeDate(p),
    status: scored ? "Scored" : "Listed · not scored",
    applies: nationsLabel(p.nations) || "Not stated in the source",
    commencement:
      p.target.period_start || p.target.period_end
        ? `${formatIso(p.target.period_start)} – ${formatIso(p.target.period_end)}`
        : p.target.period_note || "Not defined in the source",
    sources: p.sources.map((src) => ({ label: src.label, href: src.url })),
    context: p.linked_event_ids.flatMap((id) => {
      const e = eventById(events, id);
      return e
        ? [
            {
              id: e.id,
              title: e.title,
              href: `/housing?domain=policy&view=time&era=${eraOf(e, eras)?.id ?? "all"}&event=${e.id}`,
              note: "Linked policy record · context only",
            },
          ]
        : [];
    }),
  };
}

function verdictCopy(p: Pledge, data: PolicyPayload | null) {
  const series = data?.delivery[p.id];
  const d = series ? deliveredOf(p, series.points) : null;
  const scored = pledgeIsScored(p, data);
  const promised = `${fmt.count(p.target.value)} ${unitLabel(p.target.unit)}`;
  const canCount = scored && series
    ? `${series.source.title}${p.match?.aggregation === "sum" ? " · sum of periods" : p.match?.aggregation === "latest" ? " · latest period" : " · each period"}`
    : p.match
      ? "A matching series is named, but the period or geography does not line up yet"
      : "No published series counts the same thing";
  const delivered =
    scored && d
      ? d.value != null
        ? fmt.count(d.value)
        : `${d.met} of ${d.inside.length} periods at or above target`
      : null;
  const verdict = scored
    ? delivered
      ? `Scored · ${delivered}`
      : "Scored"
    : "Listed · not scored";
  const finding =
    scored && series
      ? `${series.source.publisher} · ${series.source.title}. ${p.status_note}`
      : (p.not_scored_reason ?? "No published series counts the same thing for the same place and period.");
  return { promised, canCount, verdict, finding, scored, series, d };
}

function PromiseView({ state: st, onChange }: { state: PolicyState; onChange: (patch: Patch) => void }) {
  const { data, failed } = usePolicyData();
  const pledges = pledgesOf(data);

  if (failed) {
    return <p className={q.note}>The pledge register is unavailable.</p>;
  }
  if (!data) {
    return <p className={q.note}>Loading the pledge register…</p>;
  }
  if (pledges.length === 0) {
    return <p className={q.note}>No pledges are recorded yet.</p>;
  }

  const openId = activePledge(st, data)?.id ?? null;
  const events = pledges.map((p) => pledgeToLedger(p, data));

  return (
    <div className={s.machine}>
      <DecisionLedger
        events={events}
        openId={openId}
        onSelect={(id) => onChange({ pledge: id })}
        empty="No pledges match the current filters."
        idPrefix="housing-promise"
        renderPanel={(ev) => {
          const pledge = pledges.find((p) => p.id === ev.id);
          if (!pledge) return null;
          const { promised, canCount, verdict, finding, scored, series, d } = verdictCopy(pledge, data);
          return (
            <PromiseVerdict
              quote={pledge.statement}
              made={`${pledge.made_by} · ${madeDate(pledge)}`}
              promised={promised}
              canCount={canCount}
              verdict={verdict}
              finding={finding}
            >
              {scored && series && d ? (
                <>
                  <p className={ledger.dossierInstrumentLabel}>Published delivery</p>
                  <TimeChart
                    series={[
                      {
                        id: "delivered",
                        label: series.source.title,
                        points: d.inside.map((x) => ({ t: x.t, v: x.v })),
                      },
                      ...(pledge.match!.aggregation === "per-period"
                        ? [
                            {
                              id: "target",
                              label: "Target",
                              role: "reference" as const,
                              points: d.inside.map((x) => ({ t: x.t, v: pledge.target.value })),
                            },
                          ]
                        : []),
                    ]}
                    cadence="annual"
                    format={pledgeFormat(pledge)}
                    zero
                    marks
                    height={240}
                    label={`${pledge.title}: published delivery`}
                  />
                </>
              ) : null}
              <LinkedEvents ids={pledge.linked_event_ids} />
              <Sources sources={pledge.sources} />
            </PromiseVerdict>
          );
        }}
      />
    </div>
  );
}

/* ——— Archive — reading-room ledger (plain words; link out, do not host) ——— */

const RIGHTS: Record<ArchiveItem["rights"]["status"], string> = {
  "public-domain": "Public domain — free to reuse",
  ogl: "Open Government Licence",
  "cc-by": "Creative Commons — credit the source",
  "non-commercial": "Non-commercial use only",
  "all-rights-reserved": "All rights reserved",
  unknown: "Licence not stated",
};

const ARCHIVE_KIND_LABEL: Record<string, string> = {
  photograph: "Photograph",
  plan: "Plan",
  pamphlet: "Pamphlet",
  report: "Report",
  file: "File",
};

function archiveKindLabel(kind: string): string {
  return ARCHIVE_KIND_LABEL[kind] ?? statusLabel(kind);
}

function archiveToLedger(item: ArchiveItem, data: PolicyPayload | null): LedgerEvent {
  const { events, eras } = reg(data);
  return {
    id: item.id,
    year: item.date_start ? item.date_start.slice(0, 4) : "—",
    title: item.title,
    typeLabel: archiveKindLabel(item.kind),
    summary: item.description,
    extent: item.date_label,
    citation: item.reference,
    markLabel: "Date",
    markValue: item.date_label,
    status: RIGHTS[item.rights.status],
    applies: item.holder,
    commencement: "—",
    sources: [{ label: `Open at ${item.holder}`, href: item.url }],
    context: item.linked_event_ids.flatMap((id) => {
      const e = eventById(events, id);
      return e
        ? [
            {
              id: e.id,
              title: e.title,
              href: `/housing?domain=policy&view=time&era=${eraOf(e, eras)?.id ?? "all"}&event=${e.id}`,
              note: "Related law or programme · context only",
            },
          ]
        : [];
    }),
  };
}

function Archive({ state: st, onChange }: { state: PolicyState; onChange: (patch: Patch) => void }) {
  const { data, failed } = usePolicyData();
  const shown = archiveOf(data, st);

  if (failed) {
    return <p className={q.note}>The archive reading list is unavailable.</p>;
  }
  if (!data) {
    return <p className={q.note}>Loading the archive reading list…</p>;
  }
  if (shown.length === 0) {
    return <p className={q.note}>No records match these filters.</p>;
  }

  const openId = shown.some((i) => i.id === st.event) ? st.event : null;
  const events = shown.map((item) => archiveToLedger(item, data));

  return (
    <div className={s.machine}>
      <DecisionLedger
        events={events}
        openId={openId}
        onSelect={(id) => onChange({ event: id })}
        empty="No records match these filters."
        idPrefix="housing-archive"
        renderPanel={(ev) => {
          const item = shown.find((i) => i.id === ev.id);
          if (!item) return null;
          const plates = (data?.plates?.plates ?? [])
            .filter((p) => p.linked_event_ids.some((id) => item.linked_event_ids.includes(id)))
            .slice(0, 1);
          return (
            <div className={ledger.verdict} role="region" aria-label={`${item.title} reading`}>
              <p className={ledger.lead}>{item.description}</p>
              {plates.map((p) => (
                <PlateFigure key={p.id} plate={p} />
              ))}
              <dl className={ledger.register}>
                <Fact label="Kept by">{item.holder}</Fact>
                <Fact label="Type">{archiveKindLabel(item.kind)}</Fact>
                <Fact label="Date">{item.date_label}</Fact>
              </dl>
              <LinkedEvents ids={item.linked_event_ids} />
              <p className={ledger.destNote}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  Open at {item.holder}
                </a>
              </p>
            </div>
          );
        }}
      />
    </div>
  );
}

/* ——— Data ——— */

function PolicyData({ state: st }: { state: PolicyState }) {
  const { data } = usePolicyData();
  if (st.set === "pledges") {
    const pledges = pledgesOf(data);
    return (
      <div className={tc.tableGroup}>
        <p className={tc.stageTitle}>Pledges · {pledges.length}</p>
        <div className={tc.tableWrap}>
          <table className={tc.table}>
            <thead>
              <tr>
                <th scope="col">Made</th>
                <th scope="col">Pledge</th>
                <th scope="col">By</th>
                <th scope="col">Target</th>
                <th scope="col">Scored</th>
              </tr>
            </thead>
            <tbody>
              {pledges.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.made_date.slice(0, 4)}</th>
                  <td>{p.title}</td>
                  <td>{p.made_by}</td>
                  <td>
                    {fmt.count(p.target.value)} {unitLabel(p.target.unit)}
                  </td>
                  <td>{p.scorable ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (st.set === "archive") {
    const items = archiveOf(data, { ...st, holder: "all", akind: "all" });
    return (
      <div className={tc.tableGroup}>
        <p className={tc.stageTitle}>Archive reading list · {items.length}</p>
        <div className={tc.tableWrap}>
          <table className={tc.table}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Title</th>
                <th scope="col">Kept by</th>
                <th scope="col">Reference</th>
                <th scope="col">Licence</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <th scope="row">{i.date_label}</th>
                  <td>
                    <a href={i.url} target="_blank" rel="noreferrer">
                      {i.title}
                    </a>
                  </td>
                  <td>{i.holder}</td>
                  <td>{i.reference}</td>
                  <td>{RIGHTS[i.rights.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  const records = reg(data).events;
  return (
    <div className={tc.tableGroup}>
      <p className={tc.stageTitle}>Policy records · {records.length}</p>
      <div className={tc.tableWrap}>
        <table className={tc.table}>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Record</th>
              <th scope="col">Type</th>
              <th scope="col">Commencement</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((e) => {
              const primary = e.sources.find((x) => x.role === "primary" || x.role === "official");
              return (
                <tr key={e.id}>
                  <th scope="row">{formatIso(markDate(e))}</th>
                  <td>
                    {primary ? (
                      <a href={primary.url} target="_blank" rel="noreferrer">
                        {e.title}
                      </a>
                    ) : (
                      e.title
                    )}
                  </td>
                  <td>{TYPE_LABEL[e.type]}</td>
                  <td>
                    {e.commencements.length === 0
                      ? "Not recorded"
                      : e.commencements.map((c) => (c.date ? formatIso(c.date) : "Not recorded")).join("; ")}
                  </td>
                  <td>{statusLabel(e.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ——— Shared pieces ——— */

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Sources({ sources }: { sources: { label: string; url: string; role: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <p className={ledger.destNote}>
      {sources.map((x, i) => (
        <span key={x.url}>
          {i > 0 ? " · " : ""}
          <a href={x.url} target="_blank" rel="noreferrer">
            {x.label}
          </a>
        </span>
      ))}
    </p>
  );
}

function LinkedEvents({ ids }: { ids: string[] }) {
  const { data } = usePolicyData();
  const { events, eras } = reg(data);
  const linked = ids.map((x) => eventById(events, x)).filter((e): e is PolicyEvent => e != null);
  if (linked.length === 0) return null;
  return (
    <section aria-label="Related records">
      <h4 className={ledger.sec}>Related records</h4>
      <ul className={ledger.destList}>
        {linked.map((e) => (
          <li key={e.id}>
            <a href={`/housing?domain=policy&view=time&era=${eraOf(e, eras)?.id ?? "all"}&event=${e.id}`}>{e.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A screened photograph with its credit line beneath it (copy never sits on the plate). */
function PlateFigure({ plate }: { plate: PlateRecord }) {
  return (
    <figure className={s.plateFigure}>
      <Plate src={plate.file} label={plate.depicts} className={s.plateImage} />
      <figcaption className={q.source}>
        {plate.title} · {plate.made_label} · {plate.author} ·{" "}
        {plate.licence_url ? (
          <a href={plate.licence_url} target="_blank" rel="noreferrer">
            {plate.licence}
          </a>
        ) : (
          plate.licence
        )}{" "}
        ·{" "}
        <a href={plate.source.url} target="_blank" rel="noreferrer">
          {plate.source.label}
        </a>
      </figcaption>
    </figure>
  );
}

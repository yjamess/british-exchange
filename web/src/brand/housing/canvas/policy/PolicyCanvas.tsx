"use client";

/**
 * Domain 10 — How Britain came to live this way.
 * Time Machine · Housing Eras · Policy Observatory · Promise vs Delivery · Archive · Data.
 * Same vocabulary as every other housing domain: template controls, ruled plate + aside panel,
 * brand charts (TimeChart, EventRail, RankBars), hairline rows. Every record comes from the
 * registry files in data/housing/policy-events and every plotted value from the Exchange API.
 * A mark sits on Royal Assent (or the made / start date for other record types); commencement is
 * written out beside it. An overlapping series is context, never an effect.
 */

import { useMemo, useState, type ReactNode } from "react";
import {
  ChipToggles,
  ControlRow,
  DecisionLedger,
  EventRail,
  MenuControl,
  RankBars,
  Plate,
  SearchControl,
  TimeChart,
  explorerClasses as tc,
  fmt,
  type ChartRule,
  type LedgerEvent,
  type RailMark,
} from "../../..";
import { toT } from "../../../data";
import { UnavailableControl } from "../quality/parts";
import q from "../plate.module.css";
import {
  HOUSING_ERAS,
  MARK_DATE_LABEL,
  NATION_LABEL,
  ORDERED,
  POLICY_EVENTS,
  RELATIONSHIPS,
  TYPE_LABEL,
  TYPE_PLURAL,
  coverageSentence,
  eventById,
  eventsInEra,
  formatIso,
  markDate,
  markT,
  markYear,
  statusLabel,
  topicLabel,
} from "./events";
import type { ArchiveItem, EventType, Nation, PlateRecord, Pledge, PolicyEvent, TrackPayload } from "./types";
import { usePolicyData } from "./usePolicyData";
import s from "./policy.module.css";

type View = "time" | "eras" | "observatory" | "promise" | "archive" | "table";

type Props = {
  view: View;
  eventId: string | null;
  eraId: string | null;
  /** Open a dossier slab; pass null to close. */
  onSelect: (id: string | null) => void;
  onEra: (id: string) => void;
};

function commencementOf(e: PolicyEvent): string {
  if (e.type === "act" || e.type === "statutory_instrument") {
    if (e.commencements.length > 0) {
      return e.commencements
        .map((c) => {
          const when = c.date ? formatIso(c.date) : "Date not pinned";
          return `${when} · ${c.citation}`;
        })
        .join("; ");
    }
    return "Not recorded in this register.";
  }
  return e.end_date
    ? `Ended ${formatIso(e.end_date)}`
    : "No separate commencement date for this record type.";
}

/** Map a housing registry event into the brand Decision Ledger view-model. */
function toLedgerEvent(e: PolicyEvent): LedgerEvent {
  const applies = e.nations?.length
    ? e.nations.map((n) => NATION_LABEL[n]).join(" · ")
    : e.jurisdiction;
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
    applies,
    commencement: commencementOf(e),
    sources: e.sources
      .filter((x) => x.role !== "explanatory_notes")
      .map((src) => ({ label: src.label, href: src.url })),
    context: e.linked_indicators.map((link) => ({
      id: link.id,
      title: link.title,
      href: `/housing?domain=${link.domain}&view=${link.view}&event=${e.id}`,
      note: link.note,
    })),
  };
}

export function PolicyCanvas({ view, eventId, eraId, onSelect, onEra }: Props) {
  if (view === "promise") return <PromiseView />;
  if (view === "eras") return <Eras eventId={eventId} eraId={eraId} onSelect={onSelect} onEra={onEra} />;
  if (view === "observatory") return <Observatory eventId={eventId} onSelect={onSelect} />;
  if (view === "archive") return <Archive />;
  if (view === "table") return <PolicyData />;
  return <TimeMachine eventId={eventId} onSelect={onSelect} />;
}

/* ——— Shared filters (record type + nation) ——— */

const TYPES = (Object.keys(TYPE_LABEL) as EventType[]).filter((t) => POLICY_EVENTS.some((e) => e.type === t));
const NATIONS = (Object.keys(NATION_LABEL) as Nation[]).filter((n) => POLICY_EVENTS.some((e) => e.nations?.includes(n)));

function useRecordFilters() {
  const [types, setTypes] = useState<EventType[]>(TYPES);
  const [nation, setNation] = useState<"all" | Nation>("all");
  const keep = (e: PolicyEvent) => types.includes(e.type) && (nation === "all" || (e.nations ?? []).includes(nation));
  const controls = (
    <>
      {TYPES.length > 1 && (
        <ChipToggles
          label="Records"
          selected={types}
          onToggle={(t) =>
            setTypes((cur) => (cur.includes(t as EventType) ? (cur.length > 1 ? cur.filter((x) => x !== t) : cur) : [...cur, t as EventType]))
          }
          options={TYPES.map((t) => ({ value: t, label: `${TYPE_PLURAL[t]} · ${POLICY_EVENTS.filter((e) => e.type === t).length}` }))}
        />
      )}
      {NATIONS.length > 0 ? (
        <MenuControl
          label="Applies to"
          value={nation}
          options={[{ value: "all" as const, label: "All nations" }, ...NATIONS.map((n) => ({ value: n, label: NATION_LABEL[n] }))]}
          onChange={setNation}
        />
      ) : (
        <UnavailableControl label="Applies to" reason="Nation not yet recorded for these records." />
      )}
    </>
  );
  return { keep, controls };
}

/* ——— 1 · Time Machine ——— */

const FORMAT: Record<TrackPayload["format"], (v: number) => string> = {
  count: fmt.count,
  gbp: (v) => `£${fmt.count(v)}`,
  pct: (v) => `${v.toFixed(1)}%`,
  ratio: (v) => v.toFixed(1),
};

function TimeMachine({
  eventId,
  onSelect,
}: {
  eventId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data, failed } = usePolicyData();
  const { keep, controls } = useRecordFilters();
  const shown = ORDERED.filter(keep).filter((e) => markT(e) != null);
  const selected = shown.find((e) => e.id === eventId) ?? null;
  const available = (data?.tracks ?? []).filter((t) => t.available && t.lines.some((l) => l.points.length > 1));
  const [trackIds, setTrackIds] = useState<string[] | null>(null);
  const active = trackIds ?? available.slice(0, 2).map((t) => t.id);

  const years = shown.map((e) => markT(e)!);
  const now = new Date().getUTCFullYear() + 1;
  const time: [number, number] = years.length ? [Math.floor(Math.min(...years) / 5) * 5 - 5, now] : [1900, now];
  const marks: RailMark[] = shown.map((e) => ({
    id: e.id,
    t: markT(e)!,
    label: String(markYear(e)),
    title: e.title,
    kind: e.type,
  }));
  const rules: ChartRule[] = shown.map((e) => ({
    id: e.id,
    t: markT(e)!,
    label: e.id === selected?.id ? `${MARK_DATE_LABEL[e.type]} ${markYear(e)}` : undefined,
    active: e.id === selected?.id,
  }));

  return (
    <div className={q.root}>
      <ControlRow label="Time Machine controls">
        {available.length > 0 ? (
          <ChipToggles
            label="Tracks"
            selected={active}
            onToggle={(id) => setTrackIds(active.includes(id) ? active.filter((x) => x !== id) : [...active, id])}
            options={(data?.tracks ?? []).map((t) => ({
              value: t.id,
              label: t.title,
              disabled: !available.includes(t),
              title: available.includes(t) ? undefined : "This series is not loaded in the Exchange yet",
            }))}
          />
        ) : (
          <UnavailableControl
            label="Tracks"
            reason={failed ? "Series unavailable." : data ? "No context series loaded." : "Loading…"}
          />
        )}
        {controls}
      </ControlRow>

      <div className={s.machine}>
        <EventRail
          marks={marks}
          time={time}
          selected={selected?.id ?? null}
          onSelect={onSelect}
          label="Policy records by date"
        />
        {available
          .filter((t) => active.includes(t.id))
          .map((t) => (
            <section key={t.id} className={q.section} aria-label={t.title}>
              <h3 className={tc.stageTitle}>
                {t.title} · {t.unit}
              </h3>
              <TimeChart
                series={t.lines.map((l) => ({
                  id: l.id,
                  label: l.label,
                  points: l.points.map((p) => ({ t: p.t, v: p.v })),
                }))}
                cadence={t.cadence}
                format={FORMAT[t.format]}
                sharedTime={time}
                rules={rules}
                height={190}
                motion={false}
                label={`${t.title}, with policy marks`}
              />
              <p className={q.source}>
                {t.source
                  ? `${t.source.publisher} · ${t.source.title}${t.source.release ? ` · ${t.source.release}` : ""}`
                  : t.indicator_id}{" "}
                · {t.note} · <a href={`/housing?domain=${t.domain}&view=${t.view}`}>Open in its domain</a>
              </p>
            </section>
          ))}
        {data?.trackNote && <p className={q.note}>{data.trackNote}</p>}
      </div>

      <DecisionLedger
        events={shown.map(toLedgerEvent)}
        openId={eventId}
        onSelect={onSelect}
        idPrefix="housing-policy-time"
      />
    </div>
  );
}

/* ——— 2 · Housing Eras ——— */

function Eras({
  eventId,
  eraId,
  onSelect,
  onEra,
}: {
  eventId: string | null;
  eraId: string | null;
  onSelect: (id: string | null) => void;
  onEra: (id: string) => void;
}) {
  const { keep, controls } = useRecordFilters();
  const shown = ORDERED.filter(keep);
  const counts = HOUSING_ERAS.map((era) => ({ era, n: eventsInEra(era, shown).length }));
  const era =
    HOUSING_ERAS.find((x) => x.id === eraId) ?? counts.find((c) => c.n > 0)?.era ?? HOUSING_ERAS[0] ?? null;
  const inEra = era ? eventsInEra(era, shown) : [];

  return (
    <div className={q.root}>
      <ControlRow label="Era controls">
        {HOUSING_ERAS.length > 0 ? (
          <MenuControl
            label="Era"
            value={era?.id ?? ""}
            options={HOUSING_ERAS.map((x) => ({ value: x.id, label: x.label }))}
            onChange={onEra}
          />
        ) : (
          <UnavailableControl label="Era" reason="Eras are not in the register yet." />
        )}
        {controls}
      </ControlRow>

      <div className={s.machine}>
        <RankBars
          label="Checked records by era"
          rows={counts.map((c) => ({
            id: c.era.id,
            label: c.era.label,
            v: c.n,
            active: c.era.id === era?.id,
          }))}
          format={(v) => String(v)}
          onSelect={onEra}
        />
        {era && (
          <section className={q.section} aria-label={era.label}>
            <h3 className={tc.stageTitle}>{era.label}</h3>
            <p className={q.body}>{era.focus}</p>
          </section>
        )}
      </div>

      <DecisionLedger
        events={inEra.map(toLedgerEvent)}
        openId={eventId}
        onSelect={onSelect}
        empty="No checked record in this range for the current filters."
        idPrefix="housing-policy-era"
      />
    </div>
  );
}

/* ——— 3 · Policy Observatory ——— */

function Observatory({
  eventId,
  onSelect,
}: {
  eventId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { keep, controls } = useRecordFilters();
  const [query, setQuery] = useState("");
  const topics = useMemo(() => [...new Set(POLICY_EVENTS.flatMap((e) => e.topics ?? []))].sort(), []);
  const [topic, setTopic] = useState("all");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ORDERED.filter(keep)
      .filter((e) => topic === "all" || (e.topics ?? []).includes(topic))
      .filter(
        (e) =>
          !needle ||
          [e.title, e.citation, e.summary, e.institution, ...e.aliases].join(" ").toLowerCase().includes(needle),
      );
  }, [query, topic, keep]);
  const ids = new Set(matches.map((e) => e.id));
  const edges = RELATIONSHIPS.filter((r) => ids.has(r.from) || ids.has(r.to));

  return (
    <div className={q.root}>
      <ControlRow label="Observatory controls">
        <SearchControl
          label="Find a record"
          value={query}
          onChange={setQuery}
          placeholder="Title, citation or body"
          note={coverageSentence()}
        />
        {topics.length > 0 && (
          <MenuControl
            label="Topic"
            value={topic}
            options={[{ value: "all", label: "All topics" }, ...topics.map((t) => ({ value: t, label: topicLabel(t) }))]}
            onChange={setTopic}
          />
        )}
        {controls}
      </ControlRow>

      <DecisionLedger
        events={matches.map(toLedgerEvent)}
        openId={eventId}
        onSelect={onSelect}
        empty="Nothing in the register matches. The register is an initial collection, not the statute book."
        idPrefix="housing-policy-obs"
      />

      <section className={q.section} aria-label="How the records connect">
        <h3 className={tc.stageTitle}>How the records connect</h3>
        {edges.length > 0 ? (
          <ul className={q.rows}>
            {edges.map((r) => {
              const from = eventById(r.from);
              const to = eventById(r.to);
              return (
                <li key={`${r.from}-${r.kind}-${r.to}`} className={q.row}>
                  <span className={q.rowMeta}>{r.date ? r.date.slice(0, 4) : "—"}</span>
                  <span>
                    <button type="button" className={q.rowBtn} onClick={() => from && onSelect(from.id)}>
                      {from?.title ?? r.from}
                    </button>{" "}
                    <span className={q.note}>{statusLabel(r.kind).toLowerCase()}</span>{" "}
                    <button type="button" className={q.rowBtn} onClick={() => to && onSelect(to.id)}>
                      {to?.title ?? r.to}
                    </button>
                  </span>
                  <a className={q.rowMeta} href={r.source.url} target="_blank" rel="noreferrer">
                    {r.source.label}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={q.note}>No sourced relationships among these records yet.</p>
        )}
      </section>
    </div>
  );
}

/* ——— 4 · Promise vs Delivery ——— */

function deliveredOf(p: Pledge, pts: { t: number; v: number; period: string }[]) {
  const t0 = p.target.period_start ? toT(p.target.period_start) : -Infinity;
  const t1 = p.target.period_end ? toT(p.target.period_end) : Infinity;
  const inside = pts.filter((x) => x.t >= t0 && x.t <= t1);
  if (!p.match || inside.length === 0) return { inside, value: null as number | null, met: null as number | null };
  if (p.match.aggregation === "sum") return { inside, value: inside.reduce((a, x) => a + x.v, 0), met: null };
  if (p.match.aggregation === "latest") return { inside, value: inside.at(-1)!.v, met: null };
  return { inside, value: null, met: inside.filter((x) => x.v >= p.target.value).length };
}

function PromiseView() {
  const { data, failed } = usePolicyData();
  const pledges = data?.pledges?.pledges ?? [];
  const [id, setId] = useState<string | null>(null);
  const pledge = pledges.find((p) => p.id === id) ?? pledges[0] ?? null;
  const series = pledge ? data?.delivery[pledge.id] : undefined;
  const d = pledge && series ? deliveredOf(pledge, series.points) : null;
  const scored = pledge?.scorable && d && d.inside.length > 0;

  return (
    <div className={q.root}>
      <ControlRow label="Pledge controls">
        {pledges.length > 0 ? (
          <MenuControl
            label="Pledge"
            value={pledge?.id ?? ""}
            options={pledges.map((p) => ({ value: p.id, label: `${p.made_date.slice(0, 4)} · ${p.title}${p.scorable ? "" : " (not scored)"}` }))}
            onChange={setId}
          />
        ) : (
          <UnavailableControl
            label="Pledge"
            reason={failed ? "The pledge register is unavailable." : data ? "The pledge register has not been published yet." : "Loading…"}
          />
        )}
      </ControlRow>

      <div className={q.plate}>
        <div className={q.plateMain}>
          {!pledge ? (
            <p className={q.note}>{data ? "No pledges are recorded yet. Nothing is scored." : "Loading the pledge register…"}</p>
          ) : (
            <div className={s.machine}>
              {scored && series && pledge.match ? (
                <>
                  <div className={s.pair}>
                    <p className={q.big}>
                      <span className="bo-fig">{fmt.count(pledge.target.value)}</span>
                      <span>target · {pledge.target.unit}</span>
                    </p>
                    <p className={q.big}>
                      <span className="bo-fig">
                        {d!.value != null ? fmt.count(d!.value) : d!.met != null ? `${d!.met} of ${d!.inside.length}` : "—"}
                      </span>
                      <span>
                        {d!.value != null
                          ? `delivered · ${pledge.match.aggregation === "sum" ? "sum of published periods" : "latest published"}`
                          : "periods at or above target"}
                      </span>
                    </p>
                  </div>
                  <TimeChart
                    series={[
                      { id: "delivered", label: series.source.title, points: d!.inside.map((x) => ({ t: x.t, v: x.v })) },
                      ...(pledge.match.aggregation === "per-period"
                        ? [
                            {
                              id: "target",
                              label: "Target",
                              role: "reference" as const,
                              points: d!.inside.map((x) => ({ t: x.t, v: pledge.target.value })),
                            },
                          ]
                        : []),
                    ]}
                    cadence="annual"
                    format={fmt.count}
                    zero
                    marks
                    height={240}
                    label={`${pledge.title}: published delivery`}
                  />
                  <p className={q.source}>
                    {series.source.publisher} · {series.source.title}
                    {series.source.release ? ` · ${series.source.release}` : ""} · {pledge.target.period_note}
                  </p>
                </>
              ) : (
                <p className={q.body}>{pledge.not_scored_reason ?? "No published series counts the same thing for the same place and period."}</p>
              )}
            </div>
          )}

          {pledges.length > 0 && (
            <details className={s.disclosure}>
              <summary className="bo-disclosure">All pledges as a table</summary>
              <div className={tc.tableWrap}>
                <table className={tc.table} aria-label="Every pledge in the register">
                  <thead>
                    <tr>
                      <th scope="col">Pledge</th>
                      <th scope="col">Made</th>
                      <th scope="col">Target</th>
                      <th scope="col">Scored</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pledges.map((p) => (
                      <tr key={p.id}>
                        <th scope="row">
                          <button type="button" className={q.rowBtn} aria-pressed={p.id === pledge?.id} onClick={() => setId(p.id)}>
                            {p.title}
                          </button>
                        </th>
                        <td>{formatIso(p.made_date)}</td>
                        <td>
                          {fmt.count(p.target.value)} {p.target.unit}
                        </td>
                        <td>{p.scorable ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>

        <aside className={q.panel} aria-live="polite" aria-label={pledge ? `${pledge.title} record` : "Pledge record"}>
          {pledge ? (
            <>
              <p className="bo-label">
                {pledge.made_by} · {formatIso(pledge.made_date)}
              </p>
              <p className={q.name}>{pledge.title}</p>
              <p className={q.body}>{pledge.statement}</p>
              <dl className={q.facts}>
                <Fact label="Target">
                  {fmt.count(pledge.target.value)} {pledge.target.unit}
                </Fact>
                <Fact label="Period">
                  {pledge.target.period_start || pledge.target.period_end
                    ? `${formatIso(pledge.target.period_start)} – ${formatIso(pledge.target.period_end)}`
                    : "Not defined in the source"}
                  {pledge.target.period_note ? `. ${pledge.target.period_note}` : ""}
                </Fact>
                <Fact label="Applies to">
                  {pledge.nations.map((n) => NATION_LABEL[n]).join(", ") || pledge.target.geography_code || "Not stated in the source"}
                </Fact>
                <Fact label="Counts">{pledge.measure_definition}</Fact>
                {pledge.funding.length > 0 && (
                  <Fact label="Funding">
                    {pledge.funding.map((f) => (
                      <span key={f.source.url + f.amount_gbp} className={s.line}>
                        £{fmt.count(f.amount_gbp)} · {f.period_note} ·{" "}
                        <a href={f.source.url} target="_blank" rel="noreferrer">
                          {f.source.label}
                        </a>
                      </span>
                    ))}
                  </Fact>
                )}
                <Fact label="Status">{pledge.status_note}</Fact>
              </dl>
              {pledge.context_indicator_ids?.length ? (
                <section className={q.section} aria-label="Context series">
                  <h3 className={tc.stageTitle}>Context in the Exchange · not a score</h3>
                  <ul className={q.links}>
                    {pledge.context_indicator_ids.map((x) => (
                      <li key={x}>
                        <a href={`/housing/data/${x}`}>{x}</a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <LinkedEvents ids={pledge.linked_event_ids} />
              <Sources sources={pledge.sources} />
            </>
          ) : (
            <p className={q.note}>Select a pledge to read its record.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ——— 5 · Archive ——— */

const RIGHTS: Record<ArchiveItem["rights"]["status"], string> = {
  "public-domain": "Public domain",
  ogl: "Open Government Licence",
  "cc-by": "Creative Commons Attribution",
  "non-commercial": "Non-commercial licence",
  "all-rights-reserved": "All rights reserved",
  unknown: "Rights not stated",
};

function Archive() {
  const { data, failed } = usePolicyData();
  const items = useMemo(
    () => [...(data?.archive?.items ?? [])].sort((a, b) => (a.date_start ?? "9999").localeCompare(b.date_start ?? "9999")),
    [data],
  );
  const holders = [...new Set(items.map((i) => i.holder))].sort();
  const kinds = [...new Set(items.map((i) => i.kind))].sort();
  const [holder, setHolder] = useState("all");
  const [kind, setKind] = useState("all");
  const [id, setId] = useState<string | null>(null);
  const shown = items.filter((i) => (holder === "all" || i.holder === holder) && (kind === "all" || i.kind === kind));
  const item = shown.find((i) => i.id === id) ?? shown[0] ?? null;

  return (
    <div className={q.root}>
      <ControlRow label="Archive controls">
        {items.length > 0 ? (
          <>
            <MenuControl
              label="Holder"
              value={holder}
              options={[{ value: "all", label: "All holders" }, ...holders.map((h) => ({ value: h, label: h }))]}
              onChange={setHolder}
            />
            <MenuControl
              label="Kind"
              value={kind}
              options={[{ value: "all", label: "All kinds" }, ...kinds.map((k) => ({ value: k, label: topicLabel(k) }))]}
              onChange={setKind}
            />
          </>
        ) : (
          <UnavailableControl
            label="Holder"
            reason={failed ? "The archive register is unavailable." : data ? "The archive register has not been published yet." : "Loading…"}
          />
        )}
      </ControlRow>

      <div className={q.plate}>
        <div className={q.plateMain}>
          <div className={s.machine}>
            {shown.length > 0 ? (
              <ul className={q.rows}>
                {shown.map((i) => (
                  <li key={i.id} className={q.row}>
                    <span className={q.rowYear}>{i.date_start ? i.date_start.slice(0, 4) : "—"}</span>
                    <button type="button" className={q.rowBtn} aria-pressed={i.id === item?.id} onClick={() => setId(i.id)}>
                      {i.title}
                    </button>
                    <span className={q.rowMeta}>
                      {i.holder} · {i.reference}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={q.note}>{data ? "No catalogue records for these filters." : "Loading the archive register…"}</p>
            )}
          </div>
        </div>

        <aside className={q.panel} aria-live="polite" aria-label={item ? `${item.title} record` : "Archive record"}>
          {item ? (
            <>
              <p className="bo-label">
                {item.holder} · {topicLabel(item.kind)}
              </p>
              <p className={q.name}>{item.title}</p>
              <p className={q.body}>{item.description}</p>
              {(data?.plates?.plates ?? [])
                .filter((p) => p.linked_event_ids.some((id) => item.linked_event_ids.includes(id)))
                .slice(0, 1)
                .map((p) => (
                  <PlateFigure key={p.id} plate={p} />
                ))}
              <dl className={q.facts}>
                <Fact label="Reference">{item.reference}</Fact>
                <Fact label="Date">{item.date_label}</Fact>
                <Fact label="Rights">
                  {RIGHTS[item.rights.status]}
                  {item.rights.note ? `. ${item.rights.note}` : ""}
                  {item.rights.licence_url && (
                    <>
                      {" · "}
                      <a href={item.rights.licence_url} target="_blank" rel="noreferrer">
                        Licence
                      </a>
                    </>
                  )}
                </Fact>
              </dl>
              <LinkedEvents ids={item.linked_event_ids} />
              <p className={q.source}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  Catalogue record · {item.holder}
                </a>
              </p>
            </>
          ) : (
            <p className={q.note}>Select a catalogue record to read it.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ——— 6 · Data ——— */

function PolicyData() {
  return (
    <div className={q.root}>
      <div className={tc.tableWrap}>
        <table className={tc.table} aria-label="Policy records on this page">
          <thead>
            <tr>
              <th scope="col">Record</th>
              <th scope="col">Type</th>
              <th scope="col">Citation</th>
              <th scope="col">Mark date</th>
              <th scope="col">Commencement</th>
              <th scope="col">Status</th>
              <th scope="col">Primary source</th>
            </tr>
          </thead>
          <tbody>
            {ORDERED.map((e) => {
              const primary = e.sources.find((x) => x.role === "primary" || x.role === "official");
              return (
                <tr key={e.id}>
                  <th scope="row">{e.title}</th>
                  <td>{TYPE_LABEL[e.type]}</td>
                  <td>{e.citation}</td>
                  <td>
                    {MARK_DATE_LABEL[e.type]} · {formatIso(markDate(e))}
                  </td>
                  <td>
                    {e.commencements.length === 0
                      ? "Not recorded"
                      : e.commencements.map((c) => (c.date ? formatIso(c.date) : "Not pinned")).join("; ")}
                  </td>
                  <td>{statusLabel(e.status)}</td>
                  <td>
                    {primary ? (
                      <a href={primary.url} target="_blank" rel="noreferrer">
                        {primary.label}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
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
      <dt className="bo-label">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Sources({ sources }: { sources: { label: string; url: string; role: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <p className={q.source}>
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
  const events = ids.map((x) => eventById(x)).filter((e): e is PolicyEvent => e != null);
  if (events.length === 0) return null;
  return (
    <section className={q.section} aria-label="Related records">
      <h3 className={tc.stageTitle}>Related records</h3>
      <ul className={q.links}>
        {events.map((e) => (
          <li key={e.id}>
            <a href={`/housing?domain=policy&view=observatory&event=${e.id}`}>{e.title}</a>
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
        . {plate.derivative_note}
      </figcaption>
    </figure>
  );
}

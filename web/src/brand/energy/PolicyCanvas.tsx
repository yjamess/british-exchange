"use client";

/**
 * Energy Domain 10 — Industrial Policy.
 * Notion flagship = The Decision Ledger.
 * Ledger: brand DecisionLedger + CatalogueDossier (Interior 3) + ExactRegister.
 * Promises: the same ledger slabs opening onto brand PromiseVerdict (Housing Promise Ledger).
 * Events are not Observations. Linked series are context, never effects.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import {
  ControlRow,
  ResetButton,
  DecisionLedger,
  EmptyStage,
  ExactRegister,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  PromiseVerdict,
  Stage,
  TimeChart,
  explorerClasses as t,
  type ExplorerFigure,
  type LedgerEvent,
} from "@/brand";
import { EnergyStageFollow } from "../connections";
import { ENERGY_SOURCE } from "./citations";
import { energySource } from "./source";
import { energyViewHref } from "./views";
import { POLICY_VIEWS } from "./views/policy";
import {
  EMPTY_POLICY_PLEDGES_PACK,
  deliveredOf,
  pledgeIsScored,
  pledgesOf,
  type EnergyPledge,
  type PolicyPledgesPack,
} from "./policy-pledges";
import { toT } from "../data";
import ledger from "../policy/policy.module.css";
import {
  EMPTY_POLICY_EVENTS_PACK,
  MARK_DATE_LABEL,
  NATION_LABEL,
  TYPE_LABEL,
  eventById,
  formatIso,
  formatIsoShort,
  markDate,
  markYear,
  orderedPolicyEvents,
  statusLabel,
  type PolicyEventsPack,
} from "./policy-events";
import type { PolicyEvent } from "../housing/canvas/policy/types";
import g from "./generation.module.css";

function nationLine(e: PolicyEvent): string {
  const nations = e.nations ?? [];
  if (!nations.length) return e.jurisdiction;
  return nations.map((n) => NATION_LABEL[n]).join(" · ");
}

function commencementOf(e: PolicyEvent): string {
  if (e.commencements.length > 0) {
    return e.commencements
      .map((c) => {
        const when = c.date ? formatIso(c.date) : "Date not given";
        const instrument = c.instrument ? ` (${c.instrument})` : "";
        return `${when}${instrument}`;
      })
      .join(" · ");
  }
  if (e.type === "programme" || e.type === "institution") {
    return "No separate commencement date for this record type.";
  }
  return "Not recorded in this register.";
}

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
    applies: nationLine(e),
    commencement: commencementOf(e),
    sources: e.sources.map((src) => ({ label: src.label, href: src.url })),
    context: e.linked_indicators.map((link) => ({
      id: link.id,
      title: link.title,
      href: energyViewHref(link.domain, link.view),
      note: link.note,
    })),
  };
}

const tableLinkStyle: CSSProperties = {
  background: "none",
  border: 0,
  padding: 0,
  color: "var(--bo-electric)",
  cursor: "pointer",
  font: "inherit",
  textAlign: "left",
  textDecoration: "underline",
  textUnderlineOffset: "0.15em",
};

export function PolicyCanvas({
  policyEvents = EMPTY_POLICY_EVENTS_PACK,
  policyPledges = EMPTY_POLICY_PLEDGES_PACK,
}: {
  policyEvents?: PolicyEventsPack;
  policyPledges?: PolicyPledgesPack;
}) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("policy");

  const ordered = useMemo(() => orderedPolicyEvents(policyEvents.events), [policyEvents.events]);
  const pledges = useMemo(() => pledgesOf(policyPledges), [policyPledges]);

  const [view, setView] = useState<"ledger" | "promise">(() =>
    searchParams.get("view") === "promise" ? "promise" : "ledger",
  );
  const [openId, setOpenId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("event");
    return fromUrl && eventById(policyEvents.events, fromUrl) ? fromUrl : null;
  });
  const [pledgeId, setPledgeId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("pledge");
    return fromUrl && policyPledges.pledges.some((p) => p.id === fromUrl) ? fromUrl : null;
  });

  const sync = useCallback(
    (nextId: string | null) => {
      setOpenId(nextId);
      writeUrl({ event: nextId });
    },
    [writeUrl],
  );
  const syncPledge = useCallback(
    (nextId: string | null) => {
      setPledgeId(nextId);
      writeUrl({ pledge: nextId });
    },
    [writeUrl],
  );
  const syncView = useCallback(
    (next: string) => {
      const v = next === "promise" ? "promise" : "ledger";
      setView(v);
      writeUrl({ view: v, event: v === "ledger" ? openId : null, pledge: v === "promise" ? pledgeId : null });
    },
    [openId, pledgeId, writeUrl],
  );

  if (view === "promise") {
    return (
      <PromiseStage
        pack={policyPledges}
        pledges={pledges}
        events={policyEvents.events}
        openId={pledgeId}
        onOpen={syncPledge}
        onView={syncView}
      />
    );
  }

  const ledgerEvents = ordered.map(toLedgerEvent);
  const open = eventById(policyEvents.events, openId);
  const figures: ExplorerFigure[] = [
    {
      label: "Decisions listed",
      value: String(ordered.length),
      note: "Acts and programmes, each checked against its source",
    },
    {
      label: "Open dossier",
      value: open ? String(markYear(open) ?? "—") : "—",
      note: open ? open.title : "None open",
    },
    {
      label: "Span",
      value: ordered.length ? `${markYear(ordered[0]!) ?? "—"}–${markYear(ordered.at(-1)!) ?? "—"}` : "—",
      note: `First and latest decision · checked ${formatIsoShort(policyEvents.retrieved_at)}`,
    },
  ];

  return (
    <>
      <ExplorerHead views={POLICY_VIEWS} view="ledger" onView={syncView} />
      <FigureStrip figures={figures} />
      {openId && <ControlRow><ResetButton onClick={() => sync(null)} /></ControlRow>}

      <Stage
        title="The decision ledger"
        meta="Open a decision to read its catalogue card"
        follow={<EnergyStageFollow domain="policy" view="ledger" label="Policy · Ledger" />}
        foot={
          <FigureRecord
            source={energySource("policy", "ledger", ENERGY_SOURCE.policy)}
            definition={[
              "A chronological list of checked industrial and energy decisions.",
              "Closed rows are solid electric. Open a row for the catalogue card: the story on the left, the register on the right.",
            ]}
            method={[
              policyEvents.note,
              "Assent, commencement and programme publication dates stay separate fields. Linked indicators are context only.",
            ]}
            dataHref="/data#energy-industry"
          />
        }
      >
        {ordered.length === 0 ? (
          <EmptyStage label="No decisions listed yet">
            The decision ledger has no checked records yet.
          </EmptyStage>
        ) : (
          <div className={g.stack}>
            <DecisionLedger events={ledgerEvents} openId={openId} onSelect={sync} idPrefix="energy-policy" />
            <ExactRegister>
              <table className={t.table} aria-label="Industrial policy decisions">
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Title</th>
                    <th scope="col">Type</th>
                    <th scope="col">Mark date</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((e) => (
                    <tr key={e.id}>
                      <td>{markYear(e) ?? "—"}</td>
                      <th scope="row">
                        <button type="button" style={tableLinkStyle} onClick={() => sync(e.id)}>
                          {e.title}
                        </button>
                      </th>
                      <td>{TYPE_LABEL[e.type]}</td>
                      <td>{formatIso(markDate(e))}</td>
                      <td>{statusLabel(e.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ExactRegister>
          </div>
        )}
      </Stage>
    </>
  );
}

/* ——— Promises — Promise Ledger (Housing pattern: ledger slabs → PromiseVerdict) ——— */

function nationsOf(p: EnergyPledge): string {
  return p.nations.map((n) => NATION_LABEL[n.toLowerCase().replace(/ /g, "-") as keyof typeof NATION_LABEL] ?? n).join(" · ");
}

/** Unit-aware figures: capacity in GW, quarterly TWh kept small, shares as percentages. */
function formatIn(unit: string): (v: number) => string {
  if (unit.startsWith("MW")) return (v) => `${(v / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })} GW`;
  if (unit.startsWith("TWh")) return (v) => `${v === 0 ? "0" : v < 0.01 ? v.toFixed(4) : v.toFixed(2)} TWh`;
  if (unit === "share-of-generation") return (v) => `${Math.round(v * 100)}%`;
  return (v) => Math.round(v).toLocaleString("en-GB");
}

function promisedOf(p: EnergyPledge): string {
  if (p.target.value == null) return "No single figure stated";
  const f = formatIn(p.target.unit)(p.target.value);
  if (p.target.unit === "TWh-per-quarter") return `${f} a quarter`;
  if (p.target.unit === "installations-per-year") return `${f} installations a year`;
  if (p.target.unit === "MW-production-capacity") return `${f} of production capacity`;
  return f;
}

function cadenceOf(points: { t: number }[]) {
  const gaps = points.slice(1).map((x, i) => x.t - points[i]!.t);
  const min = gaps.length ? Math.min(...gaps) : 1;
  return min < 0.2 ? ("monthly" as const) : min < 0.5 ? ("quarterly" as const) : ("annual" as const);
}

function verdictOf(p: EnergyPledge, pack: PolicyPledgesPack) {
  const series = pack.delivery[p.id];
  const scored = pledgeIsScored(p, pack);
  const d = scored && series ? deliveredOf(p, series.points) : null;
  const f = formatIn(p.match?.unit ?? p.target.unit);
  const cadence = series ? cadenceOf(series.points) : "annual";
  const step = cadence === "quarterly" ? "quarters" : cadence === "monthly" ? "months" : "years";
  const side = p.match?.direction === "at_or_below" ? "at or below" : "at or above";
  const deadline = p.target.period_end ? toT(p.target.period_end) : Infinity;
  const lastT = d?.inside.at(-1)?.t ?? -Infinity;
  const delivered = d
    ? d.value != null
      ? `${f(d.value)}${lastT < deadline ? " so far" : ""}`
      : `${d.met} of ${d.inside.length} ${step} ${side} target`
    : null;
  const canCount =
    scored && series
      ? `${series.source.title}${p.match?.aggregation === "sum" ? " · sum of periods" : p.match?.aggregation === "latest" ? " · latest period" : ` · each ${step.slice(0, -1)}`}`
      : "No published series counts the same thing";
  return {
    scored,
    series,
    d,
    cadence,
    canCount,
    verdict: scored ? (delivered ? `Scored · ${delivered}` : "Scored") : "Listed · not scored",
    finding:
      scored && series
        ? `${series.source.publisher} · ${series.source.title}. ${p.status_note}`
        : (p.not_scored_reason ?? "No published series counts the same thing for the same place and period."),
  };
}

function pledgeToLedger(p: EnergyPledge, pack: PolicyPledgesPack, events: PolicyEvent[]): LedgerEvent {
  const scored = pledgeIsScored(p, pack);
  const t0 = p.target.period_start ? formatIso(p.target.period_start) : null;
  const t1 = p.target.period_end ? formatIso(p.target.period_end) : null;
  return {
    id: p.id,
    year: p.made_date.slice(0, 4),
    title: p.title,
    typeLabel: scored ? "Scored" : "Listed",
    summary: p.statement,
    extent: p.not_scored_reason ?? p.status_note,
    citation: p.made_by,
    markLabel: "Made",
    markValue: formatIso(p.made_date),
    status: scored ? "Scored" : "Listed · not scored",
    applies: nationsOf(p) || "Not stated in the source",
    commencement: t0 || t1 ? `${t0 ?? "—"} – ${t1 ?? "onward"}` : (p.target.period_note ?? "Not defined in the source"),
    sources: p.sources.map((src) => ({ label: src.label, href: src.url })),
    context: p.linked_event_ids.flatMap((id) => {
      const e = eventById(events, id);
      return e
        ? [{ id: e.id, title: e.title, href: `/energy?domain=policy&view=ledger&event=${e.id}`, note: "Linked policy record · context only" }]
        : [];
    }),
  };
}

function PromiseStage({
  pack,
  pledges,
  events,
  openId,
  onOpen,
  onView,
}: {
  pack: PolicyPledgesPack;
  pledges: EnergyPledge[];
  events: PolicyEvent[];
  openId: string | null;
  onOpen: (id: string | null) => void;
  onView: (id: string) => void;
}) {
  const scoredN = pledges.filter((p) => pledgeIsScored(p, pack)).length;
  const open = pledges.find((p) => p.id === openId) ?? null;
  const figures: ExplorerFigure[] = [
    { label: "Listed", value: String(pledges.length), note: "Pledges in the register" },
    { label: "Scored", value: String(scoredN), note: scoredN ? "Same place, period and unit" : "None yet meet the match rule" },
    {
      label: "Open verdict",
      value: open ? open.made_date.slice(0, 4) : "—",
      note: open ? (pledgeIsScored(open, pack) ? "Scored" : "Listed · not scored") : "Select a pledge",
    },
  ];

  return (
    <>
      <ExplorerHead views={POLICY_VIEWS} view="promise" onView={onView} />
      <FigureStrip figures={figures} />
      {openId && <ControlRow><ResetButton onClick={() => onOpen(null)} /></ControlRow>}

      <Stage
        title="Promise vs delivery"
        meta="Open a pledge to read its verdict"
        follow={<EnergyStageFollow domain="policy" view="promise" label="Policy · Promises" />}
        foot={
          <FigureRecord
            source={energySource("policy", "promise", ENERGY_SOURCE.policyPledges)}
            definition={[
              "Energy pledges quoted from government and party documents.",
              "A pledge is scored only when a published series counts the same thing, in the same unit and period, for the same place or one that bounds it.",
            ]}
            method={[
              "Every other pledge is listed with the reason it is not scored. Listed pledges are not scored down.",
              "Delivery comes from the latest published release. A pledge and a result moving together is not evidence that the policy caused it.",
            ]}
            dataHref="/data#energy-industry"
          />
        }
      >
        {pledges.length === 0 ? (
          <EmptyStage label="No pledges listed yet">The pledge register is not available.</EmptyStage>
        ) : (
          <div className={g.stack}>
            <DecisionLedger
              events={pledges.map((p) => pledgeToLedger(p, pack, events))}
              openId={openId}
              onSelect={onOpen}
              empty="No pledges listed."
              idPrefix="energy-promise"
              renderPanel={(ev) => {
                const p = pledges.find((x) => x.id === ev.id);
                if (!p) return null;
                const v = verdictOf(p, pack);
                const f = formatIn(p.match?.unit ?? p.target.unit);
                return (
                  <PromiseVerdict
                    quote={p.statement}
                    made={`${p.made_by} · ${formatIso(p.made_date)}`}
                    promised={promisedOf(p)}
                    canCount={v.canCount}
                    verdict={v.verdict}
                    finding={v.finding}
                  >
                    {v.scored && v.series && v.d ? (
                      <>
                        <p className={ledger.dossierInstrumentLabel}>Published delivery</p>
                        <TimeChart
                          series={[
                            { id: "delivered", label: v.series.source.title, points: v.d.inside.map((x) => ({ t: x.t, v: x.v })) },
                            ...(p.target.value != null && p.match?.aggregation !== "sum"
                              ? [
                                  {
                                    id: "target",
                                    label: "Target",
                                    role: "reference" as const,
                                    points: v.d.inside.map((x) => ({ t: x.t, v: p.target.value as number })),
                                  },
                                ]
                              : []),
                          ]}
                          cadence={v.cadence}
                          format={f}
                          zero
                          marks
                          height={240}
                          label={`${p.title}: published delivery`}
                        />
                      </>
                    ) : null}
                    {p.sources.length > 0 ? (
                      <p className={ledger.destNote}>
                        {p.sources.map((x, i) => (
                          <span key={x.url}>
                            {i > 0 ? " · " : ""}
                            <a href={x.url} target="_blank" rel="noreferrer">
                              {x.label}
                            </a>
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </PromiseVerdict>
                );
              }}
            />
          </div>
        )}
      </Stage>
    </>
  );
}

"use client";

/**
 * Economy Domain 10 — Economic policy.
 * Flagship: the economic decision ledger (Energy Domain 10 pattern: brand DecisionLedger +
 * CatalogueDossier + ExactRegister), with views:
 * Ledger · Changes and reversals · Promises.
 * Events are not Observations. Linked series are context, never effects.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { TimeChart } from "../instrument/TimeChart";
import {
  ControlRow,
  DecisionLedger,
  EmptyStage,
  ExactRegister,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  PromiseVerdict,
  ResetButton,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
  type LedgerEvent,
} from "@/brand";
import s from "../energy/generation.module.css";
import ledger from "../policy/policy.module.css";
import {
  eraOf,
  eventById,
  formatIso,
  formatIsoShort,
  markYear,
  orderedPolicyEvents,
  statusLabel,
} from "../energy/policy-events";
import {
  deliveredOf,
  pledgeIsScored,
  pledgesOf,
  type EnergyPledge,
} from "../energy/policy-pledges";
import type { PolicyEvent } from "../housing/canvas/policy/types";
import { ECONOMY_SOURCE, economySource } from "./citations";
import {
  EMPTY_POLICY_EVENTS_PACK,
  EMPTY_POLICY_PLEDGES_PACK,
  POLICY_AREA_LABEL,
  POLICY_AREA_OPTIONS,
  asPolicyArea,
  relationshipSentence,
  toLedgerEvent,
  type PolicyEventsPack,
  type PolicyPledgesPack,
} from "./policy-model";
import type { PolicyPack } from "./types";

const VIEWS: ExplorerView[] = [
  { id: "ledger", label: "Decision ledger" },
  { id: "changes", label: "Changes and reversals" },
  { id: "promise", label: "Promises" },
];

type View = "ledger" | "changes" | "promise";

function asView(raw: string | null): View {
  return VIEWS.some((v) => v.id === raw) ? (raw as View) : "ledger";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Policy";
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

export function PolicyCanvas({ pack }: { pack: PolicyPack }) {
  const events: PolicyEventsPack =
    pack.policyEvents ?? EMPTY_POLICY_EVENTS_PACK;
  const pledgesPack: PolicyPledgesPack =
    pack.policyPledges ?? EMPTY_POLICY_PLEDGES_PACK;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>(() =>
    asView(searchParams.get("view")),
  );
  const [area, setArea] = useState(() =>
    asPolicyArea(searchParams.get("area")),
  );
  const [eraId, setEraId] = useState<string>(
    () => searchParams.get("era") ?? "all",
  );
  const [openId, setOpenId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("event");
    return fromUrl && eventById(events.events, fromUrl) ? fromUrl : null;
  });
  const [pledgeId, setPledgeId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("pledge");
    return fromUrl && pledgesPack.pledges.some((p) => p.id === fromUrl)
      ? fromUrl
      : null;
  });

  const sync = useCallback(
    (next: {
      view?: View;
      area?: string;
      era?: string;
      event?: string | null;
      pledge?: string | null;
    }) => {
      const v = next.view ?? view;
      const a = next.area ?? area;
      const e = next.era ?? eraId;
      const ev = next.event !== undefined ? next.event : openId;
      const pl = next.pledge !== undefined ? next.pledge : pledgeId;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "policy");
      u.set("view", v);
      if (v === "ledger") {
        if (a !== "all") u.set("area", a);
        else u.delete("area");
      } else u.delete("area");
      if (v === "ledger" && e !== "all") u.set("era", e);
      else u.delete("era");
      if (v === "ledger" && ev) u.set("event", ev);
      else u.delete("event");
      if (v === "promise" && pl) u.set("pledge", pl);
      else u.delete("pledge");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.area != null) setArea(asPolicyArea(next.area));
      if (next.era != null) setEraId(next.era);
      if (next.event !== undefined) setOpenId(next.event);
      if (next.pledge !== undefined) setPledgeId(next.pledge);
    },
    [pathname, view, area, eraId, openId, pledgeId],
  );

  const ordered = useMemo(
    () => orderedPolicyEvents(events.events),
    [events.events],
  );
  const titleOf = useCallback(
    (registry: string, id: string) =>
      registry === "economy" ? (eventById(events.events, id)?.title ?? id) : id,
    [events.events],
  );
  const filtered = useMemo(
    () =>
      ordered.filter((e) => {
        if (area !== "all" && e.policy_area !== area) return false;
        if (
          view === "ledger" &&
          eraId !== "all" &&
          eraOf(e, events.eras)?.id !== eraId
        )
          return false;
        return true;
      }),
    [ordered, view, area, eraId, events.eras],
  );
  const ledgerEvents = useMemo(
    () => filtered.map((e) => toLedgerEvent(e, titleOf)),
    [filtered, titleOf],
  );
  const open = eventById(events.events, openId);
  const pledges = useMemo(() => pledgesOf(pledgesPack), [pledgesPack]);

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "promise") {
      const scored = pledges.filter((p) =>
        pledgeIsScored(p, pledgesPack),
      ).length;
      return [
        {
          label: "Listed",
          value: String(pledges.length),
          note: "Pledges in the register",
        },
        {
          label: "Scored",
          value: String(scored),
          note: scored
            ? "Same place, period and unit"
            : "None yet meet the match rule",
        },
        {
          label: "Checked",
          value: formatIsoShort(pledgesPack.retrieved_at),
          note: "Register date",
        },
      ];
    }
    if (view === "changes") {
      return [
        {
          label: "Relationships",
          value: String(events.relationships.length),
          note: "Each one sourced",
        },
        {
          label: "Repeals",
          value: String(
            events.relationships.filter((r) => r.kind === "repealed").length,
          ),
          note: "Decisions undone by a later Act",
        },
        {
          label: "Amendments",
          value: String(
            events.relationships.filter((r) => r.kind === "amended").length,
          ),
          note: "Decisions changed by a later Act",
        },
      ];
    }
    return [
      {
        label: "Decisions listed",
        value: String(filtered.length),
        note:
          area === "all"
            ? "Acts, programmes and institutions, each checked"
            : POLICY_AREA_LABEL[area],
      },
      {
        label: "Open dossier",
        value: open ? String(markYear(open) ?? "—") : "—",
        note: open ? open.title : "None open",
      },
      {
        label: "Span",
        value: filtered.length
          ? `${markYear(filtered[0]!) ?? "—"}–${markYear(filtered.at(-1)!) ?? "—"}`
          : "—",
        note: `First and latest decision · checked ${formatIsoShort(events.retrieved_at)}`,
      },
    ];
  }, [view, pledges, pledgesPack, events, filtered, open, area]);

  const eraOptions = [
    { value: "all", label: "All eras" },
    ...events.eras.map((e) => ({ value: e.id, label: e.label })),
  ];
  const showArea = view === "ledger";
  const showEra = view === "ledger";

  let body: React.ReactNode;
  let foot: React.ReactNode;

  if (view === "promise") {
    foot = (
      <FigureRecord terms={["bank-rate", "mpc", "qe", "fiscal-policy", "obr"]}
        source={economySource(
          ECONOMY_SOURCE.policyPledges,
          "United Kingdom",
          "Register",
        )}
        definition={[
          "Economic pledges quoted from government documents, each set beside a published series only when both count the same thing.",
          "A pledge is scored only when the pledge and the series share a unit and a period, and the place matches or is bounded.",
        ]}
        method={[
          "Every other pledge is listed with the reason it is not scored. Listed pledges are not scored down.",
          "A pledge and a result moving together is not evidence that the policy caused it.",
        ]}
      />
    );
    body =
      pledges.length === 0 ? (
        <EmptyStage label="No pledges listed yet">
          The pledge register is not available.
        </EmptyStage>
      ) : (
        <div className={s.stack}>
          <DecisionLedger
            events={pledges.map((p) =>
              pledgeToLedger(p, pledgesPack, events.events),
            )}
            openId={pledgeId}
            onSelect={(id) => sync({ pledge: id })}
            empty="No pledges listed."
            idPrefix="economy-promise"
            renderPanel={(ev) => {
              const p = pledges.find((x) => x.id === ev.id);
              if (!p) return null;
              return <PledgePanel p={p} pack={pledgesPack} />;
            }}
          />
        </div>
      );
  } else if (view === "changes") {
    foot = (
      <FigureRecord terms={["bank-rate", "mpc", "qe", "fiscal-policy", "obr"]}
        source={economySource(
          ECONOMY_SOURCE.policy,
          "United Kingdom",
          "Register",
        )}
        definition={[
          "How decisions changed one another: each row is one sourced relationship, read as a sentence.",
        ]}
        method={[
          "Dates are the day the source gives for the change. A blank date means the source does not give one.",
        ]}
      />
    );
    body =
      events.relationships.length === 0 ? (
        <EmptyStage label="No relationships">
          No sourced relationships yet.
        </EmptyStage>
      ) : (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Repeals, amendments and creations · {events.relationships.length}
            </h3>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Change</th>
                    <th scope="col">Note</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[...events.relationships]
                    .sort((a, b) =>
                      (a.date ?? "9999").localeCompare(b.date ?? "9999"),
                    )
                    .map((r) => (
                      <tr key={`${r.from}-${r.kind}-${r.to}`}>
                        <td>{r.date ? formatIso(r.date) : "Not given"}</td>
                        <th scope="row">
                          <button
                            type="button"
                            style={tableLinkStyle}
                            onClick={() =>
                              sync({
                                view: "ledger",
                                era: "all",
                                area: "all",
                                event: r.from,
                              })
                            }
                          >
                            {relationshipSentence(r, (id) =>
                              titleOf("economy", id),
                            )}
                          </button>
                        </th>
                        <td>{r.note}</td>
                        <td>
                          <a
                            href={r.source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {r.source.label}
                          </a>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      );
  } else {
    foot = (
      <FigureRecord terms={["bank-rate", "mpc", "qe", "fiscal-policy", "obr"]}
        source={economySource(
          ECONOMY_SOURCE.policy,
          "United Kingdom",
          "Register",
        )}
        definition={[
          "A chronological list of checked economic decisions: Acts, programmes and institutions.",
          "Closed rows are solid electric. Open a row for the catalogue card: the story on the left, the register on the right, and the evidence record where one has been compiled.",
        ]}
        method={[
          events.note,
          "Announcement, Royal Assent, commencement and repeal dates stay separate fields. Linked indicators are context only.",
        ]}
      />
    );
    body =
      ledgerEvents.length === 0 ? (
        <EmptyStage label="No decisions listed">
          No checked record matches this selection yet.
        </EmptyStage>
      ) : (
        <div className={s.stack}>
          <DecisionLedger
            events={ledgerEvents}
            openId={openId}
            onSelect={(id) => sync({ event: id })}
            idPrefix="economy-policy"
          />
          <ExactRegister>
            <table className={t.table} aria-label="Economic policy decisions">
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">Title</th>
                  <th scope="col">Area</th>
                  <th scope="col">Mark date</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>{markYear(e) ?? "—"}</td>
                    <th scope="row">
                      <button
                        type="button"
                        style={tableLinkStyle}
                        onClick={() => sync({ event: e.id })}
                      >
                        {e.title}
                      </button>
                    </th>
                    <td>
                      {e.policy_area ? POLICY_AREA_LABEL[e.policy_area] : "—"}
                    </td>
                    <td>
                      {formatIso(
                        e.type === "act" || e.type === "statutory_instrument"
                          ? e.enactment_date
                          : e.start_date,
                      )}
                    </td>
                    <td>{statusLabel(e.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ExactRegister>
        </div>
      );
  }

  return (
    <>
      <ExplorerHead
        views={VIEWS}
        view={view}
        onView={(id) => sync({ view: asView(id), event: null, pledge: null })}
      />
      <FigureStrip figures={figures} />
      <ControlRow>
        {showArea ? (
          <MenuControl
            label="Policy area"
            value={area}
            options={POLICY_AREA_OPTIONS}
            onChange={(v) => sync({ area: v, event: null })}
          />
        ) : null}
        {showEra ? (
          <MenuControl
            label="Era"
            value={eraId}
            options={eraOptions}
            onChange={(v) => sync({ era: v, event: null })}
          />
        ) : null}
        {showArea || showEra || openId || pledgeId ? (
          <ResetButton
            onClick={() =>
              sync({ area: "all", era: "all", event: null, pledge: null })
            }
          />
        ) : null}
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        meta={
          view === "promise"
            ? "Open a pledge to read its verdict"
            : view === "ledger"
              ? "Open a decision to read its catalogue card"
              : undefined
        }
        follow={
          <EconomyStageFollow
            domain="policy"
            view={view}
            label={`Policy · ${viewLabel(view)}`}
          />
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

/* ——— Promises (Energy / Housing Promise ledger pattern) ——— */

function pledgeToLedger(
  p: EnergyPledge,
  pack: PolicyPledgesPack,
  events: PolicyEvent[],
): LedgerEvent {
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
    applies: p.nations.join(" · ") || "Not stated in the source",
    commencement:
      t0 || t1
        ? `${t0 ?? "—"} – ${t1 ?? "onward"}`
        : (p.target.period_note ?? "Not defined in the source"),
    sources: p.sources.map((src) => ({ label: src.label, href: src.url })),
    context: p.linked_event_ids.flatMap((id) => {
      const e = eventById(events, id);
      return e
        ? [
            {
              id: e.id,
              title: e.title,
              href: `/economy?domain=policy&view=ledger&event=${e.id}`,
              note: "Linked policy record · context only",
            },
          ]
        : [];
    }),
  };
}

function PledgePanel({
  p,
  pack,
}: {
  p: EnergyPledge;
  pack: PolicyPledgesPack;
}) {
  const scored = pledgeIsScored(p, pack);
  const series = pack.delivery[p.id];
  const d = scored && series ? deliveredOf(p, series.points) : null;
  const promised =
    p.target.value == null
      ? "No single figure stated"
      : p.target.unit.includes("current-budget")
        ? "Current budget at zero or in surplus"
        : p.target.unit.includes("CPI")
          ? `${p.target.value}% a year (CPI)`
          : `${p.target.value} ${p.target.unit.replace(/-/g, " ")}`;
  const canCount =
    scored && series
      ? `${series.source.title}`
      : "No published series counts the same thing";
  const verdict = scored ? "Scored" : "Listed · not scored";
  const finding =
    scored && series
      ? `${series.source.publisher} · ${series.source.title}. ${p.status_note}`
      : (p.not_scored_reason ??
        "No published series counts the same thing for the same place and period.");
  return (
    <PromiseVerdict
      quote={p.statement}
      made={`${p.made_by} · ${formatIso(p.made_date)}`}
      promised={promised}
      canCount={canCount}
      verdict={verdict}
      finding={finding}
    >
      {scored && series && d && d.inside.length > 0 ? (
        <>
          <p className={ledger.dossierInstrumentLabel}>Published delivery</p>
          <TimeChart
            series={[
              {
                id: "delivered",
                label: series.source.title,
                points: d.inside.map((x) => ({ t: x.t, v: x.v })),
              },
              ...(p.target.value != null
                ? [
                    {
                      id: "target",
                      label: "Target",
                      role: "reference" as const,
                      points: d.inside.map((x) => ({
                        t: x.t,
                        v: p.target.value as number,
                      })),
                    },
                  ]
                : []),
            ]}
            cadence="monthly"
            format={(v: number) =>
              v.toLocaleString("en-GB", { maximumFractionDigits: 1 })
            }
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
}

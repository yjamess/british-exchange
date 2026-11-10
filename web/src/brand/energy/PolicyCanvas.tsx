"use client";

/**
 * Energy Domain 10 — Industrial Policy.
 * Notion flagship = The Decision Ledger.
 * Body: brand DecisionLedger + CatalogueDossier (Interior 3) + ExactRegister.
 * Events are not Observations. Linked series are context, never effects.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import {
  DecisionLedger,
  EmptyStage,
  ExactRegister,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type LedgerEvent,
} from "@/brand";
import { ENERGY_SOURCE } from "./citations";
import { energyViewHref } from "./views";
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

export function PolicyCanvas({ policyEvents = EMPTY_POLICY_EVENTS_PACK }: { policyEvents?: PolicyEventsPack }) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("policy");

  const ordered = useMemo(() => orderedPolicyEvents(policyEvents.events), [policyEvents.events]);

  const [openId, setOpenId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("event");
    return fromUrl && eventById(policyEvents.events, fromUrl) ? fromUrl : null;
  });

  const sync = useCallback(
    (nextId: string | null) => {
      setOpenId(nextId);
      writeUrl({ event: nextId });
    },
    [writeUrl],
  );

  const ledgerEvents = useMemo(() => ordered.map(toLedgerEvent), [ordered]);
  const open = eventById(policyEvents.events, openId);
  const figures: ExplorerFigure[] = [
    {
      label: "Decisions listed",
      value: String(ordered.length),
      note: "Acts + programmes · checked dates",
    },
    {
      label: "Open dossier",
      value: open ? String(markYear(open) ?? "—") : "—",
      note: open ? open.title : "Select a row",
    },
    {
      label: "Retrieved",
      value: formatIsoShort(policyEvents.retrieved_at),
      note: "From the register · not causal",
    },
  ];

  return (
    <>
      <ExplorerHead />
      <FigureStrip figures={figures} />

      <Stage
        title="The decision ledger"
        meta="Open a decision to read its catalogue card"
        foot={
          <FigureRecord
            source={ENERGY_SOURCE.policy}
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

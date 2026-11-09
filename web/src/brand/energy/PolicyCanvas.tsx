"use client";

/**
 * Energy Domain 10 — Industrial Policy.
 * Notion flagship = The Decision Ledger.
 * Body: brand DecisionLedger + CatalogueDossier (Interior 3) + ExactRegister.
 * Events are not Observations. Linked series are context, never effects.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DecisionLedger,
  EmptyStage,
  ExactRegister,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  Stage,
  type ExplorerFigure,
  type LedgerEvent,
} from "@/brand";
import { ENERGY_SOURCE } from "./citations";
import {
  MARK_DATE_LABEL,
  NATION_LABEL,
  ORDERED,
  POLICY_NOTE,
  POLICY_RETRIEVED,
  TYPE_LABEL,
  eventById,
  formatIso,
  markDate,
  markYear,
  statusLabel,
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
        const when = c.date ? formatIso(c.date) : "Date not pinned";
        return `${when} · ${c.citation}`;
      })
      .join("; ");
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
      href: `/energy?domain=${link.domain}&view=${link.view}`,
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

export function PolicyCanvas() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openId, setOpenId] = useState<string | null>(() => {
    const fromUrl = searchParams.get("event");
    return fromUrl && eventById(fromUrl) ? fromUrl : null;
  });

  const sync = useCallback(
    (nextId: string | null) => {
      setOpenId(nextId);
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "policy");
      u.delete("view");
      u.delete("measure");
      u.delete("year");
      u.delete("compare");
      u.delete("fuel");
      u.delete("from");
      u.delete("to");
      u.delete("sector");
      u.delete("flow");
      u.delete("tech");
      u.delete("lf_basis");
      if (nextId) u.set("event", nextId);
      else u.delete("event");
      window.history.replaceState(null, "", `${pathname}?${u}`);
    },
    [pathname],
  );

  const ledgerEvents = useMemo(() => ORDERED.map(toLedgerEvent), []);
  const open = eventById(openId);
  const figures: ExplorerFigure[] = [
    {
      label: "Decisions seeded",
      value: String(ORDERED.length),
      note: "Acts + programmes · checked dates",
    },
    {
      label: "Open dossier",
      value: open ? String(markYear(open) ?? "—") : "—",
      note: open ? open.title : "Select a row",
    },
    {
      label: "Register",
      value: POLICY_RETRIEVED,
      note: "Retrieved · not causal",
    },
  ];

  return (
    <>
      <ExplorerHead />
      <FigureStrip figures={figures} />

      <Stage
        title="The Decision Ledger"
        meta="Open a decision · electric slab · catalogue card"
        foot={
          <FigureRecord
            source={ENERGY_SOURCE.policy}
            definition={[
              "Archival Decision Ledger: one chronological list of checked industrial and energy decisions.",
              "Closed rows are electric; open a row for the catalogue card — story beside the register.",
            ]}
            method={[
              POLICY_NOTE,
              "Assent, commencement and programme publication dates stay separate fields. Linked indicators are context only.",
            ]}
            dataHref="/data#energy-industry"
          />
        }
      >
        {ORDERED.length === 0 ? (
          <EmptyStage label="No policy events seeded">
            The Decision Ledger has no checked records yet.
          </EmptyStage>
        ) : (
          <div className={g.stack}>
            <p className="bo-prose" style={{ marginBottom: "1.5rem" }}>
              Six checked decisions for Gate 2. Closed rows are solid electric. Open one for the
              catalogue card — story on the left, register on the right.
            </p>
            <DecisionLedger events={ledgerEvents} openId={openId} onSelect={sync} idPrefix="energy-policy" />
            <ExactRegister>
              <table className={g.table}>
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
                  {ORDERED.map((e) => (
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

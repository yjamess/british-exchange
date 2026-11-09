"use client";

/**
 * Decision Ledger — electric closed slabs; one open catalogue card at a time.
 * Canvas owns URL / openId via onSelect. Events are a normalised LedgerEvent list.
 */

import type { ReactNode } from "react";
import { CatalogueDossier } from "./CatalogueDossier";
import type { LedgerEvent } from "./types";
import s from "./policy.module.css";

type Props = {
  events: LedgerEvent[];
  openId: string | null;
  onSelect: (id: string | null) => void;
  empty?: string;
  /** Prefix for aria-controls ids when several ledgers sit on one page. */
  idPrefix?: string;
  /** Extra body inside the open dossier (chart, Exact values table, …). */
  renderOpen?: (event: LedgerEvent) => ReactNode;
};

export function DecisionLedger({
  events,
  openId,
  onSelect,
  empty = "No record matches the current filters.",
  idPrefix = "policy-dossier",
  renderOpen,
}: Props) {
  if (events.length === 0) {
    return <p className={s.ledgerEmpty}>{empty}</p>;
  }

  return (
    <ul className={s.ledger}>
      {events.map((event) => {
        const open = openId === event.id;
        const panelId = `${idPrefix}-${event.id}`;
        return (
          <li key={event.id} className={open ? s.slabOpen : s.slabClosed}>
            <button
              type="button"
              className={s.slabToggle}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => onSelect(open ? null : event.id)}
            >
              <span className={s.slabYear}>{event.year}</span>
              <h3 className={s.slabTitle}>{event.title}</h3>
              <span className={s.slabMeta}>
                <span>{event.typeLabel}</span>
                <span aria-hidden="true">{open ? "−" : "+"}</span>
              </span>
            </button>
            <div id={panelId} hidden={!open}>
              {open ? (
                <CatalogueDossier event={event}>{renderOpen?.(event)}</CatalogueDossier>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

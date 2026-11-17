"use client";

/**
 * Decision Ledger Interior 3 — catalogue card.
 * Left: summary, Extent, Measured context. Right: label / value register.
 * Optional children sit full-width under the card (e.g. context chart + Exact values).
 */

import type { ReactNode } from "react";
import type { LedgerEvent } from "./types";
import s from "./policy.module.css";

export function CatalogueDossier({
  event,
  children,
}: {
  event: LedgerEvent;
  children?: ReactNode;
}) {
  return (
    <div
      className={`${s.dossier} ${s.catalogue}`}
      role="region"
      aria-label={`${event.title} dossier`}
    >
      <div className={s.catalogueStory}>
        <p className={s.lead}>{event.summary}</p>
        <h4 className={s.sec}>Extent</h4>
        <p className={s.body}>{event.extent}</p>
        {event.record?.sections.map((section) => (
          <div key={section.heading}>
            <h4 className={s.sec}>{section.heading}</h4>
            <p className={s.body}>{section.body}</p>
          </div>
        ))}
        {event.record && event.record.measures.length > 0 ? (
          <>
            <h4 className={s.sec}>Measures</h4>
            <dl className={s.register}>
              {event.record.measures.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
        {event.record && event.record.financial.length > 0 ? (
          <>
            <h4 className={s.sec}>Financial record</h4>
            <dl className={s.register}>
              {event.record.financial.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
        {event.record ? (
          <>
            <h4 className={s.sec}>Published evaluations</h4>
            {event.record.evaluations.length === 0 ? (
              <p className={s.body}>None attached to this record yet.</p>
            ) : (
              <ul className={s.destList}>
                {event.record.evaluations.map((ev) => (
                  <li key={ev.href}>
                    <a href={ev.href} target="_blank" rel="noreferrer">
                      {ev.label}
                    </a>
                    <span className={s.destNote}>
                      {ev.publisher}
                      {ev.date ? ` · ${ev.date}` : ""} · {ev.finding}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
        {event.record && event.record.related.length > 0 ? (
          <>
            <h4 className={s.sec}>Related decisions</h4>
            <ul className={s.destList}>
              {event.record.related.map((link) => (
                <li key={link.id}>
                  <a href={link.href}>{link.title}</a>
                  <span className={s.destNote}>{link.note}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {event.context.length > 0 ? (
          <>
            <h4 className={s.sec}>Measured context</h4>
            <ul className={s.destList}>
              {event.context.map((link) => (
                <li key={link.id}>
                  <a href={link.href}>{link.title}</a>
                  <span className={s.destNote}>{link.note}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <dl className={s.register}>
        <div>
          <dt>Type</dt>
          <dd>{event.typeLabel}</dd>
        </div>
        <div>
          <dt>Citation</dt>
          <dd>{event.citation || "—"}</dd>
        </div>
        <div>
          <dt>{event.markLabel}</dt>
          <dd>{event.markValue}</dd>
        </div>
        {event.status && (
          <div>
            <dt>Status</dt>
            <dd>{event.status}</dd>
          </div>
        )}
        <div>
          <dt>Applies</dt>
          <dd>{event.applies}</dd>
        </div>
        {event.commencement && (
          <div>
            <dt>Commencement</dt>
            <dd>{event.commencement}</dd>
          </div>
        )}
        <div>
          <dt>Sources</dt>
          <dd>
            {event.sources.length === 0
              ? "—"
              : event.sources.map((src) => (
                  <a key={src.href} href={src.href} target="_blank" rel="noreferrer">
                    {src.label}
                  </a>
                ))}
          </dd>
        </div>
      </dl>
      {children ? <div className={s.dossierInstrument}>{children}</div> : null}
      <p className={s.caveat}>Related charts are for context. They do not prove the event caused the change.</p>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import s from "./sector.module.css";

export function SectionHeading({ number, label, title, description, children }: { number: string; label: string; title: string; description?: string; children?: ReactNode }) {
  return <header className={s.sectionHeading}><div><div className={s.eyebrow}><span className={s.sectionNumber}>{number}</span>{label}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>{children}</header>;
}

export type Metric = { id: string; label: string; value: string; context: string; scope: string };
export function MetricStrip({ metrics, selected, onSelect }: { metrics: Metric[]; selected: string; onSelect: (id: string) => void }) {
  return <div className={s.metrics} aria-label="At a glance">{metrics.map(m => <button className={s.metric} key={m.id} onClick={() => onSelect(m.id)} aria-pressed={selected === m.id}><span className={s.metricLabel}>{m.label}<span aria-hidden="true">↗</span></span><strong className={s.metricValue}>{m.value}</strong><span className={s.metricContext}>{m.context}</span><span className={s.metricScope}>{m.scope}</span></button>)}</div>;
}

export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (value: T) => void }) {
  return <div className={s.segmented} role="group" aria-label={label}>{options.map(o => <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>;
}

/** Condensed source chrome — publisher first; methodology in the disclosure. */
export function Evidence({ publisher, href, children }: { publisher: string; href?: string; children: ReactNode }) {
  return (
    <details className={s.evidence}>
      <summary>
        Source · {publisher}
        <span className={s.evidenceHint}> · Series details</span>
      </summary>
      <p>
        {children}{" "}
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            Official release ↗
          </a>
        ) : null}
      </p>
    </details>
  );
}

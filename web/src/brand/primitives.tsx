/**
 * Brand primitives — the small parts every page is made of.
 * Server-safe (no hooks). Interactive controls live in controls.tsx.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icons";
import p from "./primitives.module.css";

/** Mono kicker. A square marker in signal red is reserved for the page's single key point. */
export function Label({ children, marker = false, as: Tag = "p" }: { children: ReactNode; marker?: boolean; as?: "p" | "span" | "h2" | "h3" }) {
  return <Tag className={`bo-label ${p.label}`} data-marker={marker || undefined}>{children}</Tag>;
}

/**
 * Coverage — geography is part of the number.
 * Solid border = UK-wide. Dashed border = partial coverage (e.g. England only).
 */
export function Coverage({ scope }: { scope: string }) {
  const partial = !/^united kingdom|^uk\b/i.test(scope);
  return (
    <span className={`bo-label ${p.coverage}`} data-partial={partial || undefined} title={partial ? "Partial UK coverage" : "UK-wide"}>
      {partial ? `${scope} only` : scope}
    </span>
  );
}

export function SourceLine({ publisher, series, period, href }: { publisher: string; series?: string; period?: string; href?: string }) {
  const body = (
    <>
      <span className={p.srcKey}>Source</span>
      <span>{publisher}</span>
      {series ? <span className={p.srcDim}>{series}</span> : null}
      {period ? <span className={p.srcDim}>{period}</span> : null}
      {href ? <Icon name="external" size={12} /> : null}
    </>
  );
  return href ? (
    <a className={`bo-label ${p.source}`} href={href} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <p className={`bo-label ${p.source}`}>{body}</p>
  );
}

export function Figure({
  label,
  value,
  delta,
  context,
  scope,
  source,
  size = "md",
}: {
  label: string;
  value: string;
  delta?: { text: string; dir: "up" | "down" | "flat"; against: string } | null;
  context?: ReactNode;
  scope?: string;
  source?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className={p.figure} data-size={size}>
      <div className={p.figHead}>
        <Label as="span">{label}</Label>
        {scope ? <Coverage scope={scope} /> : null}
      </div>
      <p className={`${p.figValue} bo-num`}>{value}</p>
      {delta ? (
        <p className={`bo-label ${p.delta}`}>
          <span aria-hidden="true">{delta.dir === "up" ? "↑" : delta.dir === "down" ? "↓" : "→"}</span> {delta.text}{" "}
          <span className={p.srcDim}>{delta.against}</span>
        </p>
      ) : null}
      {context ? <p className={p.figContext}>{context}</p> : null}
      {source}
    </div>
  );
}

const LEVELS = [
  { n: "01", name: "Overview" },
  { n: "02", name: "Explore" },
  { n: "03", name: "Data" },
] as const;

/** The three levels of exploration — always visible, so depth is a choice. */
export function LevelStepper({ current, hrefs }: { current: 0 | 1 | 2; hrefs?: [string, string, string] }) {
  return (
    <ol className={p.levels} aria-label="Depth">
      {LEVELS.map((l, i) => (
        <li key={l.n} aria-current={i === current ? "step" : undefined}>
          {hrefs ? (
            <a href={hrefs[i]}>
              <span>{l.n}</span> {l.name}
            </a>
          ) : (
            <span>
              <span>{l.n}</span> {l.name}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Pathway({
  n,
  icon,
  question,
  blurb,
  href,
  children,
}: {
  n: string;
  icon: IconName;
  question: string;
  blurb: string;
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className={p.pathway}>
      <span className={p.pathTop}>
        <span className="bo-label">{n}</span>
        <Icon name={icon} size={26} />
      </span>
      <span className={`bo-ed ${p.pathQ}`}>{question}</span>
      <span className={p.pathBlurb}>{blurb}</span>
      {children ? <span className={p.pathViz}>{children}</span> : null}
      <span className={`bo-label ${p.pathGo}`}>
        Explore <Icon name="arrow" size={14} />
      </span>
    </Link>
  );
}

export function SectionHead({ n, kicker, title, lede, aside }: { n: string; kicker: string; title: ReactNode; lede?: ReactNode; aside?: ReactNode }) {
  return (
    <header className={p.section}>
      <p className={p.sectionNo} aria-hidden="true">
        {n}
      </p>
      <div className={p.sectionBody}>
        <Label>{kicker}</Label>
        <h2 className="bo-d2">{title}</h2>
        {lede ? <p className={p.lede}>{lede}</p> : null}
      </div>
      {aside ? <div className={p.sectionAside}>{aside}</div> : null}
    </header>
  );
}

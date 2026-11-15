"use client";

import { useMemo, useState } from "react";
import { SECTORS } from "@/brand/sectors";
import { useGlossary } from "@/brand/term";
import { matchTerms } from "@/brand/catalogue/terms";
import g from "./glossary.module.css";

const SECTOR_LABEL = new Map<string, string>([["shared", "Across the Exchange"], ...SECTORS.map((s) => [s.id, s.label] as [string, string])]);

export function GlossaryList() {
  const glossary = useGlossary();
  const all = useMemo(() => [...glossary.values()], [glossary]);
  const [q, setQ] = useState("");
  const shown = q.trim() ? matchTerms(all, q, all.length) : all;
  const groups = useMemo(() => {
    const by = new Map<string, typeof shown>();
    for (const t of shown) by.set(t.sector, [...(by.get(t.sector) ?? []), t]);
    return [...by.entries()].sort(([a], [b]) => (a === "shared" ? -1 : b === "shared" ? 1 : a.localeCompare(b)));
  }, [shown]);

  if (all.length === 0) {
    return (
      <p className={g.empty}>
        <span className="bo-label">Unavailable</span>
        <span>The terms registry did not load.</span>
      </p>
    );
  }
  return (
    <div className={g.root}>
      <p className={g.intro}>
        The language behind the numbers. Plain definitions for the acronyms and specialist terms used across the Exchange.
      </p>
      <div className={g.finder}>
        <label className={g.search}>
          <span className="bo-label">Find a term</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search acronyms, words or definitions…" />
        </label>
        <p className={g.count} role="status">{shown.length} {shown.length === 1 ? "term" : "terms"}{q.trim() ? ` matching “${q.trim()}”` : " in the glossary"}</p>
        {groups.length > 0 && <nav className={g.index} aria-label="Glossary sections">
          {groups.map(([sector, terms]) => <a key={sector} href={`#g-${sector}`}>
            {SECTOR_LABEL.get(sector) ?? sector}<span>{terms.length}</span>
          </a>)}
        </nav>}
      </div>
      {groups.length === 0 && <div className={g.empty}><h2 className="bo-d3">No terms found.</h2><p>Try a shorter word or a different spelling.</p><button type="button" onClick={() => setQ("")}>Clear search</button></div>}
      {groups.map(([sector, terms]) => (
        <section key={sector} className={g.group} aria-labelledby={`g-${sector}`}>
          <div className={g.groupHead}><h2 id={`g-${sector}`} className="bo-d3">
            {SECTOR_LABEL.get(sector) ?? sector}
          </h2><span className={g.groupCount}>{terms.length} {terms.length === 1 ? "term" : "terms"}</span></div>
          <dl className={g.list}>
            {terms
              .slice()
              .sort((a, b) => a.short.localeCompare(b.short))
              .map((t) => (
                <div key={t.slug} id={t.slug} className={g.row}>
                  <dt>
                    <b>{t.short}</b>
                    {t.full_name !== t.short && <span>{t.full_name}</span>}
                  </dt>
                  <dd>
                    <p>{t.definition}</p>
                    {t.note && <p className="bo-note">{t.note}</p>}
                    {t.source_url && (
                      <a href={t.source_url} target="_blank" rel="noreferrer">
                        Source <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

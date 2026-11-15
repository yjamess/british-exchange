"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { csvHref, type IndicatorListItem } from "@/lib/api";
import type { PrintOption } from "../PrintSelect";
import { Control, ControlRow, MenuControl, ResetButton, explorerClasses } from "../template";
import { SECTORS } from "../sectors";
import {
  ALL,
  FREQ_WORDS,
  type FreqKey,
  fmtBytes,
  fmtCount,
  fmtDate,
  fmtLatest,
  fmtPeriod,
  fmtSpan,
  freqOf,
  groupByDomain,
  licenceWords,
  placeDetail,
  placeName,
  plainTitle,
  publisherCollection,
  publisherKey,
  publisherName,
  sectorQuestion,
} from "./organise";
import type { ExploreEntry } from "./explore";
import { search } from "./search";
import { useGlossary } from "../term/GlossaryProvider";
import { matchTerms } from "./terms";
import { Well } from "./Well";
import c from "./catalogue.module.css";

/**
 * The data page: every dataset on the Exchange, sector by sector.
 *
 *   A dataset (one registry row, from one source release) holds one or more series — one place
 *   × one breakdown observed over time — and each series holds observations. Counts are live.
 *
 *   head       what the page is, in a sentence, and the live totals
 *   controls   search (everyday words, see search.ts) · sector · source · how often · order —
 *              in the URL, sticky
 *   ledger     one electric slab per sector (condensed capitals, as the index). A slab opens
 *              to paper: its research domains, each a table of datasets. A row opens to its
 *              record card in place. One slab open at a time (`?open=`); while searching, every
 *              slab with a match opens. A dataset id in the hash (`#uk-average-house-price`)
 *              opens its slab and row.
 */

type SortKey = "title" | "release" | "latest" | "longest";

const SORTS: PrintOption<SortKey>[] = [
  { value: "title", label: "A to Z" },
  { value: "release", label: "Recently updated" },
  { value: "latest", label: "Most recent figures" },
  { value: "longest", label: "Longest history" },
];

const FREQS: PrintOption<"all" | FreqKey>[] = [
  { value: "all", label: "Any" },
  { value: "monthly", label: FREQ_WORDS.monthly },
  { value: "quarterly", label: FREQ_WORDS.quarterly },
  { value: "annual", label: FREQ_WORDS.annual },
  { value: "irregular", label: FREQ_WORDS.irregular },
];

const COMPARE: Record<SortKey, (a: IndicatorListItem, b: IndicatorListItem) => number> = {
  title: (a, b) => a.title.localeCompare(b.title, "en-GB"),
  release: (a, b) => b.release_date.localeCompare(a.release_date) || a.title.localeCompare(b.title, "en-GB"),
  latest: (a, b) => b.coverage_end.localeCompare(a.coverage_end) || a.title.localeCompare(b.title, "en-GB"),
  longest: (a, b) =>
    (a.coverage_start || "9999").localeCompare(b.coverage_start || "9999") || a.title.localeCompare(b.title, "en-GB"),
};

const wordsOf = (it: IndicatorListItem, topics: Record<string, string>) =>
  [
    it.title,
    plainTitle(it.title),
    it.indicator_id.replace(/-/g, " "),
    it.publisher,
    publisherName(it.publisher),
    it.series_id,
    it.geography,
    it.unit,
    it.definition,
    topics[it.indicator_id] ?? "",
  ]
    .join(" ")
    .toLowerCase();

export function DataCatalogue({
  items,
  error,
  explore = {},
  topics = {},
}: {
  items: IndicatorListItem[];
  error: string | null;
  /** Where each dataset is explored (server-derived from what each visualisation draws). */
  explore?: Record<string, ExploreEntry>;
  /** Domain titles and questions per dataset, for everyday-word search. */
  topics?: Record<string, string>;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const sectorParam = params.get("sector") ?? ALL;
  const sector = SECTORS.some((s) => s.id === sectorParam) ? sectorParam : ALL;
  const openParam = params.get("open");
  const publisher = params.get("publisher") ?? "all";
  const freq = (params.get("frequency") ?? "all") as "all" | FreqKey;
  const sort = (SORTS.some((s) => s.value === params.get("sort")) ? params.get("sort") : "title") as SortKey;
  const [q, setQ] = useState(params.get("q") ?? "");
  const [openRow, setOpenRow] = useState<string | null>(null);

  /** URL state without a server round trip (brand README: history.replaceState). */
  const setParams = useCallback(
    (next: Record<string, string | null>, hash = window.location.hash) => {
      const u = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "" || v === "all" || (k === "sort" && v === "title")) u.delete(k);
        else u.set(k, v);
      }
      u.delete("record");
      const qs = u.toString();
      window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}${hash}`);
    },
    [pathname],
  );

  /** A series named in the hash (or a redirected `?record=`) opens its slab and its row. */
  useEffect(() => {
    const byId = new Map(items.map((i) => [i.indicator_id, i]));
    const sync = () => {
      const fromQuery = new URLSearchParams(window.location.search).get("record");
      const id = decodeURIComponent(window.location.hash.slice(1)) || fromQuery || "";
      const it = byId.get(id);
      if (!it) return;
      setParams({ open: it.sector }, `#${id}`);
      setOpenRow(id);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "center" }), 450);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [items, setParams]);

  // The open slab: the chosen sector, or the one in the URL.
  const open = sector !== ALL ? sector : openParam;
  const toggleSlab = (id: string) => {
    setOpenRow(null);
    if (sector !== ALL) return;
    setParams({ open: open === id ? null : id }, "");
  };
  const toggleRow = (id: string) => {
    const next = openRow === id ? null : id;
    setOpenRow(next);
    window.history.replaceState(null, "", `${pathname}${window.location.search}${next ? `#${next}` : ""}`);
  };

  const publishers = useMemo(() => {
    const n = new Map<string, number>();
    for (const it of items) n.set(publisherKey(it.publisher), (n.get(publisherKey(it.publisher)) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || publisherName(a[0]).localeCompare(publisherName(b[0])));
  }, [items]);

  const searching = q.trim() !== "";
  const glossary = useGlossary();
  const termHits = useMemo(() => (searching ? matchTerms([...glossary.values()], q) : []), [glossary, q, searching]);
  const filtered = items
    .filter((it) => sector === ALL || it.sector === sector)
    .filter((it) => publisher === "all" || publisherKey(it.publisher) === publisher)
    .filter((it) => freq === "all" || freqOf(it.frequency) === freq);
  const words = useMemo(() => new Map(items.map((it) => [it.indicator_id, wordsOf(it, topics)])), [items, topics]);
  const shown = search(filtered, q, (it) => words.get(it.indicator_id) ?? "").sort(COMPARE[sort]);
  const titleOf = useMemo(() => new Map(items.map((it) => [it.indicator_id, plainTitle(it.title)])), [items]);
  const totals = useMemo(
    () => ({
      datasets: items.length,
      series: items.reduce((n, it) => n + (it.series_count ?? 0), 0),
      observations: items.reduce((n, it) => n + (it.observation_count ?? 0), 0),
    }),
    [items],
  );

  const slabs = SECTORS.map((s, i) => ({
    ...s,
    n: String(i + 1).padStart(2, "0"),
    total: items.filter((it) => it.sector === s.id).length,
    rows: shown.filter((it) => it.sector === s.id),
  })).filter((s) => sector === ALL || s.id === sector);

  const adjusted = q !== "" || publisher !== "all" || freq !== "all" || sort !== "title";
  const reset = () => {
    setQ("");
    setParams({ q: null, publisher: null, frequency: null, sort: null });
  };

  return (
    <div className={c.page}>
      <section className={`bo-wrap ${c.head}`} aria-labelledby="data-heading">
        <p className="bo-label">Data</p>
        <h1 id="data-heading" className="bo-d2">
          Every number, with its source.
        </h1>
        <p className="bo-prose">
          Every figure on the Exchange is traced to the release it came from. Search in everyday words, or open a sector
          and a dataset to see what it measures, how fresh it is, where to explore it, and to download it.
        </p>
        {items.length > 0 && (
          <p className={`bo-label ${c.totals}`}>
            {fmtCount(totals.datasets)} datasets · {fmtCount(totals.series)} series · {fmtCount(totals.observations)}{" "}
            observations
          </p>
        )}
      </section>

      <div className={c.bar}>
        <div className={`bo-wrap ${c.barInner}`}>
          <ControlRow label="Find a dataset">
            <Control label="Search">
              {(id) => (
                <input
                  type="search"
                  className={c.search}
                  aria-labelledby={id}
                  placeholder="A name, a source, or a question"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setParams({ q: e.target.value.trim() });
                  }}
                />
              )}
            </Control>
            <MenuControl
              label="Sector"
              value={sector}
              options={[{ value: ALL, label: "All sectors" }, ...SECTORS.map((s) => ({ value: s.id, label: s.label }))]}
              onChange={(v) => {
                setOpenRow(null);
                setParams({ sector: v === ALL ? null : v, open: null }, "");
              }}
            />
            <MenuControl
              label="Source"
              value={publisher}
              options={[
                { value: "all", label: "Any source" },
                ...publishers.map(([p, n]) => ({ value: p, label: `${publisherName(p)} (${n})` })),
              ]}
              onChange={(v) => setParams({ publisher: v })}
            />
            <MenuControl label="How often" value={freq} options={FREQS} onChange={(v) => setParams({ frequency: v })} />
            <MenuControl label="Order" value={sort} options={SORTS} onChange={(v) => setParams({ sort: v })} />
            {adjusted && <ResetButton onClick={reset} />}
          </ControlRow>
          <p className={c.count} aria-live="polite">
            {shown.length === items.length
              ? `${fmtCount(items.length)} datasets`
              : `${fmtCount(shown.length)} of ${fmtCount(items.length)} datasets`}
          </p>
        </div>
      </div>

      <main className={`bo-wrap ${c.main}`}>
        {error && (
          <p className={c.empty}>
            <span className="bo-label">Unavailable</span>
            <span>The list could not be loaded from the data service. {error}</span>
          </p>
        )}
        {!error && shown.length === 0 && (
          <p className={c.empty}>
            <span className="bo-label">Nothing found</span>
            <span>
              Nothing matches.{" "}
              <button type="button" className={c.inlineButton} onClick={reset}>
                Clear the search and filters
              </button>
              .
            </span>
          </p>
        )}

        {!error && termHits.length > 0 && (
          <section className={c.terms} aria-label="Terms">
            <p className="bo-label">Terms</p>
            <dl>
              {termHits.map((term) => (
                <div key={term.slug}>
                  <dt>
                    <Link href={`/glossary#${term.slug}`}>{term.short}</Link>
                  </dt>
                  <dd>{term.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {!error && (
          <ol className={c.ledger} aria-label="Sectors">
            {slabs.map((s) => {
              // While searching, every sector with a match is open, so results are never hidden.
              const isOpen = searching ? s.rows.length > 0 : open === s.id;
              const [first, ...rest] = s.label.split(" ");
              const panel = `${s.id}-series`;
              const groups = groupByDomain(s.id, s.rows);
              return (
                <li key={s.id} id={s.id} className={c.slab} data-open={isOpen || undefined} data-empty={s.rows.length === 0 || undefined}>
                  <button
                    type="button"
                    className={c.slabToggle}
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    disabled={s.rows.length === 0}
                    onClick={() => toggleSlab(s.id)}
                  >
                    <span className={`bo-label ${c.slabNum}`}>{s.n}</span>
                    <span className={`bo-caps ${c.slabName}`}>
                      <b>{first}</b> {rest.join(" ")}
                    </span>
                    <span className={`bo-label ${c.slabMeta}`}>
                      <span>
                        {s.rows.length === s.total
                          ? `${fmtCount(s.total)} datasets`
                          : `${fmtCount(s.rows.length)} of ${fmtCount(s.total)} datasets`}
                      </span>
                      {sector === ALL && !searching && <span aria-hidden="true">{isOpen ? "−" : "+"}</span>}
                    </span>
                  </button>

                  <Well open={isOpen} id={panel} label={`${s.label} datasets`}>
                    <div className={c.slabBody}>
                      <p className={`bo-d3 ${c.slabQuestion}`}>{sectorQuestion(s.id)}</p>
                      <div className={c.groups}>
                        {groups.map((g) => (
                          <section key={g.id} className={explorerClasses.tableGroup} aria-labelledby={`${s.id}-${g.id}-h`}>
                            <h3 id={`${s.id}-${g.id}-h`} className={c.groupTitle}>
                              {g.title}
                            </h3>
                            <table className={c.table}>
                              <colgroup>
                                <col className={c.colSeries} />
                                <col className={c.colPlace} />
                                <col className={c.colPeriod} />
                                <col className={c.colUpdated} />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th scope="col">Dataset</th>
                                  <th scope="col">Where</th>
                                  <th scope="col">Covers</th>
                                  <th scope="col">Published</th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.rows.map((it) => {
                                  const rowOpen = openRow === it.indicator_id;
                                  const rowPanel = `${it.indicator_id}-record`;
                                  return (
                                    <tr key={it.indicator_id} id={it.indicator_id} className={c.row} data-open={rowOpen || undefined}>
                                      <th scope="row" className={c.titleCell}>
                                        <button
                                          type="button"
                                          className={c.rowButton}
                                          aria-expanded={rowOpen}
                                          aria-controls={rowPanel}
                                          onClick={() => toggleRow(it.indicator_id)}
                                        >
                                          <span className={c.title}>{plainTitle(it.title)}</span>
                                          <span className={c.source}>
                                            {publisherName(it.publisher)}
                                            {publisherCollection(it.publisher) ? ` · ${publisherCollection(it.publisher)}` : ""}
                                            {it.series_count ? ` · ${fmtCount(it.series_count)} series` : ""}
                                          </span>
                                        </button>
                                        <Well open={rowOpen} id={rowPanel} rule label="Dataset record">
                                          <RecordBody it={it} explore={explore[it.indicator_id]} titleOf={titleOf} />
                                        </Well>
                                      </th>
                                      <td data-label="Where">{placeName(it.geography)}</td>
                                      <td data-label="Covers">{fmtPeriod(it)}</td>
                                      <td data-label="Published" className={c.nowrap}>
                                        {fmtDate(it.release_date)}
                                        <a
                                          href={csvHref(it.indicator_id)}
                                          download
                                          className={c.csv}
                                          aria-label={`Download ${plainTitle(it.title)} as a spreadsheet`}
                                        >
                                          Download{it.csv_bytes ? ` · ${fmtBytes(it.csv_bytes)}` : ""}
                                        </a>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </section>
                        ))}
                      </div>
                      {s.page && (
                        <p className={`bo-label ${c.slabFoot}`}>
                          <Link href={s.page}>Open the {s.label} page</Link>
                        </p>
                      )}
                    </div>
                  </Well>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}

/**
 * The record card: the story on the left (what it measures, worth knowing, where to explore it,
 * questions it helps answer, datasets shown alongside, to cite, the ways out), the register on
 * the right (label · value rows behind hairlines). Explore appears only where a live
 * visualisation declares this dataset; otherwise the record keeps its metadata and download.
 */
function RecordBody({
  it,
  explore,
  titleOf,
}: {
  it: IndicatorListItem;
  explore?: ExploreEntry;
  titleOf: Map<string, string>;
}) {
  const series = it.series_count ?? 0;
  const register: { label: string; value: string }[] = [
    { label: "Source", value: publisherName(it.publisher) + (publisherCollection(it.publisher) ? ` · ${publisherCollection(it.publisher)}` : "") },
    { label: "Where", value: placeDetail(it.geography) },
    { label: "How often", value: FREQ_WORDS[freqOf(it.frequency)] },
    { label: "Covers", value: fmtSpan(it) || "—" },
    { label: "Latest figures", value: fmtLatest(it) },
    { label: "Source published", value: it.release_date ? fmtDate(it.release_date) : "Not recorded" },
    { label: "Exchange checked", value: it.retrieved_at ? fmtDate(it.retrieved_at) : "Not recorded" },
    ...(it.status_note ? [{ label: "About the dates", value: it.status_note }] : []),
    ...(series ? [{ label: "Series", value: fmtCount(series) }] : []),
    { label: "Observations", value: fmtCount(it.observation_count) },
    { label: "Measured in", value: it.unit || "—" },
    { label: "Licence", value: licenceWords(it.licence) },
    { label: "Reference", value: [it.series_id, it.indicator_id].filter(Boolean).join(" · ") },
  ];
  const download = series > 1
    ? `Download all ${fmtCount(series)} series (${fmtCount(it.observation_count)} observations)`
    : `Download the series (${fmtCount(it.observation_count)} observations)`;
  const questions = [...new Map((explore?.destinations ?? []).map((d) => [d.question, d])).values()];
  return (
    <div className={c.record}>
      <div className={c.story}>
        <div>
          <p className={`bo-label ${c.recordLabel}`}>What it measures</p>
          <p className={c.recordProse}>{it.definition || "No definition has been written for this dataset yet."}</p>
        </div>
        {it.caveats && (
          <div>
            <p className={`bo-label ${c.recordLabel}`}>Worth knowing</p>
            <p className={c.recordNote}>{it.caveats}</p>
          </div>
        )}
        {explore && explore.destinations.length > 0 && (
          <div>
            <p className={`bo-label ${c.recordLabel}`}>Explore</p>
            <ul className={c.related}>
              {explore.destinations.map((d) => (
                <li key={d.href}>
                  <Link href={d.href}>Explore in {d.title}</Link>
                  <span>{d.sector}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {questions.length > 0 && (
          <div>
            <p className={`bo-label ${c.recordLabel}`}>Questions it helps answer</p>
            <ul className={c.related}>
              {questions.map((d) => (
                <li key={d.question}>
                  <Link href={d.href}>{d.question}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {explore && explore.alongside.length > 0 && (
          <div>
            <p className={`bo-label ${c.recordLabel}`}>Shown alongside</p>
            <ul className={c.related}>
              {explore.alongside.map((id) => (
                <li key={id}>
                  <a href={`#${id}`}>{titleOf.get(id) ?? id}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className={`bo-label ${c.recordLabel}`}>To cite</p>
          <p className={c.recordNote}>
            {publisherName(it.publisher)}. {plainTitle(it.title)}.{it.release_date ? ` Released ${fmtDate(it.release_date)}.` : ""} Via British
            Exchange, dataset {it.indicator_id}.
          </p>
        </div>
        <p className={c.ways}>
          <a href={csvHref(it.indicator_id)} download>
            {download}
            {it.csv_bytes ? `, ${fmtBytes(it.csv_bytes)}` : ""}
          </a>
          <a href={it.source_url} target="_blank" rel="noreferrer">
            Official release
          </a>
        </p>
      </div>
      <dl className={c.register}>
        {register.map((f) => (
          <div key={f.label} className={c.registerRow}>
            <dt className="bo-label">{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

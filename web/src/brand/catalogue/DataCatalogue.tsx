"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { csvHref, type IndicatorListItem } from "@/lib/api";
import type { PrintOption } from "../PrintSelect";
import { Control, ControlRow, Coverage, MenuControl, ResetButton } from "../template";
import { SECTORS, sectorLabel } from "../sectors";
import c from "./catalogue.module.css";

/**
 * The data catalogue: every Ready series, one section per sector.
 * Search, filter (sector · publisher · frequency) and sort live in the URL;
 * a row opens in place and its id is the hash (`/data#uk-average-house-price`).
 */

type SortKey = "title" | "latest" | "longest" | "count" | "release";
type FreqKey = "monthly" | "quarterly" | "annual" | "irregular";

const SORTS: PrintOption<SortKey>[] = [
  { value: "title", label: "Title A–Z" },
  { value: "latest", label: "Latest period" },
  { value: "longest", label: "Longest record" },
  { value: "count", label: "Most observations" },
  { value: "release", label: "Newest release" },
];

const FREQS: PrintOption<"all" | FreqKey>[] = [
  { value: "all", label: "Any frequency" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "irregular", label: "Snapshot / irregular" },
];

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function freqOf(f: string): FreqKey {
  const w = f.toLowerCase();
  if (w.startsWith("monthly")) return "monthly";
  if (w.startsWith("quarterly")) return "quarterly";
  if (w.startsWith("annual")) return "annual";
  return "irregular";
}

/** Filterable publisher: the body before any " · " collection name; ONS spelled one way. */
function publisherOf(p: string): string {
  const head = p.split(" · ")[0]!.trim();
  return head === "Office for National Statistics" ? "ONS" : head;
}

const ymd = (iso: string) => iso.slice(0, 10).split("-").map(Number) as [number, number, number];

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = ymd(iso);
  return `${d} ${MON[m - 1]} ${y}`;
}

function fmtCoverage(it: IndicatorListItem): string {
  if (!it.coverage_start || !it.coverage_end) return "—";
  const [sy, sm] = ymd(it.coverage_start);
  const [ey, em] = ymd(it.coverage_end);
  const f = freqOf(it.frequency);
  if (f === "monthly") return `${MON[sm - 1]} ${sy} – ${MON[em - 1]} ${ey}`;
  if (f === "quarterly") return `Q${Math.ceil(sm / 3)} ${sy} – Q${Math.ceil(em / 3)} ${ey}`;
  return sy === ey ? String(sy) : `${sy}–${ey}`;
}

/** "United Kingdom (K02000001); excl. Crown dependencies" → "United Kingdom". */
const shortGeo = (g: string) => g.split(";")[0]!.replace(/\s*\([^)]*\)/g, "").trim();

const fmtCount = (n: number) => n.toLocaleString("en-GB");

function fmtBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

const haystack = (it: IndicatorListItem) =>
  [it.title, it.indicator_id, it.publisher, it.series_id, it.geography, it.unit, it.definition]
    .join(" ")
    .toLowerCase();

const COMPARE: Record<SortKey, (a: IndicatorListItem, b: IndicatorListItem) => number> = {
  title: (a, b) => a.title.localeCompare(b.title, "en-GB"),
  latest: (a, b) => b.coverage_end.localeCompare(a.coverage_end) || a.title.localeCompare(b.title, "en-GB"),
  longest: (a, b) =>
    (a.coverage_start || "9999").localeCompare(b.coverage_start || "9999") || a.title.localeCompare(b.title, "en-GB"),
  count: (a, b) => b.observation_count - a.observation_count || a.title.localeCompare(b.title, "en-GB"),
  release: (a, b) => b.release_date.localeCompare(a.release_date) || a.title.localeCompare(b.title, "en-GB"),
};

export function DataCatalogue({ items, error }: { items: IndicatorListItem[]; error: string | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const sector = params.get("sector") ?? "all";
  const publisher = params.get("publisher") ?? "all";
  const freq = (params.get("frequency") ?? "all") as "all" | FreqKey;
  const sort = (SORTS.some((s) => s.value === params.get("sort")) ? params.get("sort") : "title") as SortKey;
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState<string | null>(null);

  /** URL state without a server round trip (brand README: history.replaceState). */
  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const u = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "" || v === "all" || (k === "sort" && v === "title")) u.delete(k);
        else u.set(k, v);
      }
      u.delete("record");
      const qs = u.toString();
      window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    },
    [pathname],
  );

  /** Open the row named by the hash (or a redirected `?record=`), and bring it into view. */
  useEffect(() => {
    const ids = new Set(items.map((i) => i.indicator_id));
    const sync = () => {
      const fromQuery = new URLSearchParams(window.location.search).get("record");
      const id = decodeURIComponent(window.location.hash.slice(1)) || fromQuery || "";
      if (!ids.has(id)) return;
      if (fromQuery) {
        window.history.replaceState(null, "", `${pathname}#${id}`);
      }
      setOpen(id);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [items, pathname]);

  const toggle = (id: string) => {
    const next = open === id ? null : id;
    setOpen(next);
    const u = window.location.search;
    window.history.replaceState(null, "", `${pathname}${u}${next ? `#${next}` : ""}`);
  };

  const publishers = useMemo(() => {
    const n = new Map<string, number>();
    for (const it of items) n.set(publisherOf(it.publisher), (n.get(publisherOf(it.publisher)) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items
    .filter((it) => sector === "all" || it.sector === sector)
    .filter((it) => publisher === "all" || publisherOf(it.publisher) === publisher)
    .filter((it) => freq === "all" || freqOf(it.frequency) === freq)
    .filter((it) => {
      if (tokens.length === 0) return true;
      const h = haystack(it);
      return tokens.every((t) => h.includes(t));
    })
    .sort(COMPARE[sort]);

  const sections = SECTORS.map((s) => ({ ...s, rows: shown.filter((it) => it.sector === s.id) }))
    .concat(
      // Any sector the list does not know yet still gets a section.
      [...new Set(shown.map((it) => it.sector))]
        .filter((id) => !SECTORS.some((s) => s.id === id))
        .map((id) => ({ id, label: sectorLabel(id), page: undefined, rows: shown.filter((it) => it.sector === id) })),
    )
    .filter((s) => s.rows.length > 0);

  const adjusted = q !== "" || sector !== "all" || publisher !== "all" || freq !== "all" || sort !== "title";
  const reset = () => {
    setQ("");
    setParams({ q: null, sector: null, publisher: null, frequency: null, sort: null });
  };

  const latestRelease = items.reduce((m, it) => (it.release_date > m ? it.release_date : m), "");

  return (
    <div className={c.page}>
      <header className={c.mast}>
        <div className={`bo-wrap ${c.mastInner}`}>
          <Link href="/" className={`bo-statement ${c.wordmark}`}>
            British Exchange
          </Link>
          <nav aria-label="Breadcrumb" className="bo-label">
            <span aria-current="page">Data</span>
          </nav>
        </div>
      </header>

      <section className={`bo-wrap ${c.head}`} aria-labelledby="data-heading">
        <p className="bo-label">Data</p>
        <h1 id="data-heading" className="bo-d2">
          Every series, with its source.
        </h1>
        <p className="bo-prose">
          Each series is pinned to an official release and checked against the published figures. Open a row for its
          definition, licence and evidence.
        </p>
        {items.length > 0 && (
          <Coverage
            items={[
              { label: "Series", value: fmtCount(items.length) },
              { label: "Sectors", value: new Set(items.map((i) => i.sector)).size },
              { label: "Publishers", value: publishers.length },
              { label: "Latest release", value: fmtDate(latestRelease) },
            ]}
          />
        )}
      </section>

      <div className={c.bar}>
        <div className={`bo-wrap ${c.barInner}`}>
          <ControlRow label="Search and filter the catalogue">
            <Control label="Search">
              {(id) => (
                <input
                  type="search"
                  className={c.search}
                  aria-labelledby={id}
                  placeholder="Title, publisher, series code…"
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
              options={[{ value: "all", label: "All sectors" }, ...SECTORS.map((s) => ({ value: s.id, label: s.label }))]}
              onChange={(v) => setParams({ sector: v })}
            />
            <MenuControl
              label="Publisher"
              value={publisher}
              options={[
                { value: "all", label: "All publishers" },
                ...publishers.map(([p, n]) => ({ value: p, label: `${p} (${n})` })),
              ]}
              onChange={(v) => setParams({ publisher: v })}
            />
            <MenuControl label="Frequency" value={freq} options={FREQS} onChange={(v) => setParams({ frequency: v })} />
            <MenuControl label="Sort" value={sort} options={SORTS} onChange={(v) => setParams({ sort: v })} />
            {adjusted && <ResetButton onClick={reset} />}
          </ControlRow>
          <p className={c.count} aria-live="polite">
            {shown.length === items.length
              ? `${fmtCount(items.length)} series`
              : `${fmtCount(shown.length)} of ${fmtCount(items.length)} series`}
          </p>
        </div>
      </div>

      <main className={`bo-wrap ${c.main}`}>
        {error && (
          <div className={c.empty}>
            <p className="bo-label">Unavailable</p>
            <p>The catalogue could not be loaded from the data service. {error}</p>
          </div>
        )}
        {!error && sections.length === 0 && (
          <div className={c.empty}>
            <p className="bo-label">No match</p>
            <p>
              No series match these filters.{" "}
              <button type="button" className={c.inlineButton} onClick={reset}>
                Clear them
              </button>
              .
            </p>
          </div>
        )}

        {sections.map((s) => (
          <section key={s.id} id={s.id} className={c.section} aria-labelledby={`${s.id}-h`}>
            <header className={c.sectionHead}>
              <h2 id={`${s.id}-h`} className="bo-d3">
                {s.label}
              </h2>
              <p className="bo-label">
                {s.rows.length} series
                {s.page && (
                  <>
                    {" · "}
                    <Link href={s.page}>Open {s.label}</Link>
                  </>
                )}
              </p>
            </header>

            <table className={c.table}>
              {/* Fixed widths so columns line up from one sector to the next. */}
              <colgroup>
                <col className={c.colSeries} />
                <col className={c.colPublisher} />
                <col className={c.colGeo} />
                <col className={c.colFreq} />
                <col className={c.colCoverage} />
                <col className={c.colCount} />
                <col className={c.colRelease} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Series</th>
                  <th scope="col">Publisher</th>
                  <th scope="col">Geography</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Coverage</th>
                  <th scope="col" className={c.num}>
                    Observations
                  </th>
                  <th scope="col">Release</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((it) => {
                  const isOpen = open === it.indicator_id;
                  const panel = `${it.indicator_id}-record`;
                  return (
                    <Fragment key={it.indicator_id}>
                      <tr id={it.indicator_id} className={c.row} data-open={isOpen || undefined}>
                        <th scope="row" className={c.titleCell}>
                          <button
                            type="button"
                            className={c.rowButton}
                            aria-expanded={isOpen}
                            aria-controls={panel}
                            onClick={() => toggle(it.indicator_id)}
                          >
                            <span className={c.title}>{it.title}</span>
                            <span className={c.id}>{it.indicator_id}</span>
                          </button>
                        </th>
                        <td data-label="Publisher">{it.publisher}</td>
                        <td data-label="Geography">{shortGeo(it.geography)}</td>
                        <td data-label="Frequency" className={c.cap}>
                          {FREQS.find((f) => f.value === freqOf(it.frequency))?.label}
                        </td>
                        <td data-label="Coverage" className={c.nowrap}>
                          {fmtCoverage(it)}
                        </td>
                        <td data-label="Observations" className={c.num}>
                          {fmtCount(it.observation_count)}
                        </td>
                        <td data-label="Release" className={c.nowrap}>
                          {fmtDate(it.release_date)}
                          <a href={csvHref(it.indicator_id)} download className={c.csv} aria-label={`Download ${it.title} as CSV`}>
                            CSV{it.csv_bytes ? ` · ${fmtBytes(it.csv_bytes)}` : ""}
                          </a>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className={c.recordRow}>
                          <td colSpan={7}>
                            <Record it={it} id={panel} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </main>
    </div>
  );
}

/** The citable record for one series, opened in place. */
function Record({ it, id }: { it: IndicatorListItem; id: string }) {
  const facts: { label: string; value: string }[] = [
    { label: "Unit", value: it.unit },
    { label: "Series code", value: it.series_id },
    { label: "Geography", value: it.geography },
    { label: "Frequency", value: it.frequency },
    { label: "Coverage", value: `${fmtCoverage(it)} · ${fmtCount(it.observation_count)} observations` },
    { label: "Licence", value: it.licence || "—" },
    { label: "Official release", value: fmtDate(it.release_date) },
    { label: "Retrieved", value: fmtDate(it.retrieved_at) },
  ];
  return (
    <div id={id} className={c.record}>
      <div className={c.recordText}>
        {it.definition && <p className="bo-prose">{it.definition}</p>}
        {it.caveats && (
          <p className="bo-note">
            <span className="bo-label">Caveats </span>
            {it.caveats}
          </p>
        )}
        <p className={c.links}>
          <a href={csvHref(it.indicator_id)} download>
            Download CSV{it.csv_bytes ? ` · ${fmtBytes(it.csv_bytes)}` : ""}
          </a>
          <a href={it.source_url} target="_blank" rel="noreferrer">
            Source · {it.publisher}
          </a>
        </p>
        <p className="bo-note">
          <span className="bo-label">Cite as </span>
          {it.publisher}. {it.title}. Released {fmtDate(it.release_date)}. {it.licence}. Via British Exchange, series{" "}
          {it.indicator_id}.
        </p>
      </div>
      <dl className={c.facts}>
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="bo-label">{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

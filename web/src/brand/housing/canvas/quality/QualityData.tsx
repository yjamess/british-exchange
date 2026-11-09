"use client";

/**
 * Domain 07 — Data. The provenance desk for every housing quality measure: observation type,
 * coverage, breakdowns, release, original publication, Exchange record, citation, the original
 * measurements as a table, and the series CSV (the catalogue file: every published cell, suppressed /
 * not-collected included).
 */

import { useEffect, useMemo, useState } from "react";
import { ControlRow, MenuControl, explorerClasses as t, fmtT } from "../../..";
import { FEATURES, TENURES, type Basis } from "./cutaway/features";
import { prettyCat } from "./cutaway/evidence";
import { useQualityEvidence } from "./cutaway/useEvidence";
import { BasisTag } from "./parts";
import type { InsideFoot } from "./InsideHomes";
import q from "../plate.module.css";

const TYPE: Record<string, Basis> = {
  "ehs-damp-mould-reported": "survey-response",
  "ehs-energy-improvement": "modelled-derived",
};
const typeOf = (id: string): Basis => TYPE[id] ?? (id.startsWith("epc-") ? "administrative-record" : "survey-estimate");

const BK_LABEL: Record<string, string> = {
  none: "Tenure",
  "dwelling-age": "Dwelling age",
  "dwelling-type": "Dwelling type",
  "floor-area": "Floor area",
  region: "Region",
  "sub-national-area": "Survey area",
};

export function QualityData({
  indicator = "",
  onIndicator,
  onFoot,
}: {
  /** Selected indicator. The stage source line reads the same id. */
  indicator?: string;
  onIndicator?: (id: string) => void;
  onFoot?: (foot: InsideFoot) => void;
}) {
  const { evidence, failed } = useQualityEvidence();
  const ids = useMemo(() => Object.keys(evidence?.sources ?? {}), [evidence]);
  const ind = indicator && ids.includes(indicator) ? indicator : (ids[0] ?? null);
  useEffect(() => {
    if (ind && indicator !== ind) onIndicator?.(ind);
    // `onIndicator` is a fresh function each render. The indicator string is the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ind, indicator]);
  const src = ind ? evidence?.sources[ind] : undefined;
  const cells = useMemo(() => (evidence?.cells ?? []).filter((c) => c.ind === ind), [evidence, ind]);

  const meta = useMemo(() => {
    const years = [...new Set(cells.map((c) => c.year))].sort((a, b) => a - b);
    const series = [...new Set(cells.map((c) => c.series))];
    const bks = [...new Set(cells.map((c) => c.bk))];
    const tenures = TENURES.filter((t) => cells.some((c) => c.tenure === t.id)).map((t) => t.label);
    const supp = cells.filter((c) => c.status === "suppressed").length;
    const miss = cells.filter((c) => c.status === "missing").length;
    return { years, series, bks, tenures, supp, miss };
  }, [cells]);

  const [seriesPick, setSeriesPick] = useState<string | null>(null);
  const headline = FEATURES.find((f) => f.ind === ind)?.series;
  const seriesId =
    seriesPick && meta.series.includes(seriesPick)
      ? seriesPick
      : headline && meta.series.includes(headline)
        ? headline
        : meta.series[0];
  const preview = useMemo(
    () =>
      cells
        .filter((c) => c.series === seriesId && c.bk === "none" && c.tenure === "all-tenures")
        .sort((a, b) => b.t - a.t),
    [cells, seriesId],
  );

  const accessed = new Date().toISOString().slice(0, 10);
  const citation = src ? `${src.publisher}. ${src.title}. ${src.release}. Accessed ${accessed} via The British Exchange.` : "";
  useEffect(() => {
    onFoot?.({ source: citation, coverage: "", caveats: [], dataHref: ind ? `/data#${ind}` : "/data" });
  }, [onFoot, citation, ind]);

  if (failed) return <p className={q.note}>The survey tables could not be loaded. Try again later.</p>;
  if (!evidence || !ind) return <p className={q.note}>Loading the evidence…</p>;
  const basis = typeOf(ind);

  return (
    <div className={q.root}>
      <p className={q.lede}>
        One indicator at a time, as published: its observation type, coverage and the original measurements, including cells the source suppresses or did not collect. English Housing Survey estimates stay separate from the domestic EPC certificate register, which is not loaded here. The file is on the data page.
      </p>

      <ControlRow label="Data controls">
        <MenuControl
          label="Indicator"
          value={ind}
          options={ids.map((x) => ({
            value: x,
            label: evidence.sources[x]!.title,
          }))}
          onChange={(next) => {
            setSeriesPick(null);
            onIndicator?.(next);
          }}
        />
        {meta.series.length > 1 && seriesId ? (
          <MenuControl
            label="Series"
            value={seriesId}
            options={meta.series.map((x) => ({ value: x, label: prettyCat("none", x) }))}
            onChange={setSeriesPick}
          />
        ) : null}
      </ControlRow>

      <div className={q.plate}>
        <div className={q.plateMain}>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Value</th>
                  <th scope="col">Status</th>
                  <th scope="col">Unweighted base</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((c) => (
                  <tr key={`${c.series}-${c.t}`}>
                    <th scope="row">{c.label || fmtT(c.year, "annual")}</th>
                    <td>
                      {c.v == null
                        ? "—"
                        : c.v.toLocaleString("en-GB", {
                            maximumFractionDigits: 1,
                          })}
                    </td>
                    <td>{c.status}</td>
                    <td>{c.n ? c.n.toLocaleString("en-GB") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={t.tableNote}>
            This table is one series. Other series in the same indicator are a different dimension — choose them above. The unweighted base is the published sample count, not a confidence interval. {cells.length.toLocaleString("en-GB")} published cells in this indicator · {meta.supp} suppressed in the source · {meta.miss} not collected. The file on the data page holds every breakdown.
          </p>
        </div>

        <aside className={q.panel} aria-label={`${src?.title ?? ind} provenance`}>
          <p className="bo-label">Provenance</p>
          <BasisTag basis={basis} />
          <dl className={q.facts}>
            <div>
              <dt className="bo-label">Publisher</dt>
              <dd>{src?.publisher}</dd>
            </div>
            <div>
              <dt className="bo-label">Release</dt>
              <dd>{src?.release || "—"}</dd>
            </div>
            <div>
              <dt className="bo-label">Unit</dt>
              <dd>{src?.unit}</dd>
            </div>
            <div>
              <dt className="bo-label">Coverage</dt>
              <dd>
                England · {meta.years[0]}–{meta.years[meta.years.length - 1]} · {meta.years.length} periods
              </dd>
            </div>
            <div>
              <dt className="bo-label">Breakdowns</dt>
              <dd>{meta.bks.map((b) => BK_LABEL[b] ?? b).join(" · ")}</dd>
            </div>
            <div>
              <dt className="bo-label">Tenures</dt>
              <dd>{meta.tenures.join(", ")}</dd>
            </div>
            <div>
              <dt className="bo-label">Series</dt>
              <dd>{meta.series.join(", ")}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

"use client";

/**
 * Domain 07 — Data. The provenance desk for every housing quality measure: observation type,
 * coverage, breakdowns, release, original publication, Exchange record, citation, the original
 * measurements as a table, and the series CSV (the catalogue file: every published cell, suppressed /
 * not-collected included).
 */

import { useMemo } from "react";
import { ControlRow, EmptyStage, MenuControl, ResetButton, explorerClasses as t, fmtT } from "../../..";
import { FEATURES, TENURES, type Basis } from "./cutaway/features";
import { prettyCat } from "./cutaway/evidence";
import type { Evidence } from "./cutaway/useEvidence";
import { BasisTag } from "./parts";
import type { QualityDataState, QualityFoot } from "./state";
import gen from "../../../energy/generation.module.css";
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

export function qualityDataFoot(state: QualityDataState, evidence: Evidence | null): QualityFoot {
  const src = state.indicator ? evidence?.sources[state.indicator] : undefined;
  const accessed = new Date().toISOString().slice(0, 10);
  const citation = src
    ? `${src.publisher}. ${src.title}. ${src.release}. Accessed ${accessed} via The British Exchange.`
    : "MHCLG · English Housing Survey";
  return {
    definition:
      "One indicator at a time, as published: observation type, coverage and original measurements, including suppressed and not-collected cells.",
    method: [
      "English Housing Survey estimates stay separate from the domestic EPC certificate register, which is not loaded here.",
      "The file is on the data page.",
    ],
    source: citation,
    dataHref: state.indicator ? `/data#${state.indicator}` : "/data",
  };
}

type DataShared = {
  state: QualityDataState;
  onChange: (next: Partial<QualityDataState>) => void;
  evidence: Evidence | null;
  failed: boolean;
};

export function QualityDataControls({ state, onChange, evidence, failed }: DataShared) {
  const ids = useMemo(() => Object.keys(evidence?.sources ?? {}), [evidence]);
  const ind = state.indicator && ids.includes(state.indicator) ? state.indicator : (ids[0] ?? "");
  const cells = useMemo(() => (evidence?.cells ?? []).filter((c) => c.ind === ind), [evidence, ind]);
  const series = [...new Set(cells.map((c) => c.series))];
  const headline = FEATURES.find((f) => f.ind === ind)?.series;
  const seriesId =
    state.series && series.includes(state.series)
      ? state.series
      : headline && series.includes(headline)
        ? headline
        : series[0] ?? null;
  if (failed || !evidence || !ind) {
    return (
      <ControlRow label="Data controls">
        <Unavailableish failed={failed} />
      </ControlRow>
    );
  }
  return (
    <ControlRow label="Data controls">
      <MenuControl
        label="Indicator"
        value={ind}
        options={ids.map((x) => ({ value: x, label: evidence.sources[x]!.title }))}
        onChange={(next) => onChange({ indicator: next, series: null })}
      />
      {series.length > 1 && seriesId ? (
        <MenuControl
          label="Series"
          value={seriesId}
          options={series.map((x) => ({ value: x, label: prettyCat("none", x) }))}
          onChange={(v) => onChange({ series: v })}
        />
      ) : null}
      {(state.indicator !== (ids[0] ?? "") || state.series != null) && (
        <ResetButton onClick={() => onChange({ indicator: ids[0] ?? "", series: null })} />
      )}
    </ControlRow>
  );
}

function Unavailableish({ failed }: { failed: boolean }) {
  return <p className="bo-label">{failed ? "Evidence unavailable" : "Loading…"}</p>;
}

export function QualityData({ state, onChange, evidence, failed }: DataShared) {
  const ids = useMemo(() => Object.keys(evidence?.sources ?? {}), [evidence]);
  const ind = state.indicator && ids.includes(state.indicator) ? state.indicator : (ids[0] ?? null);
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

  const headline = FEATURES.find((f) => f.ind === ind)?.series;
  const seriesId =
    state.series && meta.series.includes(state.series)
      ? state.series
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

  if (failed) {
    return <EmptyStage label="In preparation">The survey tables could not be loaded. No estimated figures.</EmptyStage>;
  }
  if (!evidence || !ind) {
    return <EmptyStage label="Loading">Loading the evidence…</EmptyStage>;
  }
  const basis = typeOf(ind);

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>{src?.title ?? ind} · England · all tenures</h3>
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
          This table is one series. Other series in the same indicator are a different dimension — choose them above. The unweighted base is the published sample count, not a confidence interval. {cells.length.toLocaleString("en-GB")} published cells in this indicator · {meta.supp} suppressed in the source · {meta.miss} not collected.
        </p>
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Provenance</h3>
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
      </section>
    </div>
  );
}

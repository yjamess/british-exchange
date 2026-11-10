"use client";

/**
 * Domain 07 — Inside the home. The signature visual: an engraved 3D cutaway of a British home
 * that opens into selectable layers (energy, damp and mould, safety, space, physical condition).
 *
 * Select a feature → the panel shows the estimate, one sentence of definition, a short evidence
 * line (type and sample), then the comparisons and the trend. Coverage, caveats and the source
 * live in the stage record.
 * Filters follow the feature and only offer what the English Housing Survey publishes:
 *   archetype (dwelling age / type / floor area)  ⟂  area (England · regions · survey areas)
 *   tenure, period — narrowed to the cells that exist for the current selection.
 * Nothing is estimated for a finer level. The drawing does not describe any particular property.
 */

import { useEffect, useMemo, useState } from "react";
import { ChipToggles, ControlRow, DualScramble, DUAL_DIGITS, EmptyStage, MenuControl, RankBars, ResetButton, TimeChart, explorerClasses as tc } from "../../..";
import { HomeCutaway3D } from "./cutaway/HomeCutaway3D";
import { BASIS, FEATURES, LAYERS, TENURES } from "./cutaway/features";
import { ENGLAND, archetypesOf, areasOf, caveatsOf, prettyCat, slice, type Breakdown, type Cell } from "./cutaway/evidence";
import type { Evidence } from "./cutaway/useEvidence";
import { BasisTag, UnavailableControl } from "./parts";
import type { InsideState, QualityFoot } from "./state";
import q from "../plate.module.css";
import h from "./insideHomes.module.css";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);

function cellText(c: Cell | undefined): string {
  if (!c) return "—";
  if (c.status === "suppressed") return "u";
  if (c.status === "missing") return "n/c";
  return pct(c.v);
}

function periodLabel(c: Cell | undefined, year: number | null): string {
  if (c?.label) return c.label;
  return year != null ? String(year) : "—";
}

export function insideHomesFoot(
  state: InsideState,
  evidence: Evidence | null,
): QualityFoot {
  const cells = evidence?.cells ?? [];
  const feature = FEATURES.find((f) => f.id === state.feature) ?? FEATURES[0]!;
  const archetypes = archetypesOf(cells, feature.ind, feature.series);
  const areas = areasOf(cells, feature.ind, feature.series);
  const arch = archetypes.some((a) => a.value === state.archetype) ? state.archetype : "";
  const ar = arch ? ENGLAND : areas.some((a) => a.value === state.area) ? state.area : ENGLAND;
  const sl = slice(cells, feature.ind, feature.series, { archetype: arch, area: ar });
  const years = [...new Set(sl.map((c) => c.year))].sort((a, b) => a - b);
  const y = state.year != null && years.includes(state.year) ? state.year : (years[years.length - 1] ?? null);
  const atYear = sl.filter((c) => c.year === y);
  const tenuresHere = TENURES.filter((t) => atYear.some((c) => c.tenure === t.id));
  const t = tenuresHere.some((x) => x.id === state.tenure) ? state.tenure : (tenuresHere[0]?.id ?? "all-tenures");
  const cell = atYear.find((c) => c.tenure === t);
  const scope = arch
    ? archetypes.find((a) => a.value === arch)?.label
    : ar === ENGLAND
      ? "England"
      : areas.find((a) => a.value === ar)?.label;
  const src = evidence?.sources[feature.ind];
  const caveats = caveatsOf(cell);
  return {
    definition: `${feature.definition}${feature.periodNote ? ` ${feature.periodNote}.` : ""}`,
    method: [
      years.length > 0
        ? `Coverage. ${scope} · ${years[0]}–${years[years.length - 1]} · ${tenuresHere.map((x) => x.label).join(", ")}.`
        : "",
      BASIS[feature.basis].note,
      ...caveats,
      "The cutaway is illustrative. It does not describe any particular property.",
    ].filter(Boolean),
    source: `${src?.publisher ?? "MHCLG · English Housing Survey"} · ${feature.table}`,
    dataHref: `/data#${feature.ind}`,
  };
}

type Shared = {
  state: InsideState;
  onChange: (next: Partial<InsideState>) => void;
  evidence: Evidence | null;
  failed: boolean;
};

export function InsideHomesControls({ state, onChange, evidence, failed }: Shared) {
  const cells = useMemo(() => evidence?.cells ?? [], [evidence]);
  const feature = FEATURES.find((f) => f.id === state.feature) ?? FEATURES[0]!;
  const archetypes = useMemo(() => archetypesOf(cells, feature.ind, feature.series), [cells, feature]);
  const areas = useMemo(() => areasOf(cells, feature.ind, feature.series), [cells, feature]);
  const arch = archetypes.some((a) => a.value === state.archetype) ? state.archetype : "";
  const ar = arch ? ENGLAND : areas.some((a) => a.value === state.area) ? state.area : ENGLAND;
  const sl = useMemo(() => slice(cells, feature.ind, feature.series, { archetype: arch, area: ar }), [cells, feature, arch, ar]);
  const years = useMemo(() => [...new Set(sl.map((c) => c.year))].sort((a, b) => a - b), [sl]);
  const y = state.year != null && years.includes(state.year) ? state.year : (years[years.length - 1] ?? null);
  const atYear = sl.filter((c) => c.year === y);
  const tenuresHere = TENURES.filter((t) => atYear.some((c) => c.tenure === t.id));
  const t = tenuresHere.some((x) => x.id === state.tenure) ? state.tenure : (tenuresHere[0]?.id ?? "all-tenures");
  const archOptions = [{ value: "", label: "All dwellings" }, ...archetypes.map((a) => ({ value: a.value, label: a.label }))];
  const areaOptions = [
    { value: ENGLAND, label: "England" },
    ...areas.map((a) => ({
      value: a.value,
      label: a.kind === "region" ? a.label : `${a.label} (to 2019)`,
    })),
  ];
  const dirty =
    state.feature !== "rating" ||
    state.archetype !== "" ||
    state.area !== ENGLAND ||
    state.tenure !== "all-tenures" ||
    state.year != null;

  return (
    <ControlRow label="Inside the home controls">
      <MenuControl
        label="Feature"
        value={feature.id}
        options={FEATURES.map((f) => ({ value: f.id, label: f.label }))}
        onChange={(v) => onChange({ feature: v })}
      />
      {archetypes.length > 0 ? (
        <MenuControl
          label="Dwelling archetype"
          value={arch}
          options={archOptions}
          onChange={(v) => onChange({ archetype: v, ...(v ? { area: ENGLAND } : {}) })}
        />
      ) : (
        <UnavailableControl label="Dwelling archetype" reason={evidence ? "Not published for this measure" : failed ? "Evidence unavailable" : "Loading…"} />
      )}
      {areas.length > 0 ? (
        <MenuControl
          label="Area"
          value={ar}
          options={areaOptions}
          onChange={(v) => onChange({ area: v, ...(v !== ENGLAND ? { archetype: "" } : {}) })}
        />
      ) : (
        <UnavailableControl label="Area" reason={`England${evidence ? " · regions not published" : ""}`} />
      )}
      {tenuresHere.length > 0 ? (
        <MenuControl
          label="Tenure"
          value={t}
          options={tenuresHere.map((x) => ({ value: x.id, label: x.label }))}
          onChange={(v) => onChange({ tenure: v })}
        />
      ) : (
        <UnavailableControl label="Tenure" reason={evidence ? "Not published for this selection" : "Loading…"} />
      )}
      {years.length > 0 && y != null ? (
        <MenuControl
          label="Period"
          value={String(y)}
          options={[...years].reverse().map((yy) => {
            const c = sl.find((x) => x.year === yy && x.label);
            return { value: String(yy), label: c?.label || String(yy) };
          })}
          onChange={(v) => onChange({ year: Number(v) })}
        />
      ) : (
        <UnavailableControl label="Period" reason={evidence ? "No years published" : "Loading…"} />
      )}
      {dirty && (
        <ResetButton
          onClick={() =>
            onChange({
              feature: "rating",
              archetype: "",
              area: ENGLAND,
              tenure: "all-tenures",
              year: null,
            })
          }
        />
      )}
    </ControlRow>
  );
}

export function InsideHomes({ state, onChange, evidence, failed }: Shared) {
  const payload = evidence;
  const active = state.feature;
  const setActive = (id: string) => onChange({ feature: id });
  const archetype = state.archetype;
  const area = state.area;
  const tenure = state.tenure;
  const year = state.year;
  const [mobile, setMobile] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [stills, setStills] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const mq = matchMedia("(max-width: 720px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const cells = useMemo(() => payload?.cells ?? [], [payload]);
  const feature = FEATURES.find((f) => f.id === active) ?? FEATURES[0]!;
  const layer = LAYERS.find((l) => l.id === feature.layer)!;

  // Options for this feature (published only). Archetype and area are never crossed in the source.
  const archetypes = useMemo(() => archetypesOf(cells, feature.ind, feature.series), [cells, feature]);
  const areas = useMemo(() => areasOf(cells, feature.ind, feature.series), [cells, feature]);
  const arch = archetypes.some((a) => a.value === archetype) ? archetype : "";
  const ar = arch ? ENGLAND : areas.some((a) => a.value === area) ? area : ENGLAND;

  const sl = useMemo(() => slice(cells, feature.ind, feature.series, { archetype: arch, area: ar }), [cells, feature, arch, ar]);
  const years = useMemo(() => [...new Set(sl.map((c) => c.year))].sort((a, b) => a - b), [sl]);
  const y = year != null && years.includes(year) ? year : (years[years.length - 1] ?? null);
  const atYear = sl.filter((c) => c.year === y);
  const tenuresHere = TENURES.filter((t) => atYear.some((c) => c.tenure === t.id));
  const t = tenuresHere.some((x) => x.id === tenure) ? tenure : (tenuresHere[0]?.id ?? "all-tenures");
  const cell = atYear.find((c) => c.tenure === t);

  // Annotation values: each feature, all dwellings in the chosen area, chosen tenure (or all), latest year ≤ chosen year.
  const annValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of FEATURES) {
      const s = slice(cells, f.ind, f.series, { archetype: "", area: ar });
      const ys = [...new Set(s.filter((c) => c.v != null).map((c) => c.year))].filter((yy) => y == null || yy <= y).sort((a, b) => a - b);
      const yy = ys[ys.length - 1];
      const at = s.filter((c) => c.year === yy);
      const c = at.find((x) => x.tenure === t) ?? at.find((x) => x.tenure === "all-tenures");
      out[f.id] = payload ? cellText(c) : "…";
    }
    return out;
  }, [cells, payload, ar, t, y]);

  // Comparison: siblings of the current breakdown (or tenures when there is none).
  const compare = useMemo(() => {
    if (y == null)
      return {
        title: "",
        rows: [] as {
          id: string;
          label: string;
          v: number;
          active?: boolean;
        }[],
      };
    if (arch) {
      const [bk] = arch.split(":") as [Breakdown];
      const grouping = archetypes.find((a) => a.value === arch)?.grouping ?? "";
      const rows = cells
        .filter(
          (c) =>
            c.ind === feature.ind &&
            c.series === feature.series &&
            c.bk === bk &&
            c.area === ENGLAND &&
            c.year === y &&
            c.tenure === t &&
            c.v != null &&
            (!grouping || c.grouping === grouping),
        )
        .map((c) => ({
          id: c.cat,
          label: prettyCat(c.bk, c.cat).replace(/^[^·]+· /, ""),
          v: c.v!,
          active: `${c.bk}:${c.cat}` === arch,
        }));
      return {
        title: bk === "dwelling-age" ? "By dwelling age" : bk === "dwelling-type" ? "By dwelling type" : "By floor area",
        rows,
      };
    }
    if (ar !== ENGLAND) {
      const kind = areas.find((a) => a.value === ar)?.kind;
      const rows = cells
        .filter((c) => c.ind === feature.ind && c.series === feature.series && c.bk === kind && c.year === y && c.tenure === t && c.v != null)
        .map((c) => ({
          id: c.area,
          label: c.areaLabel,
          v: c.v!,
          active: c.area === ar,
        }));
      return {
        title: kind === "region" ? "By region" : "By survey area",
        rows,
      };
    }
    const rows = TENURES.flatMap((x) => {
      const c = atYear.find((cc) => cc.tenure === x.id && cc.v != null);
      return c ? [{ id: x.id, label: x.label, v: c.v!, active: x.id === t }] : [];
    });
    return { title: "By tenure", rows };
  }, [cells, feature, arch, ar, archetypes, areas, atYear, t, y]);

  // Type split: same slice, other series of the indicator.
  const typeRows = useMemo(() => {
    if (!feature.types || y == null) return [];
    return feature.types.items.flatMap((it) => {
      const c = slice(cells, feature.ind, it.series, {
        archetype: arch,
        area: ar,
      }).find((x) => x.year === y && x.tenure === t);
      return c && c.v != null ? [{ id: it.series, label: it.label, v: c.v }] : [];
    });
  }, [cells, feature, arch, ar, t, y]);

  const companion = useMemo(() => {
    if (!feature.companion) return null;
    const s = slice(cells, feature.companion.ind, feature.companion.series, {
      archetype: "",
      area: ENGLAND,
    });
    const ys = [...new Set(s.filter((c) => c.v != null).map((c) => c.year))].sort((a, b) => a - b);
    // A different measure with its own periods: show its latest published figure, labelled with its own period.
    const yy = ys.at(-1);
    const at = s.filter((c) => c.year === yy);
    return at.find((c) => c.tenure === t) ?? at.find((c) => c.tenure === "all-tenures") ?? null;
  }, [cells, feature, t]);

  const trend = useMemo(
    () =>
      sl
        .filter((c) => c.tenure === t && c.v != null)
        .sort((a, b) => a.t - b.t)
        .map((c) => ({ t: c.year, v: c.v! })),
    [sl, t],
  );
  const scope = arch ? archetypes.find((a) => a.value === arch)?.label : ar === ENGLAND ? "England" : areas.find((a) => a.value === ar)?.label;

  return (
    <div className={q.root}>
      <div className={q.plate}>
        <div className={`${q.plateMain} ${q.plateFlush}`}>
          {webgl && !mobile && (
            <HomeCutaway3D features={FEATURES} values={annValues} active={active} onSelect={setActive} onUnavailable={() => setWebgl(false)} />
          )}
          {webgl && mobile && (
            <>
              {!stills && (
                <div className={h.snapshotHost} aria-hidden="true">
                  <HomeCutaway3D
                    features={FEATURES}
                    values={annValues}
                    active={null}
                    onSelect={() => {}}
                    onSnapshots={setStills}
                    onUnavailable={() => setWebgl(false)}
                    bare
                  />
                </div>
              )}
              <ul className={h.details} aria-label="Architectural details">
                {FEATURES.map((f) => (
                  <li key={f.id}>
                    <button type="button" className={h.detail} aria-pressed={active === f.id} onClick={() => setActive(f.id)}>
                      {/* In-memory stills of the 3D scene (data URLs) — next/image cannot optimise these. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {stills?.[f.id] ? <img src={stills[f.id]} alt="" /> : <span className={h.detailBlank} />}
                      <span className="bo-label">{LAYERS.find((l) => l.id === f.layer)!.label}</span>
                      <span className={h.detailName}>{f.label}</span>
                      <span className={`bo-fig ${h.detailValue}`}>{annValues[f.id]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!webgl && (
            <div className={h.fallback}>
              <ChipToggles
                label="Features"
                selected={[active]}
                onToggle={setActive}
                options={FEATURES.map((f) => ({ value: f.id, label: `${f.label} · ${annValues[f.id]}` }))}
              />
            </div>
          )}
          <div className={h.legend}>
            <span className="bo-label">Layers</span>
            <ul aria-label="Layers">
              {LAYERS.map((l) => (
                <li key={l.id}>
                  <span className={h.swatch} data-pattern={l.pattern} style={{ ["--tone" as string]: l.tone }} aria-hidden="true" />
                  {l.label}
                  <span className={h.patternName}>{l.pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Research panel */}
        <aside className={q.panel} aria-live="polite" aria-label={`${feature.label} evidence`}>
          <p className="bo-label">
            {layer.label} <span aria-hidden="true">/</span> {feature.label}
          </p>

          {failed ? (
            <EmptyStage label="In preparation">The survey tables could not be loaded. No estimated figures.</EmptyStage>
          ) : !payload ? (
            <EmptyStage label="Loading">Loading the survey evidence…</EmptyStage>
          ) : (
            <>
              <p className={q.big}>
                <span className="bo-fig">
                  <DualScramble text={cellText(cell)} chars={DUAL_DIGITS} trigger="manual" duration={0.7} />
                </span>
                <span>
                  {feature.unit}
                  <br />
                  {TENURES.find((x) => x.id === t)?.label} · {periodLabel(cell, y)} · {scope}
                </span>
              </p>
              {cell?.status === "suppressed" && <p className={h.flag}>Suppressed in the source: fewer than five surveyed dwellings.</p>}
              {cell?.status === "missing" && <p className={h.flag}>Not collected for this period (COVID-19).</p>}
              <p className={q.body}>
                {feature.definition}
                {feature.periodNote ? ` ${feature.periodNote}.` : ""}
              </p>
              <BasisTag
                basis={feature.basis}
                note={
                  cell?.n
                    ? `${cell.n.toLocaleString("en-GB")} surveyed · unweighted base, not a confidence interval.`
                    : feature.basis === "survey-estimate" || feature.basis === "survey-response"
                      ? "No confidence interval is published for this cell."
                      : undefined
                }
              />

              {compare.rows.length > 1 && (
                <section className={q.section} aria-label={compare.title}>
                  <p className="bo-label">
                    {compare.title} · {periodLabel(cell, y)}
                  </p>
                  <RankBars label={`${feature.label} ${compare.title.toLowerCase()}`} rows={compare.rows} format={(v) => `${v.toFixed(1)}%`} />
                </section>
              )}
              {typeRows.length > 0 && feature.types && (
                <section className={q.section} aria-label={feature.types.title}>
                  <p className="bo-label">
                    {feature.types.exclusive ? feature.types.title : `${feature.types.title} · categories can overlap`}
                  </p>
                  <RankBars label={`${feature.label}: ${feature.types.title}`} rows={typeRows} format={(v) => `${v.toFixed(1)}%`} />
                </section>
              )}
              {companion && feature.companion && (
                <section className={q.section} aria-label={feature.companion.label}>
                  <p className="bo-label">{feature.companion.label}</p>
                  <p className={q.big}>
                    <span className="bo-fig">{cellText(companion)}</span>
                    <span>
                      {feature.companion.unit} · {periodLabel(companion, companion.year)}
                      <br />
                      {feature.companion.note}
                    </span>
                  </p>
                </section>
              )}
              {trend.length > 1 && (
                <section className={q.section} aria-label="Trend">
                  <p className="bo-label">
                    Trend · {TENURES.find((x) => x.id === t)?.label} · {scope}
                  </p>
                  <TimeChart
                    series={[{ id: feature.id, label: feature.tag, points: trend }]}
                    cadence="annual"
                    format={(v) => `${v.toFixed(1)}%`}
                    axisFormat={(v) => `${v.toFixed(0)}%`}
                    marks
                    zero
                    height={170}
                    label={`${feature.label}, ${TENURES.find((x) => x.id === t)?.label}, ${scope}`}
                  />
                </section>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Text alternative */}
      <details className={q.disclosure}>
        <summary className="bo-disclosure">All features as a table</summary>
        <div className={tc.tableWrap}>
          <table className={tc.table}>
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col">Feature</th>
                <th scope="col">Estimate</th>
                <th scope="col">Evidence</th>
                <th scope="col">Table</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.id}>
                  <td>{LAYERS.find((l) => l.id === f.layer)!.label}</td>
                  <th scope="row">{f.label}</th>
                  <td>{annValues[f.id]}</td>
                  <td>{BASIS[f.basis].label}</td>
                  <td>{f.table}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={tc.tableNote}>u = suppressed in the source (small sample) · n/c = not collected · — = not published at this level.</p>
      </details>
    </div>
  );
}

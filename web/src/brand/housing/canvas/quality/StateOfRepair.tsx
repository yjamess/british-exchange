"use client";

/**
 * Domain 07 — The State of Repair. One condition measure across a controlled breakdown (tenure, dwelling age,
 * type, floor area or region) as brand rank bars, its trend, and every measure for the selected group in the
 * panel — the same plate + panel vocabulary as the other quality modes. Surveyor inspections and residents'
 * own reports are separate observations with separate bases, shown apart, never as two readings of one measure.
 * The full measure × group matrix stays available as a table.
 */

import { useEffect, useMemo, useState } from "react";
import { ControlRow, MenuControl, RankBars, TimeChart, explorerClasses as tc } from "../../..";
import { ENGLAND, caveatsOf, prettyCat, type Breakdown, type Cell } from "./cutaway/evidence";
import { BASIS, TENURES, type Basis } from "./cutaway/features";
import { useQualityEvidence } from "./cutaway/useEvidence";
import type { InsideFoot } from "./InsideHomes";
import { BasisTag, UnavailableControl } from "./parts";
import q from "../plate.module.css";
import r from "./stateOfRepair.module.css";

type Row = {
  ind: string;
  series: string;
  label: string;
  sub?: boolean;
  /** Label when listed without its parent measure. */
  short?: string;
  basis: Basis;
  table: string;
  definition: string;
};

const SURVEYED: Row[] = [
  {
    ind: "ehs-decent-homes",
    series: "non-decent",
    label: "Non-decent",
    basis: "survey-estimate",
    table: "DA3201",
    definition: "Fails the Decent Homes Standard on any criterion.",
  },
  {
    ind: "ehs-decent-homes",
    series: "fails-repair",
    label: "Disrepair",
    short: "Non-decent: disrepair",
    sub: true,
    basis: "survey-estimate",
    table: "DA3201",
    definition: "Fails the repair criterion: key building components old and in poor condition.",
  },
  {
    ind: "ehs-decent-homes",
    series: "fails-thermal-comfort",
    label: "Thermal comfort",
    short: "Non-decent: thermal comfort",
    sub: true,
    basis: "survey-estimate",
    table: "DA3201",
    definition: "Fails the thermal comfort criterion: inadequate heating or insulation.",
  },
  {
    ind: "ehs-category-1-hazards",
    series: "any-category-1-hazard",
    label: "Category 1 hazard",
    basis: "survey-estimate",
    table: "DA4101",
    definition: "At least one HHSRS Category 1 hazard (a statutory minimum standard failure).",
  },
  {
    ind: "ehs-category-1-hazards",
    series: "excess-cold",
    label: "Excess cold",
    short: "Hazard: excess cold",
    sub: true,
    basis: "survey-estimate",
    table: "DA4101",
    definition: "Category 1 excess cold hazard. Method changed in 2018.",
  },
  {
    ind: "ehs-category-1-hazards",
    series: "any-falls",
    label: "Falls",
    short: "Hazard: falls",
    sub: true,
    basis: "survey-estimate",
    table: "DA4101",
    definition: "Any Category 1 falls hazard (stairs, level, between levels).",
  },
  {
    ind: "ehs-damp-surveyor",
    series: "any-damp",
    label: "Damp (surveyor)",
    basis: "survey-estimate",
    table: "DA5101",
    definition: "Surveyor-recorded damp serious enough to assess under HHSRS; minor damp excluded.",
  },
  {
    ind: "ehs-damp-surveyor",
    series: "rising-damp",
    label: "Rising damp",
    short: "Damp: rising",
    sub: true,
    basis: "survey-estimate",
    table: "DA5101",
    definition: "Moisture rising from the ground through walls or floors.",
  },
  {
    ind: "ehs-damp-surveyor",
    series: "penetrating-damp",
    label: "Penetrating damp",
    short: "Damp: penetrating",
    sub: true,
    basis: "survey-estimate",
    table: "DA5101",
    definition: "Water entering through walls, roofs, windows or leaks.",
  },
  {
    ind: "ehs-damp-surveyor",
    series: "condensation-mould",
    label: "Condensation and mould",
    short: "Damp: condensation and mould",
    sub: true,
    basis: "survey-estimate",
    table: "DA5101",
    definition: "Condensation or mould growth recorded by the surveyor.",
  },
];
const REPORTED: Row[] = [
  {
    ind: "ehs-damp-mould-reported",
    series: "resident-reports-damp-mould",
    label: "Residents report damp, condensation or mould",
    basis: "survey-response",
    table: "AT1.11",
    definition: "Households saying they have a problem with damp, condensation or mould (any degree). Base: all occupied households, 2023–25.",
  },
];

type ColumnKind = "tenure" | Exclude<Breakdown, "none" | "sub-national-area">;
const KINDS: { id: ColumnKind; label: string }[] = [
  { id: "tenure", label: "Tenure" },
  { id: "dwelling-age", label: "Dwelling age" },
  { id: "dwelling-type", label: "Dwelling type" },
  { id: "floor-area", label: "Floor area" },
  { id: "region", label: "Region" },
];

function pick(cells: Cell[], row: Row, kind: ColumnKind, col: string, tenure: string, year: number | null): Cell | undefined {
  return cells.find((c) => {
    if (c.ind !== row.ind || c.series !== row.series || c.year !== year) return false;
    if (kind === "tenure") return c.bk === "none" && c.area === ENGLAND && c.tenure === col;
    if (kind === "region") return c.bk === "region" && c.area === col && c.tenure === tenure;
    return c.bk === kind && c.cat === col && c.area === ENGLAND && c.tenure === tenure;
  });
}

const keyOf = (rw: Row) => `${rw.ind}|${rw.series}`;
const nameOf = (rw: Row) => rw.short ?? rw.label;
const pct = (v: number) => `${v.toFixed(1)}%`;

export function StateOfRepair({ onFoot }: { onFoot?: (foot: InsideFoot) => void }) {
  const { evidence, failed } = useQualityEvidence();
  const cells = useMemo(() => evidence?.cells ?? [], [evidence]);
  const [kind, setKind] = useState<ColumnKind>("tenure");
  const [tenure, setTenure] = useState("all-tenures");
  const [year, setYear] = useState<number | null>(null);
  const [measure, setMeasure] = useState(keyOf(SURVEYED[0]!));
  const [colPick, setColPick] = useState<string | null>(null);

  const inKind = (c: Cell) =>
    kind === "tenure" ? c.bk === "none" && c.area === ENGLAND : kind === "region" ? c.bk === "region" : c.bk === kind && c.area === ENGLAND;
  const relevant = cells.filter((c) => SURVEYED.some((rw) => rw.ind === c.ind && rw.series === c.series) && inKind(c));
  const years = [...new Set(relevant.map((c) => c.year))].sort((a, b) => a - b);
  const y = year != null && years.includes(year) ? year : (years[years.length - 1] ?? null);

  // Groups: tenures, or the published categories of the breakdown (single dwelling types only — aggregates overlap).
  const columns: { id: string; label: string }[] = useMemo(() => {
    if (kind === "tenure") return TENURES.filter((x) => x.core).map((x) => ({ id: x.id, label: x.label }));
    const seen = new Map<string, string>();
    for (const c of relevant) {
      if (c.year !== y) continue;
      if (kind === "dwelling-type" && c.grouping && c.grouping !== "single-type") continue;
      const id = kind === "region" ? c.area : c.cat;
      if (!seen.has(id)) seen.set(id, kind === "region" ? c.areaLabel : prettyCat(c.bk, c.cat).replace(/^[^·]+· /, ""));
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [kind, relevant, y]);
  const tenures = kind === "tenure" ? [] : TENURES.filter((x) => x.core && relevant.some((c) => c.year === y && c.tenure === x.id));
  const t = kind === "tenure" ? "all-tenures" : tenures.some((x) => x.id === tenure) ? tenure : (tenures[0]?.id ?? "all-tenures");

  const row = SURVEYED.find((rw) => keyOf(rw) === measure) ?? SURVEYED[0]!;
  const col = columns.find((c) => c.id === colPick) ?? columns[0];
  const kindLabel = KINDS.find((k) => k.id === kind)!.label;
  const tenureLabel = TENURES.find((x) => x.id === t)?.label ?? "All tenures";

  // Main: the chosen measure across every group, against England (all dwellings) as the reference mark.
  const byGroup = columns.map((c) => ({ c, cell: pick(cells, row, kind, c.id, t, y) }));
  const bars = byGroup.flatMap(({ c, cell }) => (cell?.v != null ? [{ id: c.id, label: c.label, v: cell.v, active: c.id === col?.id }] : []));
  const gaps = byGroup
    .filter(({ cell }) => cell?.v == null)
    .map(({ c, cell }) => `${c.label} (${cell?.status === "suppressed" ? "suppressed" : "not published"})`);
  const england = pick(cells, row, "tenure", "all-tenures", "all-tenures", y);

  const cell = col ? pick(cells, row, kind, col.id, t, y) : undefined;
  const trend = col
    ? cells
        .filter((c) => {
          if (c.ind !== row.ind || c.series !== row.series || c.v == null) return false;
          if (kind === "tenure") return c.bk === "none" && c.area === ENGLAND && c.tenure === col.id;
          if (kind === "region") return c.bk === "region" && c.area === col.id && c.tenure === t;
          return c.bk === kind && c.cat === col.id && c.area === ENGLAND && c.tenure === t;
        })
        .sort((a, b) => a.t - b.t)
        .map((c) => ({ t: c.year, v: c.v! }))
    : [];

  // Panel: every surveyed measure for the selected group (select one to chart it).
  const profile = col
    ? SURVEYED.flatMap((rw) => {
        const c = pick(cells, rw, kind, col.id, t, y);
        return c?.v != null ? [{ id: keyOf(rw), label: nameOf(rw), v: c.v, active: keyOf(rw) === keyOf(row) }] : [];
      })
    : [];

  // Inspections vs reports for the same tenure, each at its own latest published period.
  const pairTenure = kind === "tenure" ? (col?.id ?? "all-tenures") : t;
  const latest = (ind: string, series: string) =>
    cells
      .filter((c) => c.ind === ind && c.series === series && c.bk === "none" && c.area === ENGLAND && c.tenure === pairTenure && c.v != null)
      .sort((a, b) => b.t - a.t)[0];
  const inspected = latest("ehs-damp-surveyor", "any-damp");
  const reported = latest("ehs-damp-mould-reported", "resident-reports-damp-mould");
  const confirmed = latest("ehs-damp-mould-reported", "of-reporters-surveyor-damp");
  const reportedLabel = reported?.label || "2023–25";

  const cellText = (c: Cell | undefined) => (!c ? "—" : c.status === "suppressed" ? "u" : c.v == null ? "n/c" : c.v.toFixed(1));
  const caveats = caveatsOf(cell);
  const coverage = years.length > 0 ? `England · ${years[0]}–${years[years.length - 1]} · by ${kindLabel.toLowerCase()}` : "";
  const sourceLine = `${evidence?.sources[row.ind]?.publisher ?? "MHCLG · English Housing Survey"} · ${row.table}${reported ? " · AT1.11" : ""}`;
  const caveatText = caveats.join("\n");

  useEffect(() => {
    onFoot?.({ source: sourceLine, coverage, caveats: caveatText ? caveatText.split("\n") : [] });
  }, [onFoot, sourceLine, coverage, caveatText]);

  return (
    <div className={q.root}>
      <p className={q.lede}>
        The State of Repair: damp, disrepair and serious hazards across England&apos;s homes. Choose a measure and how to break it down; groups the
        survey does not publish are named, not estimated. Surveyor inspections and residents&apos; reports are different observations and sit apart.
      </p>

      <ControlRow label="Condition controls">
        <MenuControl
          label="Measure"
          value={keyOf(row)}
          options={SURVEYED.map((rw) => ({ value: keyOf(rw), label: nameOf(rw) }))}
          onChange={setMeasure}
        />
        <MenuControl
          label="Compare by"
          value={kind}
          options={KINDS.map((k) => ({ value: k.id, label: k.label }))}
          onChange={(v) => {
            setKind(v);
            setColPick(null);
          }}
        />
        {kind !== "tenure" &&
          (tenures.length > 0 ? (
            <MenuControl
              label="Tenure"
              value={t}
              options={tenures.map((x) => ({ value: x.id, label: x.label }))}
              onChange={setTenure}
            />
          ) : (
            <UnavailableControl label="Tenure" reason={evidence ? "Not published for this comparison" : "Loading…"} />
          ))}
        {years.length > 0 && y != null ? (
          <MenuControl
            label="Period"
            value={String(y)}
            options={[...years].reverse().map((v) => ({ value: String(v), label: String(v) }))}
            onChange={(v) => setYear(Number(v))}
          />
        ) : (
          <UnavailableControl label="Period" reason={failed ? "Evidence unavailable." : "Loading…"} />
        )}
      </ControlRow>

      <div className={q.plate}>
        <div className={q.plateMain}>
          {failed ? (
            <p className={q.note}>The survey tables could not be loaded. No estimated figures.</p>
          ) : !evidence ? (
            <p className={q.note}>Loading the survey evidence…</p>
          ) : (
            <div className={r.main}>
              <p className="bo-label">
                {row.label} · by {kindLabel.toLowerCase()} · {kind === "tenure" ? "England" : tenureLabel} · {y}
              </p>
              {bars.length > 0 ? (
                <RankBars
                  label={`${row.label} by ${kindLabel.toLowerCase()}, ${y}`}
                  rows={bars}
                  reference={kind !== "tenure" && england?.v != null ? { label: "England", v: england.v } : undefined}
                  format={pct}
                  onSelect={setColPick}
                />
              ) : (
                <p className={q.note}>Not published for this breakdown and period.</p>
              )}
              <p className={q.note}>
                {kind !== "tenure" && england?.v != null ? `Mark: England, all dwellings, ${pct(england.v)}. ` : ""}
                {gaps.length > 0 ? `Not shown: ${gaps.join(", ")}.` : ""}
                {kind === "dwelling-type" ? " Single dwelling types only; grouped types overlap." : ""}
              </p>
              {trend.length > 1 && col && (
                <section className={q.section} aria-label="Trend">
                  <p className="bo-label">
                    Trend · {row.label} · {col.label}
                  </p>
                  <TimeChart
                    series={[{ id: "trend", label: col.label, points: trend }]}
                    cadence="annual"
                    format={pct}
                    axisFormat={(v) => `${v.toFixed(0)}%`}
                    marks
                    zero
                    height={200}
                    label={`${row.label}, ${col.label}, trend`}
                  />
                </section>
              )}
            </div>
          )}
        </div>

        <aside className={q.panel} aria-live="polite" aria-label={`${col?.label ?? "Group"} condition`}>
          <p className="bo-label">
            {row.label} · {col?.label ?? "—"}
          </p>
          <p className={q.big}>
            <span className="bo-fig">{cell?.v != null ? pct(cell.v) : cell?.status === "suppressed" ? "u" : "—"}</span>
            <span>
              of dwellings · {y ?? "—"}
              {kind !== "tenure" ? ` · ${tenureLabel}` : ""}
            </span>
          </p>
          <p className={q.body}>{row.definition}</p>
          {cell?.status === "suppressed" && <p className={q.note}>Suppressed in the source: fewer than five surveyed dwellings.</p>}
          <BasisTag
            basis={row.basis}
            note={
              cell?.n
                ? `${cell.n.toLocaleString("en-GB")} surveyed · unweighted base, not a confidence interval.`
                : "No confidence interval is published for this cell."
            }
          />

          {profile.length > 1 && (
            <section className={q.section} aria-label="Every condition measure">
              <p className="bo-label">Every measure · {col?.label}</p>
              <RankBars label={`Condition measures, ${col?.label}, ${y}`} rows={profile} format={pct} onSelect={setMeasure} />
            </section>
          )}

          <section className={q.section} aria-label="Inspections and reports">
            <p className="bo-label">Inspections and reports · {TENURES.find((x) => x.id === pairTenure)?.label}</p>
            <BasisTag
              basis="survey-estimate"
              note={`Surveyors recorded damp at the HHSRS threshold in ${inspected?.v != null ? pct(inspected.v) : "—"} of dwellings (${inspected?.year ?? "—"}).`}
            />
            <BasisTag
              basis="survey-response"
              note={`${reported?.v != null ? pct(reported.v) : "—"} of households say they have damp, condensation or mould, any degree (${reportedLabel}).`}
            />
            <p className={q.note}>
              {confirmed?.v != null ? `Of households reporting a problem, a surveyor recorded damp in ${pct(confirmed.v)}. ` : ""}
              Different question, population and threshold — one does not correct the other.
            </p>
          </section>

        </aside>
      </div>

      {/* Text alternative: the full measure × group matrix */}
      {evidence && y != null && (
        <details className={q.disclosure}>
          <summary className="bo-disclosure">
            All measures by {kindLabel.toLowerCase()} as a table · {y}
          </summary>
          <div className={tc.tableWrap}>
            <table className={tc.table}>
              <thead>
                <tr>
                  <th scope="col">% of dwellings</th>
                  {columns.map((c) => (
                    <th key={c.id} scope="col">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SURVEYED.map((rw) => (
                  <tr key={keyOf(rw)}>
                    <th scope="row">{nameOf(rw)}</th>
                    {columns.map((c) => (
                      <td key={c.id}>{cellText(pick(cells, rw, kind, c.id, t, y))}</td>
                    ))}
                  </tr>
                ))}
                {kind === "tenure" &&
                  REPORTED.map((rw) => (
                    <tr key={keyOf(rw)}>
                      <th scope="row">
                        {rw.label} ({BASIS[rw.basis].label.toLowerCase()}, households, {reportedLabel})
                      </th>
                      {columns.map((c) => (
                        <td key={c.id}>
                          {cellText(
                            cells
                              .filter((x) => x.ind === rw.ind && x.series === rw.series && x.bk === "none" && x.area === ENGLAND && x.tenure === c.id)
                              .sort((a, b) => b.t - a.t)[0],
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className={tc.tableNote}>u = suppressed in the source (small sample) · n/c = not collected · — = not published at this level.</p>
        </details>
      )}
    </div>
  );
}

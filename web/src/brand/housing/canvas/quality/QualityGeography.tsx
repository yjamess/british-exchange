"use client";

/**
 * Domain 07 — Where housing quality differs. A place-based evidence map that only shows measures
 * at the scale the source supports:
 *   · Regions (2020 onward) and the EHS's three survey areas (2008–19) — survey estimates.
 *   · Local authorities — reserved for EPC certificate statistics (administrative records); never
 *     inferred from the national/regional survey sample.
 * Tone is dot density, never opacity. The ranked list is the keyboard / text alternative.
 */

import { useEffect, useMemo, useState } from "react";
import { ChipToggles, ControlRow, DualScramble, DUAL_DIGITS, MenuControl, TimeChart } from "../../..";
import { ENGLAND, caveatsOf, type Cell } from "./cutaway/evidence";
import { FEATURES, TENURES } from "./cutaway/features";
import { useQualityEvidence } from "./cutaway/useEvidence";
import type { InsideFoot } from "./InsideHomes";
import { BasisTag, UnavailableControl } from "./parts";
import q from "../plate.module.css";
import g from "./qualityGeography.module.css";

type Shape = { code: string; name: string; path: string; label?: [number, number] };

/** Names wrapped to the region, and a few centroids that would otherwise sit on a neighbour. */
const LABEL_LINES: Record<string, string[]> = {
  E12000001: ["North East"],
  E12000002: ["North", "West"],
  E12000003: ["Yorkshire", "and the Humber"],
  E12000004: ["East", "Midlands"],
  E12000005: ["West", "Midlands"],
  E12000006: ["East of", "England"],
  E12000007: ["London"],
  E12000008: ["South East"],
  E12000009: ["South West"],
};
const LABEL_AT: Record<string, [number, number]> = {
  E12000004: [530, 400],
  E12000005: [365, 520],
  E12000007: [560, 634],
  E12000008: [590, 710],
};

/** EHS survey areas (2008–19) → the ONS regions they group. */
const SNA_MEMBERS: Record<string, string[]> = {
  "EHS-SNA-NORTHERN": ["E12000001", "E12000002", "E12000003"],
  "EHS-SNA-LONDON-SE": ["E12000007", "E12000008"],
  "EHS-SNA-REST-OF-ENGLAND": ["E12000004", "E12000005", "E12000006", "E12000009"],
};
const BINS = 5;
const RADII = [0.7, 1.1, 1.5, 1.9, 2.35];

export function QualityGeography({ onFoot }: { onFoot?: (foot: InsideFoot) => void }) {
  const { evidence, failed } = useQualityEvidence();
  const [shapes, setShapes] = useState<Shape[] | null>(null);
  const [featureId, setFeatureId] = useState("fabric");
  const [tenure, setTenure] = useState("all-tenures");
  const [year, setYear] = useState<number | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/housing/regions")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { shapes: Shape[] }) => live && setShapes(j.shapes))
      .catch(() => live && setShapes([]));
    return () => {
      live = false;
    };
  }, []);

  const cells = useMemo(() => evidence?.cells ?? [], [evidence]);
  const areaCells = (ind: string, series: string) =>
    cells.filter((c) => c.ind === ind && c.series === series && (c.bk === "region" || c.bk === "sub-national-area"));
  const measures = FEATURES.filter((f) => areaCells(f.ind, f.series).length > 0);
  const feature = measures.find((f) => f.id === featureId) ?? measures[0] ?? FEATURES[0]!;
  const fc = useMemo(() => areaCells(feature.ind, feature.series), [cells, feature]); // eslint-disable-line react-hooks/exhaustive-deps

  const years = [...new Set(fc.map((c) => c.year))].sort((a, b) => a - b);
  const y = year != null && years.includes(year) ? year : (years[years.length - 1] ?? null);
  const atYear = fc.filter((c) => c.year === y);
  const scale: "region" | "sub-national-area" = atYear.some((c) => c.bk === "region") ? "region" : "sub-national-area";
  const tenures = TENURES.filter((t) => atYear.some((c) => c.tenure === t.id && c.bk === scale));
  const t = tenures.some((x) => x.id === tenure) ? tenure : (tenures[0]?.id ?? "all-tenures");
  const layer = atYear.filter((c) => c.bk === scale && c.tenure === t);

  // Region code → the cell that colours it (a survey area colours all its member regions).
  const byRegion = new Map<string, Cell>();
  for (const c of layer) {
    if (scale === "region") byRegion.set(c.area, c);
    else for (const m of SNA_MEMBERS[c.area] ?? []) byRegion.set(m, c);
  }
  const vals = layer.map((c) => c.v).filter((v): v is number => v != null);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const bin = (v: number | null) =>
    v == null || !Number.isFinite(lo) ? -1 : hi === lo ? 2 : Math.min(BINS - 1, Math.floor(((v - lo) / (hi - lo)) * BINS));

  const england = cells.find(
    (c) => c.ind === feature.ind && c.series === feature.series && c.bk === "none" && c.area === ENGLAND && c.year === y && c.tenure === t,
  );
  const ranked = [...layer].sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const sel = layer.find((c) => c.area === picked) ?? null;
  const selTrend = sel
    ? fc
        .filter((c) => c.area === sel.area && c.tenure === t && c.v != null)
        .sort((a, b) => a.t - b.t)
        .map((c) => ({ t: c.year, v: c.v! }))
    : [];
  const src = evidence?.sources[feature.ind];
  const pct = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);
  const caveats = sel ? caveatsOf(sel) : [];
  const coverage = y != null ? `${scale === "region" ? "English regions" : "Three survey areas"} · ${y}` : "";
  const sourceLine = `${src?.publisher ?? "MHCLG · English Housing Survey"} · ${feature.table} · Boundaries: ONS Regions (Dec 2025)`;
  const caveatText = [
    "Differences between areas may lie within sampling error. Confidence intervals are not published for these cells.",
    ...caveats,
  ].join("\n");

  useEffect(() => {
    onFoot?.({ source: sourceLine, coverage, caveats: caveatText.split("\n") });
  }, [onFoot, sourceLine, coverage, caveatText]);

  return (
    <div className={q.root}>
      <p className={q.lede}>
        Where housing quality differs — shown only at the scale each source supports. The English Housing Survey is representative for England, its
        regions (from 2020) and three broad survey areas (to 2019). It does not support local authority rates, and the Exchange does not estimate
        them.
      </p>

      <ControlRow label="Map controls">
        <ChipToggles
          label="Scale"
          selected={["survey"]}
          onToggle={() => {}}
          options={[
            {
              value: "survey",
              label: `${scale === "region" ? "Regions" : "Survey areas"} · survey estimate`,
            },
            {
              value: "epc",
              label: "Local authorities · EPC certificates",
              disabled: true,
              title: "EPC certificate statistics are being added",
            },
          ]}
        />
        {measures.length > 0 ? (
          <MenuControl
            label="Measure"
            value={feature.id}
            options={measures.map((m) => ({ value: m.id, label: m.label }))}
            onChange={(v) => {
              setFeatureId(v);
              setPicked(null);
            }}
          />
        ) : (
          <UnavailableControl label="Measure" reason={failed ? "Evidence unavailable." : evidence ? "No regional measures" : "Loading…"} />
        )}
        {tenures.length > 0 ? (
          <MenuControl
            label="Tenure"
            value={t}
            options={tenures.map((x) => ({ value: x.id, label: x.label }))}
            onChange={setTenure}
          />
        ) : (
          <UnavailableControl label="Tenure" reason={evidence ? "Not published for this measure" : "Loading…"} />
        )}
        {years.length > 0 && y != null ? (
          <MenuControl
            label="Period"
            value={String(y)}
            options={[...years].reverse().map((v) => ({ value: String(v), label: String(v) }))}
            onChange={(v) => setYear(Number(v))}
          />
        ) : (
          <UnavailableControl label="Period" reason="—" />
        )}
      </ControlRow>

      <div className={q.plate}>
        <figure className={`${q.plateMain} ${g.mapFig}`}>
          <svg
            viewBox="0 0 760 880"
            className={g.map}
            role="img"
            aria-label={`${feature.label} by ${scale === "region" ? "region" : "survey area"}, ${y ?? ""}`}
          >
            <defs>
              {RADII.map((r, i) => (
                <pattern key={r} id={`qg-dot-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <circle cx="3" cy="3" r={r} fill="var(--bo-ink)" />
                </pattern>
              ))}
            </defs>
            {(shapes ?? []).map((s) => {
              const c = byRegion.get(s.code);
              const b = bin(c?.v ?? null);
              const on = sel && (scale === "region" ? sel.area === s.code : (SNA_MEMBERS[sel.area] ?? []).includes(s.code));
              return (
                <path
                  key={s.code}
                  d={s.path}
                  className={g.region}
                  data-on={on ? "true" : undefined}
                  fill={b >= 0 ? `url(#qg-dot-${b})` : "var(--bo-paper)"}
                  onClick={() => c && setPicked(c.area)}
                >
                  <title>
                    {(scale === "region" ? s.name : c?.areaLabel) ?? s.name}:{" "}
                    {c ? (c.status === "suppressed" ? "suppressed" : pct(c.v)) : "not published"}
                  </title>
                </path>
              );
            })}
            {(shapes ?? []).map((s) => {
              const at = LABEL_AT[s.code] ?? s.label;
              if (!at) return null;
              const lines = LABEL_LINES[s.code] ?? [s.name];
              return (
                <g key={`label-${s.code}`} className={g.mapLabel} transform={`translate(${at[0]} ${at[1]})`} pointerEvents="none">
                  {lines.map((line, i) => (
                    <text key={line} y={(i - (lines.length - 1) / 2) * 16} textAnchor="middle">
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
        </figure>

        <aside className={q.panel} aria-live="polite">
          <BasisTag
            basis={feature.basis}
            note={`${scale === "region" ? "Nine regions" : "Three survey areas"} · England ${pct(england?.v)}.`}
          />
          {failed && <p className={q.note}>The survey tables could not be loaded. No estimated figures.</p>}
          <ul className={g.ranked} aria-label={`${feature.label}, ranked`}>
            {ranked.map((c) => (
              <li key={c.area}>
                <button type="button" aria-pressed={picked === c.area} onClick={() => setPicked(c.area)} className={g.rankRow}>
                  <span>{c.areaLabel}</span>
                  <span className={g.rankBar} aria-hidden="true">
                    <i
                      style={{
                        width: `${hi > 0 && c.v != null ? (c.v / hi) * 100 : 0}%`,
                      }}
                    />
                    {england?.v != null && (
                      <em
                        style={{
                          left: `${hi > 0 ? (england.v / hi) * 100 : 0}%`,
                        }}
                      />
                    )}
                  </span>
                  <span className="bo-fig">{c.status === "suppressed" ? "u" : pct(c.v)}</span>
                </button>
              </li>
            ))}
          </ul>
          {sel ? (
            <section className={q.section}>
              <p className="bo-label">{sel.areaLabel}</p>
              <p className={q.big}>
                <span className="bo-fig">
                  <DualScramble text={pct(sel.v)} chars={DUAL_DIGITS} trigger="manual" duration={0.6} />
                </span>
                <span>
                  {feature.unit} · {TENURES.find((x) => x.id === t)?.label} · {y}
                  <br />
                  England {pct(england?.v)}
                  {sel.v != null && england?.v != null
                    ? ` · ${(sel.v - england.v >= 0 ? "+" : "−") + Math.abs(sel.v - england.v).toFixed(1)} points`
                    : ""}
                </span>
              </p>
              {selTrend.length > 1 && (
                <TimeChart
                  series={[{ id: sel.area, label: sel.areaLabel, points: selTrend }]}
                  cadence="annual"
                  format={(v) => `${v.toFixed(1)}%`}
                  axisFormat={(v) => `${v.toFixed(0)}%`}
                  marks
                  zero
                  height={150}
                  label={`${feature.label}, ${sel.areaLabel}`}
                />
              )}
              <BasisTag
                basis={feature.basis}
                note={
                  sel.n
                    ? `${sel.n.toLocaleString("en-GB")} surveyed · unweighted base, not a confidence interval.`
                    : "No confidence interval is published for this cell."
                }
              />
            </section>
          ) : (
            <p className={q.note}>Select a region on the map or in the list.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

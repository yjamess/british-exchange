"use client";

/**
 * Domain 07 — The Energy Anatomy.
 * Technical building diagram: bands · heating · insulation · improvement.
 * Selecting a category adjusts the matching visual layers.
 * EHS survey estimates are never conflated with the EPC certificate register.
 */

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { fmtT } from "../../../data";
import type { HousingV1 } from "../../load";
import s from "./quality.module.css";

type Props = {
  quality: HousingV1["quality"];
};

type CategoryId = "bands" | "heating" | "insulation" | "improvement";

type TenureId = "all-tenures" | "owner-occupied" | "private-rented" | "social-rented";

const CATEGORIES: {
  id: CategoryId;
  label: string;
  short: string;
  definition: string;
  observationType: string;
}[] = [
  {
    id: "bands",
    label: "Energy efficiency bands",
    short: "EER bands",
    definition:
      "Share of England dwellings in modelled energy-efficiency rating (EER) bands. A–C is the policy headline. These are English Housing Survey modelled ratings for a representative dwelling sample — not counts from the domestic EPC certificate register.",
    observationType: "Survey estimate · EHS modelled EER (not EPC register)",
  },
  {
    id: "heating",
    label: "Heating systems",
    short: "Heating",
    definition:
      "Main heating system and efficient boiler prevalence. Central heating is the dominant system; room heaters are the least efficient main source. Condensing boilers combine condensing and condensing-combination types.",
    observationType: "Survey estimate · EHS dwelling inspection",
  },
  {
    id: "insulation",
    label: "Insulation",
    short: "Insulation",
    definition:
      "Wall insulation (cavity with evidence or SAP-assumed post-1995, plus solid-wall insulation), loft insulation of 200mm or more, and full double glazing. Percentages use all dwellings as the base — including homes without a loft.",
    observationType: "Survey estimate · EHS dwelling inspection / annex",
  },
  {
    id: "improvement",
    label: "Potential improvement",
    short: "To band C",
    definition:
      "Modelled share of dwellings that could reach EER band C with cumulative SAP improvement measures, and the mean cost among those that can. Dwellings already at C or above are separate. This is a stock-level simulation — not an EPC recommendation report for a named address.",
    observationType: "Survey estimate · EHS SAP-modelled improvement cost",
  },
];

const TENURES: { id: TenureId; label: string }[] = [
  { id: "all-tenures", label: "All tenures" },
  { id: "owner-occupied", label: "Owner-occupied" },
  { id: "private-rented", label: "Private rented" },
  { id: "social-rented", label: "Social rented" },
];

const BAND_ORDER = [
  { id: "band-a-b", label: "A/B" },
  { id: "band-c", label: "C" },
  { id: "band-d", label: "D" },
  { id: "band-e", label: "E" },
  { id: "band-f", label: "F" },
  { id: "band-g", label: "G" },
] as const;

function pctAt(series: { tenure: string; points: { t: number; v: number }[] }[] | undefined, tenure: TenureId, year: number): number | null {
  const line = series?.find((x) => x.tenure === tenure) ?? (tenure === "social-rented" ? series?.find((x) => x.tenure === "all-social") : undefined);
  if (!line) return null;
  const pt = line.points.find((p) => Math.abs(p.t - year) < 1e-6);
  return pt?.v ?? null;
}

function lastPct(series: { tenure: string; points: { t: number; v: number }[] }[] | undefined, tenure: TenureId): number | null {
  const line = series?.find((x) => x.tenure === tenure) ?? (tenure === "social-rented" ? series?.find((x) => x.tenure === "all-social") : undefined);
  if (!line || line.points.length === 0) return null;
  return line.points[line.points.length - 1]!.v;
}

function onKey(e: KeyboardEvent, activate: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    activate();
  }
}

export function EnergyAnatomy({ quality }: Props) {
  const uid = useId().replace(/:/g, "");
  const years = quality.energyYears.length > 0 ? quality.energyYears : quality.years;
  const [yearIdx, setYearIdx] = useState(() => Math.max(0, years.length - 1));
  const [tenure, setTenure] = useState<TenureId>("all-tenures");
  const [focus, setFocus] = useState<CategoryId>("bands");

  const safeIdx = years.length === 0 ? 0 : Math.min(yearIdx, years.length - 1);
  const year = years[safeIdx] ?? null;

  const values = useMemo(() => {
    if (year == null) {
      return {
        abc: null as number | null,
        efg: null as number | null,
        bands: {} as Record<string, number | null>,
        central: null as number | null,
        condensing: null as number | null,
        room: null as number | null,
        wall: null as number | null,
        loft: null as number | null,
        glazing: null as number | null,
        improvable: null as number | null,
        alreadyC: null as number | null,
        meanCost: null as number | null,
      };
    }
    const bands: Record<string, number | null> = {};
    for (const b of BAND_ORDER) {
      bands[b.id] = pctAt(quality.energyBands[b.id], "all-tenures", year);
    }
    return {
      abc: pctAt(quality.energyAbc, tenure, year),
      efg: pctAt(quality.energyBands["band-e-f-g"], "all-tenures", year),
      bands,
      central: pctAt(quality.heating.central, tenure, year),
      condensing: pctAt(quality.heating.condensing, tenure, year),
      room: pctAt(quality.heating.room, tenure, year),
      wall: pctAt(quality.insulation.wall, tenure, year),
      loft: pctAt(quality.insulation.loft200, "all-tenures", year) ?? lastPct(quality.insulation.loft200, "all-tenures"),
      glazing: pctAt(quality.insulation.glazing, tenure, year),
      improvable: lastPct(quality.improvement.improvable, "all-tenures"),
      alreadyC: lastPct(quality.improvement.alreadyC, "all-tenures"),
      meanCost: lastPct(quality.improvement.meanCost, tenure) ?? lastPct(quality.improvement.meanCost, "all-tenures"),
    };
  }, [quality, tenure, year]);

  const select = (id: CategoryId) => setFocus(id);
  const focused = CATEGORIES.find((c) => c.id === focus)!;

  const headline = (() => {
    switch (focus) {
      case "bands":
        return {
          value: values.abc,
          unit: "of dwellings in bands A–C",
          money: false,
        };
      case "heating":
        return {
          value: values.central,
          unit: "with central heating",
          money: false,
        };
      case "insulation":
        return {
          value: values.wall,
          unit: "with wall insulation",
          money: false,
        };
      case "improvement":
        return {
          value: values.improvable,
          unit: "could be improved to band C",
          money: false,
        };
    }
  })();

  if (years.length === 0 && !values.improvable) {
    return <p className={s.lede}>Energy Anatomy needs English Housing Survey energy tables. No estimates are shown until they load.</p>;
  }

  return (
    <div className={s.root}>
      <p className={s.lede}>
        A technical section through England&apos;s housing stock — select a category to read the matching survey measure. Layers respond to the
        selected category. This is not an EPC for any particular home.
      </p>

      <div className={s.obsBanner} role="note">
        <div>
          <span className={s.obsTag} data-kind="survey">
            Survey estimate
          </span>
          <span className={s.obsText}>English Housing Survey modelled ratings and inspections — representative England dwelling sample.</span>
        </div>
        <div>
          <span className={s.obsTag} data-kind="admin">
            EPC register
          </span>
          <span className={s.obsText}>
            Domestic certificates are a selected, non-exhaustive administrative population (sales, lets, works). Not loaded here — coverage and
            supersession gates come first.
          </span>
        </div>
      </div>

      <div className={s.controls}>
        {years.length > 0 && (
          <label className={s.yearField} htmlFor={`${uid}-year`}>
            <span className="bo-label">Survey year</span>
            <input
              id={`${uid}-year`}
              type="range"
              min={0}
              max={Math.max(0, years.length - 1)}
              step={1}
              value={safeIdx}
              onChange={(e) => setYearIdx(Number(e.target.value))}
              aria-valuetext={year != null ? String(Math.floor(year)) : undefined}
            />
            <span className={`bo-fig ${s.yearOut}`}>{year != null ? Math.floor(year) : "—"}</span>
          </label>
        )}

        <div className={s.tenureRow} role="group" aria-label="Tenure">
          {TENURES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tenure === t.id}
              data-active={tenure === t.id ? "true" : "false"}
              onClick={() => setTenure(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={s.measureRow} role="group" aria-label="Energy category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={s.tenureTab}
              aria-pressed={focus === c.id}
              data-active={focus === c.id ? "true" : "false"}
              onClick={() => select(c.id)}
            >
              {c.short}
            </button>
          ))}
        </div>
      </div>

      <div className={s.instrument}>
        <div className={s.cutawayWrap}>
          <svg className={s.cutaway} viewBox="0 0 340 400" role="img" aria-label="Energy anatomy technical building section">
            <title>The Energy Anatomy — engraved technical section</title>
            <defs>
              <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--bo-ink)" strokeWidth="1" />
              </pattern>
              <pattern id={`${uid}-loft`} width="5" height="5" patternUnits="userSpaceOnUse">
                <circle cx="1.2" cy="1.2" r="0.85" fill="var(--bo-ink)" />
              </pattern>
              <pattern id={`${uid}-heat`} width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M4 1 V7 M1 4 H7" fill="none" stroke="var(--bo-ink)" strokeWidth="0.7" />
              </pattern>
            </defs>

            <line x1="24" y1="355" x2="316" y2="355" className={s.ink} strokeWidth="1.5" />

            {/* Ground / improvement potential */}
            <g
              className={s.layerHit}
              data-active={focus === "improvement" ? "true" : "false"}
              role="button"
              tabIndex={0}
              aria-pressed={focus === "improvement"}
              aria-label={`Potential improvement · ${values.improvable == null ? "no data" : `${values.improvable.toFixed(1)} percent improvable to band C`}`}
              onClick={() => select("improvement")}
              onKeyDown={(e) => onKey(e, () => select("improvement"))}
            >
              <rect x="52" y="312" width="236" height="42" fill={`url(#${uid}-hatch)`} className={s.layerFill} />
              <rect x="52" y="312" width="236" height="42" fill="none" className={s.layerStroke} />
              <text x="170" y="338" textAnchor="middle" className={s.anno}>
                improvement
              </text>
            </g>

            {/* Walls / insulation */}
            <g
              className={s.layerHit}
              data-active={focus === "insulation" ? "true" : "false"}
              role="button"
              tabIndex={0}
              aria-pressed={focus === "insulation"}
              aria-label={`Insulation · ${values.wall == null ? "no data" : `${values.wall.toFixed(1)} percent wall insulation`}`}
              onClick={() => select("insulation")}
              onKeyDown={(e) => onKey(e, () => select("insulation"))}
            >
              <path d="M60 312 V155 H280 V312 Z" fill={`url(#${uid}-hatch)`} className={s.layerFill} />
              <path d="M60 312 V155 H280 V312 Z" fill="none" className={s.layerStroke} strokeWidth="1.75" />
              {focus === "insulation" && <path d="M68 312 V155 M272 312 V155" className={s.ink} strokeWidth="1.2" />}
              <text x="100" y="200" className={s.anno}>
                insulation
              </text>
            </g>

            {/* Heating plant */}
            <g
              className={s.layerHit}
              data-active={focus === "heating" ? "true" : "false"}
              role="button"
              tabIndex={0}
              aria-pressed={focus === "heating"}
              aria-label={`Heating · ${values.central == null ? "no data" : `${values.central.toFixed(1)} percent central heating`}`}
              onClick={() => select("heating")}
              onKeyDown={(e) => onKey(e, () => select("heating"))}
            >
              <rect x="210" y="230" width="52" height="70" fill={`url(#${uid}-heat)`} className={s.layerFill} />
              <rect x="210" y="230" width="52" height="70" fill="none" className={s.layerStroke} />
              <path d="M220 250 H252 M220 265 H252 M220 280 H252" className={s.ink} strokeWidth="1" fill="none" />
              <text x="236" y="220" textAnchor="middle" className={s.anno}>
                heating
              </text>
            </g>

            {/* Roof / loft + bands */}
            <g
              className={s.layerHit}
              data-active={focus === "bands" || focus === "insulation" ? "true" : "false"}
              role="button"
              tabIndex={0}
              aria-pressed={focus === "bands"}
              aria-label={`Energy bands · ${values.abc == null ? "no data" : `${values.abc.toFixed(1)} percent A to C`}`}
              onClick={() => select("bands")}
              onKeyDown={(e) => onKey(e, () => select("bands"))}
            >
              <path d="M50 155 L170 62 L290 155 Z" fill={`url(#${uid}-loft)`} className={s.layerFill} />
              <path d="M50 155 L170 62 L290 155 Z" fill="none" className={s.layerStroke} strokeWidth="1.75" />
              <text x="170" y="118" textAnchor="middle" className={s.anno}>
                bands / loft
              </text>
            </g>

            {/* Windows (glazing cue) */}
            <rect x="90" y="185" width="40" height="30" fill="none" className={s.ink} strokeWidth={focus === "insulation" ? 2 : 1} />
            <rect x="90" y="250" width="40" height="30" fill="none" className={s.ink} strokeWidth={focus === "insulation" ? 2 : 1} />
            <line x1="110" y1="185" x2="110" y2="215" className={s.ink} strokeWidth="0.7" />
            <line x1="90" y1="200" x2="130" y2="200" className={s.ink} strokeWidth="0.7" />

            {/* Band stack (all-tenures mix) */}
            {focus === "bands" && (
              <g aria-hidden="true">
                {(() => {
                  let x = 52;
                  const y = 368;
                  const h = 14;
                  const total = BAND_ORDER.reduce((acc, b) => acc + (values.bands[b.id] ?? 0), 0);
                  if (total <= 0) return null;
                  return BAND_ORDER.map((b) => {
                    const v = values.bands[b.id] ?? 0;
                    const w = (v / total) * 236;
                    const node = (
                      <g key={b.id}>
                        <rect x={x} y={y} width={Math.max(0, w)} height={h} fill="var(--bo-ink)" stroke="var(--bo-paper)" strokeWidth="1" />
                        {w > 22 && (
                          <text x={x + w / 2} y={y + 10} textAnchor="middle" fill="var(--bo-paper)" className={s.bandLabel}>
                            {b.label}
                          </text>
                        )}
                      </g>
                    );
                    x += w;
                    return node;
                  });
                })()}
              </g>
            )}

            <text x="170" y="392" textAnchor="middle" className={s.plateNote}>
              illustrative section · England EHS survey estimates · not EPC certificates
            </text>
          </svg>
        </div>

        <aside className={s.panel} aria-live="polite">
          <dl className={s.detail}>
            <dt>Category</dt>
            <dd>{focused.label}</dd>
            <dt>Estimate</dt>
            <dd className="bo-fig">
              {headline.value == null ? "—" : `${headline.value.toFixed(1)}%`}
              <span className={s.unitHint}>{headline.unit}</span>
            </dd>
            <dt>Tenure</dt>
            <dd>{TENURES.find((t) => t.id === tenure)?.label}</dd>
            <dt>Period</dt>
            <dd>{focus === "improvement" ? "2024 (annex snapshot)" : year != null ? fmtT(year, "annual") : "—"}</dd>
            <dt>Definition</dt>
            <dd>{focused.definition}</dd>
            <dt>Observation type</dt>
            <dd>{focused.observationType}</dd>
            <dt>Geography</dt>
            <dd>England · dwelling sample — not UK, not an individual certificate</dd>
          </dl>

          {focus === "bands" && (
            <ul className={s.layerList}>
              <li>
                <div className={s.layerChip} data-active="true">
                  <span className={s.chipLabel}>A–C</span>
                  <span className={`bo-fig ${s.chipValue}`}>{values.abc == null ? "—" : `${values.abc.toFixed(1)}%`}</span>
                </div>
              </li>
              <li>
                <div className={s.layerChip}>
                  <span className={s.chipLabel}>E–G</span>
                  <span className={`bo-fig ${s.chipValue}`}>{values.efg == null ? "—" : `${values.efg.toFixed(1)}%`}</span>
                </div>
              </li>
            </ul>
          )}

          {focus === "heating" && (
            <ul className={s.layerList}>
              {[
                { label: "Central heating", v: values.central },
                { label: "Condensing boiler", v: values.condensing },
                { label: "Room heater", v: values.room },
              ].map((row) => (
                <li key={row.label}>
                  <div className={s.layerChip}>
                    <span className={s.chipLabel}>{row.label}</span>
                    <span className={`bo-fig ${s.chipValue}`}>{row.v == null ? "—" : `${row.v.toFixed(1)}%`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {focus === "insulation" && (
            <ul className={s.layerList}>
              {[
                { label: "Wall insulation", v: values.wall },
                {
                  label: "Loft ≥200mm",
                  v: values.loft,
                  note: "All tenures (annex)",
                },
                { label: "Full double glazing", v: values.glazing },
              ].map((row) => (
                <li key={row.label}>
                  <div className={s.layerChip}>
                    <span className={s.chipLabel}>
                      {row.label}
                      {"note" in row && row.note ? <span className={s.unitHint}>{row.note}</span> : null}
                    </span>
                    <span className={`bo-fig ${s.chipValue}`}>{row.v == null ? "—" : `${row.v.toFixed(1)}%`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {focus === "improvement" && (
            <ul className={s.layerList}>
              <li>
                <div className={s.layerChip} data-active="true">
                  <span className={s.chipLabel}>Improvable to C</span>
                  <span className={`bo-fig ${s.chipValue}`}>{values.improvable == null ? "—" : `${values.improvable.toFixed(1)}%`}</span>
                </div>
              </li>
              <li>
                <div className={s.layerChip}>
                  <span className={s.chipLabel}>Already A–C</span>
                  <span className={`bo-fig ${s.chipValue}`}>{values.alreadyC == null ? "—" : `${values.alreadyC.toFixed(1)}%`}</span>
                </div>
              </li>
              <li>
                <div className={s.layerChip}>
                  <span className={s.chipLabel}>Mean cost to C</span>
                  <span className={`bo-fig ${s.chipValue}`}>
                    {values.meanCost == null ? "—" : `£${Math.round(values.meanCost).toLocaleString("en-GB")}`}
                  </span>
                </div>
              </li>
            </ul>
          )}
        </aside>
      </div>

      <p className={s.caveat}>
        Source: English Housing Survey energy live tables and 2024–25 Chapter 2 annex (MHCLG). Figures are England survey estimates. They are not
        domestic EPC certificates, which cover a selected administrative population and are not yet ingested.
      </p>
    </div>
  );
}

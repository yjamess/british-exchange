"use client";

/**
 * Domain 07 — The Energy Anatomy. The cutaway's energy layers (rating, loft, walls, glazing, boiler)
 * with a technical panel: band mix, heating, insulation and improvement potential. Changing the
 * category moves the camera and raises the matching layers. English Housing Survey modelled ratings
 * (survey estimates) are kept visibly apart from the EPC certificate register (administrative records
 * of a selected, non-exhaustive population).
 */

import { useEffect, useMemo, useState } from "react";
import { ControlRow, DualScramble, DUAL_DIGITS, MenuControl, RankBars, TimeChart } from "../../..";
import { HomeCutaway3D } from "./cutaway/HomeCutaway3D";
import { ENGLAND, archetypesOf, areasOf, slice, type Cell } from "./cutaway/evidence";
import { FEATURES, TENURES } from "./cutaway/features";
import { useQualityEvidence } from "./cutaway/useEvidence";
import { BasisTag, UnavailableControl } from "./parts";
import type { InsideFoot } from "./InsideHomes";
import e from "../plate.module.css";

type Cat = "bands" | "heating" | "insulation" | "improvement";
const CATS: { id: Cat; label: string; focus: string }[] = [
  { id: "bands", label: "Band mix", focus: "rating" },
  { id: "heating", label: "Heating", focus: "boiler" },
  { id: "insulation", label: "Insulation", focus: "loft" },
  { id: "improvement", label: "Improvement potential", focus: "rating" },
];
const ENERGY = FEATURES.filter((f) => f.layer === "energy");
const BANDS = [
  { series: "band-a-b", label: "Bands A–B" },
  { series: "band-c", label: "Band C" },
  { series: "band-d", label: "Band D" },
  { series: "band-e", label: "Band E" },
  { series: "band-f", label: "Band F" },
  { series: "band-g", label: "Band G" },
];
const HEATING = [
  { series: "central-heating", label: "Central heating" },
  { series: "condensing-boiler", label: "Condensing boiler" },
  { series: "room-heater", label: "Room heaters only" },
];
const INSULATION = [
  { series: "loft-200mm-plus", label: "Loft insulation ≥ 200mm" },
  { series: "wall-insulation-annex", label: "Insulated walls" },
  { series: "full-double-glazing", label: "Full double glazing" },
];
const IMPROVE = [
  { series: "already-band-c-or-above", label: "Already band C or above" },
  { series: "improvable-to-band-c", label: "Could reach band C" },
  { series: "cannot-reach-band-c", label: "Cannot reach band C" },
];

const pct = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);

const TABLES: Record<Cat, string> = {
  bands: "DA7101 · DA7102",
  heating: "DA6101",
  insulation: "DA6201 · AT2.9",
  improvement: "AT2.13 · AT2.14",
};

const SAMPLE = "unweighted base, not a confidence interval.";

export function EnergyView({ onFoot }: { onFoot?: (foot: InsideFoot) => void }) {
  const { evidence, failed } = useQualityEvidence();
  const cells = useMemo(() => evidence?.cells ?? [], [evidence]);
  const [cat, setCat] = useState<Cat>("bands");
  const [archetype, setArchetype] = useState("");
  const [area, setArea] = useState(ENGLAND);
  const [tenure, setTenure] = useState("all-tenures");
  const [year, setYear] = useState<number | null>(null);
  const [focusFeature, setFocusFeature] = useState<string | null>(null);

  const IND = "ehs-energy-efficiency-bands";
  const archetypes = useMemo(() => archetypesOf(cells, IND, "band-a-b-c"), [cells]);
  const areas = useMemo(() => areasOf(cells, IND, "band-a-b-c"), [cells]);
  const arch = cat === "bands" && archetypes.some((a) => a.value === archetype) ? archetype : "";
  const ar = cat === "bands" && !arch && areas.some((a) => a.value === area) ? area : ENGLAND;
  const sel = { archetype: arch, area: ar };

  const at = (ind: string, series: string, yy: number | null, tt: string): Cell | undefined =>
    slice(cells, ind, series, sel).find((c) => c.year === yy && c.tenure === tt);

  const indFor: Record<Cat, string> = {
    bands: IND,
    heating: "ehs-heating",
    insulation: "ehs-insulation",
    improvement: "ehs-energy-improvement",
  };
  const seriesFor: Record<Cat, string> = {
    bands: "band-a-b-c",
    heating: "condensing-boiler",
    insulation: "loft-200mm-plus",
    improvement: "improvable-to-band-c",
  };
  const base = slice(cells, indFor[cat], seriesFor[cat], sel);
  const years = [...new Set(base.map((c) => c.year))].sort((a, b) => a - b);
  const y = year != null && years.includes(year) ? year : (years[years.length - 1] ?? null);
  const tenures = TENURES.filter((t) => base.some((c) => c.year === y && c.tenure === t.id));
  const t = tenures.some((x) => x.id === tenure) ? tenure : (tenures[0]?.id ?? "all-tenures");

  const annValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of ENERGY) {
      const s = slice(cells, f.ind, f.series, {
        archetype: "",
        area: ENGLAND,
      }).filter((c) => c.v != null);
      const ys = [...new Set(s.map((c) => c.year))].sort((a, b) => a - b);
      const yy = ys.filter((v) => y == null || v <= y).at(-1);
      const c = s.find((x) => x.year === yy && x.tenure === t) ?? s.find((x) => x.year === yy && x.tenure === "all-tenures");
      out[f.id] = evidence ? pct(c?.v) : "…";
    }
    return out;
  }, [cells, evidence, t, y]);

  const rows = (ind: string, list: { series: string; label: string }[]) =>
    list.flatMap((it) => {
      const c = at(ind, it.series, y, t);
      return c?.v != null ? [{ id: it.series, label: it.label, v: c.v }] : [];
    });
  const trendOf = (ind: string, series: string) =>
    slice(cells, ind, series, sel)
      .filter((c) => c.tenure === t && c.v != null)
      .sort((a, b) => a.t - b.t)
      .map((c) => ({ t: c.year, v: c.v! }));

  const abc = at(IND, "band-a-b-c", y, t);
  const cost = at("ehs-energy-improvement", "mean-cost-to-band-c", y, t);
  const scope = arch ? archetypes.find((a) => a.value === arch)?.label : ar === ENGLAND ? "England" : areas.find((a) => a.value === ar)?.label;
  const focus = focusFeature ?? CATS.find((c) => c.id === cat)!.focus;
  const tenureLabel = TENURES.find((x) => x.id === t)?.label ?? "All tenures";
  const publisher = evidence?.sources[indFor[cat]]?.publisher ?? "MHCLG · English Housing Survey";
  const sourceLine = `${publisher} · ${TABLES[cat]}`;
  const coverage = years.length > 0 ? `${scope ?? "England"} · ${years[0]}–${years[years.length - 1]} · ${tenureLabel}` : "";
  const caveats = [
    cat === "bands" ? "Method break at 2012 (SAP 2009 to SAP 2012)." : "",
    cat === "improvement" ? "The reach-band-C shares and the mean cost are modelled. They depend on the survey's assumptions." : "",
  ].filter(Boolean);
  const caveatText = caveats.join(" ");

  useEffect(() => {
    onFoot?.({ source: sourceLine, coverage, caveats: caveatText ? [caveatText] : [] });
  }, [onFoot, sourceLine, coverage, caveatText]);

  return (
    <div className={e.root}>
      <p className={e.lede}>
        The Energy Anatomy: how England&apos;s homes are rated, heated and insulated, and how far they could improve. Ratings here are English Housing
        Survey models of a representative sample — not the EPC certificate register.
      </p>

      <ControlRow label="Energy controls">
        <MenuControl
          label="Category"
          value={cat}
          options={CATS.map((c) => ({ value: c.id, label: c.label }))}
          onChange={(v) => {
            setCat(v);
            setFocusFeature(null);
          }}
        />
        {cat === "bands" &&
          (archetypes.length > 0 ? (
            <MenuControl
              label="Dwelling archetype"
              value={arch}
              options={[{ value: "", label: "All dwellings" }, ...archetypes.map((a) => ({ value: a.value, label: a.label }))]}
              onChange={(v) => {
                setArchetype(v);
                if (v) setArea(ENGLAND);
              }}
            />
          ) : (
            <UnavailableControl label="Dwelling archetype" reason={evidence ? "Not published for this measure" : "Loading…"} />
          ))}
        {cat === "bands" && areas.length > 0 && (
          <MenuControl
            label="Area"
            value={ar}
            options={[{ value: ENGLAND, label: "England" }, ...areas.map((a) => ({ value: a.value, label: a.label }))]}
            onChange={(v) => {
              setArea(v);
              if (v !== ENGLAND) setArchetype("");
            }}
          />
        )}
        {tenures.length > 0 ? (
          <MenuControl
            label="Tenure"
            value={t}
            options={tenures.map((x) => ({ value: x.id, label: x.label }))}
            onChange={setTenure}
          />
        ) : (
          <UnavailableControl label="Tenure" reason={evidence ? "Not published for this category" : "Loading…"} />
        )}
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

      <div className={e.plate}>
        <div className={`${e.plateMain} ${e.plateFlush}`}>
          <HomeCutaway3D features={ENERGY} values={annValues} active={focus} onSelect={setFocusFeature} />
        </div>

        <aside className={e.panel} data-plain="" aria-live="polite">
          {cat === "bands" && (
            <>
              <p className={e.big}>
                <span className="bo-fig">
                  <DualScramble text={pct(abc?.v)} chars={DUAL_DIGITS} trigger="manual" duration={0.6} />
                </span>
                <span>
                  of dwellings in bands A–C
                  <br />
                  {tenureLabel}
                </span>
              </p>
              <p className={e.body}>
                Share of dwellings in bands A to C, modelled by the English Housing Survey from surveyed characteristics.
              </p>
              <BasisTag
                basis="survey-estimate"
                note={abc?.n ? `${abc.n.toLocaleString("en-GB")} surveyed · ${SAMPLE}` : "No confidence interval is published for this cell."}
              />
              <section className={e.section} aria-label="Band mix">
                <p className="bo-label">Band mix · {tenureLabel}</p>
                <RankBars label="Energy efficiency band mix" rows={rows(IND, BANDS)} format={(v) => `${v.toFixed(1)}%`} />
              </section>
              {trendOf(IND, "band-a-b-c").length > 1 && (
                <TimeChart
                  series={[
                    {
                      id: "abc",
                      label: "A–C",
                      points: trendOf(IND, "band-a-b-c"),
                    },
                  ]}
                  cadence="annual"
                  format={(v) => `${v.toFixed(1)}%`}
                  axisFormat={(v) => `${v.toFixed(0)}%`}
                  marks
                  zero
                  height={140}
                  label="Share in bands A to C over time"
                />
              )}
            </>
          )}

          {cat === "heating" && (
            <>
              <p className="bo-label">Heating systems · England · {y}</p>
              <p className={e.body}>Share of dwellings by heating system.</p>
              <BasisTag
                basis="survey-estimate"
                note="No confidence interval is published for this cell."
              />
              <RankBars label="Heating systems" rows={rows("ehs-heating", HEATING)} format={(v) => `${v.toFixed(1)}%`} />
              {trendOf("ehs-heating", "condensing-boiler").length > 1 && (
                <TimeChart
                  series={[
                    {
                      id: "cb",
                      label: "Condensing boiler",
                      points: trendOf("ehs-heating", "condensing-boiler"),
                    },
                  ]}
                  cadence="annual"
                  format={(v) => `${v.toFixed(1)}%`}
                  axisFormat={(v) => `${v.toFixed(0)}%`}
                  marks
                  zero
                  height={140}
                  label="Condensing boilers over time"
                />
              )}
            </>
          )}

          {cat === "insulation" && (
            <>
              <p className="bo-label">Insulation · England · {y}</p>
              <p className={e.body}>Share of dwellings with each measure. The loft share is of dwellings with lofts.</p>
              <BasisTag basis="survey-estimate" note="No confidence interval is published for this cell." />
              <RankBars label="Insulation measures" rows={rows("ehs-insulation", INSULATION)} format={(v) => `${v.toFixed(1)}%`} />
              {trendOf("ehs-insulation", "loft-200mm-plus").length > 1 && (
                <TimeChart
                  series={[
                    {
                      id: "loft",
                      label: "Loft ≥ 200mm",
                      points: trendOf("ehs-insulation", "loft-200mm-plus"),
                    },
                  ]}
                  cadence="annual"
                  format={(v) => `${v.toFixed(1)}%`}
                  axisFormat={(v) => `${v.toFixed(0)}%`}
                  marks
                  zero
                  height={140}
                  label="Loft insulation over time"
                />
              )}
            </>
          )}

          {cat === "improvement" && (
            <>
              <p className="bo-label">Improvement potential · England · {y}</p>
              <p className={e.body}>Modelled share of dwellings that could reach band C, and the mean cost for those that could.</p>
              <BasisTag basis="modelled-derived" note="Depends on the survey's assumptions." />
              <RankBars label="Improvement to band C" rows={rows("ehs-energy-improvement", IMPROVE)} format={(v) => `${v.toFixed(1)}%`} />
              <p className={e.big}>
                <span className="bo-fig">{cost?.v != null ? `£${Math.round(cost.v).toLocaleString("en-GB")}` : "—"}</span>
                <span>
                  mean modelled cost to reach band C
                  <br />
                  per improvable dwelling · {tenureLabel}
                </span>
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

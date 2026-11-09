"use client";

/**
 * Domain 06 — Energy Field Guide specimen grid.
 * Matched plates are illustrative forms only; MW / TWh / % sit as labelled measures.
 */

import { ENERGY_TECH_PLATES, Plate } from "../Plate";
import { explorerClasses as t } from "../template";
import {
  FIELD_TECHS,
  fmtGw,
  fmtLoadPct,
  fmtTwh,
  journeysForTech,
  plannedMwForTech,
  type FieldTechId,
  type GuideMeasure,
  type PipelineRow,
} from "./renewables-model";
import s from "./generation.module.css";

export type GuideSlice = {
  id: FieldTechId;
  label: string;
  nuclear: boolean;
  capacityMw: number | null;
  generationTwh: number | null;
  loadPct: number | null;
  plannedMw: number | null;
};

export function buildGuideSlices(
  year: number,
  capacityMw: (id: FieldTechId) => number | null,
  generationTwh: (id: FieldTechId) => number | null,
  loadPct: (id: FieldTechId) => number | null,
  pipelineRows: PipelineRow[],
): GuideSlice[] {
  return FIELD_TECHS.map((ft) => ({
    id: ft.id,
    label: ft.label,
    nuclear: ft.nuclear,
    capacityMw: capacityMw(ft.id),
    generationTwh: generationTwh(ft.id),
    loadPct: loadPct(ft.id),
    plannedMw: plannedMwForTech(pipelineRows, ft.id),
  }));
}

function measureValue(slice: GuideSlice, measure: GuideMeasure): number | null {
  if (measure === "built") return slice.capacityMw;
  if (measure === "generating") return slice.generationTwh;
  return slice.loadPct;
}

function formatMeasure(slice: GuideSlice, measure: GuideMeasure): string {
  const v = measureValue(slice, measure);
  if (v == null) return "—";
  if (measure === "built") return fmtGw(v);
  if (measure === "generating") return fmtTwh(v);
  return fmtLoadPct(v);
}

function measureNote(measure: GuideMeasure, nuclear: boolean): string {
  if (measure === "built") return "Installed · DUKES 5.12";
  if (measure === "generating") return "Annual · ET 5.1";
  return nuclear ? "DUKES 5.10 · nuclear stations" : "DUKES 6.3 · load factor";
}

export function RenewablesFieldGuide({
  year,
  measure,
  techId,
  slices,
  onSelect,
}: {
  year: number;
  measure: GuideMeasure;
  techId: FieldTechId;
  slices: GuideSlice[];
  onSelect: (id: FieldTechId) => void;
}) {
  const selected = slices.find((x) => x.id === techId) ?? slices[0]!;
  const values = slices
    .map((x) => measureValue(x, measure))
    .filter((v): v is number => v != null && v > 0);
  const max = values.length ? Math.max(...values) : 1;
  const journeys = journeysForTech(
    FIELD_TECHS.find((t) => t.id === selected.id) ?? FIELD_TECHS[0]!,
  );

  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <ul
          className={s.specimens}
          aria-label={`Energy Field Guide · ${year} · ${measure}`}
        >
          {slices.map((slice) => {
            const plate = ENERGY_TECH_PLATES[slice.id];
            const v = measureValue(slice, measure);
            const bar = v != null && v > 0 ? (v / max) * 100 : 0;
            return (
              <li key={slice.id}>
                <button
                  type="button"
                  className={s.specimen}
                  data-selected={techId === slice.id ? "true" : undefined}
                  onClick={() => onSelect(slice.id)}
                  aria-pressed={techId === slice.id}
                  aria-label={`${slice.label}: ${formatMeasure(slice, measure)}`}
                >
                  {plate ? (
                    <Plate src={plate.src} fit="contain" className={s.specimenPlate} />
                  ) : (
                    <span className={s.specimenPlate} aria-hidden="true" />
                  )}
                  <span className={`bo-label ${s.specimenName}`}>
                    {slice.nuclear ? `${slice.label} · low-carbon` : slice.label}
                  </span>
                  <span className={`bo-fig ${s.specimenShare}`}>
                    {formatMeasure(slice, measure)}
                  </span>
                  <span className={s.specimenBar} aria-hidden="true">
                    <i style={{ width: `${bar}%` }} />
                  </span>
                  <span className={s.specimenCount}>
                    {measureNote(measure, slice.nuclear)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          {selected.label}
          {selected.nuclear ? " · low-carbon" : ""} · {year}
        </h3>
        <dl className={s.metrics} aria-label={`${selected.label} measures · ${year}`}>
          <div>
            <dt>Installed capacity</dt>
            <dd className="bo-fig">
              {selected.capacityMw != null ? fmtGw(selected.capacityMw) : "—"}
            </dd>
            <dd className={s.note}>DUKES 5.12 · {year}</dd>
          </div>
          <div>
            <dt>Annual generation</dt>
            <dd className="bo-fig">
              {selected.generationTwh != null ? fmtTwh(selected.generationTwh) : "—"}
            </dd>
            <dd className={s.note}>ET 5.1 · calendar year</dd>
          </div>
          <div>
            <dt>Load factor</dt>
            <dd className="bo-fig">
              {selected.loadPct != null ? fmtLoadPct(selected.loadPct) : "—"}
            </dd>
            <dd className={s.note}>
              {selected.nuclear ? "DUKES 5.10" : "DUKES 6.3"}
            </dd>
          </div>
          <div>
            <dt>Active planning</dt>
            <dd className="bo-fig">
              {selected.nuclear
                ? "Not in REPD"
                : selected.plannedMw != null
                  ? fmtGw(selected.plannedMw)
                  : "—"}
            </dd>
            <dd className={s.note}>
              {selected.nuclear
                ? "Nuclear is outside the renewable planning database"
                : "REPD non-operational · active lane"}
            </dd>
          </div>
        </dl>
      </section>

      <section className={s.panel}>
        <ul className={s.follow} aria-label="Observatory journeys">
          {journeys.map((j) => (
            <li key={j.id}>
              <a href={j.href}>{j.label}</a>
              <span>{j.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

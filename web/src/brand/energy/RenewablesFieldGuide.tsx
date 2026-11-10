"use client";

/**
 * Domain 06 — Energy field guide specimen grid.
 * Matched plates are illustrative forms only; MW / TWh / % sit as labelled measures.
 * The selected specimen plays its loop (rotors, water, plume, sea) from a tone atlas;
 * the rest stay still. Reduced motion shows the still frame.
 */

import { ENERGY_TECH_PLATES, Plate } from "../Plate";
import { HalftoneMotion, type MotionAtlas } from "../motion";
import { explorerClasses as t } from "../template";
import {
  FIELD_TECHS,
  fmtGw,
  fmtLoadPct,
  fmtTwh,
  plannedMwForTech,
  type FieldTechId,
  type GuideMeasure,
  type PipelineRow,
} from "./renewables-model";
import s from "./generation.module.css";

/** energy-tech-types.py atlases: 20 frames, 4×5, 500px square. Frame 0 = the still plate. */
const techAtlas = (file: string): MotionAtlas => ({
  src: `/brand/plates/${file}-atlas-4x5-500.jpg`,
  cols: 4,
  rows: 5,
  frames: 20,
  frameWidth: 500,
  frameHeight: 500,
});

/** Loop speed per form: rotors and water move, clouds and sea drift slowly. */
const TECH_MOTION: Record<FieldTechId, { atlas: MotionAtlas; fps: number }> = {
  "offshore-wind": { atlas: techAtlas("e-offshore"), fps: 10 },
  "onshore-wind": { atlas: techAtlas("e-onshore"), fps: 10 },
  solar: { atlas: techAtlas("e-solar"), fps: 4 },
  hydro: { atlas: techAtlas("e-hydro"), fps: 8 },
  bioenergy: { atlas: techAtlas("e-bioenergy"), fps: 6 },
  nuclear: { atlas: techAtlas("e-nuclear"), fps: 5 },
};

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
  if (measure === "built") return "Installed capacity";
  if (measure === "generating") return "Annual generation";
  return nuclear ? "Nuclear stations" : "Load factor";
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

  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <ul
          className={s.specimens}
          aria-label={`Energy field guide · ${year} · ${measure}`}
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
                  {plate && techId === slice.id && TECH_MOTION[slice.id] ? (
                    <span className={s.specimenPlate} aria-hidden="true">
                      <HalftoneMotion
                        atlas={TECH_MOTION[slice.id].atlas}
                        fps={TECH_MOTION[slice.id].fps}
                        cell={2.4}
                        fallbackSrc={plate.src}
                      />
                    </span>
                  ) : plate ? (
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
            <dd className={s.note}>Installed capacity · {year}</dd>
          </div>
          <div>
            <dt>Annual generation</dt>
            <dd className="bo-fig">
              {selected.generationTwh != null ? fmtTwh(selected.generationTwh) : "—"}
            </dd>
            <dd className={s.note}>Calendar year</dd>
          </div>
          <div>
            <dt>Load factor</dt>
            <dd className="bo-fig">
              {selected.loadPct != null ? fmtLoadPct(selected.loadPct) : "—"}
            </dd>
            <dd className={s.note}>
              {selected.nuclear ? "Nuclear stations" : "Published load factor"}
            </dd>
          </div>
          <div>
            <dt>Active planning</dt>
            <dd className="bo-fig">
              {selected.nuclear
                ? "Not in planning data"
                : selected.plannedMw != null
                  ? fmtGw(selected.plannedMw)
                  : "—"}
            </dd>
            <dd className={s.note}>
              {selected.nuclear
                ? "Nuclear is outside the renewable planning database"
                : "Planning register · not yet operating"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

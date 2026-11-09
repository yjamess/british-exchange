"use client";

import { useMemo, useState } from "react";
import { BrandRoot } from "@/brand/BrandRoot";
import { FlickerFigure } from "@/brand/motion";
import { InstrumentSelect } from "@/brand/ui";
import s from "./ui-motion.module.css";

/** Lab: instrument scramble + InstrumentSelect. Not production housing. */

type PlaceId = "england" | "london" | "wales";
type MeasureId = "price" | "ratio" | "change" | "land";
type PeriodId = "2024" | "2023" | "decade";

const PLACES: { id: PlaceId; label: string }[] = [
  { id: "england", label: "England" },
  { id: "london", label: "London" },
  { id: "wales", label: "Wales" },
];

const MEASURES: { id: MeasureId; label: string }[] = [
  { id: "price", label: "Median price" },
  { id: "ratio", label: "Price to earnings" },
  { id: "change", label: "Annual change" },
  { id: "land", label: "Green Belt area" },
];

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "2024", label: "2024" },
  { id: "2023", label: "2023" },
  { id: "decade", label: "2014–2024" },
];

/** Lab-only demo values — not Exchange API observations. */
const FIGURES: Record<PlaceId, Record<MeasureId, Record<PeriodId, string>>> = {
  england: {
    price: { "2024": "£273,037", "2023": "£268,400", decade: "£189,000" },
    ratio: { "2024": "7.6×", "2023": "7.8×", decade: "6.9×" },
    change: { "2024": "+1.7%", "2023": "−1.2%", decade: "+44%" },
    land: { "2024": "1.6m ha", "2023": "1.6m ha", decade: "1.6m ha" },
  },
  london: {
    price: { "2024": "£535,000", "2023": "£525,000", decade: "£400,000" },
    ratio: { "2024": "12.1×", "2023": "12.4×", decade: "11.0×" },
    change: { "2024": "+1.9%", "2023": "−0.8%", decade: "+34%" },
    land: { "2024": "35,000 ha", "2023": "35,000 ha", decade: "35,000 ha" },
  },
  wales: {
    price: { "2024": "£210,000", "2023": "£205,000", decade: "£145,000" },
    ratio: { "2024": "5.9×", "2023": "6.1×", decade: "5.4×" },
    change: { "2024": "+2.4%", "2023": "−0.5%", decade: "+45%" },
    land: { "2024": "0.8m ha", "2023": "0.8m ha", decade: "0.8m ha" },
  },
};

const STATIC_SAMPLES = ["£273,037", "7.6×", "+3.8%", "1.6m ha"] as const;

export default function UiMotionLab() {
  const [place, setPlace] = useState<PlaceId>("england");
  const [measure, setMeasure] = useState<MeasureId>("price");
  const [period, setPeriod] = useState<PeriodId>("2024");
  const [replay, setReplay] = useState(0);

  const liveValue = useMemo(
    () => FIGURES[place][measure][period],
    [place, measure, period],
  );

  return (
    <BrandRoot>
      <main className={`bo-wrap ${s.page}`}>
        <p className="bo-label">Lab · UI motion</p>
        <h1 className="bo-d2">Flicker figures and instrument menus</h1>
        <p className={s.lede}>
          Airport-board scramble for digits; the listbox hover is the solid ink block.
          Promote to housing canvas after sign-off — production selects stay native
          for now.
        </p>

        <section className={s.section} aria-labelledby="figures-heading">
          <h2 id="figures-heading" className="bo-d3">
            Figures strip
          </h2>
          <p className={s.note}>
            Only Unicode digits scramble; £ , . × % and spaces stay put.
          </p>
          <div className={s.figures}>
            {STATIC_SAMPLES.map((v) => (
              <FlickerFigure
                key={`${v}-${replay}`}
                value={v}
                replayKey={replay}
                className={`bo-fig ${s.fig}`}
              />
            ))}
          </div>
          <button
            type="button"
            className={s.replay}
            onClick={() => setReplay((n) => n + 1)}
          >
            Replay scramble
          </button>
        </section>

        <section className={s.section} aria-labelledby="menus-heading">
          <h2 id="menus-heading" className="bo-d3">
            Instrument menus
          </h2>
          <p className={s.note}>
            Place / Measure / Period — changing a control re-flickers the figure.
          </p>
          <div className={s.controls}>
            <InstrumentSelect
              label="Place"
              value={place}
              options={PLACES}
              onChange={(id) => setPlace(id as PlaceId)}
            />
            <InstrumentSelect
              label="Measure"
              value={measure}
              options={MEASURES}
              onChange={(id) => setMeasure(id as MeasureId)}
            />
            <InstrumentSelect
              label="Period"
              value={period}
              options={PERIODS}
              onChange={(id) => setPeriod(id as PeriodId)}
            />
          </div>
          <div className={s.live}>
            <p className="bo-label">
              {MEASURES.find((m) => m.id === measure)?.label} ·{" "}
              {PLACES.find((p) => p.id === place)?.label} ·{" "}
              {PERIODS.find((p) => p.id === period)?.label}
            </p>
            <FlickerFigure
              value={liveValue}
              className={`bo-fig ${s.figLive}`}
            />
          </div>
        </section>

        <section className={s.section} aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="bo-d3">
            Notes
          </h2>
          <ul className={s.notes}>
            <li>Tone from density (Bayer strip), not opacity fades.</li>
            <li>
              <code>prefers-reduced-motion</code> snaps figures and menu open —
              no scramble, no tween.
            </li>
            <li>
              Components: <code>@/brand/motion</code> (
              <code>FlickerFigure</code>) and <code>@/brand/ui</code> (
              <code>InstrumentSelect</code>). Wire into housing explorer
              controls / stats strip in a follow-up.
            </li>
          </ul>
        </section>
      </main>
    </BrandRoot>
  );
}

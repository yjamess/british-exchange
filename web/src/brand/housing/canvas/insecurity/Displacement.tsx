"use client";

/**
 * Domain 08 — The Geography of Displacement.
 * Housing Prices map chrome: map + place readout (legend inside), then RankBars.
 * Measure / search controls live in HousingExplorer. No table-code jargon on screen.
 */

import { useEffect, useMemo, useState } from "react";
import { EmptyStage, MapLegend, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import { AreaMap } from "../../atlas/AreaMap";
import { breaks, formatValue, type Area, type Geometry } from "../../atlas/model";
import type { HousingV1 } from "../../load";
import s from "./insecurity.module.css";
import gen from "../../../energy/generation.module.css";

type Ins = HousingV1["insecurity"];
export type DisplacementMode = "rate" | "share";

type Props = {
  insecurity: Ins;
  area: string;
  mode: DisplacementMode;
  onArea: (code: string | null) => void;
};

const MEASURE: Record<
  DisplacementMode,
  { id: string; label: string; unit: string; figure: string }
> = {
  rate: {
    id: "ta-per-thousand",
    label: "Households in temporary accommodation per 1,000",
    unit: "per 1,000 households",
    figure: "per 1,000 households",
  },
  share: {
    id: "ta-out-of-area-share",
    label: "Share placed outside the authority",
    unit: "% of households in temporary accommodation",
    figure: "placed outside the authority",
  },
};

export const DISPLACEMENT_MEASURE_OPTIONS: { value: DisplacementMode; label: string }[] = [
  { value: "rate", label: MEASURE.rate.label },
  { value: "share", label: MEASURE.share.label },
];

let geometryCache: Geometry | null = null;

/** Local-authority boundaries for the Housing map stages (shared with Ownership › Who owns). */
export function useGeometry() {
  const [geometry, setGeometry] = useState<Geometry | null>(geometryCache);
  const [error, setError] = useState("");
  useEffect(() => {
    if (geometryCache) return;
    let live = true;
    fetch("/api/housing/map-pack?variant=geometry")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load boundaries.");
        return r.json() as Promise<{ geometry: Geometry }>;
      })
      .then((pack) => {
        geometryCache = pack.geometry;
        if (live) setGeometry(pack.geometry);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Could not load boundaries."));
    return () => {
      live = false;
    };
  }, []);
  return { geometry, error };
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (iso: string) =>
  iso ? `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "the latest date";

export function displacementFoot(insecurity: Ins, mode: DisplacementMode): {
  definition: string;
  method: string[];
  source: string;
} {
  const date = dateLabel(insecurity.taDurationDate);
  return {
    definition:
      mode === "share"
        ? "Share of an authority's households in temporary accommodation that were placed outside its own area."
        : "Households in temporary accommodation per 1,000 households in the authority.",
    method: [
      "The map shows where the homelessness duty sits, not where any family lives.",
      mode === "share"
        ? "Out-of-area share = households placed outside the authority ÷ households in temporary accommodation, same authority and date (Exchange derivation)."
        : "Rate is the published households-per-thousand figure for temporary accommodation.",
      "Placement counts have no published destinations — no connection lines are drawn.",
      "Unshaded places: not published, suppressed, or outside England.",
    ],
    source: `MHCLG local temporary accommodation tables · England · stock on ${date}`,
  };
}

export function Displacement({ insecurity, area, mode, onArea }: Props) {
  const { geometry, error } = useGeometry();
  const places = insecurity.taPlaces;
  const date = dateLabel(insecurity.taDurationDate);
  const measure = MEASURE[mode];

  const valueFor = (p: Ins["taPlaces"][number]) =>
    mode === "rate"
      ? p.rate
      : p.outOfArea != null && p.households != null && p.households > 0
        ? (p.outOfArea / p.households) * 100
        : null;

  const areas: Area[] = useMemo(
    () => places.map((p) => ({ code: p.code, name: p.name, level: "local" as const, values: [valueFor(p)] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueFor depends on mode only
    [places, mode],
  );
  const ranked = useMemo(
    () =>
      places
        .map((p) => ({ id: p.code, label: p.name, v: valueFor(p) }))
        .filter((r): r is { id: string; label: string; v: number } => r.v != null)
        .sort((a, b) => b.v - a.v),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueFor depends on mode only
    [places, mode],
  );

  const selected = places.find((p) => p.code === area) ?? null;
  const selectedV = selected ? valueFor(selected) : null;
  const rank = selected ? ranked.findIndex((r) => r.id === selected.code) + 1 : 0;
  const thresholds = breaks(measure.id, "price");
  const engOut = insecurity.headlines.outOfAreaEngland;

  if (places.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Local temporary-accommodation tables are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          {measure.label} · England · {date}
        </h3>
        <div className={s.mapGrid}>
          <div className={s.mapCol}>
            {geometry ? (
              <AreaMap
                shapes={geometry.shapes}
                areas={areas}
                month={0}
                measure={measure.id}
                mode="price"
                selected={area}
                comparison=""
                onSelect={(code) => onArea(code === area ? null : code)}
                flow
                compact
                coverage="Local authorities · England"
                mapLabel="Map of English local authorities. The count is where the homelessness duty sits, not where a household lives."
              />
            ) : (
              <EmptyStage label={error ? "Map unavailable" : "Loading map"}>
                {error || "Fetching local-authority boundaries…"}
              </EmptyStage>
            )}
          </div>

          <aside className={s.readout} aria-live="polite" aria-label="Place record">
            <p className="bo-label">In focus</p>
            {selected ? (
              <>
                <p className={s.placeName}>{selected.name}</p>
                <p className={`bo-fig ${s.readoutValue}`}>
                  {selectedV == null
                    ? "—"
                    : mode === "rate"
                      ? selectedV.toFixed(1)
                      : `${selectedV.toFixed(0)}%`}
                </p>
                <p className={s.readoutMeta}>
                  {measure.figure}
                  {rank > 0 ? ` · ${ordinal(rank)} of ${ranked.length}` : ""}
                  {` · ${date}`}
                </p>
                <dl className={s.facts}>
                  <div>
                    <dt>In temporary accommodation</dt>
                    <dd>
                      {selected.households == null
                        ? "Not published"
                        : `${fmt.count(selected.households)} households`}
                    </dd>
                  </div>
                  <div>
                    <dt>Children</dt>
                    <dd>{selected.children == null ? "Not published" : fmt.count(selected.children)}</dd>
                  </div>
                  <div>
                    <dt>Per 1,000 households</dt>
                    <dd>{selected.rate == null ? "Not published" : selected.rate.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>Placed outside the authority</dt>
                    <dd>
                      {selected.outOfArea == null
                        ? "Not published or suppressed"
                        : `${fmt.count(selected.outOfArea)} households`}
                    </dd>
                  </div>
                </dl>
                {selected.days.some((d) => d.mean != null || d.median != null) && (
                  <div className={t.tableWrap}>
                    <table className={t.table}>
                      <caption>Days there so far, by accommodation type</caption>
                      <thead>
                        <tr>
                          <th scope="col">Type</th>
                          <th scope="col">Mean</th>
                          <th scope="col">Median</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.days
                          .filter((d) => d.mean != null || d.median != null)
                          .map((d) => (
                            <tr key={d.id}>
                              <th scope="row">{d.label}</th>
                              <td>{d.mean == null ? "—" : fmt.count(d.mean)}</td>
                              <td>{d.median == null ? "—" : fmt.count(d.median)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className={s.readoutMeta}>
                  Select a local authority on the map or in the ranking. No place is chosen until you do.
                </p>
                {engOut != null && (
                  <p className={s.big}>
                    <span className="bo-fig">{fmt.count(engOut)}</span>
                    <span>households placed outside their authority · England · {date}</span>
                  </p>
                )}
              </>
            )}

            <MapLegend
              title={measure.unit}
              thresholds={thresholds}
              format={(v) => formatValue(v, measure.id, "price", true)}
            />
          </aside>
        </div>
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Highest 20 authorities · {date}</h3>
        <RankBars
          label={`${measure.label} · highest 20 · ${date}`}
          rows={ranked.slice(0, 20).map((r) => ({ ...r, active: r.id === area }))}
          format={(v) => (mode === "rate" ? v.toFixed(1) : `${v.toFixed(0)}%`)}
          onSelect={(id) => onArea(id === area ? null : id)}
        />
      </section>
    </div>
  );
}

function ordinal(n: number) {
  const sfx = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${sfx[(v - 20) % 10] ?? sfx[v] ?? sfx[0]}`;
}

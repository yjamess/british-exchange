"use client";

/**
 * Domain 06 — Historical change.
 * England Green Belt area at each 31 March (hectares) plus landmark-year
 * published boundaries. Designation snapshots — not a continuous rewound map.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fetchPackJson } from "@/lib/api";
import { fmt, fmtT, type Pt } from "../../../data";
import { TimeChart } from "../../../instrument/TimeChart";
import gen from "../../../energy/generation.module.css";
import s from "./landExplorer.module.css";

type Enc = { type: "MultiPolygon"; c: [number, number][][][] };
type Plate = {
  year: string;
  label: string;
  boundary: Enc;
  bbox: [number, number, number, number];
  source: { publisher: string; layer: string; landing: string; licence: string };
  notes: string[];
};
type HistoryIndex = {
  years: { year: string; label: string; pack_id: string }[];
};

/** Narrow million-hectare scales need two decimals — one rounds every tick to “1.6m”. */
function axisHa(v: number): string {
  return `${(v / 1_000_000).toFixed(2)}m`;
}

export const GB_HISTORY_YEARS = ["2019-20", "2020-21", "2021-22", "2022", "2023-24", "2024-25"] as const;
export type GbHistoryYear = (typeof GB_HISTORY_YEARS)[number];

export function historyFoot(
  greenBelt: Pt[],
  year: string,
): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const first = greenBelt[0];
  const latest = greenBelt.at(-1);
  const change = first && latest ? latest.v - first.v : null;
  const firstYear = first ? fmtT(first.t, "annual") : null;
  const latestYear = latest ? fmtT(latest.t, "annual") : null;
  return {
    definition:
      "England’s Green Belt at each 31 March, in hectares, with the published boundary for the selected landmark year.",
    method: [
      "Dashed joins bridge years the publisher did not issue (for example 2013, and sparse early releases). They are not estimates.",
      `The map shows the dissolved England outline for ${year} — a designation snapshot, simplified for screen, not for measuring area.`,
      "Land Explorer draws the current Green Belt for one council. It is not a historic year.",
      first && latest && change != null
        ? `${firstYear}: ${fmt.count(first.v)} ha. ${latestYear}: ${fmt.count(latest.v)} ha. The designated area is ${fmt.count(Math.abs(change))} ha ${change >= 0 ? "larger" : "smaller"} than in ${firstYear}.`
        : "",
    ].filter(Boolean),
    source: "MHCLG · Green Belt statistics + English local authority Green Belt dataset · England · 31 March",
    dataHref: "/data#green-belt-area",
  };
}

function projectPath(
  boundary: Enc,
  bbox: [number, number, number, number],
  width = 720,
): { d: string; height: number } {
  const [minx, miny, maxx, maxy] = bbox;
  const midLat = (miny + maxy) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180);
  const spanX = Math.max((maxx - minx) * cos, 1e-6);
  const spanY = Math.max(maxy - miny, 1e-6);
  const height = Math.round(width * (spanY / spanX));
  const sx = width / spanX;
  const sy = height / spanY;
  const to = ([lon, lat]: [number, number]) => {
    const x = (lon - minx) * cos * sx;
    const y = (maxy - lat) * sy;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const parts: string[] = [];
  for (const poly of boundary.c) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      parts.push(`M${ring.map(to).join("L")}Z`);
    }
  }
  return { d: parts.join(""), height: Math.max(height, 240) };
}

export function HistoricalChange({
  greenBelt,
  year,
}: {
  greenBelt: Pt[];
  year: string;
}) {
  const uid = useId().replace(/:/g, "");
  const first = greenBelt[0];
  const latest = greenBelt.at(-1);
  const [plate, setPlate] = useState<Plate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const packId = `housing.green-belt-history-${year}`;
    void fetchPackJson<Plate>(packId)
      .then((next) => {
        if (!cancelled) {
          setPlate(next);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPlate(null);
          setError(err instanceof Error ? err.message : "Plate unavailable");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const drawn = useMemo(() => {
    if (!plate?.boundary || plate.boundary.type !== "MultiPolygon") return null;
    return projectPath(plate.boundary, plate.bbox);
  }, [plate]);

  if (!first || !latest) {
    return (
      <EmptyStage label="In preparation">
        The Green Belt area series is not loaded yet. No past boundary is drawn from today’s polygon.
      </EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          Green Belt area · England · hectares at 31 March
        </h3>
        <TimeChart
          series={[{ id: "green-belt", label: "Green Belt", points: greenBelt }]}
          cadence="annual"
          gaps="dashed"
          format={(v) => `${fmt.count(v)} ha`}
          axisFormat={axisHa}
          height={320}
          label="England Green Belt area, hectares at 31 March"
        />
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          Green Belt boundary · England · {plate?.label ?? year}
        </h3>
        {loading ? (
          <p className={s.note}>Loading the published boundary for {year}…</p>
        ) : error || !drawn || !plate ? (
          <EmptyStage label="Boundary unavailable">
            {error || `No landmark plate for ${year}.`} The hectare series above still stands.
          </EmptyStage>
        ) : (
          <figure className={s.map}>
            <svg
              viewBox={`0 0 720 ${drawn.height}`}
              role="img"
              aria-label={`England Green Belt designation, ${plate.label}`}
              className={s.svg}
            >
              <defs>
                <pattern id={`${uid}-gb`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" />
                </pattern>
              </defs>
              <path d={drawn.d} fill={`url(#${uid}-gb)`} stroke="currentColor" strokeWidth="0.8" className={s.boundary} />
            </svg>
            <figcaption className={s.caption}>
              <span className="bo-label">{plate.label}</span>
              <span>
                Dissolved England outline · designation snapshot · not for measuring hectares ·{" "}
                {plate.source.layer}
              </span>
            </figcaption>
          </figure>
        )}
      </section>
    </div>
  );
}

/** Prefetch index so the year menu can fall back if packs differ. */
export async function loadGbHistoryYears(): Promise<string[]> {
  try {
    const index = await fetchPackJson<HistoryIndex>("housing.green-belt-history-index");
    const years = index.years.map((y) => y.year);
    return years.length ? years : [...GB_HISTORY_YEARS];
  } catch {
    return [...GB_HISTORY_YEARS];
  }
}

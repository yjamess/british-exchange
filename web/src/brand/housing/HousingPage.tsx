"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SectorPage, PlateBand, FieldBand, ridgesField, fmt, fmtT, toT, type Pt, type SectorStat } from "..";
import type { HousingV1 } from "./load";
import { HousingExplorer } from "./canvas/HousingExplorer";
import type { DomainId } from "./canvas/model";
import type { PricesMapPayload } from "./canvas/PricesMapStage";

/**
 * Housing & Land — Gate 2 page (Notion product scope), built on the brand template:
 * SectorPage (mast · houses plate, name on an ink strip) → [threshold] → HousingExplorer (template Explorer).
 * Shareable URL: /housing?domain=&view=&place=&measure=&from=&to=&date=&area=
 */

export type { PricesMapPayload };
export type ThresholdKind = "none" | "plate" | "ridges";

const last = (p: Pt[]) => p[p.length - 1];

function pageStatsFor(data: HousingV1): SectorStat[] {
  const p = last(data.price);
  const pPrev = p ? data.price.find((x) => Math.abs(x.t - (p.t - 1)) < 1e-6) : undefined;
  const af = last(data.afford);
  const rc = last(data.rentChange);
  const gb = last(data.greenBelt);
  return [
    {
      label: "Average house price · UK",
      value: p ? fmt.gbp(p.v) : "—",
      note: p && pPrev ? `${fmt.pctSigned((p.v / pPrev.v - 1) * 100)} on a year earlier · ${fmtT(p.t)}` : p ? fmtT(p.t) : "Awaiting series",
    },
    {
      label: "Years of pay · England",
      value: af ? fmt.ratio(af.v) : "—",
      note: af ? `median price / workplace earnings · ${fmtT(af.t, "annual")}` : "Awaiting series",
    },
    {
      label: "Private rents · UK",
      value: rc ? fmt.pctSigned(rc.v) : "—",
      note: rc ? `annual change · ${fmtT(rc.t)}` : "Awaiting series",
    },
    {
      label: "Green Belt · England",
      value: gb ? `${fmt.countCompact(gb.v)} ha` : "—",
      note: gb ? `as at 31 March ${fmtT(gb.t, "annual")}` : "Awaiting series",
    },
  ];
}

/** Regional house prices drawn as ridges — data art, so it carries its source. */
function RidgesBand({ data }: { data: HousingV1 }) {
  const values = data.ridges.values;
  const field = useMemo(
    () => ridgesField(values, { hold: true, periodsPerSecond: 14, bounds: { left: 0.03, right: 0.97, top: 0.12, bottom: 0.94 } }),
    [values],
  );
  if (values.length === 0) return null;
  const q = data.ridges.quarters.map((x) => fmtT(toT(x)));
  const src = data.sources["house-prices-by-region"];
  return (
    <FieldBand
      field={field}
      label={`Average house price by nation and region, quarterly, ${q[0] ?? ""} to ${q[q.length - 1] ?? ""}, drawn as ridges`}
      caption={`${data.ridges.names.length} nations and regions, one ridge each, height = average price${q.length > 0 ? `, ${q[0]} – ${q[q.length - 1]}` : ""}.`}
      source={
        src ? (
          <>
            {src.publisher} · {src.title}
            {src.release ? ` · ${src.release}` : ""} · <a href={`/data#${src.id}`}>{src.id}</a>
          </>
        ) : null
      }
    />
  );
}

export function HousingPage({
  data,
  initialDomain = "prices",
  pageStats = false,
  threshold = "none",
  stageBar = "hairline",
  ground = "paper",
  pricesMap = null,
  rentMap = null,
  affordMap = null,
}: {
  data: HousingV1;
  initialDomain?: DomainId;
  /** Page-level stats strip under the hero (each domain also has its own figures strip). */
  pageStats?: boolean;
  /** Band between page head and explorer. */
  threshold?: ThresholdKind;
  /** Explorer stage title bar treatment. */
  stageBar?: "hairline" | "solid";
  /** Explorer canvas ground: paper, or a light dot field (light by density). */
  ground?: "paper" | "field";
  /** Atlas + boundaries for Domain 01 Map (null if unavailable). */
  pricesMap?: PricesMapPayload | null;
  /** Atlas + boundaries for Domain 02 Renting Map (null if unavailable). */
  rentMap?: PricesMapPayload | null;
  /** Atlas + boundaries for Domain 03 Affordability Map (null if unavailable). */
  affordMap?: PricesMapPayload | null;
}) {
  const searchParams = useSearchParams();
  // The bare /housing URL is the landing. A domain in the query is a sub-page.
  const hero = searchParams.get("domain") ? "band" : "full";
  return (
    <SectorPage
      name="Housing"
      label="Housing & Land"
      hero={hero}
      plate={{ name: "housesFull", treatment: "print", position: "46% 62%" }}
      stats={pageStats ? pageStatsFor(data) : undefined}
      threshold={threshold === "plate" ? <PlateBand plate="landPlots" /> : threshold === "ridges" ? <RidgesBand data={data} /> : undefined}
    >
      <HousingExplorer
        data={data}
        initialDomain={initialDomain}
        stageBar={stageBar}
        ground={ground}
        pricesMap={pricesMap}
        rentMap={rentMap}
        affordMap={affordMap}
      />
    </SectorPage>
  );
}

import type { Metadata } from "next";
import { BrandRoot } from "@/brand/BrandRoot";
import { fetchIndicator, fetchObservations, type Observation } from "@/lib/api";
import { ChartMotionLab, type LabData } from "./ChartMotionLab";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Chart motion · Design lab" };

/** "YYYY-MM-DD" → fractional year (month resolution). */
const toT = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return y! + (m! - 1) / 12;
};

const pts = (rows: Observation[]) =>
  rows
    .filter((r) => r.value != null)
    .map((r) => ({ t: toT(r.period_start), v: r.value as number, p: r.observation_status === "provisional" }))
    .sort((a, b) => a.t - b.t);

async function load(): Promise<LabData | null> {
  try {
    const [hpi, regions, completions, hpiMeta, regMeta, compMeta] = await Promise.all([
      fetchObservations("uk-average-house-price", { limit: "2000" }),
      fetchObservations("house-prices-by-region", { limit: "10000" }),
      fetchObservations("housing-completions", { limit: "2000" }),
      fetchIndicator("uk-average-house-price"),
      fetchIndicator("house-prices-by-region"),
      fetchIndicator("housing-completions"),
    ]);

    // Regions: latest month per place, and the change on the same month a year earlier.
    const byPlace = new Map<string, Observation[]>();
    for (const r of regions.observations) {
      if (r.value == null) continue;
      const list = byPlace.get(r.geography_label) ?? [];
      list.push(r);
      byPlace.set(r.geography_label, list);
    }
    const ranks = [...byPlace.entries()]
      .filter(([name]) => !["United Kingdom", "England", "Great Britain"].includes(name))
      .map(([name, rows]) => {
        const sorted = rows.sort((a, b) => a.period_start.localeCompare(b.period_start));
        const last = sorted[sorted.length - 1]!;
        const [y, m] = last.period_start.split("-");
        const prior = sorted.find((r) => r.period_start.startsWith(`${Number(y) - 1}-${m}`));
        return {
          id: name,
          label: name,
          price: last.value as number,
          change: prior?.value ? ((last.value as number) / prior.value - 1) * 100 : 0,
          period: last.period_start,
        };
      });

    const comp = completions.observations.filter((r) => r.dimensions?.series === "all-completions");

    return {
      line: { label: hpiMeta.title, points: pts(hpi.observations), source: `${hpiMeta.publisher} · ${hpiMeta.series_id}` },
      ranks: { rows: ranks, source: `${regMeta.publisher} · ${regMeta.title}` },
      columns: { points: pts(comp).slice(-40), source: `${compMeta.publisher} · ${compMeta.title} · England, all tenures` },
    };
  } catch {
    return null;
  }
}

/** Lab: motion studies for the brand charts. Not production — no TimeChart changes. */
export default async function ChartMotionPage() {
  const data = await load();
  return (
    <BrandRoot>
      <ChartMotionLab data={data} />
    </BrandRoot>
  );
}

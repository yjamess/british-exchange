/**
 * Design lab 02 — "Imprint".
 *
 * Test page for the next homepage direction. Nothing here is wired into
 * the live homepage yet. Shared inspo: Nous imprint (grain, duotone,
 * stamped marks) + Every (perforated halftone stamps) + ASCII fields
 * (ISE blueprint framing, dense silhouettes, teal subjects on cards).
 */

import type { Metadata } from "next";
import { apiBase } from "@/lib/api";
import { loadTickerStat, type TickerStat } from "@/lib/latest";
import { ImprintLab, type LabData } from "./ImprintLab";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Imprint lab · Britain Exchange" };

async function loadTitles(): Promise<string[]> {
  try {
    const res = await fetch(`${apiBase()}/indicators`, { cache: "no-store" });
    if (!res.ok) return [];
    const rows = (await res.json()) as { title?: string }[];
    return rows.map((r) => r.title ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

/** "£2832bn" → "£2.8tn" — stamp-sized figures. */
function compact(stat: TickerStat | null): TickerStat | null {
  if (!stat) return null;
  const m = stat.value.replace(/,/g, "").match(/^£(\d{4,})bn$/);
  return m ? { ...stat, value: `£${(Number(m[1]) / 1000).toFixed(1)}tn` } : stat;
}

export default async function ImprintLabPage() {
  const [titles, cpi, debt, gas, employment, gdp] = await Promise.all([
    loadTitles(),
    loadTickerStat("cpi-inflation", "CPI inflation", "/economy"),
    loadTickerStat("public-sector-net-debt", "Public net debt", "/economy").then(compact),
    loadTickerStat("electricity-generation-by-source", "Elec. from gas", "/energy", {
      fuel: "Gas",
      include_aggregates: "false",
    }),
    loadTickerStat("employment-rate", "Employment rate", "/economy"),
    loadTickerStat("real-gdp", "Real GDP", "/economy"),
  ]);

  const data: LabData = {
    titles,
    seriesCount: titles.length || null,
    stats: { cpi, debt, gas, employment, gdp },
  };

  return <ImprintLab data={data} />;
}

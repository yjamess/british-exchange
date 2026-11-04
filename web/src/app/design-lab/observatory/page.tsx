/**
 * Design lab 03 — "The Record".
 *
 * British Observatory: deep public data + original investigations.
 * Structure follows the four tenses of the brief — what Britain was,
 * what it is, how it got here, where it may be heading — and every
 * visual on the page is drawn from a real series in the catalogue.
 */

import type { Metadata } from "next";
import { Sofia_Sans_Extra_Condensed } from "next/font/google";
import { ObservatoryLab } from "./ObservatoryLab";
import { loadCatalogue, loadFigure, type SeriesRecord } from "./lib/record";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The Record · British Observatory" };

const condensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-cond",
});

export default async function ObservatoryPage() {
  const [catalogue, employment, cpi, debt, population] = await Promise.all([
    loadCatalogue(),
    loadFigure("employment-rate"),
    loadFigure("cpi-inflation"),
    loadFigure("public-sector-net-debt"),
    loadFigure("uk-population-estimate"),
  ]);
  const pick = (id: string): SeriesRecord | null => catalogue.find((s) => s.id === id) ?? null;

  return (
    <div className={condensed.variable}>
      <ObservatoryLab
        data={{
          catalogue,
          gdp: pick("bank-of-england-millennium-gdp"),
          unemployment: pick("uk-unemployment-rate-long-run"),
          manufacturing: pick("long-run-manufacturing-employment"),
          coal: pick("historical-coal-production"),
          housing: pick("house-price-to-earnings-ratio"),
          figures: [employment, cpi, debt, population].filter((f): f is NonNullable<typeof f> => !!f),
        }}
      />
    </div>
  );
}

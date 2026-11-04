import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sofia_Sans_Extra_Condensed } from "next/font/google";
import { SeriesChart } from "@/components/SeriesChart";
import { SourcePanel } from "@/components/SourcePanel";
import { fetchIndicator, fetchObservations } from "@/lib/api";
import { AsciiField } from "../../../design-lab/imprint/AsciiField";
import s from "../../housing.module.css";

export const dynamic = "force-dynamic";

const condensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-cond",
});

const ALLOWED = new Set([
  "uk-average-house-price",
  "uk-hpi-measures",
  "house-prices-by-region",
  "private-rental-price-index",
  "house-price-to-earnings-ratio",
  "housing-completions",
  "dwelling-stock-by-tenure",
]);

const INK = "#0d1258";
const PAPER = "#efebe1";

export default async function HousingDataProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ALLOWED.has(id)) notFound();

  let meta;
  let observations;
  try {
    [meta, observations] = await Promise.all([
      fetchIndicator(id),
      fetchObservations(id, { limit: "8000" }),
    ]);
  } catch {
    notFound();
  }

  let chartRows = observations.observations;
  if (id === "uk-hpi-measures") {
    chartRows = chartRows.filter(
      (r) =>
        r.dimensions?.series === "average" || /series=average/.test(r.notes || ""),
    );
  }
  if (id === "house-prices-by-region") {
    chartRows = chartRows.filter((r) => r.geography_label === "United Kingdom");
  }
  if (id === "dwelling-stock-by-tenure") {
    chartRows = chartRows.filter(
      (r) =>
        r.dimensions?.demographic === "all-dwellings" ||
        /tenure=all-dwellings/.test(r.notes || ""),
    );
  }

  return (
    <div className={condensed.variable}>
      <div
        className={s.root}
        style={
          {
            "--ink": INK,
            "--deep": "#05072a",
            "--paper": PAPER,
          } as CSSProperties
        }
      >
        <div className={s.frame} aria-hidden="true">
          <span className={`${s.read} ${s.rTL}`}>Data · Housing</span>
          <span className={`${s.read} ${s.rTR}`}>British Observatory</span>
          <span className={`${s.read} ${s.rBL}`}>Profile</span>
          <span className={`${s.read} ${s.rBR}`}>{id}</span>
        </div>

        <section className={s.hero}>
          <nav className={s.nav} aria-label="Primary">
            <Link href="/housing">← Housing</Link>
            <Link href="/housing#data">All datasets</Link>
          </nav>
          <p className={s.kicker}>Data · Housing &amp; Land</p>
          <h1 className={s.h1}>{meta.title}</h1>
          <p className={s.lede}>
            Citable record — methodology, geography, publisher and observations.
          </p>
        </section>

        <div className={s.dissolve} aria-hidden="true" style={{ background: PAPER }}>
          <AsciiField
            className={s.fill}
            source="dissolve"
            fg={INK}
            accent={INK}
            bg={PAPER}
            cell={11}
            lens={false}
            invert
            motion={false}
            flow={0.2}
          />
        </div>

        <div className={s.paper}>
          <div className={s.inner}>
            <section className={s.module}>
              <p className={s.chapterLede}>{meta.definition}</p>
              <div className={s.chartCard}>
                <SeriesChart
                  rows={chartRows}
                  unit={meta.unit}
                  seriesLabel={meta.title}
                  seriesId={meta.series_id}
                  geography={meta.geography}
                  frequency={meta.frequency}
                  chart={observations.chart}
                />
              </div>
              <SourcePanel
                meta={meta}
                chart={observations.chart}
                observationCount={observations.count}
                note={meta.revision_notes || undefined}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

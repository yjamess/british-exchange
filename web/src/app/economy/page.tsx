import Link from "next/link";
import { AsciiAtmosphere } from "@/components/AsciiAtmosphere";
import { SeriesChart } from "@/components/SeriesChart";
import { SourcePanel } from "@/components/SourcePanel";
import { fetchIndicator, fetchObservations } from "@/lib/api";
import styles from "../inner.module.css";

export const dynamic = "force-dynamic";

export default async function EconomyPage() {
  let meta;
  let observations;
  let error: string | null = null;

  try {
    [meta, observations] = await Promise.all([
      fetchIndicator("real-gdp"),
      fetchObservations("real-gdp"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown API error";
  }

  const chart = observations?.chart ?? meta?.chart;

  return (
    <div className={styles.page}>
      <AsciiAtmosphere tone="hint" />
      <main className={styles.shell}>
        <p className={styles.brand}>Britain Exchange</p>
        <nav className={styles.nav} aria-label="Indicators">
          <Link href="/">Observatory</Link>
          <Link href="/economy" aria-current="page">
            Real GDP
          </Link>
          <Link href="/energy">Electricity by fuel</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.kicker}>Economy · first proof</p>
          <h1 className={styles.title}>UK real GDP (quarterly)</h1>
          <p className={styles.lede}>
            ONS series <strong>ABMI</strong> — chained volume measures,
            seasonally adjusted, £ million.
          </p>
        </header>

        {error || !meta || !observations ? (
          <div className={styles.error} role="alert">
            <strong>API unavailable.</strong>
            <code>uv run uvicorn britain_exchange.api:app --reload</code>
            {error ? <code>{error}</code> : null}
          </div>
        ) : (
          <>
            <section className={styles.chartCard} aria-label="Real GDP chart">
              <SeriesChart
                rows={observations.observations}
                unit={meta.unit}
                seriesLabel={chart?.display_title ?? "UK real GDP"}
                seriesId={meta.series_id}
                geography={meta.geography}
                frequency={meta.frequency}
                chart={chart}
              />
            </section>
            <SourcePanel
              meta={meta}
              chart={chart}
              observationCount={observations.count}
              note="Each point is one calendar quarter. Status is provisional because ONS revises ABMI."
            />
          </>
        )}
      </main>
    </div>
  );
}

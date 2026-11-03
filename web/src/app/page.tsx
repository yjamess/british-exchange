import Link from "next/link";
import { SeriesChart } from "@/components/SeriesChart";
import { SourcePanel } from "@/components/SourcePanel";
import { fetchIndicator, fetchObservations } from "@/lib/api";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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

  return (
    <main className={styles.shell}>
      <p className={styles.brand}>Britain Exchange</p>
      <nav className={styles.nav} aria-label="Indicators">
        <Link href="/" aria-current="page">
          Real GDP
        </Link>
        <Link href="/energy">Electricity by fuel</Link>
      </nav>

      <header className={styles.hero}>
        <p className={styles.kicker}>First proof · Economy</p>
        <h1 className={styles.title}>UK real GDP (quarterly)</h1>
        <p className={styles.lede}>
          What you are seeing: ONS series <strong>ABMI</strong> — United Kingdom
          GDP at market prices, chained volume measures, seasonally adjusted,
          in £ million. Pulled from{" "}
          <code>/indicators/real-gdp/observations</code> on the local API.
        </p>
      </header>

      {error || !meta || !observations ? (
        <div className={styles.error} role="alert">
          <strong>API unavailable.</strong> Start the FastAPI server, then refresh.
          <code>uv run uvicorn britain_exchange.api:app --reload</code>
          {error ? <code>{error}</code> : null}
        </div>
      ) : (
        <>
          <section className={styles.chartCard} aria-label="Real GDP chart">
            <SeriesChart
              rows={observations.observations}
              unit={meta.unit}
              seriesLabel="UK real GDP"
              seriesId={meta.series_id}
              geography="United Kingdom"
            />
          </section>
          <SourcePanel
            meta={meta}
            observationCount={observations.count}
            note="Each point is one calendar quarter. Status is provisional because ONS revises ABMI after each GDP release and at Blue Book."
          />
        </>
      )}
    </main>
  );
}

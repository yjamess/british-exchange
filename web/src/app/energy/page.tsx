import Link from "next/link";
import { SeriesChart } from "@/components/SeriesChart";
import { SourcePanel } from "@/components/SourcePanel";
import { fetchIndicator, fetchObservations } from "@/lib/api";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

/** Show gas generation as a simple single-series proof (aggregates already excluded). */
const FUEL = "Gas";

export default async function EnergyPage() {
  let meta;
  let observations;
  let error: string | null = null;

  try {
    [meta, observations] = await Promise.all([
      fetchIndicator("electricity-generation-by-source"),
      fetchObservations("electricity-generation-by-source", {
        fuel: FUEL,
        include_aggregates: "false",
      }),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown API error";
  }

  return (
    <main className={styles.shell}>
      <p className={styles.brand}>Britain Exchange</p>
      <nav className={styles.nav} aria-label="Indicators">
        <Link href="/">Real GDP</Link>
        <Link href="/energy" aria-current="page">
          Electricity by fuel
        </Link>
      </nav>

      <header className={styles.hero}>
        <p className={styles.kicker}>First proof · Energy</p>
        <h1 className={styles.title}>Electricity generated — {FUEL}</h1>
        <p className={styles.lede}>
          DESNZ Energy Trends ET 5.1, All generating companies. Aggregate fuels
          (Total wind / Total all generating companies) are excluded by the API
          default so charts cannot double-count.
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
          <section className={styles.chartCard} aria-label={`${FUEL} generation chart`}>
            <SeriesChart rows={observations.observations} unit={meta.unit} />
          </section>
          <SourcePanel
            meta={meta}
            observationCount={observations.count}
            note={`Filtered to notes=fuel=${FUEL}. Excluded aggregate rows in full series: ${observations.excluded_aggregate_rows}.`}
          />
        </>
      )}
    </main>
  );
}

import Link from "next/link";
import { AsciiAtmosphere } from "@/components/AsciiAtmosphere";
import { SeriesChart } from "@/components/SeriesChart";
import { SourcePanel } from "@/components/SourcePanel";
import { fetchIndicator, fetchObservations } from "@/lib/api";
import styles from "../inner.module.css";

export const dynamic = "force-dynamic";

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

  const chart = observations?.chart ?? meta?.chart;

  return (
    <div className={styles.page}>
      <AsciiAtmosphere tone="hint" />
      <main className={styles.shell}>
        <p className={styles.brand}>Britain Exchange</p>
        <nav className={styles.nav} aria-label="Indicators">
          <Link href="/">Observatory</Link>
          <Link href="/economy">Real GDP</Link>
          <Link href="/energy" aria-current="page">
            Electricity by fuel
          </Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.kicker}>Energy · first proof</p>
          <h1 className={styles.title}>UK electricity from {FUEL} (quarterly)</h1>
          <p className={styles.lede}>
            DESNZ Energy Trends <strong>ET 5.1</strong> — filtered on typed
            dimension fuel={FUEL}. Aggregate totals excluded.
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
            <section className={styles.chartCard} aria-label={`${FUEL} generation chart`}>
              <SeriesChart
                rows={observations.observations}
                unit={meta.unit}
                seriesLabel={`Electricity generated — ${FUEL}`}
                seriesId="ET 5.1"
                geography={meta.geography}
                frequency={meta.frequency}
                chart={chart}
                sourceNote={`Filtered on dimensions.fuel=${FUEL}.`}
              />
            </section>
            <SourcePanel
              meta={meta}
              chart={chart}
              observationCount={observations.count}
              note={`Typed filter dimensions.fuel=${FUEL}.`}
            />
          </>
        )}
      </main>
    </div>
  );
}

import Link from "next/link";
import { AsciiAtmosphere } from "@/components/AsciiAtmosphere";
import { CrownMark } from "@/components/CrownMark";
import { MapPanel } from "@/components/MapPanel";
import { SeriesChart } from "@/components/SeriesChart";
import { StatsTicker } from "@/components/StatsTicker";
import { fetchIndicator, fetchObservations } from "@/lib/api";
import { loadTickerStat } from "@/lib/latest";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const SECTORS = [
  { code: "EN", name: "Energy & Industry", hook: "Fuel mix, manufacturing, prices", href: "/energy" },
  { code: "EC", name: "Economy", hook: "GDP, CPI, labour, public finance", href: "/economy" },
  { code: "HO", name: "Housing & Land", hook: "Atlas · prices · completions", href: "/housing" },
  { code: "PE", name: "People & Society", hook: "Population · NHS · education", href: "/economy" },
  { code: "GO", name: "Government", hook: "Legislation · turnout · DEL", href: "/economy" },
  { code: "IN", name: "Infrastructure", hook: "Rail PPM · water companies", href: "/economy" },
  { code: "RE", name: "Regions & Places", hook: "Nations · boundaries · layers", href: "/#map" },
  { code: "HI", name: "History & Change", hook: "Long-run series · revisions", href: "/economy" },
] as const;

export default async function HomePage() {
  const ticker = (
    await Promise.all([
      loadTickerStat("real-gdp", "Real GDP", "/economy"),
      loadTickerStat("cpi-inflation", "CPI inflation", "/economy"),
      loadTickerStat("employment-rate", "Employment rate", "/economy"),
      loadTickerStat("public-sector-net-debt", "Public net debt", "/economy"),
      loadTickerStat("electricity-generation-by-source", "Elec. from gas", "/energy", {
        fuel: "Gas",
        include_aggregates: "false",
      }),
    ])
  ).filter((s): s is NonNullable<typeof s> => s !== null);

  let meta;
  let observations;
  try {
    [meta, observations] = await Promise.all([
      fetchIndicator("real-gdp"),
      fetchObservations("real-gdp"),
    ]);
  } catch {
    meta = undefined;
    observations = undefined;
  }
  const chart = observations?.chart ?? meta?.chart;

  return (
    <div className={styles.page}>
      <AsciiAtmosphere tone="field" />
      <StatsTicker stats={ticker} />

      {/* Temporary accent comparison — remove after caller picks a red */}
      <aside className={styles.redCompare} aria-label="Accent red options">
        <p className={styles.redCompareLabel}>Accent red · compare on #00103D</p>
        <ul className={styles.redSwatches}>
          <li className={styles.redSwatch}>
            <span className={styles.redChip} style={{ background: "#b3122e" }} />
            <span className={styles.redMeta}>
              <strong>NOW</strong> #B3122E · current
            </span>
            <span className={styles.redSample} style={{ color: "#b3122e", borderBottomColor: "#b3122e" }}>
              Observatory
            </span>
          </li>
          <li className={styles.redSwatch}>
            <span className={styles.redChip} style={{ background: "#c4282e" }} />
            <span className={styles.redMeta}>
              <strong>A</strong> #C4282E · warmer
            </span>
            <span className={styles.redSample} style={{ color: "#c4282e", borderBottomColor: "#c4282e" }}>
              Observatory
            </span>
          </li>
          <li className={styles.redSwatch}>
            <span className={styles.redChip} style={{ background: "#8a1528" }} />
            <span className={styles.redMeta}>
              <strong>B</strong> #8A1528 · darker
            </span>
            <span className={styles.redSample} style={{ color: "#8a1528", borderBottomColor: "#8a1528" }}>
              Observatory
            </span>
          </li>
          <li className={styles.redSwatch}>
            <span className={styles.redChip} style={{ background: "#9e3540" }} />
            <span className={styles.redMeta}>
              <strong>C</strong> #9E3540 · muted
            </span>
            <span className={styles.redSample} style={{ color: "#9e3540", borderBottomColor: "#9e3540" }}>
              Observatory
            </span>
          </li>
        </ul>
      </aside>

      <main className={styles.shell}>
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <CrownMark />
            <div>
              <p className={styles.brand}>Britain Exchange</p>
              <p className={styles.tag}>
                An open British Observatory — verified public data with evidence
                at every level.
              </p>
            </div>
          </div>
          <nav className={styles.nav} aria-label="Primary">
            <Link href="/" aria-current="page">
              Observatory
            </Link>
            <Link href="/economy">Economy</Link>
            <Link href="/energy">Energy</Link>
            <Link href="/#map">Map</Link>
          </nav>
        </div>

        <header className={styles.hero}>
          <p className={styles.kicker}>The Britain Exchange</p>
          <h1 className={styles.title}>How the country lives, works and ages.</h1>
          <p className={styles.lede}>
            Shared foundations, distinctive sector experiences. Blue field,
            technical atmosphere, deep red for the one highlight that matters.
          </p>
        </header>

        <div className={styles.grid}>
          <div id="map">
            <MapPanel />
          </div>
          <div className={styles.sectors} aria-label="Sectors">
            {SECTORS.map((s) => (
              <Link key={s.code} href={s.href} className={styles.sector}>
                <span className={styles.sectorCode}>{s.code}</span>
                <p className={styles.sectorName}>{s.name}</p>
                <p className={styles.sectorHook}>{s.hook}</p>
              </Link>
            ))}
          </div>
        </div>

        {meta && observations ? (
          <section className={styles.proof} aria-label="Featured Ready series">
            <div className={styles.proofHead}>
              <p className={styles.proofKicker}>Featured · Ready evidence</p>
              <Link href="/economy" className={styles.proofLink}>
                Open Economy →
              </Link>
            </div>
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
        ) : null}
      </main>
    </div>
  );
}

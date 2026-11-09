/**
 * Design lab — v1 homepage composition.
 *
 * Not the live `/`. Tests the deferred front door in BrandRoot:
 * mast → one monumental plate → quiet lede → Union sector index → Ready doors.
 *
 * Identity: docs/visual-identity.md · one ink, drawn by instruments.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BrandRoot } from "@/brand/BrandRoot";
import { Plate, type PlateName } from "@/brand/Plate";
import { SECTOR_PAGES } from "@/brand/sector-pages";
import { SECTORS } from "@/brand/sectors";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Homepage · Design lab · British Exchange",
  description: "Composition study for the British Exchange front door. Lab only — not live.",
};

/** Sectors with a drawn explorer today. Others stay open as provisioned shells. */
const READY = new Set(["housing-land", "economy-public-finance", "energy-industry"]);

const CODES: Record<string, string> = {
  "housing-land": "01",
  "economy-public-finance": "02",
  "energy-industry": "03",
  "people-society": "04",
  "government-politics": "05",
  infrastructure: "06",
  "regions-places": "07",
  "history-change": "08",
};

const HOUSING = {
  name: "Housing",
  hook: "Prices, stock, land and who can afford a home.",
  plate: "terrace" as PlateName,
  href: "/housing",
};

const DOORS = [
  HOUSING,
  {
    name: SECTOR_PAGES.energy.name,
    hook: SECTOR_PAGES.energy.headline.join(" "),
    plate: SECTOR_PAGES.energy.plate.name,
    href: "/energy",
  },
  {
    name: SECTOR_PAGES.economy.name,
    hook: SECTOR_PAGES.economy.headline.join(" "),
    plate: SECTOR_PAGES.economy.plate.name,
    href: "/economy",
  },
] as const;

function sectorHook(id: string): string {
  if (id === "housing-land") return HOUSING.hook;
  const page = Object.values(SECTOR_PAGES).find((s) => s.sectorId === id);
  return page ? page.headline.join(" ") : "Provisioned.";
}

function sectorKeyword(label: string): { run: string; key: string } {
  const parts = label.split(" & ");
  if (parts.length === 2) return { run: `${parts[0]} & `, key: parts[1]! };
  const words = label.split(" ");
  if (words.length === 1) return { run: "", key: label };
  return { run: `${words.slice(0, -1).join(" ")} `, key: words[words.length - 1]! };
}

export default function HomeLabPage() {
  return (
    <BrandRoot>
      <div className={styles.page}>
        <header className={styles.mast}>
          <div className={`bo-wrap ${styles.mastInner}`}>
            <Link href="/design-lab/home" className={`bo-statement ${styles.wordmark}`} aria-current="page">
              British Exchange
            </Link>
            <div className={styles.mastMeta}>
              <nav aria-label="Breadcrumb" className="bo-label">
                <Link href="/design-lab">Lab</Link> / <span aria-current="page">Homepage</span>
              </nav>
              <p className={`bo-label ${styles.live}`}>
                <span className={styles.liveDot} aria-hidden="true" />
                Live
              </p>
            </div>
          </div>
        </header>

        <section className={styles.hero} aria-labelledby="home-loud">
          <Plate
            name="globe"
            treatment="print"
            className={styles.heroPlate}
            position="50% 42%"
            label="Halftone globe circled by data orbits — the Exchange"
          />
          <div className={`bo-on-ink ${styles.heroTitle}`}>
            <div className={`bo-wrap ${styles.heroTitleInner}`}>
              <h1 id="home-loud" className={`bo-statement ${styles.loud}`}>
                British Exchange
              </h1>
            </div>
          </div>
        </section>

        <section className={styles.intro} aria-labelledby="home-lede">
          <div className={`bo-wrap ${styles.introGrid}`}>
            <div className={styles.introCopy}>
              <p className="bo-label">An open British observatory</p>
              <h2 id="home-lede" className="bo-hero">
                Every public number, connected.
              </h2>
              <p className="bo-prose">
                Verified series from official releases — energy, economy, housing and the rest of the
                country — with the source on every figure.
              </p>
              <div className={styles.actions}>
                <Link href="/energy" className={`${styles.action} ${styles.actionPrimary} bo-label`}>
                  Open Energy
                </Link>
                <Link href="/data" className={`${styles.action} bo-label`}>
                  Data catalogue
                </Link>
              </div>
            </div>
            <aside className={styles.introAside}>
              <p className="bo-label">Lab note</p>
              <p className={styles.labNote}>
                Composition study only. The live home at <Link href="/">/</Link> is still the older
                observatory shell. Promote this when the index and doors feel right.
              </p>
            </aside>
          </div>
        </section>

        <section className={`bo-on-ink ${styles.index}`} aria-labelledby="home-index">
          <div className="bo-wrap">
            <div className={styles.indexHead}>
              <p className={`bo-label ${styles.indexKicker}`}>Sector index</p>
              <h2 id="home-index" className={`bo-d2 ${styles.indexTitle}`}>
                Eight ways into the country.
              </h2>
              <p>
                Ready sectors open an explorer. The rest are provisioned shells — same frame, series
                still arriving.
              </p>
            </div>

            <ul className={styles.sectors}>
              {SECTORS.map((s) => {
                const ready = READY.has(s.id);
                const { run, key } = sectorKeyword(s.label);
                return (
                  <li key={s.id}>
                    <Link
                      href={s.page ?? `/data#${s.id}`}
                      className={styles.sector}
                      data-ready={ready ? "true" : "false"}
                    >
                      <span className={styles.sectorCode}>{CODES[s.id] ?? "—"}</span>
                      <p className={`bo-caps ${styles.sectorName}`}>
                        {run}
                        <b>{key}</b>
                      </p>
                      <span className={styles.sectorStatus}>{ready ? "Ready" : "Preparing"}</span>
                      <p className={styles.sectorHook}>{sectorHook(s.id)}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className={styles.doors} aria-labelledby="home-doors">
          <div className="bo-wrap">
            <div className={styles.doorsHead}>
              <p className="bo-label">Ready now</p>
              <h2 id="home-doors" className="bo-d3">
                Three doors that already hold evidence.
              </h2>
            </div>
            <ul className={styles.doorList}>
              {DOORS.map((d) => (
                <li key={d.name}>
                  <Link href={d.href} className={styles.door}>
                    <Plate
                      name={d.plate}
                      treatment="print"
                      className={styles.doorPlate}
                      position="50% 45%"
                      label={`${d.name} plate`}
                    />
                    <p className={`bo-d3 ${styles.doorTitle}`}>{d.name}</p>
                    <p className={styles.doorHook}>{d.hook}</p>
                    <span className="bo-label">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className={`bo-wrap ${styles.foot}`}>
          <p className="bo-label">
            <Link href="/design-lab">← Design lab</Link>
          </p>
          <p className="bo-label">
            <Link href="/">Live home →</Link>
          </p>
        </div>
      </div>
    </BrandRoot>
  );
}

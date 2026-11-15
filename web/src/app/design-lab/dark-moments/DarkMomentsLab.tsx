"use client";

import Link from "next/link";
import { useState } from "react";
import { Plate, PLATES, type PlateName, type PlateTreatment } from "@/brand/Plate";
import { HalftoneMotion, type HalftoneMode } from "@/brand/motion";
import { SECTORS } from "@/brand/sectors";
import hero from "@/brand/template/page.module.css";
import s from "./darkMoments.module.css";

/**
 * Orchestrator-owned lab: Union, night and film as the dark moments between white pages.
 * White stays the reading surface. Nothing here is production until signed off.
 */

const READY = new Set(["/housing", "/energy"]);

function Hero({
  name,
  plate,
  position,
  treatment,
  size = "full",
}: {
  name: string;
  plate: PlateName;
  position: string;
  treatment: PlateTreatment;
  size?: "full" | "band";
}) {
  return (
    <section className={hero.hero} data-size={size} aria-label={`${name} header, ${treatment}`}>
      <Plate
        name={plate}
        treatment={treatment}
        className={hero.heroPlate}
        position={position}
        label={PLATES[plate].alt}
      />
      <div className={`bo-on-ink ${hero.heroTitle}`}>
        <div className={`bo-wrap ${hero.heroTitleInner}`}>
          <p className={`bo-statement ${hero.sectorName}`}>{name}</p>
        </div>
      </div>
    </section>
  );
}

export function DarkMomentsLab() {
  const [mode, setMode] = useState<HalftoneMode>("film");

  return (
    <div className={s.page}>
      <div className="bo-wrap">
        <nav className={s.nav}>
          <Link href="/design-lab">Design lab</Link>
          <Link href="/design-lab/motion">Motion</Link>
          <Link href="/design-lab/economy-elevation">Economy elevation</Link>
          <span className="bo-label">Lab · not production</span>
        </nav>
        <header className={s.header}>
          <p className="bo-label">Design lab · Dark moments</p>
          <h1 className="bo-d2">White to read. Union, night and film between.</h1>
          <p className="bo-prose">
            Three places the site could go dark without touching a chart: the homepage centrepiece,
            sector headers, and the end of every sector page.
          </p>
        </header>
      </div>

      {/* ——— A. Homepage centrepiece: film ——— */}
      <div className="bo-wrap">
        <div className={s.studyHead}>
          <p className="bo-label">A · Homepage centrepiece</p>
          <h2 className="bo-d3">Film, full width, once</h2>
          <p className="bo-prose">
            The turbine loop already exists. It would replace the homepage dot field, not sit on
            top of it: one moving centrepiece per page. Toggle to compare with plain halftone.
          </p>
          <div className={s.toggle} role="group" aria-label="Screen">
            {(["film", "halftone"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
      <section className={s.film} aria-label="Homepage centrepiece study">
        <HalftoneMotion
          atlas="offshoreWind"
          mode={mode}
          fps={10}
          fallback="offshoreWind"
          label="Offshore wind turbines turning"
        />
        <div className={`bo-wrap ${s.filmCopy}`}>
          <div className={`bo-on-union ${s.filmPanel}`}>
            <p className="bo-label">British Exchange</p>
            <p className="bo-d2">How Britain makes, spends, builds and lives, from official records.</p>
          </div>
        </div>
      </section>

      {/* ——— B. Sector headers: print vs night ——— */}
      <div className="bo-wrap">
        <div className={s.studyHead}>
          <p className="bo-label">B · Sector headers</p>
          <h2 className="bo-d3">Print or night</h2>
          <p className="bo-prose">
            Same picture, same name strip. Night draws the picture in navy on electric blue. Each print
            header (today) is paired with its night version.
          </p>
        </div>
        <div className={s.pairs}>
          <p className={`bo-label ${s.colHead}`}>Print (today)</p>
          <p className={`bo-label ${s.colHead}`}>Night</p>
          <Hero name="Economy" plate="containerPort" position="50% 16%" treatment="print" />
          <Hero name="Economy" plate="containerPort" position="50% 16%" treatment="night" />
          <Hero name="Housing" plate="terrace" position="50% 45%" treatment="print" />
          <Hero name="Housing" plate="terrace" position="50% 45%" treatment="night" />
          <Hero name="Energy" plate="coolingTowers" position="50% 40%" treatment="print" />
          <Hero name="Energy" plate="coolingTowers" position="50% 40%" treatment="night" />
        </div>
        <p className={`bo-prose ${s.after}`}>
          Once a tab is open the header shrinks to a thin strip. Night version of that strip:
        </p>
      </div>
      <div className={s.bandDemo}>
        <Hero name="Economy" plate="containerPort" position="50% 16%" treatment="night" size="band" />
        <div className="bo-wrap">
          <p className={`bo-label ${s.fakeCrumb}`}>Economy / Inflation and prices</p>
          <p className="bo-d3">How fast are prices rising, and what does money buy?</p>
        </div>
      </div>

      {/* ——— C. End of a sector page: night threshold + Union index ——— */}
      <div className="bo-wrap">
        <div className={s.studyHead}>
          <p className="bo-label">C · End of every sector page</p>
          <h2 className="bo-d3">Night strip, then a Union index</h2>
          <p className="bo-prose">
            Below the white Notes, a thin night picture, then the other sectors as a dense index on
            navy. The site footer (electric blue) follows as it does today.
          </p>
        </div>
        <div className={s.fakeNotes}>
          <p className="bo-label">Notes</p>
          <p className="bo-note">
            Source: Office for National Statistics, Consumer price inflation, CPI annual rate
            (D7G7), monthly, Jan 1989 – Sep 2026, release 22 Oct 2026. Exchange indicator:
            cpi-inflation.
          </p>
        </div>
      </div>
      <Plate name="pylons" treatment="night" className={s.threshold} position="50% 55%" />
      <section className={`bo-on-union ${s.index}`} aria-labelledby="dm-index">
        <div className="bo-wrap">
          <h2 id="dm-index" className={`bo-label ${s.indexHead}`}>
            Other sectors
          </h2>
          <ol className={s.indexList}>
            {SECTORS.map((sec, i) => {
              const ready = READY.has(sec.page ?? "");
              const [first, ...rest] = sec.label.split(" ");
              return (
                <li key={sec.id} className={s.indexRow}>
                  <span className={`bo-caps ${s.indexNum}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`bo-caps ${s.indexName}`}>
                    <b>{first}</b> {rest.join(" ")}
                  </span>
                  <span className={`bo-label ${s.indexState}`}>{ready ? "Ready" : "In preparation"}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}

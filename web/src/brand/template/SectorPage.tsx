import Link from "next/link";
import type { ReactNode } from "react";
import { Plate, PLATES, type PlateName, type PlateTreatment } from "../Plate";
import p from "./page.module.css";

/**
 * Brand template — SectorPage. The canonical page for a British Exchange sector:
 *
 *   mast (wordmark · Sectors / {label})
 *   hero — the plate fills the picture; the sector name sits on an ink strip under it
 *   [stats strip]   optional; the Explorer has its own figures, so most pages leave it off
 *   [threshold]     optional band between head and explorer (<PlateBand/> or <FieldBand/>)
 *   main            usually one <Explorer/>
 *
 * Wrap the route in <BrandRoot>. Heavy capitals only for the wordmark and the sector name.
 */

export type SectorStat = { label: string; value: string; note: string };

export function SectorPage({
  name,
  label,
  plate,
  stats,
  threshold,
  hero = "full",
  children,
}: {
  /** The one loud line, e.g. "Housing". */
  name: string;
  /** Sector label for the breadcrumb, e.g. "Housing & Land". */
  label: string;
  /** Hero plate. It stays the picture; the name is the ink strip under it. */
  plate: { name: PlateName; treatment?: PlateTreatment; position?: string };
  stats?: SectorStat[];
  threshold?: ReactNode;
  /**
   * `full` on the sector landing page. `band` on a research domain: a thin
   * strip of the same plate, so the question is not pushed down the page.
   */
  hero?: "full" | "band";
  children: ReactNode;
}) {
  const headingId = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <div className={p.page}>
      <header className={p.mast}>
        <div className={`bo-wrap ${p.mastInner}`}>
          <Link href="/" className={`bo-statement ${p.wordmark}`}>
            British Exchange
          </Link>
          <nav aria-label="Breadcrumb" className="bo-label">
            <span>Sectors</span> / <span aria-current="page">{label}</span>
          </nav>
        </div>
      </header>

      <section className={p.hero} data-size={hero} aria-labelledby={headingId}>
        <Plate
          name={plate.name}
          treatment={plate.treatment ?? "print"}
          className={p.heroPlate}
          position={plate.position ?? "50% 45%"}
          label={PLATES[plate.name].alt}
        />
        <div className={`bo-on-ink ${p.heroTitle}`}>
          <div className={`bo-wrap ${p.heroTitleInner}`}>
            <h1 id={headingId} className={`bo-statement ${p.sectorName}`}>
              {name}
            </h1>
          </div>
        </div>
      </section>

      {stats && stats.length > 0 && (
        <div className={p.strip}>
          <div className={`bo-wrap ${p.stripInner}`}>
            <ul className={p.stats} aria-label="Selected figures">
              {stats.map((s) => (
                <li key={s.label} className={p.stat}>
                  <span className="bo-label">{s.label}</span>
                  <span className={`bo-fig ${p.statValue}`}>{s.value}</span>
                  <span className={p.statNote}>{s.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {threshold}

      <main className={p.main}>{children}</main>
    </div>
  );
}

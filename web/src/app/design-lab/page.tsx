/**
 * Design lab — homepage composition test.
 *
 * Locked brief:
 * - RIGHT: full-page ASCII map of Britain, with motion
 * - LEFT: brand + headline + quiet copy (Caslon)
 * - Plates: Every perforated silhouette + Nous v9 imprint lanes
 *   (faces are stipple placeholders until you drop in real print art)
 */

import Link from "next/link";
import { LabBritainMap } from "./LabBritainMap";
import { LabImprintPlate } from "./LabImprintPlate";
import styles from "./page.module.css";

const PLATES = [
  {
    label: "Energy",
    href: "/energy",
    lane: "xerox" as const,
    kicker: "Fuel · industry · prices",
    tilt: -6,
  },
  {
    label: "Economy",
    href: "/economy",
    lane: "stipple" as const,
    kicker: "GDP · CPI · labour",
    tilt: 2,
  },
  {
    label: "Housing",
    href: "/housing",
    lane: "manual" as const,
    kicker: "Prices · stock · rent",
    tilt: 7,
  },
] as const;

export default function DesignLabPage() {
  return (
    <div className={styles.page}>
      <LabBritainMap />

      <main className={styles.shell}>
        <p className={styles.kicker}>Design lab · homepage test</p>

        <div className={styles.left}>
          <p className={styles.brand}>Britain Exchange</p>
          <h1 className={styles.title}>How the country lives, works and ages.</h1>
          <p className={styles.lede}>
            Verified UK public data — evidence at every level.
          </p>

          <div className={styles.plates} aria-label="Sector plates">
            {PLATES.map((p) => (
              <LabImprintPlate
                key={p.label}
                label={p.label}
                href={p.href}
                lane={p.lane}
                kicker={p.kicker}
                tilt={p.tilt}
              />
            ))}
          </div>

          <p className={styles.hint}>
            Plates use Nous imprint lanes (xerox / stipple / letterpress) inside
            an Every-style perforated edge. Drop your generated art into the face
            later — or we wire ASCII Magic / nous-branding next.
          </p>

          <Link href="/" className={styles.back}>
            ← Live home
          </Link>
        </div>
      </main>
    </div>
  );
}

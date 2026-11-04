import styles from "./MapPanel.module.css";

/** Technical-drawing UK nations sketch — placeholder until Place / PostGIS maps ship. */

const NATIONS = [
  { id: "E", label: "England", x: 48, y: 58 },
  { id: "W", label: "Wales", x: 28, y: 55 },
  { id: "S", label: "Scotland", x: 42, y: 22 },
  { id: "NI", label: "N. Ireland", x: 18, y: 38 },
];

export function MapPanel() {
  return (
    <section className={styles.panel} aria-label="Nations map sketch">
      <header className={styles.head}>
        <p className={styles.kicker}>Regions &amp; Places</p>
        <h2 className={styles.title}>Geographic field</h2>
        <p className={styles.lede}>
          Technical outline of the UK nations — place layers and historical
          boundaries will attach here. Not a finished basemap.
        </p>
      </header>
      <div className={styles.canvas}>
        <svg
          viewBox="0 0 80 90"
          className={styles.svg}
          role="img"
          aria-label="Schematic United Kingdom outline"
        >
          <title>Schematic United Kingdom</title>
          {/* Scotland */}
          <path
            d="M36 8 L48 6 L54 14 L50 28 L42 32 L34 26 L32 14 Z"
            className={styles.nation}
          />
          {/* N Ireland */}
          <path
            d="M12 32 L22 30 L26 40 L20 46 L12 42 Z"
            className={styles.nation}
          />
          {/* Wales */}
          <path
            d="M28 48 L36 46 L38 58 L32 64 L26 58 Z"
            className={styles.nation}
          />
          {/* England */}
          <path
            d="M38 36 L52 34 L58 48 L54 72 L42 78 L36 68 L40 52 Z"
            className={styles.nation}
          />
          {NATIONS.map((n) => (
            <text key={n.id} x={n.x} y={n.y} className={styles.label}>
              {n.id}
            </text>
          ))}
          <line x1="8" y1="84" x2="72" y2="84" className={styles.rule} />
          <text x="8" y="88" className={styles.caption}>
            SCHEMATIC · NOT SURVEY
          </text>
        </svg>
        <ul className={styles.legend}>
          {NATIONS.map((n) => (
            <li key={n.id}>
              <span>{n.id}</span> {n.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

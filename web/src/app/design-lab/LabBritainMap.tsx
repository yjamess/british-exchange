/**
 * Right-side homepage field: ASCII texture clipped to a real Britain outline.
 *
 * Why mask instead of hand-drawn ASCII coastline?
 * A GeoJSON→SVG mask keeps the silhouette recognisable; the characters give
 * the Nous/ISE “dense imprint” texture. Motion is CSS on the character field.
 */

import styles from "./LabBritainMap.module.css";

/** Dense mono field — characters only; shape comes from the SVG mask. */
function buildField(cols: number, rows: number): string {
  const glyphs = ".:;+*#%@&";
  const lines: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < cols; x += 1) {
      /* Mild variation so it isn’t a flat wallpaper */
      const n = (x * 17 + y * 31) % glyphs.length;
      const m = (x * 3 + y * 7) % 5;
      line += m === 0 ? " " : glyphs[n]!;
    }
    lines.push(line);
  }
  return lines.join("\n");
}

const FIELD = buildField(72, 96);

export function LabBritainMap() {
  return (
    <aside className={styles.root} aria-hidden="true">
      <div className={styles.mask}>
        <pre className={`${styles.field} ${styles.base}`}>{FIELD}</pre>
        <pre className={`${styles.field} ${styles.drift}`}>{FIELD}</pre>
      </div>
    </aside>
  );
}

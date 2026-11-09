"use client";

import { useMemo, useState } from "react";
import { DitherField } from "../motion/DitherField";
import { GLYPHS, glyphField } from "../motion/glyphField";
import f from "./footer.module.css";

/**
 * The footer's field: one dotted glyph pinned to the bottom-right corner, turning from the
 * country into each sector. Only the shape is drawn, so the ground stays solid ink.
 * The label (on a solid panel) names the current shape. Reduced motion holds the country.
 */
export function FooterField() {
  const [index, setIndex] = useState(0);
  const field = useMemo(
    () =>
      glyphField({
        // Wide: the right of the band. Narrow: its own band under the copy, so a larger share.
        box: (g) =>
          g.width < 600
            ? { left: 0.3, top: 0.08, right: 0.97, bottom: 1.03 }
            : { left: 0.37, top: 0.22, right: 0.975, bottom: 1.04 },
        onGlyph: setIndex,
      }),
    [],
  );
  const glyph = GLYPHS[index] ?? GLYPHS[0];
  return (
    <div className={f.field}>
      <DitherField field={field} mark="dots" pitch={5} fps={20} lens={false} />
      <p className={f.fieldLabel}>
        <span aria-hidden="true">
          {String(index + 1).padStart(2, "0")} / {String(GLYPHS.length).padStart(2, "0")}
        </span>{" "}
        {glyph.label}
      </p>
    </div>
  );
}

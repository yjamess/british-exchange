"use client";

import type { ReactNode } from "react";
import { Plate, type PlateName } from "../Plate";
import { DitherField, type FieldFn } from "../motion";
import t from "./threshold.module.css";

/**
 * Brand template — threshold bands between the page head and the Explorer. At most one per page
 * (it is the page's one monumental motion below the fold).
 *   <PlateBand plate="landPlots" />                       negative plate band (decorative)
 *   <FieldBand field={ridgesField(…)} label caption source />  data art → always carries a source line
 * Reduced motion: DitherField shows a still frame. Copy never sits inside the field.
 */

export function PlateBand({ plate, position = "50% 46%" }: { plate: PlateName; position?: string }) {
  return (
    <div className={t.band} aria-hidden="true">
      <Plate name={plate} treatment="negative" className={t.plate} position={position} />
    </div>
  );
}

export function FieldBand({
  field,
  label,
  caption,
  source,
}: {
  /** Memoise it — a new function each render restarts the field. */
  field: FieldFn;
  /** Accessible description of what the field draws. */
  label: string;
  caption: ReactNode;
  /** Publisher · series · release · link — data art always cites its source. */
  source: ReactNode;
}) {
  return (
    <figure className={t.figure}>
      <div className={`${t.band} ${t.fieldBand} bo-on-ink`}>
        <DitherField field={field} mark="dots" pitch={4} lens={false} label={label} />
      </div>
      <figcaption className={`bo-wrap ${t.caption}`}>
        <span className="bo-label">Plate · data</span>
        <span>{caption}</span>
        <span className={t.source}>{source}</span>
      </figcaption>
    </figure>
  );
}

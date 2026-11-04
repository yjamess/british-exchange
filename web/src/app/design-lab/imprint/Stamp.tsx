"use client";

/**
 * Stamp — the site-wide print motif.
 *
 * Perforation is an SVG mask (holes centred on each edge, even-odd fill),
 * so the paper edge is real cut-outs over whatever sits behind. The face
 * is a Halftone illustration; corner label in Caslon, denomination in mono.
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import { Halftone } from "./Halftone";
import type { SourceId, SourceOptions } from "./lib/sources";
import styles from "./Stamp.module.css";

const VB_W = 300;
const VB_H = 372;

function perforationMask(w: number, h: number, r: number, pitch: number): string {
  const holes: string[] = [];
  const nx = Math.round(w / pitch);
  const ny = Math.round(h / pitch);
  const hole = (cx: number, cy: number) =>
    `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  for (let i = 0; i <= nx; i += 1) {
    const x = (i * w) / nx;
    holes.push(hole(x, 0), hole(x, h));
  }
  for (let j = 1; j < ny; j += 1) {
    const y = (j * h) / ny;
    holes.push(hole(0, y), hole(w, y));
  }
  const d = `M0 0H${w}V${h}H0Z${holes.join("")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path fill="#000" fill-rule="evenodd" d="${d}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const MASK = perforationMask(VB_W, VB_H, 7.5, 21);

export type StampProps = {
  label: string;
  source: SourceId;
  sourceOptions?: SourceOptions;
  field: string;
  ink?: string;
  highlight?: string;
  denomination?: string;
  caption?: string;
  tilt?: number;
  href?: string;
  size?: "sm" | "md" | "lg";
  pitch?: number;
  className?: string;
  style?: CSSProperties;
};

export function Stamp({
  label,
  source,
  sourceOptions,
  field,
  ink = "#14161c",
  highlight = "#f4ecda",
  denomination,
  caption,
  tilt = 0,
  href,
  size = "md",
  pitch,
  className,
  style,
}: StampProps) {
  const body = (
    <span className={styles.paper} style={{ WebkitMaskImage: MASK, maskImage: MASK }}>
      <span className={styles.face} style={{ background: field }}>
        <Halftone
          className={styles.art}
          source={source}
          sourceOptions={sourceOptions}
          field={field}
          ink={ink}
          highlight={highlight}
          pitch={pitch ?? (size === "sm" ? 2.2 : size === "lg" ? 3.4 : 2.8)}
        />
        <span className={styles.label} style={{ color: highlight }}>
          {label}
        </span>
        {denomination ? (
          <span className={styles.denom} style={{ color: highlight }}>
            {denomination}
          </span>
        ) : null}
        {caption && !denomination ? (
          <span className={styles.caption} style={{ color: highlight }}>
            {caption}
          </span>
        ) : null}
      </span>
    </span>
  );

  const cls = `${styles.stamp} ${styles[size]} ${className ?? ""}`;
  const st = { "--tilt": `${tilt}deg`, ...style } as CSSProperties;

  return href ? (
    <Link href={href} className={cls} style={st} aria-label={`${label}${denomination ? ` — ${denomination}` : ""}`}>
      {body}
    </Link>
  ) : (
    <span className={cls} style={st} role="img" aria-label={label}>
      {body}
    </span>
  );
}

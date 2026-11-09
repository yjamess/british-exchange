import type { CSSProperties, ReactNode } from "react";
import { brandFonts } from "./fonts";
import "./brand.css";

/**
 * Platform shell for live British Exchange pages.
 * Applies the v1 "One ink, drawn by instruments" tokens and brand fonts
 * (docs/visual-identity.md · web/src/brand/brand.css).
 *
 * `sector` is deprecated: v1 retires sector pigments (one ink). Kept so old pages compile.
 */
export function BrandRoot({
  children,
  sector,
  className = "",
}: {
  children: ReactNode;
  /** Imprint-only pigment (stamp / hero). Never used for chart series. */
  sector?: string;
  className?: string;
}) {
  const style = sector
    ? ({ ["--bo-sector" as string]: sector } as CSSProperties)
    : undefined;

  return (
    <div className={`bo ${brandFonts} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

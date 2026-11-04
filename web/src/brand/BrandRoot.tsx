import type { CSSProperties, ReactNode } from "react";
import { brandFonts } from "./fonts";
import "./brand.css";

/**
 * Platform shell for live Observatory pages.
 * Applies locked Instrument + Imprint tokens (docs/visual-identity.md).
 *
 * Optional `sector` pigment overrides `--bo-sector` for imprint art only.
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

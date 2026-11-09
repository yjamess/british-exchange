/**
 * Brand faces (docs/visual-identity.md · "Caslon + Geist").
 *
 *   Caslon  — headlines, sentence case, and the one loud line   (--font-caslon)
 *   Geist   — reading text and UI                               (--font-geist)
 *   Geist Mono — labels, data, notation                         (--font-geist-mono)
 *   Archivo (condensed, wdth axis) — figures and the index      (--font-cond)
 *
 * Apply `brandFonts` to the root of any page that uses `.bo` (BrandRoot does this).
 */

import { Archivo, Geist, Geist_Mono, Libre_Caslon_Display } from "next/font/google";

export const caslon = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-caslon",
  display: "swap",
});

export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/** Variable Archivo; figures set it to wdth 62 via `--bo-fig-wdth`. */
export const condensed = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-cond",
  display: "swap",
});

export const brandFonts = [caslon, geist, geistMono, condensed].map((f) => f.variable).join(" ");

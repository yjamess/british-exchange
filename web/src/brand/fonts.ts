/**
 * Brand display face. Caslon (editorial), Source Sans 3 (text) and
 * IBM Plex Mono (data) are already bound globally in app/layout.tsx.
 * Apply `brandFonts` to the root of any page that uses .bo.
 */

import { Sofia_Sans_Extra_Condensed } from "next/font/google";

export const condensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-cond",
});

export const brandFonts = condensed.variable;

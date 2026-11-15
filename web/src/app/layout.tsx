import type { Metadata } from "next";
import {
  Libre_Caslon_Display,
  Source_Sans_3,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/brand/footer/SiteFooter";
import { SiteHeader } from "@/brand/shell/SiteHeader";
import { GlossaryProvider } from "@/brand/term";
import { loadGlossary } from "@/lib/glossary";

/** Display: Libre Caslon Display (Google Fonts) — user’s “Libra Calson”. */
const display = Libre_Caslon_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: { default: "British Exchange", template: "%s · British Exchange" },
  description: "An open British Observatory: deep public data and independent, original investigations.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Shared terms registry behind every Term marker; an empty list just renders terms plain.
  const glossary = await loadGlossary();
  return (
    <html lang="en-GB">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <GlossaryProvider terms={glossary}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </GlossaryProvider>
      </body>
    </html>
  );
}

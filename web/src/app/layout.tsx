import type { Metadata } from "next";
import {
  Libre_Caslon_Display,
  Source_Sans_3,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/brand/footer/SiteFooter";

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
  title: "Britain Exchange",
  description: "Verified UK public data — first proof chart slice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { BrandRoot } from "../BrandRoot";
import { SiteIndex } from "./SiteIndex";
import s from "./shell.module.css";

/** Site pages in the mast, after the Index. Pages not built yet still get a route (a stub). */
export const SITE_PAGES = [
  { href: "/data", label: "Data" },
  { href: "/about", label: "About" },
  { href: "/contribute", label: "Contribution" },
] as const;

/**
 * Site mast, on every route (root layout). Paper, one rule under it.
 *
 *   wordmark · Index (opens the site index: sectors and pages) · Data · About · Contribution
 *
 * Sector pages keep their own crumb under the mast; the hero plate and the loud sector name
 * stay in `SectorPage`. The mast itself never carries a plate.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const indexId = useId();

  // Close the index on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <BrandRoot>
      <header className={s.mast}>
        <div className={`bo-wrap ${s.mastInner}`}>
          <Link href="/" className={`bo-statement ${s.wordmark}`} aria-label="British Exchange, home">
            British Exchange
          </Link>
          <nav aria-label="Site" className={`bo-label ${s.nav}`}>
            <button
              type="button"
              className={s.navItem}
              aria-expanded={open}
              aria-controls={indexId}
              onClick={() => setOpen((v) => !v)}
            >
              Index
            </button>
            {SITE_PAGES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={s.navItem}
                aria-current={isCurrent(p.href) ? "page" : undefined}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <SiteIndex id={indexId} open={open} onClose={() => setOpen(false)} />
    </BrandRoot>
  );
}

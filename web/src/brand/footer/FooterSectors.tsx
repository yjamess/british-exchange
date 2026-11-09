"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTORS } from "../sectors";
import f from "./footer.module.css";

/** Sector index: condensed capitals; the current sector page is printed in reverse (paper on ink). */
export function FooterSectors() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sectors">
      <ul className={f.sectors}>
        {SECTORS.map((s) => {
          const current = !!s.page && (pathname === s.page || pathname.startsWith(`${s.page}/`));
          return (
            <li key={s.id}>
              <Link href={s.page ?? `/data#${s.id}`} aria-current={current ? "page" : undefined}>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

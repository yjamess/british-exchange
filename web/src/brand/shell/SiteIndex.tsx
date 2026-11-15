"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { SECTORS } from "../sectors";
import { SITE_PAGES } from "./SiteHeader";
import s from "./shell.module.css";

/**
 * The site index: a panel from the left edge, in Index mode (docs/visual-identity.md →
 * Composition): condensed two-tone capitals on Union with dotted dividers.
 *
 *   Sectors   01…08, Ready / In preparation; the current sector printed in reverse
 *   Pages     Data · About · Contribution
 *
 * Escape, the backdrop and the close control all close it. Reduced motion: no slide.
 */
export function SiteIndex({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, onClose]);

  const isCurrent = (href?: string) => !!href && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className={s.indexRoot} data-open={open || undefined}>
      <button type="button" className={s.backdrop} aria-label="Close the index" tabIndex={-1} onClick={onClose} />
      <aside id={id} className={`bo-on-union ${s.index}`} aria-label="Site index" aria-hidden={!open}>
        <div className={s.indexHead}>
          <p className={`bo-label ${s.indexLabel}`}>Index</p>
          <button ref={closeRef} type="button" className={`bo-label ${s.close}`} onClick={onClose}>
            Close
          </button>
        </div>

        <p className={`bo-label ${s.indexLabel}`}>Sectors</p>
        <ol className={s.list}>
          {SECTORS.map((sec, i) => {
            const [first, ...rest] = sec.label.split(" ");
            const current = isCurrent(sec.page);
            const body = (
              <>
                <span className={`bo-caps ${s.num}`} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`bo-caps ${s.name}`}>
                  <b>{first}</b> {rest.join(" ")}
                </span>
                <span className={`bo-label ${s.state}`}>{sec.ready ? "Ready" : "In preparation"}</span>
              </>
            );
            return (
              <li key={sec.id}>
                <Link
                  href={sec.page ?? `/data#${sec.id}`}
                  className={s.row}
                  aria-current={current ? "page" : undefined}
                  tabIndex={open ? 0 : -1}
                >
                  {body}
                </Link>
              </li>
            );
          })}
        </ol>

        <p className={`bo-label ${s.indexLabel}`}>Pages</p>
        <ul className={s.list}>
          {SITE_PAGES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className={s.row}
                aria-current={isCurrent(p.href) ? "page" : undefined}
                tabIndex={open ? 0 : -1}
              >
                <span className={`bo-caps ${s.name}`}>
                  <b>{p.label}</b>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

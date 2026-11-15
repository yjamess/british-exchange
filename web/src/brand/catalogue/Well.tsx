"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import c from "./catalogue.module.css";

/**
 * A well that opens in place: it grows to its content's height and, when asked, the ink rule
 * draws down its left edge; closing reverses it. Reduced motion: instant. Content is mounted
 * only while open or closing, so a long list stays light. Used for a sector slab and a record.
 */
export function Well({
  open,
  id,
  rule = false,
  label,
  children,
}: {
  open: boolean;
  id: string;
  rule?: boolean;
  label: string;
  children: ReactNode;
}) {
  const wellRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);

  useLayoutEffect(() => {
    const well = wellRef.current;
    if (open) setMounted(true);
    if (!well) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.killTweensOf(well);
    if (open) {
      if (reduced) {
        gsap.set(well, { clearProps: "height" });
        return;
      }
      gsap.fromTo(well, { height: 0 }, { height: "auto", duration: 0.42, ease: "power3.out", clearProps: "height" });
      const edge = well.querySelector<HTMLElement>("[data-rule]");
      if (edge) gsap.fromTo(edge, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "power2.out", transformOrigin: "top" });
    } else if (mounted) {
      if (reduced) {
        setMounted(false);
        return;
      }
      gsap.to(well, { height: 0, duration: 0.28, ease: "power2.in", onComplete: () => setMounted(false) });
    }
    // `mounted` is read, not a trigger: the tween decides when it flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;
  return (
    <div ref={wellRef} id={id} className={c.well} role="region" aria-label={label}>
      {rule && <span className={c.wellRule} data-rule aria-hidden="true" />}
      {children}
    </div>
  );
}

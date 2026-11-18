"use client";

/**
 * What Britain Does for Work — after a tile is isolated, the change + chart panels
 * slide up to fill the space the wall freed. One ink; reduced motion snaps.
 */

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import s from "../energy/generation.module.css";

type Props = {
  /** Replay the rise when the chosen industry changes. */
  industryId: string;
  children: ReactNode;
};

export function IndustryDetailRise({ industryId, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const panels = root.querySelectorAll<HTMLElement>(":scope > section");
    if (!panels.length) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline();
      tl.fromTo(
        root,
        { y: 56 },
        { y: 0, duration: 0.55, ease: "power2.out", clearProps: "transform" },
        0,
      );
      tl.fromTo(
        panels,
        { y: 36 },
        {
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          clearProps: "transform",
        },
        0.06,
      );
      return () => {
        tl.kill();
      };
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set([root, ...panels], { clearProps: "transform" });
    });

    return () => mm.revert();
  }, [industryId]);

  return (
    <div ref={ref} className={s.industryDetail} data-industry={industryId}>
      {children}
    </div>
  );
}

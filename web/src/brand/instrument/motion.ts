"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * Chart motion (lab: /design-lab/chart-motion). Marks move; nothing fades; no texture in a plot.
 * Every helper settles on the final state at once under prefers-reduced-motion.
 *
 *   draw    lines are printed left to right by a hairline carriage; columns and ranked bars are
 *           set one after another, rising from the baseline. Once, when the chart first comes into view.
 *   retime  when the domain changes (period, place, measure), the axes travel and the marks stretch.
 */

/** ≈ --bo-ease cubic-bezier(0.2, 0.8, 0.2, 1) */
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3.2);
/** Carriage travel (≈ power3.inOut). */
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const DRAW_MS = 1800;
export const RETIME_MS = 650;

export function tween(ms: number, ease: (x: number) => number, on: (k: number) => void) {
  let raf = 0;
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    on(ease(k));
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The draw clock, 0 → 1. Server render and no-JS show the finished chart (1); on the client the
 * chart is reset to 0 before paint and drawn when half of it is on screen. `replayKey` redraws
 * (e.g. ranked bars when their values change); leave it unset to draw once per page view.
 */
export function useDrawOn(ref: RefObject<Element | null>, { enabled = true, ms = DRAW_MS, replayKey }: { enabled?: boolean; ms?: number; replayKey?: string } = {}) {
  const [k, setK] = useState(1);
  const seen = useRef(false);
  const reduced = useRef(false);

  useIsoLayoutEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (enabled && !reduced.current) setK(0);
  }, [enabled]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let stop = () => {};
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting || seen.current) return;
        seen.current = true;
        io.disconnect();
        if (reduced.current) return setK(1);
        stop = tween(ms, (x) => x, setK);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    // Printing (or saving as PDF) shows every chart finished, even ones never scrolled to.
    const print = () => {
      stop();
      seen.current = true;
      setK(1);
    };
    window.addEventListener("beforeprint", print);
    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", print);
      stop();
    };
  }, [ref, enabled, ms]);

  // Redraw on change, only once the chart has already been seen.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled || !seen.current || reduced.current) return;
    setK(0);
    return tween(ms, (x) => x, setK);
  }, [replayKey, enabled, ms]);

  return k;
}

/** Share of the draw clock spent staggering a set (columns, ranked bars). */
const STAGGER = 0.55;
/** Height share of item `j` of `n` at draw clock `k`: one after another, each eased to rest. */
export function setOf(k: number, j: number, n: number) {
  if (k >= 1) return 1;
  const start = (j / Math.max(1, n - 1)) * STAGGER;
  return easeOut(Math.min(1, Math.max(0, (k - start) / (1 - STAGGER))));
}

/** A set of numbers that travels to each new target instead of jumping (retime). */
export function useTweened<T extends Record<string, number>>(target: T | null, { enabled = true, ms = RETIME_MS }: { enabled?: boolean; ms?: number } = {}) {
  const [value, setValue] = useState<T | null>(target);
  const current = useRef<T | null>(target);
  const key = target ? Object.values(target).map((v) => v.toFixed(6)).join("|") : "";
  useEffect(() => {
    const from = current.current;
    if (!target || !from || !enabled || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setValue(target);
      return;
    }
    return tween(ms, easeInOut, (k) => {
      const next = Object.fromEntries(Object.keys(target).map((n) => [n, from[n]! + (target[n]! - from[n]!) * k])) as T;
      current.current = next;
      setValue(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ms]);
  return value ?? target;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import d from "./dualScramble.module.css";

/**
 * Dual scramble — two-phase text scramble.
 *   Phase 1: characters arrive left→right as instrument ASCII.
 *   Phase 2: they resolve left→right to the real text. One colour throughout (currentColor).
 * Triggers: "scroll" (default, once in view) · "hover" · "click" · "load" · "manual" (bump `play`).
 * Text changes replay it (figures on domain switch). `ScrambleGroup` gives children a shared trigger + stagger.
 * Zero layout shift: stacked spans — an invisible sizer holds the final width, the scramble layer sits over it.
 * Screen readers get the real text; the animated layers are aria-hidden. Reduced motion: resolves instantly.
 * Glyphs never fade — they change.
 */

export const DUAL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-=/\\|{}()<>?!:;,.'`~^_";
export const DUAL_DIGITS = "0123456789#%+-=/";

export type ScrambleTrigger = "scroll" | "hover" | "click" | "load" | "manual";

type GroupCtx = { trigger: ScrambleTrigger; stagger: number; subscribe: (fn: () => void) => () => void; root: () => HTMLElement | null };
const Group = createContext<GroupCtx | null>(null);

const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Wrapper that fires every DualScramble inside it from one trigger, staggered in DOM order. */
export function ScrambleGroup({
  trigger = "scroll",
  stagger = 0.06,
  as: Tag = "div",
  className,
  style,
  children,
}: {
  trigger?: ScrambleTrigger;
  /** Seconds between children. */
  stagger?: number;
  as?: "div" | "span" | "ul" | "nav" | "section";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const subs = useRef(new Set<() => void>());
  const fire = useCallback(() => subs.current.forEach((fn) => fn()), []);
  const ctx = useRef<GroupCtx>({
    trigger,
    stagger,
    subscribe: (fn) => {
      subs.current.add(fn);
      return () => subs.current.delete(fn);
    },
    root: () => ref.current,
  });
  ctx.current.trigger = trigger;
  ctx.current.stagger = stagger;
  useTrigger(ref, trigger, fire);
  const Comp = Tag as "div";
  return (
    <Group.Provider value={ctx.current}>
      <Comp ref={ref as React.RefObject<HTMLDivElement>} className={className} style={style}>
        {children}
      </Comp>
    </Group.Provider>
  );
}

function useTrigger(ref: React.RefObject<HTMLElement | null>, trigger: ScrambleTrigger, fire: () => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (trigger === "load") {
      fire();
      return;
    }
    if (trigger === "scroll") {
      const io = new IntersectionObserver(
        ([e]) => {
          if (e?.isIntersecting) {
            fire();
            io.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      io.observe(el);
      return () => io.disconnect();
    }
    if (trigger === "hover" || trigger === "click") {
      const ev = trigger === "hover" ? "pointerenter" : "click";
      el.addEventListener(ev, fire);
      if (trigger === "hover") el.addEventListener("focusin", fire);
      return () => {
        el.removeEventListener(ev, fire);
        el.removeEventListener("focusin", fire);
      };
    }
  }, [ref, trigger, fire]);
}

export function DualScramble({
  text,
  trigger,
  hoverTarget,
  play,
  duration = 0.9,
  delay = 0,
  chars = DUAL_CHARS,
  replayOnChange = true,
  className,
  style,
}: {
  text: string;
  /** Own trigger; ignored inside a ScrambleGroup (the group's applies). Default "scroll". */
  trigger?: ScrambleTrigger;
  /** For "hover": listen on the closest ancestor matching this selector (e.g. the whole button). */
  hoverTarget?: string;
  /** Manual trigger: change this value to replay. */
  play?: number | string | boolean;
  /** Seconds, both phases. */
  duration?: number;
  /** Seconds before starting (added to any group stagger). */
  delay?: number;
  chars?: string;
  /** Replay when `text` changes (default true). */
  replayOnChange?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const group = useContext(Group);
  const rootRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const running = useRef(false);
  const textRef = useRef(text);
  textRef.current = text;

  const settle = useCallback(() => {
    if (doneRef.current) doneRef.current.textContent = textRef.current;
    if (liveRef.current) liveRef.current.textContent = "";
    running.current = false;
  }, []);

  const run = useCallback(
    (extraDelay = 0) => {
      const done = doneRef.current;
      const live = liveRef.current;
      if (!done || !live) return;
      cancelAnimationFrame(raf.current);
      if (reduced()) {
        settle();
        return;
      }
      running.current = true;
      const target = textRef.current;
      const n = target.length;
      const total = Math.max(0.2, duration) * 1000;
      const arrive = total * 0.38; // phase 1: characters arrive left→right as ASCII
      const resolveStart = total * 0.22; // phase 2 overlaps: resolve cursor follows
      const start = performance.now() + (delay + extraDelay) * 1000;
      let lastSwap = 0;
      let noise: string[] = [];
      const pick = () => chars[(Math.random() * chars.length) | 0] ?? "#";
      done.textContent = "";
      live.textContent = "";
      const frame = (now: number) => {
        const t = now - start;
        if (t < 0) {
          raf.current = requestAnimationFrame(frame);
          return;
        }
        if (now - lastSwap > 45 || noise.length !== n) {
          noise = Array.from(target, (c) => (c === " " ? " " : pick()));
          lastSwap = now;
        }
        const arrived = Math.min(n, Math.ceil((t / arrive) * n));
        const resolved = Math.max(0, Math.min(n, Math.floor(((t - resolveStart) / (total - resolveStart)) * n)));
        done.textContent = target.slice(0, resolved);
        live.textContent = noise.slice(resolved, Math.max(resolved, arrived)).join("");
        if (resolved >= n) {
          settle();
          return;
        }
        raf.current = requestAnimationFrame(frame);
      };
      raf.current = requestAnimationFrame(frame);
    },
    [chars, delay, duration, settle],
  );

  // Inside a group: subscribe; play with a stagger by DOM order.
  useEffect(() => {
    if (!group) return;
    return group.subscribe(() => {
      const root = group.root();
      const me = rootRef.current;
      const all = root ? Array.from(root.querySelectorAll("[data-dual-scramble]")) : [];
      const i = me ? Math.max(0, all.indexOf(me)) : 0;
      run(i * group.stagger);
    });
  }, [group, run]);

  // Own trigger (when not grouped).
  const own: ScrambleTrigger | null = group ? null : (trigger ?? "scroll");
  const fire = useCallback(() => {
    if (!running.current) run();
  }, [run]);
  useEffect(() => {
    const me = rootRef.current;
    if (!own || !me) return;
    const el = (hoverTarget ? (me.closest(hoverTarget) as HTMLElement | null) : null) ?? me;
    if (own === "load") {
      run();
      return;
    }
    if (own === "scroll") {
      const io = new IntersectionObserver(
        ([e]) => {
          if (e?.isIntersecting) {
            run();
            io.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      io.observe(me);
      return () => io.disconnect();
    }
    if (own === "hover" || own === "click") {
      const ev = own === "hover" ? "pointerenter" : "click";
      el.addEventListener(ev, fire);
      if (own === "hover") el.addEventListener("focusin", fire);
      return () => {
        el.removeEventListener(ev, fire);
        el.removeEventListener("focusin", fire);
      };
    }
  }, [own, hoverTarget, run, fire]);

  // Manual replay.
  const firstPlay = useRef(true);
  useEffect(() => {
    if (firstPlay.current) {
      firstPlay.current = false;
      return;
    }
    if (play !== undefined) run();
  }, [play, run]);

  // Text change: replay (or settle instantly).
  const firstText = useRef(true);
  useLayoutEffect(() => {
    if (firstText.current) {
      firstText.current = false;
      return;
    }
    if (replayOnChange) run();
    else settle();
  }, [text, replayOnChange, run, settle]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <span ref={rootRef} className={`${d.root} ${className ?? ""}`} style={style} data-dual-scramble="">
      <span className="bo-visually-hidden">{text}</span>
      <span className={d.sizer} aria-hidden="true">
        {text}
      </span>
      <span className={d.layer} aria-hidden="true">
        <span ref={doneRef}>{text}</span>
        <span ref={liveRef} />
      </span>
    </span>
  );
}

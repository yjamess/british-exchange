"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Instrument scramble — split-flap, second pass.
 * Digits tick at a fixed rate and land exactly on the target (no snap jump).
 * Left digits finish first. Non-digits stay put. Reduced motion → final string.
 */

const DIGIT = /\d/;
/** Flips per second — readable instrument tick. */
const TICK_HZ = 14;
/** Extra full revolutions added per digit index (right spins longer). */
const REVS_PER_SLOT = 1;
/** Minimum full revolutions on the first digit. */
const BASE_REVS = 2;
/** Delay before the whole board starts ticking. */
const START_DELAY = 0.04;

type Slot = { kind: "digit"; target: number } | { kind: "fixed"; ch: string };

function parseSlots(value: string): Slot[] {
  return Array.from(value).map((ch) =>
    DIGIT.test(ch)
      ? { kind: "digit" as const, target: Number(ch) }
      : { kind: "fixed" as const, ch },
  );
}

function renderSlots(slots: Slot[], face: number[]): string {
  let out = "";
  let di = 0;
  for (const slot of slots) {
    if (slot.kind === "fixed") out += slot.ch;
    else out += String(face[di++] ?? slot.target);
  }
  return out;
}

/** Steps so we end on `target` after `revs` full turns from `start`. */
function stepsToLand(start: number, target: number, revs: number): number {
  const mod = (target - start + 10) % 10;
  const steps = revs * 10 + mod;
  return steps === 0 ? 10 : steps;
}

export function FlickerFigure({
  value,
  duration,
  className = "",
  replayKey = 0,
}: {
  /** Final display string, e.g. "£273,037" or "7.6×". */
  value: string;
  /**
   * Optional total window override. When set, tick rate scales so every
   * digit still lands on its target. Prefer omitting — timing follows digit count.
   */
  duration?: number;
  className?: string;
  /** Bump to replay the scramble without changing value. */
  replayKey?: number;
}) {
  const [display, setDisplay] = useState(value);
  const reducedRef = useRef(false);
  const labelId = useId();

  useEffect(() => {
    reducedRef.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reducedRef.current) {
      setDisplay(value);
      return;
    }

    const slots = parseSlots(value);
    const targets = slots
      .filter((s): s is Extract<Slot, { kind: "digit" }> => s.kind === "digit")
      .map((s) => s.target);
    const digitCount = targets.length;
    if (digitCount === 0) {
      setDisplay(value);
      return;
    }

    const startFace = targets.map(() => Math.floor(Math.random() * 10));
    const face = [...startFace];
    const stepPlan = startFace.map((start, i) =>
      stepsToLand(start, targets[i]!, BASE_REVS + i * REVS_PER_SLOT),
    );
    const maxSteps = Math.max(...stepPlan);
    const tickHz = duration && duration > 0 ? maxSteps / duration : TICK_HZ;
    const total = maxSteps / tickHz;

    setDisplay(renderSlots(slots, face));

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tick = { n: 0 };
      let lastStep = 0;

      const tween = gsap.to(tick, {
        n: maxSteps,
        duration: total,
        delay: START_DELAY,
        ease: "none",
        onUpdate: () => {
          const step = Math.floor(tick.n);
          if (step === lastStep) return;
          lastStep = step;
          for (let i = 0; i < digitCount; i++) {
            const planned = stepPlan[i]!;
            if (step >= planned) {
              face[i] = targets[i]!;
            } else {
              face[i] = (startFace[i]! + step) % 10;
            }
          }
          setDisplay(renderSlots(slots, face));
        },
        onComplete: () => setDisplay(value),
      });

      return () => {
        tween.kill();
      };
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      setDisplay(value);
    });

    return () => mm.revert();
  }, [value, duration, replayKey]);

  return (
    <span className={className} aria-labelledby={labelId}>
      <span aria-hidden="true">{display}</span>
      <span id={labelId} className="bo-visually-hidden">
        {value}
      </span>
    </span>
  );
}

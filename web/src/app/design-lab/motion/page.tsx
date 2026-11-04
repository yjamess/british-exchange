"use client";

import { useMemo, useState } from "react";
import { BrandRoot } from "@/brand/BrandRoot";
import { DitherField, HalftoneMotion, cloudField, globeField, ridgesField, type DitherMark, type HalftoneMode } from "@/brand/motion";

/** Lab: live check of the motion kit (exchange-motion skill). Not a production page. */

// Illustrative series for the lab only — production ridges must come from the Exchange API.
const DEMO_SERIES = Array.from({ length: 8 }, (_, r) =>
  Array.from({ length: 120 }, (_, k) => 40 + r * 6 + k * (1.2 + r * 0.25) + 8 * Math.sin(k / 9 + r)),
);

export default function MotionLab() {
  const [mode, setMode] = useState<HalftoneMode>("halftone");
  const [mark, setMark] = useState<DitherMark>("dots");
  const [src, setSrc] = useState<"cloud" | "globe" | "ridges">("cloud");
  const ridges = useMemo(() => ridgesField(DEMO_SERIES, { digitsDivisor: 1 }), []);
  const field = src === "cloud" ? cloudField : src === "globe" ? globeField : ridges;

  return (
    <BrandRoot>
      <main className="bo-wrap" style={{ display: "grid", gap: 24, paddingBlock: 48 }}>
        <p className="bo-label">Lab · motion kit</p>
        <h1 className="bo-d2">Halftone motion and dither fields</h1>

        <section style={{ height: 520, border: "var(--bo-rule)" }}>
          <HalftoneMotion atlas="offshoreWind" mode={mode} fallback="offshoreWind" label="Offshore wind turbine turning, halftone" />
        </section>
        <div style={{ display: "flex", gap: 8 }}>
          {(["halftone", "film"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="bo-label" style={{ padding: "10px 14px", border: "var(--bo-rule)", background: mode === m ? "var(--bo-ink)" : "transparent", color: mode === m ? "var(--bo-paper)" : "var(--bo-ink)" }}>{m}</button>
          ))}
        </div>

        <section className="bo-on-ink" style={{ height: 520 }}>
          <DitherField field={field} mark={mark} label="Animated dither field" />
        </section>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["cloud", "globe", "ridges"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={src === s} onClick={() => setSrc(s)} className="bo-label" style={{ padding: "10px 14px", border: "var(--bo-rule)", background: src === s ? "var(--bo-ink)" : "transparent", color: src === s ? "var(--bo-paper)" : "var(--bo-ink)" }}>{s}</button>
          ))}
          {(["dots", "numerals"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mark === m} onClick={() => setMark(m)} className="bo-label" style={{ padding: "10px 14px", border: "var(--bo-rule)", background: mark === m ? "var(--bo-ink)" : "transparent", color: mark === m ? "var(--bo-paper)" : "var(--bo-ink)" }}>{m}</button>
          ))}
        </div>
      </main>
    </BrandRoot>
  );
}

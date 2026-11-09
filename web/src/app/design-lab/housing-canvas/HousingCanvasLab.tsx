"use client";

import { useState } from "react";
import { HousingPage, type ThresholdKind } from "@/brand/housing/HousingPage";
import type { HousingV1 } from "@/brand/housing/load";
import s from "./housing-canvas.module.css";

/**
 * Lab — the full Housing page with weight experiments as toggles:
 *   1 · page stats strip on/off (the explorer has its own figures strip)
 *   2 · stage title bar hairline vs solid ink
 *   3 · threshold band between page head and explorer: none / negative plate / data ridges
 *   4 · canvas ground: paper / light dot field (light by density, copy on paper patches)
 * Motion and menus are the brand template's (carriage, loupe, dual scramble, Base UI) — no toggle.
 * Defaults match /housing today except the ground. Not production.
 */

function Seg<T extends string | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={s.group} role="group" aria-label={label}>
      <span className="bo-label">{label}</span>
      <div className={s.seg}>
        {options.map((o) => (
          <button key={String(o.id)} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HousingCanvasLab({ data }: { data: HousingV1 }) {
  const [pageStats, setPageStats] = useState(false);
  const [stageBar, setStageBar] = useState<"hairline" | "solid">("hairline");
  const [threshold, setThreshold] = useState<ThresholdKind>("none");
  const [ground, setGround] = useState<"paper" | "field">("field");

  return (
    <div className={s.page}>
      <header className={s.labBar}>
        <p className={`bo-label ${s.labTitle}`}>Design lab · Housing weight</p>
        <Seg
          label="1 · Page stats"
          value={pageStats}
          options={[
            { id: true, name: "On" },
            { id: false, name: "Off" },
          ]}
          onChange={setPageStats}
        />
        <Seg
          label="2 · Stage bar"
          value={stageBar}
          options={[
            { id: "hairline", name: "Hairline" },
            { id: "solid", name: "Solid ink" },
          ]}
          onChange={setStageBar}
        />
        <Seg
          label="3 · Threshold"
          value={threshold}
          options={[
            { id: "none", name: "None" },
            { id: "plate", name: "Plate band" },
            { id: "ridges", name: "Data ridges" },
          ]}
          onChange={setThreshold}
        />
        <Seg
          label="4 · Ground"
          value={ground}
          options={[
            { id: "paper", name: "Paper" },
            { id: "field", name: "Dot field" },
          ]}
          onChange={setGround}
        />
      </header>
      <HousingPage data={data} pageStats={pageStats} stageBar={stageBar} threshold={threshold} ground={ground} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { BrandRoot } from "@/brand/BrandRoot";
import { TimeChart } from "@/brand/instrument/TimeChart";
import { toT } from "@/brand/data";
import type { Observation } from "@/lib/api";
import { formatPeriodLabel, formatTooltipValue, normalizeFrequency } from "@/lib/format";

/** A record is a dataset, not necessarily a single series. Never join its dimensions. */
export function RecordChart({ rows, title, frequency }: { rows: Observation[]; title: string; frequency: string }) {
  const groups = useMemo(() => {
    const result = new Map<string, Observation[]>();
    for (const row of rows) {
      const dimensions = row.dimensions
        ? Object.entries(row.dimensions).filter(([, v]) => v).sort().map(([k, v]) => `${k}=${v}`)
        : row.notes.split(";").map(v => v.trim()).filter(v => /^[\w-]+=/.test(v));
      const key = [row.geography_label, row.unit, ...dimensions].join(" · ");
      result.set(key, [...(result.get(key) ?? []), row]);
    }
    return result;
  }, [rows]);
  const [selection, setSelection] = useState("");
  const key = groups.has(selection) ? selection : groups.keys().next().value ?? "";
  const selected = groups.get(key) ?? [];
  const duplicatePeriods = new Set(selected.map(r => r.period_start)).size !== selected.length;
  const cadence = normalizeFrequency(frequency);
  const periods = new Map(selected.map(r => [toT(r.period_start), formatPeriodLabel(r.period_start, r.period_end, frequency)]));
  return <BrandRoot>
    <label>Series · geography, unit and category<br/><select style={{ maxWidth: "100%", padding: 10, marginBlock: 12 }} value={key} onChange={e => setSelection(e.target.value)}>
      {[...groups.keys()].map(k => <option value={k} key={k}>{k}</option>)}
    </select></label>
    <p>{key}</p>
    {duplicatePeriods ? <p>This selection contains multiple observations per period. A line is withheld until the remaining dimensions can be separated.</p> : <TimeChart
      series={[{ id: key, label: title, points: selected.filter(r => r.value !== null).map(r => ({ t: toT(r.period_start), v: r.value!, provisional: r.observation_status === "provisional" })) }]}
      cadence={cadence === "annual" || cadence === "quarterly" ? cadence : "monthly"}
      periodLabel={t => periods.get(t) ?? String(Math.floor(t))}
      marks={cadence === "annual" || cadence === "irregular"}
      format={v => formatTooltipValue(v, selected[0]?.unit ?? "")}
      label={`${title} · ${key}`}
    />}
  </BrandRoot>;
}

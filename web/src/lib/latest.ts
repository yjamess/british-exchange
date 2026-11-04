/** Helpers to pull latest Ready observation values for the homepage ticker. */

import { fetchIndicator, fetchObservations } from "@/lib/api";

export type TickerStat = {
  id: string;
  label: string;
  value: string;
  period: string;
  href: string;
};

export function fmtValue(value: number, unit: string): string {
  if (/£\s*million|GBP million|£m/i.test(unit)) {
    if (Math.abs(value) >= 1000) {
      return `£${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}bn`;
    }
    return `£${Math.round(value).toLocaleString("en-GB")}m`;
  }
  if (/billion|£bn/i.test(unit)) {
    return `£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}bn`;
  }
  if (/average house price|£ \(average/i.test(unit) || unit.trim() === "£") {
    return `£${Math.round(value).toLocaleString("en-GB")}`;
  }
  if (/ratio/i.test(unit)) {
    return `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })}×`;
  }
  if (/dwellings/i.test(unit)) {
    return value.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  }
  if (/index/i.test(unit)) {
    return value.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  }
  if (/%/.test(unit) || /rate/i.test(unit)) {
    return `${value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
  }
  if (/TWh/i.test(unit)) {
    return `${value.toLocaleString("en-GB", { maximumFractionDigits: 1 })} TWh`;
  }
  return value.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

export async function loadTickerStat(
  id: string,
  label: string,
  href: string,
  params: Record<string, string> = {},
): Promise<TickerStat | null> {
  try {
    const [meta, obs] = await Promise.all([
      fetchIndicator(id),
      fetchObservations(id, { ...params, limit: "5000" }),
    ]);
    const rows = obs.observations.filter((r) => r.value !== null);
    const last = rows[rows.length - 1];
    if (!last || last.value === null) return null;
    return {
      id,
      label,
      value: fmtValue(last.value, meta.unit),
      period: last.period_start.slice(0, 7),
      href,
    };
  } catch {
    return null;
  }
}

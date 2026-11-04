/** Display helpers for UK observation periods and values. */

export type FrequencyKind = "annual" | "quarterly" | "monthly" | "irregular" | "unknown";

export function normalizeFrequency(raw: string | undefined | null): FrequencyKind {
  const text = (raw || "").toLowerCase();
  if (text.includes("month")) return "monthly";
  if (text.includes("quarter")) return "quarterly";
  if (text.includes("annual") || text.includes("year")) return "annual";
  if (
    text.includes("election") ||
    text.includes("irregular") ||
    text.includes("sessional") ||
    text.includes("periodic")
  ) {
    return "irregular";
  }
  return text ? "unknown" : "unknown";
}

export function formatPeriodLabel(
  periodStart: string,
  periodEnd: string | undefined,
  frequency: string | undefined,
): string {
  const kind = normalizeFrequency(frequency);
  const year = Number(periodStart.slice(0, 4));
  const month = Number(periodStart.slice(5, 7));
  if (!year || !month) return periodStart;

  if (kind === "annual") {
    return String(year);
  }
  if (kind === "quarterly") {
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year} Q${quarter}`;
  }
  if (kind === "monthly") {
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return label;
  }
  // Irregular / unknown: show start, or start–end year span when multi-year.
  if (periodEnd && periodEnd.slice(0, 4) !== periodStart.slice(0, 4)) {
    return `${periodStart.slice(0, 4)}–${periodEnd.slice(0, 4)}`;
  }
  if (kind === "irregular") {
    return periodStart;
  }
  // Fallback: if span looks like a quarter, prefer that.
  if (periodEnd) {
    const endMonth = Number(periodEnd.slice(5, 7));
    if (endMonth - month === 2 || (month === 10 && endMonth === 12)) {
      const quarter = Math.floor((month - 1) / 3) + 1;
      return `${year} Q${quarter}`;
    }
  }
  return periodStart;
}

/** @deprecated Prefer formatPeriodLabel with frequency. */
export function formatQuarterLabel(periodStart: string): string {
  return formatPeriodLabel(periodStart, undefined, "quarterly");
}

export function formatAxisValue(value: number, unit: string): string {
  const isGbpMillions = /£\s*million|GBP million/i.test(unit) || /£m/i.test(unit);
  if (isGbpMillions) {
    if (Math.abs(value) >= 1000) {
      return `£${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}bn`;
    }
    return `£${Math.round(value)}m`;
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  }
  return value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

export function formatTooltipValue(value: number, unit: string): string {
  const isGbpMillions = /£\s*million|GBP million/i.test(unit) || /£m/i.test(unit);
  if (isGbpMillions) {
    return `£${value.toLocaleString("en-GB")} million`;
  }
  if (/average house price|£ \(average/i.test(unit) || /^£/.test(unit.trim())) {
    return `£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  }
  if (/TWh/i.test(unit)) {
    return `${value.toLocaleString("en-GB", { maximumFractionDigits: 3 })} TWh`;
  }
  if (/index/i.test(unit)) {
    return value.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  }
  if (/ratio/i.test(unit)) {
    return `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })}×`;
  }
  if (/dwellings/i.test(unit)) {
    return value.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  }
  // Prefer a short unit label over the full definition string.
  const short = shortUnitLabel(unit);
  if (short !== unit && short.length < 24) {
    return `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ${short}`;
  }
  return value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

export function shortUnitLabel(unit: string): string {
  if (/£\s*million/i.test(unit)) return "£ million";
  if (/average house price/i.test(unit)) return "£";
  if (/TWh/i.test(unit)) return "TWh";
  if (/index/i.test(unit)) return "index";
  if (/ratio/i.test(unit)) return "ratio";
  if (/dwellings \(completions\)/i.test(unit)) return "dwellings";
  if (/% of GVA.*weight/i.test(unit)) return "% of GVA (CVM weights)";
  if (/PPM/i.test(unit)) return "% PPM";
  return unit;
}

/** Pad the plotted range so the line fills the chart instead of sitting above a zero baseline. */
export function yDomainFromValues(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  const span = max - min;
  const pad = span === 0 ? Math.max(Math.abs(max) * 0.08, 1) : span * 0.12;
  let lo = min - pad;
  const hi = max + pad;
  // Keep a zero baseline only when the series already sits near zero.
  if (min >= 0 && lo < 0) {
    lo = min / (max || 1) < 0.2 ? 0 : lo;
  }
  return [lo, hi];
}

export function pointNoun(frequency: string | undefined, chartKind: string | undefined): string {
  if (chartKind === "snapshot" || chartKind === "categorical_breakdown") {
    return "categories";
  }
  if (chartKind === "geographic_comparison") {
    return "geographies";
  }
  const kind = normalizeFrequency(frequency);
  if (kind === "annual") return "years";
  if (kind === "monthly") return "months";
  if (kind === "quarterly") return "quarters";
  return "points";
}

/** Display helpers for UK observation periods and values. */

export function formatQuarterLabel(periodStart: string): string {
  // period_start is ISO date at quarter start, e.g. 2020-04-01 → 2020 Q2
  const year = Number(periodStart.slice(0, 4));
  const month = Number(periodStart.slice(5, 7));
  if (!year || !month) return periodStart;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year} Q${quarter}`;
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
  if (/TWh/i.test(unit)) {
    return `${value.toLocaleString("en-GB", { maximumFractionDigits: 3 })} TWh`;
  }
  return `${value.toLocaleString("en-GB")} (${unit})`;
}

export function shortUnitLabel(unit: string): string {
  if (/£\s*million/i.test(unit)) return "£ million (CVM, SA)";
  if (/TWh/i.test(unit)) return "TWh";
  return unit;
}

/**
 * Tax Machine — educational liability model from Validated statute observations.
 *
 * Ports the PAYE-style + employee Class 1 NICs arithmetic from
 * `economy.connectors.tax_machine_rules` (Python). Rules come from the Ready
 * API series `tax-machine-income-tax-rules` — never a laptop CSV.
 *
 * Not tax advice. Hypothetical taxable employment income only; Scotland is a
 * labelled alternate income-tax table; NICs stay a separate stage.
 */

import type { Observation } from "@/lib/api";

export type TaxJurisdiction = "england-wales-ni" | "scotland";

export type TaxBand = {
  bandId: string;
  label: string;
  ratePercent: number;
  lowerAfterAllowance: number;
  upperAfterAllowance: number | null;
};

export type YearRules = {
  taxYear: string;
  personalAllowance: number;
  paIncomeLimit: number;
  ewniBands: TaxBand[];
  scotlandBands: TaxBand[];
  nicPrimaryThreshold: number;
  nicUpperEarningsLimit: number;
  nicLowerEarningsLimit: number;
  nicRatePtToUelPercent: number;
  nicRateAboveUelPercent: number;
  /** False when the archive keeps split mid-year NI rates only — no single annual rule. */
  nicsPinned: boolean;
  /** Where the rules came from: the Ready statute pin or the multi-year archive (weekly×52 NI). */
  basis: "pin" | "archive";
};

/** One income-tax band drawn on the gross-income rule (band edges are after-allowance in statute). */
export type BandSlice = {
  bandId: string;
  label: string;
  ratePercent: number;
  /** Gross income where the band starts. */
  fromGross: number;
  /** Gross income where the band ends; null = open. */
  toGross: number | null;
  /** Pounds of the chosen income that fall in this band. */
  taxed: number;
  tax: number;
};

export type NicSlice = {
  id: string;
  label: string;
  ratePercent: number;
  fromGross: number;
  toGross: number | null;
  taxed: number;
  tax: number;
};

export type CalcStep = {
  step: string;
  detail: string;
  amount: number;
};

export type TaxMachineResult = {
  taxYear: string;
  jurisdiction: TaxJurisdiction;
  gross: number;
  /** Personal allowance applied to this income. */
  allowance: number;
  incomeTax: number;
  /** Null when the year has no single pinned National Insurance rule. */
  employeeNics: number | null;
  combined: number | null;
  incomeTaxSteps: CalcStep[];
  nicsSteps: CalcStep[];
  bandSlices: BandSlice[];
  nicSlices: NicSlice[];
};

/** Preset gross incomes (≤ £100k so PA taper stays unused in examples). */
export const TAX_MACHINE_INCOMES: { value: string; label: string }[] = [
  { value: "20000", label: "£20,000" },
  { value: "30000", label: "£30,000" },
  { value: "50270", label: "£50,270" },
  { value: "80000", label: "£80,000" },
  { value: "100000", label: "£100,000" },
];

export const TAX_MACHINE_JURISDICTIONS: { value: TaxJurisdiction; label: string }[] = [
  { value: "england-wales-ni", label: "England, Wales and Northern Ireland" },
  { value: "scotland", label: "Scotland" },
];

const GEO_TO_JURIS: Record<string, TaxJurisdiction | "uk-nics"> = {
  EWNI: "england-wales-ni",
  S92000003: "scotland",
  K02000001: "uk-nics",
};

/** Round to nearest penny (matches connector educational examples). */
export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseNotes(notes: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (notes || "").split(";")) {
    const chunk = part.trim();
    if (!chunk || !chunk.includes("=")) continue;
    const i = chunk.indexOf("=");
    const key = chunk.slice(0, i).trim().toLowerCase();
    const value = chunk.slice(i + 1).trim();
    if (key && !(key in out)) out[key] = value;
  }
  return out;
}

function parseUpper(raw: string | undefined): number | null {
  if (raw == null || raw === "" || raw === "open") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Build per-tax-year rule tables from Ready observations. */
export function rulesFromObservations(rows: Observation[]): YearRules[] {
  const byYear = new Map<
    string,
    {
      pa: Map<TaxJurisdiction, { amount: number; limit: number }>;
      bands: Map<TaxJurisdiction, TaxBand[]>;
      nics: Partial<{
        pt: number;
        uel: number;
        lel: number;
        mid: number;
        top: number;
      }>;
    }
  >();

  const ensure = (year: string) => {
    let slot = byYear.get(year);
    if (!slot) {
      slot = {
        pa: new Map(),
        bands: new Map(),
        nics: {},
      };
      byYear.set(year, slot);
    }
    return slot;
  };

  for (const row of rows) {
    if (row.value == null || !Number.isFinite(row.value)) continue;
    const notes = parseNotes(row.notes);
    const year = notes.tax_year || row.source_version;
    if (!year) continue;
    const slot = ensure(year);
    const kind = notes.kind;
    const jurisKey = GEO_TO_JURIS[row.geography_code];

    if (kind === "allowance" && notes.name === "personal_allowance") {
      if (jurisKey === "england-wales-ni" || jurisKey === "scotland") {
        slot.pa.set(jurisKey, {
          amount: row.value,
          limit: Number(notes.pa_income_limit) || 100_000,
        });
      }
      continue;
    }

    if (kind === "income_tax_band") {
      if (jurisKey !== "england-wales-ni" && jurisKey !== "scotland") continue;
      const band: TaxBand = {
        bandId: notes.band || "band",
        label: notes.label || notes.band || "Band",
        ratePercent: row.value,
        lowerAfterAllowance: Number(notes.lower_after_allowance) || 0,
        upperAfterAllowance: parseUpper(notes.upper_after_allowance),
      };
      const list = slot.bands.get(jurisKey) ?? [];
      list.push(band);
      slot.bands.set(jurisKey, list);
      continue;
    }

    if (kind === "employee_class1_nics" && jurisKey === "uk-nics") {
      const name = notes.name;
      if (name === "primary_threshold") slot.nics.pt = row.value;
      else if (name === "upper_earnings_limit") slot.nics.uel = row.value;
      else if (name === "lel_annual") slot.nics.lel = row.value;
      else if (name === "rate_pt_to_uel") slot.nics.mid = row.value;
      else if (name === "rate_above_uel") slot.nics.top = row.value;
    }
  }

  const years: YearRules[] = [];
  for (const [taxYear, slot] of [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const paE = slot.pa.get("england-wales-ni");
    const paS = slot.pa.get("scotland") ?? paE;
    if (!paE || slot.nics.pt == null || slot.nics.uel == null) continue;
    const sortBands = (bands: TaxBand[]) =>
      [...bands].sort((a, b) => a.lowerAfterAllowance - b.lowerAfterAllowance);
    years.push({
      taxYear,
      personalAllowance: paE.amount,
      paIncomeLimit: paE.limit,
      ewniBands: sortBands(slot.bands.get("england-wales-ni") ?? []),
      scotlandBands: sortBands(slot.bands.get("scotland") ?? []),
      nicPrimaryThreshold: slot.nics.pt,
      nicUpperEarningsLimit: slot.nics.uel,
      nicLowerEarningsLimit: slot.nics.lel ?? 0,
      nicRatePtToUelPercent: slot.nics.mid ?? 0,
      nicRateAboveUelPercent: slot.nics.top ?? 0,
      nicsPinned: true,
      basis: "pin",
    });
    void paS;
  }
  return years;
}

function personalAllowanceFor(gross: number, rules: YearRules): number {
  if (gross <= rules.paIncomeLimit) return rules.personalAllowance;
  const reduction = Math.floor((gross - rules.paIncomeLimit) / 2);
  return Math.max(0, rules.personalAllowance - reduction);
}

function incomeTaxLiability(
  gross: number,
  bands: TaxBand[],
  rules: YearRules,
): { total: number; steps: CalcStep[]; slices: BandSlice[]; allowance: number } {
  const allowance = personalAllowanceFor(gross, rules);
  const slices: BandSlice[] = [];
  const taxable = Math.max(0, gross - allowance);
  const steps: CalcStep[] = [
    {
      step: "personal_allowance",
      detail: `Personal allowance £${allowance.toLocaleString("en-GB")} (standard; taper starts above £${rules.paIncomeLimit.toLocaleString("en-GB")})`,
      amount: money(allowance),
    },
    {
      step: "taxable_income",
      detail: `Gross £${gross.toLocaleString("en-GB")} minus personal allowance`,
      amount: money(taxable),
    },
  ];
  let remaining = taxable;
  let prevUpper = 0;
  let total = 0;
  for (const band of bands) {
    if (remaining <= 0) break;
    const width =
      band.upperAfterAllowance == null ? remaining : band.upperAfterAllowance - prevUpper;
    if (width < 0) break;
    const sliceAmt = Math.min(remaining, width);
    if (sliceAmt > 0) {
      const tax = money((sliceAmt * band.ratePercent) / 100);
      total += tax;
      slices.push({
        bandId: band.bandId,
        label: band.label,
        ratePercent: band.ratePercent,
        fromGross: allowance + band.lowerAfterAllowance,
        toGross: band.upperAfterAllowance == null ? null : allowance + band.upperAfterAllowance,
        taxed: money(sliceAmt),
        tax,
      });
      const upperLabel =
        band.upperAfterAllowance == null
          ? "open"
          : band.upperAfterAllowance.toLocaleString("en-GB");
      steps.push({
        step: `band_${band.bandId}`,
        detail: `${band.label} at ${band.ratePercent}% on £${money(sliceAmt).toLocaleString("en-GB")} (after-allowance ${band.lowerAfterAllowance.toLocaleString("en-GB")}–${upperLabel})`,
        amount: tax,
      });
      remaining -= sliceAmt;
    }
    if (band.upperAfterAllowance != null) prevUpper = band.upperAfterAllowance;
  }
  // Bands the income never reaches are still drawn, empty.
  for (const band of bands) {
    if (slices.some((sl) => sl.bandId === band.bandId)) continue;
    slices.push({
      bandId: band.bandId,
      label: band.label,
      ratePercent: band.ratePercent,
      fromGross: allowance + band.lowerAfterAllowance,
      toGross: band.upperAfterAllowance == null ? null : allowance + band.upperAfterAllowance,
      taxed: 0,
      tax: 0,
    });
  }
  slices.sort((a, b) => a.fromGross - b.fromGross);
  const incomeTax = money(total);
  steps.push({
    step: "income_tax_total",
    detail: "Income tax total (separate from National Insurance)",
    amount: incomeTax,
  });
  return { total: incomeTax, steps, slices, allowance };
}

function employeeClass1Nics(
  gross: number,
  rules: YearRules,
): { total: number; steps: CalcStep[]; slices: NicSlice[] } {
  const pt = rules.nicPrimaryThreshold;
  const uel = rules.nicUpperEarningsLimit;
  const mid = Math.max(0, Math.min(gross, uel) - pt);
  const top = Math.max(0, gross - uel);
  const midNic = money((mid * rules.nicRatePtToUelPercent) / 100);
  const topNic = money((top * rules.nicRateAboveUelPercent) / 100);
  const total = money(midNic + topNic);
  const slices: NicSlice[] = [
    {
      id: "pt-to-uel",
      label: "Between primary threshold and upper earnings limit",
      ratePercent: rules.nicRatePtToUelPercent,
      fromGross: pt,
      toGross: uel,
      taxed: money(mid),
      tax: midNic,
    },
    {
      id: "above-uel",
      label: "Above upper earnings limit",
      ratePercent: rules.nicRateAboveUelPercent,
      fromGross: uel,
      toGross: null,
      taxed: money(top),
      tax: topNic,
    },
  ];
  const steps: CalcStep[] = [
    {
      step: "nic_pt_to_uel",
      detail: `Earnings £${money(mid).toLocaleString("en-GB")} between primary threshold £${pt.toLocaleString("en-GB")} and upper earnings limit £${uel.toLocaleString("en-GB")} at ${rules.nicRatePtToUelPercent}%`,
      amount: midNic,
    },
    {
      step: "nic_above_uel",
      detail: `Earnings £${money(top).toLocaleString("en-GB")} above upper earnings limit at ${rules.nicRateAboveUelPercent}%`,
      amount: topNic,
    },
    {
      step: "employee_class1_nics_total",
      detail: "Employee Class 1 National Insurance (category A) — not blended with income tax",
      amount: total,
    },
  ];
  return { total, steps, slices };
}

export function runTaxMachine(
  rules: YearRules,
  jurisdiction: TaxJurisdiction,
  gross: number,
): TaxMachineResult | null {
  if (!Number.isFinite(gross) || gross < 0 || gross > rules.paIncomeLimit) return null;
  const bands =
    jurisdiction === "scotland" ? rules.scotlandBands : rules.ewniBands;
  if (!bands.length) return null;
  const it = incomeTaxLiability(gross, bands, rules);
  const nic = rules.nicsPinned ? employeeClass1Nics(gross, rules) : null;
  return {
    taxYear: rules.taxYear,
    jurisdiction,
    gross,
    allowance: it.allowance,
    incomeTax: it.total,
    employeeNics: nic ? nic.total : null,
    combined: nic ? money(it.total + nic.total) : null,
    incomeTaxSteps: it.steps,
    nicsSteps: nic ? nic.steps : [],
    bandSlices: it.slices,
    nicSlices: nic ? nic.slices : [],
  };
}

/** Pattern per band, fixed by statute name so a band keeps its mark across years and places. */
export const BAND_PATTERN: Record<string, BandPattern> = {
  starter: "engrave",
  basic: "solid",
  intermediate: "stipple",
  higher: "hatch",
  additional: "cross",
  advanced: "cross",
  top: "sparse",
};
export type BandPattern = "solid" | "stipple" | "sparse" | "hatch" | "cross" | "engrave";

export function bandPattern(bandId: string): BandPattern {
  return BAND_PATTERN[bandId] ?? "stipple";
}

export function formatGbp(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function taxYearLabel(id: string): string {
  // 2025-26 → 2025–26
  return id.replace("-", "–");
}

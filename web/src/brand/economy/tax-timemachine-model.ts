/**
 * The Tax Time Machine — multi-year income-tax + employee Class 1 NICs archive.
 *
 * Approach: parse Ready history observations (`tax-machine-income-tax-history`)
 * using the same semicolon key=value notes as the connector curated CSV. Income
 * tax and National Insurance stay separate stages. Scotland gaps are data-driven
 * (`band=gap` notes only) — never invented fills. NICs intra-year 2022–23 /
 * 2023–24 stay documented gaps. Fiscal-drag charts read the documented
 * `economy.tax-fiscal-drag` pack only — never invent profiles.
 *
 * Educational illustration only — not tax advice.
 *
 * Notes keys match `data/economy/tax-machine-income-tax-history/curated/observations.csv`.
 * Naming follows the connector family: https://peps.python.org/pep-0008/
 */

import type { Observation } from "@/lib/api";
import type { Pt } from "../data";
import type { FiscalDragPack, FiscalDragProfile } from "./types";
import {
  TAX_MACHINE_JURISDICTIONS,
  taxYearLabel,
  type TaxBand,
  type TaxJurisdiction,
  type YearRules,
} from "./tax-machine-model";

export type TimeMachineStage = "income-tax" | "nics";

/** Rates archive vs educational frozen-threshold examples. */
export type TimeMachineFocus = "rates" | "fiscal-drag";

export const TIME_MACHINE_STAGE_OPTIONS: { value: TimeMachineStage; label: string }[] = [
  { value: "income-tax", label: "Income tax" },
  { value: "nics", label: "Employee National Insurance" },
];

export const TIME_MACHINE_FOCUS_OPTIONS: { value: TimeMachineFocus; label: string }[] = [
  { value: "rates", label: "Rates and thresholds" },
  { value: "fiscal-drag", label: "Frozen thresholds" },
];

/** Plain menu labels — avoid publisher acronyms in menus (visual-identity Terms rule). */
const FISCAL_DRAG_MENU_LABELS: Record<string, string> = {
  ewni_awe_scaled: "England, Wales & NI · average weekly earnings path",
  ewni_near_higher: "England, Wales & NI · near higher-rate threshold",
  scotland_awe_scaled: "Scotland · average weekly earnings path",
};

export { TAX_MACHINE_JURISDICTIONS as TIME_MACHINE_JURISDICTIONS };

/**
 * @deprecated Scotland 2017–22 are pinned (`pinned_govscot_hmrc_sit`). Kept empty
 * so any leftover callers do not force EmptyStages; gaps are observation-driven.
 */
export const SCOTLAND_GAP_YEARS = [] as const;

/** NICs years with published split rates — no single annual rate in observations. */
export const NICS_INTRA_YEAR_GAPS = ["2022-23", "2023-24"] as const;

const GEO_TO_JURIS: Record<string, TaxJurisdiction | "uk-nics"> = {
  EWNI: "england-wales-ni",
  S92000003: "scotland",
  K02000001: "uk-nics",
};

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

function taxYearStartT(taxYear: string): number {
  const start = Number(taxYear.slice(0, 4));
  // UK tax year starts 6 April → fractional year ~ April.
  return start + 3 / 12;
}

export function isScotlandGapYear(taxYear: string): boolean {
  return (SCOTLAND_GAP_YEARS as readonly string[]).includes(taxYear);
}

export function isNicsIntraYearGap(taxYear: string): boolean {
  return (NICS_INTRA_YEAR_GAPS as readonly string[]).includes(taxYear);
}

export type HistoryBand = TaxBand & {
  scotlandCoverage?: string;
};

export type HistoryYearSlice = {
  taxYear: string;
  taxYearLabel: string;
  personalAllowance: number | null;
  bands: HistoryBand[];
  /** True when Scotland bands are an explicit pin gap for this year. */
  scotlandGap: boolean;
};

export type NicsYearSlice = {
  taxYear: string;
  taxYearLabel: string;
  lelWeekly: number | null;
  ptWeekly: number | null;
  uelWeekly: number | null;
  ptAnnualX52: number | null;
  uelAnnualX52: number | null;
  ratePtToUel: number | null;
  rateAboveUel: number | null;
  /** True when the pin keeps split intra-year cells only (no single rate). */
  intraYearGap: boolean;
};

export type TimeMachineArchive = {
  incomeTaxYears: string[];
  nicsYears: string[];
  spanLabel: string;
  byJuris: Record<TaxJurisdiction, Map<string, HistoryYearSlice>>;
  nicsByYear: Map<string, NicsYearSlice>;
};

/** Build the dated archive from Ready history observations. */
export function archiveFromObservations(rows: Observation[]): TimeMachineArchive {
  const byJuris: Record<TaxJurisdiction, Map<string, HistoryYearSlice>> = {
    "england-wales-ni": new Map(),
    scotland: new Map(),
  };
  const nicsByYear = new Map<string, NicsYearSlice>();

  const ensureIt = (juris: TaxJurisdiction, taxYear: string): HistoryYearSlice => {
    let slot = byJuris[juris].get(taxYear);
    if (!slot) {
      slot = {
        taxYear,
        taxYearLabel: taxYearLabel(taxYear),
        personalAllowance: null,
        bands: [],
        scotlandGap: false,
      };
      byJuris[juris].set(taxYear, slot);
    }
    return slot;
  };

  const ensureNics = (taxYear: string): NicsYearSlice => {
    let slot = nicsByYear.get(taxYear);
    if (!slot) {
      slot = {
        taxYear,
        taxYearLabel: taxYearLabel(taxYear),
        lelWeekly: null,
        ptWeekly: null,
        uelWeekly: null,
        ptAnnualX52: null,
        uelAnnualX52: null,
        ratePtToUel: null,
        rateAboveUel: null,
        intraYearGap: isNicsIntraYearGap(taxYear),
      };
      nicsByYear.set(taxYear, slot);
    }
    return slot;
  };

  for (const row of rows) {
    const notes = parseNotes(row.notes);
    const taxYear = notes.tax_year || row.source_version;
    if (!taxYear) continue;
    const kind = notes.kind;
    const jurisKey = GEO_TO_JURIS[row.geography_code];

    if (kind === "allowance" && notes.name === "personal_allowance") {
      if (jurisKey !== "england-wales-ni" && jurisKey !== "scotland") continue;
      if (row.value == null || !Number.isFinite(row.value)) continue;
      const slot = ensureIt(jurisKey, taxYear);
      slot.personalAllowance = row.value;
      continue;
    }

    if (kind === "income_tax_band") {
      if (jurisKey !== "england-wales-ni" && jurisKey !== "scotland") continue;
      if (notes.band === "gap") {
        const slot = ensureIt(jurisKey, taxYear);
        slot.scotlandGap = true;
        continue;
      }
      if (row.value == null || !Number.isFinite(row.value)) continue;
      const slot = ensureIt(jurisKey, taxYear);
      slot.scotlandGap = false;
      slot.bands.push({
        bandId: notes.band || "band",
        label: notes.label || notes.band || "Band",
        ratePercent: row.value,
        lowerAfterAllowance: Number(notes.lower_after_allowance) || 0,
        upperAfterAllowance: parseUpper(notes.upper_after_allowance),
        scotlandCoverage: notes.scotland_coverage,
      });
      continue;
    }

    if (kind === "employee_class1_nics" && jurisKey === "uk-nics") {
      const slot = ensureNics(taxYear);
      if (notes.rate_status === "intra_year_change") slot.intraYearGap = true;
      if (row.value == null || !Number.isFinite(row.value)) continue;
      const name = notes.name;
      if (name === "lel_weekly") slot.lelWeekly = row.value;
      else if (name === "primary_threshold_weekly") slot.ptWeekly = row.value;
      else if (name === "upper_earnings_limit_weekly") slot.uelWeekly = row.value;
      else if (name === "primary_threshold_annual_x52") slot.ptAnnualX52 = row.value;
      else if (name === "upper_earnings_limit_annual_x52") slot.uelAnnualX52 = row.value;
      else if (name === "rate_pt_to_uel") slot.ratePtToUel = row.value;
      else if (name === "rate_above_uel") slot.rateAboveUel = row.value;
    }
  }

  // Seed NICs intra-year gaps so menus can name them when rate rows are absent.
  for (const y of NICS_INTRA_YEAR_GAPS) {
    const slot = ensureNics(y);
    slot.intraYearGap = true;
  }

  for (const juris of Object.keys(byJuris) as TaxJurisdiction[]) {
    for (const slot of byJuris[juris].values()) {
      slot.bands.sort((a, b) => a.lowerAfterAllowance - b.lowerAfterAllowance);
    }
  }

  const incomeTaxYears = [
    ...new Set([
      ...byJuris["england-wales-ni"].keys(),
      ...byJuris.scotland.keys(),
    ]),
  ].sort();
  const nicsYears = [...nicsByYear.keys()].sort();
  const first = incomeTaxYears[0];
  const last = incomeTaxYears[incomeTaxYears.length - 1];
  const spanLabel =
    first && last ? `${taxYearLabel(first)}–${taxYearLabel(last)}` : "—";

  return { incomeTaxYears, nicsYears, spanLabel, byJuris, nicsByYear };
}

/**
 * Rules for one archive year, so the Tax Machine can run on any pinned tax year.
 * National Insurance uses the published weekly thresholds ×52 (education only); years
 * with split mid-year rates come back `nicsPinned: false` and the NI stage is not drawn.
 */
export function yearRulesFromArchive(
  archive: TimeMachineArchive,
  taxYear: string,
): YearRules | null {
  const ewni = archive.byJuris["england-wales-ni"].get(taxYear);
  const scot = archive.byJuris.scotland.get(taxYear);
  if (!ewni?.bands.length || ewni.personalAllowance == null) return null;
  const nics = archive.nicsByYear.get(taxYear);
  const nicsPinned =
    !!nics &&
    !nics.intraYearGap &&
    nics.ptAnnualX52 != null &&
    nics.uelAnnualX52 != null &&
    nics.ratePtToUel != null &&
    nics.rateAboveUel != null;
  return {
    taxYear,
    personalAllowance: ewni.personalAllowance,
    paIncomeLimit: 100_000,
    ewniBands: ewni.bands,
    scotlandBands: scot && !scot.scotlandGap ? scot.bands : [],
    nicPrimaryThreshold: nicsPinned ? nics!.ptAnnualX52! : 0,
    nicUpperEarningsLimit: nicsPinned ? nics!.uelAnnualX52! : 0,
    nicLowerEarningsLimit: nicsPinned && nics!.lelWeekly != null ? nics!.lelWeekly * 52 : 0,
    nicRatePtToUelPercent: nicsPinned ? nics!.ratePtToUel! : 0,
    nicRateAboveUelPercent: nicsPinned ? nics!.rateAboveUel! : 0,
    nicsPinned,
    basis: "archive",
  };
}

/** Band edges on the gross-income rule for one archive year (after-allowance edges + allowance). */
export type YearRow = {
  taxYear: string;
  taxYearLabel: string;
  personalAllowance: number | null;
  bands: { bandId: string; label: string; ratePercent: number; fromGross: number; toGross: number | null }[];
  /** Scotland year not pinned — row is drawn empty, labelled. */
  gap: boolean;
  /** Mirrors England, Wales and Northern Ireland (labelled in Notes). */
  mirrored: boolean;
  nicPt: number | null;
  nicUel: number | null;
};

export function yearRows(archive: TimeMachineArchive, juris: TaxJurisdiction): YearRow[] {
  const out: YearRow[] = [];
  for (const taxYear of archive.incomeTaxYears) {
    const slot = archive.byJuris[juris].get(taxYear);
    const nics = archive.nicsByYear.get(taxYear);
    const pa = slot?.personalAllowance ?? null;
    const gap = !slot || slot.scotlandGap || !slot.bands.length || pa == null;
    out.push({
      taxYear,
      taxYearLabel: taxYearLabel(taxYear),
      personalAllowance: pa,
      bands: gap
        ? []
        : slot!.bands.map((b) => ({
            bandId: b.bandId,
            label: b.label,
            ratePercent: b.ratePercent,
            fromGross: pa! + b.lowerAfterAllowance,
            toGross: b.upperAfterAllowance == null ? null : pa! + b.upperAfterAllowance,
          })),
      gap,
      mirrored: !!slot?.bands.some((b) => (b.scotlandCoverage ?? "").includes("mirror")),
      nicPt: nics && !nics.intraYearGap ? nics.ptAnnualX52 : null,
      nicUel: nics && !nics.intraYearGap ? nics.uelAnnualX52 : null,
    });
  }
  return out;
}

/** Tax-year menu for income tax — pinned years only (gap years not offered as false options). */
export function incomeTaxYearOptions(
  archive: TimeMachineArchive,
  juris: TaxJurisdiction,
): { value: string; label: string }[] {
  const map = archive.byJuris[juris];
  return [...map.values()]
    .filter((s) => s.bands.length > 0 && !s.scotlandGap)
    .sort((a, b) => a.taxYear.localeCompare(b.taxYear))
    .map((s) => ({ value: s.taxYear, label: s.taxYearLabel }));
}

/** Tax-year menu for NICs — clean years with a main rate only. */
export function nicsYearOptions(
  archive: TimeMachineArchive,
): { value: string; label: string }[] {
  return [...archive.nicsByYear.values()]
    .filter((s) => !s.intraYearGap && s.ratePtToUel != null)
    .sort((a, b) => a.taxYear.localeCompare(b.taxYear))
    .map((s) => ({ value: s.taxYear, label: s.taxYearLabel }));
}

export function personalAllowanceSeries(
  archive: TimeMachineArchive,
  juris: TaxJurisdiction,
): Pt[] {
  const pts: Pt[] = [];
  for (const slot of archive.byJuris[juris].values()) {
    if (slot.scotlandGap || slot.personalAllowance == null) continue;
    pts.push({ t: taxYearStartT(slot.taxYear), v: slot.personalAllowance });
  }
  return pts.sort((a, b) => a.t - b.t);
}

/** Upper edge of the basic (or starter) band after allowance — key threshold over time. */
export function basicUpperSeries(
  archive: TimeMachineArchive,
  juris: TaxJurisdiction,
): Pt[] {
  const pts: Pt[] = [];
  for (const slot of archive.byJuris[juris].values()) {
    if (slot.scotlandGap || !slot.bands.length) continue;
    const basic =
      slot.bands.find((b) => b.bandId === "basic") ??
      slot.bands.find((b) => b.bandId === "starter");
    if (basic?.upperAfterAllowance == null) continue;
    pts.push({ t: taxYearStartT(slot.taxYear), v: basic.upperAfterAllowance });
  }
  return pts.sort((a, b) => a.t - b.t);
}

export function bandRateRanks(
  archive: TimeMachineArchive,
  juris: TaxJurisdiction,
  taxYear: string,
): { id: string; label: string; v: number }[] | null {
  const slot = archive.byJuris[juris].get(taxYear);
  if (!slot || slot.scotlandGap || !slot.bands.length) return null;
  return slot.bands.map((b) => ({
    id: b.bandId,
    label: b.label,
    v: b.ratePercent,
  }));
}

export function nicsWeeklyThresholdSeries(
  archive: TimeMachineArchive,
): { pt: Pt[]; uel: Pt[] } {
  const pt: Pt[] = [];
  const uel: Pt[] = [];
  for (const slot of archive.nicsByYear.values()) {
    if (slot.intraYearGap) continue;
    const t = taxYearStartT(slot.taxYear);
    if (slot.ptWeekly != null) pt.push({ t, v: slot.ptWeekly });
    if (slot.uelWeekly != null) uel.push({ t, v: slot.uelWeekly });
  }
  return {
    pt: pt.sort((a, b) => a.t - b.t),
    uel: uel.sort((a, b) => a.t - b.t),
  };
}

export function nicsMainRateSeries(archive: TimeMachineArchive): Pt[] {
  const pts: Pt[] = [];
  for (const slot of archive.nicsByYear.values()) {
    if (slot.intraYearGap || slot.ratePtToUel == null) continue;
    pts.push({ t: taxYearStartT(slot.taxYear), v: slot.ratePtToUel });
  }
  return pts.sort((a, b) => a.t - b.t);
}

export function nicsRateRanks(
  archive: TimeMachineArchive,
  taxYear: string,
): { id: string; label: string; v: number }[] | null {
  const slot = archive.nicsByYear.get(taxYear);
  if (!slot || slot.intraYearGap) return null;
  const rows: { id: string; label: string; v: number }[] = [];
  if (slot.ratePtToUel != null) {
    rows.push({
      id: "pt-to-uel",
      label: "Between primary threshold and upper earnings limit",
      v: slot.ratePtToUel,
    });
  }
  if (slot.rateAboveUel != null) {
    rows.push({
      id: "above-uel",
      label: "Above upper earnings limit",
      v: slot.rateAboveUel,
    });
  }
  return rows.length ? rows : null;
}

export type TimeMachineFigures = {
  personalAllowance: number | null;
  basicRate: number | null;
  spanLabel: string;
  yearLabel: string | null;
};

export function timeMachineFigures(
  archive: TimeMachineArchive,
  juris: TaxJurisdiction,
  stage: TimeMachineStage,
): TimeMachineFigures {
  const ewniYears = [...archive.byJuris["england-wales-ni"].values()]
    .filter((s) => s.bands.length)
    .sort((a, b) => a.taxYear.localeCompare(b.taxYear));
  const latestEwni = ewniYears[ewniYears.length - 1] ?? null;
  const jurisYears = [...archive.byJuris[juris].values()]
    .filter((s) => s.bands.length && !s.scotlandGap)
    .sort((a, b) => a.taxYear.localeCompare(b.taxYear));
  const latestJuris = jurisYears[jurisYears.length - 1] ?? latestEwni;
  const basic =
    latestJuris?.bands.find((b) => b.bandId === "basic") ??
    latestJuris?.bands.find((b) => b.bandId === "starter") ??
    null;

  if (stage === "nics") {
    const clean = [...archive.nicsByYear.values()]
      .filter((s) => !s.intraYearGap && s.ptWeekly != null)
      .sort((a, b) => a.taxYear.localeCompare(b.taxYear));
    const latest = clean[clean.length - 1] ?? null;
    return {
      personalAllowance: latestEwni?.personalAllowance ?? null,
      basicRate: latest?.ratePtToUel ?? null,
      spanLabel: archive.spanLabel,
      yearLabel: latest?.taxYearLabel ?? null,
    };
  }

  return {
    personalAllowance: latestJuris?.personalAllowance ?? null,
    basicRate: basic?.ratePercent ?? null,
    spanLabel: archive.spanLabel,
    yearLabel: latestJuris?.taxYearLabel ?? null,
  };
}

export function fmtGbpWhole(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

export function fmtPercent(n: number): string {
  return `${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;
}

export function fmtWeeklyGbp(n: number): string {
  return `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })} a week`;
}

/** Period label for TimeChart — tax year from fractional April start. */
export function historyPeriodLabel(t: number): string {
  const y = Math.floor(t + 1e-6);
  return taxYearLabel(`${y}-${String((y + 1) % 100).padStart(2, "0")}`);
}

/* ——— Fiscal drag (documented pack; educational only) ——— */

export function fiscalDragProfileOptions(
  pack: FiscalDragPack | null | undefined,
): { value: string; label: string }[] {
  if (!pack?.profiles?.length) return [];
  return pack.profiles.map((p) => ({
    value: p.profile_id,
    label: FISCAL_DRAG_MENU_LABELS[p.profile_id] ?? p.label,
  }));
}

export function fiscalDragProfile(
  pack: FiscalDragPack | null | undefined,
  profileId: string,
): FiscalDragProfile | null {
  if (!pack?.profiles?.length) return null;
  return pack.profiles.find((p) => p.profile_id === profileId) ?? pack.profiles[0] ?? null;
}

export function fiscalDragHasCounterfactual(profile: FiscalDragProfile | null): boolean {
  if (!profile?.years?.length) return false;
  return profile.years.some((y) => y.counterfactual_thresholds_indexed_to_awe != null);
}

export function fiscalDragEffectiveRateSeries(profile: FiscalDragProfile): Pt[] {
  return profile.years
    .map((y) => ({
      t: taxYearStartT(y.tax_year),
      v: y.actual_statutory.effective_income_tax_rate_percent,
    }))
    .sort((a, b) => a.t - b.t);
}

export function fiscalDragTaxSeries(profile: FiscalDragProfile): {
  actual: Pt[];
  counterfactual: Pt[];
} {
  const actual: Pt[] = [];
  const counterfactual: Pt[] = [];
  for (const y of profile.years) {
    const t = taxYearStartT(y.tax_year);
    actual.push({ t, v: y.actual_statutory.income_tax_gbp });
    const cf = y.counterfactual_thresholds_indexed_to_awe;
    if (cf) counterfactual.push({ t, v: cf.liability.income_tax_gbp });
  }
  return {
    actual: actual.sort((a, b) => a.t - b.t),
    counterfactual: counterfactual.sort((a, b) => a.t - b.t),
  };
}

/** Extra tax vs KAI7-indexed thresholds — E/W/NI profiles only. */
export function fiscalDragExtraTaxSeries(profile: FiscalDragProfile): Pt[] {
  const pts: Pt[] = [];
  for (const y of profile.years) {
    const cf = y.counterfactual_thresholds_indexed_to_awe;
    if (!cf) continue;
    pts.push({ t: taxYearStartT(y.tax_year), v: cf.extra_tax_vs_counterfactual_gbp });
  }
  return pts.sort((a, b) => a.t - b.t);
}

export type FiscalDragFigures = {
  effectiveRateEnd: number | null;
  effectiveRateChangePp: number | null;
  extraTaxEnd: number | null;
  spanLabel: string;
  profileLabel: string | null;
};

export function fiscalDragFigures(profile: FiscalDragProfile | null): FiscalDragFigures {
  if (!profile?.years?.length) {
    return {
      effectiveRateEnd: null,
      effectiveRateChangePp: null,
      extraTaxEnd: null,
      spanLabel: "—",
      profileLabel: null,
    };
  }
  const years = [...profile.years].sort((a, b) => a.tax_year.localeCompare(b.tax_year));
  const first = years[0]!;
  const last = years[years.length - 1]!;
  const rate0 = first.actual_statutory.effective_income_tax_rate_percent;
  const rate1 = last.actual_statutory.effective_income_tax_rate_percent;
  const extra = last.counterfactual_thresholds_indexed_to_awe?.extra_tax_vs_counterfactual_gbp ?? null;
  return {
    effectiveRateEnd: rate1,
    effectiveRateChangePp: rate1 - rate0,
    extraTaxEnd: extra,
    spanLabel: `${taxYearLabel(first.tax_year)}–${taxYearLabel(last.tax_year)}`,
    profileLabel: FISCAL_DRAG_MENU_LABELS[profile.profile_id] ?? profile.label,
  };
}

export function fmtPp(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })} percentage points`;
}

/** Re-export for canvas labels. */
export { taxYearLabel };

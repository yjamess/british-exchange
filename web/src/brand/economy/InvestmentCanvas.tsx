"use client";

/**
 * Economy Domain 09 — Trade & Investment.
 * Views: trade ledger · trading world · products · investment ledger · capital across borders
 * (+ landscape · births on rail) · data. Route ids kept for saved links.
 * Shell matches Employment / Household: ExplorerHead → FigureStrip → ControlRow → Stage.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { ReadoutCard } from "../instrument/ReadoutCard";
import { RegionMap, UK_NATION_SHAPES, WorldChoropleth } from "../map";
import type { PrintOption } from "../PrintSelect";
import {
  ControlRow,
  EmptyStage,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
} from "../template";
import s from "../energy/generation.module.css";
import { TradeBlocTrend } from "./TradeBlocTrend";
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import type { InvestmentPack } from "./types";
import type { Observation } from "@/lib/api";
import {
  annualPoints,
  displayLabel,
  filterNotes,
  fmtCount,
  fmtGbpM,
  formatPeriod,
  isAssetDetail,
  isIndustryDetail,
  isInsolvencyHeadline,
  isTopLevelService,
  isUkEnterpriseGeo,
  iso2ToA3,
  fdiPartnerToA3,
  latestPeriod,
  latestValue,
  notePart,
  pointsFrom,
  quarterlyPoints,
  calendarYearSeries,
  fdiPartnerLabel,
  latestFullYear,
  yearTotals,
  type Ranked,
  yearLabel,
} from "./investment-model";

type WorldLens = "country" | "services" | "region";

function asWorldLens(raw: string | null): WorldLens {
  if (raw === "services" || raw === "region") return raw;
  // Legacy "commodity" lens moved to Products.
  return "country";
}

function isIso2Partner(code: string): boolean {
  return /^[A-Z]{2}$/i.test(code.trim());
}

const VIEWS: ExplorerView[] = [
  { id: "trade", label: "Trade ledger" },
  { id: "world", label: "Trading world" },
  { id: "products", label: "Products" },
  { id: "capital", label: "Investment ledger" },
  { id: "fdi", label: "Capital across borders" },
  { id: "landscape", label: "Landscape" },
  { id: "births", label: "Births & deaths" },
  { id: "data", label: "Data" },
];

type InvestmentView = (typeof VIEWS)[number]["id"];

const BASIS_OPTIONS: PrintOption<"cp" | "cvm">[] = [
  { value: "cp", label: "Current prices" },
  { value: "cvm", label: "Chained volume" },
];
const WORLD_LENS: PrintOption<WorldLens>[] = [
  { value: "country", label: "Goods countries" },
  { value: "services", label: "Services countries" },
  { value: "region", label: "UK nation" },
];
const FLOW_OPTIONS: PrintOption<"exports" | "imports">[] = [
  { value: "exports", label: "Exports" },
  { value: "imports", label: "Imports" },
];
const PRODUCT_OPTIONS: PrintOption<"goods" | "services">[] = [
  { value: "goods", label: "Goods" },
  { value: "services", label: "Services" },
];
const CAPITAL_OPTIONS: PrintOption<"total" | "asset" | "industry">[] = [
  { value: "total", label: "Total" },
  { value: "asset", label: "By asset" },
  { value: "industry", label: "By industry" },
];
const FDI_OPTIONS: PrintOption<"flows" | "positions" | "earnings">[] = [
  { value: "flows", label: "Flows" },
  { value: "positions", label: "Positions" },
  { value: "earnings", label: "Earnings" },
];

const DIRECTION_OPTIONS: PrintOption<"inward" | "outward">[] = [
  { value: "inward", label: "Into the UK" },
  { value: "outward", label: "From the UK" },
];
/** Lines drawn on the composition-over-time panels (Electric spectrum fits twelve; five stay legible). */
const TREND_LINES = 5;

function asView(raw: string | null): InvestmentView {
  return VIEWS.some((v) => v.id === raw) ? (raw as InvestmentView) : "trade";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? id;
}

function obs(pack: { observations: Observation[] } | null | undefined): Observation[] {
  return pack?.observations ?? [];
}

function dim(notes: string, key: string, value: string): boolean {
  return notePart(notes, key) === value;
}


export function InvestmentCanvas({ pack }: { pack: InvestmentPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [basis, setBasis] = useState<"cp" | "cvm">(
    () => (searchParams.get("basis") === "cvm" ? "cvm" : "cp"),
  );
  const [worldLens, setWorldLens] = useState<WorldLens>(() =>
    asWorldLens(searchParams.get("lens")),
  );
  const [worldFlow, setWorldFlow] = useState<"exports" | "imports">(
    () => (searchParams.get("flow") === "imports" ? "imports" : "exports"),
  );
  const [worldYear, setWorldYear] = useState(() => searchParams.get("year") ?? "");
  const [productKind, setProductKind] = useState<"goods" | "services">(
    () => (searchParams.get("kind") === "services" ? "services" : "goods"),
  );
  const [capitalSplit, setCapitalSplit] = useState<"total" | "asset" | "industry">(
    () => {
      const v = searchParams.get("split");
      return v === "asset" || v === "industry" ? v : "total";
    },
  );
  const [fdiMeasure, setFdiMeasure] = useState<"flows" | "positions" | "earnings">(
    () => {
      const v = searchParams.get("measure");
      return v === "positions" || v === "earnings" ? v : "flows";
    },
  );
  const [productFlow, setProductFlow] = useState<"exports" | "imports">(
    () => (searchParams.get("flow") === "imports" ? "imports" : "exports"),
  );
  const [fdiDirection, setFdiDirection] = useState<"inward" | "outward">(
    () => (searchParams.get("dir") === "outward" ? "outward" : "inward"),
  );
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedNation, setSelectedNation] = useState<string | null>(null);
  const [selectedFdiIso, setSelectedFdiIso] = useState<string | null>(null);
  const [dataSeries, setDataSeries] = useState(() => searchParams.get("series") ?? "");

  const sync = useCallback(
    (next: {
      view?: string;
      basis?: string;
      lens?: string;
      flow?: string;
      year?: string;
      kind?: string;
      split?: string;
      measure?: string;
      series?: string;
      pflow?: string;
      dir?: string;
    }) => {
      const v = next.view ?? view;
      const u = new URLSearchParams();
      u.set("domain", "investment");
      u.set("view", v);
      const b = next.basis ?? basis;
      const lens = next.lens ?? worldLens;
      const flow = next.flow ?? worldFlow;
      const year = next.year ?? worldYear;
      const kind = next.kind ?? productKind;
      const split = next.split ?? capitalSplit;
      const measure = next.measure ?? fdiMeasure;
      const series = next.series ?? dataSeries;
      if (v === "trade" && b !== "cp") u.set("basis", b);
      if (v === "world") {
        if (lens !== "country") u.set("lens", lens);
        if (flow !== "exports") u.set("flow", flow);
        if (year) u.set("year", year);
      }
      const pflow = next.pflow ?? productFlow;
      const dir = next.dir ?? fdiDirection;
      if (v === "products") {
        if (kind !== "goods") u.set("kind", kind);
        if (pflow !== "exports") u.set("flow", pflow);
      }
      if (v === "capital" && split !== "total") u.set("split", split);
      if (v === "fdi") {
        if (measure !== "flows") u.set("measure", measure);
        if (measure === "flows" && dir !== "inward") u.set("dir", dir);
      }
      if (v === "data" && series) u.set("series", series);
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(asView(next.view));
      if (next.basis != null) setBasis(next.basis === "cvm" ? "cvm" : "cp");
      if (next.lens != null) {
        setWorldLens(asWorldLens(next.lens));
        setSelectedIso(null);
        setSelectedNation(null);
      }
      if (next.flow != null) {
        setWorldFlow(next.flow === "imports" ? "imports" : "exports");
        setSelectedIso(null);
        setSelectedNation(null);
      }
      if (next.year != null) {
        setWorldYear(next.year);
        setSelectedIso(null);
        setSelectedNation(null);
      }
      if (next.dir != null) setSelectedFdiIso(null);
      if (next.measure != null) setSelectedFdiIso(null);
      if (next.kind != null) setProductKind(next.kind === "services" ? "services" : "goods");
      if (next.split != null)
        setCapitalSplit(
          next.split === "asset" || next.split === "industry" ? next.split : "total",
        );
      if (next.measure != null)
        setFdiMeasure(
          next.measure === "positions" || next.measure === "earnings"
            ? next.measure
            : "flows",
        );
      if (next.series != null) setDataSeries(next.series);
      if (next.pflow != null) setProductFlow(next.pflow === "imports" ? "imports" : "exports");
      if (next.dir != null) setFdiDirection(next.dir === "outward" ? "outward" : "inward");
    },
    [
      pathname,
      view,
      basis,
      worldLens,
      worldFlow,
      worldYear,
      productKind,
      capitalSplit,
      fdiMeasure,
      dataSeries,
      productFlow,
      fdiDirection,
    ],
  );

  const tradeRows = obs(pack.tradeMret);
  const tradeTotal = useMemo(
    () =>
      filterNotes(
        tradeRows,
        (n) => dim(n, "flow", "balance") && dim(n, "component", "total") && dim(n, "basis", basis),
      ),
    [tradeRows, basis],
  );
  const tradeGoods = useMemo(
    () =>
      filterNotes(
        tradeRows,
        (n) => dim(n, "flow", "balance") && dim(n, "component", "goods") && dim(n, "basis", basis),
      ),
    [tradeRows, basis],
  );
  const tradeServices = useMemo(
    () =>
      filterNotes(
        tradeRows,
        (n) =>
          dim(n, "flow", "balance") && dim(n, "component", "services") && dim(n, "basis", basis),
      ),
    [tradeRows, basis],
  );
  const tradeExports = useMemo(
    () =>
      filterNotes(
        tradeRows,
        (n) => dim(n, "flow", "exports") && dim(n, "component", "total") && dim(n, "basis", basis),
      ),
    [tradeRows, basis],
  );
  const tradeImports = useMemo(
    () =>
      filterNotes(
        tradeRows,
        (n) => dim(n, "flow", "imports") && dim(n, "component", "total") && dim(n, "basis", basis),
      ),
    [tradeRows, basis],
  );
  const exPmBalance = useMemo(
    () =>
      filterNotes(
        obs(pack.tradeExPm),
        (n) => dim(n, "category", "goods-balance-ex-pm") && dim(n, "basis", "cp"),
      ),
    [pack.tradeExPm],
  );

  const partnerYears = pack.partnersAnnual?.years ?? [];
  const regionYears = useMemo(
    () => [...new Set(obs(pack.goodsByRegion).map((r) => r.period_start.slice(0, 4)))].sort(),
    [pack.goodsByRegion],
  );
  const servicesPartnerYears = useMemo(
    () => [...new Set(obs(pack.servicesPartner).map((r) => r.period_start.slice(0, 4)))].sort(),
    [pack.servicesPartner],
  );
  const worldYearOptions =
    worldLens === "region"
      ? regionYears
      : worldLens === "services"
        ? servicesPartnerYears
        : partnerYears;
  const activeWorldYear =
    worldYear && worldYearOptions.includes(worldYear)
      ? worldYear
      : // Default to the latest complete year; a year to date stays selectable.
        ([...worldYearOptions]
          .reverse()
          .find((y) => !(worldLens === "country" && pack.partnersAnnual?.coverage?.[y]?.partial)) ??
        "");
  /** Map / ranks follow the Flow control (exports or imports). */
  const activeFlow = worldFlow;

  const yearPartnerBlock = useMemo(
    () => pack.partnersAnnual?.by_year?.[activeWorldYear] ?? null,
    [pack.partnersAnnual, activeWorldYear],
  );

  const worldPartnerRows = useMemo(
    () => yearPartnerBlock?.[activeFlow] ?? [],
    [yearPartnerBlock, activeFlow],
  );

  const mapRows = useMemo(() => {
    const out: { id: string; value: number | null; display: string }[] = [];
    for (const r of worldPartnerRows) {
      const a3 = iso2ToA3(r.code);
      if (!a3) continue;
      out.push({
        id: a3,
        value: r.value,
        // Value only — WorldChoropleth captions as "Name · display" (RegionMap style).
        display: fmtGbpM(r.value),
      });
    }
    return out;
  }, [worldPartnerRows]);

  /**
   * Selected country with both flows from the same year block.
   * Partner totals are ONS BoP; product mix comes from HMRC OTS when Ready.
   */
  const selectedPartner = useMemo(() => {
    if (!selectedIso || !yearPartnerBlock) return null;
    const exports =
      yearPartnerBlock.exports.find((r) => iso2ToA3(r.code) === selectedIso) ?? null;
    const imports =
      yearPartnerBlock.imports.find((r) => iso2ToA3(r.code) === selectedIso) ?? null;
    const primary = activeFlow === "imports" ? imports : exports;
    if (!primary && !exports && !imports) return null;
    const label = primary?.label ?? exports?.label ?? imports?.label ?? "Partner";
    const period = primary?.period ?? exports?.period ?? imports?.period ?? "";
    const code = (primary?.code ?? exports?.code ?? imports?.code ?? "").toUpperCase();
    const expV = exports?.value ?? null;
    const impV = imports?.value ?? null;
    return {
      code,
      label,
      period,
      exports: expV,
      imports: impV,
      balance: expV != null && impV != null ? expV - impV : null,
    };
  }, [selectedIso, yearPartnerBlock, activeFlow]);

  /**
   * Partner × SITC1 product frames for the selected country (HMRC OTS).
   * Empty when the pack is missing or this ISO2 has no rows for the year/flow.
   */
  const partnerProductFrames = useMemo(() => {
    const iso2 = selectedPartner?.code;
    if (!iso2 || !pack.partnerCommodity) return [];
    const block = pack.partnerCommodity.by_year?.[activeWorldYear]?.[activeFlow];
    const rows = block?.[iso2] ?? [];
    return rows
      .filter((r) => Number.isFinite(r.value) && r.value > 0)
      .map((r) => ({
        id: `sitc1-${r.sitc1}`,
        label: r.label || pack.partnerCommodity?.sitc1_labels?.[r.sitc1] || `SITC ${r.sitc1}`,
        v: r.value,
      }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);
  }, [pack.partnerCommodity, selectedPartner?.code, activeWorldYear, activeFlow]);

  const regionRanks = useMemo(() => {
    const rows = obs(pack.goodsByRegion);
    const years = [...new Set(rows.map((r) => r.period_start.slice(0, 4)))].sort();
    const y = activeWorldYear || years[years.length - 1] || "";
    const inYear = rows.filter((r) => r.period_start.startsWith(y));
    // Calendar-year total: every published quarter of the year, EU and non-EU together.
    const needle = activeFlow === "exports" ? "exports" : "imports";
    const byGeo = new Map<string, { id: string; label: string; v: number }>();
    for (const r of inYear) {
      const cat = notePart(r.notes ?? "", "category");
      if (!cat.includes(needle)) continue;
      if (r.value == null || !Number.isFinite(r.value)) continue;
      const id = r.geography_code || r.geography_label || "—";
      const label = r.geography_label || id;
      const prev = byGeo.get(id);
      byGeo.set(id, { id, label, v: (prev?.v ?? 0) + r.value });
    }
    return [...byGeo.values()].sort((a, b) => b.v - a.v);
  }, [pack.goodsByRegion, activeWorldYear, activeFlow]);

  const nationMapRows = useMemo(
    () =>
      regionRanks.map((r) => ({
        code: r.id,
        value: r.v,
        display: fmtGbpM(r.v),
      })),
    [regionRanks],
  );

  /** Services partners — ISO2 countries only on the map; aggregates stay RankBars. */
  const servicesPartnerRows = useMemo(() => {
    const rows = obs(pack.servicesPartner).filter(
      (r) =>
        dim(r.notes ?? "", "flow", activeFlow) &&
        r.period_start.startsWith(activeWorldYear) &&
        r.value != null &&
        Number.isFinite(r.value),
    );
    const ranked: { code: string; label: string; value: number }[] = [];
    for (const r of rows) {
      const code = (r.geography_code || "").toUpperCase();
      if (!code) continue;
      ranked.push({
        code,
        label: r.geography_label || code,
        value: r.value as number,
      });
    }
    ranked.sort((a, b) => b.value - a.value);
    return ranked;
  }, [pack.servicesPartner, activeWorldYear, activeFlow]);

  const servicesMapRows = useMemo(() => {
    const out: { id: string; value: number | null; display: string }[] = [];
    for (const r of servicesPartnerRows) {
      if (!isIso2Partner(r.code)) continue;
      const a3 = iso2ToA3(r.code);
      if (!a3) continue;
      out.push({ id: a3, value: r.value, display: fmtGbpM(r.value) });
    }
    return out;
  }, [servicesPartnerRows]);

  /** Products — goods (SITC sections, monthly) or services (top-level types, annual). */
  const productRows = useMemo(() => {
    if (productKind === "goods") {
      return obs(pack.goodsCommodity).filter((r) => dim(r.notes ?? "", "flow", productFlow));
    }
    return obs(pack.servicesCategory).filter(
      (r) => dim(r.notes ?? "", "flow", productFlow) && isTopLevelService(r.notes ?? ""),
    );
  }, [pack.goodsCommodity, pack.servicesCategory, productKind, productFlow]);
  const productPerYear: 1 | 12 = productKind === "goods" ? 12 : 1;
  const productYear = useMemo(
    () => latestFullYear(productRows, productPerYear),
    [productRows, productPerYear],
  );
  const productRanks = useMemo(
    () =>
      yearTotals(
        productRows,
        productYear,
        (r) => notePart(r.notes ?? "", "category"),
        (r) => displayLabel(r.notes ?? "", notePart(r.notes ?? "", "category")),
      ).slice(0, 12),
    [productRows, productYear],
  );
  const productTrend = useMemo(() => {
    const lines = calendarYearSeries(productRows, productPerYear, (r) =>
      notePart(r.notes ?? "", "category"),
    );
    return productRanks.slice(0, TREND_LINES).map((r) => ({
      id: r.id,
      label: r.label,
      points: lines.get(r.id) ?? [],
    }));
  }, [productRows, productPerYear, productRanks]);

  const npelPts = useMemo(
    () => quarterlyPoints(obs(pack.businessInvestment)),
    [pack.businessInvestment],
  );

  const assetRanks = useMemo(() => {
    const rows = obs(pack.investmentByAsset);
    const period = latestPeriod(rows);
    const ranked: { id: string; label: string; v: number }[] = [];
    for (const r of rows) {
      if (r.period_start !== period) continue;
      if (!isAssetDetail(r.notes ?? "")) continue;
      if (r.value == null || !Number.isFinite(r.value)) continue;
      const id = notePart(r.notes ?? "", "category") || "—";
      ranked.push({ id, label: displayLabel(r.notes ?? "", id), v: r.value });
    }
    ranked.sort((a, b) => b.v - a.v);
    return ranked.slice(0, 10);
  }, [pack.investmentByAsset]);

  const industryRanks = useMemo(() => {
    const rows = obs(pack.investmentByIndustry);
    const period = latestPeriod(rows);
    const ranked: { id: string; label: string; v: number }[] = [];
    for (const r of rows) {
      if (r.period_start !== period) continue;
      if (!isIndustryDetail(r.notes ?? "")) continue;
      if (r.value == null || !Number.isFinite(r.value)) continue;
      const id = notePart(r.notes ?? "", "category") || "—";
      ranked.push({ id, label: displayLabel(r.notes ?? "", id), v: r.value });
    }
    ranked.sort((a, b) => b.v - a.v);
    return ranked.slice(0, 12);
  }, [pack.investmentByIndustry]);

  const assetTrend = useMemo(() => {
    const rows = obs(pack.investmentByAsset).filter((r) => isAssetDetail(r.notes ?? ""));
    return assetRanks.map((a) => ({
      id: a.id,
      label: a.label,
      points: pointsFrom(rows.filter((r) => notePart(r.notes ?? "", "category") === a.id)),
    }));
  }, [pack.investmentByAsset, assetRanks]);
  const industryTrend = useMemo(() => {
    const rows = obs(pack.investmentByIndustry).filter((r) => isIndustryDetail(r.notes ?? ""));
    return industryRanks.slice(0, TREND_LINES).map((a) => ({
      id: a.id,
      label: a.label,
      points: pointsFrom(rows.filter((r) => notePart(r.notes ?? "", "category") === a.id)),
    }));
  }, [pack.investmentByIndustry, industryRanks]);
  const investmentQuarter = formatPeriod(latestPeriod(obs(pack.investmentByAsset)), "quarterly");

  const fdiInward = useMemo(
    () =>
      filterNotes(
        obs(pack.fdi),
        (n) =>
          dim(n, "direction", "inward") &&
          dim(n, "measure", fdiMeasure) &&
          n.includes("total"),
      ).filter((r) => r.geography_code === "K02000001"),
    [pack.fdi, fdiMeasure],
  );
  const fdiOutward = useMemo(
    () =>
      filterNotes(
        obs(pack.fdi),
        (n) =>
          dim(n, "direction", "outward") &&
          dim(n, "measure", fdiMeasure) &&
          n.includes("total"),
      ).filter((r) => r.geography_code === "K02000001"),
    [pack.fdi, fdiMeasure],
  );

  const fdiPartnerYear = useMemo(() => {
    const rows = filterNotes(obs(pack.fdi), (n) => n.includes("partner="));
    return latestPeriod(rows).slice(0, 4);
  }, [pack.fdi]);
  const fdiPartnerRanks = useMemo(() => {
    // Country detail is published for flows only; positions and earnings stay UK totals.
    if (fdiMeasure !== "flows") return [] as Ranked[];
    const rows = filterNotes(
      obs(pack.fdi),
      (n) =>
        dim(n, "direction", fdiDirection) && dim(n, "measure", "flows") && n.includes("partner="),
    );
    const period = latestPeriod(rows);
    const ranked: Ranked[] = [];
    for (const r of rows) {
      if (r.period_start !== period) continue;
      if (r.value == null || !Number.isFinite(r.value)) continue;
      const id = r.geography_code || r.geography_label;
      ranked.push({ id, label: fdiPartnerLabel(r.geography_code, r.geography_label), v: r.value });
    }
    ranked.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    return ranked;
  }, [pack.fdi, fdiMeasure, fdiDirection]);

  const fdiMapRows = useMemo(() => {
    const out: { id: string; value: number | null; display: string }[] = [];
    for (const r of fdiPartnerRanks) {
      const a3 = fdiPartnerToA3(r.id);
      if (!a3) continue;
      out.push({ id: a3, value: r.v, display: fmtGbpM(r.v) });
    }
    return out;
  }, [fdiPartnerRanks]);

  const fdiUnmappedRanks = useMemo(
    () => fdiPartnerRanks.filter((r) => fdiPartnerToA3(r.id) == null).slice(0, 10),
    [fdiPartnerRanks],
  );

  const enterpriseRanks = useMemo(() => {
    const rows = obs(pack.enterprises).filter(isUkEnterpriseGeo);
    const ranked: { id: string; label: string; v: number }[] = [];
    for (const r of rows) {
      const cat = notePart(r.notes ?? "", "category");
      if (!cat || cat === "total") continue;
      if (r.value == null || !Number.isFinite(r.value)) continue;
      ranked.push({ id: cat, label: displayLabel(r.notes ?? "", cat), v: r.value });
    }
    ranked.sort((a, b) => b.v - a.v);
    return ranked.slice(0, 12);
  }, [pack.enterprises]);

  const demogBirths = useMemo(
    () => filterNotes(obs(pack.demography), (n) => dim(n, "category", "births")),
    [pack.demography],
  );
  const demogDeaths = useMemo(
    () => filterNotes(obs(pack.demography), (n) => dim(n, "category", "deaths")),
    [pack.demography],
  );
  const insolvencyPts = useMemo(
    () => pointsFrom(obs(pack.insolvencies).filter(isInsolvencyHeadline)),
    [pack.insolvencies],
  );

  const figures: ExplorerFigure[] = useMemo(() => {
    const bal = latestValue(tradeTotal);
    const exp = latestValue(tradeExports);
    const imp = latestValue(tradeImports);
    const inv = latestValue(obs(pack.businessInvestment));
    return [
      {
        label: "Trade balance",
        value: bal != null ? fmtGbpM(bal) : "—",
        note: basis === "cp" ? "Latest month · current prices" : "Latest month · adjusted for inflation",
      },
      {
        label: "Exports",
        value: exp != null ? fmtGbpM(exp) : "—",
        note: "Latest month · goods and services",
      },
      {
        label: "Imports",
        value: imp != null ? fmtGbpM(imp) : "—",
        note: "Latest month · goods and services",
      },
      {
        label: "Business investment",
        value: inv != null ? fmtGbpM(inv) : "—",
        note: "Latest quarter · adjusted for inflation",
      },
    ];
  }, [tradeTotal, tradeExports, tradeImports, pack.businessInvestment, basis]);

  const yearOptions: PrintOption<string>[] = worldYearOptions.map((y) => {
    // Partner totals are calendar-year sums; the year still being published is year to date.
    const cover = worldLens === "country" ? pack.partnersAnnual?.coverage?.[y] : undefined;
    return { value: y, label: cover ? yearLabel(y, cover.months) : y };
  });

  const dataTables = useMemo(
    () => [
      {
        id: "uk-trade-mret",
        title: "Trade balance · total · current prices · £ million SA",
        rows: tradeTotal,
        cadence: "monthly" as const,
        fmt: fmtGbpM,
        seriesLabel: () => "Total balance",
      },
      {
        id: "business-investment",
        title: "Business investment · NPEL · £ million CVM SA",
        rows: obs(pack.businessInvestment),
        cadence: "quarterly" as const,
        fmt: fmtGbpM,
        seriesLabel: () => "Business investment",
      },
      {
        id: "uk-fdi",
        title: "FDI · UK totals · £ million",
        rows: [...fdiInward, ...fdiOutward]
          .sort((a, b) => a.period_start.localeCompare(b.period_start))
          .slice(-48),
        cadence: "annual" as const,
        fmt: fmtGbpM,
        seriesLabel: (r: Observation) =>
          `${notePart(r.notes ?? "", "direction") || "—"} · ${notePart(r.notes ?? "", "measure") || "—"}`,
      },
      {
        id: "company-insolvencies",
        title: "Company insolvencies · England and Wales · seasonally adjusted",
        rows: obs(pack.insolvencies).filter(isInsolvencyHeadline).slice(-48),
        cadence: "monthly" as const,
        fmt: fmtCount,
        seriesLabel: () => "Company insolvencies",
      },
      {
        id: "business-demography",
        title: "Business demography · births and deaths",
        rows: [...demogBirths, ...demogDeaths].sort((a, b) =>
          a.period_start.localeCompare(b.period_start),
        ),
        cadence: "annual" as const,
        fmt: fmtCount,
        seriesLabel: (r: Observation) => displayLabel(r.notes ?? "", "Series"),
      },
    ],
    [
      tradeTotal,
      pack.businessInvestment,
      fdiInward,
      fdiOutward,
      pack.insolvencies,
      demogBirths,
      demogDeaths,
    ],
  );
  const dataSeriesOptions: PrintOption<string>[] = dataTables.map((d) => ({
    value: d.id,
    label: d.title,
  }));
  const activeData =
    dataTables.find((d) => d.id === dataSeries) ?? dataTables[0] ?? null;

  const sourceLine =
    view === "trade"
      ? ECONOMY_SOURCE.tradeMret
      : view === "world"
        ? worldLens === "region"
          ? ECONOMY_SOURCE.goodsByRegion
          : worldLens === "services"
            ? ECONOMY_SOURCE.servicesPartners
            : pack.partnerCommodity
              ? ECONOMY_SOURCE.goodsPartnersWithOts
              : ECONOMY_SOURCE.goodsPartners
        : view === "products"
          ? productKind === "goods"
            ? ECONOMY_SOURCE.goodsCommodity
            : ECONOMY_SOURCE.servicesTrade
          : view === "capital"
            ? ECONOMY_SOURCE.businessInvestment
            : view === "fdi"
              ? ECONOMY_SOURCE.fdi
              : view === "landscape"
                ? ECONOMY_SOURCE.ukBusiness
                : view === "births"
                  ? `${ECONOMY_SOURCE.businessDemography} · ${ECONOMY_SOURCE.insolvencies}`
                  : ECONOMY_SOURCE.tradeMret;
  const source = economySource(sourceLine, "United Kingdom", economyPeriod("monthly"));

  const method = [
    "ONS Balance of Payments (MRET) is not the same basis as HMRC customs or all-countries partner packs — compare with care.",
    "Goods and services composition stay on separate charts; they are never mixed.",
    "Annual product and partner totals add up the months or quarters of each calendar year. A year still being published is shown as year to date, and composition lines stop at the last complete year.",
    "Business investment is in chained volume terms, so the asset and industry lines are not additive and do not sum to the total.",
    "Foreign direct investment flows can be negative when investors withdraw more than they put in.",
    "Goods trade by UK nation comes from HMRC, which assigns each company's trade to nations by where its staff work. It is not where goods were shipped from, and it does not match the balance of payments totals.",
    "FDI measures ownership links, not new plant or jobs.",
    "UK business counts are VAT/PAYE registered enterprises — not every Companies House filing.",
    "Company insolvencies are a different register from ONS business demography deaths.",
    "Precious metals can swing the headline goods balance; the ex-precious-metals companion sits beside the ledger.",
    pack.partnersAnnual?.honesty,
    pack.partnerCommodity?.honesty,
  ].filter(Boolean) as string[];

  let body: ReactNode = null;

  if (view === "trade") {
    body = (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Britain&apos;s trade ledger · balance ·{" "}
            {basis === "cp" ? "current prices" : "chained volume"} · £m SA
          </h3>
          {pointsFrom(tradeTotal).length < 2 ? (
            <EmptyStage label="Trade series loading">
              Monthly MRET balances are not yet available in this pack.
            </EmptyStage>
          ) : (
            <TimeChart
              label="Trade balance total, goods and services"
              cadence="monthly"
              format={fmtGbpM}
              series={[
                { id: "total", label: "Total balance", points: pointsFrom(tradeTotal) },
                { id: "goods", label: "Goods", points: pointsFrom(tradeGoods) },
                { id: "services", label: "Services", points: pointsFrom(tradeServices) },
              ]}
              showTable={false}
            />
          )}
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Exports and imports · total · {basis === "cp" ? "CP" : "CVM"} · £m SA
          </h3>
          <TimeChart
            label="Exports and imports"
            cadence="monthly"
            format={fmtGbpM}
            series={[
              { id: "exports", label: "Exports", points: pointsFrom(tradeExports) },
              { id: "imports", label: "Imports", points: pointsFrom(tradeImports) },
            ]}
            showTable={false}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Goods balance excluding precious metals · CP · £m SA
          </h3>
          {pointsFrom(exPmBalance).length < 2 ? (
            <EmptyStage label="Ex-precious-metals companion">
              Underlying goods balance series not yet in pack.
            </EmptyStage>
          ) : (
            <TimeChart
              label="Goods balance excluding precious metals"
              cadence="monthly"
              format={fmtGbpM}
              series={[
                {
                  id: "expm",
                  label: "Ex precious metals",
                  points: pointsFrom(exPmBalance),
                },
              ]}
              showTable={false}
            />
          )}
        </section>
      </div>
    );
  } else if (view === "world") {
    body = (
      <div className={s.stack}>
        {worldLens === "country" ? (
          <>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Trading partners · {activeFlow} · {activeWorldYear} · £m
              </h3>
              {mapRows.length === 0 ? (
                <EmptyStage label="No mappable partners">
                  Partner codes in this period could not be placed on the world map.
                  Rank bars still list totals below.
                </EmptyStage>
              ) : (
                <WorldChoropleth
                  key={`world-${activeFlow}-${activeWorldYear}`}
                  label={`Goods partners · ${activeFlow} · ${activeWorldYear}`}
                  data={mapRows}
                  selected={selectedIso}
                  onSelect={(id) => setSelectedIso((prev) => (prev === id ? null : id))}
                  legendFormat={fmtGbpM}
                  legendUnit="£m"
                  size="stage"
                />
              )}
            </section>
            {selectedPartner ? (
              <section className={s.panel} aria-label={`Partner dossier · ${selectedPartner.label}`}>
                <h3 className={t.stageTitle}>
                  {selectedPartner.label} · goods trade · {activeWorldYear}
                </h3>
                <ReadoutCard
                  placement="inline"
                  head={selectedPartner.label}
                  rows={[
                    {
                      label: "Goods exports · £m",
                      value:
                        selectedPartner.exports != null
                          ? fmtGbpM(selectedPartner.exports)
                          : "—",
                    },
                    {
                      label: "Goods imports · £m",
                      value:
                        selectedPartner.imports != null
                          ? fmtGbpM(selectedPartner.imports)
                          : "—",
                    },
                    {
                      label: "Goods balance · £m",
                      value:
                        selectedPartner.balance != null
                          ? fmtGbpM(selectedPartner.balance)
                          : "—",
                    },
                    {
                      label: "Period",
                      value: selectedPartner.period
                        ? formatPeriod(selectedPartner.period, "monthly")
                        : activeWorldYear || "—",
                    },
                  ]}
                />
                <p className={t.tableNote}>
                  Partner totals are ONS Balance of Payments (all-countries, seasonally
                  adjusted). Product mix below is HMRC Overseas Trade Statistics
                  (customs) by SITC section — a different basis; do not add the two.
                </p>
                {!pack.partnerCommodity ? (
                  <EmptyStage label="Product mix unavailable">
                    Partner × SITC section pack is not loaded. Totals above still stand.
                  </EmptyStage>
                ) : partnerProductFrames.length === 0 ? (
                  <EmptyStage label={`No ${activeFlow} product mix`}>
                    No HMRC OTS SITC sections published for {selectedPartner.label} ·{" "}
                    {activeFlow} · {activeWorldYear}.
                  </EmptyStage>
                ) : (
                  <ul
                    className={s.specimens}
                    aria-label={`${selectedPartner.label} · ${activeFlow} · SITC sections`}
                  >
                    {partnerProductFrames.map((row, i) => {
                      const max = partnerProductFrames[0]?.v || 1;
                      const bar = row.v > 0 ? (row.v / max) * 100 : 0;
                      return (
                        <li key={row.id}>
                          <div
                            className={s.specimen}
                            data-selected={i === 0 ? "true" : undefined}
                          >
                            {/* Empty plate frame — fill later via observatory-imprint. */}
                            <span
                              className={s.specimenPlate}
                              aria-hidden="true"
                              data-plate-frame={row.id}
                            />
                            <span className={`bo-label ${s.specimenName}`}>{row.label}</span>
                            <span className={`bo-fig ${s.specimenShare}`}>
                              {fmtGbpM(row.v)}
                            </span>
                            <span className={s.specimenBar} aria-hidden="true">
                              <i style={{ width: `${bar}%` }} />
                            </span>
                            <span className={s.specimenCount}>
                              {selectedPartner.label} · {activeFlow} · SITC section
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : null}
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Partner ranks · {activeFlow} · {activeWorldYear || "—"}
              </h3>
              {worldPartnerRows.length === 0 ? (
                <EmptyStage label="No partner ranks">
                  No country totals for this flow and period.
                </EmptyStage>
              ) : (
                <RankBars
                  label={`Partner ranks · ${activeFlow}`}
                  format={fmtGbpM}
                  rows={worldPartnerRows.slice(0, 20).map((r) => ({
                    id: r.code,
                    label: r.label,
                    v: r.value,
                    active: selectedIso === iso2ToA3(r.code),
                  }))}
                  onSelect={(id) => {
                    const a3 = iso2ToA3(id);
                    setSelectedIso((prev) => (prev === a3 ? null : a3));
                  }}
                />
              )}
            </section>
            <TradeBlocTrend pack={pack} trade="goods" flow={activeFlow} />
          </>
        ) : worldLens === "services" ? (
          <>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Services partners · {activeFlow} · {activeWorldYear} · £m
              </h3>
              <p className={t.tableNote}>
                Services trade by partner is a separate ONS series from goods. It is not
                drawn on the goods map and is not added to goods totals.
              </p>
              {servicesMapRows.length === 0 ? (
                <EmptyStage label="No mappable services partners">
                  ISO country codes for this period could not be placed on the world map.
                  Rank bars still list published partners below, including aggregates.
                </EmptyStage>
              ) : (
                <WorldChoropleth
                  key={`services-${activeFlow}-${activeWorldYear}`}
                  label={`Services partners · ${activeFlow} · ${activeWorldYear}`}
                  data={servicesMapRows}
                  selected={selectedIso}
                  onSelect={(id) => setSelectedIso((prev) => (prev === id ? null : id))}
                  legendFormat={fmtGbpM}
                  legendUnit="£m"
                  size="stage"
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Services partner ranks · {activeFlow} · {activeWorldYear || "—"}
              </h3>
              {servicesPartnerRows.length === 0 ? (
                <EmptyStage label="No services partner ranks">
                  No services partner totals for this flow and period.
                </EmptyStage>
              ) : (
                <RankBars
                  label={`Services partners · ${activeFlow}`}
                  format={fmtGbpM}
                  rows={servicesPartnerRows.slice(0, 20).map((r) => ({
                    id: r.code,
                    label: r.label,
                    v: r.value,
                    active: selectedIso === iso2ToA3(r.code),
                  }))}
                  onSelect={(id) => {
                    const a3 = iso2ToA3(id);
                    if (!a3) return;
                    setSelectedIso((prev) => (prev === a3 ? null : a3));
                  }}
                />
              )}
            </section>
            <TradeBlocTrend pack={pack} trade="services" flow={activeFlow} />
          </>
        ) : (
          <>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Goods {activeFlow} by UK nation · {activeWorldYear} · £m
              </h3>
              <p className={t.tableNote}>
                HMRC regional trade attributes each company&apos;s trade to nations by where
                its staff work — not where goods were shipped from. Totals do not match
                Balance of Payments.
              </p>
              {nationMapRows.length === 0 ? (
                <EmptyStage label="No UK nation values">
                  No UK-nation goods rows for this period.
                </EmptyStage>
              ) : (
                <RegionMap
                  key={`nation-${activeFlow}-${activeWorldYear}`}
                  shapes={UK_NATION_SHAPES}
                  label={`UK nations · goods ${activeFlow} · ${activeWorldYear}`}
                  data={nationMapRows}
                  selected={selectedNation}
                  onSelect={(code) =>
                    setSelectedNation((prev) => (prev === code ? null : code))
                  }
                  legendFormat={fmtGbpM}
                  legendUnit="£m"
                  size="stage"
                  emptyCaption="Select a nation"
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Nation ranks · {activeFlow} · {activeWorldYear || "—"}
              </h3>
              {regionRanks.length === 0 ? (
                <EmptyStage label="No regional ranks">
                  No UK-nation goods rows for this period.
                </EmptyStage>
              ) : (
                <RankBars
                  label="UK nation goods"
                  format={fmtGbpM}
                  rows={regionRanks.map((r) => ({
                    ...r,
                    active: selectedNation === r.id,
                  }))}
                  onSelect={(id) =>
                    setSelectedNation((prev) => (prev === id ? null : id))
                  }
                />
              )}
            </section>
          </>
        )}
      </div>
    );
  } else if (view === "products") {
    const kindWord = productKind === "goods" ? "goods" : "services";
    const yearText = productYear || "latest year";
    body = (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            What Britain {productFlow === "exports" ? "sells" : "buys"} · {kindWord}{" "}
            {productFlow} · {yearText} · £m
          </h3>
          {productRanks.length === 0 ? (
            <EmptyStage label="Composition empty">
              No complete calendar year published for this selection.
            </EmptyStage>
          ) : (
            <RankBars
              label={`${kindWord} ${productFlow} · ${yearText}`}
              format={fmtGbpM}
              rows={productRanks}
            />
          )}
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Largest {kindWord} {productFlow} over time · calendar years · £m
          </h3>
          {productTrend.every((l) => l.points.length < 2) ? (
            <EmptyStage label="No history">Fewer than two complete years published.</EmptyStage>
          ) : (
            <TimeChart
              label={`Largest ${kindWord} ${productFlow} over time`}
              cadence="annual"
              format={fmtGbpM}
              marks
              series={productTrend}
              showTable={false}
            />
          )}
        </section>
      </div>
    );
  } else if (view === "capital") {
    body = (
      <div className={s.stack}>
        {capitalSplit === "total" ? (
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              Business investment · quarterly · £m, adjusted for inflation
            </h3>
            {npelPts.length < 2 ? (
              <EmptyStage label="NPEL loading">
                Business investment series not yet available.
              </EmptyStage>
            ) : (
              <TimeChart
                label="Business investment NPEL"
                cadence="quarterly"
                format={fmtGbpM}
                series={[{ id: "npel", label: "Business investment", points: npelPts }]}
                showTable={false}
              />
            )}
          </section>
        ) : capitalSplit === "asset" ? (
          <>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Business investment by asset · quarterly · £m, adjusted for inflation
              </h3>
              {assetTrend.every((l) => l.points.length < 2) ? (
                <EmptyStage label="Asset split empty">No asset breakdown rows in pack.</EmptyStage>
              ) : (
                <TimeChart
                  label="Business investment by asset"
                  cadence="quarterly"
                  format={fmtGbpM}
                  series={assetTrend}
                  showTable={false}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>By asset · {investmentQuarter} · £m</h3>
              {assetRanks.length === 0 ? (
                <EmptyStage label="Asset split empty">No asset breakdown rows in pack.</EmptyStage>
              ) : (
                <RankBars label="Investment by asset" format={fmtGbpM} rows={assetRanks} />
              )}
            </section>
          </>
        ) : (
          <>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Five largest investing industries · quarterly · £m, adjusted for inflation
              </h3>
              {industryTrend.every((l) => l.points.length < 2) ? (
                <EmptyStage label="Industry split empty">
                  No industry breakdown rows in pack.
                </EmptyStage>
              ) : (
                <TimeChart
                  label="Business investment by industry"
                  cadence="quarterly"
                  format={fmtGbpM}
                  series={industryTrend}
                  showTable={false}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>By industry · {investmentQuarter} · £m</h3>
              {industryRanks.length === 0 ? (
                <EmptyStage label="Industry split empty">
                  No industry breakdown rows in pack.
                </EmptyStage>
              ) : (
                <RankBars
                  label="Investment by industry"
                  format={fmtGbpM}
                  rows={industryRanks}
                />
              )}
            </section>
          </>
        )}
      </div>
    );
  } else if (view === "fdi") {
    body = (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Foreign direct investment · {fdiMeasure} · into and from the UK · £m
          </h3>
          {annualPoints(fdiInward).length < 1 && annualPoints(fdiOutward).length < 1 ? (
            <EmptyStage label="FDI empty">No FDI observations for this measure.</EmptyStage>
          ) : (
            <TimeChart
              label={`FDI ${fdiMeasure}`}
              cadence="annual"
              format={fmtGbpM}
              series={[
                { id: "inward", label: "Inward", points: annualPoints(fdiInward) },
                { id: "outward", label: "Outward", points: annualPoints(fdiOutward) },
              ]}
              showTable={false}
            />
          )}
        </section>
        {fdiMeasure === "flows" ? (
          <>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Investment flows{" "}
                {fdiDirection === "inward"
                  ? "into the UK by investor country"
                  : "from the UK by destination"}{" "}
                · {fdiPartnerYear} · £m
              </h3>
              {fdiMapRows.length === 0 ? (
                <EmptyStage label="No mappable FDI partners">
                  Partner codes for this year could not be placed on the world map.
                  Rank bars still list published partners below.
                </EmptyStage>
              ) : (
                <WorldChoropleth
                  key={`fdi-${fdiDirection}-${fdiPartnerYear}`}
                  label={`FDI flows · ${fdiDirection} · ${fdiPartnerYear}`}
                  data={fdiMapRows}
                  selected={selectedFdiIso}
                  onSelect={(id) => setSelectedFdiIso((prev) => (prev === id ? null : id))}
                  legendFormat={fmtGbpM}
                  legendUnit="£m"
                  size="stage"
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Partner ranks · {fdiDirection} flows · {fdiPartnerYear || "—"}
              </h3>
              {fdiPartnerRanks.length === 0 ? (
                <EmptyStage label="No partner ranks">
                  No partner flow rows for the latest year.
                </EmptyStage>
              ) : (
                <RankBars
                  label={
                    fdiDirection === "inward" ? "Investor countries" : "Destination countries"
                  }
                  format={fmtGbpM}
                  rows={fdiPartnerRanks.slice(0, 20).map((r) => ({
                    ...r,
                    active: selectedFdiIso === fdiPartnerToA3(r.id),
                  }))}
                  onSelect={(id) => {
                    const a3 = fdiPartnerToA3(id);
                    if (!a3) return;
                    setSelectedFdiIso((prev) => (prev === a3 ? null : a3));
                  }}
                />
              )}
            </section>
            {fdiUnmappedRanks.length > 0 ? (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  Partners without a country fill · {fdiPartnerYear}
                </h3>
                <p className={t.tableNote}>
                  Aggregates and territories absent from the world outline stay here —
                  never painted onto another country.
                </p>
                <RankBars
                  label="Unmapped FDI partners"
                  format={fmtGbpM}
                  rows={fdiUnmappedRanks}
                />
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    );
  } else if (view === "landscape") {
    body = (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            British business landscape · registered enterprises
          </h3>
          {enterpriseRanks.length === 0 ? (
            <EmptyStage label="Enterprise ranks empty">No UK business rows in pack.</EmptyStage>
          ) : (
            <RankBars
              label="Enterprises by industry"
              format={fmtCount}
              rows={enterpriseRanks}
            />
          )}
        </section>
      </div>
    );
  } else if (view === "births") {
    body = (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>Business births and deaths · demography</h3>
          <TimeChart
            label="Business births and deaths"
            cadence="annual"
            format={fmtCount}
            series={[
              { id: "births", label: "Births", points: annualPoints(demogBirths) },
              { id: "deaths", label: "Deaths", points: annualPoints(demogDeaths) },
            ]}
            showTable={false}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Company insolvencies · England and Wales · seasonally adjusted · context
            (not demography deaths)
          </h3>
          {insolvencyPts.length < 2 ? (
            <EmptyStage label="Insolvencies empty">No insolvency series in pack.</EmptyStage>
          ) : (
            <TimeChart
              label="Company insolvencies England and Wales"
              cadence="monthly"
              format={fmtCount}
              series={[
                {
                  id: "insolv",
                  label: "Company insolvencies",
                  points: insolvencyPts,
                },
              ]}
              showTable={false}
            />
          )}
        </section>
      </div>
    );
  } else {
    body = activeData ? (
      <div className={t.tableGroup}>
        <p className={t.stageTitle}>{activeData.title}</p>
        {activeData.rows.length === 0 ? (
          <EmptyStage label="No rows">No observations for this table.</EmptyStage>
        ) : (
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Series</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {activeData.rows.slice(-48).map((r, i) => (
                  <tr key={`${r.period_start}-${r.geography_code}-${i}`}>
                    <td>{formatPeriod(r.period_start, activeData.cadence)}</td>
                    <td>{activeData.seriesLabel(r)}</td>
                    <td className="bo-fig">
                      {r.value != null ? activeData.fmt(r.value) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ) : (
      <EmptyStage label="No data tables">No Ready series tables for this domain.</EmptyStage>
    );
  }

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      <FigureStrip figures={figures} />
      <ControlRow label="Trade controls">
        {view === "trade" ? (
          <MenuControl
            label="Price basis"
            value={basis}
            options={BASIS_OPTIONS}
            onChange={(id) => sync({ basis: id })}
          />
        ) : null}
        {view === "world" ? (
          <>
            <MenuControl
              label="Lens"
              value={worldLens}
              options={WORLD_LENS}
              onChange={(id) => sync({ lens: id })}
            />
            <MenuControl
              label="Flow"
              value={worldFlow}
              options={FLOW_OPTIONS}
              onChange={(id) => sync({ flow: id })}
            />
            {yearOptions.length ? (
              <MenuControl
                label="Period"
                value={activeWorldYear}
                options={yearOptions}
                onChange={(id) => sync({ year: id })}
              />
            ) : null}
          </>
        ) : null}
        {view === "products" ? (
          <>
            <MenuControl
              label="Trade"
              value={productKind}
              options={PRODUCT_OPTIONS}
              onChange={(id) => sync({ kind: id })}
            />
            <MenuControl
              label="Flow"
              value={productFlow}
              options={FLOW_OPTIONS}
              onChange={(id) => sync({ pflow: id })}
            />
          </>
        ) : null}
        {view === "capital" ? (
          <MenuControl
            label="Split"
            value={capitalSplit}
            options={CAPITAL_OPTIONS}
            onChange={(id) => sync({ split: id })}
          />
        ) : null}
        {view === "fdi" ? (
          <>
            <MenuControl
              label="Measure"
              value={fdiMeasure}
              options={FDI_OPTIONS}
              onChange={(id) => sync({ measure: id })}
            />
            {fdiMeasure === "flows" ? (
              <MenuControl
                label="Direction"
                value={fdiDirection}
                options={DIRECTION_OPTIONS}
                onChange={(id) => sync({ dir: id })}
              />
            ) : null}
          </>
        ) : null}
        {view === "data" && dataSeriesOptions.length ? (
          <MenuControl
            label="Series"
            value={activeData?.id ?? ""}
            options={dataSeriesOptions}
            onChange={(id) => sync({ series: id })}
          />
        ) : null}
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          <EconomyStageFollow
            domain="investment"
            view={view}
            label={`Trade · ${viewLabel(view)}`}
          />
        }
        foot={<FigureRecord source={source} method={method} />}
      >
        {body}
      </Stage>
    </>
  );
}

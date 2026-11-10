"use client";

/**
 * Energy Domain 03 — Energy Prices & Costs.
 * Flagship: The Dissected Bill (Study C engraved receipt) — electricity layers from QEP 2.2.4
 * + official total from 2.2.1; gas layers from 2.3.4 + total from 2.3.1.
 * Supporting: How far prices rose · Geography · Wholesale.
 * Real-terms uses Economy CPIH. Ofgem cap is a separate GB benchmark pin — never mixed as a DESNZ bill.
 */

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEnergyNavigation } from "./navigation";
import { ChangeRows, RankBars, TimeChart } from "../instrument/TimeChart";
import {
  ControlRow,
  EmptyStage,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  ResetButton,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
} from "../template";
import { EnergyStageFollow } from "../connections";
import { fmtT } from "../data";
import { ENERGY_SOURCE } from "./citations";
import { energySource } from "./source";
import { viewReset } from "./reset";
import { BillReceipt, type BillLine, type Print } from "./BillReceipt";
import { USAGE_OPTIONS, annualPay, capShares, fmtKwh, fmtPence, payShareSeries, ratesFor, regionsForYear } from "./bill-model";
import {
  BILL_FUELS,
  BILL_FUEL_LABEL,
  BILL_KWH,
  CPIH_INDEX_ID,
  DEFAULT_BILL_REGION,
  DOMESTIC_BILLS_ID,
  DOMESTIC_ECONOMY7_ID,
  DOMESTIC_GAS_BILLS_ID,
  DOMESTIC_UNIT_STANDING_ID,
  DOMESTIC_GAS_UNIT_STANDING_ID,
  INDUSTRIAL_BANDS,
  INDUSTRIAL_PRICES_ID,
  MPP_FUEL_PRICES_ID,
  MPP_MEASURES,
  MPP_MEASURE_LABEL,
  NOMINAL_EARNINGS_ID,
  OFGEM_CAP_REGIONAL_ID,
  OFGEM_MEASURES,
  OFGEM_MEASURE_LABEL,
  PAYMENTS,
  REGION_SOURCES,
  TARIFFS,
  cpihAnnualAverage,
  costShockSeries,
  domesticBillRows,
  domesticBillSeries,
  fmtGbpBill,
  fmtPct1,
  fmtPenceKwh,
  industrialPriceSeries,
  industrialYearAverage,
  latestCpihYear,
  mppFuelSeries,
  ofgemRegionalPeriods,
  ofgemRegionalRanks,
  realBillSeries,
  regionalBillRanks,
  regionalBillYears,
  yearsOf,
  type BillFuel,
  type IndustrialBand,
  type MppMeasure,
  type OfgemMeasure,
  type PaymentId,
  type PricesPack,
  type RegionSource,
  type TariffId,
} from "./prices-model";
import s from "./generation.module.css";

import { PRICES_VIEWS } from "./views";

const VIEWS: ExplorerView[] = [...PRICES_VIEWS];

/** Old tab id — still accepted in URLs, maps to How far prices rose. */
const LEGACY_VIEW: Record<string, string> = { economies: "shock" };

function asView(raw: string | null): string {
  if (!raw) return "bill";
  const mapped = LEGACY_VIEW[raw] ?? raw;
  return VIEWS.some((v) => v.id === mapped) ? mapped : "bill";
}

const CAP_PRINTS: Record<string, Print> = {
  wholesale: "cross",
  network: "hatch",
  policy: "sparse",
  operating: "engrave",
  margin: "stipple",
  vat: "open",
};

function clampYear(n: number, years: number[], fallback: number): number {
  if (!Number.isFinite(n) || years.length === 0) return fallback;
  if (years.includes(n)) return n;
  return years.reduce((best, y) => (Math.abs(y - n) < Math.abs(best - n) ? y : best), years[0]!);
}

function asPayment(v: string | null): PaymentId {
  return PAYMENTS.includes(v as PaymentId) ? (v as PaymentId) : "Overall";
}

function asTariff(v: string | null): TariffId {
  return TARIFFS.includes(v as TariffId) ? (v as TariffId) : "All";
}

function asBand(v: string | null): IndustrialBand {
  return INDUSTRIAL_BANDS.includes(v as IndustrialBand) ? (v as IndustrialBand) : "Average";
}

function asBillFuel(v: string | null): BillFuel {
  return BILL_FUELS.includes(v as BillFuel) ? (v as BillFuel) : "electricity";
}

function asCapMeasure(v: string | null): OfgemMeasure {
  return OFGEM_MEASURES.includes(v as OfgemMeasure) ? (v as OfgemMeasure) : "elec_single";
}

function asRegionSource(v: string | null): RegionSource {
  return REGION_SOURCES.includes(v as RegionSource) ? (v as RegionSource) : "desnz";
}

function asMppMeasure(v: string | null): MppMeasure {
  return MPP_MEASURES.includes(v as MppMeasure) ? (v as MppMeasure) : "gas_mpp_p_kwh";
}

type ReceiptLine = {
  key: string;
  label: string;
  detail: string;
  about: string;
  value: number | null;
  href: string;
};

export function PricesCanvas({ pack }: { pack: PricesPack }) {
  const searchParams = useSearchParams();
  const { sync: writeUrl } = useEnergyNavigation("prices");
  const electricityRows = pack.domestic?.observations ?? [];
  const gasRows = pack.gas?.observations ?? [];
  const economy7Rows = pack.economy7?.observations ?? [];
  const elecLayerRows = pack.layers?.observations ?? [];
  const gasLayerRows = pack.gasLayers?.observations ?? [];
  const industrialRows = pack.industrial?.observations ?? [];
  const ofgemRegionalRows = pack.ofgemRegional?.observations ?? [];
  const wholesaleRows = pack.wholesale?.observations ?? [];
  const cpihRows = pack.cpih?.observations ?? [];
  const earningsRows = pack.earnings?.observations ?? [];
  const electricityYears = yearsOf(electricityRows);
  const gasYears = yearsOf(gasRows);
  const economy7Years = yearsOf(economy7Rows);
  const industrialYears = yearsOf(industrialRows);

  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [requestedBillFuel, setBillFuel] = useState<BillFuel>(() => asBillFuel(searchParams.get("bill_fuel")));
  // Regional rebuild needs unit + standing layers, which Economy 7 does not have. A deep link
  // (view=regions&bill_fuel=economy7) must read as electricity, not rank standard rates under an
  // Economy 7 label at 4,800 kWh. The tab handler does the same on navigation; this covers URLs.
  const billFuel: BillFuel =
    view === "regions" && requestedBillFuel === "economy7" ? "electricity" : requestedBillFuel;
  const [capMeasure, setCapMeasure] = useState<OfgemMeasure>(() =>
    asCapMeasure(searchParams.get("cap_measure")),
  );
  const [regionSource, setRegionSource] = useState<RegionSource>(() =>
    asRegionSource(searchParams.get("region_source")),
  );
  const [mppMeasure, setMppMeasure] = useState<MppMeasure>(() =>
    asMppMeasure(searchParams.get("mpp_measure")),
  );
  const billRows =
    billFuel === "gas" ? gasRows : billFuel === "economy7" ? economy7Rows : electricityRows;
  const billYears = yearsOf(billRows);
  const latest =
    billYears.at(-1) ??
    electricityYears.at(-1) ??
    gasYears.at(-1) ??
    economy7Years.at(-1) ??
    industrialYears.at(-1) ??
    2025;
  const assumedKwh = BILL_KWH[billFuel];
  const billRecordId =
    billFuel === "gas"
      ? DOMESTIC_GAS_BILLS_ID
      : billFuel === "economy7"
        ? DOMESTIC_ECONOMY7_ID
        : DOMESTIC_BILLS_ID;
  const billFuelLabel = BILL_FUEL_LABEL[billFuel];
  const layerRows =
    billFuel === "gas" ? gasLayerRows : billFuel === "electricity" ? elecLayerRows : [];

  const [year, setYear] = useState(() =>
    clampYear(Number(searchParams.get("year") || latest), billYears.length ? billYears : [latest], latest),
  );
  const [payment, setPayment] = useState<PaymentId>(() => asPayment(searchParams.get("payment")));
  const [tariff, setTariff] = useState<TariffId>(() => asTariff(searchParams.get("tariff")));
  const [band, setBand] = useState<IndustrialBand>(() => asBand(searchParams.get("band")));
  const [region, setRegion] = useState(() => searchParams.get("region") || "");
  const [vs, setVs] = useState(() => Number(searchParams.get("vs")) || 0);
  const [kwh, setKwh] = useState(() => Number(searchParams.get("kwh")) || 0);
  const [capPeriod, setCapPeriod] = useState(() => searchParams.get("cap_period") || "");
  /** Local region search on Geography — selection still syncs via `region`. */

  const sync = useCallback(
    (
      patch: Partial<{
        view: string;
        year: number;
        payment: PaymentId;
        tariff: TariffId;
        band: IndustrialBand;
        billFuel: BillFuel;
        capMeasure: OfgemMeasure;
        region: string;
        regionSource: RegionSource;
        mppMeasure: MppMeasure;
        vs: number;
        kwh: number;
        capPeriod: string;
      }>,
    ) => {
      const next = {
        view,
        year,
        payment,
        tariff,
        band,
        billFuel,
        capMeasure,
        region,
        regionSource,
        mppMeasure,
        vs,
        kwh,
        capPeriod,
        ...patch,
      };
      setView(asView(next.view));
      setYear(next.year);
      setPayment(next.payment);
      setTariff(next.tariff);
      setBand(next.band);
      setBillFuel(next.billFuel);
      setCapMeasure(next.capMeasure);
      setRegion(next.region);
      setRegionSource(next.regionSource);
      setMppMeasure(next.mppMeasure);
      setVs(next.vs);
      setKwh(next.kwh);
      setCapPeriod(next.capPeriod);
      writeUrl({
        view: next.view,
        year: next.year,
        payment: next.payment,
        tariff: next.tariff,
        band: next.band,
        bill_fuel: next.billFuel,
        cap_measure: next.capMeasure,
        region_source: next.regionSource,
        mpp_measure: next.mppMeasure,
        region: next.region || null,
        vs: next.vs || null,
        kwh: next.kwh || null,
        cap_period: next.capPeriod || null,
      });
    },
    [
      view,
      year,
      payment,
      tariff,
      band,
      billFuel,
      capMeasure,
      region,
      regionSource,
      mppMeasure,
      vs,
      kwh,
      capPeriod,
      writeUrl,
    ],
  );

  const activeBillYears = yearsOf(billRows);
  // Afford needs a full calendar year of ONS weekly pay (12 months). Never fall back to
  // bill-only years — that leaves the year menu on 2025 with an empty chart.
  const affordYears = activeBillYears.filter((yy) => annualPay(earningsRows, yy) != null);
  const affordReady = affordYears.length > 0;
  const menuYears =
    view === "afford"
      ? affordYears
      : activeBillYears.length
        ? activeBillYears
        : [latest];
  const y = menuYears.length
    ? clampYear(year, menuYears, menuYears.at(-1) ?? latest)
    : latest;
  const activeRows = billRows;
  const cashSeries = domesticBillSeries(activeRows, payment, tariff);
  const realPack = realBillSeries(cashSeries, cpihRows);
  const billSeries = cashSeries;
  const billCut = domesticBillRows(activeRows, payment, tariff);
  const yearRow = billCut.find((r) => r.period_start.startsWith(String(y)));
  const yearBillCash = yearRow?.value ?? null;
  const yearBillReal =
    yearBillCash != null
      ? realPack.points.find((p) => Math.round(p.t) === y)?.v ?? null
      : null;
  const cpihBase = latestCpihYear(cpihRows);

  const layersReady = layerRows.length > 0;
  const layersRecordId =
    billFuel === "gas" ? DOMESTIC_GAS_UNIT_STANDING_ID : DOMESTIC_UNIT_STANDING_ID;

  // ——— The Dissected Bill: published rates × the reader's use ———
  const usageOptions = USAGE_OPTIONS[billFuel];
  const billKwh = usageOptions.includes(kwh) ? kwh : assumedKwh;
  const billRegions = layerRows.length ? regionsForYear(layerRows, y, payment) : [];
  const billRegion = billRegions.includes(region) ? region : DEFAULT_BILL_REGION;
  const rateYears = layerRows.length ? yearsOf(layerRows) : [];
  const vsYear = vs && vs !== y && rateYears.includes(vs) ? vs : null;
  const rates = ratesFor(layerRows, y, payment, billKwh, billRegion);
  const ratesVs = vsYear != null ? ratesFor(layerRows, vsYear, payment, billKwh, billRegion) : null;
  const capSplit = capShares(pack.capComponents ?? null, y, billFuel, payment);
  const ratesHref = `/data?record=${layersRecordId}`;
  const receiptLines = (L: typeof rates): ReceiptLine[] =>
    !layerRows.length
      ? []
      : [
          {
            key: "energy",
            label: "Energy used",
            detail:
              L.unitPrice != null
                ? `${fmtPence(L.unitPrice * 100)} a kWh × ${fmtKwh(billKwh)}`
                : "Not published for this region and year",
            about:
              "The average unit price for this region and way of paying, times the energy you chose to use in a year. It is a DESNZ average across suppliers — not any one tariff.",
            value: L.unitPrice != null ? L.unitPrice * billKwh : null,
            href: ratesHref,
          },
          {
            key: "standing",
            label: "Standing charge",
            detail:
              L.fixedCost != null
                ? `About ${fmtPence((L.fixedCost / 365) * 100)} a day`
                : "Not published for this region and year",
            about:
              "The fixed charge for a year of supply in this region and way of paying. It does not change with how much energy you use.",
            value: L.fixedCost,
            href: ratesHref,
          },
        ];
  const billTotal = rates.reconstructed;
  const cpihAtY = cpihAnnualAverage(cpihRows, y);
  const realTotal =
    billTotal != null && cpihBase && cpihAtY ? billTotal * (cpihBase.value / cpihAtY) : null;
  const realTypical = yearBillReal;
  const realLine: ReceiptLine | null =
    cpihBase && (realTotal != null || realTypical != null)
      ? {
          key: "real",
          label: `In ${cpihBase.year} prices`,
          detail: `${realTotal != null ? "Bill for the year" : "Published typical bill"}, adjusted for inflation`,
          about: `The same pounds restated in ${cpihBase.year} prices using the ONS CPIH index. Calculated from DESNZ and ONS figures — not a DESNZ published bill.`,
          value: realTotal ?? realTypical,
          href: `/data?record=${CPIH_INDEX_ID}`,
        }
      : null;
  /** The reader's bill split by Ofgem's cost groups: standing charge by the cap's fixed shares,
   *  energy used by its per-kWh shares. Sums exactly to the bill. Our calculation. */
  const dissected =
    capSplit && rates.unitPrice != null && rates.fixedCost != null && billTotal != null
      ? capSplit.groups
          .map((g) => ({
            id: g.id,
            label: g.label,
            value: g.fixedShare * rates.fixedCost! + g.perKwhShare * rates.unitPrice! * billKwh,
          }))
          .filter((g) => Math.abs(g.value) >= 0.5)
      : null;
  const largestPart = dissected ? [...dissected].sort((a, b) => b.value - a.value)[0] ?? null : null;
  const historyRules = [
    { id: "year", t: y, label: String(y), active: true },
    ...(vsYear != null ? [{ id: "vs", t: vsYear, label: String(vsYear), active: true }] : []),
  ];

  const industrialQuarterly = industrialPriceSeries(industrialRows, band);
  // The chart legend prints the series' last point, so name that quarter in the label: the strip
  // above shows the selected year's mean of quarters, a different (and differently sized) number.
  const industrialLatest = industrialQuarterly.points.at(-1);
  const industrialSeries = {
    ...industrialQuarterly,
    label: industrialLatest
      ? `${industrialQuarterly.label} · latest ${fmtT(industrialLatest.t, "quarterly")}`
      : industrialQuarterly.label,
  };
  const industrialAvg = industrialYearAverage(industrialRows, band, y);

  const electricityReady = Boolean(pack.domestic?.observations.length);
  const gasReady = Boolean(pack.gas?.observations.length);
  const economy7Ready = Boolean(pack.economy7?.observations.length);
  const billReady =
    billFuel === "gas" ? gasReady : billFuel === "economy7" ? economy7Ready : electricityReady;
  const industrialReady = Boolean(pack.industrial?.observations.length);
  const ofgemRegionalReady = Boolean(pack.ofgemRegional?.observations.length);
  const wholesaleReady = Boolean(pack.wholesale?.observations.length);
  const layersForRegions = billFuel === "gas" ? gasLayerRows : elecLayerRows;
  const regionYearList = regionalBillYears(layersForRegions, payment);
  const regionY = clampYear(y, regionYearList.length ? regionYearList : [y], y);
  const regionRanks = regionalBillRanks(layersForRegions, regionY, payment, assumedKwh);
  const ofgemPeriods = ofgemRegionalPeriods(ofgemRegionalRows);
  const ofgemPeriod = ofgemPeriods.includes(capPeriod) ? capPeriod : (ofgemPeriods.at(-1) ?? "");
  const ofgemPeriodLabel = ofgemPeriod
    ? new Date(`${ofgemPeriod}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    : "—";
  const ofgemRanks = ofgemPeriod
    ? ofgemRegionalRanks(ofgemRegionalRows, ofgemPeriod, capMeasure)
    : { rows: [], reference: null };

  const shock = costShockSeries(electricityRows, gasRows, industrialRows, payment, tariff, band);
  const wholesaleSeries = mppFuelSeries(wholesaleRows, mppMeasure);
  const annualEarnings = annualPay(earningsRows, y);
  const burden = yearBillCash != null && annualEarnings != null ? (Number(yearBillCash) / annualEarnings) * 100 : null;
  // Share-of-pay lines follow Fuel · Meter: Economy 7 is an electricity meter cut, not a third fuel.
  const affordSeries = (
    billFuel === "economy7"
      ? [
          { id: "economy7", label: "Economy 7", rows: economy7Rows },
          { id: "electricity", label: "Standard electricity", rows: electricityRows },
        ]
      : billFuel === "gas"
        ? [
            { id: "gas", label: "Gas", rows: gasRows },
            { id: "electricity", label: "Electricity", rows: electricityRows },
          ]
        : [
            { id: "electricity", label: "Electricity", rows: electricityRows },
            { id: "gas", label: "Gas", rows: gasRows },
          ]
  ).map((f) => ({
    id: f.id,
    label: f.label,
    points: payShareSeries(domesticBillSeries(f.rows, payment, tariff).points, earningsRows),
  }));
  const affordByPayment = PAYMENTS.flatMap((pm) => {
    const v = domesticBillRows(billRows, pm, tariff).find((r) => r.period_start.startsWith(String(y)))?.value;
    return v != null && annualEarnings != null
      ? [{ id: pm, label: pm, v: (Number(v) / annualEarnings) * 100, active: pm === payment }]
      : [];
  });

  const elecBillCut = domesticBillRows(electricityRows, payment, tariff);
  const elecYearBill = elecBillCut.find((r) => r.period_start.startsWith(String(y)))?.value ?? null;

  const figures: ExplorerFigure[] =
    view === "afford"
        ? [
            {
              label: `${y} bill`,
              value: yearBillCash != null ? fmtGbpBill(yearBillCash) : "—",
              note: `${billFuelLabel} · cash · DESNZ`,
            },
            {
              label: `${y} average pay`,
              value: annualEarnings != null ? fmtGbpBill(annualEarnings) : "—",
              note: "Average weekly pay × 52 · before tax",
            },
            {
              label: "Share of pay",
              value: burden != null ? fmtPct1(burden) : "—",
              note: `Typical ${billFuelLabel.toLowerCase()} bill as a share of average pay`,
            },
          ]
        : view === "wholesale"
          ? [
              {
                label: wholesaleSeries.points.at(-1) ? `Latest · ${fmtT(wholesaleSeries.points.at(-1)!.t, "quarterly")}` : "Latest",
                value:
                  wholesaleSeries.points.at(-1) != null
                    ? fmtPenceKwh(wholesaleSeries.points.at(-1)!.v)
                    : "—",
                note: MPP_MEASURE_LABEL[mppMeasure],
              },
              {
                label: "Span",
                value: wholesaleSeries.points.length
                  ? `${Math.round(wholesaleSeries.points[0]!.t)}–${Math.round(wholesaleSeries.points.at(-1)!.t)}`
                  : "—",
                note: "Quarterly · cash",
              },
              (() => {
                const last = wholesaleSeries.points.at(-1);
                const prev = last ? wholesaleSeries.points.find((p) => Math.abs(p.t - (last.t - 1)) < 0.01) : undefined;
                const pct = last && prev && prev.v ? ((last.v - prev.v) / prev.v) * 100 : null;
                return {
                  label: "A year earlier",
                  value: prev ? fmtPenceKwh(prev.v) : "—",
                  note: pct != null ? `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(0)}% since then` : "Not published",
                };
              })(),
            ]
      : view === "shock"
        ? [
            {
              label: "Index base",
              value: shock.baseYear != null ? String(shock.baseYear) : "—",
              note: "Each line starts at 1× in this year · cash prices",
            },
            {
              label: `${y} electricity bill`,
              value: elecYearBill != null ? fmtGbpBill(elecYearBill) : "—",
              note: "United Kingdom · cash",
            },
            {
              label: `${y} industry mean`,
              value: industrialAvg != null ? fmtPenceKwh(industrialAvg) : "—",
              note: "Average of the year’s quarters · Great Britain · cash",
            },
          ]
        : view === "regions"
          ? regionSource === "ofgem"
            ? [
                {
                  label: "Period",
                  value: ofgemPeriod
                    ? new Date(`${ofgemPeriod}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
                    : "—",
                  note: OFGEM_MEASURE_LABEL[capMeasure],
                },
                {
                  label: "Highest region",
                  value: ofgemRanks.rows[0] != null ? fmtGbpBill(ofgemRanks.rows[0].v) : "—",
                  note: ofgemRanks.rows[0]?.label ?? "—",
                },
                {
                  label: "Lowest region",
                  value:
                    ofgemRanks.rows.at(-1) != null
                      ? fmtGbpBill(ofgemRanks.rows.at(-1)!.v)
                      : "—",
                  note: ofgemRanks.rows.at(-1)?.label ?? "—",
                },
              ]
            : [
              {
                label: `${regionY} United Kingdom`,
                value: regionRanks.reference != null ? fmtGbpBill(regionRanks.reference.v) : "—",
                note: `${payment} · ${assumedKwh.toLocaleString("en-GB")} kWh · cash`,
              },
              {
                label: "Highest region",
                value: regionRanks.rows[0] != null ? fmtGbpBill(regionRanks.rows[0].v) : "—",
                note: regionRanks.rows[0]?.label ?? "—",
              },
              {
                label: "Lowest region",
                value:
                  regionRanks.rows.at(-1) != null
                    ? fmtGbpBill(regionRanks.rows.at(-1)!.v)
                    : "—",
                note: regionRanks.rows.at(-1)?.label ?? "—",
              },
            ]
          : [
              {
                label: `Bill · ${y}`,
                value:
                  billTotal != null
                    ? fmtGbpBill(billTotal)
                    : yearBillCash != null
                      ? fmtGbpBill(Number(yearBillCash))
                      : "—",
                note: billTotal != null ? `${fmtKwh(billKwh)} · ${billRegion}` : `Published typical bill · ${fmtKwh(assumedKwh)}`,
              },
              {
                label: "Largest part",
                value: largestPart && billTotal ? fmtGbpBill(largestPart.value) : "—",
                note: largestPart && billTotal ? `${largestPart.label} · ${Math.round((largestPart.value / billTotal) * 100)}% of the bill` : "No cost split for this choice",
              },
              {
                label: realLine ? realLine.label : "In today's prices",
                value: realLine?.value != null ? fmtGbpBill(realLine.value) : "—",
                note: "Bill for the year, adjusted for inflation",
              },
            ];

  const yearOptions = (
    view === "regions" && regionYearList.length ? regionYearList : menuYears
  ).map((yy) => ({
    value: String(yy),
    label: String(yy),
  }));

  const footSource =
    view === "shock"
        ? ENERGY_SOURCE.pricesShock
        : view === "afford"
          ? ENERGY_SOURCE.pricesAfford
          : view === "wholesale"
            ? ENERGY_SOURCE.pricesWholesale
            : view === "regions"
              ? regionSource === "ofgem"
                ? ENERGY_SOURCE.pricesOfgemRegional
                : ENERGY_SOURCE.pricesRegions
              : billFuel === "economy7"
                ? ENERGY_SOURCE.pricesEconomy7
                : layersReady
                  ? billFuel === "gas"
                    ? ENERGY_SOURCE.pricesBillLayersGas
                    : ENERGY_SOURCE.pricesBillLayersElectricity
                  : billFuel === "gas"
                    ? ENERGY_SOURCE.pricesDomesticGas
                    : ENERGY_SOURCE.pricesDomesticElectricity;

  const footDefinition =
    view === "shock"
      ? [
          "How far prices rose: domestic electricity and gas bills with industrial electricity as multiples of a shared base year (1× = that year), all in cash (nominal) terms — not adjusted for inflation. Legend figures like 1.95× mean nearly twice the base-year level — not pounds, pence or a payment method.",
          "Cash household bills live on The dissected bill. The second chart here is industry in cash p/kWh (GB manufacturing), one point per quarter: its legend shows the latest quarter, while the figure above it is the selected year’s mean of quarters. Never plotted on the same axis as household £/year.",
        ]
      : view === "regions"
        ? [
            "Geography: ranked bills by published region from the chosen source — DESNZ unit and standing rebuilt into a typical bill, or Ofgem’s price-cap regions.",
            "DESNZ and Ofgem use different regional cuts. Neither is a postcode tariff.",
          ]
        : view === "afford"
          ? [
              billFuel === "economy7"
                ? "Economy 7’s published typical bill (DESNZ, UK, 4,800 kWh) as a share of average pay, beside the standard single-rate electricity bill for comparison."
                : "Each fuel’s published typical bill (DESNZ, UK, at its fixed typical use) divided by a year of average pay: the mean of ONS average weekly earnings for the year’s twelve months, times 52.",
              "Average pay is regular pay per employee before tax, excluding bonuses. It is not household income, and many households have more than one earner or none.",
            ]
          : view === "wholesale"
            ? [
                "Prices paid by major power producers for the fuels they burn to make electricity — not household bills and not the Ofgem price cap.",
                "Each fuel has its own published unit. Lines are not summed into one fuel cost.",
              ]
            : billFuel === "economy7"
              ? [
                  "Economy 7 is an electricity meter with a cheaper night rate and a dearer day rate — not a different fuel. DESNZ publishes a typical annual bill for it at a fixed use; unit and standing charges for a dissected receipt are not in this cut.",
                ]
              : [
                  "An illustrative bill: the standing charge plus the unit rate times the energy you choose to use in a year. Both prices are DESNZ averages across suppliers for the chosen region and way of paying, so the bill is a guide, not any supplier's tariff.",
                  "The published typical bill is DESNZ's own UK figure at a fixed use, shown for reference.",
                  "Hover or focus a line on the receipt to read what it is; with nothing selected the side panel shows the bill for the year.",
                ];

  const footMethod =
    view === "shock"
      ? [
          "Each indexed series is divided by its value in the first shared calendar year (shown as 1×). Industrial index points use the mean of published quarters in each year; the cash industry chart shows the full quarterly series.",
          "Domestic geography is UK; industry is GB manufacturing, Climate Change Levy excluded. Bill payment and tariff cuts change which domestic bill is indexed — they are not the legend numbers.",
          "Not an Ofgem price-cap history and not a wholesale gas or power benchmark.",
        ]
      : view === "regions"
        ? [
            regionSource === "ofgem"
              ? "Ofgem figures are Annex 9 default-tariff caps by charge-restriction region, including VAT. Great Britain only — not Northern Ireland."
              : "DESNZ rebuild = fixed cost + unit rate × typical kWh for the selected payment and year. The United Kingdom dashed reference uses the same method for the UK cut.",
            "Ranked bars cover every published area in the chosen source. Scotland, Wales and Northern Ireland appear when the publisher includes them.",
          ]
        : view === "afford"
          ? [
              "Both figures are in cash pounds of the same year, so the share needs no inflation adjustment.",
              "Average pay is for Great Britain; bills are for the United Kingdom. Years without twelve published months of pay are left out.",
              "Calculated from DESNZ and ONS figures — not an official affordability or fuel-poverty measure.",
            ]
          : view === "wholesale"
            ? [
                "DESNZ Quarterly Energy Prices table for fuels purchased by major power producers. Periods and units follow the published table.",
                "Not a household bill, not the Ofgem price cap, and not a spot wholesale market price.",
              ]
            : [
                "Your bill is the DESNZ average unit rate for your region and way of paying, times the energy you chose, plus the standing charge. It is an average across suppliers, not any one tariff.",
                "What pays for it is our calculation, not a published split. Ofgem's price cap sets out what each cost group adds to the standing charge and to each kWh, for Great Britain. We split your standing charge and your energy cost in those shares, averaged over the cap periods in the year, so the parts add up to your bill. Northern Ireland has no Ofgem cap, so its bills are split with the Great Britain shares.",
                `Real cost on the receipt restates cash pounds in ${cpihBase?.year ?? "latest"} prices using the ONS CPIH index (annual average). Calculated from DESNZ and ONS figures — not a DESNZ published bill.`,
                "Typical use has changed: DESNZ's typical bills now assume 3,400 kWh of electricity and 11,200 kWh of gas a year (earlier releases used 3,600 kWh for electricity and are not mixed in here). Ofgem's price cap uses its own, lower typical use, so the two are not the same figure.",
                "Region names changed: electricity prices are published for city areas to 2012 and for regions from 2013; gas switches in 2018. Each year offers only the regions published for it, and a comparison shows a gap where a region is not published in both years.",
                "Bills include the Energy Price Guarantee from October 2022. They do not deduct the Energy Bills Support Scheme, which gave UK customers £200 of support in 2022.",
                ...(billFuel === "economy7"
                  ? [
                      "Economy 7 sits under Meter on electricity: cheaper for about seven hours at night, dearer by day. The figure here is DESNZ’s published typical bill only — there is no unit-and-standing breakdown in this explorer yet.",
                    ]
                  : []),
              ];

  const dataHref =
    view === "shock"
      ? `/data?record=${DOMESTIC_BILLS_ID}`
      : view === "wholesale"
        ? `/data?record=${MPP_FUEL_PRICES_ID}`
        : view === "afford"
          ? `/data?record=${NOMINAL_EARNINGS_ID}`
          : view === "regions"
            ? regionSource === "ofgem"
              ? `/data?record=${OFGEM_CAP_REGIONAL_ID}`
              : `/data?record=${layersRecordId}`
            : layersReady
              ? `/data?record=${layersRecordId}`
              : `/data?record=${billRecordId}`;

  const resetState = { year: y, payment, tariff, band, billFuel, capMeasure, capPeriod, region, regionSource, mppMeasure, vs, kwh };
  const resetDefaults: typeof resetState = { year: yearOptions.length ? Number(yearOptions.at(-1)!.value) : latest, payment: "Overall", tariff: "All", band: "Average", billFuel: "electricity", capMeasure: "elec_single", capPeriod: "", region: "", regionSource: "desnz", mppMeasure: "gas_mpp_p_kwh", vs: 0, kwh: 0 };
  const resetKeys: (keyof typeof resetState)[] = view === "wholesale" ? ["mppMeasure"]
    : view === "regions" ? ["year", "billFuel", "payment", "region", "regionSource", "capMeasure", "capPeriod"]
      : view === "afford" ? ["year", "billFuel", "payment", "tariff"]
        : view === "shock" ? ["year", "payment", "tariff", "band"]
          : ["year", "billFuel", "payment", "region", "vs", "kwh"];
  const resetPatch = viewReset(resetState, resetDefaults, resetKeys);

  const stageTitle =
    view === "shock"
        ? `Indexed prices · domestic and industry · cash · ${shock.baseYear ?? "base"} = 1×`
        : view === "afford"
          ? affordReady
            ? `What can you afford? · ${billFuelLabel} · share of average pay · ${y}`
            : `What can you afford? · ${billFuelLabel} · share of average pay`
          : view === "wholesale"
            ? wholesaleReady
              ? `Wholesale fuels · ${MPP_MEASURE_LABEL[mppMeasure]} · generator input prices`
              : "Wholesale fuels · generator input prices"
            : view === "regions"
              ? regionSource === "ofgem"
                ? `Geography · Ofgem cap · ${OFGEM_MEASURE_LABEL[capMeasure]} · ${ofgemPeriodLabel}`
                : `Geography · DESNZ · ${billFuelLabel} · ${payment} · ${regionY}`
              : `The dissected bill · ${billFuelLabel} · ${billRegion} · ${y}`;

  const stageMeta =
    view === "shock"
        ? "Indexed domestic + industry · cash industry below · not one cash axis"
        : view === "afford"
          ? "UK bills · GB average pay before tax · cash"
          : view === "wholesale"
            ? "DESNZ Quarterly Energy Prices · p/kWh · not day-ahead power · not household bills"
            : view === "regions"
              ? regionSource === "ofgem"
                ? "Ranked list · Ofgem GB charge-restriction regions"
                : `Ranked list · DESNZ @ ${assumedKwh.toLocaleString("en-GB")} kWh`
              : layerRows.length
                ? `${payment} · ${fmtKwh(billKwh)} a year · published averages · not a supplier tariff`
                : `Published typical bill · UK · ${fmtKwh(assumedKwh)} a year`;

  return (
    <>
      <ExplorerHead
        views={VIEWS}
        view={view}
        onView={(id) => {
          // Regional rebuild needs unit/standing layers — Economy 7 has none.
          // Tariff is only a control on Shock and Afford; reset it elsewhere so Bill stays Overall.
          const patch: { view: string; billFuel?: BillFuel; tariff?: TariffId } = { view: id };
          if (id === "regions" && billFuel === "economy7") patch.billFuel = "electricity";
          if (id !== "shock" && id !== "afford" && tariff !== "All") patch.tariff = "All";
          sync(patch);
        }}
      />
      {(view === "bill" ||
        view === "shock" ||
        view === "regions" ||
        (view === "afford" && affordReady) ||
        (view === "wholesale" && wholesaleReady)) && <FigureStrip figures={figures} />}

      <ControlRow>
          {(view === "bill" || (view === "regions" && regionSource === "desnz") || view === "afford") &&
            (electricityReady || gasReady) && (
              <MenuControl
                label="Fuel"
                value={billFuel === "gas" ? "gas" : "electricity"}
                options={[
                  { value: "electricity", label: "Electricity" },
                  { value: "gas", label: "Gas" },
                ]}
                onChange={(v) => {
                  const next = v as "electricity" | "gas";
                  const years = yearsOf(next === "gas" ? gasRows : electricityRows);
                  sync({
                    billFuel: next,
                    year: clampYear(year, years.length ? years : [latest], latest),
                    region: "",
                  });
                }}
              />
            )}
          {(view === "bill" || view === "afford") &&
            billFuel !== "gas" &&
            (electricityReady || economy7Ready) && (
              <MenuControl
                label="Meter"
                value={billFuel === "economy7" ? "economy7" : "electricity"}
                options={[
                  ...(electricityReady
                    ? [{ value: "electricity", label: "Standard · one rate" }]
                    : []),
                  ...(economy7Ready
                    ? [{ value: "economy7", label: "Economy 7 · night and day rates" }]
                    : []),
                ]}
                onChange={(v) => {
                  const next = v as BillFuel;
                  const years = yearsOf(next === "economy7" ? economy7Rows : electricityRows);
                  sync({
                    billFuel: next,
                    year: clampYear(year, years.length ? years : [latest], latest),
                    region: "",
                  });
                }}
              />
            )}
          {view === "regions" && (
            <MenuControl
              label="Region source"
              value={regionSource}
              options={[
                { value: "desnz", label: "DESNZ rates" },
                { value: "ofgem", label: "Ofgem cap" },
              ]}
              onChange={(v) => sync({ regionSource: v as RegionSource })}
            />
          )}
          {view === "regions" && regionSource === "ofgem" && (
            <MenuControl
              label="Price cap"
              value={capMeasure}
              options={OFGEM_MEASURES.map((m) => ({ value: m, label: OFGEM_MEASURE_LABEL[m] }))}
              onChange={(v) => sync({ capMeasure: v as OfgemMeasure })}
            />
          )}
          {view === "wholesale" && wholesaleReady && (
            <MenuControl
              label="Fuel"
              value={mppMeasure}
              options={MPP_MEASURES.map((m) => ({
                value: m,
                label: MPP_MEASURE_LABEL[m],
              }))}
              onChange={(v) => sync({ mppMeasure: v as MppMeasure })}
            />
          )}
          {view === "regions" && regionSource === "ofgem" && ofgemPeriods.length > 0 && (
            <MenuControl
              label="Period"
              value={ofgemPeriod}
              options={[...ofgemPeriods].reverse().map((p) => ({
                value: p,
                label: new Date(`${p}T00:00:00Z`).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }),
              }))}
              onChange={(v) => sync({ capPeriod: v })}
            />
          )}
          {(view === "bill" ||
            view === "shock" ||
            (view === "regions" && regionSource === "desnz") ||
            (view === "afford" && affordReady)) &&
            (billReady || view === "shock") && (
              <MenuControl
                label="Year"
                value={String(view === "regions" && regionSource === "desnz" ? regionY : y)}
                options={yearOptions}
                onChange={(v) => sync({ year: Number(v) })}
              />
            )}
          {view === "bill" && billRegions.length > 0 && (
            <MenuControl
              label="Region"
              value={billRegion}
              options={billRegions.map((r) => ({ value: r, label: r }))}
              onChange={(v) => sync({ region: v === DEFAULT_BILL_REGION ? "" : v })}
            />
          )}
          {view === "bill" && layerRows.length > 0 && (
            <MenuControl
              label="Use a year"
              value={String(billKwh)}
              options={usageOptions.map((k) => ({
                value: String(k),
                label: `${fmtKwh(k)}${k === assumedKwh ? " · typical" : ""}`,
              }))}
              onChange={(v) => sync({ kwh: Number(v) === assumedKwh ? 0 : Number(v) })}
            />
          )}
          {(view === "bill" ||
            view === "shock" ||
            (view === "regions" && regionSource === "desnz") ||
            (view === "afford" && affordReady)) &&
            billReady && (
              <MenuControl
                label={view === "shock" ? "Bill payment" : "Payment"}
                value={payment}
                options={PAYMENTS.map((p) => ({ value: p, label: p }))}
                onChange={(v) => sync({ payment: v as PaymentId })}
              />
            )}
          {(view === "shock" || (view === "afford" && affordReady)) && billReady && (
            <MenuControl
              label={view === "shock" ? "Bill tariff" : "Tariff"}
              value={tariff}
              options={TARIFFS.map((p) => ({ value: p, label: p }))}
              onChange={(v) => sync({ tariff: v as TariffId })}
            />
          )}
          {view === "shock" && industrialReady && (
            <MenuControl
              label="Industrial band"
              value={band}
              options={INDUSTRIAL_BANDS.map((b) => ({
                value: b,
                label: b.replace("Large of which ", ""),
              }))}
              onChange={(v) => sync({ band: v as IndustrialBand })}
            />
          )}
          {view === "bill" && rateYears.length > 0 && (
            <MenuControl
              label="Compare with"
              value={vsYear != null ? String(vsYear) : "none"}
              options={[
                { value: "none", label: "No comparison" },
                ...[...rateYears]
                  .reverse()
                  .filter((yy) => yy !== y)
                  .map((yy) => ({ value: String(yy), label: String(yy) })),
              ]}
              onChange={(v) => sync({ vs: v === "none" ? 0 : Number(v) })}
            />
          )}
          {Object.keys(resetPatch).length > 0 && <ResetButton onClick={() => sync(resetPatch)} />}
        </ControlRow>

      <Stage
        title={stageTitle}
        meta={stageMeta}
        follow={
          <EnergyStageFollow
            domain="prices"
            view={view}
            selection={{ year: y }}
            label={`Prices · ${view}`}
          />
        }
        foot={
          <FigureRecord
            source={energySource("prices", view, footSource)}
            definition={footDefinition}
            method={footMethod}
            dataHref={dataHref}
          />
        }
      >
        {!billReady && view !== "shock" && view !== "wholesale" ? (
          <EmptyStage label="Domestic bills unavailable">
            Household bill figures for this selection are not available right now.
          </EmptyStage>
        ) : view === "shock" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Domestic and industry as multiples of {shock.baseYear ?? "the base year"} · cash
              </h3>
              {!shock.series.length ? (
                <EmptyStage label="No overlapping years for an index">
                  Need domestic electricity, domestic gas and industrial prices in the same calendar years.
                </EmptyStage>
              ) : (
                <TimeChart
                  label={`How far prices rose · cash prices, times ${shock.baseYear ?? "base"} level`}
                  series={shock.series}
                  cadence="annual"
                  kind="line"
                  format={(v) =>
                    shock.baseYear != null
                      ? `${(v / 100).toFixed(2)}× ${shock.baseYear}`
                      : `${(v / 100).toFixed(2)}×`
                  }
                  axisFormat={(v) => `${(v / 100).toFixed(1)}×`}
                  rules={[{ id: "year", t: y, label: String(y), active: true }]}
                />
              )}
            </section>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Industry · electricity purchased · p/kWh · GB · {industrialYears[0] ?? "—"}–
                {industrialYears.at(-1) ?? "—"}
              </h3>
              {!industrialReady || industrialSeries.points.length === 0 ? (
                <EmptyStage label="Industrial prices unavailable">
                  Industrial electricity prices are not available right now.
                </EmptyStage>
              ) : (
                <TimeChart
                  label={`Industrial electricity price · ${band} · cash · before Climate Change Levy`}
                  series={[industrialSeries]}
                  cadence="quarterly"
                  kind="line"
                  format={(v) => fmtPenceKwh(v)}
                />
              )}
            </section>
          </div>
        ) : view === "regions" && regionSource === "ofgem" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Ofgem price cap by region · {OFGEM_MEASURE_LABEL[capMeasure]} · {ofgemPeriodLabel} · £ a year
              </h3>
              {!ofgemRegionalReady || ofgemRanks.rows.length === 0 ? (
                <EmptyStage label="No regional price cap for this period">Choose another year or fuel.</EmptyStage>
              ) : (
                <RankBars
                  key={`ofgem-regions-${capMeasure}-${ofgemPeriod}`}
                  label={`Ofgem price cap by region, ${OFGEM_MEASURE_LABEL[capMeasure]}, ${ofgemPeriodLabel}`}
                  rows={ofgemRanks.rows.map((r) => ({ ...r, active: region ? r.id === region : false }))}
                  format={fmtGbpBill}
                  onSelect={(id) => sync({ region: region === id ? "" : id })}
                />
              )}
            </section>
          </div>
        ) : view === "regions" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Bill by region, from DESNZ rates · {billFuelLabel} · {payment} · {regionY} ·{" "}
                {assumedKwh.toLocaleString("en-GB")} kWh
              </h3>
              {!layersReady || regionRanks.rows.length === 0 ? (
                <EmptyStage label="Regional layers unavailable">
                  Regional bills are not available for this fuel, year and payment method. Choose another year or payment method.
                </EmptyStage>
              ) : (
                <RankBars
                  label={`Regional reconstructed ${billFuel} bill · ${regionY}`}
                  rows={regionRanks.rows.map((r) => ({
                    ...r,
                    active: region ? r.id === region : false,
                  }))}
                  reference={regionRanks.reference ?? undefined}
                  format={fmtGbpBill}
                  onSelect={(id) => sync({ region: region === id ? "" : id })}
                />
              )}
            </section>
          </div>
        ) : view === "wholesale" ? (
          <div className={s.stack}>
            <section className={s.panel}>
              {!wholesaleReady ? (
                <EmptyStage label="Wholesale fuel prices unavailable">
                  Prices paid by major power producers are not available right now.
                </EmptyStage>
              ) : wholesaleSeries.points.length === 0 ? (
                <>
                  <h3 className={t.stageTitle}>
                    {MPP_MEASURE_LABEL[mppMeasure]} · price paid by power stations
                  </h3>
                  <EmptyStage label="No prices for this fuel">
                    Choose another fuel from the control above.
                  </EmptyStage>
                </>
              ) : (
                <>
                  <h3 className={t.stageTitle}>
                    {MPP_MEASURE_LABEL[mppMeasure]} · price paid by power stations · p/kWh
                  </h3>
                  <TimeChart
                    key={`wholesale-${mppMeasure}`}
                    label={`${MPP_MEASURE_LABEL[mppMeasure]}, price paid by power stations`}
                    series={[wholesaleSeries]}
                    cadence="quarterly"
                    kind="line"
                    format={(v) => fmtPenceKwh(v)}
                  />
                </>
              )}
            </section>
          </div>
        ) : view === "afford" ? (
          !affordReady ? (
            <EmptyStage label="Average pay unavailable">
              Share-of-pay needs a full calendar year of ONS average weekly earnings beside the bill
              series. That pay series is not available here yet.
            </EmptyStage>
          ) : (
            <div className={s.stack}>
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  {billFuel === "economy7"
                    ? `Economy 7 and standard electricity as a share of average pay · ${payment} · %`
                    : billFuel === "gas"
                      ? `Gas and electricity as a share of average pay · ${payment} · %`
                      : `Electricity and gas as a share of average pay · ${payment} · %`}
                </h3>
                {affordSeries.every((sr) => sr.points.length === 0) ? (
                  <EmptyStage label="No matching years">
                    Average pay is published for full years from 2000. Choose another year or payment
                    cut.
                  </EmptyStage>
                ) : (
                  <TimeChart
                    key={`afford-${billFuel}-${payment}-${tariff}`}
                    label={
                      billFuel === "economy7"
                        ? "Economy 7 and standard electricity bills as a share of average pay"
                        : "Typical electricity and gas bills as a share of average pay"
                    }
                    series={affordSeries.filter((sr) => sr.points.length > 0)}
                    cadence="annual"
                    kind="line"
                    marks
                    zero
                    format={(v) => `${v.toFixed(1)}%`}
                    rules={[{ id: "year", t: y, label: String(y), active: true }]}
                  />
                )}
              </section>
              {affordByPayment.length > 0 && (
                <section className={s.panel}>
                  <h3 className={t.stageTitle}>
                    By way of paying · {billFuelLabel} · {y} · share of average pay
                  </h3>
                  <RankBars
                    key={`afford-pay-${billFuel}-${y}-${tariff}`}
                    label={`Typical ${billFuelLabel} bill as a share of average pay by payment method, ${y}`}
                    rows={affordByPayment}
                    format={(v) => `${v.toFixed(1)}%`}
                  />
                </section>
              )}
            </div>
          )
        ) : billSeries.points.length === 0 ? (
          <EmptyStage label="No bill points for this payment">
            Fixed and Variable tariff splits are published from 2022. Choose Overall payment, or a year from
            2022 onward.
          </EmptyStage>
        ) : (
          <div className={s.stack}>
            <section className={s.panel}>
              <BillReceipt
                meta={`${payment} · ${fmtKwh(layerRows.length ? billKwh : assumedKwh)} a year`}
                note={
                  billFuel === "economy7"
                    ? {
                        id: "economy7",
                        label: "Cheaper at night, dearer by day · typical bill only",
                        about:
                          "Economy 7 is an electricity meter tariff: about seven cheaper night hours and a higher day rate. It is not a separate fuel. DESNZ publishes a UK typical annual bill at 4,800 kWh — there is no unit-rate or standing-charge breakdown for this cut yet, so the receipt shows that published total only.",
                        href: `/data?record=${DOMESTIC_ECONOMY7_ID}`,
                      }
                    : null
                }
                lines={receiptLines(rates).map(
                  (l, i): BillLine => ({
                    id: l.key,
                    label: l.label,
                    detail: l.detail,
                    about: l.about,
                    value: l.value,
                    href: l.href,
                    print: i === 0 ? "solid" : "stipple",
                  }),
                )}
                total={
                  billTotal ??
                  (billFuel === "economy7" && yearBillCash != null ? Number(yearBillCash) : null)
                }
                totalDetail={
                  billFuel === "economy7"
                    ? `Published typical bill · ${fmtKwh(assumedKwh)} · cash`
                    : `${fmtKwh(billKwh)} · cash`
                }
                memos={[realLine]
                  .filter((l): l is ReceiptLine => l != null)
                  .map((l) => ({ id: l.key, label: l.label, detail: l.detail, value: l.value }))}
                split={
                  dissected && billTotal != null
                    ? {
                        title: "What pays for it",
                        detail: `Split by the cost shares in Ofgem's price cap, ${y} · our calculation`,
                        total: billTotal,
                        lines: dissected.map(
                          (l): BillLine => ({
                            id: `cap-${l.id}`,
                            label: l.label,
                            value: l.value,
                            print: (CAP_PRINTS[l.id] ?? "open") as Print,
                          }),
                        ),
                      }
                    : null
                }
              />
            </section>

            {ratesVs != null && (
              <section className={s.panel}>
                <h3 className={t.stageTitle}>
                  {vsYear} and {y} · {billRegion} · {payment} · {fmtKwh(billKwh)} a year
                </h3>
                {ratesVs.reconstructed != null && billTotal != null && ratesVs.unitPrice != null && rates.unitPrice != null && ratesVs.fixedCost != null && rates.fixedCost != null ? (
                  <ChangeRows
                    key={`vs-${vsYear}-${y}-${billRegion}-${payment}-${billKwh}`}
                    label={`Illustrative bill, ${vsYear} and ${y}`}
                    fromLabel={String(vsYear)}
                    toLabel={String(y)}
                    rows={[
                      {
                        id: "energy",
                        label: "Energy used",
                        from: ratesVs.unitPrice * billKwh,
                        to: rates.unitPrice * billKwh,
                      },
                      {
                        id: "standing",
                        label: "Standing charge",
                        from: ratesVs.fixedCost,
                        to: rates.fixedCost,
                      },
                    ]}
                    reference={{ label: "Bill for the year", from: ratesVs.reconstructed, to: billTotal }}
                    format={fmtGbpBill}
                  />
                ) : (
                  <EmptyStage label={`${billRegion} is not published for ${vsYear}`}>
                    Choose another year to compare, or United Kingdom.
                  </EmptyStage>
                )}
              </section>
            )}

            <section className={s.panel}>
              <h3 className={t.stageTitle}>
                Published typical bill · UK · {fmtKwh(assumedKwh)} · {payment} · £ a year
              </h3>
              <TimeChart
                key={`typical-${billFuel}-${payment}`}
                label={`Published typical ${billFuelLabel} bill`}
                series={[{ ...billSeries, label: "Typical bill" }]}
                cadence="annual"
                kind="line"
                marks
                format={(v) => fmtGbpBill(v)}
                rules={historyRules}
              />
            </section>
          </div>
        )}
      </Stage>
    </>
  );
}

import type { ReactNode } from "react";
import { explorerClasses as t } from "../../template";
import type { RefIconPlateName } from "../../Plate";
import { TimeChart, RankBars, type ChartSeries, type Cadence } from "../../instrument/TimeChart";
import { fmt, fmtFY, fmtT, type Pt } from "../../data";
import type { HousingV1 } from "../load";
import { priceCatalogue } from "./PricesData";
import { INSECURITY_RECORDS } from "./insecurity/InsecurityData";
import { qKey, stockLabel } from "./insecurity/periods";

/**
 * Housing explorer — model. One structure for every research domain:
 * domain catalogue → views → stage spec (series, plot, sources) → figures.
 * Real Exchange series only; derived measures say so.
 */

export type DomainId =
  | "prices"
  | "renting"
  | "affordability"
  | "stock"
  | "supply"
  | "land"
  | "quality"
  | "insecurity"
  | "ownership"
  | "policy";

export type Domain = {
  id: DomainId;
  title: string;
  /** Condensed rail caption (under the plate). */
  short: string;
  question: string;
  photo: RefIconPlateName;
  status: "ready" | "preparation";
};

export const DOMAINS: Domain[] = [
  { id: "prices", title: "House prices and transactions", short: "Prices", question: "What does a home cost?", photo: "prices", status: "ready" },
  { id: "renting", title: "Renting", short: "Renting", question: "What does it cost to rent a home in Britain?", photo: "renting", status: "ready" },
  { id: "affordability", title: "Affordability", short: "Afford", question: "Who can actually afford to live in Britain?", photo: "affordability", status: "ready" },
  {
    id: "stock",
    title: "Housing stock and tenure",
    short: "Stock",
    question: "What homes does Britain actually have, who occupies them, and how has that changed?",
    photo: "stock",
    status: "ready",
  },
  {
    id: "quality",
    title: "Housing quality",
    short: "Quality",
    question:
      "What is the actual condition of Britain's homes, and how does housing quality differ according to location, building characteristics and tenure?",
    photo: "quality",
    status: "ready",
  },
  {
    id: "supply",
    title: "Construction and supply",
    short: "Supply",
    question: "How many homes is Britain building, where are they being built, and why does the number delivered differ from the number planned?",
    photo: "supply",
    status: "ready",
  },
  {
    id: "land",
    title: "Planning and land",
    short: "Land",
    question: "How is Britain's land used, who decides what can be built on it, and how do those decisions shape the country?",
    photo: "land",
    status: "ready",
  },
  {
    id: "ownership",
    title: "Ownership and property economics",
    short: "Own",
    question: "Who owns Britain's property, how is that ownership structured, and how does housing generate, concentrate and transfer wealth?",
    photo: "ownership",
    status: "ready",
  },
  {
    id: "insecurity",
    title: "Housing insecurity",
    short: "Shelter",
    question: "What happens when people cannot secure, maintain or remain in a stable home?",
    photo: "insecurity",
    status: "ready",
  },
  {
    id: "policy",
    title: "Housing policy and history",
    short: "Policy",
    question: "How did Britain build the housing system it has today, and which decisions shaped the way we live?",
    photo: "policy",
    status: "ready",
  },
];

/* ——— Data helpers ——— */

const last = (p: Pt[]) => p[p.length - 1];
export const yearOf = (t: number) => Math.floor(t + 1e-6);
export const clip = (p: Pt[], a: number, b: number) => p.filter((x) => yearOf(x.t) >= a && yearOf(x.t) <= b);

/** Year-on-year % change on a monthly series (exact month match; gaps stay gaps). */
function annualChange(p: Pt[]): Pt[] {
  const by = new Map(p.map((x) => [Math.round(x.t * 12), x.v]));
  return p.flatMap((x) => {
    const prev = by.get(Math.round(x.t * 12) - 12);
    return prev ? [{ t: x.t, v: (x.v / prev - 1) * 100 }] : [];
  });
}

function yearAgo(p: Pt[], cadenceSteps: number): Pt | undefined {
  return p.length > cadenceSteps ? p[p.length - 1 - cadenceSteps] : undefined;
}

/* ——— Per-view stage specification ——— */

export type Figure = { label: string; value: string; note: string };

export type Stage = {
  /** Figure title shown in the stage bar. */
  title: string;
  /** Time series behind the view (unclipped); empty for non-temporal views. */
  series: ChartSeries[];
  cadence: Cadence;
  format: (v: number) => string;
  /** Render the plot for the clipped series. */
  plot: (series: ChartSeries[], cadence: Cadence) => ReactNode;
  sourceIds: string[];
  /** Whether the place / measure controls apply. */
  place?: boolean;
  measure?: boolean;
  /** How it was counted, and what not to infer. One paragraph, or one per table. */
  derived?: string | string[];
  /** How to read the figure: nominal, coverage, what not to infer. Shown beside the plot. */
  reading?: string[];
};

export type View = { id: string; label: string };

export const VIEWS: Partial<Record<DomainId, View[]>> = {
  // Sentence case; the data view is always "Data" and always last. Map sits second in the cost domains.
  prices: [
    { id: "history", label: "History" },
    { id: "map", label: "Map" },
    { id: "types", label: "Property types" },
    { id: "segments", label: "Segments" },
    { id: "transactions", label: "Transactions" },
    { id: "table", label: "Data" },
  ],
  renting: [
    { id: "monthly", label: "Monthly rent" },
    { id: "map", label: "Map" },
    { id: "change", label: "Annual change" },
    { id: "index", label: "Index" },
    { id: "bedrooms", label: "By size" },
    { id: "tenancies", label: "Social rent" },
    { id: "table", label: "Data" },
  ],
  affordability: [
    { id: "experiment", label: "Budget" },
    { id: "map", label: "Map" },
    { id: "ratio", label: "Ratio" },
    { id: "rent", label: "Rent burden" },
    { id: "ages", label: "Ages" },
    { id: "households", label: "Households" },
    { id: "table", label: "Data" },
  ],
  stock: [
    { id: "composition", label: "Composition" },
    { id: "tenure", label: "Tenure over time" },
    { id: "types", label: "Dwelling types" },
    { id: "geography", label: "Geography" },
    { id: "vacancy", label: "Vacancy" },
    { id: "table", label: "Data" },
  ],
  supply: [
    { id: "machine", label: "Supply machine" },
    { id: "pipeline", label: "Pipeline" },
    { id: "geography", label: "Geography" },
    { id: "who-builds", label: "Who builds" },
    { id: "table", label: "Data" },
  ],
  land: [
    { id: "explorer", label: "Land explorer" },
    { id: "sites", label: "Development sites" },
    { id: "decisions", label: "Planning decisions" },
    { id: "history", label: "Historical change" },
    { id: "table", label: "Data" },
  ],
  quality: [
    { id: "inside", label: "Inside the home" },
    { id: "condition", label: "Condition" },
    { id: "energy", label: "Energy" },
    { id: "geography", label: "Geography" },
    { id: "table", label: "Data" },
  ],
  insecurity: [
    { id: "pathways", label: "Pathways" },
    { id: "temporary", label: "Temporary housing" },
    { id: "displacement", label: "Displacement" },
    { id: "need", label: "Housing need" },
    { id: "cost", label: "Cost" },
    { id: "table", label: "Data" },
  ],
  ownership: [
    { id: "ownership", label: "Who owns" },
    { id: "mortgages", label: "Mortgages" },
    { id: "wealth", label: "Wealth" },
    { id: "table", label: "Data" },
  ],
  policy: [
    { id: "time", label: "Timeline" },
    { id: "promise", label: "Promise vs delivery" },
    { id: "archive", label: "Archive" },
    { id: "table", label: "Data" },
  ],
};

/** Selected places for History layers. `"uk"` = United Kingdom aggregate. Max 6. */
export type Controls = {
  places: string[];
  measure: "level" | "change" | "real";
  /** Segments tab family. */
  segment: "new" | "ftb" | "finance";
  /** Quality Data view: the indicator the source line and key figure follow. */
  qualityIndicator?: string;
  /** Supply › Geography financial year (FY start year); the figures follow the stage. */
  supplyGeoYear?: string;
};

/** Five series at most on one chart (visual identity › Charts). */
export const MAX_HISTORY_PLACES = 5;
export const ENGLAND_CODE = "E92000001";

/**
 * One series for a time chart. The id is how TimeChart chooses the ink
 * (Electric, then Ochre, Union, Verdigris, Plum) and keeps that choice.
 * The label is the default id, so two series on one chart are not both "s".
 */
function line(points: Pt[], label: string, id = label): ChartSeries[] {
  return [{ id, label, points }];
}

function placeSeries(code: string, d: HousingV1): { id: string; label: string; points: Pt[] } | null {
  if (code === "uk") return { id: "uk", label: "United Kingdom", points: d.price };
  if (code === ENGLAND_CODE) return { id: ENGLAND_CODE, label: "England", points: d.englandPrice };
  const region = d.regions.find((r) => r.code === code);
  return region ? { id: region.code, label: region.name, points: region.points } : null;
}

/** True when `a` is more than about a month after `b`. */
function isLater(a: Pt | undefined, b: Pt | undefined): boolean {
  return Boolean(a && b && a.t - b.t > 1 / 24);
}

const NOMINAL =
  "Nominal means pounds of that month, with no adjustment for inflation. A higher price than in an earlier year is not, by itself, a higher cost in today’s money.";

const MIX =
  "The UK House Price Index is mix-adjusted, so a series can be compared with itself over time even though different homes sell each month. It is an area average, not the price of one house and not an asking price.";

const REAL =
  "Real prices restate the UK nominal average in the pounds of the latest CPI month. The Exchange uses the ONS CPI all-items index (D7BT), and only months where both series exist. Regions stay nominal because that index is national. This is not a Land Registry real-price series.";

/**
 * Why the new/existing lines stop before the headline average, plus what the gap means.
 * End dates come from the loaded series. HM Land Registry publishes this split later
 * because new-build sales take longer to register.
 * https://www.gov.uk/government/publications/about-the-uk-house-price-index/about-the-uk-house-price-index
 */
export function newExistingReading(d: HousingV1): string[] {
  const avg = last(d.price);
  const neu = last(d.newExisting.find((x) => x.id === "new-build")?.points ?? []);
  const old = last(d.newExisting.find((x) => x.id === "existing")?.points ?? []);
  const mix =
    "The gap between new-build and existing prices compares two different mixes of homes. It is not an estimate of the premium for an otherwise identical house sold new rather than existing.";
  if (!neu && !old) return [mix];
  const sameEnd = neu && old && Math.abs(neu.t - old.t) <= 1 / 24;
  const ends = sameEnd || !neu || !old
    ? `New-build and existing prices end in ${fmtT((neu ?? old)!.t)}.`
    : `New-build prices end in ${fmtT(neu.t)}. Existing prices end in ${fmtT(old.t)}.`;
  const lagged = Boolean((neu && isLater(avg, neu)) || (old && isLater(avg, old)));
  if (!lagged) return [mix, ends];
  return [
    mix,
    `${ends} The headline UK average continues to ${fmtT(avg!.t)}. HM Land Registry publishes that split later than the headline average: new-build sales take longer to register, and the latest months do not yet contain enough of them for a reliable figure.`,
  ];
}

function volumeLagSentence(d: HousingV1): string {
  const sales = last(d.sales);
  const avg = last(d.price);
  if (!isLater(avg, sales)) return "";
  return ` The average-price series continues to ${fmtT(avg!.t)}.`;
}

/** Extra method line under the map. The readout already says nominal or count. */
export function pricesMapReading(d: HousingV1, hpiType: string, change: boolean): string | null {
  if (hpiType === "sales-volume") {
    const lag = volumeLagSentence(d).trim();
    return lag || "This count is the UK House Price Index, not the Price Paid file.";
  }
  if (hpiType === "new-build" || hpiType === "existing") return newExistingReading(d).join(" ");
  if (change) {
    return `Annual change compares the nominal price with the same month a year earlier. It is not a real-terms change. ${MIX}`;
  }
  return MIX;
}

function pricesHistoryReading(d: HousingV1, measure: Controls["measure"]): string[] {
  if (measure === "real") {
    return d.priceReal.length
      ? [REAL, NOMINAL]
      : ["The CPI index is not loaded, so this view is still the nominal series.", NOMINAL];
  }
  if (measure === "change") {
    return [
      "Annual change in the nominal average: this month compared with the same month a year earlier. It is not adjusted for CPI, so a rise can still be a fall in real terms.",
      MIX,
    ];
  }
  return [`${NOMINAL} After inflation, in the measure control, restates the UK average in prices of the latest month (CPI).`, MIX];
}

function segmentReading(d: HousingV1, segment: Controls["segment"]): string[] {
  if (segment === "ftb") {
    const first = d.firstTimeBuyer[0];
    const end = last(d.firstTimeBuyer);
    const span = first && end ? ` ${fmtT(first.t)} to ${fmtT(end.t)}.` : "";
    return [
      `England only.${span}`,
      NOMINAL,
      "This is the mix of homes first-time buyers purchased, not the UK average for the same houses.",
    ];
  }
  if (segment === "finance") {
    const cash = d.cashMortgage.find((x) => x.id === "cash")?.points ?? [];
    const first = cash[0];
    const end = last(cash);
    const span = first && end ? ` ${fmtT(first.t)} to ${fmtT(end.t)}.` : "";
    return [
      `England only.${span}`,
      NOMINAL,
      "Cash and mortgage buyers purchase different homes, so the gap is not the saving from paying cash for an otherwise identical house.",
    ];
  }
  return [NOMINAL, ...newExistingReading(d)];
}

export function stageFor(domain: DomainId, view: string, c: Controls, d: HousingV1): Stage | null {
  const pctAxis = (v: number) => `${v.toFixed(0)}%`;
  switch (domain) {
    case "prices": {
      const levels = c.measure === "level";
      const real = c.measure === "real";
      if (view === "map") {
        return {
          title: `${levels ? "Average house price, nominal" : "Annual change in nominal average price"} · local authorities`,
          series: line(levels ? d.price : annualChange(d.price), "United Kingdom"),
          cadence: "monthly",
          format: levels ? fmt.gbp : fmt.pctSigned,
          plot: () => null,
          sourceIds: ["house-prices-by-region"],
          measure: true,
          derived: levels ? undefined : "Annual change computed by the Exchange from monthly levels",
        };
      }
      if (view === "table") {
        return {
          title: "Price series on this page",
          series: [],
          cadence: "monthly",
          format: fmt.gbp,
          plot: () => null,
          sourceIds: ["uk-average-house-price", "uk-hpi-measures", "house-prices-by-region", "cpi-index"].filter(
            (id) => d.sources[id],
          ),
          derived: [
            "Nominal means pounds of that month, with no adjustment for inflation. The CPI-adjusted row is the UK average restated in the latest CPI month — an Exchange calculation, not a Land Registry series. A gap between two rows is not the premium for an otherwise identical home. The last month differs by row: a series that stops early was not published yet, and the missing months are not zero.",
            d.pricePaid.available
              ? `Recorded-sales search is not in this table. It is HM Land Registry Price Paid for England and Wales${d.pricePaid.year != null ? ` in calendar year ${d.pricePaid.year}` : ""}. ${fmt.count(d.pricePaid.count)} registered sales are loaded. Each result is one sale, not a monthly index value.`
              : "Recorded-sales search is not in this table. Search is not available on this copy. Each result is one sale, not a monthly index value.",
          ],
        };
      }
      if (view === "history") {
        // Real prices are UK-only (CPI national index); place layers stay for level/change.
        if (real) {
          const pts = d.priceReal.length > 0 ? d.priceReal : d.price;
          return {
            title: "Average house price · real terms · United Kingdom",
            series: line(pts, "United Kingdom (real)"),
            cadence: "monthly",
            format: fmt.gbp,
            plot: (sr, cad) => (
              <TimeChart
                series={sr}
                cadence={cad}
                format={fmt.gbp}
                axisFormat={fmt.gbpCompact}
                area
                height={380}
                label="UK average house price in latest CPI pounds"
              />
            ),
            sourceIds: ["uk-average-house-price", "cpi-index"].filter((id) => d.sources[id]),
            measure: true,
            derived:
              d.priceReal.length > 0
                ? "Deflated by the ONS CPI all-items index (D7BT) to the latest CPI month. Exchange calculation"
                : "CPI index not loaded yet — showing nominal prices",
            reading: pricesHistoryReading(d, "real"),
          };
        }
        const layers = c.places
          .map((code) => placeSeries(code, d))
          .filter((x): x is NonNullable<typeof x> => Boolean(x));
        const series: ChartSeries[] = layers.map((layer) => ({
          id: layer.id,
          label: layer.label,
          points: levels ? layer.points : annualChange(layer.points),
        }));
        const byLevel = new Map(layers.map((layer) => [layer.id, new Map(layer.points.map((p) => [p.t, p]))]));
        const byChange = new Map(
          layers.map((layer) => [layer.id, new Map(annualChange(layer.points).map((p) => [p.t, p]))]),
        );
        const bySales = new Map(d.sales.map((p) => [p.t, p]));
        const hasUk = layers.some((layer) => layer.id === "uk");
        const title =
          layers.length <= 1
            ? `${levels ? "Average house price, nominal" : "Annual change in nominal average price"} · ${layers[0]?.label ?? "United Kingdom"}`
            : `${levels ? "Average house price, nominal" : "Annual change in nominal average price"} · ${layers.length} places`;
        const sourceIds = [
          ...(hasUk || layers.length === 0 ? ["uk-average-house-price"] : []),
          ...(layers.some((layer) => layer.id !== "uk") ? ["house-prices-by-region"] : []),
        ];
        return {
          title,
          series,
          cadence: "monthly",
          format: levels ? fmt.gbp : fmt.pctSigned,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              cadence={cad}
              format={levels ? fmt.gbp : fmt.pctSigned}
              axisFormat={levels ? fmt.gbpCompact : pctAxis}
              zero={!levels}
              height={380}
              label={`${levels ? "Nominal average house price" : "Annual change in nominal average house price"} by place`}
              inspect={(t) => {
                const rows: { label: string; value: string }[] = [];
                for (const layer of layers) {
                  if (levels) {
                    const ch = byChange.get(layer.id)?.get(t);
                    if (ch) {
                      rows.push({
                        label: layers.length > 1 ? `${layer.label} · YoY` : "On a year earlier",
                        value: fmt.pctSigned(ch.v),
                      });
                    }
                  } else {
                    const level = byLevel.get(layer.id)?.get(t);
                    if (level) {
                      rows.push({
                        label: layers.length > 1 ? `${layer.label} · price` : "Average price",
                        value: fmt.gbp(level.v),
                      });
                    }
                  }
                }
                if (hasUk) {
                  const sales = bySales.get(t);
                  if (sales) rows.push({ label: "Sales that month", value: fmt.count(sales.v) });
                }
                return rows;
              }}
            />
          ),
          sourceIds,
          place: true,
          measure: true,
          derived: levels ? undefined : "Annual change computed by the Exchange from monthly levels",
          reading: pricesHistoryReading(d, levels ? "level" : "change"),
        };
      }
      if (view === "types") {
        return {
          title: "Average price by property type, nominal · United Kingdom",
          series: d.types,
          cadence: "monthly",
          format: fmt.gbp,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              cadence={cad}
              format={fmt.gbp}
              axisFormat={fmt.gbpCompact}
              height={380}
              label="Nominal average house price by property type, United Kingdom"
            />
          ),
          sourceIds: ["uk-hpi-measures"],
          reading: [
            `${NOMINAL} Each line is a different kind of home, so the gap between them is not a quality-adjusted premium.`,
            "The History tab can restate the UK average in CPI pounds. These type series stay nominal.",
          ],
        };
      }
      if (view === "segments") {
        const family =
          c.segment === "ftb"
            ? { title: "First-time buyer average price, nominal · England", series: line(d.firstTimeBuyer, "First-time buyer", "ftb") }
            : c.segment === "finance"
              ? { title: "Cash vs mortgage average price, nominal · England", series: d.cashMortgage }
              : { title: "New build vs existing homes, nominal · United Kingdom", series: d.newExisting };
        return {
          title: family.title,
          series: family.series,
          cadence: "monthly",
          format: fmt.gbp,
          plot: (sr, cad) => (
            <TimeChart series={sr} cadence={cad} format={fmt.gbp} axisFormat={fmt.gbpCompact} height={380} label={family.title} />
          ),
          sourceIds: ["uk-hpi-measures"],
          reading: segmentReading(d, c.segment),
        };
      }
      if (view === "transactions") {
        return {
          title: "Recorded sales, and the monthly UK count",
          series: line(d.sales, "UK HPI sales volume"),
          cadence: "monthly",
          format: fmt.count,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              kind="bars"
              cadence={cad}
              format={fmt.count}
              axisFormat={fmt.countCompact}
              height={280}
              label="UK House Price Index monthly sales volume, United Kingdom"
            />
          ),
          sourceIds: ["uk-hpi-measures"],
        };
      }
      return null;
    }
    case "renting": {
      const rentSources = [
        d.sources["private-rental-prices"] ? "private-rental-prices" : "",
        d.sources["private-rental-price-index"] ? "private-rental-price-index" : "",
      ].filter(Boolean);
      if (view === "map") {
        const levels = c.measure === "level";
        return {
          title: `${levels ? "Average monthly private rent" : "Annual change in private rents"} · local authorities`,
          series: line(levels ? (d.rentAverage.length ? d.rentAverage : d.rentIndex) : d.rentChange, "United Kingdom"),
          cadence: "monthly",
          format: levels ? (d.rentAverage.length ? fmt.gbp : (v) => v.toFixed(1)) : fmt.pctSigned,
          plot: () => null,
          sourceIds: rentSources.length ? rentSources : ["private-rental-prices"],
          measure: true,
        };
      }
      if (view === "bedrooms")
        return {
          title: "Average monthly rent by bedroom count · United Kingdom",
          series: d.rentBedrooms.filter((x) => x.points.length > 0),
          cadence: "monthly",
          format: fmt.gbp,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              cadence={cad}
              format={fmt.gbp}
              axisFormat={fmt.gbpCompact}
              height={380}
              label="UK average monthly private rent by bedroom count"
            />
          ),
          sourceIds: rentSources.length ? rentSources : ["private-rental-prices"],
        };
      if (view === "index")
        return {
          title: "Private rental price index · United Kingdom",
          series: line(d.rentIndex, "Index"),
          cadence: "monthly",
          format: (v) => v.toFixed(1),
          plot: (sr, cad) => (
            <TimeChart series={sr} cadence={cad} format={(v) => v.toFixed(1)} height={380} label="Private rental price index, UK (Jan 2023 = 100)" />
          ),
          sourceIds: rentSources.length ? rentSources : ["private-rental-price-index"],
        };
      if (view === "change")
        return {
          title: "Annual change in private rents · United Kingdom",
          series: line(d.rentChange, "Annual change"),
          cadence: "monthly",
          format: fmt.pctSigned,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              cadence={cad}
              format={fmt.pctSigned}
              axisFormat={pctAxis}
              zero
              height={380}
              label="Annual change in UK private rents"
            />
          ),
          sourceIds: rentSources.length ? rentSources : ["private-rental-price-index"],
          derived: d.sources["private-rental-prices"]
            ? undefined
            : "Annual change computed by the Exchange from the index",
        };
      // Default: monthly £ rent (Notion primary measure).
      return {
        title: "Average monthly private rent · United Kingdom",
        series: line(d.rentAverage.length ? d.rentAverage : d.rentIndex, d.rentAverage.length ? "Average rent" : "Index (fallback)"),
        cadence: "monthly",
        format: d.rentAverage.length ? fmt.gbp : (v) => v.toFixed(1),
        plot: (sr, cad) =>
          d.rentAverage.length ? (
            <TimeChart
              series={sr}
              cadence={cad}
              format={fmt.gbp}
              axisFormat={fmt.gbpCompact}
              area
              height={380}
              label="UK average monthly private rent"
            />
          ) : (
            <TimeChart series={sr} cadence={cad} format={(v) => v.toFixed(1)} height={380} label="Private rental price index, UK" />
          ),
        sourceIds: rentSources.length ? rentSources : ["private-rental-price-index"],
      };
    }
    case "affordability": {
      if (view === "experiment") {
        return {
          title: "Affordability · your budget beside official years of pay",
          series: line(d.afford, "England"),
          cadence: "annual",
          format: (v) => `${v.toFixed(2)}×`,
          plot: () => null,
          sourceIds: ["house-price-to-earnings-ratio", "uk-average-house-price", "mortgage-rate-2yr-fixed"].filter(
            (id) => d.sources[id],
          ),
          derived:
            "Loan = gross annual earnings × the loan-to-income multiple. Purchase budget = loan ÷ (1 − deposit). Monthly repayment is a fixed-rate annuity. Fees, stamp duty, debts and living costs are not included. England years of pay is the official middle house price divided by typical wages where people work. Your years of pay uses the price benchmark and the earnings you set. Those are not the same measure.",
        };
      }
      if (view === "map") {
        return {
          title: "Median house price to workplace earnings · local authorities",
          series: line(d.afford, "England"),
          cadence: "annual",
          format: (v) => `${v.toFixed(2)}×`,
          plot: () => null,
          sourceIds: ["house-price-to-earnings-ratio"],
        };
      }
      if (view === "ages") {
        return {
          title: "Housing costs by age · England",
          series: [],
          cadence: "annual",
          format: (v) => `${v.toFixed(1)}%`,
          plot: () => null,
          sourceIds: ["ehs-housing-costs-by-age", "ehs-mortgage-by-age"].filter((id) => d.sources[id]),
        };
      }
      if (view === "rent") {
        // Show as % of annual earnings (ratio × 100).
        const burden = d.rentToEarnings.map((p) => ({ t: p.t, v: p.v * 100 }));
        return {
          title: "Private rent as a share of workplace earnings · England",
          series: line(burden, "Annual rent ÷ median earnings"),
          cadence: "annual",
          format: (v) => `${v.toFixed(1)}%`,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              cadence={cad}
              format={(v) => `${v.toFixed(1)}%`}
              axisFormat={(v) => `${v.toFixed(0)}%`}
              zero
              area
              marks
              height={380}
              label="Derived rent-to-earnings ratio, England"
            />
          ),
          sourceIds: ["rent-to-earnings-ratio"].filter((id) => d.sources[id]),
          reading: [
            "This is not an official household burden. It compares England’s average private rent with typical wages where people work.",
            "Annual rent is the September private-rent average times 12. Earnings are the median workplace figure. It is not rent as a share of household disposable income, and it is not the English Housing Survey measure of housing costs.",
          ],
          derived:
            "Derived: England PIPR September average rent × 12 ÷ AFF1 median workplace earnings. Not a published ONS rent-to-income statistic.",
        };
      }
      if (view === "households") {
        const eng = d.purchaseAffordRegions.find((r) => r.id === "E92000001");
        return {
          title: "Who can afford Britain · household income versus house prices",
          series: eng ? line(eng.points, "England median/median") : line(d.afford, "England AFF1 (fallback)"),
          cadence: "annual",
          format: (v) => `${v.toFixed(2)}×`,
          plot: () => null,
          sourceIds: ["housing-purchase-affordability"].filter((id) => d.sources[id]),
          reading: [
            "These years are financial years, April to March. 2023–24 is not the calendar year 2023.",
          ],
        };
      }
      if (view === "table") {
        return {
          title: "Affordability series on this page",
          series: [],
          cadence: "annual",
          format: (v) => `${v.toFixed(2)}×`,
          plot: () => null,
          sourceIds: [
            "house-price-to-earnings-ratio",
            "ehs-housing-costs-by-age",
            "ehs-mortgage-by-age",
            "rent-to-earnings-ratio",
            "housing-purchase-affordability",
          ].filter((id) => d.sources[id]),
        };
      }
      const spread = d.affordSpread;
      return {
        title: spread
          ? "House price to workplace earnings · England, within the spread of local authorities"
          : "House price to workplace-based earnings ratio",
        series: line(d.afford, "England"),
        cadence: "annual",
        format: (v) => `${v.toFixed(2)}×`,
        plot: (sr, cad) => {
          // keep the band to the period on screen
          const ts = sr[0]?.points.map((p) => p.t) ?? [];
          const inRange = (p: Pt) => ts.length > 0 && p.t >= ts[0]! - 1e-6 && p.t <= ts.at(-1)! + 1e-6;
          return (
            <TimeChart
              series={sr}
              cadence={cad}
              format={(v) => `${v.toFixed(2)}×`}
              axisFormat={(v) => `${v.toFixed(0)}×`}
              zero
              marks
              height={400}
              band={
                spread
                  ? {
                      lo: spread.lo.filter(inRange),
                      hi: spread.hi.filter(inRange),
                      hiLabel: "Least affordable 10%",
                      loLabel: "Most affordable 10%",
                    }
                  : undefined
              }
              label="House price to workplace-based earnings ratio, England, with the 10th to 90th percentile across English local authorities"
            />
          );
        },
        sourceIds: ["house-price-to-earnings-ratio"],
        derived: spread
          ? `Band: 10th to 90th percentile of ${spread.areas} English local authorities each year, computed by the Exchange from AFF1 Table 5c. Line: England (Table 1c).`
          : undefined,
      };
    }
    case "stock": {
      const T = d.tenure;
      const tenure: ChartSeries[] = [
        { id: "owner", label: "Owner-occupied", points: T.years.map((y, i) => ({ t: y, v: T.owner[i]! })) },
        { id: "pr", label: "Private rented", points: T.years.map((y, i) => ({ t: y, v: T.privateRented[i]! })) },
        { id: "social", label: "Social rented", points: T.years.map((y, i) => ({ t: y, v: T.social[i]! })) },
      ];
      if (view === "composition") {
        return {
          title: "Changing Housing Fabric · England dwelling tenure",
          series: tenure,
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: ["dwelling-stock-by-tenure"],
          derived:
            "Bands are shares of owner-occupied + private rented + social rented dwelling counts (Live Table 104). Social combines LA, PRP and other public. Unit = dwellings, not households.",
        };
      }
      if (view === "types") {
        return {
          title: "Accommodation type · Census 2021 households",
          series: [],
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: ["dwelling-type"],
          derived:
            "Census TS044 counts households by accommodation type — not MHCLG dwelling stock. Other groups converted/shared, other converted, commercial and temporary.",
        };
      }
      if (view === "geography") {
        return {
          title: "Dwelling stock by English region · 31 March",
          series: line(d.allDwellings, "All dwellings"),
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: [],
        };
      }
      if (view === "vacancy") {
        return {
          title: "Vacant dwellings · England",
          series: [
            { id: "all", label: "All vacants", points: d.vacancy.all },
            { id: "long", label: "Long-term vacants", points: d.vacancy.longTerm },
          ],
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: ["vacant-dwellings", "second-homes", "dwelling-stock-by-district"].filter(
            (id) => d.sources[id],
          ),
          derived:
            "Vacancy rate = October Table 615 all vacants ÷ 31 March Table 104 all dwellings, same calendar year (Exchange-derived). Long-term vacants are empty for more than six months. Second homes are Council Taxbase Table 4 and are not in that rate. Table 4 runs 2021–2025. The second-homes premium starts in 2025, so the split of the total changes that year even when the total does not.",
        };
      }
      if (view === "tenure")
        return {
          title: "Dwelling stock by tenure, share over time",
          series: tenure,
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: ["dwelling-stock-by-tenure"],
          derived:
            "ShareArea bands are shares of owner + private rented + social (Live Table 104). One ink; solid / hatch / stipple. Unit = dwellings.",
        };
      if (view === "table") {
        return {
          title: "Stock series on this page",
          series: line(d.allDwellings, "All dwellings"),
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: [
            "dwelling-stock-by-tenure",
            "vacant-dwellings",
            "second-homes",
            "dwelling-stock-by-region",
            "dwelling-stock-by-district",
            "dwelling-type",
          ].filter((id) => d.sources[id]),
          derived: [
            "Social rented is local-authority, private-registered-provider and other public dwellings added together. Shares on the Composition tab use the three-group total as the denominator. All dwellings is the published total and can differ from that sum.",
            "Census TS044 counts households, not MHCLG dwellings. The share is that type divided by the place’s household total.",
            "The vacancy rate is October vacants divided by the 31 March dwelling stock of the same calendar year. It is not an official MHCLG rate, and it is not a second-homes count. Long-term means empty for more than six months.",
            "Second homes are furnished dwellings with nobody living in them as a main home. Holiday lets on business rates are not included. The premium starts in 2025, so earlier premium cells are blank. Table 4 prints the year; this page dates each row as October.",
            "Geography steps through each 31 March on Table 109. District ranks stay on the latest Table 100 year.",
          ],
        };
      }
      return {
        title: "All dwellings, 31 March",
        series: line(d.allDwellings, "All dwellings"),
        cadence: "annual",
        format: fmt.count,
        plot: (sr, cad) => (
          <TimeChart
            series={sr}
            cadence={cad}
            format={fmt.count}
            axisFormat={fmt.countCompact}
            area
            height={380}
            label="All dwellings, England"
          />
        ),
        sourceIds: ["dwelling-stock-by-tenure"],
      };
    }
    case "supply": {
      if (view === "pipeline") {
        return {
          title: "Planning applications and dwelling starts are different counts",
          series: [
            ...line(d.planningGranted, "Decisions granted", "planning-decisions-granted"),
            ...line(d.starts, "Starts", "housing-starts"),
            ...line(d.completions, "Completions", "housing-completions"),
          ],
          cadence: "quarterly",
          format: fmt.count,
          plot: (sr, cad) => (
            <div style={{ display: "grid", gap: 32 }}>
              <section>
                <h3 className={t.stageTitle}>Planning decisions granted · applications per quarter</h3>
                <TimeChart series={sr.slice(0, 1)} cadence={cad} kind="bars" format={fmt.count} axisFormat={fmt.countCompact} height={260} label="England planning decisions granted, applications per quarter" />
              </section>
              <section>
                <h3 className={t.stageTitle}>Starts and completions · dwellings per quarter</h3>
                <TimeChart series={sr.slice(1)} cadence={cad} format={fmt.count} axisFormat={fmt.countCompact} zero height={300} label="England dwelling starts and completions, not a matched cohort" />
              </section>
            </div>
          ),
          sourceIds: ["planning-decisions-granted", "housing-starts", "housing-completions"].filter((id) => d.sources[id]),
          derived:
            "Applications and dwellings stay on separate charts. Period totals are not matched development cohorts.",
        };
      }
      if (view === "geography" || view === "who-builds" || view === "machine") {
        return {
          title:
            view === "geography"
              ? "Where England is adding homes"
              : view === "who-builds"
                ? "Who builds new homes in England"
                : "The housing supply machine — how the dwelling stock changed",
          series: line(d.completionsYear, "Rolling year completions"),
          cadence: "quarterly",
          format: fmt.count,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              cadence={cad}
              format={fmt.count}
              axisFormat={fmt.countCompact}
              zero
              area
              height={280}
              label="England completions, rolling four-quarter total (context)"
            />
          ),
          sourceIds: (view === "geography"
            ? []
            : view === "machine"
              ? ["net-additional-dwellings", "dwelling-stock-by-region"]
              : [
                  "net-additional-dwellings",
                  "net-additions-by-authority",
                  "housing-completions",
                  "housing-starts",
                  "affordable-housing-supply",
                ]
          ).filter((id) => d.sources[id]),
          derived:
            view === "machine"
              ? "Datum stock from Live Table 109c (31 March); shares of the net are computed by the Exchange"
              : undefined,
        };
      }
      return {
        title: "Supply series on this page",
        series: line(d.completionsYear, "Rolling year completions"),
        cadence: "quarterly",
        format: fmt.count,
        plot: () => null,
        sourceIds: [
          "net-additional-dwellings",
          "net-additions-by-authority",
          "housing-starts",
          "housing-completions",
          "affordable-housing-supply",
          "planning-decisions-granted",
        ].filter((id) => d.sources[id]),
        reading: [
          "New build. Newly built dwellings completed in the year, from the Net Supply of Housing return. It is collected over a longer window than quarterly housebuilding completions, so the two do not match.",
          "Net conversions. Dwellings gained minus dwellings lost when existing homes are subdivided or merged. It is a net figure and can be negative.",
          "Net change of use. Dwellings gained minus lost when buildings move between non-residential and residential use, including homes made under permitted development rights.",
          "Net other gains and losses. Other recorded gains and losses returned by local authorities, such as caravans, houseboats and mobile homes. It is a net figure and can be negative.",
          "Demolitions. Dwellings demolished in the year. Published as a positive count and subtracted from the total.",
          "Adjustment to Census. A statistical reconciliation, not a physical change. MHCLG spreads the gap between its annual estimates and the 2011 and 2021 Census dwelling counts evenly across the years between censuses. Marked not applicable from 2021–22.",
          "Net additional dwellings. The net change in the dwelling stock between 1 April and 31 March: new build plus net conversions, net change of use and net other gains, minus demolitions, plus the adjustment to Census.",
        ],
        derived: [
          "Live Table 118 covers England and its regions. It is not a UK series. Components start in 2006–07. New build here is not the same count as quarterly housebuilding completions.",
          "Net additions equal new build, plus conversions, change of use and other gains, minus demolitions, plus the census adjustment. A blank census counts as zero. Unreconciled is the published net minus that sum, minus the note 6 residual. A provisional year has not yet been finalised by the publisher. Demolitions are the published positive count.",
          "Financial-year net additions, quarterly dwellings by builder, affordable products, and planning applications are separate series.",
        ],
      };
    }
    case "land": {
      if (view === "table") {
        return {
          title: "Land and planning data",
          series: line(d.greenBelt, "Green Belt (ha)"),
          cadence: "annual",
          format: (v) => `${fmt.count(v)} ha`,
          plot: () => null,
          sourceIds: [
            "green-belt-area",
            "land-use-stock",
            "planning-decisions-granted",
            "brownfield-land",
          ].filter((id) => d.sources[id]),
          derived: [
            "Green Belt is the designated area at 31 March, from the official annual series. It is not a historic map of the boundary.",
            "Land use is one year, Table P400a. These shares are not quarterly observations.",
            "Received, decided and granted in the same quarter are separate totals, not one set of applications. Case-level applications stay a labelled gap. Inspectorate appeals are a separate instrument, not these P120 rows.",
            "The brownfield dwelling sum uses only sites that publish a maximum. A blank cell is missing. It is not entered as zero. A published zero stays in the sum and in the published-maximum count. Registration is not a deliverable home. Local-plan allocations are not in these tables.",
          ],
        };
      }
      if (view === "history") {
        return {
          title: "England's Green Belt: how much, and where",
          series: line(d.greenBelt, "Green Belt (ha)"),
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: ["green-belt-area"].filter((id) => d.sources[id]),
          derived:
            "England Green Belt hectares at 31 March, and the published boundary on selected dates.",
        };
      }
      if (view === "sites") {
        return {
          title: "Britain's development potential",
          series: [],
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: ["brownfield-land"].filter((id) => d.sources[id]),
          derived:
            "Registration ≠ deliverable site; dwelling estimates are LPA-published and incomplete. Local-plan allocations are not a national Planning Data layer — brownfield is the England development-sites instrument.",
        };
      }
      if (view === "decisions" || view === "planning") {
        return {
          title: "The Planning Decision Machine",
          series: [
            ...line(d.planningFlow.received, "Received"),
            ...line(d.planningFlow.decided, "Decided"),
            ...line(d.planningFlow.granted, "Granted"),
          ],
          cadence: "quarterly",
          format: fmt.count,
          plot: (sr, cad) => (
            <TimeChart
              series={sr}
              cadence={cad}
              format={fmt.count}
              axisFormat={fmt.countCompact}
              height={320}
              label="England district planning applications — received, decided, granted"
            />
          ),
          sourceIds: [],
        };
      }
      if (view === "use") {
        const rows = d.landUseShares.filter((x) => x.points[0]).map((x) => ({ id: x.id, label: x.label, v: x.points[0]!.v }));
        return {
          title: "Share of land area by use, 2022",
          series: [],
          cadence: "annual",
          format: fmt.pct,
          plot: () => <RankBars label="Share of land area by use, England 2022" rows={rows} format={fmt.pct} />,
          sourceIds: ["land-use-stock"],
        };
      }
      // Land Explorer (default) — spatial layers by place (LandExplorer renders the stage body).
      return {
        title: "The land beneath Britain",
        series: line(d.greenBelt, "Green Belt"),
        cadence: "annual",
        format: (v) => `${fmt.count(v)} ha`,
        plot: () => null,
        sourceIds: ["land-use-stock", "brownfield-land", "green-belt-area"].filter((id) => d.sources[id]),
          derived:
          "Search opens one English council from publisher open data (ONS, MHCLG, EA flood, Natural England, Historic England) plus Planning Data dumps for brownfield, Article 4 and TPO. Landmark Green Belt years sit on Historical change. Inspectorate appeals sit on Planning decisions. Local-plan allocations and individual applications stay labelled gaps. Land use is 2022. Brownfield marks are the England register, clipped.",
      };
    }
    case "quality": {
      const allDecent = d.quality.decentHomes.find((x) => x.tenure === "all-tenures")?.points ?? [];
      const allHaz = d.quality.category1.find((x) => x.tenure === "all-tenures")?.points ?? [];
      const allDamp = d.quality.damp.find((x) => x.tenure === "all-tenures")?.points ?? [];
      const allEnergy = d.quality.energyAbc.find((x) => x.tenure === "all-tenures")?.points ?? [];
      if (view === "geography") {
        return {
          title: "Where housing quality differs",
          series: [],
          cadence: "annual",
          format: fmt.pct,
          plot: () => null,
          sourceIds: [],
          derived:
            "EHS sample estimates stay on the survey scale. Local-authority rates use the domestic EPC certificate register (Geography › Local authorities).",
        };
      }
      if (view === "energy") {
        const central =
          d.quality.heating.central.find((x) => x.tenure === "all-tenures")?.points ?? [];
        const wall =
          d.quality.insulation.wall.find((x) => x.tenure === "all-tenures")?.points ?? [];
        const loft =
          d.quality.insulation.loft200.find((x) => x.tenure === "all-tenures")?.points ?? [];
        return {
          title: "The Energy Anatomy",
          series: [
            ...line(allEnergy, "Bands A–C"),
            ...line(central, "Central heating"),
            ...line(wall, "Wall insulation"),
            ...line(loft, "Loft ≥200mm"),
          ],
          cadence: "annual",
          format: fmt.pct,
          plot: () => null,
          sourceIds: [],
          derived:
            "EHS survey estimates. The domestic EPC certificate register is a different source — open Geography › Local authorities.",
        };
      }
      if (view === "condition") {
        return {
          title: "The State of Repair",
          series: [],
          cadence: "annual",
          format: fmt.pct,
          plot: () => null,
          sourceIds: [],
          derived:
            "One condition measure at a time. Surveyor damp is not resident-reported mould. A Category 1 hazard is not every way a home can fail the Decent Homes Standard.",
        };
      }
      if (view === "table") {
        const id = c.qualityIndicator ?? "";
        const selected = id && d.sources[id] ? d.sources[id] : undefined;
        return {
          title: selected?.title ?? "Quality series",
          series: [],
          cadence: "annual",
          format: fmt.pct,
          plot: () => null,
          sourceIds: selected ? [id] : [],
          derived: selected
            ? "The source line is the indicator selected above, and the table is one series within it. English Housing Survey estimates stay separate from the domestic EPC certificate register. A blank cell is suppressed or not collected, not zero. The unweighted base is a sample count, not a confidence interval."
            : "Choose an indicator. Survey estimates stay separate from the EPC certificate register.",
        };
      }
      // Inside the Home
      return {
        title: "The condition of Britain's homes",
        series: [
          ...line(allDecent, "Non-decent"),
          ...line(allHaz, "Category 1"),
          ...line(allDamp, "Damp"),
          ...line(allEnergy, "Bands A–C"),
        ],
        cadence: "annual",
        format: fmt.pct,
        plot: (sr, cad) => (
          <TimeChart
            series={sr}
            cadence={cad}
            format={fmt.pct}
            height={300}
            label="England housing quality indicators (EHS)"
          />
        ),
        sourceIds: [],
        derived: "The cutaway is an illustration. These are England survey shares, not a report on one property.",
      };
    }
    case "insecurity": {
      const i = d.insecurity;
      const has = (ids: string[]) => ids.filter((id) => d.sources[id]);
      if (view === "temporary") {
        return {
          title: "A temporary life",
          series: line(i.taHouseholds, "Households in temporary accommodation"),
          cadence: "quarterly",
          format: fmt.count,
          plot: () => null,
          sourceIds: has([
            "temporary-accommodation-duration",
            "temporary-accommodation-households",
            "temporary-accommodation-children",
          ]),
          derived:
            "Length of stay so far is a stock on one date. Net change between quarter ends is entries minus exits; separate entry and exit counts are not published in the open live tables",
        };
      }
      if (view === "displacement") {
        return {
          title: "The geography of displacement",
          series: [],
          cadence: "quarterly",
          format: (v) => v.toFixed(1),
          plot: () => null,
          sourceIds: has([
            "temporary-accommodation-households",
            "temporary-accommodation-out-of-area",
            "temporary-accommodation-children",
            "temporary-accommodation-duration",
          ]),
          derived:
            "Out-of-area share = households placed outside the authority ÷ households in temporary accommodation, same authority and date. Placements are counted by placing authority only",
        };
      }
      if (view === "need") {
        return {
          title: "Waiting for a home",
          series: [],
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: has(["social-housing-waiting-list", "social-housing-lettings", "concealed-households"]),
          derived: "Registers (stock) and lettings (flow) are never divided to give a waiting time",
        };
      }
      if (view === "cost") {
        return {
          title: "The cost of insecurity",
          series: line(i.spendNet, "Homelessness net expenditure"),
          cadence: "annual",
          format: (v) => fmt.gbpCompact(v * 1000),
          plot: () => null,
          sourceIds: has(["temporary-accommodation-spend", "temporary-accommodation-households"]),
          derived:
            "RO4 England money flow in £ thousand. Do not divide by the temporary-accommodation household stock",
        };
      }
      if (view === "table") {
        return {
          title: "Housing insecurity data",
          series: [],
          cadence: "quarterly",
          format: fmt.count,
          plot: () => null,
          sourceIds: has(INSECURITY_RECORDS.map((row) => row.id)),
          derived: [
            "Every loaded series. Net temporary-accommodation stock change is derived from consecutive quarter-end stocks; separate entry and exit counts are not published openly.",
            "The research figures use different periods and units, so they are never added together.",
          ],
        };
      }
      return {
        title: "The pathways of housing insecurity",
        series: [],
        cadence: "quarterly",
        format: fmt.count,
        plot: () => null,
        sourceIds: has([
          "statutory-homelessness-assessments",
          "homelessness-prevention-outcomes",
          "homelessness-relief-outcomes",
          "homelessness-main-duty",
          "temporary-accommodation-households",
          "homelessness-support-needs",
          "rough-sleeping-snapshot",
          "possession-claims",
          "concealed-households",
        ]),
        derived:
          "One stage at a time. Each count is its own table and cohort; the temporary accommodation stock is read at quarter end, not added",
      };
    }
    case "ownership": {
      if (view === "wealth") {
        return {
          title: "The distribution of property wealth",
          series: [],
          cadence: "annual",
          format: fmt.count,
          plot: () => null,
          sourceIds: [],
        };
      }
      if (view === "table") {
        return {
          title: "Data",
          series: [],
          cadence: "quarterly",
          format: fmt.count,
          plot: () => null,
          sourceIds: [],
        };
      }
      if (view === "mortgages") {
        return {
          title: "The mortgage machine",
          series: [],
          cadence: "quarterly",
          format: fmt.count,
          plot: () => null,
          sourceIds: [],
        };
      }
      return {
        title: "Titles held by companies · England and Wales",
        series: [],
        cadence: "annual",
        format: fmt.count,
        plot: () => null,
        sourceIds: [],
      };
    }
    case "policy": {
      const titles: Record<string, string> = {
        time: "Housing policy timeline",
        promise: "The promise ledger",
        archive: "From the archives",
        table: "Policy data",
      };
      const derived: Record<string, string> = {
        time: "Royal Assent places the mark; commencement is a separate date. Eras are ranges for reading the register, not claims that a reform began or ended in those years. A connection between records is shown only when a source states it. Context series are optional — pick them under Context series; two things in the same years are not evidence that one caused the other.",
        promise: "Open a pledge for the verdict. A promise is set beside a result only when both count the same thing, for the same place and the same period. Listed pledges stay in the register — they are not scored down.",
        archive: "Open a piece to read what it is and where it lives. We link to the archive's own page; we do not host the file here unless the licence allows it. Related laws are context only.",
        table: "One row per record, in date order. A date the source did not record says so. Nothing is estimated.",
      };
      return {
        title: titles[view] ?? titles.time,
        series: [],
        cadence: "annual",
        format: fmt.count,
        plot: () => null,
        sourceIds: [],
        derived: derived[view] ?? derived.time,
      };
    }
    default:
      return null;
  }
}

/** Key figures for the active domain view — stats must match the section on screen. */
export function figuresFor(domain: DomainId, d: HousingV1, view = "", c?: Controls): Figure[] {
  switch (domain) {
    case "prices": {
      const p = last(d.price);
      const ch = last(annualChange(d.price));
      const real = last(d.priceReal);
      const top = d.regions[0];
      const topLast = top ? last(top.points) : undefined;
      const ftb = last(d.firstTimeBuyer);
      const ftbCh = last(annualChange(d.firstTimeBuyer));
      const neu = last(d.newExisting.find((x) => x.id === "new-build")?.points ?? []);
      const old = last(d.newExisting.find((x) => x.id === "existing")?.points ?? []);
      const gap = neu && old && old.v !== 0 ? (neu.v / old.v - 1) * 100 : null;
      const cash = last(d.cashMortgage.find((x) => x.id === "cash")?.points ?? []);
      const mort = last(d.cashMortgage.find((x) => x.id === "mortgage")?.points ?? []);
      const financeGap = cash && mort && mort.v !== 0 ? (cash.v / mort.v - 1) * 100 : null;
      const sv = last(d.sales);
      const svCh = last(annualChange(d.sales));
      const segment = c?.segment ?? "new";
      const measure = c?.measure ?? "level";

      if (view === "types") {
        return d.types
          .map((line) => {
            const pt = last(line.points);
            return pt ? { label: line.label, value: fmt.gbp(pt.v), note: `Nominal · ${fmtT(pt.t)}` } : null;
          })
          .filter(Boolean) as Figure[];
      }
      if (view === "segments") {
        if (segment === "ftb") {
          return [
            ftb && { label: "First-time buyer · England", value: fmt.gbp(ftb.v), note: `Nominal · ${fmtT(ftb.t)}` },
            ftbCh && { label: "On a year earlier", value: fmt.pctSigned(ftbCh.v), note: `Nominal · ${fmtT(ftbCh.t)}` },
            p && { label: "All buyers · UK", value: fmt.gbp(p.v), note: `Nominal · ${fmtT(p.t)}` },
          ].filter(Boolean) as Figure[];
        }
        if (segment === "finance") {
          return [
            cash && { label: "Cash · England", value: fmt.gbp(cash.v), note: `Nominal · ${fmtT(cash.t)}` },
            mort && { label: "Mortgage · England", value: fmt.gbp(mort.v), note: `Nominal · ${fmtT(mort.t)}` },
            financeGap != null && cash
              ? { label: "Cash vs mortgage", value: fmt.pctSigned(financeGap), note: `Different homes · ${fmtT(cash.t)}` }
              : null,
          ].filter(Boolean) as Figure[];
        }
        return [
          neu && { label: "New build · UK", value: fmt.gbp(neu.v), note: `Nominal · ${fmtT(neu.t)}` },
          old && { label: "Existing · UK", value: fmt.gbp(old.v), note: `Nominal · ${fmtT(old.t)}` },
          gap != null && neu
            ? { label: "New vs existing", value: fmt.pctSigned(gap), note: `Different mixes · ${fmtT(neu.t)}` }
            : null,
        ].filter(Boolean) as Figure[];
      }
      if (view === "transactions") {
        const paid = d.pricePaid;
        return [
          sv && { label: "UK HPI sales", value: fmt.count(sv.v), note: `Monthly count · ${fmtT(sv.t)}` },
          svCh && { label: "Volume on a year earlier", value: fmt.pctSigned(svCh.v), note: `UK HPI · ${fmtT(svCh.t)}` },
          paid.available && paid.year != null
            ? {
                label: `Price Paid ${paid.year}`,
                value: fmt.countCompact(paid.count),
                note: "England & Wales · registered sales",
              }
            : null,
        ].filter(Boolean) as Figure[];
      }
      if (view === "table") {
        return [
          p && { label: "Average price · UK", value: fmt.gbp(p.v), note: `Nominal · ${fmtT(p.t)}` },
          real && { label: "CPI-adjusted · UK", value: fmt.gbp(real.v), note: `Latest CPI pounds · ${fmtT(real.t)}` },
          { label: "Series listed", value: String(priceCatalogue(d).length), note: "Coverage differs by row" },
        ].filter(Boolean) as Figure[];
      }
      if (view === "map") {
        return [
          p && { label: "Average price · UK", value: fmt.gbp(p.v), note: `Nominal · ${fmtT(p.t)}` },
          ch && { label: "On a year earlier", value: fmt.pctSigned(ch.v), note: `Nominal · ${fmtT(ch.t)}` },
          top && topLast && { label: `Highest · ${top.name}`, value: fmt.gbpCompact(topLast.v), note: fmtT(topLast.t) },
        ].filter(Boolean) as Figure[];
      }
      // History (default): respect measure and selected place layers.
      const selected = (c?.places ?? ["uk"])
        .map((code) => placeSeries(code, d))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));
      const placeFigs = selected.slice(0, 3).map((layer) => {
        const pts: Pt[] | undefined =
          measure === "change"
            ? annualChange(layer.points)
            : measure === "real" && layer.id === "uk"
              ? d.priceReal
              : layer.points;
        const pt = pts?.length ? last(pts) : undefined;
        if (!pt) return null;
        return {
          label: layer.label,
          value: measure === "change" ? fmt.pctSigned(pt.v) : fmt.gbp(pt.v),
          note: measure === "real" ? `Latest CPI pounds · ${fmtT(pt.t)}` : `Nominal · ${fmtT(pt.t)}`,
        };
      });
      if (measure === "real") {
        return [
          real && { label: "Real average · UK", value: fmt.gbp(real.v), note: `Latest CPI pounds · ${fmtT(real.t)}` },
          p && { label: "Nominal · UK", value: fmt.gbp(p.v), note: fmtT(p.t) },
          ch && { label: "Nominal change", value: fmt.pctSigned(ch.v), note: `On a year earlier · ${fmtT(ch.t)}` },
        ].filter(Boolean) as Figure[];
      }
      if (selected.length > 1 || (selected.length === 1 && selected[0]!.id !== "uk")) {
        return [
          ...placeFigs,
          measure === "level" && ch ? { label: "UK · nominal change", value: fmt.pctSigned(ch.v), note: fmtT(ch.t) } : null,
        ].filter(Boolean) as Figure[];
      }
      if (measure === "change") {
        return [
          ch && { label: "Annual change · UK", value: fmt.pctSigned(ch.v), note: `Nominal · ${fmtT(ch.t)}` },
          p && { label: "Average price · UK", value: fmt.gbp(p.v), note: `Nominal · ${fmtT(p.t)}` },
          top && topLast && { label: `Highest · ${top.name}`, value: fmt.gbpCompact(topLast.v), note: fmtT(topLast.t) },
        ].filter(Boolean) as Figure[];
      }
      return [
        p && { label: "Average price · UK", value: fmt.gbp(p.v), note: `Nominal · ${fmtT(p.t)}` },
        ch && { label: "On a year earlier", value: fmt.pctSigned(ch.v), note: `Nominal · ${fmtT(ch.t)}` },
        top && topLast && { label: `Highest · ${top.name}`, value: fmt.gbpCompact(topLast.v), note: fmtT(topLast.t) },
      ].filter(Boolean) as Figure[];
    }
    case "renting": {
      const avg = last(d.rentAverage);
      const c = last(d.rentChange);
      const i = last(d.rentIndex);
      const beds = d.rentBedrooms
        .map((line) => {
          const pt = last(line.points);
          return pt ? { label: line.label, value: fmt.gbp(pt.v), note: fmtT(pt.t) } : null;
        })
        .filter(Boolean) as Figure[];
      if (view === "index") {
        return [
          i && { label: "Index level", value: i.v.toFixed(1), note: fmtT(i.t) },
          c && { label: "On a year earlier", value: fmt.pctSigned(c.v), note: fmtT(c.t) },
        ].filter(Boolean) as Figure[];
      }
      if (view === "bedrooms") {
        return beds.slice(0, 4);
      }
      if (view === "change") {
        return [
          c && { label: "Annual change · UK", value: fmt.pctSigned(c.v), note: fmtT(c.t) },
          avg && { label: "Average rent · UK", value: fmt.gbp(avg.v), note: fmtT(avg.t) },
          beds[0] ?? null,
        ].filter(Boolean) as Figure[];
      }
      return [
        avg && { label: "Average rent · UK", value: fmt.gbp(avg.v), note: fmtT(avg.t) },
        c && { label: "On a year earlier", value: fmt.pctSigned(c.v), note: fmtT(c.t) },
        beds[0] ?? null,
        !avg && i ? { label: "Index level", value: i.v.toFixed(1), note: fmtT(i.t) } : null,
      ].filter(Boolean) as Figure[];
    }
    case "affordability": {
      const a = last(d.afford);
      const a10 = yearAgo(d.afford, 10);
      const first = d.afford[0];
      const p = last(d.price);
      const rate = last(d.mortgageRate);
      const rentBurden = last(d.rentToEarnings);
      const ageShare = (age: string, tenure: string, place = "all households") => {
        const cohort = d.ehsHousingCostsByAge?.cohorts.find((item) => item.age === age);
        const row = cohort?.rows.find((item) => item.place === place);
        return row?.tenures.find((item) => item.id === tenure)?.latest.mean ?? null;
      };
      const youngRent = ageShare("16 to 34", "private-rent");
      const youngMortgage = ageShare("16 to 34", "mortgage");
      const londonRent = ageShare("16 to 34", "private-rent", "London");
      const purchaseEng = last(d.purchaseAffordRegions.find((r) => r.id === "E92000001")?.points ?? []);
      if (view === "experiment") {
        return [
          a && { label: "Years of pay · England", value: fmt.ratio(a.v), note: fmtT(a.t, "annual") },
          p && { label: "UK average price", value: fmt.gbpCompact(p.v), note: fmtT(p.t) },
          rate && { label: "Two-year fixed rate", value: `${rate.v.toFixed(2)}%`, note: fmtT(rate.t) },
        ].filter(Boolean) as Figure[];
      }
      if (view === "map") {
        return [
          a && { label: "Years of pay · England", value: fmt.ratio(a.v), note: fmtT(a.t, "annual") },
          a10 && { label: "Ten years earlier", value: fmt.ratio(a10.v), note: fmtT(a10.t, "annual") },
          { label: "Geography", value: "E&W", note: "AFF1 local authorities · Scotland/NI unpublished" },
        ].filter(Boolean) as Figure[];
      }
      if (view === "ages") {
        const share = (value: number | null) => (value == null ? null : `${value.toFixed(1)}%`);
        return [
          youngRent != null && {
            label: "Private rent · 16–34",
            value: share(youngRent) ?? "",
            note: "Mean · England · 2024–25",
          },
          youngMortgage != null && {
            label: "Mortgage · 16–34",
            value: share(youngMortgage) ?? "",
            note: "Mean · England · 2024–25",
          },
          londonRent != null && {
            label: "Private rent · London",
            value: share(londonRent) ?? "",
            note: "Ages 16–34 · 2024–25",
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "rent") {
        return [
          rentBurden && {
            label: "Rent share of earnings",
            value: `${(rentBurden.v * 100).toFixed(1)}%`,
            note: fmtT(rentBurden.t, "annual"),
          },
          a && { label: "Years of pay · buy", value: fmt.ratio(a.v), note: "AFF1 workplace median" },
        ].filter(Boolean) as Figure[];
      }
      if (view === "households") {
        return [
          purchaseEng && {
            label: "England median/median",
            value: fmt.ratio(purchaseEng.v),
            note: `${fmtFY(purchaseEng.t)} · financial year`,
          },
          { label: "Grid cells", value: String(d.purchaseAffordGrid.length), note: "England income × price deciles" },
        ].filter(Boolean) as Figure[];
      }
      return [
        a && { label: "Years of pay · England", value: fmt.ratio(a.v), note: fmtT(a.t, "annual") },
        a10 && { label: "Ten years earlier", value: fmt.ratio(a10.v), note: fmtT(a10.t, "annual") },
        first && { label: "First year on record", value: fmt.ratio(first.v), note: fmtT(first.t, "annual") },
      ].filter(Boolean) as Figure[];
    }
    case "stock": {
      const T = d.tenure;
      const i = T.years.length - 1;
      if (view === "vacancy") {
        const allV = last(d.vacancy.all);
        const longV = last(d.vacancy.longTerm);
        const rate = last(d.vacancy.rateEngland);
        return [
          allV && { label: "All vacants", value: fmt.countCompact(allV.v), note: "England · Table 615" },
          longV && { label: "Long-term", value: fmt.countCompact(longV.v), note: ">6 months empty" },
          rate && { label: "Vacancy rate", value: fmt.pct(rate.v, 2), note: "October vacants ÷ 31 March stock" },
        ].filter(Boolean) as Figure[];
      }
      if (view === "types") {
        const eng = d.dwellingTypes.places.find((p) => p.id === "E92000001");
        const det = eng?.parts.find((p) => p.id === "detached");
        const flat = eng?.parts.find((p) => p.id === "purpose-built-flat");
        return [
          eng && { label: "Households · England", value: fmt.countCompact(eng.total), note: "Census 2021" },
          det && eng && {
            label: "Detached",
            value: fmt.pct((det.count / eng.total) * 100, 1),
            note: "Share of households",
          },
          flat && eng && {
            label: "Purpose-built flat",
            value: fmt.pct((flat.count / eng.total) * 100, 1),
            note: "Share of households",
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "geography") {
        const latest = d.stockGeography.byYear.at(-1);
        const eng = latest?.england ?? null;
        const largest = latest?.regions[0];
        return [
          latest && eng
            ? { label: "All dwellings", value: fmt.countCompact(eng.total), note: `England · ${latest.year}` }
            : null,
          eng && eng.total
            ? {
                label: "Owner-occupied",
                value: fmt.pct((eng.owner / eng.total) * 100, 1),
                note: "Table 109 share",
              }
            : null,
          largest
            ? {
                label: "Largest region",
                value: largest.label,
                note: fmt.countCompact(largest.total),
              }
            : null,
        ].filter(Boolean) as Figure[];
      }
      if (i < 0) return [];
      const tot = T.owner[i]! + T.privateRented[i]! + T.social[i]!;
      return [
        { label: "Owner-occupied", value: fmt.pct((T.owner[i]! / tot) * 100), note: `31 March ${T.years[i]}` },
        { label: "Private rented", value: fmt.pct((T.privateRented[i]! / tot) * 100), note: `31 March ${T.years[i]}` },
        { label: "Social rented", value: fmt.pct((T.social[i]! / tot) * 100), note: `31 March ${T.years[i]}` },
      ];
    }
    case "supply": {
      const r = last(d.completionsYear);
      const q = last(d.completions);
      const st = last(d.starts);
      const net = d.supplyNet.net.length ? d.supplyNet.net[d.supplyNet.net.length - 1]! : null;
      const nb = d.supplyNet.newBuild.length ? d.supplyNet.newBuild[d.supplyNet.newBuild.length - 1]! : null;
      const fy =
        d.supplyNet.years.length > 0
          ? (() => {
              const t = d.supplyNet.years[d.supplyNet.years.length - 1]!;
              const y = Math.floor(t + 1e-6);
              return `${y}–${String((y + 1) % 100).padStart(2, "0")}`;
            })()
          : null;
      if (view === "machine" || view === "") {
        return [
          net != null && { label: "Net additions · England", value: fmt.count(net), note: fy ?? "financial year" },
          nb != null && { label: "Of which new build", value: fmt.count(nb), note: fy ?? "financial year" },
          r && { label: "Completions · rolling year", value: fmt.count(r.v), note: fmtT(r.t, "quarterly") },
        ].filter(Boolean) as Figure[];
      }
      if (view === "pipeline") {
        const pl = last(d.planningGranted);
        return [
          pl && { label: "Decisions granted", value: fmt.count(pl.v), note: `${fmtT(pl.t, "quarterly")} · applications` },
          st && { label: "Starts", value: fmt.count(st.v), note: `${fmtT(st.t, "quarterly")} · dwellings` },
          q && { label: "Completions", value: fmt.count(q.v), note: `${fmtT(q.t, "quarterly")} · dwellings` },
        ].filter(Boolean) as Figure[];
      }
      if (view === "geography") {
        const g = (c?.supplyGeoYear ? d.supplyGeography.byYear[c.supplyGeoYear] : undefined) ?? d.supplyGeography;
        const top = g.regions[0];
        const topRate = [...g.regions]
          .filter((r) => r.ratePerThousand != null)
          .sort((a, b) => (b.ratePerThousand ?? 0) - (a.ratePerThousand ?? 0))[0];
        return [
          g.england != null && {
            label: "England net additions",
            value: fmt.count(g.england),
            note: [g.yearLabel, g.provisional ? "provisional" : ""].filter(Boolean).join(" · "),
          },
          g.englandRate != null && {
            label: "England · per 1,000 dwellings",
            value: g.englandRate.toFixed(1),
            note: g.stockYear != null
              ? `stock open 31 March ${g.stockYear}`
              : (g.yearLabel ?? ""),
          },
          top && { label: `Highest region · ${top.label}`, value: fmt.count(top.v), note: g.yearLabel ?? "" },
          topRate?.ratePerThousand != null && {
            label: `Highest rate · ${topRate.label}`,
            value: topRate.ratePerThousand.toFixed(1),
            note: "per 1,000 dwellings",
          },
          g.authorities[0] && {
            label: `Highest district · ${g.authorities[0].label}`,
            value: fmt.count(g.authorities[0].v),
            note: g.yearLabel ?? "",
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "who-builds") {
        const pe = last(d.whoBuilds.completions.find((l) => l.id === "private-enterprise")?.points ?? []);
        const ha = last(d.whoBuilds.completions.find((l) => l.id === "housing-association")?.points ?? []);
        const la = last(d.whoBuilds.completions.find((l) => l.id === "local-authority")?.points ?? []);
        const allAff = last(d.whoBuilds.affordableTotal);
        return [
          pe && { label: "Private enterprise · completions", value: fmt.count(pe.v), note: `${fmtT(pe.t, "quarterly")} · dwellings` },
          ha && { label: "Housing association", value: fmt.count(ha.v), note: `${fmtT(ha.t, "quarterly")} · dwellings` },
          la && { label: "Local authority", value: fmt.count(la.v), note: `${fmtT(la.t, "quarterly")} · dwellings` },
          allAff && { label: "Affordable products", value: fmt.count(allAff.v), note: `${fmtFY(allAff.t)} · not the builder` },
        ].filter(Boolean) as Figure[];
      }
      return [
        net != null && { label: "Net additions · England", value: fmt.count(net), note: fy ? `${fy} · dwellings` : "financial year" },
        q && { label: "Completions · quarter", value: fmt.count(q.v), note: `${fmtT(q.t, "quarterly")} · dwellings` },
        st && { label: "Starts · quarter", value: fmt.count(st.v), note: `${fmtT(st.t, "quarterly")} · dwellings` },
      ].filter(Boolean) as Figure[];
    }
    case "land": {
      const gb = last(d.greenBelt);
      const dev = d.landUseShares.find((x) => x.id === "developed")?.points[0];
      const recv = last(d.planningFlow.received);
      const dec = last(d.planningFlow.decided);
      const pl = last(d.planningFlow.granted);
      const grantRate =
        dec && pl && dec.v > 0 ? (pl.v / dec.v) * 100 : null;
      if (view === "use") {
        return d.landUseShares
          .filter((x) => x.points[0])
          .slice(0, 4)
          .map((x) => ({ label: x.label, value: fmt.pct(x.points[0]!.v), note: fmtT(x.points[0]!.t, "annual") }));
      }
      if (view === "history") {
        const gb0 = d.greenBelt[0];
        const prev = d.greenBelt.at(-2);
        const since = gb && gb0 && gb0 !== gb ? gb.v - gb0.v : null;
        const lastYear = gb && prev ? gb.v - prev.v : null;
        const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt.countCompact(Math.abs(v))} ha`;
        return [
          gb && {
            label: "Green Belt · England",
            value: `${fmt.countCompact(gb.v)} ha`,
            note: `31 March ${fmtT(gb.t, "annual")}`,
          },
          lastYear != null && prev && {
            label: "Change in a year",
            value: signed(lastYear),
            note: `Since 31 March ${fmtT(prev.t, "annual")}`,
          },
          since != null && gb0 && {
            label: "Change since first record",
            value: signed(since),
            note: `Since 31 March ${fmtT(gb0.t, "annual")}`,
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "sites") {
        const bf = d.brownfield;
        return [
          bf.siteCount != null && {
            label: "Registered brownfield sites",
            value: fmt.count(bf.siteCount),
            note: bf.asAt != null ? `England · as at ${fmtT(bf.asAt, "annual")}` : "England",
          },
          bf.hectares != null && {
            label: "Recorded area",
            value: `${fmt.countCompact(bf.hectares)} ha`,
            note: "LPA-published hectares",
          },
          bf.maxDwellings != null && {
            label: "Max net dwellings (sum)",
            value: fmt.countCompact(bf.maxDwellings),
            note:
              bf.sitesWithEstimate != null && bf.siteCount != null
                ? `Published on ${fmt.count(bf.sitesWithEstimate)} of ${fmt.count(bf.siteCount)} sites. The rest are missing, not zero.`
                : "Published maxima only — a blank is not zero",
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "decisions" || view === "planning") {
        return [
          recv && { label: "Applications received", value: fmt.count(recv.v), note: fmtT(recv.t, "quarterly") },
          dec && { label: "Applications decided", value: fmt.count(dec.v), note: fmtT(dec.t, "quarterly") },
          pl && {
            label: "Decisions granted",
            value: fmt.count(pl.v),
            note:
              grantRate != null
                ? `${fmtT(pl.t, "quarterly")} · ${grantRate.toFixed(0)}% of decisions`
                : fmtT(pl.t, "quarterly"),
          },
        ].filter(Boolean) as Figure[];
      }
      const bf = d.brownfield;
      return [
        gb && { label: "Green Belt · England", value: `${fmt.countCompact(gb.v)} ha`, note: `31 March ${fmtT(gb.t, "annual")}` },
        dev && { label: "Developed land", value: fmt.pct(dev.v), note: fmtT(dev.t, "annual") },
        bf.siteCount != null && {
          label: "Brownfield sites · England",
          value: fmt.count(bf.siteCount),
          note: "Register clip on the map — not deliverable homes",
        },
      ].filter(Boolean) as Figure[];
    }
    case "quality": {
      const at = (block: { tenure: string; points: Pt[] }[]) =>
        last(block.find((x) => x.tenure === "all-tenures")?.points ?? []);
      const decent = at(d.quality.decentHomes);
      const haz = at(d.quality.category1);
      const damp = at(d.quality.damp);
      const energy = at(d.quality.energyAbc);
      if (view === "geography") {
        return [
          decent && {
            label: "Non-decent · England",
            value: fmt.pct(decent.v),
            note: "National survey — not small-area",
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "table") {
        const id = c?.qualityIndicator;
        const row = (label: string, pt: Pt | undefined, note: string): Figure[] =>
          pt ? [{ label, value: fmt.pct(pt.v), note }] : [];
        if (id === "ehs-decent-homes") return row("Non-decent · England", decent, "Survey estimate · fails the Decent Homes Standard");
        if (id === "ehs-category-1-hazards") return row("Category 1 hazard · England", haz, "Survey estimate");
        if (id === "ehs-damp-surveyor") return row("Surveyor damp · England", damp, "Surveyor inspection · not a resident report");
        if (id === "ehs-energy-efficiency-bands") return row("Bands A–C · England", energy, "EHS modelled · not the EPC register");
        return [];
      }
      if (view === "energy") {
        const central = last(
          d.quality.heating.central.find((x) => x.tenure === "all-tenures")?.points ?? [],
        );
        const wall = last(
          d.quality.insulation.wall.find((x) => x.tenure === "all-tenures")?.points ?? [],
        );
        return [
          energy && {
            label: "Bands A–C · England",
            value: fmt.pct(energy.v),
            note: "EHS modelled · not EPC register",
          },
          central && {
            label: "Central heating",
            value: fmt.pct(central.v),
            note: fmtT(central.t, "annual"),
          },
          wall && {
            label: "Wall insulation",
            value: fmt.pct(wall.v),
            note: fmtT(wall.t, "annual"),
          },
        ].filter(Boolean) as Figure[];
      }
      return [
        decent && { label: "Non-decent", value: fmt.pct(decent.v), note: fmtT(decent.t, "annual") },
        haz && { label: "Category 1 hazard", value: fmt.pct(haz.v), note: fmtT(haz.t, "annual") },
        damp && { label: "Surveyor damp", value: fmt.pct(damp.v), note: fmtT(damp.t, "annual") },
      ].filter(Boolean) as Figure[];
    }
    case "insecurity": {
      const i = d.insecurity;
      const h = i.headlines;
      const ta = i.taHouseholds.at(-1);
      const taDate = ta ? `Stock · ${stockLabel(qKey(ta.t))}` : "Stock";
      const rough = i.roughSleeping.at(-1);
      if (view === "temporary") {
        const all = i.taDurationMatrix[0];
        const long = all
          ? all.bands.filter((b) => b.id !== "under-6-months" && b.id !== "6-months-to-1-year").reduce((a, b) => a + b.v, 0)
          : null;
        return [
          h.taHouseholds != null && {
            label: "In temporary homes",
            value: fmt.count(h.taHouseholds),
            note: taDate,
          },
          h.taChildren != null && { label: "Children", value: fmt.count(h.taChildren), note: "Same date" },
          long != null && { label: "A year or more", value: fmt.count(long), note: "Same date" },
        ].filter(Boolean) as Figure[];
      }
      if (view === "displacement") {
        return [
          h.outOfAreaEngland != null && {
            label: "Placed out of area",
            value: fmt.count(h.outOfAreaEngland),
            note: "England · stock",
          },
          h.taHouseholds != null && {
            label: "In temporary homes",
            value: fmt.count(h.taHouseholds),
            note: taDate,
          },
          h.taChildren != null && { label: "Children", value: fmt.count(h.taChildren), note: "Same date" },
        ].filter(Boolean) as Figure[];
      }
      if (view === "need") {
        const reg = i.waitingList.at(-1);
        const lets = i.lettings.at(-1);
        return [
          reg && { label: "On housing registers", value: fmt.count(reg.v), note: `Stock · 31 Mar ${yearOf(reg.t)}` },
          lets && {
            label: "New social lettings",
            value: fmt.count(lets.v),
            note: `Flow · ${yearOf(lets.t)}–${String((yearOf(lets.t) + 1) % 100).padStart(2, "0")}`,
          },
          h.concealedFamilies != null && {
            label: "Concealed families",
            value: fmt.count(h.concealedFamilies),
            note: "Census Day 2021",
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "cost") {
        const net = i.spendNet.at(-1);
        const gross = i.spendGross.at(-1);
        return [
          net && {
            label: "Net homelessness spend",
            value: fmt.gbpCompact(net.v * 1000),
            note: `${fmtFY(net.t)} · England`,
          },
          gross && {
            label: "Gross homelessness spend",
            value: fmt.gbpCompact(gross.v * 1000),
            note: `${fmtFY(gross.t)} · England`,
          },
          h.taHouseholds != null && {
            label: "In temporary homes",
            value: fmt.count(h.taHouseholds),
            note: taDate,
          },
        ].filter(Boolean) as Figure[];
      }
      const owed = i.assessmentsOwed.at(-1);
      return [
        h.taHouseholds != null && {
          label: "In temporary homes",
          value: fmt.count(h.taHouseholds),
          note: taDate,
        },
        owed && { label: "Owed a duty", value: fmt.count(owed.v), note: `Flow · ${fmtT(owed.t, "quarterly")}` },
        rough && {
          label: "Sleeping rough",
          value: fmt.count(rough.v),
          note: `One night · autumn ${yearOf(rough.t)}`,
        },
      ].filter(Boolean) as Figure[];
    }
    case "ownership": {
      const h = d.ownership.headlines;
      const bn = (millions: number | null) =>
        millions == null
          ? null
          : `£${(millions / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}bn`;
      if (view === "ownership" || view === "") {
        const titles = d.ownership.titles;
        const p = titles.period;
        const when = p
          ? `England and Wales · ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`
          : "England and Wales";
        return [
          titles.uk.total != null && {
            label: "Titles held by UK companies",
            value: fmt.count(titles.uk.total),
            note: when,
          },
          titles.overseas.total != null && {
            label: "Titles held by overseas companies",
            value: fmt.count(titles.overseas.total),
            note: when,
          },
          titles.ukCompanies != null && {
            label: "UK companies holding titles",
            value: fmt.count(titles.ukCompanies),
            note: when,
          },
        ].filter(Boolean) as Figure[];
      }
      if (view === "wealth") {
        const median = h.medianNetPropertyWealth;
        return [
          median != null && {
            label: "Median net property wealth",
            value: fmt.gbp(median),
            note: "All households · Apr 2020–Mar 2022",
          },
          (() => {
            const last = [...d.ownership.estates.rows].reverse().find((r) => r.residential != null);
            return (
              last && {
                label: "Residential property in estates",
                value: `£${(last.residential! / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })}bn`,
                note: `UK · deaths in ${last.year}${last.coverage === "full" ? " · full returns only" : ""}`,
              }
            );
          })(),
        ].filter(Boolean) as Figure[];
      }
      const stock = bn(h.balancesOutstanding);
      const advances = bn(h.grossAdvances);
      return [
        stock && { label: "Loan book", value: stock, note: "Stock · Q2 2026" },
        advances && { label: "Gross advances", value: advances, note: "Flow · Q2 2026" },
        h.housePurchaseApprovals != null && {
          label: "House-purchase approvals",
          value: fmt.count(h.housePurchaseApprovals),
          note: "Flow · Sep 2026",
        },
      ].filter(Boolean) as Figure[];
    }
    case "policy":
      // Figures come from policyFigures(PolicyPayload) — register loads from Storage pack.
      return [];
    default:
      return [];
  }
}

"use client";

/**
 * Economy Domain 01 — Inflation & Prices (brief: The Changing Price of Britain).
 *
 *   01 Changing price   CPI / CPIH annual rate, measure switch, definitions in Notes
 *   02 What £1 buys     year + measure → purchasing power from the all-items index (derived)
 *   03 What's driving it  CPIH COICOP division annual rates (RankBars; not contributions)
 *   04 Everyday basket  official average prices (stats in development; ends Jan 2025)
 *   Data                observation tables
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { RankBars, TimeChart } from "../instrument/TimeChart";
import { fmtT } from "../data";
import { Term } from "../term";
import type { PrintOption } from "../PrintSelect";
import {
  ControlRow,
  EmptyStage,
  ExplorerHead,
  FigureRecord,
  FigureStrip,
  MenuControl,
  ResetButton,
  SearchControl,
  TextButton,
  Stage,
  explorerClasses as t,
  type ExplorerFigure,
  type ExplorerView,
} from "../template";
import s from "../energy/generation.module.css";
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import {
  CPIH_COICOP_DIVISIONS,
  CPIH_CONTRIBUTION_DIVISIONS,
  annualAverages,
  asCategoryLens,
  asMeasure,
  basketLatestMonth,
  coicopMonths,
  coicopRanksForMonth,
  finalObs,
  fmtIndex,
  fmtPence,
  fmtPounds,
  fmtPp,
  fmtRate,
  monthlyPoints,
  poundWorth,
  rateYoYChangePp,
  valueAtMonth,
  type CategoryLens,
  type InflationMeasure,
} from "./inflation-model";
import { coerceFromYear, fromYearOptions, pointsFrom } from "./series-window";
import { BasketWall } from "./BasketWall";
import { useBasket } from "./basket";
import { BASKET_GROUPS } from "./basket-catalogue";
import { PoundBuys } from "./PoundBuys";
import type { InflationPack } from "./types";

/** ISO month start → "Mon YYYY" without building a fake observation. */
function labelMonth(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return fmtT(y + (m - 1) / 12);
}

const VIEWS: ExplorerView[] = [
  { id: "rate", label: "Changing price" },
  { id: "index", label: "What £1 buys" },
  { id: "categories", label: "What's driving it" },
  { id: "basket", label: "Everyday basket" },
  { id: "data", label: "Data" },
];

const MEASURE_OPTIONS: PrintOption<InflationMeasure>[] = [
  { value: "cpi", label: "CPI" },
  { value: "cpih", label: "CPIH" },
];

const CATEGORY_LENS_OPTIONS: PrintOption<CategoryLens>[] = [
  { value: "contributions", label: "Contributions" },
  { value: "rates", label: "Annual rates" },
];

const DEFAULT_YEAR = 1990;

/** Glossary for this domain — listed under Terms, not repeated in “What this shows”. */
const INFLATION_TERMS = ["cpi", "inflation", "cpih", "core-inflation"] as const;
const RATE_TERMS = [...INFLATION_TERMS] as const;
const CATEGORY_TERMS = ["cpih", "inflation", "coicop", "percentage-point"] as const;
const BASKET_TERMS = ["inflation", "cpi"] as const;
const DATA_TERMS = ["cpi", "inflation", "cpih", "core-inflation", "percentage-point", "coicop"] as const;

function asView(raw: string | null): string {
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "rate";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Inflation";
}

export function InflationCanvas({ pack }: { pack: InflationPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [measure, setMeasure] = useState<InflationMeasure>(() =>
    asMeasure(searchParams.get("measure")),
  );
  const [yearRaw, setYear] = useState<string>(() => searchParams.get("year") ?? String(DEFAULT_YEAR));
  const [catLens, setCatLens] = useState<CategoryLens>(() => asCategoryLens(searchParams.get("cat")));
  const [catMonthRaw, setCatMonth] = useState(() => searchParams.get("month") ?? "");
  const [fromRaw, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [dataSeries, setDataSeries] = useState(() => searchParams.get("series") ?? "");

  const sync = useCallback(
    (next: {
      view?: string;
      measure?: InflationMeasure;
      year?: string;
      cat?: CategoryLens;
      month?: string;
      from?: string;
      series?: string;
    }) => {
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "inflation");
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const y = next.year ?? yearRaw;
      const cat = next.cat ?? catLens;
      const month = next.month ?? catMonthRaw;
      const fr = next.from ?? fromRaw;
      const ser = next.series ?? dataSeries;
      u.set("view", v);
      if (v === "rate" || v === "index") u.set("measure", m);
      else u.delete("measure");
      if (v === "index") u.set("year", y);
      else u.delete("year");
      if (v === "basket") {
        /* basket owns from/to/q via useBasket */
      } else if (v === "rate") {
        u.delete("to");
        u.delete("q");
        if (fr) u.set("from", fr);
        else u.delete("from");
      } else {
        u.delete("from");
        u.delete("to");
        u.delete("q");
      }
      if (v === "categories") {
        u.set("cat", cat);
        if (month) u.set("month", month);
        else u.delete("month");
      } else {
        u.delete("cat");
        u.delete("month");
      }
      if (v === "data" && ser) u.set("series", ser);
      else u.delete("series");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
      if (next.year != null) setYear(next.year);
      if (next.cat != null) setCatLens(next.cat);
      if (next.month != null) setCatMonth(next.month);
      if (next.from != null) setFrom(next.from);
      if (next.series != null) setDataSeries(next.series);
    },
    [pathname, view, measure, yearRaw, catLens, catMonthRaw, fromRaw, dataSeries],
  );

  const measureLabel = measure === "cpih" ? "CPIH" : "CPI";

  /* ——— 01 Changing price ——— */
  const ratePack = measure === "cpih" ? pack.cpihRate : pack.cpiRate;
  const rateRows = useMemo(() => ratePack?.observations ?? [], [ratePack]);
  const ratePtsAll = useMemo(() => monthlyPoints(rateRows), [rateRows]);
  const rateFromOpts = useMemo(() => fromYearOptions(ratePtsAll), [ratePtsAll]);
  const rateFromYear = coerceFromYear(fromRaw || null, ratePtsAll);
  const ratePts = useMemo(
    () => (view === "rate" ? pointsFrom(ratePtsAll, rateFromYear) : ratePtsAll),
    [view, ratePtsAll, rateFromYear],
  );
  const latestRate = useMemo(() => {
    const finals = finalObs(rateRows);
    return finals[finals.length - 1] ?? null;
  }, [rateRows]);
  const yoyPp = rateYoYChangePp(rateRows);
  const peak = useMemo(
    () => (ratePtsAll.length ? ratePtsAll.reduce((a, p) => (p.v > a.v ? p : a)) : null),
    [ratePtsAll],
  );
  /** Chart series key only — never put this on the source foot. */
  const seriesKey = measure === "cpih" ? "cpih-inflation" : "cpi-inflation";
  const latestRateLabel = latestRate ? fmtT(monthlyPoints([latestRate])[0]!.t) : null;

  /* ——— 02 What £1 buys ——— */
  const indexPack = measure === "cpih" ? pack.cpihIndex : pack.cpiIndex;
  const indexRows = useMemo(() => indexPack?.observations ?? [], [indexPack]);
  const yearOptions: PrintOption<string>[] = useMemo(
    () =>
      [...annualAverages(indexRows).keys()]
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: String(y) })),
    [indexRows],
  );
  const year = yearOptions.some((o) => o.value === yearRaw)
    ? Number(yearRaw)
    : Number(yearOptions.find((o) => o.value === String(DEFAULT_YEAR))?.value ?? yearOptions.at(-1)?.value ?? DEFAULT_YEAR);
  const worth = useMemo(() => poundWorth(indexRows, year), [indexRows, year]);
  const latestIdx = useMemo(() => {
    const finals = finalObs(indexRows);
    return finals[finals.length - 1] ?? null;
  }, [indexRows]);
  const latestIdxLabel = latestIdx ? fmtT(monthlyPoints([latestIdx])[0]!.t) : null;

  /* ——— 03 What's driving it ——— */
  const categoryPacks = useMemo(
    () => (catLens === "contributions" ? (pack.contributions ?? {}) : (pack.coicop ?? {})),
    [catLens, pack.contributions, pack.coicop],
  );
  const categoryDivisions =
    catLens === "contributions" ? CPIH_CONTRIBUTION_DIVISIONS : CPIH_COICOP_DIVISIONS;
  const coicopMonthList = useMemo(
    () => coicopMonths(categoryPacks, categoryDivisions),
    [categoryPacks, categoryDivisions],
  );
  const coicopMonthOptions: PrintOption<string>[] = useMemo(
    () =>
      [...coicopMonthList]
        .reverse()
        .map((p) => ({ value: p, label: labelMonth(p) })),
    [coicopMonthList],
  );
  const coicopMonth = useMemo(() => {
    if (catMonthRaw && coicopMonthList.includes(catMonthRaw)) return catMonthRaw;
    return coicopMonthList[coicopMonthList.length - 1] ?? null;
  }, [catMonthRaw, coicopMonthList]);
  const dataSeriesOptions: PrintOption<string>[] = useMemo(() => {
    const opts: PrintOption<string>[] = [];
    if (finalObs(pack.cpiRate?.observations ?? []).length)
      opts.push({ value: "cpi-inflation", label: "CPI annual rate" });
    if (finalObs(pack.cpihRate?.observations ?? []).length)
      opts.push({ value: "cpih-inflation", label: "CPIH annual rate" });
    if (finalObs(pack.cpiIndex?.observations ?? []).length)
      opts.push({ value: "cpi-index", label: "CPI index" });
    if (finalObs(pack.cpihIndex?.observations ?? []).length)
      opts.push({ value: "cpih-index", label: "CPIH index" });
    return opts;
  }, [pack]);
  const activeDataSeries =
    dataSeriesOptions.find((o) => o.value === dataSeries)?.value ??
    dataSeriesOptions[0]?.value ??
    "";
  const coicopRanks = useMemo(
    () =>
      coicopMonth
        ? coicopRanksForMonth(
            categoryPacks,
            coicopMonth,
            catLens === "contributions" ? CPIH_CONTRIBUTION_DIVISIONS : CPIH_COICOP_DIVISIONS,
          )
        : [],
    [categoryPacks, coicopMonth, catLens],
  );
  const headlineAtCoicop = useMemo(
    () => (coicopMonth ? valueAtMonth(pack.cpihRate?.observations ?? [], coicopMonth) : null),
    [pack.cpihRate, coicopMonth],
  );
  const contribSum = useMemo(
    () => (catLens === "contributions" ? coicopRanks.reduce((s, r) => s + r.v, 0) : null),
    [catLens, coicopRanks],
  );
  const coicopLabel = coicopMonth ? labelMonth(coicopMonth) : null;
  const fastest = coicopRanks[0] ?? null;
  const slowest = coicopRanks[coicopRanks.length - 1] ?? null;
  const categoryFmt = catLens === "contributions" ? fmtPp : fmtRate;

  /* ——— 04 Everyday basket ——— */
  const basketRows = useMemo(() => pack.basket?.observations ?? [], [pack.basket]);
  const basketMonth = useMemo(() => basketLatestMonth(basketRows), [basketRows]);
  const basketLabel = basketMonth ? labelMonth(basketMonth) : null;
  const basket = useBasket(basketRows, searchParams);
  const basketShowOptions: PrintOption<string>[] = useMemo(
    () => [
      { value: "featured", label: "Featured" },
      { value: "basket", label: "Your basket" },
      { value: "all", label: "All items" },
      ...BASKET_GROUPS.map((g) => ({ value: g.id, label: g.label })),
    ],
    [],
  );
  const basketYears: PrintOption<string>[] = useMemo(
    () => basket.years.map((y) => ({ value: y, label: y })),
    [basket.years],
  );

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "index") {
      if (!worth) return [];
      const now = fmtT(worth.latestT);
      return [
        {
          label: `£1 in ${worth.year}`,
          value: fmtPounds(worth.ratio),
          note: `What the same things cost in ${now}`,
        },
        {
          label: `£1 in ${now}`,
          value: fmtPence(1 / worth.ratio),
          note: `What it would have bought in ${worth.year}`,
        },
        {
          label: "Prices a year",
          value: `+${(worth.perYear * 100).toFixed(1)}%`,
          note: `Average rise since ${worth.year}`,
        },
      ];
    }
    if (view === "rate") {
      return [
        {
          label: `${measureLabel} annual rate`,
          value: latestRate?.value != null ? fmtRate(latestRate.value) : "—",
          note: latestRateLabel ?? `${measureLabel} not available`,
        },
        {
          label: "Change on a year",
          value: yoyPp != null ? `${yoyPp >= 0 ? "+" : "−"}${Math.abs(yoyPp).toFixed(1)}` : "—",
          note: "Percentage points, against the same month a year earlier",
        },
        {
          label: "Highest",
          value: peak ? fmtRate(peak.v) : "—",
          note: peak ? fmtT(peak.t) : "—",
        },
      ];
    }
    if (view === "categories") {
      if (catLens === "contributions") {
        return [
          {
            label: "Largest push",
            value: fastest ? fmtPp(fastest.v) : "—",
            note: fastest ? fastest.label : "Contributions not available",
          },
          {
            label: "Smallest / drag",
            value: slowest ? fmtPp(slowest.v) : "—",
            note: slowest ? slowest.label : "—",
          },
          {
            label: "CPIH all items",
            value: headlineAtCoicop != null ? fmtRate(headlineAtCoicop) : "—",
            note:
              contribSum != null
                ? `Groups add up to ${fmtPp(contribSum)} · ${coicopLabel ?? ""}`
                : (coicopLabel ?? "—"),
          },
        ];
      }
      return [
        {
          label: "Rising fastest",
          value: fastest ? fmtRate(fastest.v) : "—",
          note: fastest ? fastest.label : "Categories not available",
        },
        {
          label: "Rising slowest",
          value: slowest ? fmtRate(slowest.v) : "—",
          note: slowest ? slowest.label : "—",
        },
        {
          label: "CPIH all items",
          value: headlineAtCoicop != null ? fmtRate(headlineAtCoicop) : "—",
          note: coicopLabel ?? "—",
        },
      ];
    }
    if (view === "basket") return basket.figures;
    return [];
  }, [
    view,
    worth,
    measureLabel,
    latestRate,
    latestRateLabel,
    yoyPp,
    peak,
    catLens,
    fastest,
    slowest,
    headlineAtCoicop,
    contribSum,
    coicopLabel,
    basket.figures,
  ]);

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "index") {
    foot = (
      <FigureRecord
        terms={[...RATE_TERMS]}
        source={economySource(
          measure === "cpih" ? ECONOMY_SOURCE.cpihIndex : ECONOMY_SOURCE.cpiIndex,
          "United Kingdom",
          economyPeriod("monthly", latestIdxLabel),
        )}
        definition={`What £1 of spending in a chosen year costs today, worked out from the ONS ${measureLabel} all-items price index. ONS does not publish these pound figures; they are calculated here.`}
        method={[
          `£1 in a chosen year = the index in the latest month ÷ the average index across that year.`,
          "This is the average for everything households buy. Single items, such as bread or petrol, rose by more or less.",
          "Years start in 1988, the first full year both indexes cover.",
        ]}
      />
    );
    body = !worth ? (
      <EmptyStage label="Not available">
        {measureLabel} index figures are not available right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <PoundBuys worth={worth} measure={measureLabel} />
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Cost of £1 of {worth.year} spending · <Term slug={measure}>{measureLabel}</Term> · {worth.year}–{fmtT(worth.latestT)} · £
          </h3>
          <TimeChart
            key={`pound-${measure}-${worth.year}`}
            label={`Cost of £1 of ${worth.year} spending, ${measureLabel}`}
            series={[{ id: `pound-${measure}`, label: `£1 of ${worth.year} spending`, points: worth.path }]}
            cadence="monthly"
            kind="line"
            zero
            showTable={false}
            format={fmtPounds}
          />
        </section>
      </div>
    );
  } else if (view === "data") {
    foot = (
      <FigureRecord
        terms={[...DATA_TERMS]}
        source={economySource(ECONOMY_SOURCE.consumerPrices, "United Kingdom", economyPeriod("monthly"))}
        definition="One Ready ONS consumer-price series at a time — pick it from the Series menu."
        method="The Series menu shows one Ready table in full. Charts on the other tabs use final months only."
      />
    );
    body = <InflationData pack={pack} seriesId={activeDataSeries} />;
  } else if (view === "categories") {
    const isContrib = catLens === "contributions";
    foot = (
      <FigureRecord
        terms={[...CATEGORY_TERMS]}
        source={economySource(
          isContrib ? ECONOMY_SOURCE.contributions : ECONOMY_SOURCE.coicop,
          "United Kingdom",
          economyPeriod("monthly", coicopLabel),
        )}
        definition={
          isContrib
            ? "How many percentage points each broad group of goods and services added to the CPIH all-items annual rate in the chosen month."
            : "How fast prices rose in each broad group of goods and services in the chosen month, measured by CPIH — not how many points each group added to the headline."
        }
        method={
          isContrib
            ? [
                "A group's contribution depends on both its price change and its weight in the basket. Twelve groups, as ONS publishes them; together they add up to the all-items rate, give or take rounding.",
                "Charts use final months only; the newest ONS month is held back until it is final.",
              ]
            : [
                "Twelve broad groups of goods and services. The dashed line is the CPIH all-items rate for the same month.",
                "Charts use final months only; the newest ONS month is held back until it is final.",
              ]
        }
      />
    );
    body = !coicopRanks.length || !coicopMonth ? (
      <EmptyStage label="Not available">
        CPIH category {isContrib ? "contributions" : "rates"} are not available right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {isContrib
              ? `CPIH contribution by category · ${coicopLabel} · pp`
              : `CPIH annual rate by category · ${coicopLabel} · %`}
          </h3>
          <RankBars
            key={`coicop-${catLens}-${coicopMonth}`}
            label={
              isContrib
                ? `CPIH contribution by category, ${coicopLabel}`
                : `CPIH annual rate by category, ${coicopLabel}`
            }
            rows={coicopRanks}
            reference={
              !isContrib && headlineAtCoicop != null
                ? { label: "CPIH all items", v: headlineAtCoicop }
                : undefined
            }
            format={categoryFmt}
          />
        </section>
      </div>
    );
  } else if (view === "basket") {
    foot = (
      <FigureRecord
        terms={[...BASKET_TERMS]}
        source={economySource(
          ECONOMY_SOURCE.averagePrices,
          "United Kingdom",
          economyPeriod("monthly", basketLabel),
        )}
        definition="Official average prices of everyday goods from the ONS shopping prices comparison tool — how average prices moved, not a shop's shelf price. Official statistics in development."
        method={[
          "Prices run from January 2018 to January 2025. Years compare January prices; Play the months steps through every month. ONS changed how it measures average prices after January 2025, so later months are not joined on. Eggs start in January 2022.",
          "Featured shows ten everyday items drawn for this page. Search covers 326 items from the same ONS release; clothing and recreation are not included yet.",
          "Your basket total is each quantity times the average price in that month. Items without a price in either month are left out of the total and named under Change.",
        ]}
      />
    );
    body = !basket.months.length ? (
      <EmptyStage label="Not available">
        Everyday average prices are not available right now.
      </EmptyStage>
    ) : (
      <BasketWall
        tags={basket.tags}
        from={basket.from}
        to={basket.to}
        playing={basket.playing}
        onStep={basket.step}
        totals={basket.totals}
        matched={basket.shelf.matched}
        empty={
          basket.search.trim()
            ? `No item matches “${basket.search.trim()}”.`
            : "Your basket is empty. Add items with + from Featured or a group."
        }
      />
    );
  } else {
    foot = (
      <FigureRecord
        terms={[...RATE_TERMS]}
        source={economySource(
          measure === "cpih" ? ECONOMY_SOURCE.cpihRate : ECONOMY_SOURCE.cpiRate,
          "United Kingdom",
          economyPeriod("monthly", latestRateLabel),
        )}
        definition="The annual rate is how much prices rose compared with the same month a year earlier, for all items in the chosen measure."
        method="CPI and CPIH usually move together. They part when home-owning costs rise faster or slower than other prices. Charts use final months only; the newest ONS month is held back until it is final."
      />
    );
    if (!ratePts.length) {
      body = (
        <EmptyStage label="Not available">
          {measureLabel} annual rates are not available right now.
        </EmptyStage>
      );
    } else {
      const first = ratePts[0]!;
      const last = ratePts[ratePts.length - 1]!;
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              <Term slug={measure}>{measureLabel}</Term> annual rate · {fmtT(first.t)}–{fmtT(last.t)} · %
            </h3>
            <TimeChart
              key={`rate-${measure}-${rateFromYear}`}
              label={`${measureLabel} annual rate`}
              series={[{ id: seriesKey, label: `${measureLabel} annual rate`, points: ratePts }]}
              cadence="monthly"
              kind="line"
              zero
              showTable={false}
              format={fmtRate}
            />
          </section>
        </div>
      );
    }
  }

  const followViews = new Set(["rate", "index", "categories", "basket", "data"]);

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      <FigureStrip figures={figures} />
      <ControlRow label="Inflation controls">
        {view === "index" && yearOptions.length ? (
          <MenuControl
            label="Year"
            value={String(year)}
            options={yearOptions}
            onChange={(id) => sync({ year: id })}
          />
        ) : null}
        {view === "rate" || view === "index" ? (
          <MenuControl
            label="Measure"
            value={measure}
            options={MEASURE_OPTIONS}
            onChange={(id) => sync({ measure: id })}
          />
        ) : null}
        {view === "rate" && rateFromOpts.length ? (
          <MenuControl
            label="From"
            value={String(rateFromYear)}
            options={rateFromOpts}
            onChange={(id) => sync({ from: id })}
          />
        ) : null}
        {view === "categories" ? (
          <>
            <MenuControl
              label="Lens"
              value={catLens}
              options={CATEGORY_LENS_OPTIONS}
              onChange={(id) => sync({ cat: id as CategoryLens })}
            />
            {coicopMonthOptions.length && coicopMonth ? (
              <MenuControl
                label="Month"
                value={coicopMonth}
                options={coicopMonthOptions}
                onChange={(id) => sync({ month: id })}
              />
            ) : null}
          </>
        ) : null}
        {view === "basket" && basketYears.length ? (
          <>
            <MenuControl label="From" value={basket.from.slice(0, 4)} options={basketYears} onChange={basket.chooseFromYear} />
            <MenuControl label="To" value={basket.to.slice(0, 4)} options={basketYears} onChange={basket.chooseToYear} />
            <MenuControl label="Show" value={basket.show} options={basketShowOptions} onChange={basket.chooseShow} />
            <SearchControl
              label="Find an item"
              value={basket.search}
              onChange={basket.chooseSearch}
              placeholder={`Search ${basket.catalogueSize} items`}
            />
            <TextButton onClick={basket.play} pressed={basket.playing}>
              {basket.playing ? "Pause" : "Play the months"}
            </TextButton>
          </>
        ) : null}
        {view === "data" && dataSeriesOptions.length ? (
          <MenuControl
            label="Series"
            value={activeDataSeries}
            options={dataSeriesOptions}
            onChange={(id) => sync({ series: id })}
          />
        ) : null}
        <ResetButton
          onClick={() => {
            // Keep the active view tab — Reset clears this page's filters only.
            if (view === "basket") basket.reset();
            sync({
              measure: "cpi",
              year: String(DEFAULT_YEAR),
              cat: "contributions",
              month: "",
              from: "",
              series: "",
            });
          }}
        />
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          followViews.has(view) ? (
            <EconomyStageFollow domain="inflation" view={view} label={`Inflation · ${viewLabel(view)}`} />
          ) : undefined
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

function InflationData({ pack, seriesId }: { pack: InflationPack; seriesId: string }) {
  const tables = [
    { id: "cpi-inflation", title: "CPI annual rate · %", pack: pack.cpiRate },
    { id: "cpih-inflation", title: "CPIH annual rate · %", pack: pack.cpihRate },
    { id: "cpi-index", title: "CPI index · 2015 = 100", pack: pack.cpiIndex },
    { id: "cpih-index", title: "CPIH index · 2015 = 100", pack: pack.cpihIndex },
  ];
  const tbl = tables.find((x) => x.id === seriesId) ?? tables.find((x) => (x.pack?.observations.length ?? 0) > 0);
  if (!tbl) {
    return <EmptyStage label="Not available">Inflation series are not available right now.</EmptyStage>;
  }
  const rows = finalObs(tbl.pack?.observations ?? []).slice().reverse();
  if (!rows.length) {
    return <EmptyStage label="Not available">This series is not available right now.</EmptyStage>;
  }
  return (
    <div className={s.stack}>
      <div className={t.tableGroup}>
        <p className={t.stageTitle}>{tbl.title}</p>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${tbl.id}-${r.period_start}`}>
                  <td>{fmtT(monthlyPoints([r])[0]!.t)}</td>
                  <td>
                    {tbl.id.includes("index") ? fmtIndex(r.value as number) : fmtRate(r.value as number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

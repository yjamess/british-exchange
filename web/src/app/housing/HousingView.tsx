"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { SeriesChart } from "@/components/SeriesChart";
import { SourcePanel } from "@/components/SourcePanel";
import { HpiMeasureExplorer } from "@/components/housing/HpiMeasureExplorer";
import { RegionPriceExplorer } from "@/components/housing/RegionPriceExplorer";
import type { IndicatorMeta, Observation, ObservationsResponse } from "@/lib/api";
import { AsciiField } from "../design-lab/imprint/AsciiField";
import { Stamp } from "../design-lab/imprint/Stamp";
import s from "./housing.module.css";

export type HousingBundle = {
  meta: IndicatorMeta;
  observations: ObservationsResponse;
};

export type HousingLatest = {
  value: string;
  period: string;
};

type Props = {
  housePrice: HousingBundle | null;
  pipr: HousingBundle | null;
  affordability: HousingBundle | null;
  completions: HousingBundle | null;
  stockAllRows: Observation[];
  stock: HousingBundle | null;
  regional: HousingBundle | null;
  measures: HousingBundle | null;
  latest: {
    price: HousingLatest | null;
    afford: HousingLatest | null;
    complete: HousingLatest | null;
    rent: HousingLatest | null;
  };
};

const QUESTIONS = [
  { id: "cost", n: "01", title: "What does housing cost?", blurb: "Sale prices, rents, property types" },
  { id: "afford", n: "02", title: "Who can afford it?", blurb: "Prices relative to earnings" },
  { id: "build", n: "03", title: "What are we building?", blurb: "Completions, stock and tenure" },
  { id: "vary", n: "04", title: "How does it vary?", blurb: "Regions, local areas and change" },
] as const;

const INK = "#0d1258";
const PAPER = "#efebe1";

export function HousingView({
  housePrice,
  pipr,
  affordability,
  completions,
  stockAllRows,
  stock,
  regional,
  measures,
  latest,
}: Props) {
  const vars = {
    "--ink": INK,
    "--deep": "#05072a",
    "--paper": PAPER,
  } as CSSProperties;

  return (
    <div className={s.root} style={vars}>
      <div className={s.frame} aria-hidden="true">
        <span className={`${s.read} ${s.rTL}`}>Housing &amp; Land</span>
        <span className={`${s.read} ${s.rTR}`}>British Observatory</span>
        <span className={`${s.read} ${s.rBL}`}>Overview → Explore → Data</span>
        <span className={`${s.read} ${s.rBR}`}>Ready series</span>
      </div>

      <section className={s.hero}>
        <nav className={s.nav} aria-label="Primary">
          <Link href="/">Observatory</Link>
          <Link href="/design-lab/observatory" className={s.mark}>
            <span>British</span>
            <span>Observatory</span>
          </Link>
          <Link href="/housing" aria-current="page">
            Housing
          </Link>
          <Link href="/economy">Economy</Link>
          <Link href="/energy">Energy</Link>
          <Link href="#data">Data</Link>
        </nav>

        <div className={s.heroGrid}>
          <div>
            <p className={s.kicker}>The Britain Exchange · Housing &amp; Land</p>
            <h1 className={s.h1}>
              The state of
              <br />
              British housing.
            </h1>
            <p className={s.lede}>
              Explore prices, affordability, renting, housing supply and the
              places behind the numbers — from a composed overview to the
              official record.
            </p>
          </div>
          <div className={s.stampWrap}>
            <Stamp
              label="Housing"
              source="terraces"
              field={INK}
              ink={PAPER}
              highlight={PAPER}
              denomination="HO"
              caption="Letterpress · terraces"
              size="md"
            />
          </div>
        </div>
      </section>

      <div className={s.dissolve} aria-hidden="true" style={{ background: PAPER }}>
        <AsciiField
          className={s.fill}
          source="dissolve"
          fg={INK}
          accent={INK}
          bg={PAPER}
          cell={11}
          lens={false}
          invert
          motion
          flow={0.28}
        />
      </div>

      <div className={s.paper}>
        <div className={s.inner}>
          <section className={s.figures} aria-label="Selected figures">
            {latest.price ? (
              <div className={s.figure}>
                <p className={s.figureLabel}>UK average house price</p>
                <p className={s.figureValue}>{latest.price.value}</p>
                <p className={s.figureMeta}>{latest.price.period}</p>
              </div>
            ) : null}
            {latest.afford ? (
              <div className={s.figure}>
                <p className={s.figureLabel}>Price to earnings</p>
                <p className={s.figureValue}>{latest.afford.value}</p>
                <p className={s.figureMeta}>England · {latest.afford.period}</p>
              </div>
            ) : null}
            {latest.complete ? (
              <div className={s.figure}>
                <p className={s.figureLabel}>Completions</p>
                <p className={s.figureValue}>{latest.complete.value}</p>
                <p className={s.figureMeta}>England · {latest.complete.period}</p>
              </div>
            ) : null}
            {latest.rent ? (
              <div className={s.figure}>
                <p className={s.figureLabel}>Private rent index</p>
                <p className={s.figureValue}>{latest.rent.value}</p>
                <p className={s.figureMeta}>UK · {latest.rent.period}</p>
              </div>
            ) : null}
          </section>

          <section className={s.questions} aria-label="Explore by question">
            {QUESTIONS.map((q) => (
              <a key={q.id} className={s.question} href={`#${q.id}`}>
                <span className={s.questionNo}>{q.n}</span>
                <span className={s.questionTitle}>{q.title}</span>
                <span className={s.questionBlurb}>{q.blurb}</span>
              </a>
            ))}
          </section>

          <section className={s.module} aria-labelledby="standout-heading">
            <header className={s.chapterHead}>
              <p className={s.chapterNo}>01</p>
              <div>
                <p className={s.kicker} style={{ color: "inherit", opacity: 0.55 }}>
                  Overview · standout
                </p>
                <h2 id="standout-heading" className={s.h2}>
                  UK house prices by type
                </h2>
                <p className={s.chapterLede}>
                  Switch between average price, property types and sales volume —
                  from the UK HPI file we already hold.
                </p>
              </div>
            </header>
            <span className={s.geo}>United Kingdom</span>
            {measures ? (
              <>
                <div className={s.chartCard}>
                  <HpiMeasureExplorer rows={measures.observations.observations} />
                </div>
                <SourcePanel
                  meta={measures.meta}
                  chart={measures.observations.chart}
                  observationCount={measures.observations.count}
                  note="Expanded measures for exploration — same pinned UK HPI source."
                />
              </>
            ) : housePrice ? (
              <div className={s.chartCard}>
                <SeriesChart
                  rows={housePrice.observations.observations}
                  unit={housePrice.meta.unit}
                  seriesLabel={housePrice.meta.title}
                  seriesId={housePrice.meta.series_id}
                  geography={housePrice.meta.geography}
                  frequency={housePrice.meta.frequency}
                  chart={housePrice.observations.chart}
                />
              </div>
            ) : (
              <div className={s.error} role="alert">
                <strong>API unavailable.</strong>
                <code>uv run uvicorn britain_exchange.api:app --reload</code>
              </div>
            )}
          </section>

          <section className={s.module} id="vary" aria-labelledby="vary-heading">
            <header className={s.chapterHead}>
              <p className={s.chapterNo}>02</p>
              <div>
                <p className={s.kicker} style={{ color: "inherit", opacity: 0.55 }}>
                  Explore · how does it vary?
                </p>
                <h2 id="vary-heading" className={s.h2}>
                  Compare places
                </h2>
                <p className={s.chapterLede}>
                  Regional average prices. Select up to four places, then open
                  the dataset profile for the citable record.
                </p>
              </div>
            </header>
            {regional ? (
              <>
                <div className={s.chartCard}>
                  <RegionPriceExplorer
                    rows={regional.observations.observations}
                    unit={regional.meta.unit}
                  />
                </div>
                <p className={s.dataLink}>
                  <Link href="/housing/data/house-prices-by-region">
                    Open dataset profile →
                  </Link>
                </p>
              </>
            ) : (
              <p className={s.chapterLede}>Regional price series unavailable.</p>
            )}
          </section>

          <section className={s.module} id="cost" aria-labelledby="cost-heading">
            <header className={s.chapterHead}>
              <p className={s.chapterNo}>03</p>
              <div>
                <p className={s.kicker} style={{ color: "inherit", opacity: 0.55 }}>
                  Topic · what does housing cost?
                </p>
                <h2 id="cost-heading" className={s.h2}>
                  Prices and rents
                </h2>
                <p className={s.chapterLede}>
                  National sale prices and the private rental price index.
                </p>
              </div>
            </header>
            <span className={s.geo}>United Kingdom</span>
            {housePrice ? (
              <>
                <div className={s.chartCard}>
                  <SeriesChart
                    rows={housePrice.observations.observations}
                    unit={housePrice.meta.unit}
                    seriesLabel={housePrice.meta.title}
                    seriesId={housePrice.meta.series_id}
                    geography={housePrice.meta.geography}
                    frequency={housePrice.meta.frequency}
                    chart={housePrice.observations.chart}
                    sourceNote="Average price — not a local or postcode figure."
                  />
                </div>
                <p className={s.dataLink}>
                  <Link href="/housing/data/uk-average-house-price">
                    Open dataset profile →
                  </Link>
                </p>
              </>
            ) : null}
            {pipr ? (
              <>
                <div className={s.chartCard}>
                  <SeriesChart
                    rows={pipr.observations.observations}
                    unit={pipr.meta.unit}
                    seriesLabel={pipr.meta.title}
                    seriesId={pipr.meta.series_id}
                    geography={pipr.meta.geography}
                    frequency={pipr.meta.frequency}
                    chart={pipr.observations.chart}
                  />
                </div>
                <p className={s.dataLink}>
                  <Link href="/housing/data/private-rental-price-index">
                    Open dataset profile →
                  </Link>
                </p>
              </>
            ) : null}
          </section>

          <section className={s.module} id="afford" aria-labelledby="afford-heading">
            <header className={s.chapterHead}>
              <p className={s.chapterNo}>04</p>
              <div>
                <p className={s.kicker} style={{ color: "inherit", opacity: 0.55 }}>
                  Topic · who can afford it?
                </p>
                <h2 id="afford-heading" className={s.h2}>
                  House price to earnings
                </h2>
                <p className={s.chapterLede}>
                  Median house price relative to median workplace-based
                  full-time earnings (ASHE).
                </p>
              </div>
            </header>
            <span className={s.geo}>England only</span>
            {affordability ? (
              <>
                <div className={s.chartCard}>
                  <SeriesChart
                    rows={affordability.observations.observations}
                    unit={affordability.meta.unit}
                    seriesLabel={affordability.meta.title}
                    seriesId={affordability.meta.series_id}
                    geography={affordability.meta.geography}
                    frequency={affordability.meta.frequency}
                    chart={affordability.observations.chart}
                  />
                </div>
                <p className={s.dataLink}>
                  <Link href="/housing/data/house-price-to-earnings-ratio">
                    Open dataset profile →
                  </Link>
                </p>
              </>
            ) : null}
          </section>

          <section className={s.module} id="build" aria-labelledby="build-heading">
            <header className={s.chapterHead}>
              <p className={s.chapterNo}>05</p>
              <div>
                <p className={s.kicker} style={{ color: "inherit", opacity: 0.55 }}>
                  Topic · what are we building?
                </p>
                <h2 id="build-heading" className={s.h2}>
                  Completions and stock
                </h2>
                <p className={s.chapterLede}>
                  New-build completions and estimated dwelling stock — not net
                  additional dwellings.
                </p>
              </div>
            </header>
            <span className={s.geo}>England only</span>
            {completions ? (
              <>
                <div className={s.chartCard}>
                  <SeriesChart
                    rows={completions.observations.observations}
                    unit={completions.meta.unit}
                    seriesLabel={completions.meta.title}
                    seriesId={completions.meta.series_id}
                    geography={completions.meta.geography}
                    frequency={completions.meta.frequency}
                    chart={completions.observations.chart}
                  />
                </div>
                <p className={s.dataLink}>
                  <Link href="/housing/data/housing-completions">
                    Open dataset profile →
                  </Link>
                </p>
              </>
            ) : null}
            {stock && stockAllRows.length > 0 ? (
              <>
                <div className={s.chartCard}>
                  <SeriesChart
                    rows={stockAllRows}
                    unit={stock.meta.unit}
                    seriesLabel="Dwelling stock — all dwellings"
                    seriesId={stock.meta.series_id}
                    geography={stock.meta.geography}
                    frequency={stock.meta.frequency}
                    chart={stock.observations.chart}
                  />
                </div>
                <p className={s.dataLink}>
                  <Link href="/housing/data/dwelling-stock-by-tenure">
                    Open dataset profile →
                  </Link>
                </p>
              </>
            ) : null}
          </section>

          <section className={s.module} id="data" aria-labelledby="data-heading">
            <header className={s.chapterHead}>
              <p className={s.chapterNo}>06</p>
              <div>
                <p className={s.kicker} style={{ color: "inherit", opacity: 0.55 }}>
                  Data · examine the records
                </p>
                <h2 id="data-heading" className={s.h2}>
                  Dataset profiles
                </h2>
                <p className={s.chapterLede}>
                  Permanent addresses for methodology, publisher links and
                  downloads. Comprehensiveness lives here.
                </p>
              </div>
            </header>
            <ul className={s.profileList}>
              {[
                ["uk-average-house-price", "UK average house price"],
                ["uk-hpi-measures", "UK HPI measures (type & volume)"],
                ["house-prices-by-region", "House prices by region"],
                ["private-rental-price-index", "Private rental price index"],
                ["house-price-to-earnings-ratio", "House price to earnings"],
                ["housing-completions", "Housing completions"],
                ["dwelling-stock-by-tenure", "Dwelling stock by tenure"],
              ].map(([id, label]) => (
                <li key={id}>
                  <Link href={`/housing/data/${id}`}>{label}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={s.concept} aria-labelledby="atlas-heading">
            <span className={s.conceptBadge}>Concept · not verified</span>
            <p className={s.kicker} style={{ color: "inherit", opacity: 0.55 }}>
              Later · House Price Atlas
            </p>
            <h2 id="atlas-heading" className={s.h2}>
              Property-level map
            </h2>
            <p className={s.chapterLede}>
              Grows from the regional explorer once Price Paid and mapping
              licences are Ready — not instead of charts done well.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

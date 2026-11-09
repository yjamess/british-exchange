"use client";

/**
 * Ages: one chart at a time. The breakdown sits inside the figure.
 * The domain Data tab lists the series. The numbers for this chart sit under it.
 */

import { ControlRow, MenuControl, explorerClasses as t } from "../../..";
import { ChangeRows, RankBars } from "../../../instrument/TimeChart";
import type { EhsHousingCostsByAge, EhsMortgageByAge } from "../../load";
import x from "../explorer.module.css";
import s from "./affordability.module.css";

export type AgesDisplay = "share" | "place" | "mortgage" | "data";

const AGE_LABEL: Record<string, string> = {
  "16 to 24": "16–24",
  "16 to 34": "16–34",
  "25 to 34": "25–34",
  "35 to 44": "35–44",
  "45 to 54": "45–54",
  "55 to 64": "55–64",
  "65 and over": "65 and over",
  all: "All ages",
};

const pct = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(1)}%`;
const whole = (value: number | null) =>
  value == null ? "—" : value.toLocaleString("en-GB");

const READING: Record<AgesDisplay, string> = {
  share:
    "Mean share of gross household income spent on the mortgage or the rent, for households in England that pay one. The open square is 2014–15 and the solid square is 2024–25. The survey publishes ages 16–34 and 65 or over.",
  place:
    "Mean private rent as a share of income for households aged 16–34, in London, in England, and in the rest of England.",
  mortgage:
    "Mortgage payment as a share of household income for owners buying with a mortgage. This series includes ages 35–64. Ages 16–24 rest on a small sample.",
  data: "A mean is the average share and a median is the middle household. The first table is every household paying rent or a mortgage. The second is owners buying with a mortgage, and it includes ages 35–64.",
};

export function agesReading(display: AgesDisplay): string {
  return READING[display];
}

export function AgesView({
  display,
  costs,
  mortgage,
  onBreakdown,
}: {
  display: AgesDisplay;
  costs: EhsHousingCostsByAge | null;
  mortgage: EhsMortgageByAge | null;
  /** Income share, private rent, or mortgage. Data is the domain tab, not a choice here. */
  onBreakdown?: (value: "share" | "place" | "mortgage") => void;
}) {
  const latestMortgage = mortgage?.years.at(-1);
  // Older links used ages=data. That table now sits under the figure, open.
  const breakdown = display === "data" ? "share" : display;
  const rows = latestMortgage?.rows ?? [];
  return (
    <div className={s.ages}>
      <ControlRow label="Ages breakdown">
        <MenuControl
          label="Breakdown"
          value={breakdown}
          options={[
            { value: "share", label: "Income share" },
            { value: "place", label: "Private rent" },
            { value: "mortgage", label: "Mortgage" },
          ]}
          onChange={(value) => onBreakdown?.(value)}
        />
      </ControlRow>
      {breakdown === "share" && <ShareChart costs={costs} />}
      {breakdown === "place" && <PlaceChart costs={costs} />}
      {breakdown === "mortgage" && <MortgageChart mortgage={mortgage} />}
      <details
        className={s.agesTable}
        {...(display === "data" ? { open: true } : {})}
      >
        <summary className="bo-disclosure">All ages as a table</summary>
        <DataTables
          costs={costs}
          latestYear={latestMortgage?.year}
          rows={rows}
        />
      </details>
    </div>
  );
}

function ShareChart({ costs }: { costs: EhsHousingCostsByAge | null }) {
  const rows =
    costs?.cohorts.flatMap((cohort) => {
      const england = cohort.rows.find((row) => row.place === "all households");
      if (!england) return [];
      return england.tenures.flatMap((tenure) => {
        const from = tenure.earlier.mean;
        const to = tenure.latest.mean;
        if (from == null || to == null) return [];
        return [
          {
            id: `${cohort.age}-${tenure.id}`,
            label: `${AGE_LABEL[cohort.age] ?? cohort.age} · ${tenure.label.toLowerCase()}`,
            from,
            to,
          },
        ];
      });
    }) ?? [];
  rows.sort((a, b) => b.to - a.to);
  if (!costs || rows.length === 0)
    return (
      <p className={x.pricePaidLead}>
        The age-cohort tables are not loaded on this copy.
      </p>
    );
  return (
    <ChangeRows
      label={`Mean housing cost as a share of gross household income, England, ${costs.earlierYear} and ${costs.latestYear}`}
      rows={rows}
      fromLabel={costs.earlierYear}
      toLabel={`${costs.latestYear} · latest`}
      format={pct}
      axisFormat={(value) => `${value.toFixed(0)}%`}
    />
  );
}

function PlaceChart({ costs }: { costs: EhsHousingCostsByAge | null }) {
  const young = costs?.cohorts.find((cohort) => cohort.age === "16 to 34");
  const mean = (place: string) =>
    young?.rows
      .find((row) => row.place === place)
      ?.tenures.find((tenure) => tenure.id === "private-rent")?.latest.mean;
  const rows = [
    { id: "london", label: "London", v: mean("London") },
    { id: "england", label: "England", v: mean("all households") },
    {
      id: "rest",
      label: "Rest of England",
      v: mean("England excluding London"),
    },
  ].flatMap((row) =>
    row.v == null ? [] : [{ id: row.id, label: row.label, v: row.v }],
  );
  if (!costs || rows.length === 0)
    return (
      <p className={x.pricePaidLead}>
        The private-rent rows are not loaded on this copy.
      </p>
    );
  return (
    <RankBars
      label={`Mean private rent as a share of income, ages 16 to 34, ${costs.latestYear}`}
      rows={rows}
      format={pct}
    />
  );
}

function MortgageChart({ mortgage }: { mortgage: EhsMortgageByAge | null }) {
  const latest = mortgage?.years.at(-1);
  const rows = (latest?.rows ?? []).flatMap((row) =>
    row.incomeRatio == null
      ? []
      : [
          {
            id: row.age,
            label: AGE_LABEL[row.age] ?? row.age,
            v: row.incomeRatio,
          },
        ],
  );
  if (!latest || rows.length === 0)
    return (
      <p className={x.pricePaidLead}>
        The mortgage age table is not loaded on this copy.
      </p>
    );
  return (
    <RankBars
      label={`Mortgage payment as a share of household income by age, England, ${latest.year}`}
      rows={rows}
      format={(value) => `${value.toFixed(0)}%`}
    />
  );
}

function DataTables({
  costs,
  latestYear,
  rows,
}: {
  costs: EhsHousingCostsByAge | null;
  latestYear: string | undefined;
  rows: NonNullable<EhsMortgageByAge["years"][number]["rows"]>;
}) {
  return (
    <div className={s.agesData}>
      {costs && (
        <div className={x.tableSlot}>
          <div className={t.tableWrap}>
            <table
              className={t.table}
              aria-label={`Housing cost as a share of income, England, ${costs.earlierYear} and ${costs.latestYear}`}
            >
              <thead>
                <tr>
                  <th scope="col">Age</th>
                  <th scope="col">Housing cost</th>
                  <th scope="col">Mean {costs.latestYear}</th>
                  <th scope="col">Median {costs.latestYear}</th>
                  <th scope="col">Mean {costs.earlierYear}</th>
                  <th scope="col">Sample {costs.latestYear}</th>
                </tr>
              </thead>
              <tbody>
                {costs.cohorts.flatMap((cohort) => {
                  const england = cohort.rows.find(
                    (row) => row.place === "all households",
                  );
                  if (!england) return [];
                  return england.tenures.map((tenure) => (
                    <tr key={`${cohort.age}-${tenure.id}`}>
                      <th scope="row">{AGE_LABEL[cohort.age] ?? cohort.age}</th>
                      <td>{tenure.label}</td>
                      <td>{pct(tenure.latest.mean)}</td>
                      <td>{pct(tenure.latest.median)}</td>
                      <td>{pct(tenure.earlier.mean)}</td>
                      <td>{whole(tenure.latest.sample)}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <div className={x.tableSlot}>
          <div className={t.tableWrap}>
            <table
              className={t.table}
              aria-label={`Mortgage payment by age, England, ${latestYear}`}
            >
              <thead>
                <tr>
                  <th scope="col">Age</th>
                  <th scope="col">Mortgage as % of income</th>
                  <th scope="col">Mean payment · £ / week</th>
                  <th scope="col">Households · thousands</th>
                  <th scope="col">Sample</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.age}>
                    <th scope="row">{AGE_LABEL[row.age] ?? row.age}</th>
                    <td>
                      {row.incomeRatio == null
                        ? "—"
                        : `${row.incomeRatio.toFixed(0)}%`}
                    </td>
                    <td>{whole(row.meanWeekly)}</td>
                    <td>{whole(row.householdsThousands)}</td>
                    <td>{whole(row.sample)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Stock → Data.
 * The other tabs draw tenure, accommodation type and vacancy.
 * This page lists those series, not only the all-dwellings total.
 */

import { useId } from "react";
import { fmt, fmtT, type Pt } from "../../../data";
import { explorerClasses as t } from "../../..";
import type { HousingV1 } from "../../load";
import s from "./stock.module.css";

function byYear(points: Pt[]): Map<number, number> {
  return new Map(points.map((p) => [Math.floor(p.t + 1e-6), p.v]));
}

function count(v: number | undefined): string {
  return v == null ? "—" : fmt.count(v);
}

function share(part: number, whole: number): string {
  return whole > 0 ? fmt.pct((part / whole) * 100, 1) : "—";
}

export function StockData({ data }: { data: HousingV1 }) {
  const tenure = data.tenure;
  const vacants = byYear(data.vacancy.all);
  const longTerm = byYear(data.vacancy.longTerm);
  const stock = byYear(data.allDwellings);
  const vacancyYears = [...new Set([...vacants.keys(), ...longTerm.keys()])].sort((a, b) => b - a);
  const titleId = useId();

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Each table is a series already used on this domain. Dwellings and households are not the same
        count. Second homes are the Council Taxbase series, not the vacant count. Geography steps
        through each 31 March; the district list on that tab stays on the latest Table 100 year.
      </p>

      <div className={s.block}>
        <p className={t.stageTitle} id={`${titleId}-tenure`}>
          Changing Housing Fabric · England dwelling tenure
        </p>
        <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={`${titleId}-tenure`}>
          <thead>
            <tr>
              <th scope="col">31 March</th>
              <th scope="col">Owner-occupied</th>
              <th scope="col">Private rented</th>
              <th scope="col">Social rented</th>
              <th scope="col">Three-group total</th>
              <th scope="col">All dwellings</th>
            </tr>
          </thead>
          <tbody>
            {[...tenure.years].reverse().map((year, rev) => {
              const i = tenure.years.length - 1 - rev;
              const owner = tenure.owner[i] ?? 0;
              const rented = tenure.privateRented[i] ?? 0;
              const social = tenure.social[i] ?? 0;
              const parts = owner + rented + social;
              return (
                <tr key={year}>
                  <th scope="row">{year}</th>
                  <td>{count(owner)}</td>
                  <td>{count(rented)}</td>
                  <td>{count(social)}</td>
                  <td>{count(parts)}</td>
                  <td>{count(tenure.total[i])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div className={s.block}>
        <p className={t.stageTitle} id={`${titleId}-types`}>
          Accommodation type · Census 2021 households
        </p>
        <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={`${titleId}-types`}>
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Type</th>
              <th scope="col">Households</th>
              <th scope="col">Share of that place</th>
            </tr>
          </thead>
          <tbody>
            {data.dwellingTypes.places.flatMap((place) => {
              const whole = place.parts.reduce((sum, part) => sum + part.count, 0);
              return place.parts.map((part) => (
                <tr key={`${place.id}-${part.id}`}>
                  <th scope="row">{place.label}</th>
                  <td>{part.label}</td>
                  <td>{fmt.count(part.count)}</td>
                  <td>{share(part.count, whole)}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div className={s.block}>
        <p className={t.stageTitle} id={`${titleId}-vacant`}>
          Vacant dwellings · England
        </p>
        <div className={t.tableWrap}>
        <table className={t.table} aria-labelledby={`${titleId}-vacant`}>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">All vacants · October</th>
              <th scope="col">Long-term · October</th>
              <th scope="col">All dwellings · 31 March</th>
              <th scope="col">Vacancy rate</th>
            </tr>
          </thead>
          <tbody>
            {vacancyYears.map((year) => {
              const vacant = vacants.get(year);
              const homes = stock.get(year);
              const rate = vacant != null && homes != null && homes > 0 ? (vacant / homes) * 100 : null;
              return (
                <tr key={year}>
                  <th scope="row">{year}</th>
                  <td>{count(vacant)}</td>
                  <td>{count(longTerm.get(year))}</td>
                  <td>{count(homes)}</td>
                  <td>{rate == null ? "—" : fmt.pct(rate, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {data.secondHomes.total.length > 0 && (
        <div className={s.block}>
          <p className={t.stageTitle} id={`${titleId}-second`}>
            Second homes · England
          </p>
          <div className={t.tableWrap}>
            <table className={t.table} aria-labelledby={`${titleId}-second`}>
              <thead>
                <tr>
                  <th scope="col">October</th>
                  <th scope="col">Total</th>
                  <th scope="col">No discount or premium</th>
                  <th scope="col">Subject to a discount</th>
                  <th scope="col">Charged a premium</th>
                </tr>
              </thead>
              <tbody>
                {[...data.secondHomes.total].reverse().map((point) => {
                  const year = Math.floor(point.t + 1e-6);
                  const at = (points: Pt[]) => points.find((p) => Math.floor(p.t + 1e-6) === year)?.v;
                  return (
                    <tr key={year}>
                      <th scope="row">{fmtT(point.t)}</th>
                      <td>{count(point.v)}</td>
                      <td>{count(at(data.secondHomes.noDiscountOrPremium))}</td>
                      <td>{count(at(data.secondHomes.subjectToDiscount))}</td>
                      <td>{count(at(data.secondHomes.chargedPremium))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

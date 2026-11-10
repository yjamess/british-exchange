"use client";

/**
 * Energy Imports & Security · Data tab.
 * One archive table per Ready series. Catalogue links stay in the Stage Notes foot.
 */

import { EmptyStage, explorerClasses as t } from "../template";
import { AnnualSeriesTable } from "./SeriesDataTables";
import {
  dependencySeries,
  fmtMw,
  gasStorageSeries,
  interconnectorBuiltCapacityRanks,
  interconnectorCapacityPinDate,
  ratioSeries,
  tradeGrossSeries,
  type ImportsPack,
} from "./imports-model";
import s from "./generation.module.css";

function quarterLabel(t: number): string {
  if (Number.isInteger(t)) return String(t);
  const year = Math.floor(t);
  const q = Math.round((t - year) * 4) + 1;
  return `Q${q} ${year}`;
}

export function ImportsData({ pack }: { pack: ImportsPack }) {
  const depRows = pack.dependency?.observations ?? [];
  const tradeRows = pack.trade?.observations ?? [];
  const fossilRows = pack.fossilDependency?.observations ?? [];
  const lowCarbonRows = pack.lowCarbonShare?.observations ?? [];
  const gasStorageRows = pack.gasStorage?.observations ?? [];
  const icCapRows = pack.interconnectorCapacity?.observations ?? [];

  const annualDep = dependencySeries(depRows, "annual");
  const fossil = ratioSeries(fossilRows, "annual", "fossil", "Fossil fuel dependency");
  const lowCarbon = ratioSeries(lowCarbonRows, "annual", "low-carbon", "Low carbon share");
  const tradeSeries = tradeGrossSeries(tradeRows);
  const stock = gasStorageSeries(gasStorageRows, "stock", "gas-stock", "Stock");
  const capacity = gasStorageSeries(
    gasStorageRows,
    "storage_capacity",
    "gas-capacity",
    "Storage capacity",
  );
  const icCapRanks = interconnectorBuiltCapacityRanks(icCapRows);
  const icCapPin = interconnectorCapacityPinDate(icCapRows);

  const any =
    annualDep.points.length > 0 ||
    fossil.points.length > 0 ||
    lowCarbon.points.length > 0 ||
    tradeSeries.some((series) => series.points.length > 0) ||
    stock.points.length > 0 ||
    capacity.points.length > 0 ||
    icCapRanks.length > 0;

  if (!any) {
    return (
      <EmptyStage label="Import series unavailable">
        Import dependency, trade and resilience figures are not available right now.
      </EmptyStage>
    );
  }

  return (
    <div className={s.stack}>
      {annualDep.points.length > 0 ? (
        <AnnualSeriesTable
          title="Energy import dependency"
          unit="% · annual"
          points={annualDep.points.map((p) => ({ t: p.t, v: p.v * 100 }))}
          format={(v) => v.toFixed(1)}
        />
      ) : null}
      {fossil.points.length > 0 ? (
        <AnnualSeriesTable
          title="Fossil fuel dependency"
          unit="% · annual"
          points={fossil.points.map((p) => ({ t: p.t, v: p.v * 100 }))}
          format={(v) => v.toFixed(1)}
        />
      ) : null}
      {lowCarbon.points.length > 0 ? (
        <AnnualSeriesTable
          title="Low carbon share"
          unit="% · annual"
          points={lowCarbon.points.map((p) => ({ t: p.t, v: p.v * 100 }))}
          format={(v) => v.toFixed(1)}
        />
      ) : null}

      {tradeSeries
        .filter((series) => series.points.length > 0)
        .map((series) => (
          <div key={series.id} className={t.tableGroup}>
            <p className={t.stageTitle}>
              {series.label} · ktoe · quarterly
            </p>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th scope="col">Period</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[...series.points]
                    .sort((a, b) => b.t - a.t)
                    .map((p) => (
                      <tr key={p.t}>
                        <th scope="row">{quarterLabel(p.t)}</th>
                        <td>
                          {p.v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {stock.points.length > 0 ? (
        <AnnualSeriesTable
          title="Natural gas stock"
          unit="GWh"
          points={stock.points}
          format={(v) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
          cadence="monthly"
        />
      ) : null}
      {capacity.points.length > 0 ? (
        <AnnualSeriesTable
          title="Natural gas storage capacity"
          unit="GWh"
          points={capacity.points}
          format={(v) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
          cadence="annual"
        />
      ) : null}

      {icCapRanks.length > 0 ? (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Built interconnector capacity · MW
            {icCapPin ? ` · as at ${new Date(`${icCapPin.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}` : ""}
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Import capacity</th>
                  <th scope="col">Export capacity</th>
                </tr>
              </thead>
              <tbody>
                {icCapRanks.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.label}</th>
                    <td>{fmtMw(r.value)}</td>
                    <td>{r.exportMw != null ? fmtMw(r.exportMw) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

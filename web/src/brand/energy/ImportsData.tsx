"use client";

/**
 * Energy Imports & Security · Data tab.
 * One archive table per Ready series. Catalogue links stay in the Stage Notes foot.
 */

import { EmptyStage } from "../template";
import { AnnualSeriesTable } from "./SeriesDataTables";
import {
  FOSSIL_FUEL_DEPENDENCY_ID,
  IMPORT_DEPENDENCY_ID,
  IMPORTS_EXPORTS_ID,
  INTERCONNECTOR_CAPACITY_ID,
  LOW_CARBON_ENERGY_SHARE_ID,
  NATURAL_GAS_STORAGE_ID,
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
import { explorerClasses as t } from "../template";

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
        Load the Ready packages for dependency, trade, resilience ratios, gas storage and
        interconnector capacity.
      </EmptyStage>
    );
  }

  return (
    <div className={s.stack}>
      <p className="bo-prose" style={{ margin: 0, maxWidth: "42rem" }}>
        Each table is one Ready series at its published frequency. Partner and corridor ranks stay
        on Lifelines and Connectors — not duplicated here as full country or corridor archives.
      </p>

      {annualDep.points.length > 0 ? (
        <AnnualSeriesTable
          title="Energy import dependency"
          unit={`% · annual · ${IMPORT_DEPENDENCY_ID}`}
          points={annualDep.points.map((p) => ({ t: p.t, v: p.v * 100 }))}
          format={(v) => v.toFixed(1)}
        />
      ) : null}
      {fossil.points.length > 0 ? (
        <AnnualSeriesTable
          title="Fossil fuel dependency"
          unit={`% · annual · ${FOSSIL_FUEL_DEPENDENCY_ID}`}
          points={fossil.points.map((p) => ({ t: p.t, v: p.v * 100 }))}
          format={(v) => v.toFixed(1)}
        />
      ) : null}
      {lowCarbon.points.length > 0 ? (
        <AnnualSeriesTable
          title="Low carbon share"
          unit={`% · annual · ${LOW_CARBON_ENERGY_SHARE_ID}`}
          points={lowCarbon.points.map((p) => ({ t: p.t, v: p.v * 100 }))}
          format={(v) => v.toFixed(1)}
        />
      ) : null}

      {tradeSeries
        .filter((series) => series.points.length > 0)
        .map((series) => (
          <AnnualSeriesTable
            key={series.id}
            title={series.label}
            unit={`ktoe · ${IMPORTS_EXPORTS_ID}`}
            points={series.points}
            format={(v) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
          />
        ))}

      {stock.points.length > 0 ? (
        <AnnualSeriesTable
          title="Natural gas stock"
          unit={`GWh · ${NATURAL_GAS_STORAGE_ID}`}
          points={stock.points}
          format={(v) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
        />
      ) : null}
      {capacity.points.length > 0 ? (
        <AnnualSeriesTable
          title="Natural gas storage capacity"
          unit={`GWh · ${NATURAL_GAS_STORAGE_ID}`}
          points={capacity.points}
          format={(v) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
        />
      ) : null}

      {icCapRanks.length > 0 ? (
        <div className={t.tableGroup}>
          <p className={t.stageTitle}>
            Built interconnector capacity · MW import TEC
            {icCapPin ? ` · pin ${icCapPin}` : ""} · {INTERCONNECTOR_CAPACITY_ID}
          </p>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Import TEC</th>
                  <th scope="col">Export (notes)</th>
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

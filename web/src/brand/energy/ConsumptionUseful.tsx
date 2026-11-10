"use client";

/**
 * Notion §3D — The Useful Energy Experiment.
 *
 * Analytical lab for energy going in → end uses → useful / lost.
 * One custom instrument (SplitFlow, RankBars grammar); every other panel is a
 * shared instrument. Notes live in the canvas FigureRecord foot.
 */

import { ChangeRows, RankBars, TimeChart } from "../instrument/TimeChart";
import { EmptyStage, TextButton, explorerClasses as t } from "../template";
import { SplitFlow } from "./SplitFlow";
import {
  bounds,
  flowItems,
  fmtCoef,
  fmtPct,
  latestYear,
  rejectedShare,
  sameEndUseElsewhere,
  scopeRows,
  sectorLabel,
  sensitivity,
  split,
  USEFUL_SECTORS,
  type Assume,
  type Overrides,
  type UsefulPack,
  type UsefulScope,
} from "./useful-model";
import s from "./generation.module.css";
import f from "./splitFlow.module.css";

/** One unit per panel: the time chart reads in Mtoe, tables and bars in ktoe. */
const fmtMtoe = (v: number) => `${(v / 1000).toFixed(1)} Mtoe`;
const fmtK = (v: number) => v.toLocaleString("en-GB", { maximumFractionDigits: 0 });

/** Sentence case for published labels ("Water Heating" → "Water heating"); keeps acronyms (HGVs). */
function sentence(label: string): string {
  return label
    .split(" · ")
    .map((part) =>
      part
        .split(" ")
        .map((w, i) => (i === 0 || /^[A-Z0-9]{2,}s?$/.test(w) ? w : w.toLowerCase()))
        .join(" "),
    )
    .join(" · ");
}

export function ConsumptionUseful({
  pack,
  ambientByYear,
  sector,
  endUse,
  year,
  assume,
  overrides,
  onOverride,
  onRestore,
}: {
  pack: UsefulPack | null;
  ambientByYear: Map<number, number>;
  sector: UsefulScope;
  endUse: string;
  year: number;
  assume: Assume;
  overrides: Overrides;
  onOverride: (id: string, value: number | null) => void;
  onRestore: () => void;
}) {
  if (!pack || !pack.rows.length || !pack.by_sector_year?.length) {
    return (
      <EmptyStage label="Useful and lost energy unavailable">
        The useful and lost energy estimates are not available right now. Try again after the next data refresh.
      </EmptyStage>
    );
  }

  const latest = latestYear(pack);
  const scenario = assume === "scenario";
  const o = scenario ? overrides : {};
  const items = flowItems(pack, ambientByYear, sector, endUse, year, assume, o);
  const scope =
    endUse !== "all" && sector !== "all"
      ? `${sectorLabel(sector)} · ${endUse}`
      : sectorLabel(sector);

  // One fixed scale per scope so moving the year compares heights honestly.
  const w2 = pack.by_sector_year;
  const scaleMax =
    endUse === "all"
      ? Math.max(
          ...w2
            .filter((r) => (sector === "all" ? r.sector !== "all" : r.sector === sector))
            .map((r) =>
              w2
                .filter((q) => q.year === r.year && q.sector === r.sector)
                .reduce((a, q) => a + q.ktoe, 0),
            ),
          ...items.map((i) => i.useful + i.rejected),
        )
      : Math.max(...items.map((i) => i.useful + i.rejected), 1);

  const rows = year === latest ? scopeRows(pack, sector, endUse) : [];
  const sens = year === latest ? sensitivity(pack, sector, endUse, o).slice(0, 8) : [];
  const elsewhere = year === latest ? sameEndUseElsewhere(pack, sector, endUse) : [];
  const cf = (pack.counterfactual ?? []).filter((r) =>
    sector === "all" ? r.sector !== "all" : r.sector === sector,
  );

  const overTime = (sector === "all" ? ["all"] : [sector]).flatMap((sec) =>
    (["useful", "rejected"] as const).map((kind) => ({
      id: kind,
      label: kind === "useful" ? "Useful energy" : "Lost energy",
      points: w2
        .filter((r) => r.sector === sec && r.kind === kind)
        .map((r) => ({ t: r.year, v: r.ktoe })),
    })),
  );

  return (
    <div className={s.stack}>
      <section className={s.panel}>
        <h3 className={t.stageTitle}>
          {scenario ? "User scenario — not a DESNZ statistic · " : ""}
          Energy used · useful and lost · {scope} · {year} · ktoe
        </h3>
        <SplitFlow
          key={`${sector}-${endUse}-${year}-${scenario}`}
          items={items}
          label={`${scenario ? "User scenario — not a DESNZ statistic. " : ""}Energy used, useful and lost, ${scope}, ${year}`}
          scaleMax={scaleMax}
          scenario={scenario}
        />
      </section>

      {scenario && year === latest && items.some((i) => i.published) && (
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Share lost · published estimate and user scenario — not a DESNZ statistic · {scope}
          </h3>
          <ChangeRows
            label={`Share of energy lost, published estimate and user scenario, ${scope}`}
            fromLabel="Published estimate"
            toLabel="User scenario — not a DESNZ statistic"
            rows={items
              .filter((i) => i.published)
              .map((i) => ({
                id: i.id,
                label: i.label,
                from: rejectedShare(i.published!),
                to: rejectedShare(i),
              }))}
            format={fmtPct}
          />
        </section>
      )}

      {!scenario && (
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Useful and lost over time · {sectorLabel(sector)} · {w2[0]?.year}–{latest} · Mtoe
          </h3>
          <TimeChart
            key={`useful-time-${sector}`}
            label={`Useful and lost energy, ${sectorLabel(sector)}`}
            series={overTime}
            cadence="annual"
            zero
            marks
            showTable={false}
            format={fmtMtoe}
            rules={[{ id: "year", t: year, label: String(year), active: true }]}
          />
        </section>
      )}

      {!scenario && year === latest && cf.length > 0 && (
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Share lost under earlier and current assumptions · {latest}
          </h3>
          <ChangeRows
            label={`Share of energy lost under 2017 and ${latest} efficiency assumptions`}
            fromLabel="2017 assumptions"
            toLabel={`${latest} assumptions`}
            rows={cf.map((r) => ({
              id: r.sector,
              label: sectorLabel(r.sector as UsefulScope),
              from: rejectedShare({
                useful: r.useful_2017_efficiency,
                rejected: r.rejected_2017_efficiency,
              }),
              to: rejectedShare({ useful: r.useful_now, rejected: r.rejected_now }),
            }))}
            format={fmtPct}
          />
        </section>
      )}

      {elsewhere.length > 1 && (
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {sentence(endUse)} across sectors · share lost · {latest}
          </h3>
          <RankBars
            label={`Share of energy lost in ${endUse}, by sector, ${latest}`}
            rows={USEFUL_SECTORS.flatMap((sec) => {
              const r = elsewhere.find((e) => e.sector === sec.id);
              return r
                ? [
                    {
                      id: sec.id,
                      label: sec.label,
                      v: rejectedShare({
                        useful: r.useful_ktoe,
                        rejected: r.rejected_ktoe,
                      }),
                      active: sec.id === sector,
                    },
                  ]
                : [];
            })}
            format={fmtPct}
          />
        </section>
      )}

      {sens.length > 0 && (
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Which assumptions matter most · fall in share lost if one efficiency were 10% better · {scope} · our calculation, not a DESNZ figure
          </h3>
          <RankBars
            key={`sens-${sector}-${endUse}-${scenario}`}
            label={`Fall in share of energy lost if one efficiency is 10% better, ${scope}`}
            rows={sens.map((r) => ({ id: r.id, label: sentence(r.label), v: Math.abs(r.delta) }))}
            format={(v) => `${v.toFixed(1)} percentage points`}
          />
        </section>
      )}

      {rows.length > 0 && (
        <section className={s.panel}>
          <details open={scenario || undefined} style={{ minWidth: 0, maxWidth: "100%" }}>
            <summary className="bo-disclosure">
              {scenario ? "Your efficiencies" : "Efficiency assumptions as a table"} · {scope} · {latest} · ktoe
            </summary>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    {(sector === "all" || endUse === "all") && (
                      <th scope="col" className={t.wrap}>
                        Use
                      </th>
                    )}
                    <th scope="col" className={t.wrap}>
                      Fuel / technology
                    </th>
                    <th scope="col">Energy used</th>
                    <th scope="col">{scenario ? "Your efficiency" : "Efficiency"}</th>
                    <th scope="col">Useful</th>
                    <th scope="col">Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ id, row }) => {
                    const e = scenario ? (overrides[id] ?? row.efficiency) : row.efficiency;
                    const sp = split(row.consumption_ktoe ?? 0, e);
                    const [lo, hi] = bounds(row);
                    return (
                      <tr key={id}>
                        {(sector === "all" || endUse === "all") && (
                          <td className={t.wrap}>
                            {[sector === "all" ? sectorLabel(row.sector as UsefulScope) : null, endUse === "all" ? sentence(row.end_use) : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </td>
                        )}
                        <td className={t.wrap}>
                          {row.heading && row.heading !== row.end_use
                            ? `${row.heading} · ${row.fuel_or_tech}`
                            : row.fuel && row.fuel !== row.fuel_or_tech
                              ? `${row.fuel} · ${row.fuel_or_tech}`
                              : row.fuel_or_tech}
                        </td>
                        <td className={f.num}>{fmtK(row.consumption_ktoe ?? 0)}</td>
                        <td className={f.num}>
                          {scenario ? (
                            <input
                              type="number"
                              className={f.coef}
                              data-changed={overrides[id] != null || undefined}
                              aria-label={`Efficiency for ${row.end_use}, ${row.fuel_or_tech}, published ${fmtCoef(row.efficiency)}`}
                              min={lo}
                              max={hi}
                              step={0.01}
                              value={Number(e.toFixed(3))}
                              onChange={(ev) => {
                                const v = Number(ev.target.value);
                                if (!Number.isFinite(v)) return;
                                const c = Math.min(hi, Math.max(lo, v));
                                onOverride(id, Math.abs(c - row.efficiency) < 1e-9 ? null : c);
                              }}
                            />
                          ) : (
                            fmtCoef(row.efficiency)
                          )}
                        </td>
                        <td className={f.num}>{fmtK(sp.useful)}</td>
                        <td className={f.num}>{fmtK(sp.rejected)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
          {scenario && Object.keys(overrides).length > 0 && (
            <p className={s.links}>
              <TextButton onClick={onRestore}>Restore published values</TextButton>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

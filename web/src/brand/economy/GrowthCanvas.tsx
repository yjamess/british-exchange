"use client";

/**
 * Economy Domain 05 — Productivity & Economic Growth.
 * Deep brief: What Britain produces.
 * Flagship: GDP · per head · labour productivity (QNA/PRDY vintage stamp in Notes).
 * Business investment Follows Domain 09 (not primary here).
 * Signature: Revisions vintage-band from `economy.gdp-vintage-band` (PN2 vs QNA, rebased).
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EconomyStageFollow } from "../connections";
import { TimeChart } from "../instrument/TimeChart";
import { fmtT } from "../data";
import type { PrintOption } from "../PrintSelect";
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
import s from "../energy/generation.module.css";
import { ECONOMY_SOURCE, economyPeriod, economySource } from "./citations";
import {
  PRE_PANDEMIC_Q4,
  asGrowthMeasure,
  asLedgerBase,
  asVintageMeasure,
  availableLedgerBases,
  finalObs,
  fmtGdpM,
  fmtIndex,
  fmtPct1,
  fmtPerHead,
  growthMeasureDefinition,
  periodPoints,
  qoqPct,
  rebasedTo,
  sincePct,
  vintageIndexPoints,
  type GrowthMeasure,
  type VintageMeasure,
} from "./growth-model";
import type { GrowthPack } from "./types";

const MEASURE_OPTIONS: PrintOption<GrowthMeasure>[] = [
  { value: "gdp", label: "Real GDP" },
  { value: "per-head", label: "GDP per head" },
  { value: "productivity", label: "Labour productivity" },
];

const VINTAGE_MEASURE_OPTIONS: PrintOption<VintageMeasure>[] = [
  { value: "gdp", label: "Real GDP" },
  { value: "per-head", label: "GDP per head" },
];

const VIEWS: ExplorerView[] = [
  { id: "produce", label: "What Britain produces" },
  { id: "ledger", label: "Growth ledger" },
  { id: "productivity", label: "Productivity" },
  { id: "revisions", label: "Revisions" },
  { id: "data", label: "Data" },
];

const VINTAGE_NOTE =
  "QNA vintage 2026-09-29 · reference year 2024. Levels are not comparable with retired PN2 pins.";

function asView(raw: string | null): string {
  return VIEWS.some((v) => v.id === raw) ? (raw as string) : "produce";
}

function viewLabel(id: string): string {
  return VIEWS.find((v) => v.id === id)?.label ?? "Growth";
}

/** ISO quarter start → "Qn YYYY". */
function labelQuarter(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return fmtT(y + (m - 1) / 12, "quarterly");
}

export function GrowthCanvas({ pack }: { pack: GrowthPack }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => asView(searchParams.get("view")));
  const [measure, setMeasure] = useState<GrowthMeasure>(() =>
    asGrowthMeasure(searchParams.get("measure")),
  );
  const [vintageMeasure, setVintageMeasure] = useState<VintageMeasure>(() =>
    asVintageMeasure(searchParams.get("measure")),
  );
  const [ledgerBase, setLedgerBase] = useState(() => searchParams.get("base") ?? PRE_PANDEMIC_Q4);

  const sync = useCallback(
    (next: {
      view?: string;
      measure?: GrowthMeasure;
      vintageMeasure?: VintageMeasure;
      ledgerBase?: string;
    }) => {
      const v = next.view ?? view;
      const m = next.measure ?? measure;
      const vm = next.vintageMeasure ?? vintageMeasure;
      const base = next.ledgerBase ?? ledgerBase;
      const u = new URLSearchParams(window.location.search);
      u.set("domain", "growth");
      u.set("view", v);
      if (v === "produce") u.set("measure", m);
      else if (v === "revisions") u.set("measure", vm);
      else u.delete("measure");
      if (v === "ledger") u.set("base", base);
      else u.delete("base");
      window.history.replaceState(null, "", `${pathname}?${u}`);
      if (next.view != null) setView(next.view);
      if (next.measure != null) setMeasure(next.measure);
      if (next.vintageMeasure != null) setVintageMeasure(next.vintageMeasure);
      if (next.ledgerBase != null) setLedgerBase(next.ledgerBase);
    },
    [pathname, view, measure, vintageMeasure, ledgerBase],
  );

  const active =
    measure === "per-head"
      ? pack.gdpPerHead
      : measure === "productivity"
        ? pack.productivity
        : pack.gdp;
  const rows = active?.observations ?? [];
  const pts = useMemo(() => periodPoints(rows), [rows]);

  const label =
    measure === "per-head"
      ? "Real GDP per head"
      : measure === "productivity"
        ? "Labour productivity (output per hour)"
        : "Real GDP";
  const indicatorId =
    measure === "per-head"
      ? "real-gdp-per-head"
      : measure === "productivity"
        ? "labour-productivity"
        : "real-gdp";
  const fmt =
    measure === "per-head" ? fmtPerHead : measure === "productivity" ? fmtIndex : fmtGdpM;
  const unit =
    measure === "per-head"
      ? "£ CVM SA"
      : measure === "productivity"
        ? "index 2023 = 100"
        : "£ million CVM SA";
  const sourceLine =
    measure === "per-head"
      ? ECONOMY_SOURCE.gdpPerHead
      : measure === "productivity"
        ? ECONOMY_SOURCE.labourProductivity
        : ECONOMY_SOURCE.realGdp;

  const latestGdp = useMemo(() => {
    const f = finalObs(pack.gdp?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.gdp]);
  const latestHead = useMemo(() => {
    const f = finalObs(pack.gdpPerHead?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.gdpPerHead]);
  const latestProd = useMemo(() => {
    const f = finalObs(pack.productivity?.observations ?? []);
    return f[f.length - 1] ?? null;
  }, [pack.productivity]);
  const gdpRows = pack.gdp?.observations ?? [];
  const ledgerBases = useMemo(() => availableLedgerBases(gdpRows), [gdpRows]);
  const ledgerBaseOptions: PrintOption<string>[] = useMemo(
    () => ledgerBases.map((b) => ({ value: b.period, label: b.label })),
    [ledgerBases],
  );
  const basePeriod = asLedgerBase(ledgerBase, gdpRows);
  const baseLabel = labelQuarter(basePeriod);

  const gdpQoq = qoqPct(gdpRows);
  const gdpSince = sincePct(gdpRows, basePeriod);
  const headSince = sincePct(pack.gdpPerHead?.observations ?? [], basePeriod);
  const prodSince = sincePct(pack.productivity?.observations ?? [], PRE_PANDEMIC_Q4);

  const gdpRebased = useMemo(() => rebasedTo(gdpRows, basePeriod), [gdpRows, basePeriod]);
  const headRebased = useMemo(
    () => rebasedTo(pack.gdpPerHead?.observations ?? [], basePeriod),
    [pack.gdpPerHead, basePeriod],
  );
  const prodPts = useMemo(
    () => periodPoints(pack.productivity?.observations ?? []),
    [pack.productivity],
  );

  /** Revisions pack slice — hooks stay at top level (Rules of Hooks). */
  const vintageSpotKey = vintageMeasure === "per-head" ? "real-gdp-per-head" : "real-gdp";
  const vintagePn2 = pack.vintageBand?.series[vintageSpotKey]?.find((v) => v.id === "pn2");
  const vintageQna = pack.vintageBand?.series[vintageSpotKey]?.find((v) => v.id === "qna");
  const vintagePn2Pts = useMemo(
    () => vintageIndexPoints(vintagePn2?.index),
    [vintagePn2],
  );
  const vintageQnaPts = useMemo(
    () => vintageIndexPoints(vintageQna?.index),
    [vintageQna],
  );

  const figures: ExplorerFigure[] = useMemo(() => {
    if (view === "ledger") {
      return [
        {
          label: "GDP · quarter on quarter",
          value: gdpQoq != null ? fmtPct1(gdpQoq) : "—",
          note: latestGdp ? labelQuarter(latestGdp.period_start) : "Real GDP",
        },
        {
          label: `GDP since ${baseLabel}`,
          value: gdpSince != null ? fmtPct1(gdpSince) : "—",
          note: "Total output · rebased growth",
        },
        {
          label: `Per head since ${baseLabel}`,
          value: headSince != null ? fmtPct1(headSince) : "—",
          note: "Output per person · rebased growth",
        },
      ];
    }
    if (view === "productivity") {
      return [
        {
          label: "Output per hour",
          value: latestProd?.value != null ? fmtIndex(latestProd.value) : "—",
          note: latestProd
            ? `${labelQuarter(latestProd.period_start)} · 2023 = 100`
            : "Whole economy",
        },
        {
          label: "Since 2019 Q4",
          value: prodSince != null ? fmtPct1(prodSince) : "—",
          note: "Growth in the index, not a level vs manufacturing",
        },
        {
          label: "Scope",
          value: "Whole economy",
          note: "Manufacturing productivity is on Energy › Jobs",
        },
      ];
    }
    if (view === "revisions") {
      const spotKey = vintageMeasure === "per-head" ? "real-gdp-per-head" : "real-gdp";
      const spot = pack.vintageBand?.spot[spotKey];
      const qna = pack.vintageBand?.series[spotKey]?.find((v) => v.id === "qna");
      const pn2 = pack.vintageBand?.series[spotKey]?.find((v) => v.id === "pn2");
      return [
        {
          label: "QNA since 2019 Q4",
          value: spot != null ? fmtPct1(spot.qna_since_ref_pct) : "—",
          note: qna
            ? `${qna.release_date} · ref year ${qna.reference_year}`
            : "Live vintage",
        },
        {
          label: "PN2 since 2019 Q4",
          value: spot != null ? fmtPct1(spot.pn2_since_ref_pct) : "—",
          note: pn2
            ? `${pn2.release_date} · ref year ${pn2.reference_year}`
            : "Retired pin",
        },
        {
          label: "Level ratio QNA÷PN2",
          value: spot != null ? spot.level_ratio.toFixed(3) : "—",
          note: "Levels not comparable — reference year moved",
        },
      ];
    }
    return [
      {
        label: "Real GDP",
        value: latestGdp?.value != null ? fmtGdpM(latestGdp.value) : "—",
        note: latestGdp
          ? `${labelQuarter(latestGdp.period_start)} · total production`
          : "Not loaded",
      },
      {
        label: "GDP per head",
        value: latestHead?.value != null ? fmtPerHead(latestHead.value) : "—",
        note: latestHead
          ? `${labelQuarter(latestHead.period_start)} · not household income`
          : "Not loaded",
      },
      {
        label: "Productivity",
        value: latestProd?.value != null ? fmtIndex(latestProd.value) : "—",
        note: "Output per hour · 2023 = 100",
      },
    ];
  }, [
    view,
    vintageMeasure,
    pack.vintageBand,
    latestGdp,
    latestHead,
    latestProd,
    gdpQoq,
    gdpSince,
    headSince,
    prodSince,
    baseLabel,
  ]);

  let foot: React.ReactNode;
  let body: React.ReactNode;

  if (view === "data") {
    foot = (
      <FigureRecord
        source={economySource(ECONOMY_SOURCE.growth, "United Kingdom", economyPeriod("quarterly"))}
        definition="Observation tables for Ready growth series on this domain."
        method={[
          "Real GDP and GDP per head from QNA. Labour productivity from PRDY.",
          "Business investment (NPEL) primary home is Domain 09 — Follow only from Growth.",
          "Tables show final quarters only.",
        ]}
      />
    );
    body = <GrowthData pack={pack} />;
  } else if (view === "revisions") {
    const measureLabel = vintageMeasure === "per-head" ? "Real GDP per head" : "Real GDP";
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.growth,
          "United Kingdom",
          pack.vintageBand?.honesty ?? VINTAGE_NOTE,
        )}
        definition={[
          "ONS revises GDP levels when it moves from first estimate to Quarterly National Accounts and again at Blue Book.",
          "Each vintage is rebased to 2019 Q4 = 100 so growth shapes can be compared. Absolute £ levels are not overlaid.",
        ]}
        method={[
          vintageQna && vintagePn2
            ? `Live pin: QNA ${vintageQna.release_date} (reference year ${vintageQna.reference_year}). Retired PN2 pin: ${vintagePn2.release_date} (reference year ${vintagePn2.reference_year}).`
            : VINTAGE_NOTE,
          "Pack: economy.gdp-vintage-band — built from dated raw pins under data/economy/*/raw/2026-11-11/.",
          "Re-pin after the next GDP first estimate (12 Nov 2026) and productivity release (17 Nov 2026).",
        ]}
      />
    );
    body = !pack.vintageBand || !vintagePn2Pts.length || !vintageQnaPts.length ? (
      <EmptyStage label="Not available">
        The vintage-band pack is not loaded from Exchange Storage right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            {measureLabel} · PN2 vs QNA · indexed to 2019 Q4 = 100 ·{" "}
            {fmtT(vintageQnaPts[0]!.t, "quarterly")}–
            {fmtT(vintageQnaPts[vintageQnaPts.length - 1]!.t, "quarterly")}
          </h3>
          <TimeChart
            key={`growth-revisions-${vintageMeasure}`}
            label={`${measureLabel} revision envelope`}
            series={[
              { id: "qna", label: vintageQna?.label ?? "QNA", points: vintageQnaPts },
              {
                id: "pn2",
                label: vintagePn2?.label ?? "PN2",
                points: vintagePn2Pts,
                role: "reference",
              },
            ]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtIndex}
          />
        </section>
      </div>
    );
  } else if (view === "ledger") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.realGdp,
          "United Kingdom",
          economyPeriod("quarterly", latestGdp ? labelQuarter(latestGdp.period_start) : null),
        )}
        definition={[
          `How fast output is growing — quarter on quarter, and since ${baseLabel} = 100.`,
          "Per-head growth can diverge from total GDP when population changes.",
        ]}
        method={[
          `Index is an Exchange calculation from final ONS levels on this vintage (${baseLabel} = 100). Not a published GDP level.`,
          VINTAGE_NOTE,
          "Same-vintage rebase only — never mix QNA with retired PN2 levels. Charts use final quarters only.",
        ]}
      />
    );
    body = !gdpRebased.length ? (
      <EmptyStage label="Not available">
        Real GDP is not loaded from the Exchange API right now, or the chosen baseline quarter is missing on this vintage.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Real GDP and GDP per head · indexed to {baseLabel} = 100 ·{" "}
            {fmtT(gdpRebased[0]!.t, "quarterly")}–{fmtT(gdpRebased[gdpRebased.length - 1]!.t, "quarterly")}
          </h3>
          <TimeChart
            key={`growth-ledger-${basePeriod}`}
            label={`Real GDP and GDP per head since ${baseLabel}`}
            series={[
              { id: "real-gdp", label: "Real GDP", points: gdpRebased },
              ...(headRebased.length
                ? [{ id: "real-gdp-per-head", label: "GDP per head", points: headRebased }]
                : []),
            ]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtIndex}
          />
        </section>
      </div>
    );
  } else if (view === "productivity") {
    foot = (
      <FigureRecord
        source={economySource(
          ECONOMY_SOURCE.labourProductivity,
          "United Kingdom",
          economyPeriod(
            "quarterly",
            latestProd ? labelQuarter(latestProd.period_start) : null,
          ),
        )}
        definition={[
          "Whole-economy output per hour worked (ONS labour productivity index).",
          "Do not compare its level with Energy's manufacturing output-per-hour index — different composition.",
        ]}
        method={[
          "Index 2023 = 100, seasonally adjusted. Compare growth rates across sectors, never levels.",
          "Manufacturing productivity lives on Energy › Jobs — Follow, do not fork.",
          "The Productivity Engine (hours × output per hour) waits on a validated whole-economy hours series (candidate LZVA on PRDY) after the 17 Nov productivity release.",
          "Charts use final quarters only.",
        ]}
      />
    );
    body = !prodPts.length ? (
      <EmptyStage label="Not available">
        Labour productivity is not loaded from the Exchange API right now.
      </EmptyStage>
    ) : (
      <div className={s.stack}>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>
            Labour productivity · output per hour · {fmtT(prodPts[0]!.t, "quarterly")}–
            {fmtT(prodPts[prodPts.length - 1]!.t, "quarterly")} · index 2023 = 100
          </h3>
          <TimeChart
            key="labour-productivity"
            label="Labour productivity, output per hour"
            series={[
              {
                id: "labour-productivity",
                label: "Output per hour (whole economy)",
                points: prodPts,
              },
            ]}
            cadence="quarterly"
            kind="line"
            zero={false}
            showTable={false}
            format={fmtIndex}
          />
        </section>
        <section className={s.panel}>
          <h3 className={t.stageTitle}>Productivity Engine · hours × output per hour</h3>
          <EmptyStage label="In preparation">
            Is output changing because hours worked change, or because output per hour changes? That
            decomposition needs a compatible whole-economy hours series, validated against this
            productivity vintage — not inventing inputs. Parked until after the 17 November
            productivity release.
          </EmptyStage>
        </section>
      </div>
    );
  } else {
    foot = (
      <FigureRecord
        source={economySource(
          sourceLine,
          "United Kingdom",
          economyPeriod(
            "quarterly",
            pts.length ? fmtT(pts[pts.length - 1]!.t, "quarterly") : null,
          ),
        )}
        definition={[growthMeasureDefinition(measure), VINTAGE_NOTE]}
        method={[
          measure === "per-head"
            ? "Chart starts 1955 Q1 — earlier ONS placeholder blanks are not plotted as zero production."
            : measure === "productivity"
              ? "Manufacturing productivity lives on Energy › Jobs — link, do not fork. Compare growth rates, never levels."
              : "Business investment is Ready but primary under Trade & Investment (09).",
          "United Kingdom · quarterly · chained volume or index as published.",
          "Charts use final quarters only.",
        ]}
      />
    );
    if (!pts.length) {
      body = (
        <EmptyStage label="Not available">
          This growth series is not loaded from the Exchange API right now.
        </EmptyStage>
      );
    } else {
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      body = (
        <div className={s.stack}>
          <section className={s.panel}>
            <h3 className={t.stageTitle}>
              {label} · {fmtT(first.t, "quarterly")}–{fmtT(last.t, "quarterly")} · {unit}
            </h3>
            <TimeChart
              key={`growth-${measure}`}
              label={label}
              series={[{ id: indicatorId, label, points: pts }]}
              cadence="quarterly"
              kind="line"
              zero={false}
              showTable={false}
              format={fmt}
            />
          </section>
        </div>
      );
    }
  }

  const followViews = new Set(["produce", "ledger", "productivity", "data"]);

  return (
    <>
      <ExplorerHead views={VIEWS} view={view} onView={(id) => sync({ view: id })} />
      <FigureStrip figures={figures} />
      <ControlRow label="Growth controls">
        {view === "produce" ? (
          <MenuControl
            label="Measure"
            value={measure}
            options={MEASURE_OPTIONS}
            onChange={(id) => sync({ measure: id as GrowthMeasure })}
          />
        ) : null}
        {view === "ledger" && ledgerBaseOptions.length ? (
          <MenuControl
            label="From"
            value={basePeriod}
            options={ledgerBaseOptions}
            onChange={(id) => sync({ ledgerBase: id })}
          />
        ) : null}
        {view === "revisions" ? (
          <MenuControl
            label="Measure"
            value={vintageMeasure}
            options={VINTAGE_MEASURE_OPTIONS}
            onChange={(id) => sync({ vintageMeasure: id as VintageMeasure })}
          />
        ) : null}
        <ResetButton
          onClick={() =>
            sync({
              view: "produce",
              measure: "gdp",
              vintageMeasure: "gdp",
              ledgerBase: PRE_PANDEMIC_Q4,
            })
          }
        />
      </ControlRow>
      <Stage
        title={viewLabel(view)}
        follow={
          followViews.has(view) ? (
            <EconomyStageFollow domain="growth" view={view} label={`Growth · ${viewLabel(view)}`} />
          ) : undefined
        }
        foot={foot}
      >
        {body}
      </Stage>
    </>
  );
}

function GrowthData({ pack }: { pack: GrowthPack }) {
  const tables = [
    { id: "real-gdp", title: "Real GDP · £ million CVM SA", pack: pack.gdp, fmt: fmtGdpM },
    {
      id: "real-gdp-per-head",
      title: "Real GDP per head · £ CVM SA",
      pack: pack.gdpPerHead,
      fmt: fmtPerHead,
    },
    {
      id: "labour-productivity",
      title: "Labour productivity · index 2023 = 100",
      pack: pack.productivity,
      fmt: fmtIndex,
    },
  ];
  const any = tables.some((x) => (x.pack?.observations.length ?? 0) > 0);
  if (!any) {
    return (
      <EmptyStage label="In preparation">
        Growth series are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }
  return (
    <div className={s.stack}>
      {tables.map((tbl) => {
        const rows = finalObs(tbl.pack?.observations ?? []).slice().reverse().slice(0, 24);
        if (!rows.length) return null;
        return (
          <div key={tbl.id} className={t.tableGroup}>
            <p className={t.stageTitle}>{tbl.title}</p>
            <div className={t.tableWrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th scope="col">Quarter</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${tbl.id}-${r.period_start}`}>
                      <td>{fmtT(periodPoints([r])[0]!.t, "quarterly")}</td>
                      <td>{tbl.fmt(r.value as number)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

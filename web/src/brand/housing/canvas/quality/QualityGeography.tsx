"use client";

/**
 * Domain 07 — Where housing quality differs.
 * Shared RegionMap (ONS English regions) + ranked list, same instrument as Stock / Supply.
 * Regions (2020+) and EHS survey areas (2008–19). Local authorities reserved for EPC.
 */

import { useMemo } from "react";
import { RegionMap, type RegionDatum } from "@/brand/map";
import {
  ChipToggles,
  ControlRow,
  DualScramble,
  DUAL_DIGITS,
  EmptyStage,
  MenuControl,
  RankBars,
  ResetButton,
  TimeChart,
  explorerClasses as xc,
} from "../../..";
import { ENGLAND, type Cell } from "./cutaway/evidence";
import { BASIS, FEATURES, TENURES } from "./cutaway/features";
import type { Evidence } from "./cutaway/useEvidence";
import { BasisTag, UnavailableControl } from "./parts";
import type { GeographyState, QualityFoot } from "./state";
import gen from "../../../energy/generation.module.css";
import s from "../supply/supply.module.css";

/** EHS survey areas (2008–19) → the ONS regions they group. */
const SNA_MEMBERS: Record<string, string[]> = {
  "EHS-SNA-NORTHERN": ["E12000001", "E12000002", "E12000003"],
  "EHS-SNA-LONDON-SE": ["E12000007", "E12000008"],
  "EHS-SNA-REST-OF-ENGLAND": ["E12000004", "E12000005", "E12000006", "E12000009"],
};

const pct = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);

export function qualityGeographyFoot(state: GeographyState, evidence: Evidence | null): QualityFoot {
  const cells = evidence?.cells ?? [];
  const areaCells = (ind: string, series: string) =>
    cells.filter((c) => c.ind === ind && c.series === series && (c.bk === "region" || c.bk === "sub-national-area"));
  const measures = FEATURES.filter((f) => areaCells(f.ind, f.series).length > 0);
  const feature = measures.find((f) => f.id === state.feature) ?? measures[0] ?? FEATURES[0]!;
  const fc = areaCells(feature.ind, feature.series);
  const years = [...new Set(fc.map((c) => c.year))].sort((a, b) => a - b);
  const y = state.year != null && years.includes(state.year) ? state.year : (years[years.length - 1] ?? null);
  const atYear = fc.filter((c) => c.year === y);
  const scale: "region" | "sub-national-area" = atYear.some((c) => c.bk === "region") ? "region" : "sub-national-area";
  const src = evidence?.sources[feature.ind];
  return {
    definition:
      "Where housing quality differs — shown only at the scale each source supports. The English Housing Survey does not support local authority rates.",
    method: [
      y != null ? `Coverage. ${scale === "region" ? "English regions" : "Three survey areas"} · ${y}.` : "",
      "Differences between areas may lie within sampling error. Confidence intervals are not published for these cells.",
      "Local authority rates need the EPC certificate register — not yet loaded.",
      BASIS[feature.basis].note,
    ].filter(Boolean),
    source: `${src?.publisher ?? "MHCLG · English Housing Survey"} · ${feature.table} · Boundaries: ONS Regions (December 2025)`,
    dataHref: `/data#${feature.ind}`,
  };
}

type GeoShared = {
  state: GeographyState;
  onChange: (next: Partial<GeographyState>) => void;
  evidence: Evidence | null;
  failed: boolean;
};

function useGeoSlice(state: GeographyState, evidence: Evidence | null) {
  const cells = useMemo(() => evidence?.cells ?? [], [evidence]);
  const areaCells = (ind: string, series: string) =>
    cells.filter((c) => c.ind === ind && c.series === series && (c.bk === "region" || c.bk === "sub-national-area"));
  const measures = FEATURES.filter((f) => areaCells(f.ind, f.series).length > 0);
  const feature = measures.find((f) => f.id === state.feature) ?? measures[0] ?? FEATURES[0]!;
  const fc = useMemo(() => areaCells(feature.ind, feature.series), [cells, feature]); // eslint-disable-line react-hooks/exhaustive-deps
  const years = [...new Set(fc.map((c) => c.year))].sort((a, b) => a - b);
  const y = state.year != null && years.includes(state.year) ? state.year : (years[years.length - 1] ?? null);
  const atYear = fc.filter((c) => c.year === y);
  const scale: "region" | "sub-national-area" = atYear.some((c) => c.bk === "region") ? "region" : "sub-national-area";
  const tenures = TENURES.filter((t) => atYear.some((c) => c.tenure === t.id && c.bk === scale));
  const t = tenures.some((x) => x.id === state.tenure) ? state.tenure : (tenures[0]?.id ?? "all-tenures");
  const layer = atYear.filter((c) => c.bk === scale && c.tenure === t);
  return { cells, measures, feature, fc, years, y, atYear, scale, tenures, t, layer };
}

export function QualityGeographyControls({ state, onChange, evidence, failed }: GeoShared) {
  const { measures, feature, years, y, scale, tenures, t } = useGeoSlice(state, evidence);
  const dirty = state.feature !== (measures[0]?.id ?? "fabric") || state.tenure !== "all-tenures" || state.year != null;
  return (
    <ControlRow label="Geography controls">
      <ChipToggles
        label="Scale"
        selected={["survey"]}
        onToggle={() => {}}
        options={[
          {
            value: "survey",
            label: `${scale === "region" ? "Regions" : "Survey areas"} · survey estimate`,
          },
          {
            value: "epc",
            label: "Local authorities · EPC certificates",
            disabled: true,
            title: "EPC certificate statistics are being added",
          },
        ]}
      />
      {measures.length > 0 ? (
        <MenuControl
          label="Measure"
          value={feature.id}
          options={measures.map((m) => ({ value: m.id, label: m.label }))}
          onChange={(v) => onChange({ feature: v, picked: null })}
        />
      ) : (
        <UnavailableControl
          label="Measure"
          reason={failed ? "Evidence unavailable." : evidence ? "No regional measures" : "Loading…"}
        />
      )}
      {tenures.length > 0 ? (
        <MenuControl
          label="Tenure"
          value={t}
          options={tenures.map((x) => ({ value: x.id, label: x.label }))}
          onChange={(v) => onChange({ tenure: v })}
        />
      ) : (
        <UnavailableControl label="Tenure" reason={evidence ? "Not published for this measure" : "Loading…"} />
      )}
      {years.length > 0 && y != null ? (
        <MenuControl
          label="Period"
          value={String(y)}
          options={[...years].reverse().map((v) => ({ value: String(v), label: String(v) }))}
          onChange={(v) => onChange({ year: Number(v) })}
        />
      ) : (
        <UnavailableControl label="Period" reason="—" />
      )}
      {dirty && (
        <ResetButton
          onClick={() =>
            onChange({ feature: measures[0]?.id ?? "fabric", tenure: "all-tenures", year: null, picked: null })
          }
        />
      )}
    </ControlRow>
  );
}

export function QualityGeography({ state, onChange, evidence, failed }: GeoShared) {
  const { cells, feature, fc, y, scale, t, layer } = useGeoSlice(state, evidence);
  const picked = state.picked;
  const setPicked = (v: string | null) => onChange({ picked: v });

  // Region code → cell that colours it (a survey area colours all its member regions).
  const byRegion = useMemo(() => {
    const map = new Map<string, Cell>();
    for (const c of layer) {
      if (scale === "region") map.set(c.area, c);
      else for (const m of SNA_MEMBERS[c.area] ?? []) map.set(m, c);
    }
    return map;
  }, [layer, scale]);

  const mapData: RegionDatum[] = useMemo(() => {
    const codes = new Set<string>();
    for (const c of layer) {
      if (scale === "region") codes.add(c.area);
      else for (const m of SNA_MEMBERS[c.area] ?? []) codes.add(m);
    }
    // Always offer the nine English regions so empty regions stay visible as unmapped.
    for (const code of [
      "E12000001",
      "E12000002",
      "E12000003",
      "E12000004",
      "E12000005",
      "E12000006",
      "E12000007",
      "E12000008",
      "E12000009",
    ]) {
      codes.add(code);
    }
    return [...codes].map((code) => {
      const c = byRegion.get(code);
      const v = c?.v ?? null;
      return {
        code,
        value: v != null && c?.status !== "suppressed" ? v : null,
        display: c ? (c.status === "suppressed" ? "u" : pct(c.v)) : "—",
      };
    });
  }, [layer, scale, byRegion]);

  const ranked = useMemo(
    () =>
      [...layer]
        .filter((c) => c.v != null)
        .sort((a, b) => (b.v ?? -1) - (a.v ?? -1))
        .map((c) => ({
          id: c.area,
          label: c.areaLabel,
          v: c.v!,
          active: picked === c.area,
        })),
    [layer, picked],
  );

  const england = cells.find(
    (c) =>
      c.ind === feature.ind &&
      c.series === feature.series &&
      c.bk === "none" &&
      c.area === ENGLAND &&
      c.year === y &&
      c.tenure === t,
  );
  const sel = layer.find((c) => c.area === picked) ?? null;
  const selectedRegion =
    scale === "region"
      ? picked
      : picked
        ? (SNA_MEMBERS[picked] ?? [])[0] ?? null
        : null;

  const selTrend = sel
    ? fc
        .filter((c) => c.area === sel.area && c.tenure === t && c.v != null)
        .sort((a, b) => a.t - b.t)
        .map((c) => ({ t: c.year, v: c.v! }))
    : [];

  const toggleRegion = (code: string) => {
    if (scale === "region") {
      if (!layer.some((c) => c.area === code)) return;
      setPicked(picked === code ? null : code);
      return;
    }
    const sna = Object.entries(SNA_MEMBERS).find(([, members]) => members.includes(code))?.[0];
    if (!sna || !layer.some((c) => c.area === sna)) return;
    setPicked(picked === sna ? null : sna);
  };

  if (failed && !evidence) {
    return (
      <EmptyStage label="In preparation">The survey tables could not be loaded. No estimated figures.</EmptyStage>
    );
  }

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>
          {scale === "region" ? "English regions" : "Survey areas on English regions"} · {feature.label}
          {y != null ? ` · ${y}` : ""}
        </h3>
        <div className={s.geoSplit}>
          <RegionMap
            data={mapData}
            selected={selectedRegion}
            onSelect={toggleRegion}
            label={`${feature.label} by ${scale === "region" ? "English region" : "survey area"}`}
            legendFormat={(v) => `${v.toFixed(1)}%`}
            legendUnit={feature.unit}
          />
          <div>
            <BasisTag
              basis={feature.basis}
              note={`${scale === "region" ? "Nine regions" : "Three survey areas"} · England ${pct(england?.v)}.`}
            />
            {ranked.length > 0 ? (
              <RankBars
                label={`${feature.label}, ranked`}
                rows={ranked}
                format={(v) => `${v.toFixed(1)}%`}
                onSelect={setPicked}
              />
            ) : (
              <EmptyStage label="No regional cells">Not published for this measure and period.</EmptyStage>
            )}
          </div>
        </div>
      </section>

      {sel && (
        <section className={gen.panel}>
          <h3 className={xc.stageTitle}>
            {sel.areaLabel} · {TENURES.find((x) => x.id === t)?.label} · {y}
          </h3>
          <p className="bo-fig" style={{ margin: 0 }}>
            <DualScramble text={pct(sel.v)} chars={DUAL_DIGITS} trigger="manual" duration={0.6} />
          </p>
          <p className="bo-label" style={{ margin: "4px 0 0" }}>
            {feature.unit}
            {sel.v != null && england?.v != null
              ? ` · England ${pct(england.v)} · ${(sel.v - england.v >= 0 ? "+" : "−") + Math.abs(sel.v - england.v).toFixed(1)} points`
              : england?.v != null
                ? ` · England ${pct(england.v)}`
                : ""}
          </p>
          <BasisTag
            basis={feature.basis}
            note={
              sel.n
                ? `${sel.n.toLocaleString("en-GB")} surveyed · unweighted base, not a confidence interval.`
                : "No confidence interval is published for this cell."
            }
          />
          {selTrend.length > 1 && (
            <TimeChart
              series={[{ id: sel.area, label: sel.areaLabel, points: selTrend }]}
              cadence="annual"
              format={(v) => `${v.toFixed(1)}%`}
              axisFormat={(v) => `${v.toFixed(0)}%`}
              marks
              zero
              height={150}
              label={`${feature.label}, ${sel.areaLabel}`}
              showTable={false}
            />
          )}
        </section>
      )}
    </div>
  );
}

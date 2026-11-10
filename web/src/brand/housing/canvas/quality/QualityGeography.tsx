"use client";

/**
 * Domain 07 — Where housing quality differs.
 * Survey scale: RegionMap (ONS English regions) + ranked list from EHS.
 * EPC scale: AreaMap of local authorities from the domestic certificate register
 * (lodgements count or A–C share of lodgements). Survey ≠ register.
 */

import { useMemo } from "react";
import { RegionMap, type RegionDatum } from "@/brand/map";
import {
  ChipToggles,
  ControlRow,
  DualScramble,
  DUAL_DIGITS,
  EmptyStage,
  MapLegend,
  MenuControl,
  RankBars,
  ResetButton,
  TimeChart,
  explorerClasses as xc,
  formatSource,
  fmt,
} from "../../..";
import { AreaMap } from "../../atlas/AreaMap";
import { breaks, formatValue, type Area } from "../../atlas/model";
import { useGeometry } from "../insecurity/Displacement";
import { ENGLAND, EPC_LA_ID, EPC_NATIONAL_ID, type Cell } from "./cutaway/evidence";
import { BASIS, FEATURES, TENURES } from "./cutaway/features";
import type { Evidence } from "./cutaway/useEvidence";
import { BasisTag, UnavailableControl } from "./parts";
import type { GeographyState, QualityFoot } from "./state";
import gen from "../../../energy/generation.module.css";
import s from "../supply/supply.module.css";
import mapCss from "../insecurity/insecurity.module.css";

/** EHS survey areas (2008–19) → the ONS regions they group. */
const SNA_MEMBERS: Record<string, string[]> = {
  "EHS-SNA-NORTHERN": ["E12000001", "E12000002", "E12000003"],
  "EHS-SNA-LONDON-SE": ["E12000007", "E12000008"],
  "EHS-SNA-REST-OF-ENGLAND": ["E12000004", "E12000005", "E12000006", "E12000009"],
};

const pct = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);

type EpcMeasure = "lodgements" | "band-ac";

const EPC_MEASURES: { id: EpcMeasure; label: string }[] = [
  { id: "lodgements", label: "Certificates lodged" },
  { id: "band-ac", label: "Share in bands A–C" },
];

function geoLevel(c: Cell): string {
  const hit = c.flags.find((f) => f.startsWith("geography-level="));
  return hit ? hit.slice("geography-level=".length) : "";
}

function periodIsoFromT(t: number): string {
  const year = Math.floor(t + 1e-9);
  const month = Math.min(12, Math.max(1, Math.round((t - year) * 12) + 1));
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function quarterLabel(iso: string): string {
  const month = Number(iso.slice(5, 7));
  const q = Math.floor((month - 1) / 3) + 1;
  return `Q${q} ${iso.slice(0, 4)}`;
}

function useEpcSlice(state: GeographyState, evidence: Evidence | null) {
  const cells = useMemo(() => evidence?.cells ?? [], [evidence]);
  const la = useMemo(
    () => cells.filter((c) => c.ind === EPC_LA_ID && geoLevel(c) === "local-authority" && c.area !== "EPC-UNALLOCATED"),
    [cells],
  );
  const measure: EpcMeasure = state.feature === "band-ac" ? "band-ac" : "lodgements";
  // Offer only quarters this measure was published for: band counts exist for fewer quarters than lodgements.
  const periods = useMemo(
    () =>
      [
        ...new Set(
          la
            .filter((c) => c.v != null && (measure === "lodgements" ? c.series === "lodgements-total" : c.series === "band-a"))
            .map((c) => periodIsoFromT(c.t)),
        ),
      ].sort(),
    [la, measure],
  );
  const period =
    state.period && periods.includes(state.period) ? state.period : (periods[periods.length - 1] ?? null);
  const atPeriod = useMemo(() => {
    if (!period) return [] as { code: string; label: string; v: number; total: number | null }[];
    const byCode = new Map<string, { label: string; total: number | null; a: number | null; b: number | null; c: number | null }>();
    for (const c of la) {
      if (periodIsoFromT(c.t) !== period || c.v == null) continue;
      const row = byCode.get(c.area) ?? { label: c.areaLabel, total: null, a: null, b: null, c: null };
      if (c.series === "lodgements-total") row.total = c.v;
      if (c.series === "band-a") row.a = c.v;
      if (c.series === "band-b") row.b = c.v;
      if (c.series === "band-c") row.c = c.v;
      row.label = c.areaLabel;
      byCode.set(c.area, row);
    }
    const out: { code: string; label: string; v: number; total: number }[] = [];
    for (const [code, r] of byCode.entries()) {
      if (r.total == null) continue;
      if (measure === "lodgements") {
        out.push({ code, label: r.label, v: r.total, total: r.total });
        continue;
      }
      // A missing band is not published, not zero: leave the place unshaded.
      if (r.total <= 0 || r.a == null || r.b == null || r.c == null) continue;
      out.push({ code, label: r.label, v: ((r.a + r.b + r.c) / r.total) * 100, total: r.total });
    }
    return out;
  }, [la, period, measure]);

  const england = useMemo(() => {
    if (!period) return null as number | null;
    const national = cells.filter(
      (c) =>
        c.ind === EPC_NATIONAL_ID &&
        c.area === ENGLAND &&
        c.bk === "none" &&
        periodIsoFromT(c.t) === period,
    );
    const total = national.find((c) => c.series === "lodgements-total")?.v;
    if (measure === "lodgements") return total ?? null;
    if (total == null || total <= 0) return null;
    const a = national.find((c) => c.series === "band-a")?.v;
    const b = national.find((c) => c.series === "band-b")?.v;
    const c = national.find((c) => c.series === "band-c")?.v;
    if (a == null || b == null || c == null) return null;
    return ((a + b + c) / total) * 100;
  }, [cells, period, measure]);

  return { la, periods, period, measure, atPeriod, england };
}

export function qualityGeographyFoot(state: GeographyState, evidence: Evidence | null): QualityFoot {
  if (state.scale === "epc") {
    const { period, measure } = epcFootSlice(state, evidence);
    const src = evidence?.sources[EPC_LA_ID] ?? evidence?.sources[EPC_NATIONAL_ID];
    return {
      definition:
        "Domestic Energy Performance Certificates lodged on the England and Wales register — certificates, not dwellings, and not a survey of the whole stock.",
      method: [
        period ? `Coverage. Local authorities · ${quarterLabel(period)}.` : "",
        measure === "band-ac"
          ? "A–C share = (bands A + B + C) ÷ lodgements total for the same authority and quarter."
          : "Counts are certificates lodged in the quarter. One home can appear more than once.",
        "Buildings need an EPC when sold, let or constructed — this is not the dwelling stock.",
        BASIS["administrative-record"].note,
      ].filter(Boolean),
      source: formatSource(src?.publisher ?? "MHCLG · EPB Certificates", "Live tables D1", src?.release, "England and Wales"),
      dataHref: `/data#${EPC_LA_ID}`,
    };
  }

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
      "Where housing quality differs — shown only at the scale each source supports. Survey estimates and the EPC certificate register stay on separate scales.",
    method: [
      y != null ? `Coverage. ${scale === "region" ? "English regions" : "Three survey areas"} · ${y}.` : "",
      "Differences between areas may lie within sampling error. Confidence intervals are not published for these cells.",
      BASIS[feature.basis].note,
    ].filter(Boolean),
    source: formatSource(
      src?.publisher ?? "MHCLG · English Housing Survey",
      feature.table,
      "Boundaries: ONS Regions (December 2025)",
      "England",
    ),
    dataHref: `/data#${feature.ind}`,
  };
}

/** Foot helper without hooks — mirrors useEpcSlice for the Notes line. */
function epcFootSlice(state: GeographyState, evidence: Evidence | null) {
  const cells = evidence?.cells ?? [];
  const la = cells.filter((c) => c.ind === EPC_LA_ID && geoLevel(c) === "local-authority");
  const measure: EpcMeasure = state.feature === "band-ac" ? "band-ac" : "lodgements";
  const periods = [
    ...new Set(
      la
        .filter((c) => c.v != null && (measure === "lodgements" ? c.series === "lodgements-total" : c.series === "band-a"))
        .map((c) => periodIsoFromT(c.t)),
    ),
  ].sort();
  const period = state.period && periods.includes(state.period) ? state.period : (periods[periods.length - 1] ?? null);
  return { period, measure };
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
  const survey = useGeoSlice(state, evidence);
  const epc = useEpcSlice(state, evidence);
  const dirty =
    state.scale !== "survey" ||
    state.feature !== (survey.measures[0]?.id ?? "fabric") ||
    state.tenure !== "all-tenures" ||
    state.year != null ||
    state.period != null ||
    state.picked != null;

  return (
    <ControlRow label="Geography controls">
      <ChipToggles
        label="Scale"
        selected={[state.scale]}
        onToggle={(v) =>
          onChange({
            scale: v === "epc" ? "epc" : "survey",
            feature: v === "epc" ? "lodgements" : survey.measures[0]?.id ?? "fabric",
            picked: null,
            period: null,
            year: null,
          })
        }
        options={[
          {
            value: "survey",
            label: `${survey.scale === "region" ? "Regions" : "Survey areas"} · survey estimate`,
          },
          {
            value: "epc",
            label: "Local authorities · energy certificates",
            disabled: epc.periods.length === 0,
            title: epc.periods.length === 0 ? "Energy certificate statistics unavailable" : undefined,
          },
        ]}
      />
      {state.scale === "epc" ? (
        <>
          <MenuControl
            label="Measure"
            value={epc.measure}
            options={EPC_MEASURES.map((m) => ({ value: m.id, label: m.label }))}
            onChange={(v) => onChange({ feature: v, picked: null })}
          />
          {epc.periods.length === 1 && epc.period ? (
            <UnavailableControl label="Period" reason={`${quarterLabel(epc.period)} only`} />
          ) : epc.periods.length > 0 && epc.period ? (
            <MenuControl
              label="Period"
              value={epc.period}
              options={[...epc.periods].reverse().map((p) => ({ value: p, label: quarterLabel(p) }))}
              onChange={(v) => onChange({ period: v, picked: null })}
            />
          ) : (
            <UnavailableControl label="Period" reason={failed ? "Unavailable" : "Loading…"} />
          )}
        </>
      ) : (
        <>
          {survey.measures.length > 0 ? (
            <MenuControl
              label="Measure"
              value={survey.feature.id}
              options={survey.measures.map((m) => ({ value: m.id, label: m.label }))}
              onChange={(v) => onChange({ feature: v, picked: null })}
            />
          ) : (
            <UnavailableControl
              label="Measure"
              reason={failed ? "Evidence unavailable." : evidence ? "No regional measures" : "Loading…"}
            />
          )}
          {survey.tenures.length === 1 ? (
            <UnavailableControl label="Tenure" reason={`${survey.tenures[0]!.label} only`} />
          ) : survey.tenures.length > 0 ? (
            <MenuControl
              label="Tenure"
              value={survey.t}
              options={survey.tenures.map((x) => ({ value: x.id, label: x.label }))}
              onChange={(v) => onChange({ tenure: v })}
            />
          ) : (
            <UnavailableControl label="Tenure" reason={evidence ? "Not published for this measure" : "Loading…"} />
          )}
          {survey.years.length > 0 && survey.y != null ? (
            <MenuControl
              label="Period"
              value={String(survey.y)}
              options={[...survey.years].reverse().map((v) => ({ value: String(v), label: String(v) }))}
              onChange={(v) => onChange({ year: Number(v) })}
            />
          ) : (
            <UnavailableControl label="Period" reason="—" />
          )}
        </>
      )}
      {dirty && (
        <ResetButton
          onClick={() =>
            onChange({
              scale: "survey",
              feature: survey.measures[0]?.id ?? "fabric",
              tenure: "all-tenures",
              year: null,
              period: null,
              picked: null,
            })
          }
        />
      )}
    </ControlRow>
  );
}

export function QualityGeography({ state, onChange, evidence, failed }: GeoShared) {
  if (state.scale === "epc") {
    return <EpcGeography state={state} onChange={onChange} evidence={evidence} failed={failed} />;
  }
  return <SurveyGeography state={state} onChange={onChange} evidence={evidence} failed={failed} />;
}

function EpcGeography({ state, onChange, evidence, failed }: GeoShared) {
  const { geometry, error } = useGeometry();
  const { period, measure, atPeriod, england, la } = useEpcSlice(state, evidence);
  const picked = state.picked;
  const setPicked = (v: string | null) => onChange({ picked: v });
  const measureId = measure === "band-ac" ? "epc-band-ac-share" : "epc-lodgements";
  const measureLabel = EPC_MEASURES.find((m) => m.id === measure)?.label ?? "Certificates";

  const areas: Area[] = useMemo(
    () => atPeriod.map((p) => ({ code: p.code, name: p.label, level: "local" as const, values: [p.v] })),
    [atPeriod],
  );
  const ranked = useMemo(
    () =>
      [...atPeriod]
        .sort((a, b) => b.v - a.v)
        .map((p) => ({ id: p.code, label: p.label, v: p.v, active: picked === p.code })),
    [atPeriod, picked],
  );
  const selected = atPeriod.find((p) => p.code === picked) ?? null;
  const selTrend = useMemo(() => {
    if (!picked) return [] as { t: number; v: number }[];
    return la
      .filter((c) => c.area === picked && c.series === "lodgements-total" && c.v != null)
      .sort((a, b) => a.t - b.t)
      .map((c) => ({ t: c.t, v: c.v! }));
  }, [la, picked]);

  if (failed && !evidence) {
    return <EmptyStage label="In preparation">The certificate register could not be loaded. No estimated figures.</EmptyStage>;
  }
  if (!period || atPeriod.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Domestic EPC lodgements by local authority are not available for this period.
      </EmptyStage>
    );
  }

  const fmtValue = (v: number) =>
    measure === "band-ac" ? `${v.toFixed(1)}%` : fmt.count(v);

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>
          Local authorities · {measureLabel} · {quarterLabel(period)}
        </h3>
        <div className={mapCss.mapGrid}>
          <div className={mapCss.mapCol}>
            {geometry ? (
              <AreaMap
                shapes={geometry.shapes}
                areas={areas}
                month={0}
                measure={measureId}
                mode="price"
                selected={picked ?? ""}
                comparison=""
                onSelect={(code) => setPicked(code === picked ? null : code)}
                flow
                compact
                coverage="Local authorities · England and Wales · certificates lodged"
                mapLabel={`Map of local authorities shaded by ${measureLabel.toLowerCase()} in ${quarterLabel(period)}.`}
              />
            ) : (
              <EmptyStage label={error ? "Map unavailable" : "Loading map"}>
                {error || "Fetching local-authority boundaries…"}
              </EmptyStage>
            )}
          </div>
          <aside className={mapCss.readout} aria-live="polite" aria-label="Place record">
            <p className="bo-label">In focus</p>
            {selected ? (
              <>
                <p className={mapCss.placeName}>{selected.label}</p>
                <p className={`bo-fig ${mapCss.readoutValue}`}>{fmtValue(selected.v)}</p>
                <p className={mapCss.readoutMeta}>
                  {measureLabel.toLowerCase()} · {quarterLabel(period)}
                  {england != null
                    ? ` · England ${measure === "band-ac" ? pct(england) : fmt.count(england)}`
                    : ""}
                </p>
              </>
            ) : (
              <p className={mapCss.readoutMeta}>
                Select a local authority on the map or in the ranking. England{" "}
                {england != null ? (measure === "band-ac" ? pct(england) : fmt.count(england)) : "—"}.
              </p>
            )}
            <MapLegend
              title={measure === "band-ac" ? "A–C share" : "lodgements"}
              thresholds={breaks(measureId, "price")}
              format={(v) => formatValue(v, measureId, "price", true)}
            />
            <BasisTag basis="administrative-record" note="Certificates lodged — not the dwelling stock." />
          </aside>
        </div>
      </section>

      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>Highest 20 authorities · {quarterLabel(period)}</h3>
        {ranked.length > 0 ? (
          <RankBars
            label={`${measureLabel}, ranked`}
            rows={ranked.slice(0, 20)}
            format={fmtValue}
            onSelect={setPicked}
          />
        ) : (
          <EmptyStage label="No local-authority cells">Not published for this period.</EmptyStage>
        )}
      </section>

      {selected && selTrend.length > 1 && measure === "lodgements" && (
        <section className={gen.panel}>
          <h3 className={xc.stageTitle}>{selected.label} · certificates lodged</h3>
          <p className="bo-fig" style={{ margin: 0 }}>
            <DualScramble text={fmt.count(selected.v)} chars={DUAL_DIGITS} trigger="manual" duration={0.6} />
          </p>
          <TimeChart
            series={[{ id: selected.code, label: selected.label, points: selTrend }]}
            cadence="quarterly"
            format={fmt.count}
            marks
            zero
            height={150}
            label={`Certificates lodged, ${selected.label}`}
            showTable={false}
          />
        </section>
      )}
    </div>
  );
}

function SurveyGeography({ state, onChange, evidence, failed }: GeoShared) {
  const { cells, feature, fc, y, scale, t, layer } = useGeoSlice(state, evidence);
  const picked = state.picked;
  const setPicked = (v: string | null) => onChange({ picked: v });

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
    scale === "region" ? picked : picked ? (SNA_MEMBERS[picked] ?? [])[0] ?? null : null;

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

"use client";

/**
 * Domain 08 — The Geography of Displacement.
 *
 * Local-authority map of temporary accommodation on one date (MHCLG detailed LA tables),
 * drawn on the shared housing boundaries with the same band screen as every housing map.
 * Two measures: households in TA per 1,000 households (TA1, published), and the share of an
 * authority's TA households placed outside its own area (TA9 ÷ TA1, derived, same date).
 *
 * TA9 counts placements by the placing authority only. No destination is published, so the
 * Exchange draws no connection lines and never locates households.
 *
 * URL state (owned by HousingExplorer): area (LA code), mode (rate | share).
 */

import { useEffect, useId, useMemo, useState } from "react";
import { Control, ControlRow, DualScramble, DUAL_DIGITS, MenuControl } from "../../..";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import { AreaMap } from "../../atlas/AreaMap";
import { LegendBandDefs } from "../../atlas/BandScreen";
import { BAND_RADII, breaks, formatValue, type Area, type Geometry } from "../../atlas/model";
import type { HousingV1 } from "../../load";
import s from "./insecurity.module.css";

type Ins = HousingV1["insecurity"];
export type DisplacementMode = "rate" | "share";

type Props = {
  insecurity: Ins;
  area: string;
  mode: DisplacementMode;
  onChange: (next: { area?: string | null; mode?: DisplacementMode | null }) => void;
};

const MEASURE: Record<DisplacementMode, { id: string; label: string; short: string }> = {
  rate: { id: "ta-per-thousand", label: "Households in TA per 1,000 households", short: "Rate per 1,000" },
  share: { id: "ta-out-of-area-share", label: "Share of TA households placed out of area", short: "Placed out of area" },
};

let geometryCache: Geometry | null = null;

function useGeometry() {
  const [geometry, setGeometry] = useState<Geometry | null>(geometryCache);
  const [error, setError] = useState("");
  useEffect(() => {
    if (geometryCache) return;
    let live = true;
    fetch("/api/housing/map-pack?variant=geometry")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load boundaries.");
        return r.json() as Promise<{ geometry: Geometry }>;
      })
      .then((pack) => {
        geometryCache = pack.geometry;
        if (live) setGeometry(pack.geometry);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Could not load boundaries."));
    return () => {
      live = false;
    };
  }, []);
  return { geometry, error };
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (iso: string) =>
  iso ? `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "the latest date";

export function Displacement({ insecurity, area, mode, onChange }: Props) {
  const uid = useId().replace(/:/g, "");
  const { geometry, error } = useGeometry();
  const places = insecurity.taPlaces;
  const date = dateLabel(insecurity.taDurationDate);
  const measure = MEASURE[mode];

  const valueFor = (p: Ins["taPlaces"][number]) =>
    mode === "rate"
      ? p.rate
      : p.outOfArea != null && p.households != null && p.households > 0
        ? (p.outOfArea / p.households) * 100
        : null;

  const areas: Area[] = useMemo(
    () => places.map((p) => ({ code: p.code, name: p.name, level: "local" as const, values: [valueFor(p)] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueFor depends on mode only
    [places, mode],
  );
  const ranked = useMemo(
    () =>
      places
        .map((p) => ({ id: p.code, label: p.name, v: valueFor(p) }))
        .filter((r): r is { id: string; label: string; v: number } => r.v != null)
        .sort((a, b) => b.v - a.v),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueFor depends on mode only
    [places, mode],
  );

  const selected = places.find((p) => p.code === area) ?? null;
  const selectedV = selected ? valueFor(selected) : null;
  const rank = selected ? ranked.findIndex((r) => r.id === selected.code) + 1 : 0;
  const thresholds = breaks(measure.id, "price");
  const engOut = insecurity.headlines.outOfAreaEngland;

  return (
    <div className={s.root}>
      <p className={s.lede}>
        Temporary accommodation is concentrated in some places far more than others, and many
        households are placed outside the authority responsible for them. Both measures count
        households in England on {date}. The map shows where the duty sits, not where any family
        lives. No origin–destination table is loaded, so the map does not draw a move.
      </p>

      <ControlRow label="Displacement controls">
        <MenuControl
          label="Measure"
          value={mode}
          options={(Object.keys(MEASURE) as DisplacementMode[]).map((m) => ({ value: m, label: MEASURE[m].label }))}
          onChange={(m) => onChange({ mode: m === "rate" ? null : m })}
        />
        <Control label="Find an authority">
          {(id) => (
            <>
              <input
                className={s.search}
                aria-labelledby={id}
                list={`${uid}-las`}
                placeholder="Type a local authority"
                onChange={(e) => {
                  const hit = places.find((p) => p.name.toLowerCase() === e.target.value.trim().toLowerCase());
                  if (hit) onChange({ area: hit.code });
                }}
              />
              <datalist id={`${uid}-las`}>
                {places.map((p) => (
                  <option key={p.code} value={p.name} />
                ))}
              </datalist>
            </>
          )}
        </Control>
      </ControlRow>

      <div className={s.plate}>
        <div className={s.plateMain}>
          {geometry ? (
            <AreaMap
              shapes={geometry.shapes}
              areas={areas}
              month={0}
              measure={measure.id}
              mode="price"
              selected={area}
              comparison=""
              onSelect={(code) => onChange({ area: code === area ? null : code })}
              flow
              coverage="Local authorities · England"
              mapLabel="Map of English local authorities. The count is where the homelessness duty sits, not where a household lives."
            />
          ) : (
            <p className={s.note}>{error || "Loading local-authority boundaries…"}</p>
          )}
        </div>

        <aside className={s.panel} aria-live="polite" aria-label="Place record">
          {selected ? (
            <>
              <p className="bo-label">Place record · stock on {date}</p>
              <p className={s.name}>{selected.name}</p>
              <p className={s.big}>
                <span className="bo-fig">
                  <DualScramble
                    text={selectedV == null ? "—" : mode === "rate" ? selectedV.toFixed(1) : `${selectedV.toFixed(0)}%`}
                    chars={DUAL_DIGITS}
                    trigger="manual"
                    duration={0.6}
                  />
                </span>
                <span>
                  {mode === "rate" ? "per 1,000 households" : "of its TA households placed out of area"}
                  {rank > 0 ? ` · ${ordinal(rank)} highest of ${ranked.length}` : ""}
                </span>
              </p>
              <dl className={s.facts}>
                <div>
                  <dt className="bo-label">In TA</dt>
                  <dd>{selected.households == null ? "Not published" : `${fmt.count(selected.households)} households`}</dd>
                </div>
                <div>
                  <dt className="bo-label">Children</dt>
                  <dd>{selected.children == null ? "Not published" : fmt.count(selected.children)}</dd>
                </div>
                <div>
                  <dt className="bo-label">Rate</dt>
                  <dd>{selected.rate == null ? "Not published" : `${selected.rate.toFixed(1)} per 1,000 households`}</dd>
                </div>
                <div>
                  <dt className="bo-label">Out of area</dt>
                  <dd>
                    {selected.outOfArea == null
                      ? "Not published or suppressed"
                      : `${fmt.count(selected.outOfArea)} households placed in another authority's area`}
                  </dd>
                </div>
              </dl>
              {selected.days.some((d) => d.mean != null || d.median != null) && (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <caption>Time in TA so far by type · TA7 · days</caption>
                    <thead>
                      <tr>
                        <th scope="col">Type</th>
                        <th scope="col" className={s.num}>
                          Mean
                        </th>
                        <th scope="col" className={s.num}>
                          Median
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.days
                        .filter((d) => d.mean != null || d.median != null)
                        .map((d) => (
                          <tr key={d.id}>
                            <th scope="row">{d.label}</th>
                            <td className={s.num}>{d.mean == null ? "—" : fmt.count(d.mean)}</td>
                            <td className={s.num}>{d.median == null ? "—" : fmt.count(d.median)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="bo-label">Place record</p>
              <p className={s.note}>
                Select a place on the map, in the ranking, or by name to see its households,
                children, out-of-area placements and length of stay by accommodation type.
              </p>
              {engOut != null && (
                <p className={s.big}>
                  <span className="bo-fig">{fmt.count(engOut)}</span>
                  <span>households placed outside their authority, England, {date}</span>
                </p>
              )}
            </>
          )}
        </aside>
      </div>

      <section className={s.legendBands} aria-label="Map legend">
        <span className="bo-label">{measure.label}</span>
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
          <LegendBandDefs idPrefix={`${uid}-lg`} />
        </svg>
        <div className={s.legendGrid}>
          {BAND_RADII.map((_, i) => (
            <div key={i} className={s.legendBandRow}>
              <svg viewBox="0 0 36 14" width="36" height="14" aria-hidden="true">
                <rect width="36" height="14" fill="var(--bo-paper)" />
                <rect width="36" height="14" fill={`url(#${uid}-lg-band-${i})`} />
                <rect width="36" height="14" fill="none" stroke="var(--bo-ink-20)" strokeWidth="1" />
              </svg>
              <span>
                {i === 0
                  ? `Below ${formatValue(thresholds[0], measure.id)}`
                  : i === 6
                    ? `${formatValue(thresholds[5], measure.id)} and above`
                    : `${formatValue(thresholds[i - 1], measure.id)} – ${formatValue(thresholds[i], measure.id)}`}
              </span>
            </div>
          ))}
        </div>
        <p className="bo-note">
          Higher band = denser screen. Unshaded: not published, suppressed or outside England.
          Scotland, Wales and Northern Ireland have separate homelessness law.
        </p>
      </section>

      <RankBars
        label={`${measure.label} · highest 20 authorities · ${date}`}
        rows={ranked.slice(0, 20).map((r) => ({ ...r, active: r.id === area }))}
        format={(v) => (mode === "rate" ? v.toFixed(1) : `${v.toFixed(0)}%`)}
        onSelect={(id) => onChange({ area: id === area ? null : id })}
      />

      <p className={s.note}>
        {mode === "share"
          ? "The out-of-area share is computed by the Exchange: TA9 placements outside the authority ÷ TA1 households in TA, same authority and date. "
          : ""}
        TA9 records how many households an authority placed outside its own area, but not where
        they went. Without published destinations there are no connection lines, and no household
        is ever located. Authorities with no figure did not report it or had it suppressed. They
        are shown as unavailable, not as zero.
      </p>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

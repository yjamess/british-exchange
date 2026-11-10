"use client";

/**
 * Domain 01 Map — full price atlas inside the explorer instrument frame.
 * One cohesive canvas: no separate /housing/explore page.
 */

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { PrintSelect } from "../../PrintSelect";
import { TimeChart } from "../../instrument/TimeChart";
import { AreaMap } from "../atlas/AreaMap";
import { LegendBandDefs } from "../atlas/BandScreen";
import {
  BAND_RADII,
  breaks,
  formatValue,
  periodLabel,
  periodNumber,
  valueAt,
  type Area,
  type Atlas,
  type Geometry,
  type MapShape,
  type Mode,
} from "../atlas/model";
import s from "./pricesMap.module.css";

export type PricesMapPayload = { atlas: Atlas; geometry: Geometry };

const HPI_IDS = new Set(["average", "detached", "semi-detached", "terraced", "flat", "new-build", "existing", "sales-volume"]);

/**
 * How long each month should stay on screen during play.
 * The timer follows a clock started on click. If painting the map takes longer
 * than this, the next tick jumps ahead so the series still finishes on time.
 * 40ms is about 15 seconds for the full monthly UK HPI series (~380 months).
 */
const PLAY_STEP_MS = 40;

/** HPI property atlas, PIPR rental atlas, or AFF1 affordability — same AreaMap chrome. */
export type MapAtlasVariant = "hpi" | "rent" | "afford";

export function PricesMapStage({
  atlas: initialAtlas,
  geometry,
  mode,
  date,
  area,
  compare: compareCode,
  hpiType,
  onDate,
  onArea,
  onCompare,
  onHpiType,
  onMode,
  variant = "hpi",
  rentCategory = "all",
  rentMeasure = "average-rent",
  rentPublished = true,
  yearFrom,
  yearTo,
}: {
  atlas: Atlas;
  geometry: Geometry;
  mode: Mode;
  date: string;
  area: string;
  compare: string;
  hpiType: string;
  onDate: (period: string | null) => void;
  onArea: (code: string | null) => void;
  onCompare: (code: string | null) => void;
  onHpiType: (id: string | null) => void;
  onMode: (mode: Mode) => void;
  variant?: MapAtlasVariant;
  /** Renting only: which home and measure the rest of the page is showing. */
  rentCategory?: string;
  rentMeasure?: string;
  /** False when that home has no published map for the measure (do not draw a different rent). */
  rentPublished?: boolean;
  yearFrom?: number;
  yearTo?: number;
}) {
  const isRent = variant === "rent";
  const isAfford = variant === "afford";
  const searchId = isAfford ? "afford-map-place-search" : isRent ? "rent-map-place-search" : "map-place-search";
  const [atlas, setAtlas] = useState(initialAtlas);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [looking, setLooking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  /** Month shown while play runs. Null means follow the URL. */
  const [cursor, setCursor] = useState<number | null>(null);
  const [allYears, setAllYears] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const fetchRef = useRef<AbortController | null>(null);
  const searchRef = useRef<AbortController | null>(null);
  const onDateRef = useRef(onDate);
  onDateRef.current = onDate;
  /** Month index play started from, and the clock time it started. */
  const playFrom = useRef(0);
  const playStarted = useRef(0);
  /** Latest end month for the timer. A ref so the timer does not restart on each redraw. */
  const playRange = useRef({ last: 0, months: initialAtlas.months });

  useEffect(() => {
    setAtlas(initialAtlas);
  }, [initialAtlas]);

  // The page's rent selection (home, index, annual change) has to be the layer on the map.
  useEffect(() => {
    if (!isRent) return;
    if (!rentPublished) {
      setUnsupported(true);
      return;
    }
    setUnsupported(false);
    if ((rentCategory === "all" || rentCategory === "") && rentMeasure === "average-rent") {
      setAtlas(initialAtlas);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    const q = new URLSearchParams({ map: "1", category: rentCategory || "all", measure: rentMeasure });
    fetch(`/api/housing/rent-series?${q}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as { atlas?: Atlas; error?: string };
        if (!res.ok || !body.atlas) throw new Error(body.error ?? "Could not load this rent map.");
        if (!controller.signal.aborted) setAtlas(body.atlas);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (!controller.signal.aborted) setLoadError(reason instanceof Error ? reason.message : "Could not load this rent map.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isRent, rentPublished, rentCategory, rentMeasure, initialAtlas]);

  const levelWord = isAfford ? "Ratio" : isRent ? "Rent" : atlas.measure === "sales-volume" ? "Sales" : "Price";
  // AFF1 is annual — YoY via valueAt(index-12) would be wrong; keep level only.
  // A rent atlas whose values are already the annual change or the index must not be differenced again.
  const mapMode = isAfford ? "price" : mode;
  const storedRate = isRent && (atlas.measure === "annual-change" || atlas.measure === "index");
  const readMode: Mode = storedRate ? "price" : mapMode;
  const displayMode: Mode = atlas.measure === "annual-change" || mapMode === "change" ? "change" : "price";
  const legendLevel = isAfford
    ? "Price to earnings · ×"
    : isRent
      ? atlas.measure === "index"
        ? "Index"
        : displayMode === "change"
          ? "Annual change · %"
          : "Average rent · £"
      : atlas.measure === "sales-volume"
        ? "Sales · count"
        : "Nominal average · £";
  const ukLevelLabel = isAfford
    ? "England ratio"
    : isRent
      ? "average rent"
      : atlas.measure === "sales-volume"
        ? "sales"
        : "average";
  const periodText = (p: string) => (isAfford ? p.slice(0, 4) : periodLabel(p));

  // The timeline ends at the last month this measure was published for. Some measures
  // (new build, existing homes, sales volume) lag the average, so trailing months are empty.
  const lastWithData = useMemo(() => {
    for (let i = atlas.months.length - 1; i >= 0; i -= 1) {
      if (atlas.areas.some((a) => valueAt(a, i, readMode) != null)) return i;
    }
    return atlas.months.length - 1;
  }, [atlas.months, atlas.areas, readMode]);
  const periodIndexes = useMemo(() => {
    const all = atlas.months
      .map((month, index) => ({ month, index, year: Number(month.slice(0, 4)) }))
      .filter((item) => item.index <= lastWithData);
    const inside = yearFrom == null ? all : all.filter((item) => item.year >= yearFrom && item.year <= (yearTo ?? yearFrom));
    return inside.length > 0 ? inside : all;
  }, [atlas.months, yearFrom, yearTo, lastWithData]);
  const urlMonth = useMemo(() => {
    const key = date.slice(0, 7);
    const found = periodIndexes.find((item) => item.month.slice(0, 7) === key);
    return found?.index ?? periodIndexes[periodIndexes.length - 1]?.index ?? 0;
  }, [periodIndexes, date]);
  // Play steps this locally. Writing the URL on every month re-rendered the whole page.
  const monthIndex = cursor ?? urlMonth;
  // Chart/readout can lag a frame while the map keeps up during play.
  const deferredMonth = useDeferredValue(monthIndex);
  const legendId = useId().replace(/:/g, "");

  const period = atlas.months[monthIndex] ?? atlas.months[atlas.months.length - 1]!;
  const selected =
    area && (atlas.areas.some((a) => a.code === area) || geometry.shapes.some((sh) => sh.code === area))
      ? area
      : "";

  const current = atlas.areas.find((a) => a.code === selected);
  const name = current?.name ?? geometry.shapes.find((sh) => sh.code === selected)?.name ?? "Selected place";
  const compare = compareCode && compareCode !== selected ? atlas.areas.find((a) => a.code === compareCode) : undefined;
  const benchmark = isAfford
    ? atlas.areas.find((a) => a.code === "E92000001") ?? atlas.areas.find((a) => a.level === "nation")
    : atlas.areas.find((a) => a.level === "uk");
  const value = valueAt(current, monthIndex, readMode);
  const annual = isAfford || storedRate ? null : valueAt(current, monthIndex, "change");
  const measureLabel =
    atlas.measures.find((m) => m.id === atlas.measure)?.label ??
    (isAfford ? "Median price to earnings" : isRent ? "Average monthly rent" : "Average price");
  const thresholds = breaks(atlas.measure === "index" ? "index" : isRent ? "average-rent" : atlas.measure, displayMode);
  const byCode = useMemo(() => new Map(atlas.areas.map((a) => [a.code, a])), [atlas]);

  const places = useMemo(
    () => geometry.shapes.map((sh) => ({ code: sh.code, name: sh.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [geometry],
  );
  const matches =
    query.trim().length > 1
      ? places
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase().trim()) || p.code.toLowerCase() === query.toLowerCase().trim())
          .slice(0, 7)
      : [];
  // Sorting every local authority is expensive — only do it once the table is open.
  const localValues = useMemo(() => {
    if (!placesOpen) return [] as (MapShape & { value: number | null })[];
    return geometry.shapes
      .map((sh) => ({ ...sh, value: valueAt(byCode.get(sh.code), monthIndex, readMode) }))
      .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  }, [placesOpen, geometry.shapes, byCode, monthIndex, readMode]);

  const coverage = useMemo(() => {
    let n = 0;
    for (const sh of geometry.shapes) {
      if (valueAt(byCode.get(sh.code), monthIndex, readMode) != null) n += 1;
    }
    return n;
  }, [geometry.shapes, byCode, monthIndex, readMode]);

  const chartSeries = useMemo(() => {
    const chartMonth = playing ? deferredMonth : monthIndex;
    const seriesAreas = [current, compare].filter(Boolean) as Area[];
    const window = isAfford ? 28 : 119;
    return seriesAreas.map((a) => ({
      id: a.code,
      label: a.name,
      points: atlas.months.flatMap((p, index) => {
        const v = valueAt(a, index, readMode);
        if (v == null || (!allYears && index < chartMonth - window) || index > chartMonth) return [];
        return [{ t: periodNumber(p), v }];
      }),
    }));
  }, [current, compare, atlas.months, readMode, allYears, monthIndex, deferredMonth, playing, isAfford]);

  // Once the URL has caught the local month, drop the cursor so the address stays the source of truth.
  useEffect(() => {
    if (!playing && cursor != null && cursor === urlMonth) setCursor(null);
  }, [playing, cursor, urlMonth]);

  playRange.current = {
    last: periodIndexes[periodIndexes.length - 1]?.index ?? Math.max(0, atlas.months.length - 1),
    months: atlas.months,
  };

  useEffect(() => {
    if (!playing) return;
    // Step from the clock started on click, not from "40ms after the last redraw".
    // Redrawing the map is the slow part; a late tick jumps to the month the clock has reached.
    // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout
    let timer = 0;
    const tick = () => {
      const { last, months } = playRange.current;
      const next = Math.min(last, playFrom.current + Math.floor((performance.now() - playStarted.current) / PLAY_STEP_MS));
      // Same index as last tick: skip the re-render. React bails out when the value is unchanged.
      setCursor((prev) => (prev === next ? prev : next));
      if (next >= last) {
        setPlaying(false);
        const period = months[next];
        if (period) onDateRef.current(period.slice(0, 7));
        return;
      }
      timer = window.setTimeout(tick, PLAY_STEP_MS);
    };
    timer = window.setTimeout(tick, PLAY_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing]);

  useEffect(
    () => () => {
      fetchRef.current?.abort();
      searchRef.current?.abort();
    },
    [],
  );

  const select = (code: string) => {
    searchRef.current?.abort();
    setLooking(false);
    onArea(code);
    if (code === compareCode) onCompare(null);
    setQuery("");
    setSearchError("");
  };

  const changeHpi = async (id: string, syncUrl = true) => {
    if (isRent || !HPI_IDS.has(id)) return;
    if (id === atlas.measure) {
      if (syncUrl) onHpiType(id === "average" ? null : id);
      return;
    }
    fetchRef.current?.abort();
    const controller = new AbortController();
    fetchRef.current = controller;
    setLoading(true);
    setLoadError("");
    setPlaying(false);
    try {
      const res = await fetch(`/api/housing/atlas?measure=${encodeURIComponent(id)}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Could not load that measure. Previous figures remain.");
      const next: Atlas = await res.json();
      if (!controller.signal.aborted) {
        setAtlas(next);
        if (syncUrl) onHpiType(id === "average" ? null : id);
      }
    } catch (e) {
      if (!controller.signal.aborted) setLoadError(e instanceof Error ? e.message : "Could not load measure.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (isRent) return;
    if (hpiType !== atlas.measure && HPI_IDS.has(hpiType)) void changeHpi(hpiType, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- respond to URL type only
  }, [hpiType, isRent]);

  const search = async () => {
    if (matches.length) {
      select(matches[0]!.code);
      return;
    }
    if (!query.trim()) return;
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    setLooking(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/housing/postcode?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Search failed");
      if (!places.some((p) => p.code === result.code)) {
        throw new Error(`${result.name} has no matching boundary. Search by area name instead.`);
      }
      if (!controller.signal.aborted) {
        select(result.code);
        setSearchError(`${result.postcode} is in ${result.name}. Figures describe the whole local authority.`);
      }
    } catch (e) {
      if (!controller.signal.aborted) setSearchError(e instanceof Error ? e.message : "Search unavailable.");
    } finally {
      if (!controller.signal.aborted) setLooking(false);
    }
  };

  const setMonthIndex = (i: number, stopPlay = true) => {
    if (stopPlay) setPlaying(false);
    setCursor(i);
    const next = atlas.months[i];
    onDate(next ? next.slice(0, 7) : null);
  };

  return (
    <div className={s.root} aria-busy={loading}>
      <div className={s.toolbar}>
        <form
          className={s.search}
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label className="bo-label" htmlFor={searchId}>
            Place or postcode
          </label>
          <div className={s.searchRow}>
            <input
              id={searchId}
              value={query}
              onChange={(e) => {
                searchRef.current?.abort();
                setLooking(false);
                setQuery(e.target.value);
                setSearchError("");
              }}
              placeholder="Manchester or M1 1AD"
              autoComplete="off"
            />
            <button type="submit" disabled={looking} aria-label="Find place">
              {looking ? "…" : "→"}
            </button>
          </div>
          {matches.length > 0 && (
            <ul className={s.matches}>
              {matches.map((p) => (
                <li key={p.code}>
                  <button type="button" onClick={() => select(p.code)}>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchError && (
            <p className={s.notice} role="status">
              {searchError}
            </p>
          )}
        </form>

        {!isRent && !isAfford && (
          <div className={s.field}>
            <span className="bo-label" id={`${searchId}-measure`}>
              Property / measure
            </span>
            <PrintSelect
              labelledBy={`${searchId}-measure`}
              value={atlas.measure}
              options={atlas.measures.map((m) => ({ value: m.id, label: m.label }))}
              onChange={(v) => void changeHpi(v)}
              className={s.menu}
            />
          </div>
        )}

        {!isAfford && (
          <div className={s.field}>
            <span className="bo-label">Show on map</span>
            <div className={s.segment} role="group" aria-label="Map mode">
              <button type="button" aria-pressed={mode === "price"} onClick={() => onMode("price")}>
                {levelWord}
              </button>
              <button type="button" aria-pressed={mode === "change"} onClick={() => onMode("change")}>
                Annual change
              </button>
            </div>
          </div>
        )}

      </div>

      {loading && (
        <p className={s.status} role="status">
          Loading measure…
        </p>
      )}
      {loadError && (
        <p className={s.notice} role="alert">
          {loadError}
        </p>
      )}

      {unsupported ? (
        <p className={s.notice}>
          This map is not drawn for that combination. Annual change and the rent index are published for all homes.
          Bedroom and property-type figures are monthly rents in pounds — choose Monthly rent, or set Property back to all homes.
        </p>
      ) : (
      <>
      <div className={s.grid}>
        <div className={s.mapCol}>
          <AreaMap
            shapes={geometry.shapes}
            areas={atlas.areas}
            month={monthIndex}
            measure={atlas.measure}
            mode={storedRate ? "price" : mapMode}
            selected={selected}
            comparison={compareCode}
            onSelect={select}
            compact
          />

          <div className={s.timeline} role="group" aria-label={isAfford ? "Observation year" : "Observation month"}>
            <div className={s.timelineControls}>
              <button
                type="button"
                aria-label={playing ? "Pause timeline" : "Play timeline"}
                onClick={() => {
                  if (playing) {
                    setPlaying(false);
                    onDate(atlas.months[monthIndex]!.slice(0, 7));
                    return;
                  }
                  const first = periodIndexes[0]?.index ?? 0;
                  const last = periodIndexes[periodIndexes.length - 1]?.index ?? atlas.months.length - 1;
                  // Latest month: rewind, then play from the first period.
                  const start = monthIndex >= last ? first : monthIndex;
                  playFrom.current = start;
                  playStarted.current = performance.now();
                  setCursor(start);
                  setPlaying(true);
                }}
              >
                {playing ? "Ⅱ" : "▷"}
              </button>
              <button type="button" disabled={monthIndex <= (periodIndexes[0]?.index ?? 0)} onClick={() => setMonthIndex(monthIndex - 1)} aria-label={isAfford ? "Previous year" : "Previous month"}>
                ←
              </button>
              <output>{periodText(period)}</output>
              <button
                type="button"
                disabled={monthIndex >= (periodIndexes[periodIndexes.length - 1]?.index ?? atlas.months.length - 1)}
                onClick={() => setMonthIndex(monthIndex + 1)}
                aria-label={isAfford ? "Next year" : "Next month"}
              >
                →
              </button>
              <span className={s.micro}>
                {coverage} / {geometry.shapes.length} areas with data
              </span>
            </div>
            <input
              type="range"
              min={periodIndexes[0]?.index ?? 0}
              max={periodIndexes[periodIndexes.length - 1]?.index ?? 0}
              value={monthIndex}
              aria-valuetext={periodText(period)}
              aria-label={isAfford ? "Observation year" : "Observation month"}
              onChange={(e) => setMonthIndex(Number(e.target.value))}
            />
            <div className={s.timeEnds}>
              <span>{periodText(periodIndexes[0]?.month ?? atlas.months[0]!)}</span>
              <span>{periodText(periodIndexes[periodIndexes.length - 1]?.month ?? atlas.months[atlas.months.length - 1]!)}</span>
            </div>
          </div>
        </div>

        <aside className={s.readout} aria-live="polite">
          <p className="bo-label">In focus</p>
          {!selected ? (
            <p className={s.notice}>
              Select a local authority on the map or in the list. No place is chosen until you do.
            </p>
          ) : (
            <>
          <h3 className={s.placeName}>{name}</h3>
          <p className={`bo-fig ${s.value}`}>{formatValue(value, atlas.measure, displayMode)}</p>
          <p className={s.valueLabel}>
            {measureLabel}
            {!isAfford && !isRent
              ? atlas.measure === "sales-volume"
                ? " · transaction count"
                : mapMode === "change"
                  ? " · annual change, nominal"
                  : " · nominal"
              : mapMode === "change"
                ? " · annual change"
                : ""}
            {" · "}
            {periodText(period)}
          </p>
          {!isAfford && !isRent && (
            <p className={s.notice}>
              {atlas.measure === "sales-volume"
                ? "A count of transactions in the UK House Price Index. Not the Price Paid file."
                : atlas.measure === "new-build" || atlas.measure === "existing"
                  ? "Nominal pounds. This is a different mix of homes, not the premium for an otherwise identical house."
                  : mapMode === "change"
                    ? "Change in the nominal price. Not adjusted for inflation."
                    : "Nominal pounds of this month. Not adjusted for inflation."}
            </p>
          )}

          {value == null ? (
            <p className={s.notice}>
              {isAfford
                ? "No AFF1 ratio for this place and year (England & Wales only). Gaps stay visible — no substitute value."
                : "No observation for this place and month. Gaps stay visible — no substitute value."}
            </p>
          ) : (
            <dl className={s.benchmarks}>
              {!isAfford && (
                <div>
                  <dt>Annual change</dt>
                  <dd>{formatValue(annual, atlas.measure, "change")}</dd>
                </div>
              )}
              <div>
                <dt>
                  {isAfford ? "England" : "UK"} {mapMode === "change" ? "annual change" : ukLevelLabel}
                </dt>
                <dd>{formatValue(valueAt(benchmark, monthIndex, readMode), atlas.measure, displayMode)}</dd>
              </div>
            </dl>
          )}

          <div className={s.compare}>
            <span className="bo-label" id={`${searchId}-compare`}>
              Compare
            </span>
            <PrintSelect
              labelledBy={`${searchId}-compare`}
              value={compareCode || "__none__"}
              options={[
                { value: "__none__", label: "None" },
                ...atlas.areas
                  .filter((a) => a.code !== selected)
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((a) => ({
                    value: a.code,
                    label: a.name,
                  })),
              ]}
              onChange={(v) => onCompare(v === "__none__" ? null : v)}
              className={s.menuWide}
            />
          </div>
          {compare && (
            <p className={s.compareReadout}>
              <span>{compare.name}</span>
              <strong>{formatValue(valueAt(compare, monthIndex, readMode), atlas.measure, displayMode)}</strong>
            </p>
          )}

          <div className={s.trendHead}>
            <span className="bo-label">History to selected month</span>
            <button type="button" className={s.textBtn} onClick={() => setAllYears((v) => !v)}>
              {allYears ? "Show 10 years" : "Show all years"}
            </button>
          </div>
          {chartSeries.some((c) => c.points.length > 0) ? (
            <TimeChart
              series={chartSeries}
              cadence="monthly"
              format={(v) => formatValue(v, atlas.measure, displayMode)}
              axisFormat={(v) => formatValue(v, atlas.measure, displayMode, true)}
              height={200}
              label={`${name} ${measureLabel} history${compare ? ` compared with ${compare.name}` : ""}`}
            />
          ) : (
            <p className={s.notice}>No history for this measure in the selected period.</p>
          )}
            </>
          )}

          <section className={s.legend} aria-label="Map legend">
            <p className="bo-label">
              {mapMode === "change" ? "Annual change · %" : legendLevel}
            </p>
            {/* Same 45° electric screen as the map — density only, one ink */}
            <svg className={s.legendDefs} width="0" height="0" aria-hidden="true">
              <LegendBandDefs idPrefix={legendId} />
            </svg>
            {BAND_RADII.map((_, i) => (
              <div key={i} className={s.legendRow}>
                <svg className={s.swatch} viewBox="0 0 36 14" aria-hidden="true">
                  <rect width="36" height="14" fill="var(--bo-paper)" />
                  <rect width="36" height="14" fill={`url(#${legendId}-band-${i})`} />
                  <rect width="36" height="14" fill="none" stroke="var(--bo-ink-20)" strokeWidth="1" />
                </svg>
                <span>
                  {i === 0
                    ? `Below ${formatValue(thresholds[0], atlas.measure, displayMode, true)}`
                    : i === 6
                      ? `${formatValue(thresholds[5], atlas.measure, displayMode, true)} and above`
                      : `${formatValue(thresholds[i - 1], atlas.measure, displayMode, true)} – ${formatValue(thresholds[i], atlas.measure, displayMode, true)}`}
                </span>
              </div>
            ))}
          </section>
        </aside>
      </div>
      <details className={s.places} onToggle={(event) => setPlacesOpen(event.currentTarget.open)}>
        <summary className="bo-disclosure">All places as a table</summary>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">Local authority</th>
                <th scope="col">{mapMode === "change" ? "Annual change" : levelWord}</th>
              </tr>
            </thead>
            <tbody>
              {localValues.map((row) => (
                <tr key={row.code} aria-selected={row.code === selected}>
                  <td>
                    <button type="button" onClick={() => select(row.code)}>
                      {row.name}
                    </button>
                  </td>
                  <td>{formatValue(row.value, atlas.measure, displayMode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      </>
      )}
    </div>
  );
}

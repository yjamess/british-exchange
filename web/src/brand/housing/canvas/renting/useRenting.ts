"use client";

/**
 * URL state for Renting, plus the place's own observations when the reader
 * leaves the United Kingdom series that the page already loaded.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { fmt, fmtT, toT, type Pt } from "../../../data";
import type { HousingV1 } from "../../load";
import {
  applyWindow,
  boundsOf,
  categoryLabel,
  chartForPlaces,
  columnLabel,
  columnsFromLines,
  figuresForRent,
  focusForView,
  formatRent,
  isPublished,
  measureForFocus,
  monthInsideWindow,
  parseRentAreas,
  pointAtMonth,
  privateRentReading,
  RENT_UK,
  rentTitle,
  resolveMonth,
  tableForPlaces,
  type RentColumn,
  type RentPlaceColumns,
  type RentFigure,
  type RentFocus,
  type RentMeasure,
} from "./selection";

export type RentPlaceOption = { code: string; name: string; level: "uk" | "nation" | "region" | "local" };

type AreaPack = {
  code: string;
  name: string;
  months: string[];
  series: Record<string, (number | null)[]>;
  provisional: Record<string, boolean[]>;
};

const UK = RENT_UK;

function packColumns(pack: AreaPack): RentColumn[] {
  return Object.entries(pack.series).flatMap(([key, values]) => {
    const [category, measure] = key.split("|") as [string, RentMeasure];
    if (!category || (measure !== "average-rent" && measure !== "annual-change" && measure !== "index")) return [];
    const flags = pack.provisional[key] ?? [];
    const points: Pt[] = [];
    pack.months.forEach((iso, index) => {
      const value = values[index];
      if (value == null || !Number.isFinite(value)) return;
      const point: Pt = { t: toT(iso), v: value };
      if (flags[index]) point.provisional = true;
      points.push(point);
    });
    return [{ id: key, category, measure, label: columnLabel(category, measure), points }];
  });
}

export function useRenting(
  enabled: boolean,
  data: HousingV1,
  view: string,
  rentParam: string | null,
  areaParam: string,
  categoryParam: string,
  fromParam: number | null,
  toParam: number | null,
  dateParam: string,
  lettingsView: "history" | "rent" | "needs" | "data" = "history",
) {
  const focus = focusForView(view, rentParam);
  // A home type only stands if this view can draw it: annual change and the index are
  // published for all homes only, and By size draws bedroom sizes, not property types.
  const homeFits = (id: string) =>
    focus === "bedrooms" ? id === "all" || id.startsWith("bedrooms-") : isPublished(measureForFocus(focus), id);
  const category = categoryParam && homeFits(categoryParam) ? categoryParam : "all";
  const [places, setPlaces] = useState<RentPlaceOption[]>([]);
  const [packs, setPacks] = useState<Record<string, AreaPack>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});
  const packsRef = useRef(packs);
  packsRef.current = packs;

  const ukColumns = useMemo(
    () =>
      columnsFromLines({
        average: data.rentAverage,
        change: data.rentChange,
        index: data.rentIndex,
        bedrooms: data.rentBedrooms,
        propertyTypes: data.rentPropertyTypes,
      }),
    [data],
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/housing/rent-series?list=places", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Places could not be loaded.");
        const body = (await res.json()) as { places: RentPlaceOption[] };
        setPlaces(body.places);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [enabled]);

  // Map shades one place's measure, and By size draws one place's bedroom lines,
  // so those views keep the first place only. Other views add a line per place.
  const singlePlaceView = view === "map" || view === "bedrooms";
  const areas = useMemo(() => {
    const all = parseRentAreas(areaParam);
    return singlePlaceView ? all.slice(0, 1) : all;
  }, [areaParam, singlePlaceView]);
  const remoteKey = areas.filter((code) => code !== UK).join(",");

  useEffect(() => {
    if (!enabled) return;
    const codes = remoteKey ? remoteKey.split(",") : [];
    const missing = codes.filter((code) => !packsRef.current[code]);
    if (missing.length === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    Promise.all(
      missing.map(async (code) => {
        const res = await fetch(`/api/housing/rent-series?area=${encodeURIComponent(code)}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as AreaPack & { error?: string };
        if (!res.ok) return { code, error: body.error ?? "This place could not be loaded.", pack: null };
        return { code, error: "", pack: body };
      }),
    )
      .then((results) => {
        if (cancelled) return;
        setPacks((prev) => {
          const next = { ...prev };
          for (const row of results) {
            if (row.pack) next[row.pack.code || row.code] = row.pack;
          }
          return next;
        });
        setFailed((prev) => {
          const next = { ...prev };
          for (const row of results) {
            if (row.error) next[row.code] = row.error;
            else delete next[row.code];
          }
          return next;
        });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : "This place could not be loaded.";
        setFailed((prev) => {
          const next = { ...prev };
          for (const code of missing) next[code] = message;
          return next;
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, remoteKey]);

  const nameOf = (code: string) =>
    code === UK
      ? "United Kingdom"
      : packs[code]?.name ?? places.find((place) => place.code === code)?.name ?? "Selected place";
  const located: RentPlaceColumns[] = areas.map((code) => ({
    code,
    name: nameOf(code),
    columns: code === UK ? ukColumns : packs[code] ? packColumns(packs[code]) : [],
  }));
  const ready = located.filter((place) => place.columns.length > 0);
  const waiting = enabled && areas.some((code) => code !== UK && !packs[code] && !failed[code]);
  const failures = areas.map((code) => failed[code]).filter((message): message is string => Boolean(message));
  const error = ready.length === 0 && failures.length > 0 ? failures[0]! : "";
  const single = areas.length <= 1;
  const placeCode = areas.join("-");
  const placeName = single ? nameOf(areas[0] ?? UK) : `${areas.length} places`;
  const area = single && (areas[0] ?? UK) === UK ? "" : areas.join(",");
  const unit = data.sources["private-rental-prices"]?.unit;

  const chartPick = chartForPlaces(ready, view, focus, category);
  const fallbackColumns = ready.flatMap((place) => place.columns);
  const chartBounds = boundsOf(chartPick.columns.length ? chartPick.columns : fallbackColumns);
  const chartWindow = applyWindow(chartPick.columns, chartBounds, fromParam, toParam);

  const shownTable = tableForPlaces(ready, focus, category);
  const tableBounds = boundsOf(shownTable);
  const tableWindow = applyWindow(shownTable, tableBounds, fromParam, toParam);

  const activeWindow = view === "table" ? tableWindow : chartWindow;
  const monthSource = ready.find((place) => place.code === UK)?.columns ?? ready[0]?.columns ?? ukColumns;
  const months = monthsFrom(monthSource);
  const resolved = resolveMonth(months, dateParam);
  const mapMonth = months.length
    ? monthInsideWindow(months, resolved.month, activeWindow.from, activeWindow.to)
    : "";
  const monthMoved = Boolean(dateParam) && mapMonth.slice(0, 7) !== dateParam.slice(0, 7);

  const failureNote =
    failures.length > 0 && ready.length > 0 ? "One of the selected places could not be loaded." : "";
  const periodNote = activeWindow.invalid
    ? "The period in the link does not cover this series, so the full series is shown."
    : resolved.missing
      ? "The month in the link is not in this series. Showing the latest month that is."
      : monthMoved
        ? "That month sits outside the selected period. Showing the latest month inside it."
        : failureNote;

  const reading = [
    ...(view === "tenancies"
      ? []
      : privateRentReading(unit, focus === "bedrooms" ? "average-rent" : focus)),
  ];

  const lettings = [...data.insecurity.lettingsBreakdown].sort((a, b) => a.t - b.t);
  const letting = lettings.at(-1);
  const previousLetting = letting ? lettings.find(row => row.t === letting.t - 1) : undefined;
  const lettingYear = letting ? `${Math.floor(letting.t)}–${String(Math.floor(letting.t) + 1).slice(-2)}` : "";
  const mapHome = category || "all";
  const mapMeasure = measureForFocus(focus);
  const mapColumn =
    view === "map" && isPublished(mapMeasure, mapHome)
      ? ready[0]?.columns.find((col) => col.category === mapHome && col.measure === mapMeasure)
      : undefined;
  const figures: RentFigure[] =
    view === "tenancies"
      ? letting
        ? lettingsView === "rent"
          ? [
              { label: "New lettings", value: fmt.count(letting.total), note: `England · ${lettingYear}` },
              { label: "Social rent", value: fmt.count(letting.social), note: "Lettings, not a monthly rent" },
              { label: "Affordable rent", value: fmt.count(letting.affordable), note: "Lettings, not a monthly rent" },
            ]
          : lettingsView === "needs"
            ? [
                { label: "New lettings", value: fmt.count(letting.total), note: `England · ${lettingYear}` },
                { label: "General needs", value: fmt.count(letting.generalNeeds), note: `Of the same lettings · ${lettingYear}` },
                { label: "Supported housing", value: fmt.count(letting.supported), note: `Of the same lettings · ${lettingYear}` },
              ]
            : [
                { label: "New social lettings", value: fmt.count(letting.total), note: `England · ${lettingYear}` },
                { label: "Annual change", value: previousLetting && previousLetting.total > 0 ? fmt.pctSigned((letting.total / previousLetting.total - 1) * 100) : "—", note: previousLetting ? `Compared with ${Math.floor(previousLetting.t)}–${String(Math.floor(previousLetting.t) + 1).slice(-2)}` : "Previous financial year unavailable" },
                { label: "Supported housing", value: letting.total > 0 ? fmt.pct(letting.supported / letting.total * 100) : "—", note: `Share of new lettings · ${lettingYear}` },
              ]
        : [{ label: "Social lettings", value: "—", note: "Not loaded" }]
      : waiting
        ? [{ label: placeName, value: "…", note: "Loading the selected places" }]
        : error
          ? [{ label: placeName, value: "—", note: error }]
          : view === "map"
            ? single
              ? mapMonthFigures(placeName, mapColumn, mapMonth, chartPick.emptyReason)
              : mapPlacesFigures(ready, mapHome, mapMeasure, mapMonth, chartPick.emptyReason)
            : figuresForRent(
                placeName,
                view === "table" ? tableWindow.series.slice(0, single ? 3 : tableWindow.series.length) : chartWindow.series,
                focus,
                view === "table" ? null : chartPick.emptyReason,
                single,
              );

  const homeOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const col of ukColumns) if (col.category !== "all") ids.add(col.category);
    const bedrooms = [...ids].filter((id) => id.startsWith("bedrooms-")).sort();
    const types = [...ids].filter((id) => id.startsWith("type-")).sort();
    return ["all", ...bedrooms, ...types].filter(homeFits);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- homeFits depends on focus only
  }, [ukColumns, focus]);

  return {
    focus,
    category,
    areas,
    area,
    placeCode,
    placeName,
    places,
    homeOptions,
    loading: waiting,
    error,
    unit,
    title: rentTitle(
      placeName,
      !single && (focus === "bedrooms" || view === "bedrooms") && !/^(bedrooms-|type-)/.test(category)
        ? "average-rent"
        : view === "change"
          ? "annual-change"
          : view === "index"
            ? "index"
            : view === "bedrooms"
              ? "bedrooms"
              : focus,
      category,
      unit,
    ),
    mapTitle: isPublished(mapMeasure, mapHome)
      ? mapMeasure === "annual-change"
        ? `Annual change in private rents by local authority · ${placeName}`
        : mapHome !== "all" && mapHome !== ""
          ? `Average monthly rent by local authority · ${categoryLabel(mapHome)} · ${placeName}`
          : `Average monthly rent by local authority · ${placeName}`
      : `Not published for ${categoryLabel(mapHome)} · ${placeName}`,
    reading,
    figures,
    plotted: chartWindow.series,
    table: tableWindow.series,
    fullTable: shownTable,
    periodIsFull: activeWindow.from === (view === "table" ? tableBounds : chartBounds)?.min
      && activeWindow.to === (view === "table" ? tableBounds : chartBounds)?.max,
    emptyReason: chartPick.emptyReason,
    from: activeWindow.from,
    to: activeWindow.to,
    periodInvalid: activeWindow.invalid,
    periodNote,
    mapMonth,
    mapMeasure,
    mapPublished: isPublished(mapMeasure, mapHome),
    seriesMin: (view === "table" ? tableBounds : chartBounds)?.min ?? null,
    seriesMax: (view === "table" ? tableBounds : chartBounds)?.max ?? null,
  };
}

function mapPlacesFigures(
  places: RentPlaceColumns[],
  category: string,
  measure: RentMeasure,
  month: string,
  emptyReason: string | null,
): RentFigure[] {
  if (emptyReason) return [{ label: "Places", value: "—", note: emptyReason }];
  return places.map((place) => {
    const column = place.columns.find((col) => col.category === category && col.measure === measure);
    const point = column ? pointAtMonth(column.points, month) : undefined;
    return {
      label: place.name,
      value: point ? formatRent(measure, point.v) : "—",
      note: point ? fmtT(point.t) : "No observation that month",
    };
  });
}

function mapMonthFigures(
  place: string,
  column: RentColumn | undefined,
  month: string,
  emptyReason: string | null,
): RentFigure[] {
  if (emptyReason || !column) {
    return [{ label: place, value: "—", note: emptyReason ?? "No observations for this selection." }];
  }
  const point = pointAtMonth(column.points, month);
  return [
    {
      label: column.label,
      value: point ? formatRent(column.measure, point.v) : "—",
      note: point ? `${place} · ${fmtT(point.t)}` : `${place} · no observation that month`,
    },
  ];
}

function monthsFrom(columns: RentColumn[]): string[] {
  const average = columns.find((col) => col.category === "all" && col.measure === "average-rent");
  if (!average) return [];
  return average.points.map((point) => {
    const year = Math.floor(point.t + 1e-6);
    const month = Math.round((point.t - year) * 12) + 1;
    return `${year}-${String(month).padStart(2, "0")}-01`;
  });
}

"use client";

/**
 * Everyday basket — state for the price-tag wall (brief 04, The British Basket).
 *
 * The shelf: what's on the wall is chosen by Show (Featured · Your basket · All items · one ONS
 * group) and a search box. Any item can join the basket with +. Year menus compare January
 * prices (all items have them); Play the months steps To through every month, using each basket
 * item's monthly series (featured items arrive with the page, others are fetched on joining).
 * Totals use only items priced in both months; the rest are named, never estimated.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Observation } from "@/lib/api";
import type { ExplorerFigure } from "../template";
import { fmtPrice } from "./inflation-model";
import { buildCatalogue, itemSlug, type CatalogueItem } from "./basket-catalogue";
import { fetchBasketItem } from "./basket-load";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** A starter basket: a loaf, two milks, butter, bananas and potatoes. */
const STARTER: Record<string, number> = {
  "white-sliced-bread": 1,
  "semi-skimmed-milk": 2,
  butter: 1,
  bananas: 1,
  "white-potatoes": 1,
};

const STEP_MS = 75;
const MAX_QTY = 12;
/** Tags drawn at once; search narrows the rest. */
export const SHELF_LIMIT = 24;

export type BasketShow = "featured" | "basket" | "all" | string;

function parseQty(raw: string | null): Record<string, number> {
  if (raw == null) return { ...STARTER };
  const out: Record<string, number> = {};
  for (const part of raw.split(",")) {
    const [slug, n] = part.split(".");
    const q = Math.max(0, Math.min(MAX_QTY, Number(n) || 0));
    if (slug && q) out[slug] = q;
  }
  return out;
}

function writeUrl(next: Record<string, string | null>) {
  const u = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(next)) {
    if (v == null || v === "") u.delete(k);
    else u.set(k, v);
  }
  window.history.replaceState(null, "", `${window.location.pathname}?${u}`);
}

export type BasketTag = {
  slug: string;
  label: string;
  size: string | null;
  plate: string;
  qty: number;
  from: number | null;
  to: number | null;
  firstMonth: string | null;
};

export function useBasket(rows: Observation[], params: URLSearchParams) {
  const catalogue = useMemo(() => buildCatalogue(rows), [rows]);
  const bySlug = useMemo(() => new Map(catalogue.map((c) => [c.slug, c])), [catalogue]);

  /** Monthly series fetched in the browser for items that joined the basket. */
  const [extra, setExtra] = useState<Record<string, Observation[]>>({});
  const asked = useRef(new Set<string>());

  /** item → month (YYYY-MM) → £ */
  const prices = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const add = (r: Observation) => {
      const slug = itemSlug(r);
      if (!slug || r.value == null) return;
      let m = map.get(slug);
      if (!m) map.set(slug, (m = new Map()));
      m.set(r.period_start.slice(0, 7), r.value);
    };
    rows.forEach(add);
    Object.values(extra).forEach((list) => list.forEach(add));
    return map;
  }, [rows, extra]);

  const months = useMemo(() => {
    const all = new Set<string>();
    for (const m of prices.values()) for (const k of m.keys()) all.add(k);
    return [...all].sort();
  }, [prices]);
  /** Comparison years: every year with a January price (the series runs Jan 2018 → Jan 2025). */
  const years = useMemo(
    () => months.filter((m) => m.endsWith("-01")).map((m) => m.slice(0, 4)),
    [months],
  );

  const first = months[0] ?? "";
  const last = months[months.length - 1] ?? "";
  const pick = (raw: string | null, fallback: string) => (raw && months.includes(raw) ? raw : fallback);

  const [from, setFrom] = useState(() => pick(params.get("from"), first));
  const [to, setTo] = useState(() => pick(params.get("to"), last));
  const [qty, setQty] = useState(() => parseQty(params.get("q")));
  const [show, setShow] = useState<BasketShow>(() => params.get("show") ?? "featured");
  const [search, setSearch] = useState(() => params.get("find") ?? "");
  const [playing, setPlaying] = useState(false);
  const [heldTo, setHeldTo] = useState(to);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!months.length) return;
    setFrom((f) => (months.includes(f) ? f : first));
    setTo((t) => (months.includes(t) ? t : last));
  }, [months, first, last]);

  /** Fetch monthly prices for basket items that only have January rows so far. */
  useEffect(() => {
    for (const slug of Object.keys(qty)) {
      const item = bySlug.get(slug);
      if (!item || item.featured || asked.current.has(slug)) continue;
      asked.current.add(slug);
      fetchBasketItem(slug)
        .then((list) => setExtra((e) => ({ ...e, [slug]: list })))
        .catch(() => asked.current.delete(slug));
    }
  }, [qty, bySlug]);

  const stop = useCallback(() => {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }, []);
  useEffect(() => stop, [stop]);

  const chooseFromYear = useCallback(
    (y: string) => {
      const m = `${y}-01`;
      stop();
      setFrom(m);
      const t = m > to ? m : to;
      setTo(t);
      writeUrl({ from: m, to: t });
    },
    [to, stop],
  );
  const chooseToYear = useCallback(
    (y: string) => {
      const m = `${y}-01`;
      stop();
      setTo(m);
      const f = m < from ? m : from;
      setFrom(f);
      writeUrl({ to: m, from: f });
    },
    [from, stop],
  );

  const step = useCallback((slug: string, d: number) => {
    setQty((q) => {
      const n = Math.max(0, Math.min(MAX_QTY, (q[slug] ?? 0) + d));
      const next = { ...q };
      if (n) next[slug] = n;
      else delete next[slug];
      writeUrl({
        q: Object.entries(next)
          .map(([s, k]) => `${s}.${k}`)
          .join(","),
      });
      return next;
    });
  }, []);

  const chooseShow = useCallback((v: BasketShow) => {
    setShow(v);
    writeUrl({ show: v === "featured" ? null : v });
  }, []);
  const chooseSearch = useCallback((v: string) => {
    setSearch(v);
    writeUrl({ find: v.trim() || null });
  }, []);

  /** Run the To month from From to the last month, one month per tick. */
  const play = useCallback(() => {
    if (playing) return stop();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const span = months.filter((m) => m >= from);
    if (reduced || span.length < 2) {
      setTo(last);
      writeUrl({ to: last });
      return;
    }
    let i = 0;
    setHeldTo(to);
    setTo(span[0]!);
    setPlaying(true);
    timer.current = window.setInterval(() => {
      i += 1;
      if (i >= span.length) {
        stop();
        writeUrl({ to: last });
        return;
      }
      setTo(span[i]!);
    }, STEP_MS);
  }, [playing, stop, months, from, last, to]);

  const reset = useCallback(() => {
    stop();
    setFrom(first);
    setTo(last);
    setQty(parseQty(null));
    setShow("featured");
    setSearch("");
    writeUrl({ from: null, to: null, q: null, show: null, find: null });
  }, [stop, first, last]);

  const tagFor = useCallback(
    (c: CatalogueItem, at: string): BasketTag => {
      const p = prices.get(c.slug);
      const keys = p ? [...p.keys()].sort() : [];
      return {
        slug: c.slug,
        label: c.label,
        size: c.size,
        plate: c.plate,
        qty: qty[c.slug] ?? 0,
        from: p?.get(from) ?? null,
        to: p?.get(at) ?? null,
        firstMonth: keys[0] ?? null,
      };
    },
    [prices, qty, from],
  );

  /** Items on the shelf for the current Show + search, and how many matched in all. */
  const shelf = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = catalogue;
    if (q) list = list.filter((c) => c.label.toLowerCase().includes(q) || c.subgroup.toLowerCase().includes(q));
    else if (show === "featured") list = list.filter((c) => c.featured || (qty[c.slug] ?? 0) > 0);
    else if (show === "basket") list = list.filter((c) => (qty[c.slug] ?? 0) > 0);
    else if (show !== "all") list = list.filter((c) => c.group === show);
    return { items: list.slice(0, SHELF_LIMIT), matched: list.length };
  }, [catalogue, search, show, qty]);

  const tags = useMemo(() => shelf.items.map((c) => tagFor(c, to)), [shelf, tagFor, to]);

  const totalsAt = useCallback(
    (at: string) => {
      let a = 0;
      let b = 0;
      let n = 0;
      const left: string[] = [];
      for (const [slug, k] of Object.entries(qty)) {
        const c = bySlug.get(slug);
        if (!c || !k) continue;
        const t = tagFor(c, at);
        if (t.from == null || t.to == null) {
          left.push(c.label);
          continue;
        }
        a += k * t.from;
        b += k * t.to;
        n += k;
      }
      return { from: a, to: b, items: n, left };
    },
    [qty, bySlug, tagFor],
  );
  const totals = useMemo(() => totalsAt(to), [totalsAt, to]);
  const figTo = playing ? heldTo : to;
  const figTotals = useMemo(() => (figTo === to ? totals : totalsAt(figTo)), [figTo, to, totals, totalsAt]);

  const figures: ExplorerFigure[] = useMemo(() => {
    const t = figTotals;
    const change = t.from > 0 ? (t.to / t.from - 1) * 100 : null;
    return [
      {
        label: `Your basket · ${from ? monthLabel(from) : "—"}`,
        value: t.items ? fmtPrice(t.from) : "—",
        note: t.items ? `${t.items} item${t.items === 1 ? "" : "s"}` : "Add items with +",
      },
      {
        label: `Your basket · ${figTo ? monthLabel(figTo) : "—"}`,
        value: t.items ? fmtPrice(t.to) : "—",
        note: "Same items, same quantities",
      },
      {
        label: "Change",
        value: change != null ? `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(0)}%` : "—",
        note: from && figTo ? `${monthLabel(from)} to ${monthLabel(figTo)}` : "",
      },
    ];
  }, [figTotals, figTo, from]);

  return {
    catalogueSize: catalogue.length,
    months,
    years,
    from,
    to,
    chooseFromYear,
    chooseToYear,
    show,
    chooseShow,
    search,
    chooseSearch,
    shelf,
    tags,
    step,
    play,
    playing,
    reset,
    figures,
    totals,
    last,
  };
}

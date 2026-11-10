"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { Plate } from "../Plate";
import { DitherField, groundField } from "../motion";
import { DualScramble, DUAL_DIGITS } from "../motion/DualScramble";
import { PrintMultiSelect, PrintSelect, type PrintMultiOption, type PrintOption } from "../PrintSelect";
import type { ChartSeries, Cadence } from "../instrument/TimeChart";
import { fmtT } from "../data";
import s from "./explorer.module.css";

/**
 * Brand template — Explorer. The canonical sector canvas (docs/visual-identity.md → Explorer):
 *
 *   <Explorer sector domains active onSelectDomain>        rail: one index of photo plates
 *     <ExplorerHead views view onView />                    crumb · question · view tabs (ink carriage)
 *     <FigureStrip figures />                               dual-scramble on change
 *     <ControlRow> <MenuControl/> <MultiMenuControl/> <PeriodControl/> <ResetButton/> </ControlRow>
 *     <Stage title foot={<FigureRecord …/>}> …plot… </Stage>  fixed frame; every state fills it
 *   </Explorer>
 *   (No Coverage facts strip under the stage — Housing does not use it.)
 *
 * Controlled: the sector page owns data, URL state and any special stage content (maps, calculators).
 * Motion: rail condenses (GSAP width), one ink carriage travels between tabs and between rail rows,
 * plates magnify under a loupe on hover, labels dual-scramble on hover. Reduced motion: all instant.
 */

/* ——— Types ——— */

export type ExplorerDomain = {
  id: string;
  title: string;
  /** Short rail caption when condensed (plate-only column). Falls back to title. */
  short?: string;
  /** Caslon headline: the domain's question. */
  question: string;
  /**
   * Photo-reference plate for the rail (REF_ICON_PLATES entry or any mask). Leave unset until one is
   * drawn: the rail shows a numbered proof tile (dot screen) instead of borrowing another sector's plate.
   */
  plate?: { src: string; alt?: string };
  status: "ready" | "preparation";
};
export type ExplorerView = { id: string; label: string };
export type ExplorerFigure = { label: string; value: string; note: string };
export type ExplorerSource = { id: string; publisher: string; title: string; release?: string; href?: string };
export type SourceRow = { label: string; text: string; href?: string; linkLabel?: string; external?: boolean };

const EXPANDED_W = "22rem";
/** Wide enough for a short caption under each plate. */
const CONDENSED_W = "6.75rem";
/** Stable field identity — a new function each render would restart the field. */
const GROUND = groundField();
const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ——— Context ——— */

type Ctx = {
  uid: string;
  sector: string;
  domain: ExplorerDomain;
  index: number;
  condensed: boolean;
  setCondensed: (v: boolean) => void;
};
const ExplorerCtx = createContext<Ctx | null>(null);

/** Inside an Explorer: current domain, its number, and the condensed state (e.g. condense for a map). */
export function useExplorer(): Ctx {
  const ctx = useContext(ExplorerCtx);
  if (!ctx) throw new Error("useExplorer must be used inside <Explorer>");
  return ctx;
}

/* ——— Shell ——— */

export function Explorer({
  sector,
  indexLabel,
  domains,
  active,
  onSelectDomain,
  condensed: condensedProp,
  onCondensedChange,
  ground = "paper",
  decor,
  children,
}: {
  /** Crumb + rail aria label, e.g. "Housing & Land". */
  sector: string;
  /** Rail heading, e.g. "Housing index". */
  indexLabel: string;
  domains: ExplorerDomain[];
  active: string;
  onSelectDomain: (id: string) => void;
  /** Controlled condensed rail (optional). */
  condensed?: boolean;
  onCondensedChange?: (v: boolean) => void;
  /** Canvas ground: paper, or a light dot field behind paper patches (light by density). */
  ground?: "paper" | "field";
  /** Sector decoration drawn behind the canvas content (content sits on paper patches above it). */
  decor?: ReactNode;
  children: ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const [own, setOwn] = useState(false);
  const condensed = condensedProp ?? own;
  const setCondensed = (v: boolean) => {
    if (condensedProp === undefined) setOwn(v);
    onCondensedChange?.(v);
  };
  const shellRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const domain = domains.find((d) => d.id === active) ?? domains[0]!;
  const index = domains.indexOf(domain) + 1;

  // Rail width + label clip (GSAP; reduced motion = instant).
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const mm = gsap.matchMedia();
    const labels = () => Array.from(labelRefs.current.values());
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.to(shell, { ["--rail-width" as string]: condensed ? CONDENSED_W : EXPANDED_W, duration: 0.42 }, 0);
      tl.to(labels(), { maxWidth: condensed ? 0 : 280, duration: 0.32, stagger: condensed ? 0.015 : 0.025 }, 0);
      return () => tl.kill();
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(shell, { ["--rail-width" as string]: condensed ? CONDENSED_W : EXPANDED_W });
      gsap.set(labels(), { maxWidth: condensed ? 0 : 280 });
    });
    return () => mm.revert();
  }, [condensed]);

  const patches = ground === "field" || decor != null;

  return (
    <ExplorerCtx.Provider value={{ uid, sector, domain, index, condensed, setCondensed }}>
      <div ref={shellRef} className={s.shell} style={{ ["--rail-width" as string]: EXPANDED_W }}>
        <Rail
          sector={sector}
          indexLabel={indexLabel}
          domains={domains}
          active={domain.id}
          condensed={condensed}
          onSelect={onSelectDomain}
          onToggle={() => setCondensed(!condensed)}
          labelRefs={labelRefs}
        />
        <section
          className={s.canvas}
          data-ground={ground}
          data-patches={patches ? "" : undefined}
          aria-labelledby={`${uid}-q`}
        >
          {ground === "field" && (
            <div className={s.ground} aria-hidden="true">
              <DitherField field={GROUND} mark="dots" pitch={6} lens={false} fps={12} />
            </div>
          )}
          {decor != null && (
            <div className={s.decor} data-decor="" aria-hidden="true">
              {decor}
            </div>
          )}
          {children}
        </section>
      </div>
    </ExplorerCtx.Provider>
  );
}

/* ——— Rail ——— */

function Rail({
  sector,
  indexLabel,
  domains,
  active,
  condensed,
  onSelect,
  onToggle,
  labelRefs,
}: {
  sector: string;
  indexLabel: string;
  domains: ExplorerDomain[];
  active: string;
  condensed: boolean;
  onSelect: (id: string) => void;
  onToggle: () => void;
  labelRefs: React.MutableRefObject<Map<string, HTMLSpanElement>>;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const barSeen = useRef(false);

  // One bar travels between rows (the rail's "you are here").
  useLayoutEffect(() => {
    const nav = navRef.current;
    const bar = barRef.current;
    if (!nav || !bar) return;
    const place = (animate: boolean) => {
      const row = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!row) return;
      const top = row.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
      const to = { y: top, height: row.offsetHeight };
      if (!animate || reducedMotion()) gsap.set(bar, to);
      else gsap.to(bar, { ...to, duration: 0.6, ease: "power3.inOut", overwrite: true });
    };
    place(barSeen.current);
    barSeen.current = true;
    const ro = new ResizeObserver(() => place(false));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active, condensed]);

  // Loupe: the plate's halftone magnifies around the cursor (the mask scales; the box stays put).
  const loupe = (e: React.PointerEvent<HTMLButtonElement>) => {
    const plate = e.currentTarget.querySelector<HTMLElement>("[data-loupe]");
    if (!plate) return;
    const r = plate.getBoundingClientRect();
    plate.style.setProperty("--lx", `${Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)).toFixed(1)}%`);
    plate.style.setProperty("--ly", `${Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)).toFixed(1)}%`);
  };

  // One continuous index: Ready domains first, then In preparation.
  const rows = [...domains.filter((d) => d.status === "ready"), ...domains.filter((d) => d.status === "preparation")];

  return (
    <nav className={s.rail} data-condensed={condensed ? "true" : "false"} aria-label={`${sector} research domains`}>
      <div ref={navRef} className={s.railSticky}>
        <span ref={barRef} className={s.railCarriage} aria-hidden="true" />
        <div className={s.railHead}>
        <p className={`bo-label ${s.railTitle}`}>{indexLabel}</p>
        <button
          type="button"
          className={s.railToggle}
          onClick={onToggle}
          aria-pressed={condensed}
          aria-label={condensed ? "Show index labels" : "Condense index to plates"}
        >
          <span aria-hidden="true">{condensed ? "→" : "←"}</span>
        </button>
        </div>
        <ul className={s.railList}>
        {rows.map((d) => {
          const selected = d.id === active;
          const short = d.short ?? d.title;
          return (
            <li key={d.id}>
              <button
                type="button"
                className={s.railItem}
                onPointerMove={loupe}
                aria-current={selected ? "page" : undefined}
                aria-label={d.title}
                title={d.title}
                onClick={() => onSelect(d.id)}
              >
                <span className={s.railPlate} data-loupe="" aria-hidden="true">
                  {d.plate ? (
                    <Plate src={d.plate.src} fit="contain" treatment={selected ? "negative" : "print"} />
                  ) : (
                    <span className={s.railProof}>{String(domains.indexOf(d) + 1).padStart(2, "0")}</span>
                  )}
                </span>
                <span
                  className={s.railLabel}
                  ref={(el) => {
                    if (el) labelRefs.current.set(d.id, el);
                    else labelRefs.current.delete(d.id);
                  }}
                >
                  <DualScramble text={d.title} trigger="hover" hoverTarget="button" replayOnChange={false} duration={0.6} />
                </span>
                {/* Visible only when condensed — plate alone is not enough to tell domains apart. */}
                <span className={s.railShort} aria-hidden="true">
                  {short}
                </span>
              </button>
            </li>
          );
        })}
        </ul>
      </div>
    </nav>
  );
}

/* ——— 1 · Head ——— */

export function ExplorerHead({
  views = [],
  view,
  onView,
}: {
  views?: ExplorerView[];
  view?: string;
  onView?: (id: string) => void;
}) {
  const { uid, sector, domain } = useExplorer();
  const wrapRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLSpanElement>(null);
  const seen = useRef(false);

  // Ink carriage: one solid block travels to the selected tab.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const block = blockRef.current;
    if (!wrap || !block) {
      seen.current = false;
      return;
    }
    const place = (animate: boolean) => {
      const tab = wrap.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!tab) {
        gsap.set(block, { width: 0 });
        return;
      }
      const to = { x: tab.offsetLeft, y: tab.offsetTop, width: tab.offsetWidth, height: tab.offsetHeight };
      if (!animate || reducedMotion()) gsap.set(block, to);
      else gsap.to(block, { ...to, duration: 0.55, ease: "power3.inOut", overwrite: true });
    };
    place(seen.current);
    seen.current = true;
    const ro = new ResizeObserver(() => place(false));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [view, domain.id, views.length]);

  return (
    <header className={s.head}>
      <div className={s.headTop}>
        <p className="bo-label">
          {sector} <span aria-hidden="true">/</span> {domain.title}
        </p>
      </div>
      <h2 id={`${uid}-q`} className={s.question}>
        {domain.question}
      </h2>
      {views.length > 0 && (
        <div ref={wrapRef} className={s.views} role="tablist" aria-label={`${domain.title} views`}>
          <span ref={blockRef} className={s.carriage} aria-hidden="true" />
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === view}
              aria-controls={`${uid}-stage`}
              className={s.viewTab}
              onClick={() => onView?.(v.id)}
            >
              <DualScramble text={v.label} trigger="hover" hoverTarget='[role="tab"]' replayOnChange={false} duration={0.6} />
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

/* ——— 2 · Figures ——— */

export function FigureStrip({ figures }: { figures: ExplorerFigure[] }) {
  if (figures.length === 0) return null;
  return (
    <section aria-label="Key figures">
      <ul className={s.figures} style={{ ["--n" as string]: figures.length }}>
        {figures.map((f) => (
          <li key={f.label} className={s.figure}>
            <span className="bo-label">{f.label}</span>
            <span className={`bo-fig ${s.figureValue}`}>
              <DualScramble text={f.value} chars={DUAL_DIGITS} trigger="scroll" duration={0.9} />
            </span>
            <span className={s.figureNote}>{f.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ——— 3 · Controls ——— */

export function ControlRow({ children, label = "View controls" }: { children: ReactNode; label?: string }) {
  return (
    <div className={s.controls} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/** A labelled control cell. `children` receives the label id for aria-labelledby. */
export function Control({ label, wide = false, children }: { label: string; wide?: boolean; children: (labelId: string) => ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={`${s.control} ${wide ? s.chipControl : ""}`}>
      <span className="bo-label" id={`${id}-label`}>
        {label}
      </span>
      {children(`${id}-label`)}
    </div>
  );
}

/** Closed text for a place comparison: one name, or "3 places". */
export function placesSummary(labels: string[]): string {
  if (labels.length === 0) return "—";
  if (labels.length === 1) return labels[0]!;
  return `${labels.length} places`;
}

/** Labelled brand menu (Base UI). */
export function MenuControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: PrintOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <Control label={label}>
      {(id) => <PrintSelect labelledBy={id} value={value} options={options} onChange={onChange} className={s.menu} />}
    </Control>
  );
}

/**
 * Several choices in one menu. The page shows a single line; the list opens
 * underneath, and selected rows stay filled. Use this wherever the reader
 * compares more than one place. ChipToggles is only for a short single choice.
 */
export function MultiMenuControl<T extends string>({
  label,
  values,
  options,
  onChange,
  summary = placesSummary,
}: {
  label: string;
  values: T[];
  options: PrintMultiOption<T>[];
  onChange: (values: T[]) => void;
  summary?: (labels: string[]) => string;
}) {
  return (
    <Control label={label}>
      {(id) => (
        <PrintMultiSelect
          labelledBy={id}
          value={values}
          options={options}
          onChange={onChange}
          summary={summary}
          className={s.menu}
        />
      )}
    </Control>
  );
}

/** Free-text search in the control row; `note` sits beside the field (e.g. what the search covers). */
export function SearchControl({
  label,
  value,
  onChange,
  placeholder,
  note,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  note?: ReactNode;
  /** Optional datalist choices (e.g. local authorities). Keep the list short — filter before passing. */
  suggestions?: { value: string; label: string }[];
}) {
  const listId = suggestions?.length ? `${label.replace(/\s+/g, "-").toLowerCase()}-suggestions` : undefined;
  return (
    <Control label={label} wide>
      {(id) => (
        <div className={s.search}>
          <input
            type="search"
            aria-labelledby={id}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            list={listId}
            onChange={(e) => onChange(e.target.value)}
          />
          {listId && suggestions && (
            <datalist id={listId}>
              {suggestions.map((opt) => (
                <option key={opt.value} value={opt.label} />
              ))}
            </datalist>
          )}
          {note && <p className={s.searchNote}>{note}</p>}
        </div>
      )}
    </Control>
  );
}

export type ChipOption = { value: string; label: string; disabled?: boolean; title?: string };

/** Multi-select chips (e.g. place layers). Selected = solid ink; labels dual-scramble on hover. */
export function ChipToggles({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Control label={label} wide>
      {(id) => (
        <div className={s.chips} role="group" aria-labelledby={id}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={s.chip}
              aria-pressed={selected.includes(o.value)}
              disabled={o.disabled}
              title={o.title}
              onClick={() => onToggle(o.value)}
            >
              <DualScramble text={o.label} trigger="hover" hoverTarget="button" replayOnChange={false} duration={0.6} />
            </button>
          ))}
        </div>
      )}
    </Control>
  );
}

/** From–to year menus. */
export function PeriodControl({
  label = "Period",
  years,
  from,
  to,
  onChange,
}: {
  label?: string;
  years: number[];
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}) {
  return (
    <Control label={label}>
      {(id) => (
        <div className={s.period} role="group" aria-labelledby={id}>
          <PrintSelect
            ariaLabel="From year"
            value={String(from)}
            options={years.filter((y) => y <= to).map((y) => ({ value: String(y), label: String(y) }))}
            onChange={(v) => onChange(Number(v), to)}
            className={s.menuYear}
          />
          <span aria-hidden="true">–</span>
          <PrintSelect
            ariaLabel="To year"
            value={String(to)}
            options={years.filter((y) => y >= from).map((y) => ({ value: String(y), label: String(y) }))}
            onChange={(v) => onChange(from, Number(v))}
            className={s.menuYear}
          />
        </div>
      )}
    </Control>
  );
}

export function TextButton({ children, onClick, pressed }: { children: ReactNode; onClick: () => void; pressed?: boolean }) {
  return (
    <button type="button" className={s.textButton} onClick={onClick} aria-pressed={pressed}>
      {children}
    </button>
  );
}

/**
 * Clears the current view’s filters. Callers must keep the active view/tab —
 * Reset is not a route change back to the domain’s first tab.
 */
export function ResetButton({ onClick }: { onClick: () => void }) {
  return <TextButton onClick={onClick}>Reset</TextButton>;
}

/* ——— 4 · Stage ——— */

export function Stage({
  title,
  meta: _meta,
  bar = "hairline",
  size = "normal",
  framed = true,
  follow,
  foot,
  expandable = false,
  children,
}: {
  title: ReactNode;
  /**
   * Unused. Geography and frequency belong in the title or Notes — the stage bar is title only
   * (plus Expand when offered). Kept so older call sites still type-check.
   */
  meta?: ReactNode;
  /** Hairline on paper, or solid ink with paper type. */
  bar?: "hairline" | "solid";
  /** False draws the figure on the page, with no rule around it and no title bar. */
  framed?: boolean;
  /** "wide": taller well for maps. "compact": the frame follows short content, such as a two-part split. */
  size?: "normal" | "wide" | "compact";
  /**
   * FollowStep (connections) — sits under the framed figure, outside the border,
   * below Notes behind a hairline. Never put Follow inside the stage body.
   */
  follow?: ReactNode;
  /** Usually <FigureRecord/>, often via <SourceLine/>. */
  foot?: ReactNode;
  /**
   * Offer an Expand control that fills the viewport with this stage. The figure stays in
   * place in the tree (only its frame changes), so every selection in the view is kept.
   */
  expandable?: boolean;
  children: ReactNode;
}) {
  void _meta;
  const { uid } = useExplorer();
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Esc closes; the page behind does not scroll while expanded.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);
  // Keep focus on the control across the frame change.
  useEffect(() => {
    toggleRef.current?.focus({ preventScroll: true });
  }, [expanded]);
  const canExpand = expandable && size !== "wide";
  const isOpen = canExpand && expanded;

  return (
    <div
      className={s.stageGroup}
      data-bar={bar}
      data-size={size === "normal" ? undefined : size}
      data-expanded={isOpen ? "true" : undefined}
      id={`${uid}-stage`}
      role="tabpanel"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <figure className={s.stage} data-bar={bar} data-size={size === "normal" ? undefined : size} data-framed={framed ? undefined : "false"}>
      {framed && <figcaption className={s.stageBar}>
        <span className={s.stageTitle}>{title}</span>
        {canExpand && (
          <span className={s.stageMeta}>
            <button
              ref={toggleRef}
              type="button"
              className={s.textButton}
              aria-expanded={isOpen}
              aria-controls={`${uid}-stage`}
              onClick={() => setExpanded((v) => !v)}
            >
              {isOpen ? "Close · Esc" : "Expand"}
            </button>
          </span>
        )}
      </figcaption>}
      <div className={s.stageBody}>{children}</div>
      </figure>
      {foot != null && <div className={s.stageFoot}>{foot}</div>}
      {follow != null && <StageFollow>{follow}</StageFollow>}
    </div>
  );
}

/**
 * Next reading, under the Notes foot. Its hairline draws from the frame's left edge the
 * first time it scrolls into view. Only the rule moves; the copy is still.
 * Above the fold, without JS, or with reduced motion, the rule is simply drawn.
 */
function StageFollow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rule, setRule] = useState<"wait" | "draw" | undefined>(undefined);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let first = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (!first) setRule("draw");
          io.disconnect();
        } else if (first) {
          setRule("wait");
        }
        first = false;
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={s.stageFollow} data-rule={rule}>
      {children}
    </div>
  );
}

/** Every stage state fills the frame: in preparation, unavailable, no view. */
export function EmptyStage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.empty}>
      <p className="bo-label">{label}</p>
      <p>{children}</p>
    </div>
  );
}

const PUBLISHER_SHORT: Record<string, string> = {
  "Office for National Statistics": "ONS",
  "Ministry of Housing, Communities and Local Government": "MHCLG",
  "Ministry of Housing, Communities & Local Government": "MHCLG",
  "HM Land Registry": "HM Land Registry",
};

/** A long official name, shortened the same way on every foot. */
export function shortPublisher(publisher: string): string {
  return PUBLISHER_SHORT[publisher] ?? publisher;
}

/**
 * Notes source row grammar (every sector).
 *
 *   Publisher · series · [Boundaries: …] · geography · [period / as at / release]
 *
 * Pass only the parts that apply; empty parts are dropped. Do not smash publisher
 * and series into one token (`MHCLG · Live Table 104`, not `MHCLG Live Table 104`).
 * Multi-publisher Data tabs list each publisher once, then the series they feed.
 * Full academic citations belong on Data provenance desks only — not chart feet.
 */
export function formatSource(...parts: Array<string | null | undefined | false>): string {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" · ");
}

/**
 * The one foot under a stage.
 *
 * Notes holds the definition, then the method, and stays closed.
 * The source stays on the row: publisher · series · geography · period (`formatSource`).
 * Data always goes to the catalogue. Release, indicator id and the file live there.
 */
export function FigureRecord({
  source,
  definition,
  method,
  dataHref = "/data",
}: {
  source?: string;
  /** What the number is. One sentence, or a few, always under the same label. */
  definition?: string | string[];
  /** How it was counted, and what not to infer. */
  method?: string | string[];
  dataHref?: string;
}) {
  const define = noteParts(definition);
  const counted = noteParts(method);
  const hasNotes = define.length > 0 || counted.length > 0;
  if (!source && !hasNotes && !dataHref) return null;
  return (
    <div className={s.record} data-notes={hasNotes ? "true" : "false"}>
      {hasNotes && (
        <details className={s.recordDetails}>
          <summary className={s.recordSummary}>
            <span className={s.recordMark} aria-hidden="true" />
            Notes
          </summary>
          <div className={s.recordPanel}>
            {define.length > 0 && (
              <div>
                <p className="bo-label">Definition</p>
                {define.map((text, i) => (
                  <p key={`definition-${i}`}>{text}</p>
                ))}
              </div>
            )}
            {counted.length > 0 && (
              <div>
                <p className="bo-label">Method</p>
                {counted.map((text, i) => (
                  <p key={`method-${i}`}>{text}</p>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
      {source ? <p className={s.recordSource}>{source}</p> : <span />}
      {dataHref ? (
        <a className={s.recordData} href={dataHref}>
          Data <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </div>
  );
}

function noteParts(body?: string | string[]): string[] {
  return (Array.isArray(body) ? body : body ? [body] : []).map((text) => text.trim()).filter(Boolean);
}

/** Rows whose text is the name of the source, not a note about it. */
const SOURCE_LABELS = new Set(["Source", "Primary record", "Register", "Authority"]);

/**
 * Builds a FigureRecord from the series behind a view.
 * `hrefFor` and `dataHref` are accepted so older call sites still type-check.
 * The link is always the catalogue.
 */
export function SourceLine({
  sources = [],
  rows = [],
  derived,
}: {
  sources?: ExplorerSource[];
  /** Free rows (a map's geography, a statute, a reading). */
  rows?: SourceRow[];
  derived?: string | string[];
  /** Unused. Catalogue links are not repeated on the stage. */
  hrefFor?: (src: ExplorerSource) => string | undefined;
  /** Unused. The foot links to /data. */
  dataHref?: string;
}) {
  if (sources.length === 0 && rows.length === 0 && !derived) {
    return <p className={s.recordEmpty}>No Ready series behind this view yet. The Exchange does not show estimates.</p>;
  }
  const publishers = [...new Set(sources.map((src) => shortPublisher(src.publisher)))];
  const named = rows.find((row) => SOURCE_LABELS.has(row.label));
  const source =
    sources.length === 1
      ? `${sources[0]!.title} · ${shortPublisher(sources[0]!.publisher)}`
      : sources.length > 1
        ? `${sources.length} series · ${publishers.join(" · ")}`
        : named?.text ?? (rows.length === 1 ? rows[0]!.text : undefined);
  const definition = rows.flatMap((row) => {
    if (sources.length === 0 && rows.length === 1 && !named) return [];
    if (named && row === named) return row.linkLabel ? [row.linkLabel] : [];
    return [row.text];
  });
  return <FigureRecord source={source} definition={definition} method={derived} />;
}

/** Latest periods as a table (the Table view of any series). */
export function DataTable({ series, cadence, format, limit = 36 }: { series: ChartSeries[]; cadence: Cadence; format: (v: number) => string; limit?: number }) {
  const cols = series.slice(0, 4);
  const times = [...new Set(cols.flatMap((c) => c.points.map((p) => p.t)))].sort((a, b) => b - a).slice(0, limit);
  const by = cols.map((c) => new Map(c.points.map((p) => [p.t, p])));
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {cols.map((c) => (
              <th key={c.id} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t}>
              <th scope="row">{fmtT(t, cadence)}</th>
              {by.map((m, i) => {
                const p = m.get(t);
                return <td key={cols[i]!.id}>{p ? format(p.v) : "—"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ——— 5 · Coverage ——— */

export function Coverage({ items }: { items: { label: string; value: ReactNode }[] }) {
  if (items.length === 0) return null;
  return (
    <dl className={s.coverage}>
      {items.map((it) => (
        <div key={it.label}>
          <dt className="bo-label">{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Class hooks for sector stage content that needs to sit in the template's rhythm. */
export const explorerClasses = s;

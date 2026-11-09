"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BrandRoot } from "@/brand/BrandRoot";
import {
  Plate,
  ICON_PLATES,
  SCENE_ICON_PLATES,
  REF_ICON_PLATES,
  type IconPlateName,
  type SceneIconPlateName,
  type RefIconPlateName,
} from "@/brand/Plate";
import { DensityStrip, type DensityMark } from "@/brand/motion";
import s from "./housing-nav.module.css";

/** Lab: housing domain-nav motion (Quiet+ASCII, condensed plate icons, Index skim). Not production. */

type DomainId =
  | "prices"
  | "renting"
  | "affordability"
  | "stock"
  | "supply"
  | "land"
  | "quality"
  | "insecurity"
  | "ownership"
  | "policy";

type Domain = {
  id: DomainId;
  title: string;
  /** Keyword highlighted in Index mode. */
  keyword: string;
  /** 2D technical pen symbol. */
  penship: IconPlateName;
  /** Small 3D + halftone scene crop (shared across related domains). */
  scene: SceneIconPlateName;
  /** Domain-specific photo reference screened to ink. */
  photo: RefIconPlateName;
  /** Commons credit shown in the lab canvas. */
  credit: string;
};

const DOMAINS: Domain[] = [
  { id: "prices", title: "House prices and transactions", keyword: "prices", penship: "housePrice", scene: "terrace", photo: "prices", credit: "Terraced houses, Camborne · CC BY-SA 4.0" },
  { id: "renting", title: "Renting", keyword: "renting", penship: "key", scene: "terrace", photo: "renting", credit: "House to let, Queens Road (Geograph) · CC BY-SA 2.0" },
  { id: "affordability", title: "Affordability", keyword: "affordability", penship: "balance", scene: "globe", photo: "affordability", credit: "Time / money balance · CC BY-SA 4.0" },
  { id: "stock", title: "Housing stock and tenure", keyword: "stock", penship: "blocks", scene: "towerBlock", photo: "stock", credit: "Tower blocks, Gleadless Valley · CC BY-SA 3.0" },
  { id: "supply", title: "Construction and supply", keyword: "supply", penship: "digger", scene: "landPlots", photo: "supply", credit: "Excavator · CC BY-SA 4.0" },
  { id: "land", title: "Planning and land", keyword: "land", penship: "plot", scene: "landPlots", photo: "land", credit: "Green Belt landscape · CC BY-SA 2.0" },
  { id: "quality", title: "Housing quality", keyword: "quality", penship: "gauge", scene: "towerBlock", photo: "quality", credit: "Thermal insulation · CC BY-SA 2.0 DE" },
  { id: "insecurity", title: "Housing insecurity", keyword: "insecurity", penship: "shelter", scene: "globe", photo: "insecurity", credit: "Tents, Tottenham Court Road (Geograph) · CC BY-SA 2.0" },
  { id: "ownership", title: "Ownership and property economics", keyword: "ownership", penship: "deed", scene: "terrace", photo: "ownership", credit: "Title deed example · CC0" },
  { id: "policy", title: "Housing policy and history", keyword: "policy", penship: "scroll", scene: "globe", photo: "policy", credit: "Houses of Parliament (Geograph) · CC BY-SA 2.0" },
];

type Variant = "quiet" | "morph" | "index";
type IconStyle = "photo" | "scene" | "penship";

const EXPANDED_W = "18rem";
const CONDENSED_W = "5.5rem";

function IndexLabel({ title, keyword }: { title: string; keyword: string }) {
  const i = title.toLowerCase().indexOf(keyword.toLowerCase());
  if (i < 0) return <span>{title}</span>;
  const before = title.slice(0, i);
  const mid = title.slice(i, i + keyword.length);
  const after = title.slice(i + keyword.length);
  return (
    <span>
      {before}
      <b>{mid}</b>
      {after}
    </span>
  );
}

function useDensityProgress(active: boolean, reduced: boolean): number {
  const [progress, setProgress] = useState(active ? 1 : 0);
  const progressRef = useRef(progress);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    tweenRef.current?.kill();
    if (reduced) {
      const next = active ? 1 : 0;
      progressRef.current = next;
      setProgress(next);
      return;
    }
    const state = { p: progressRef.current };
    tweenRef.current = gsap.to(state, {
      p: active ? 1 : 0,
      duration: active ? 0.36 : 0.22,
      ease: "power2.out",
      onUpdate: () => {
        progressRef.current = state.p;
        setProgress(state.p);
      },
    });
    return () => {
      tweenRef.current?.kill();
    };
  }, [active, reduced]);

  return progress;
}

function QuietRow({
  domain,
  selected,
  mark,
  reduced,
  onSelect,
}: {
  domain: Domain;
  selected: boolean;
  mark: DensityMark;
  reduced: boolean;
  onSelect: () => void;
}) {
  const [hot, setHot] = useState(false);
  const progress = useDensityProgress(hot || selected, reduced);

  return (
    <li>
      <button
        type="button"
        className={s.quietItem}
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
      >
        <span className={s.quietMark} aria-hidden />
        <span className={s.quietLabel}>{domain.title}</span>
        <span className={s.quietStrip}>
          <DensityStrip progress={progress} mark={mark} pitch={3.5} />
        </span>
      </button>
    </li>
  );
}

function IndexRow({
  domain,
  selected,
  reduced,
  onSelect,
}: {
  domain: Domain;
  selected: boolean;
  reduced: boolean;
  onSelect: () => void;
}) {
  const [hot, setHot] = useState(false);
  const progress = useDensityProgress(hot || selected, reduced);

  return (
    <li>
      <button
        type="button"
        className={s.indexItem}
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
      >
        <span className={s.indexLabel}>
          <IndexLabel title={domain.title} keyword={domain.keyword} />
        </span>
        <span className={s.indexStrip}>
          <DensityStrip progress={progress} mark="glyphs" pitch={4} />
        </span>
      </button>
    </li>
  );
}

export default function HousingNavLab() {
  const [variant, setVariant] = useState<Variant>("morph");
  const [iconStyle, setIconStyle] = useState<IconStyle>("photo");
  const [active, setActive] = useState<DomainId>("prices");
  const [condensed, setCondensed] = useState(false);
  const [mark, setMark] = useState<DensityMark>("dots");
  const [reduced, setReduced] = useState(false);
  const morphRef = useRef<HTMLElement>(null);
  const labelRefs = useRef<Map<DomainId, HTMLSpanElement>>(new Map());

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // GSAP: expand ↔ condense width + label fade via density (clip), not type opacity.
  useEffect(() => {
    if (variant !== "morph" || !morphRef.current) return;

    const shell = morphRef.current;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const labels = Array.from(labelRefs.current.values());
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.to(shell, {
        ["--rail-width" as string]: condensed ? CONDENSED_W : EXPANDED_W,
        duration: 0.42,
      }, 0);
      tl.to(
        labels,
        {
          maxWidth: condensed ? 0 : 220,
          duration: 0.36,
          stagger: condensed ? 0.02 : 0.03,
        },
        0,
      );
      return () => {
        tl.kill();
      };
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(shell, { ["--rail-width" as string]: condensed ? CONDENSED_W : EXPANDED_W });
      labelRefs.current.forEach((el) => {
        gsap.set(el, { maxWidth: condensed ? 0 : 220 });
      });
    });

    return () => mm.revert();
  }, [condensed, variant]);

  const domain = DOMAINS.find((d) => d.id === active)!;

  return (
    <BrandRoot>
      <main className={s.page}>
        <div className={s.wrap}>
          <header className={s.intro}>
            <p className="bo-label">Lab · housing nav motion</p>
            <h1 className="bo-d2">Research domains — hover and condense</h1>
            <p>
              Experiments only. Default icons are <strong>photo references</strong> from Wikimedia
              Commons, screened into Exchange ink masks — one subject per research domain. Compare
              with <strong>3D scene</strong> crops and <strong>penship</strong> line icons. Promote
              a winner to <code>/housing</code> later.
            </p>
          </header>

          <div className={s.toggles} role="toolbar" aria-label="Lab controls">
            {(
              [
                ["quiet", "Quiet + ASCII"],
                ["morph", "Plate icon morph"],
                ["index", "Index skim"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={s.toggle}
                aria-pressed={variant === id}
                onClick={() => setVariant(id)}
              >
                {label}
              </button>
            ))}
            {variant === "quiet" && (
              <>
                <button
                  type="button"
                  className={s.toggle}
                  aria-pressed={mark === "dots"}
                  onClick={() => setMark("dots")}
                >
                  Dots
                </button>
                <button
                  type="button"
                  className={s.toggle}
                  aria-pressed={mark === "glyphs"}
                  onClick={() => setMark("glyphs")}
                >
                  Glyphs
                </button>
              </>
            )}
            {variant === "morph" && (
              <>
                <button
                  type="button"
                  className={s.toggle}
                  aria-pressed={iconStyle === "photo"}
                  onClick={() => setIconStyle("photo")}
                >
                  Photo refs
                </button>
                <button
                  type="button"
                  className={s.toggle}
                  aria-pressed={iconStyle === "scene"}
                  onClick={() => setIconStyle("scene")}
                >
                  3D scene
                </button>
                <button
                  type="button"
                  className={s.toggle}
                  aria-pressed={iconStyle === "penship"}
                  onClick={() => setIconStyle("penship")}
                >
                  Penship
                </button>
                <button
                  type="button"
                  className={s.toggle}
                  aria-pressed={condensed}
                  onClick={() => setCondensed((v) => !v)}
                >
                  {condensed ? "Expand labels" : "Condense to icons"}
                </button>
              </>
            )}
          </div>

          <div className={s.stage}>
            {variant === "quiet" && (
              <nav className={s.quietNav} aria-label="Quiet ASCII experiment">
                <p className="bo-label">Research domains</p>
                <ul className={s.quietList} role="listbox" aria-label="Domains">
                  {DOMAINS.map((d) => (
                    <QuietRow
                      key={d.id}
                      domain={d}
                      selected={d.id === active}
                      mark={mark}
                      reduced={reduced}
                      onSelect={() => setActive(d.id)}
                    />
                  ))}
                </ul>
              </nav>
            )}

            {variant === "morph" && (
              <nav
                ref={morphRef}
                className={s.morphShell}
                data-condensed={condensed ? "true" : "false"}
                style={{ ["--rail-width" as string]: condensed ? CONDENSED_W : EXPANDED_W }}
                aria-label="Plate icon morph experiment"
              >
                <div className={s.morphHead}>
                  {!condensed && <p className="bo-label">Research domains</p>}
                  <button type="button" className={s.toggle} onClick={() => setCondensed((v) => !v)}>
                    {condensed ? "Show index" : "Icons"}
                  </button>
                </div>
                <ul className={s.morphList} role="listbox" aria-label="Domains">
                  {DOMAINS.map((d) => {
                    const icon =
                      iconStyle === "photo"
                        ? REF_ICON_PLATES[d.photo]
                        : iconStyle === "scene"
                          ? SCENE_ICON_PLATES[d.scene]
                          : ICON_PLATES[d.penship];
                    const selected = d.id === active;
                    return (
                      <li key={d.id} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          className={s.morphItem}
                          aria-current={selected ? "true" : undefined}
                          aria-label={condensed ? d.title : undefined}
                          title={d.title}
                          onClick={() => setActive(d.id)}
                        >
                          <span className={s.morphIcon} aria-hidden={!condensed}>
                            <Plate
                              src={icon.src}
                              fit="contain"
                              treatment={selected ? "negative" : "print"}
                              label={condensed ? icon.alt : undefined}
                            />
                          </span>
                          <span
                            className={s.morphLabel}
                            ref={(el) => {
                              if (el) labelRefs.current.set(d.id, el);
                              else labelRefs.current.delete(d.id);
                            }}
                          >
                            {d.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}

            {variant === "index" && (
              <nav className={s.indexNav} aria-label="Index skim experiment">
                <p className="bo-label">Research domains</p>
                <ul className={s.indexList} role="listbox" aria-label="Domains">
                  {DOMAINS.map((d) => (
                    <IndexRow
                      key={d.id}
                      domain={d}
                      selected={d.id === active}
                      reduced={reduced}
                      onSelect={() => setActive(d.id)}
                    />
                  ))}
                </ul>
              </nav>
            )}

            <section className={s.canvas} aria-live="polite">
              <p className="bo-label">{variant === "index" ? "Index · Union" : "Ready evidence · lab"}</p>
              <h2>{domain.title}</h2>
              <p>
                Selected domain id <code>{domain.id}</code>.{" "}
                {variant === "morph" ? (
                  <>
                    Icon style <code>{iconStyle}</code>
                    {iconStyle === "photo" && (
                      <>
                        {" "}
                        · <code>{REF_ICON_PLATES[domain.photo].src}</code>
                        <br />
                        <span className="bo-label">Source · {domain.credit}</span>
                      </>
                    )}
                    {iconStyle === "scene" && (
                      <>
                        {" "}
                        · scene <code>{domain.scene}</code> ({SCENE_ICON_PLATES[domain.scene].src})
                      </>
                    )}
                    {iconStyle === "penship" && (
                      <>
                        {" "}
                        · penship <code>{domain.penship}</code> ({ICON_PLATES[domain.penship].src})
                      </>
                    )}
                  </>
                ) : (
                  <>Hover rows to densify the ASCII strip.</>
                )}
              </p>
              {reduced && (
                <p className="bo-label">prefers-reduced-motion · strips snap, morph is instant</p>
              )}
            </section>
          </div>
        </div>
      </main>
    </BrandRoot>
  );
}

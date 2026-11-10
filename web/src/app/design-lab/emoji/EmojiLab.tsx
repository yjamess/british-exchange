"use client";

import Link from "next/link";
import { useState } from "react";
import { EMOJI, SectorEmoji } from "./emoji";
import { ScreenEmoji } from "./ScreenEmoji";
import type { TonalId } from "./tonal";
import s from "./emoji.module.css";

const SIZES = [96, 64, 40] as const;
const GROUNDS = [
  { id: "paper", label: "Paper", className: s.gPaper, mode: "print" as const },
  { id: "electric", label: "Electric", className: s.gElectric, mode: "negative" as const },
  { id: "union", label: "Union", className: s.gUnion, mode: "negative" as const },
  { id: "sage", label: "Sage", className: s.gSage, mode: "print" as const },
  { id: "straw", label: "Straw", className: s.gStraw, mode: "print" as const },
] as const;

const tid = (id: string) => id as TonalId;

export function EmojiLab() {
  const [reacted, setReacted] = useState<string>("high-voltage");
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <Link href="/design-lab">Design lab</Link>
        <span className="bo-label">Lab · not in the shipped kit</span>
      </nav>

      <header className={s.header}>
        <p className={s.eyebrow}>Design lab · sector emoji</p>
        <h1>Emoji, printed like the plates</h1>
        <p>
          Each one is drawn as a shaded form, lit from the upper left, then screened to one ink at 45°, the
          crown&apos;s method. Shadow prints as large dots, a lit face as small ones.
        </p>
      </header>

      <section className={s.specimens} aria-label="Specimens">
        {EMOJI.map((e) => (
          <article key={e.id} className={s.card}>
            <div className={s.hero}>
              <ScreenEmoji id={tid(e.id)} size={160} cells={58} title={e.name} />
            </div>
            <p className={s.sector}>{e.sector}</p>
            <h2>{e.name}</h2>
            <p className={s.code}>{e.shortcode}</p>
            <div className={s.sizes}>
              {SIZES.map((size) => (
                <span key={size} className={s.size}>
                  <ScreenEmoji id={tid(e.id)} size={size} cells={size >= 64 ? 44 : 30} />
                  <span>{size}</span>
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={s.block}>
        <h2 className={s.blockTitle}>On each ground</h2>
        <div className={s.grounds}>
          {GROUNDS.map((g) => (
            <div key={g.id} className={`${s.ground} ${g.className}`}>
              <p className={s.groundLabel}>
                {g.label} · {g.mode === "print" ? "print" : "negative"}
              </p>
              <div className={s.row}>
                {EMOJI.map((e) => (
                  <ScreenEmoji key={e.id} id={tid(e.id)} size={64} cells={40} mode={g.mode} title={e.name} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.block}>
        <h2 className={s.blockTitle}>In use</h2>

        <p className={s.sentence}>
          Prices <ScreenEmoji id="money-with-wings" size={30} cells={24} className={s.inline} /> rose 0.9% on
          the year, while generation <ScreenEmoji id="high-voltage" size={30} cells={24} className={s.inline} />{" "}
          from wind set a record and completions{" "}
          <ScreenEmoji id="house-with-smoke" size={30} cells={24} className={s.inline} /> fell again.
        </p>

        <div className={s.reactions} role="group" aria-label="Reactions">
          {EMOJI.slice(0, 5).map((e, i) => (
            <button
              key={e.id}
              type="button"
              className={s.chip}
              aria-pressed={reacted === e.id}
              onClick={() => setReacted(e.id)}
              onMouseEnter={() => setHovered(e.id)}
              onMouseLeave={() => setHovered(null)}
              title={e.shortcode}
            >
              <ScreenEmoji
                id={tid(e.id)}
                size={26}
                cells={22}
                mode={reacted === e.id || hovered === e.id ? "negative" : "print"}
                title={e.name}
              />
              <span>{[12, 31, 7, 4, 2][i] + (reacted === e.id ? 1 : 0)}</span>
            </button>
          ))}
        </div>

        <ul className={s.rail}>
          {EMOJI.map((e, i) => (
            <li key={e.id}>
              <span className={s.num}>{String(i + 1).padStart(2, "0")}</span>
              <ScreenEmoji id={tid(e.id)} size={36} cells={26} />
              <span>{e.sector}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.block}>
        <h2 className={s.blockTitle}>Line version, for comparison</h2>
        <div className={s.row}>
          {EMOJI.map((e) => (
            <span key={e.id} className={s.lineRef}>
              <SectorEmoji spec={e} size={40} title={e.name} />
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

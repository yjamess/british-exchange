"use client";

import type { CSSProperties } from "react";
import { COIN_PLATES, Plate, type CoinName } from "../Plate";
import { fmtT } from "../data";
import { explorerClasses as t } from "../template";
import { fmtPence, fmtPounds, type PoundWorth } from "./inflation-model";
import s from "./poundBuys.module.css";

/**
 * What does £1 buy? — told in real change (exchange-domain-view §4: one custom instrument).
 * Two titled cards side by side (stacked on phones): £1 today in the chosen year's money, and
 * £1 of the chosen year in today's money. Coins are halftone specimens of the current reverses at
 * true relative size (COIN_PLATES.mm); the change is the fewest coins that make the amount,
 * rounded to the nearest penny.
 */

const ORDER = Object.keys(COIN_PLATES) as CoinName[];

/** Fewest UK coins that make `pence` (greedy is optimal for 200/100/50/20/10/5/2/1). */
export function makeChange(pence: number): CoinName[] {
  let left = Math.max(0, Math.round(pence));
  const out: CoinName[] = [];
  for (const id of ORDER) {
    const v = COIN_PLATES[id].pence;
    while (left >= v) {
      out.push(id);
      left -= v;
    }
  }
  return out;
}

function Coins({ ids }: { ids: CoinName[] }) {
  return (
    <div className={s.coins}>
      {ids.map((id, i) => (
        <Plate
          key={`${id}-${i}`}
          src={COIN_PLATES[id].src}
          fit="contain"
          className={s.coin}
          style={{ ["--d" as string]: COIN_PLATES[id].mm } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Card({
  title,
  summary,
  left,
  right,
}: {
  title: string;
  summary: string;
  left: { label: string };
  right: { value: string; label: string; coins: CoinName[] };
}) {
  return (
    <section className={s.card} aria-label={summary}>
      <h3 className={t.stageTitle}>{title}</h3>
      <div className={s.equation} aria-hidden="true">
        <div className={s.side}>
          <p className="bo-label">{left.label}</p>
          <p className={`bo-fig ${s.value}`}>£1</p>
          <Coins ids={["1pound"]} />
        </div>
        <p className={`bo-fig ${s.equals}`}>=</p>
        <div className={s.side}>
          <p className="bo-label">{right.label}</p>
          <p className={`bo-fig ${s.value}`}>{right.value}</p>
          <Coins ids={right.coins} />
        </div>
      </div>
    </section>
  );
}

export function PoundBuys({ worth, measure }: { worth: PoundWorth; measure: string }) {
  const now = fmtT(worth.latestT);
  const thenPence = Math.round(100 / worth.ratio);
  const nowPence = Math.round(100 * worth.ratio);
  const then = fmtPence(thenPence / 100);
  const today = fmtPounds(nowPence / 100);
  return (
    <div className={s.cards}>
      <Card
        title={`£1 today, in ${worth.year} money · ${measure}`}
        summary={`£1 in ${now} would have bought what ${then} bought in ${worth.year}.`}
        left={{ label: now }}
        right={{ value: then, label: `${worth.year} money`, coins: makeChange(thenPence) }}
      />
      <Card
        title={`£1 in ${worth.year}, in today's money · ${measure}`}
        summary={`What £1 bought in ${worth.year} costs ${today} in ${now}.`}
        left={{ label: String(worth.year) }}
        right={{ value: today, label: `${now} money`, coins: makeChange(nowPence) }}
      />
    </div>
  );
}

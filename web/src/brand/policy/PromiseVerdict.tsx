"use client";

/**
 * Promise Ledger open panel — editorial verdict for a pledge.
 * Pull-quote + three-column confrontation (Promised · Can count · Verdict).
 * Optional children: scored delivery chart under the plate.
 * One ink; type tokens from brand policy CSS. Used via DecisionLedger renderPanel.
 */

import type { ReactNode } from "react";
import s from "./policy.module.css";

export type PromiseVerdictProps = {
  /** Exact words of the pledge, quoted. */
  quote: string;
  /** Who made it, and when — short line under the quote. */
  made: string;
  /** What was promised (target figure + unit). */
  promised: string;
  /** What the Exchange can actually count against it. */
  canCount: string;
  /** Stamp: Listed · not scored | Scored · met | Scored · short | … */
  verdict: string;
  /** Editorial finding — why listed, or how the score reads. */
  finding: string;
  children?: ReactNode;
};

export function PromiseVerdict({
  quote,
  made,
  promised,
  canCount,
  verdict,
  finding,
  children,
}: PromiseVerdictProps) {
  return (
    <div className={s.verdict} role="region" aria-label="Promise verdict">
      <blockquote className={s.verdictQuote}>
        <p>{quote}</p>
        <footer className={s.verdictMade}>{made}</footer>
      </blockquote>

      <div className={s.verdictGrid} role="group" aria-label="Promise against delivery">
        <div className={s.verdictCell}>
          <p className={s.sec}>Promised</p>
          <p className={s.verdictValue}>{promised}</p>
        </div>
        <div className={s.verdictCell}>
          <p className={s.sec}>What we can count</p>
          <p className={s.verdictValue}>{canCount}</p>
        </div>
        <div className={s.verdictCell}>
          <p className={s.sec}>Verdict</p>
          <p className={s.verdictStamp}>{verdict}</p>
        </div>
      </div>

      <p className={s.verdictFinding}>{finding}</p>

      {children ? <div className={s.dossierInstrument}>{children}</div> : null}

      <p className={s.caveat}>
        A promise is set beside a result only when both count the same thing, for the same place and
        the same period. Listed pledges stay in the register — they are not scored down.
      </p>
    </div>
  );
}

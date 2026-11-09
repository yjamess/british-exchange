"use client";

/**
 * Exact register — closed disclosure under a Decision Ledger (or similar).
 * Same grammar as TimeChart “Exact values”: .bo-disclosure summary + table wrap.
 * No JSON paths on screen.
 */

import type { ReactNode } from "react";
import { explorerClasses as t } from "../template";
import s from "./policy.module.css";

type Props = {
  /** Sentence-case summary, e.g. “Exact register as a table”. */
  summary?: string;
  children: ReactNode;
};

export function ExactRegister({
  summary = "Exact register as a table",
  children,
}: Props) {
  return (
    <details className={s.disclosure}>
      <summary className="bo-disclosure">{summary}</summary>
      <div className={t.tableWrap}>{children}</div>
    </details>
  );
}

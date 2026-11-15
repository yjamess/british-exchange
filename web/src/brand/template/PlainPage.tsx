import type { ReactNode } from "react";
import { BrandRoot } from "../BrandRoot";
import s from "./plainPage.module.css";

/**
 * Brand template — PlainPage. The quiet page for anything that is not a sector or the
 * catalogue (About, Contribution, …): a label, one Caslon title, one text column.
 * The mast and footer come from the root layout.
 */
export function PlainPage({
  label,
  title,
  children,
}: {
  /** Small caps label over the title, e.g. "About". */
  label: string;
  /** Sentence-case Caslon title. */
  title: string;
  children?: ReactNode;
}) {
  const id = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <BrandRoot>
      <main className={s.page} aria-labelledby={id}>
        <div className={`bo-wrap ${s.head}`}>
          <p className="bo-label">{label}</p>
          <h1 id={id} className="bo-d2">
            {title}
          </h1>
        </div>
        <div className={`bo-wrap ${s.body}`}>{children}</div>
      </main>
    </BrandRoot>
  );
}

/** Placeholder body for a page that is planned but not written. */
export function PageInPreparation() {
  return (
    <p className={s.pending}>
      <span className="bo-label">In preparation</span>
      <span>This page is being written.</span>
    </p>
  );
}

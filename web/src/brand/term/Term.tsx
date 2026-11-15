"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTerm, useTermScope } from "./GlossaryProvider";
import s from "./term.module.css";

/**
 * Term — the "i" marker behind an acronym or term of art.
 *
 *   <Term slug="hhsrs">HHSRS</Term>
 *
 * Renders the children (or the registry short form) followed by a small mono "i" in a
 * hairline circle. Click or keyboard opens a paper popover: short form, full name, one
 * sentence, "More" to the glossary. Not hover-only, so it works on touch.
 *
 * Rules (docs/work-plan.md › GLOSS-02): labels, menus, figure strip, stage meta and the Notes
 * foot only; never inside a plot; first occurrence per stage. More than three on one stage
 * means the copy is wrong. If the registry has no such term, the text renders plain.
 */
export function Term({ slug, children, as: Tag = "span" }: { slug: string; children?: ReactNode; as?: "span" | "b" }) {
  const term = useTerm(slug);
  const scope = useTermScope();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"start" | "end">("start");
  const rootRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const register = scope?.register;

  useEffect(() => {
    if (!term || !register) return;
    return register(slug);
  }, [term, register, slug]);

  // Keep the panel on the sheet: flip to end-aligned when it would overflow the right edge.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!panel || !root) return;
    const r = root.getBoundingClientRect();
    const w = panel.getBoundingClientRect().width;
    setAlign(r.left + w > window.innerWidth - 16 ? "end" : "start");
    panel.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const text = children ?? term?.short ?? slug;
  if (!term) return <Tag>{text}</Tag>;

  return (
    <Tag ref={rootRef as never} className={s.term} data-open={open ? "true" : undefined}>
      {text}
      <button
        ref={buttonRef}
        type="button"
        className={s.mark}
        aria-label={`What ${term.short} means`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        i
      </button>
      {open && (
        <div ref={panelRef} id={id} role="dialog" aria-labelledby={`${id}-name`} tabIndex={-1} className={s.panel} data-align={align}>
          <p className={s.name}>
            <b id={`${id}-name`}>{term.short}</b>
            {term.full_name !== term.short && <span className={s.full}>{term.full_name}</span>}
          </p>
          <p className={s.definition}>{term.definition}</p>
          <a className={s.more} href={`/glossary#${term.slug}`}>
            More <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </Tag>
  );
}

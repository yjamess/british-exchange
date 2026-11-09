"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import gsap from "gsap";
import s from "./InstrumentSelect.module.css";

export type InstrumentOption = { id: string; label: string };

/**
 * Exchange listbox control: underline trigger + paper panel.
 * Hover, focus and the selected row are the same solid ink block.
 * Open/close uses a short GSAP clip tween (instant under reduced motion).
 */

function OptionRow({
  option,
  selected,
  onPick,
  optionRef,
}: {
  option: InstrumentOption;
  selected: boolean;
  onPick: () => void;
  optionRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <li role="presentation">
      <button
        ref={optionRef}
        type="button"
        role="option"
        className={s.option}
        aria-selected={selected}
        onClick={onPick}
      >
        <span className={s.mark} aria-hidden />
        <span className={s.label}>{option.label}</span>
      </button>
    </li>
  );
}

export function InstrumentSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: InstrumentOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const listId = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionEls = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((o) => o.id === value) ?? options[0];
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  // GSAP open/close
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (open) {
        gsap.fromTo(
          panel,
          { autoAlpha: 0, y: -6, scaleY: 0.96 },
          { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.28, ease: "power2.out" },
        );
      }
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(panel, { autoAlpha: open ? 1 : 0, y: 0, scaleY: 1 });
    });
    return () => mm.revert();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const pick = useCallback(
    (id: string) => {
      onChange(id);
      close();
    },
    [onChange, close],
  );

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onPanelKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(options.length - 1, activeIndex + 1);
      setActiveIndex(next);
      optionEls.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(0, activeIndex - 1);
      setActiveIndex(next);
      optionEls.current[next]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      optionEls.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = options.length - 1;
      setActiveIndex(last);
      optionEls.current[last]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) pick(opt.id);
    }
  };

  useEffect(() => {
    if (!open) return;
    // Focus selected (or first) option when opened
    requestAnimationFrame(() => {
      optionEls.current[activeIndex]?.focus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [open]);

  return (
    <div className={s.root} ref={rootRef}>
      <span className="bo-label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={s.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listId}-list`}
        aria-labelledby={`${listId}-label`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
      >
        <span>{selected?.label ?? "—"}</span>
        <span className={s.chevron} aria-hidden />
      </button>
      {open && (
        <ul
          ref={panelRef}
          id={`${listId}-list`}
          className={s.panel}
          role="listbox"
          aria-labelledby={`${listId}-label`}
          tabIndex={-1}
          onKeyDown={onPanelKey}
        >
          {options.map((opt, i) => (
            <OptionRow
              key={opt.id}
              option={opt}
              selected={opt.id === value}
              onPick={() => pick(opt.id)}
              optionRef={(el) => {
                optionEls.current[i] = el;
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

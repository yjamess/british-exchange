"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import c from "./controls.module.css";

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={c.seg} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} onClick={() => onChange(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  );
}

export type SearchItem = { label: string; kind: "Indicator" | "Place" | "Topic"; href: string; meta?: string };

const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d?[A-Z]{0,2}$/i;

export function Search({ items, placeholder }: { items: SearchItem[]; placeholder: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 6);
    return items
      .map((it) => {
        const hay = `${it.label} ${it.meta ?? ""} ${it.kind}`.toLowerCase();
        const score = hay.startsWith(s) ? 0 : it.label.toLowerCase().includes(s) ? 1 : hay.includes(s) ? 2 : 9;
        return { it, score };
      })
      .filter((r) => r.score < 9)
      .sort((a, b) => a.score - b.score)
      .slice(0, 7)
      .map((r) => r.it);
  }, [q, items]);

  const isPostcode = POSTCODE.test(q.trim()) && /\d/.test(q);

  const go = (href: string) => {
    setOpen(false);
    window.location.href = href;
  };

  return (
    <div className={c.search} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <label className={c.field}>
        <Icon name="search" size={20} />
        <input
          ref={inputRef}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && results[active]) {
              go(results[active].href);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={placeholder}
        />
        <span className={`bo-label ${c.kbd}`}>Enter</span>
      </label>
      {open ? (
        <ul id={listId} className={c.results} role="listbox">
          {isPostcode ? (
            <li className={c.note}>
              <span className="bo-label">Postcode</span>
              Postcode lookup arrives with the Price Paid atlas. Try a region or nation for now.
            </li>
          ) : null}
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.label}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(r.href)}>
                <span className="bo-label">{r.kind}</span>
                <span className={c.rLabel}>{r.label}</span>
                {r.meta ? <span className={c.rMeta}>{r.meta}</span> : null}
              </button>
            </li>
          ))}
          {!results.length && !isPostcode ? <li className={c.note}>Nothing in the housing record matches “{q}”.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

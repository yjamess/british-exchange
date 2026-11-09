"use client";

import { useEffect, useState } from "react";
import { Select as B } from "@base-ui/react/select";
import p from "./printSelect.module.css";

/**
 * PrintSelect — brand menu on Base UI (behaviour, keyboard, a11y, positioning).
 *   Trigger: value on a rule + drawn caret; open = solid ink.
 *   Items:   highlighted and selected = the same solid ink block.
 *
 * Portal mounts on `.bo` (not inside the controls row) so the popup escapes the stage
 * stacking context and is never clipped by the chart frame. `modal={false}` avoids the
 * body scroll-lock that was jumping the page to the bottom on open.
 */

export type PrintOption<T extends string> = { value: T; label: string };

const PORTAL_ATTR = "data-print-select-portal";

function ensureBrandPortal(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const root = document.querySelector(".bo");
  if (!root) return null;
  let host = root.querySelector<HTMLElement>(`[${PORTAL_ATTR}]`);
  if (!host) {
    host = document.createElement("div");
    host.setAttribute(PORTAL_ATTR, "");
    host.className = p.portalHost;
    root.appendChild(host);
  }
  return host;
}

function usePrintPortal() {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortal(ensureBrandPortal());
  }, []);
  return portal;
}

/** Opening the menu must not scroll the page. Base UI focuses the selected row. */
function holdWindowScroll(open: boolean) {
  if (!open) return;
  const y = window.scrollY;
  requestAnimationFrame(() => {
    if (window.scrollY !== y) window.scrollTo(0, y);
  });
}

export type PrintMultiOption<T extends string> = PrintOption<T> & {
  disabled?: boolean;
  title?: string;
};

/**
 * Same drawn menu as PrintSelect, but several rows can stay selected.
 * The closed control stays one line ("3 places"). The menu stays open
 * while you choose, which is how Base UI Select works with `multiple`:
 * https://base-ui.com/react/components/select#multiple
 */
export function PrintMultiSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  labelledBy,
  className = "",
  summary,
}: {
  value: T[];
  options: PrintMultiOption<T>[];
  onChange: (value: T[]) => void;
  ariaLabel?: string;
  labelledBy?: string;
  className?: string;
  /** Closed-menu text. Default: the one label, or "N selected". */
  summary?: (labels: string[]) => string;
}) {
  const portal = usePrintPortal();
  const items = options.map((o) => ({ value: o.value, label: o.label }));
  const labels = value.map((v) => options.find((o) => o.value === v)?.label ?? "…");
  const closed = summary ? summary(labels) : labels.length === 1 ? labels[0]! : labels.length === 0 ? "—" : `${labels.length} selected`;

  return (
    <span className={`${p.root} ${className}`}>
      <B.Root
        multiple
        items={items}
        value={value}
        modal={false}
        onValueChange={(next) => {
          if (Array.isArray(next)) onChange(next as T[]);
        }}
        onOpenChange={holdWindowScroll}
      >
        <B.Trigger
          className={p.trigger}
          aria-label={labelledBy ? undefined : ariaLabel}
          aria-labelledby={labelledBy}
        >
          <span className={p.value}>{closed}</span>
          <B.Icon className={p.caret}>
            <span />
          </B.Icon>
        </B.Trigger>
        <B.Portal container={portal}>
          <B.Positioner
            className={p.positioner}
            alignItemWithTrigger={false}
            side="bottom"
            align="start"
            sideOffset={-1}
            collisionAvoidance={{ side: "none", align: "none", fallbackAxisSide: "none" }}
          >
            <B.Popup className={p.popup} finalFocus={false}>
              <B.List className={p.list}>
                {options.map((o) => (
                  <B.Item key={o.value} value={o.value} className={p.item} disabled={o.disabled} title={o.title}>
                    <B.ItemText className={p.itemText}>{o.label}</B.ItemText>
                  </B.Item>
                ))}
              </B.List>
            </B.Popup>
          </B.Positioner>
        </B.Portal>
      </B.Root>
    </span>
  );
}

export function PrintSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  labelledBy,
  className = "",
}: {
  value: T;
  options: PrintOption<T>[];
  onChange: (v: T) => void;
  ariaLabel?: string;
  labelledBy?: string;
  className?: string;
}) {
  const portal = usePrintPortal();
  const items = options.map((o) => ({ value: o.value, label: o.label }));
  const labelOf = (v: unknown) => options.find((o) => o.value === v)?.label ?? "—";

  return (
    <span className={`${p.root} ${className}`}>
      <B.Root
        items={items}
        value={value}
        modal={false}
        onValueChange={(v) => v != null && onChange(v as T)}
        onOpenChange={holdWindowScroll}
      >
        <B.Trigger
          className={p.trigger}
          aria-label={labelledBy ? undefined : ariaLabel}
          aria-labelledby={labelledBy}
        >
          <B.Value className={p.value}>{(v: unknown) => labelOf(v)}</B.Value>
          <B.Icon className={p.caret}>
            <span />
          </B.Icon>
        </B.Trigger>
        <B.Portal container={portal}>
          <B.Positioner
            className={p.positioner}
            alignItemWithTrigger={false}
            side="bottom"
            align="start"
            sideOffset={-1}
            collisionAvoidance={{ side: "none", align: "none", fallbackAxisSide: "none" }}
          >
            <B.Popup className={p.popup} finalFocus={false}>
              <B.List className={p.list}>
                {options.map((o) => (
                  <B.Item key={o.value} value={o.value} className={p.item}>
                    <B.ItemText className={p.itemText}>{o.label}</B.ItemText>
                  </B.Item>
                ))}
              </B.List>
            </B.Popup>
          </B.Positioner>
        </B.Portal>
      </B.Root>
    </span>
  );
}

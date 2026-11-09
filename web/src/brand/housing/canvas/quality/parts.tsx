"use client";

/** Shared pieces for every Housing quality mode. */

import { ChipToggles, Control } from "../../..";
import { BASIS, TENURES, type Basis } from "./cutaway/features";
import q from "../plate.module.css";

/** Evidence-type tag: glyph + label + note, line style by type (never colour alone). */
export function BasisTag({ basis, note }: { basis: Basis; note?: string }) {
  const b = BASIS[basis];
  return (
    <p className={q.basis} data-basis={basis}>
      <span className={q.glyph} aria-hidden="true">
        {b.glyph}
      </span>
      <span>
        <strong>{b.label}.</strong> {note ?? b.note}
      </span>
    </p>
  );
}

/** Single-choice tenure chips (template ChipToggles); unpublished tenures stay visible but disabled. */
export function TenureChips({
  value,
  available,
  onChange,
  label = "Tenure",
}: {
  value: string;
  available: string[];
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <ChipToggles
      label={label}
      selected={[value]}
      onToggle={onChange}
      options={TENURES.filter((t) => t.core || available.includes(t.id)).map((t) => ({
        value: t.id,
        label: t.label,
        disabled: !available.includes(t.id),
        title: available.includes(t.id) ? undefined : "Not published at this level",
      }))}
    />
  );
}

/** A control slot that states why a filter is unavailable, instead of hiding it. */
export function UnavailableControl({ label, reason }: { label: string; reason: string }) {
  return <Control label={label}>{() => <p className={q.note}>{reason}</p>}</Control>;
}

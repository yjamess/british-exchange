"use client";

/**
 * Domain 08 — A Temporary Life.
 * Flat stack (Energy grammar): stay bands as RankBars, exact table, who, history.
 * Controls live in HousingExplorer. Table codes (TA2 / TA4) stay out of the UI —
 * they belong in Notes source language only as plain publisher wording.
 */

import { useMemo } from "react";
import { EmptyStage, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import type { HousingV1 } from "../../load";
import s from "./insecurity.module.css";
import gen from "../../../energy/generation.module.css";

type Ins = HousingV1["insecurity"];

type Props = {
  insecurity: Ins;
  type: string | null;
};

const LONG = new Set(["1-to-2-years", "2-to-5-years", "5-or-more-years"]);

export const TEMPORARY_TYPE_OPTIONS_SHORT: Record<string, string> = {
  "all-types": "All types",
  "nightly-paid": "Nightly paid",
  "la-ha-stock": "Council or housing association",
  "private-sector": "Private sector",
  bb: "Bed and breakfast",
  hostels: "Hostels",
  other: "Other",
};

const BAND_LABEL: Record<string, string> = {
  "under-6-months": "Under 6 months",
  "6-months-to-1-year": "6 to 12 months",
  "1-to-2-years": "1 to 2 years",
  "2-to-5-years": "2 to 5 years",
  "5-or-more-years": "5 years or more (open-ended)",
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (iso: string) =>
  iso ? `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "the latest date";

export function temporaryTypeOptions(insecurity: Ins): { value: string; label: string }[] {
  return insecurity.taDurationMatrix.map((m) => ({
    value: m.id,
    label: TEMPORARY_TYPE_OPTIONS_SHORT[m.id] ?? m.label,
  }));
}

export function temporaryFoot(insecurity: Ins, type: string | null): {
  definition: string;
  method: string[];
  source: string;
} {
  const row = insecurity.taDurationMatrix.find((m) => m.id === type) ?? insecurity.taDurationMatrix[0];
  const date = dateLabel(insecurity.taDurationDate);
  return {
    definition:
      "How long households in temporary accommodation had already been there on one date — a stock, not how long a stay will last when it ends.",
    method: [
      "Bands are published length-of-stay groups on that date. They are not completed stays.",
      "Five years or more has no published end date.",
      "A one-day count over-represents long stays compared with everyone who passes through in a year.",
      "Entries and exits across the year are not loaded.",
      row ? `Accommodation type shown: ${TEMPORARY_TYPE_OPTIONS_SHORT[row.id] ?? row.label}.` : "",
    ].filter(Boolean),
    source: `MHCLG temporary accommodation length of stay · England · stock on ${date}`,
  };
}

export function TemporaryLife({ insecurity, type }: Props) {
  const matrix = insecurity.taDurationMatrix;
  const row = matrix.find((m) => m.id === type) ?? matrix[0];
  const date = dateLabel(insecurity.taDurationDate);
  const children = insecurity.headlines.taChildren;

  const series = useMemo(
    () => [
      { id: "households", label: "Households", points: insecurity.taHouseholds },
      { id: "with-children", label: "Households with children", points: insecurity.taWithChildren },
    ],
    [insecurity.taHouseholds, insecurity.taWithChildren],
  );

  if (!row) {
    return (
      <EmptyStage label="In preparation">
        Length-of-stay figures are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const longCount = row.bands.filter((b) => LONG.has(b.id)).reduce((acc, b) => acc + b.v, 0);
  const fiveplus = row.bands.find((b) => b.id === "5-or-more-years")?.v ?? null;
  const longShare = row.total > 0 ? (longCount / row.total) * 100 : null;

  const bandRows = row.bands.map((b) => ({
    id: b.id,
    label: BAND_LABEL[b.id] ?? b.label,
    v: b.v,
  }));

  const whoRows = insecurity.taHouseholdComposition.map((c) => ({
    id: c.id,
    label: c.label,
    v: c.v,
  }));

  const typeLabel = TEMPORARY_TYPE_OPTIONS_SHORT[row.id] ?? row.label;

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          Length of stay so far · {typeLabel} · England · {date}
        </h3>
        <p className={s.big}>
          <span className="bo-fig">{fmt.count(longCount)}</span>
          <span>
            households a year or more
            {longShare != null ? ` · ${longShare.toFixed(0)}% of ${fmt.count(row.total)}` : ""}
          </span>
        </p>
        {fiveplus != null && (
          <p className={s.metaLine}>
            Of those, {fmt.count(fiveplus)} had already been there five years or more.
          </p>
        )}
        <RankBars
          label={`Households by length of stay so far · ${typeLabel} · ${date}`}
          rows={bandRows}
          format={fmt.count}
        />
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Who is living there · England · {date}</h3>
        {children != null && (
          <p className={s.big}>
            <span className="bo-fig">{fmt.count(children)}</span>
            <span>children in these households</span>
          </p>
        )}
        {whoRows.length > 0 ? (
          <RankBars
            label={`Household composition · England · ${date}`}
            rows={whoRows}
            format={fmt.count}
          />
        ) : (
          <EmptyStage label="Not loaded">Household composition is not loaded for this date.</EmptyStage>
        )}
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Over time · England · stock at each quarter end</h3>
        <TimeChart
          series={series}
          cadence="quarterly"
          format={fmt.count}
          axisFormat={fmt.countCompact}
          height={260}
          label="Households in temporary accommodation in England, total and with children"
        />
      </section>
    </div>
  );
}

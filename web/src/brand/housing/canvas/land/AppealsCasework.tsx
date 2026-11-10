"use client";

/**
 * Domain 06 — Planning Inspectorate appeals casework.
 * England decided appeals from the PINS Casework Database (aggregates).
 * Not a map: addresses stay text. Not Live Table P120.
 */

import { EmptyStage, explorerClasses as xc } from "../../..";
import { fmt } from "../../../data";
import { RankBars, TimeChart } from "../../../instrument/TimeChart";
import gen from "../../../energy/generation.module.css";
import s from "./land.module.css";

export type AppealsSummary = {
  casesDecided: number;
  yearFrom: number;
  yearTo: number;
  latestFullYear: number;
  englandByYear: {
    year: number;
    decided: number;
    allowed: number;
    dismissed: number;
    other: number;
    excluded: number;
    allowRatePct: number | null;
  }[];
  authorities: {
    code: string;
    name: string;
    year: number;
    decided: number;
    allowed: number;
    dismissed: number;
    allowRatePct: number | null;
  }[];
  types: { type: string; decided: number }[];
  source: { landing: string; licence: string; release: string };
  notes: string[];
};

export function appealsFoot(appeals: AppealsSummary | null): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const y = appeals?.latestFullYear;
  const row = appeals?.englandByYear.find((r) => r.year === y);
  return {
    definition:
      "Decided Planning Inspectorate casework in England from the published Casework Database — not district planning applications (P120), and not a map of sites.",
    method: [
      "Allow rate is Allowed ÷ (Allowed + Dismissed). Allowed includes Allowed with Conditions, Allowed in part, and Planning permission granted.",
      "Unknown, withdrawn, invalid and turned-away outcomes are excluded from the allow rate. Enforcement notice outcomes sit in Other.",
      "Site address is published as text. The Exchange does not geocode it.",
      "Counts can differ from PINS quarterly Official Statistics (different compile day).",
      y != null && row != null
        ? `${y}: ${fmt.count(row.decided)} decided · allow rate ${row.allowRatePct ?? "—"}% (Allowed vs Dismissed).`
        : "",
    ].filter(Boolean),
    source:
      appeals != null
        ? `Planning Inspectorate · Casework Database · England · release ${appeals.source.release}`
        : "Planning Inspectorate · Casework Database · England",
    dataHref: "/data#planning-decisions-granted",
  };
}

export function AppealsCasework({ appeals }: { appeals: AppealsSummary | null }) {
  if (!appeals || appeals.englandByYear.length === 0) {
    return (
      <EmptyStage label="In preparation">
        The Planning Inspectorate Casework Database is not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const decidedPts = appeals.englandByYear.map((r) => ({ t: r.year, v: r.decided }));
  const allowedPts = appeals.englandByYear.map((r) => ({ t: r.year, v: r.allowed }));
  const dismissedPts = appeals.englandByYear.map((r) => ({ t: r.year, v: r.dismissed }));
  const ratePts = appeals.englandByYear
    .filter((r) => r.allowRatePct != null)
    .map((r) => ({ t: r.year, v: r.allowRatePct as number }));

  const latest = appeals.englandByYear.find((r) => r.year === appeals.latestFullYear);
  const authRows = appeals.authorities.slice(0, 15).map((a) => ({
    id: a.code || a.name,
    label: a.name.replace(/^London Borough of /, "").replace(/ Council$/, ""),
    v: a.decided,
  }));
  const typeRows = appeals.types.slice(0, 10).map((t) => ({
    id: t.type,
    label: t.type,
    v: t.decided,
  }));

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>
          Decided appeals · England · {appeals.latestFullYear}
        </h3>
        <p className={s.note}>
          {latest != null ? (
            <>
              <span className="bo-fig">{fmt.count(latest.decided)}</span> decided · allow rate{" "}
              <span className="bo-fig">{latest.allowRatePct ?? "—"}%</span> (Allowed vs Dismissed) ·
              Casework Database rolling extract, not P120.
            </>
          ) : (
            "Latest full year totals are not available."
          )}
        </p>
      </section>

      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>Decided appeals by year · England</h3>
        <TimeChart
          series={[
            { id: "decided", label: "Decided", points: decidedPts },
            { id: "allowed", label: "Allowed", points: allowedPts },
            { id: "dismissed", label: "Dismissed", points: dismissedPts },
          ]}
          cadence="annual"
          format={fmt.count}
          axisFormat={fmt.countCompact}
          height={300}
          label="England Planning Inspectorate decided appeals by year"
        />
      </section>

      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>Allow rate · Allowed vs Dismissed · %</h3>
        <TimeChart
          series={[{ id: "rate", label: "Allow rate", points: ratePts }]}
          cadence="annual"
          format={(v) => `${v.toFixed(1)}%`}
          axisFormat={(v) => `${v.toFixed(0)}%`}
          height={260}
          label="England Planning Inspectorate allow rate, Allowed versus Dismissed"
        />
      </section>

      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>
          Local authorities · decided appeals · {appeals.latestFullYear}
        </h3>
        <RankBars
          label={`Top authorities by decided appeals, ${appeals.latestFullYear}`}
          rows={authRows}
          format={fmt.count}
        />
      </section>

      <section className={gen.panel}>
        <h3 className={xc.stageTitle}>Casework type · all decided years in extract</h3>
        <RankBars label="Decided appeals by casework type" rows={typeRows} format={fmt.count} />
      </section>
    </div>
  );
}

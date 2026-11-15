"use client";

/**
 * Domain 09 · Who owns — titles held by companies (HM Land Registry CCOD + OCOD).
 * Displacement map chrome: map + place readout (legend inside), then RankBars panels.
 * Owner and authority search live in HousingExplorer. Counts only; no title, address or name.
 */

import { ReadoutCard } from "../../../instrument/ReadoutCard";
import { useMemo } from "react";
import { EmptyStage, MapLegend, explorerClasses as t } from "../../..";
import { fmt } from "../../../data";
import { RankBars } from "../../../instrument/TimeChart";
import { AreaMap } from "../../atlas/AreaMap";
import { breaks, formatValue, type Area } from "../../atlas/model";
import type { HousingV1, OwnerTitles } from "../../load";
import { useGeometry } from "../insecurity/Displacement";
import s from "../insecurity/insecurity.module.css";
import gen from "../../../energy/generation.module.css";
import { Term } from "../../..";

type Titles = HousingV1["ownership"]["titles"];
export type Owner = "uk" | "overseas";

const OWNER: Record<Owner, { label: string; lower: string; measure: string; register: string }> = {
  uk: {
    label: "UK companies",
    lower: "UK companies",
    measure: "titles-uk-company",
    register: "UK companies that own property in England and Wales",
  },
  overseas: {
    label: "Overseas companies",
    lower: "overseas companies",
    measure: "titles-overseas-company",
    register: "Overseas companies that own property in England and Wales",
  },
};

export const WHO_OWNS_OWNER_OPTIONS: { value: Owner; label: string }[] = [
  { value: "uk", label: OWNER.uk.label },
  { value: "overseas", label: OWNER.overseas.label },
];

export const isOwner = (v: string | null): v is Owner => v === "uk" || v === "overseas";

/** Plain-word groups over Land Registry proprietorship categories (Exchange grouping). */
const GROUPS: { id: string; label: string; test: (label: string) => boolean }[] = [
  {
    id: "companies",
    label: "Companies and partnerships",
    test: (l) => /^(Limited Company|Unlimited Company|Limited Liability Partnership)/.test(l),
  },
  { id: "councils", label: "Councils", test: (l) => l === "Local Authority" || l === "County Council" },
  { id: "societies", label: "Housing associations and other societies", test: (l) => /Society|Housing Association/.test(l) },
  { id: "corporate", label: "Other corporate bodies", test: (l) => l === "Corporate Body" },
];

function grouped(types: OwnerTitles["types"]): { id: string; label: string; v: number }[] {
  const sums = new Map<string, { id: string; label: string; v: number }>();
  for (const row of types) {
    const g = GROUPS.find((x) => x.test(row.label)) ?? { id: "other", label: "Other or not stated" };
    const hit = sums.get(g.id) ?? { id: g.id, label: g.label, v: 0 };
    hit.v += row.v;
    sums.set(g.id, hit);
  }
  return [...sums.values()].sort((a, b) => b.v - a.v);
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (iso: string) => (iso ? `${MON[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "the latest month");

export function whoOwnsFoot(titles: Titles, owner: Owner): {
  definition: string;
  method: string[];
  source: string;
  dataHref: string;
} {
  const year = titles.period ? titles.period.slice(0, 4) : "2026";
  return {
    definition:
      "Registered titles in England and Wales held by a company or other organisation. A title is a registered piece of land or property, not a home: one title can cover a block of flats, a field, or many addresses.",
    method: [
      "Owner type and country are those of the first owner named on the title.",
      "Groups on the owner-type chart combine Land Registry categories (Exchange grouping). The Data tab lists every category.",
      "Titles owned by individuals are not in these files.",
      "A title held jointly by a UK and an overseas company is counted in both.",
      "Unshaded places: Scotland and Northern Ireland, which have their own land registers.",
      `Contains HM Land Registry data © Crown copyright and database right ${year}. This data is licensed under the Open Government Licence v3.0.`,
    ],
    // Source row: publisher · series · period. Licence attribution sits in Method.
    source: `HM Land Registry · ${OWNER[owner].register} · England and Wales · ${monthLabel(titles.period)}`,
    dataHref: "/data#corporate-owned-titles",
  };
}

type Props = {
  titles: Titles;
  owner: Owner;
  area: string;
  onArea: (code: string | null) => void;
};

export function WhoOwns({ titles, owner, area, onArea }: Props) {
  const { geometry, error } = useGeometry();
  const o = OWNER[owner];
  const data = titles[owner];
  const other = titles[owner === "uk" ? "overseas" : "uk"];
  const month = monthLabel(titles.period);

  const areas: Area[] = useMemo(
    () => data.places.map((p) => ({ code: p.code, name: p.name, level: "local" as const, values: [p.v] })),
    [data.places],
  );
  const ranked = useMemo(
    () => data.places.map((p) => ({ id: p.code, label: p.name, v: p.v })).sort((a, b) => b.v - a.v),
    [data.places],
  );
  const groups = useMemo(() => grouped(data.types), [data.types]);

  if (data.total == null || data.places.length === 0) {
    return (
      <EmptyStage label="In preparation">
        Land Registry company ownership counts are not loaded yet. No estimated figures.
      </EmptyStage>
    );
  }

  const selected = data.places.find((p) => p.code === area) ?? null;
  const selectedOther = other.places.find((p) => p.code === area) ?? null;
  const rank = selected ? ranked.findIndex((r) => r.id === selected.code) + 1 : 0;

  return (
    <div className={gen.stack}>
      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          Titles held by {o.lower} · England and Wales · {month}
        </h3>
        <div className={s.mapGrid}>
          <div className={s.mapCol}>
            {geometry ? (
              <AreaMap
                shapes={geometry.shapes}
                areas={areas}
                month={0}
                measure={o.measure}
                mode="price"
                selected={area}
                comparison=""
                onSelect={(code) => onArea(code === area ? null : code)}
                flow
                compact
                coverage="Local authorities · England and Wales"
                mapLabel={`Map of local authorities in England and Wales, shaded by titles held by ${o.lower}.`}
              />
            ) : (
              <EmptyStage label={error ? "Map unavailable" : "Loading map"}>
                {error || "Fetching local-authority boundaries…"}
              </EmptyStage>
            )}
          </div>

          <aside className={s.readout} aria-live="polite" aria-label="Place record">
            <p className="bo-label">In focus</p>
            {selected ? (
              <>
                <ReadoutCard placement="inline" head={`${selected.name} · ${month}`} rows={[
                  { label: `Titles held by ${o.lower}`, value: fmt.count(selected.v) },
                  ...(rank > 0 ? [{ label: "Rank", value: `${ordinal(rank)} of ${ranked.length}` }] : []),
                  { label: "UK company titles", value: fmt.count((owner === "uk" ? selected : selectedOther)?.v ?? 0) },
                  { label: "Overseas company titles", value: fmt.count((owner === "overseas" ? selected : selectedOther)?.v ?? 0) },
                ]} />
              </>
            ) : (
              <>
                <p className={s.readoutMeta}>
                  Select a local authority on the map or in the ranking. No place is chosen until you do.
                </p>
                <ReadoutCard placement="inline" head={`England and Wales · ${month}`} rows={[
                  { label: `Titles held by ${o.lower}`, value: fmt.count(data.total) },
                ]} />
              </>
            )}

            <MapLegend
              title="titles"
              thresholds={breaks(o.measure, "price")}
              format={(v) => formatValue(v, o.measure, "price", true)}
            />
          </aside>
        </div>
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>Highest 20 authorities · {month}</h3>
        <RankBars
          label={`Titles held by ${o.lower} · highest 20 · ${month}`}
          rows={ranked.slice(0, 20).map((r) => ({ ...r, active: r.id === area }))}
          format={fmt.count}
          onSelect={(id) => onArea(id === area ? null : id)}
        />
      </section>

      <section className={gen.panel}>
        <h3 className={t.stageTitle}>
          Type of owner · {o.lower} · England and Wales · {month}
        </h3>
        <RankBars
          label={`Titles held by ${o.lower} by type of owner · ${month}`}
          rows={groups}
          format={fmt.count}
        />
      </section>

      {owner === "overseas" ? (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>Where the owner is registered · highest 15 · {month}</h3>
          <RankBars
            label={`Titles held by overseas companies by country of registration · highest 15 · ${month}`}
            rows={data.countries.slice(0, 15)}
            format={fmt.count}
          />
        </section>
      ) : (
        <section className={gen.panel}>
          <h3 className={t.stageTitle}>
            <Term slug="freehold">Freehold</Term> and <Term slug="leasehold">leasehold</Term> · UK companies · {month}
          </h3>
          <RankBars
            label={`Titles held by UK companies by tenure · ${month}`}
            rows={[
              { id: "freehold", label: "Freehold", v: data.freehold ?? 0 },
              { id: "leasehold", label: "Leasehold", v: data.leasehold ?? 0 },
            ]}
            format={fmt.count}
          />
        </section>
      )}
    </div>
  );
}

function ordinal(n: number) {
  const sfx = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${sfx[(v - 20) % 10] ?? sfx[v] ?? sfx[0]}`;
}

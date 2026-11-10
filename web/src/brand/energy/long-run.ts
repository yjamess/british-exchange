/**
 * Changing Current — the long-run model (client-safe; the file read lives in load.ts).
 *
 * Source: DESNZ "Electricity since 1920" (DUKES), Estimated Historical Generation, UK, annual TWh
 * (`electricity-generation-long-run`). Every value drawn is a published annual observation; the
 * stream only joins observed years. Fuel groups are DESNZ's, two merged for display (coke and breeze
 * into other fuels) and one gap made visible (total minus fuels from 2017, "not allocated").
 */

export const LONG_RUN_ID = "electricity-generation-long-run";

/**
 * Methodology anchors from DESNZ notes (not read from the CSV).
 * Series first/last years always come from `mix` in the UI; these fill Notes and
 * fallbacks when the pack is empty.
 */
export const LONG_RUN_SOURCE = {
  id: LONG_RUN_ID,
  publisher: "DESNZ",
  title: "Electricity since 1920 — estimated generation by fuel (DUKES)",
  release: "30 July 2026",
  href: "https://www.gov.uk/government/statistical-data-sets/historical-electricity-data",
  /** Earliest year in the published “Electricity since 1920” table. */
  seriesStart: 1920,
  /** DESNZ note 1: estimated through the year before this; DUKES 5.6 actuals from here. */
  firstReported: 1996,
  /** Energy Trends ET 5.1 quarterly detail (separate publication). */
  et51Start: 1998,
  /** Default Compare “from” year and gas-rise editorial anchor. */
  compareAnchor: 1990,
  /** First year the published total exceeds the sum of fuel columns (unallocated band). */
  unallocatedFrom: 2017,
};

/** Related catalogue record and the years it covers, so Follow can carry the period honestly. */
export type Coverage = { id: string; title: string; first: number; last: number; frequency: string };

export type LongRunPack = {
  mix: LongYear[];
  related: Record<string, Coverage>;
};

export type LongFuelId = "gas" | "oil" | "coal" | "renewables" | "nuclear" | "other" | "storage" | "unallocated";

export type LongFuel = {
  id: LongFuelId;
  label: string;
  /** Short in-band label. */
  short: string;
  /** Published DESNZ columns rolled into this display group. */
  sourceLabels: string[];
  /** Fill: a brand chart token, or a screen (hatch / dots / outline). */
  fill: { kind: "solid"; color: string; text: string } | { kind: "hatch" | "dots" | "outline" };
  /** What the group includes, from DESNZ's notes. */
  includes: string;
  selectable: boolean;
};

/** Stream order, top edge to bottom edge (coal at the heart, as the century was). */
export const LONG_FUELS: LongFuel[] = [
  {
    id: "gas",
    label: "Natural gas",
    short: "Gas",
    sourceLabels: ["Natural gas"],
    fill: { kind: "solid", color: "var(--bo-mustard)", text: "var(--bo-union)" },
    includes: "Natural gas, including colliery methane from 1987 (DESNZ note 3).",
    selectable: true,
  },
  {
    id: "oil",
    label: "Oil",
    short: "Oil",
    sourceLabels: ["Oil"],
    fill: { kind: "solid", color: "var(--bo-chart-2)", text: "var(--bo-paper)" },
    includes:
      "Oil used in gas turbine and diesel plant or to light up coal-fired boilers, Orimulsion (until 1997) and refinery gas (from 1987) (DESNZ note 2).",
    selectable: true,
  },
  {
    id: "coal",
    label: "Coal",
    short: "Coal",
    sourceLabels: ["Coal"],
    fill: { kind: "solid", color: "var(--bo-union)", text: "var(--bo-paper)" },
    includes: "Coal burned in power stations.",
    selectable: true,
  },
  {
    id: "renewables",
    label: "Wind, solar and hydro",
    short: "Wind, solar and hydro",
    sourceLabels: ["Wind, wave, solar and hydro"],
    fill: { kind: "solid", color: "var(--bo-chart-4)", text: "var(--bo-paper)" },
    includes:
      "Wind, wave and tidal, solar and hydro, published as one group (DESNZ note 4). Bioenergy is not in this group; DESNZ counts it under other fuels.",
    selectable: true,
  },
  {
    id: "nuclear",
    label: "Nuclear",
    short: "Nuclear",
    sourceLabels: ["Nuclear"],
    fill: { kind: "solid", color: "var(--bo-electric)", text: "var(--bo-paper)" },
    includes: "Nuclear power stations.",
    selectable: true,
  },
  {
    id: "other",
    label: "Other fuels",
    short: "Other fuels",
    sourceLabels: ["Other fuels", "Coke and breeze"],
    fill: { kind: "hatch" },
    includes:
      "Coke and breeze, coke oven gas, blast furnace gas, chemical waste, refuse-derived fuel and bioenergy (DESNZ note 5). Coke and breeze is a separate DESNZ column, merged here for display.",
    selectable: true,
  },
  {
    id: "storage",
    label: "Pumped and battery storage",
    short: "Storage",
    sourceLabels: ["Pumped storage"],
    fill: { kind: "dots" },
    includes: "Pumped storage and battery storage output (DESNZ note 6). Storage returns electricity generated earlier; it is not a primary source.",
    selectable: true,
  },
  {
    id: "unallocated",
    label: "Not allocated to a fuel",
    short: "Not allocated",
    sourceLabels: [],
    fill: { kind: "outline" },
    includes: `From ${LONG_RUN_SOURCE.unallocatedFrom} DESNZ's published total exceeds the sum of its fuel columns by 5–7 TWh. The total matches Energy Trends ET 5.1; the gap is not assigned to any fuel here.`,
    selectable: false,
  },
];

export const longFuel = (id: string) => LONG_FUELS.find((f) => f.id === id);

export type LongYear = {
  year: number;
  /** TWh by display group, including `unallocated`. */
  v: Record<LongFuelId, number>;
  total: number;
  estimated: boolean;
};

/** CSV rows (indicator, period_start, …, value, unit, status, version, notes) → annual mix. */
export function longRunFromRows(rows: { period_start: string; value: number | null; observation_status: string; notes: string }[]): LongYear[] {
  const byYear = new Map<number, { fuels: Record<string, number>; total: number | null; estimated: boolean }>();
  for (const r of rows) {
    const y = Number(r.period_start.slice(0, 4));
    const label = /^fuel=(.*)$/.exec(r.notes.trim())?.[1]?.trim() ?? "";
    let acc = byYear.get(y);
    if (!acc) byYear.set(y, (acc = { fuels: {}, total: null, estimated: false }));
    if (r.observation_status === "estimated") acc.estimated = true;
    if (r.value == null) continue;
    if (label === "Total") acc.total = r.value;
    else acc.fuels[label] = (acc.fuels[label] ?? 0) + r.value;
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, acc]) => {
      const v = Object.fromEntries(LONG_FUELS.map((f) => [f.id, f.sourceLabels.reduce((s, l) => s + (acc.fuels[l] ?? 0), 0)])) as Record<LongFuelId, number>;
      const fuelSum = LONG_FUELS.reduce((s, f) => s + v[f.id], 0);
      const total = acc.total ?? fuelSum;
      // Only a real published gap counts; rounding noise stays zero.
      v.unallocated = total - fuelSum > 0.01 ? total - fuelSum : 0;
      return { year, v, total: fuelSum + v.unallocated, estimated: acc.estimated };
    });
}

export type Measure = "absolute" | "share";
export type Layout = "stream" | "axis";

export const value = (y: LongYear, id: LongFuelId, measure: Measure) =>
  measure === "share" ? (y.total > 0 ? (y.v[id] / y.total) * 100 : 0) : y.v[id];

/**
 * Band edges for every group at every year, in data units (TWh or %), measured from the centre line
 * (stream) or from zero (axis). Isolated: the chosen group alone, every other group closed to zero
 * thickness on its edge, so the morph keeps one geometry.
 */
export function layoutBands(mix: LongYear[], measure: Measure, layout: Layout, isolate: LongFuelId | null): { lo: number[]; hi: number[] }[] {
  return LONG_FUELS.map((f, i) => {
    const lo: number[] = [];
    const hi: number[] = [];
    for (const y of mix) {
      const total = measure === "share" ? 100 : y.total;
      if (isolate) {
        const v = value(y, isolate, measure);
        const base = layout === "stream" ? -v / 2 : 0;
        const before = LONG_FUELS.findIndex((g) => g.id === isolate);
        const edge = i < before ? base + v : base; // closed bands sit on the isolated band's edges
        if (f.id === isolate) {
          lo.push(base);
          hi.push(base + v);
        } else {
          lo.push(edge);
          hi.push(edge);
        }
        continue;
      }
      // Top of the stack is the first group; bands are laid from the bottom edge upwards.
      const below = LONG_FUELS.slice(i + 1).reduce((s, g) => s + value(y, g.id, measure), 0);
      const base = layout === "stream" ? -total / 2 : 0;
      lo.push(base + below);
      hi.push(base + below + value(y, f.id, measure));
    }
    return { lo, hi };
  });
}

/* ——— Turning points computed from the series (facts, not causes) ——— */

export type DataPoint = { id: string; year: number; text: string };

const twh = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
export const fmtTWh = (v: number) => `${twh(v)} TWh`;
export const fmtPct = (v: number) => `${v.toFixed(1)}%`;

function peak(mix: LongYear[], f: (y: LongYear) => number) {
  return mix.reduce((best, y) => (f(y) > f(best) ? y : best), mix[0]!);
}
function firstWhere(mix: LongYear[], f: (y: LongYear) => boolean) {
  return mix.find(f);
}

export function dataTurningPoints(mix: LongYear[], fuel: LongFuelId | null): DataPoint[] {
  if (mix.length === 0) return [];
  const out: DataPoint[] = [];
  const share = (y: LongYear, id: LongFuelId) => value(y, id, "share");
  const latest = mix.at(-1)!;
  if (!fuel || fuel === "coal") {
    const p = peak(mix, (y) => y.v.coal);
    out.push({ id: "coal-peak", year: p.year, text: `Coal generation peaked at ${fmtTWh(p.v.coal)} in ${p.year}.` });
    const lastCoal = [...mix].reverse().find((y) => y.v.coal > 0);
    if (lastCoal && lastCoal !== latest)
      out.push({ id: "coal-last", year: lastCoal.year, text: `${lastCoal.year} is the last year with coal generation in the series (${fmtTWh(lastCoal.v.coal)}); ${latest.year} records none.` });
  }
  if (!fuel || fuel === "gas") {
    const over = firstWhere(mix, (y) => y.v.gas > y.v.coal && y.v.gas > 0);
    if (over) out.push({ id: "gas-over-coal", year: over.year, text: `Gas first generated more than coal in ${over.year} (${fmtTWh(over.v.gas)} against ${fmtTWh(over.v.coal)}).` });
    const p = peak(mix, (y) => y.v.gas);
    out.push({ id: "gas-peak", year: p.year, text: `Gas peaked at ${fmtTWh(p.v.gas)} in ${p.year}, ${fmtPct(share(p, "gas"))} of generation.` });
  }
  if (!fuel || fuel === "nuclear") {
    const first = firstWhere(mix, (y) => y.v.nuclear > 0);
    if (first) out.push({ id: "nuclear-first", year: first.year, text: `Nuclear first appears in ${first.year} (${fmtTWh(first.v.nuclear)}).` });
    const p = peak(mix, (y) => share(y, "nuclear"));
    out.push({ id: "nuclear-peak", year: p.year, text: `Nuclear's largest share was ${fmtPct(share(p, "nuclear"))} in ${p.year}; ${fmtPct(share(latest, "nuclear"))} in ${latest.year}.` });
  }
  if (!fuel || fuel === "renewables") {
    const over = firstWhere(mix, (y) => y.v.renewables > y.v.nuclear && y.year > 1960);
    if (over) out.push({ id: "renewables-over-nuclear", year: over.year, text: `Wind, solar and hydro first generated more than nuclear in ${over.year}.` });
    const overGas = firstWhere(mix, (y) => y.v.renewables > y.v.gas && y.year > LONG_RUN_SOURCE.compareAnchor);
    if (overGas) out.push({ id: "renewables-over-gas", year: overGas.year, text: `Wind, solar and hydro first generated more than gas in ${overGas.year} (${fmtTWh(overGas.v.renewables)} against ${fmtTWh(overGas.v.gas)}).` });
  }
  if (!fuel || fuel === "oil") {
    const p = peak(mix, (y) => y.v.oil);
    out.push({ id: "oil-peak", year: p.year, text: `Oil peaked at ${fmtTWh(p.v.oil)} in ${p.year}, ${fmtPct(share(p, "oil"))} of generation.` });
  }
  if (!fuel || fuel === "other") {
    const p = peak(mix, (y) => y.v.other);
    out.push({ id: "other-peak", year: p.year, text: `Other fuels reached ${fmtTWh(p.v.other)} in ${p.year}.` });
  }
  if (!fuel) {
    const p = peak(mix, (y) => y.total);
    out.push({ id: "total-peak", year: p.year, text: `Total generation peaked at ${fmtTWh(p.total)} in ${p.year}; ${fmtTWh(latest.total)} in ${latest.year}.` });
  }
  return out.sort((a, b) => a.year - b.year);
}

/* ——— Dated milestones: each carries its source; none asserts a cause ——— */

export type Milestone = {
  id: string;
  year: number;
  date: string;
  title: string;
  fuels: LongFuelId[];
  source: { publisher: string; title: string; href: string };
};

const GENERATORS = {
  publisher: "DESNZ",
  title: "Electricity since 1920, List of Electricity Generators (commissioned / closure year)",
  href: LONG_RUN_SOURCE.href,
};

export const MILESTONES: Milestone[] = [
  {
    id: "act-1926",
    year: 1926,
    date: "1926",
    title: "Electricity (Supply) Act 1926 sets up the Central Electricity Board to build a national grid",
    fuels: [],
    source: { publisher: "legislation.gov.uk", title: "Electricity (Supply) Act 1926", href: "https://www.legislation.gov.uk/ukpga/Geo5/16-17/51/contents" },
  },
  {
    id: "act-1947",
    year: 1947,
    date: "1947",
    title: "Electricity Act 1947 nationalises the electricity supply industry",
    fuels: [],
    source: { publisher: "legislation.gov.uk", title: "Electricity Act 1947", href: "https://www.legislation.gov.uk/ukpga/Geo6/10-11/54/contents" },
  },
  {
    id: "calder-hall",
    year: 1956,
    date: "17 October 1956",
    title: "Calder Hall opens: the world's first nuclear power station to supply domestic electricity",
    fuels: ["nuclear"],
    source: {
      publisher: "GOV.UK (Sellafield Ltd)",
      title: "Sellafield's Calder Hall turns 70 as decommissioning gathers pace",
      href: "https://www.gov.uk/government/news/sellafields-calder-hall-turns-70-as-decommissioning-gathers-pace",
    },
  },
  {
    id: "act-1989",
    year: 1989,
    date: "1989",
    title: "Electricity Act 1989 provides for privatisation of the electricity supply industry",
    fuels: ["gas", "coal"],
    source: { publisher: "legislation.gov.uk", title: "Electricity Act 1989", href: "https://www.legislation.gov.uk/ukpga/1989/29/contents" },
  },
  { id: "roosecote-b", year: 1991, date: "1991", title: "Roosecote B gas station commissioned (229 MW)", fuels: ["gas"], source: GENERATORS },
  { id: "sizewell-b", year: 1995, date: "1995", title: "Sizewell B nuclear station commissioned (1,198 MW)", fuels: ["nuclear"], source: GENERATORS },
  {
    id: "cca-2008",
    year: 2008,
    date: "2008",
    title: "Climate Change Act 2008 sets a statutory emissions target",
    fuels: [],
    source: { publisher: "legislation.gov.uk", title: "Climate Change Act 2008", href: "https://www.legislation.gov.uk/ukpga/2008/27/contents" },
  },
  {
    id: "act-2013",
    year: 2013,
    date: "2013",
    title: "Energy Act 2013 creates Contracts for Difference and the capacity market",
    fuels: ["renewables", "nuclear"],
    source: { publisher: "legislation.gov.uk", title: "Energy Act 2013", href: "https://www.legislation.gov.uk/ukpga/2013/32/contents" },
  },
  { id: "drax-biomass", year: 2013, date: "2013", title: "Drax biomass units commissioned (2,640 MW), counted as bioenergy", fuels: ["other", "coal"], source: GENERATORS },
  {
    id: "cfd-ar1",
    year: 2014,
    date: "2014",
    title: "First Contracts for Difference allocation round",
    fuels: ["renewables"],
    source: {
      publisher: "GOV.UK (DECC)",
      title: "Contracts for Difference (CfD): first allocation round",
      href: "https://www.gov.uk/government/collections/contracts-for-difference-cfd-first-allocation-round",
    },
  },
  { id: "longannet", year: 2016, date: "2016", title: "Longannet coal station closes (2,304 MW, Fife)", fuels: ["coal"], source: GENERATORS },
  { id: "ferrybridge-c", year: 2016, date: "2016", title: "Ferrybridge C coal station closes (1,960 MW)", fuels: ["coal"], source: GENERATORS },
  { id: "eggborough", year: 2018, date: "2018", title: "Eggborough coal station closes (1,960 MW)", fuels: ["coal"], source: GENERATORS },
  { id: "hornsea-one", year: 2019, date: "2019", title: "Hornsea One offshore wind farm commissioned (1,218 MW)", fuels: ["renewables"], source: GENERATORS },
  { id: "cottam", year: 2019, date: "2019", title: "Cottam coal station closes (2,000 MW)", fuels: ["coal"], source: GENERATORS },
  { id: "aberthaw", year: 2020, date: "2020", title: "Aberthaw B coal station closes (1,560 MW, Wales)", fuels: ["coal"], source: GENERATORS },
  {
    id: "coal-2024",
    year: 2021,
    date: "30 June 2021",
    title: "Government brings the end of coal power in Great Britain forward to October 2024",
    fuels: ["coal"],
    source: {
      publisher: "GOV.UK (BEIS)",
      title: "End to coal power brought forward to October 2024",
      href: "https://www.gov.uk/government/news/end-to-coal-power-brought-forward-to-october-2024",
    },
  },
  { id: "hinkley-b", year: 2022, date: "2022", title: "Hinkley Point B closes", fuels: ["nuclear"], source: GENERATORS },
  { id: "kilroot", year: 2023, date: "2023", title: "Kilroot coal station closes (520 MW, Northern Ireland)", fuels: ["coal"], source: GENERATORS },
  { id: "ratcliffe", year: 2024, date: "30 September 2024", title: "Ratcliffe-on-Soar closes — last coal station on the GB grid (2,000 MW)", fuels: ["coal"], source: GENERATORS },
];

export function milestonesFor(fuel: LongFuelId | null): Milestone[] {
  return fuel ? MILESTONES.filter((m) => m.fuels.includes(fuel)) : MILESTONES;
}

/* ——— Readings: editorial entry points. Facts come from the series; milestones are dated context. ——— */

export type Reading = {
  id: string;
  title: string;
  fuel: LongFuelId;
  /** Opens at this year (or the latest). */
  year: (mix: LongYear[]) => number;
  body: (mix: LongYear[]) => string[];
};

const at = (mix: LongYear[], year: number) => mix.find((y) => y.year === year);

export const READINGS: Reading[] = [
  {
    id: "last-coal",
    title: "The last coal station",
    fuel: "coal",
    year: (mix) => [...mix].reverse().find((y) => y.v.coal > 0)?.year ?? mix.at(-1)!.year,
    body: (mix) => {
      const p = peak(mix, (y) => y.v.coal);
      const last = [...mix].reverse().find((y) => y.v.coal > 0);
      const latest = mix.at(-1)!;
      return [
        `Coal generated ${fmtTWh(p.v.coal)} at its peak in ${p.year}, ${fmtPct(value(p, "coal", "share"))} of the total.`,
        last
          ? `It last appears in ${last.year} at ${fmtTWh(last.v.coal)}; the ${latest.year} figure is ${fmtTWh(latest.v.coal)}.`
          : "",
        "The station closures listed below are dated records from the DESNZ generator list and GOV.UK. They mark when plants closed; they do not by themselves explain why coal fell.",
      ].filter(Boolean);
    },
  },
  {
    id: "coal-fall",
    title: "From peak to zero",
    fuel: "coal",
    year: (mix) => peak(mix, (y) => y.v.coal).year,
    body: (mix) => {
      const p = peak(mix, (y) => y.v.coal);
      const half = mix.find((y) => y.year > p.year && y.v.coal <= p.v.coal / 2);
      const tenth = mix.find((y) => y.year > p.year && y.v.coal <= p.v.coal / 10 && y.v.coal > 0);
      const last = [...mix].reverse().find((y) => y.v.coal > 0);
      const zero = mix.find((y) => y.year > (last?.year ?? p.year) && y.v.coal === 0);
      return [
        `Peak output was ${fmtTWh(p.v.coal)} in ${p.year} (${fmtPct(value(p, "coal", "share"))} of generation that year).`,
        half ? `It had fallen to half that level by ${half.year} (${fmtTWh(half.v.coal)}).` : "",
        tenth ? `By ${tenth.year} it was under a tenth of the peak (${fmtTWh(tenth.v.coal)}).` : "",
        last && zero
          ? `The series last shows coal in ${last.year}; ${zero.year} is the first year at ${fmtTWh(0)}.`
          : last
            ? `The series last shows coal in ${last.year} at ${fmtTWh(last.v.coal)}.`
            : "",
        "Closures on the timeline (Longannet, Ferrybridge, Eggborough, Cottam, Aberthaw, Kilroot, Ratcliffe) are dated context from the DESNZ generator list — read the curve for the fall.",
      ].filter(Boolean);
    },
  },
  {
    id: "gas-rose",
    title: "When gas rose",
    fuel: "gas",
    year: (mix) => mix.find((y) => y.v.gas > y.v.coal && y.v.gas > 0)?.year ?? mix.at(-1)!.year,
    body: (mix) => {
      const a = at(mix, LONG_RUN_SOURCE.compareAnchor);
      const over = mix.find((y) => y.v.gas > y.v.coal && y.v.gas > 0);
      const p = peak(mix, (y) => y.v.gas);
      return [
        a
          ? `In ${LONG_RUN_SOURCE.compareAnchor} gas generated ${fmtTWh(a.v.gas)}, ${fmtPct(value(a, "gas", "share"))} of the total.`
          : "",
        over ? `It first generated more than coal in ${over.year}.` : "",
        `Its largest year was ${p.year}: ${fmtTWh(p.v.gas)}.`,
        "Privatisation (1989) and the first gas stations in the list are shown as dated context, not as the cause of the rise.",
      ].filter(Boolean);
    },
  },
  {
    id: "renewable",
    title: "What counts as renewable?",
    fuel: "renewables",
    year: (mix) => mix.at(-1)!.year,
    body: (mix) => {
      const l = mix.at(-1)!;
      return [
        `In this long-run table "wind, solar and hydro" is one published group: ${fmtTWh(l.v.renewables)} in ${l.year}, ${fmtPct(value(l, "renewables", "share"))} of generation.`,
        `Bioenergy is not in that group. DESNZ counts it under other fuels (${fmtTWh(l.v.other)} in ${l.year}), alongside non-renewable waste and coke oven gas.`,
        `From ${LONG_RUN_SOURCE.et51Start} Energy Trends (ET 5.1) splits onshore wind, offshore wind, solar, hydro and bioenergy; that split is shown beside the stream for the chosen year.`,
      ];
    },
  },
  {
    id: "nuclear",
    title: "Where nuclear fits",
    fuel: "nuclear",
    year: (mix) => peak(mix, (y) => value(y, "nuclear", "share")).year,
    body: (mix) => {
      const p = peak(mix, (y) => value(y, "nuclear", "share"));
      const pa = peak(mix, (y) => y.v.nuclear);
      const l = mix.at(-1)!;
      return [
        `Nuclear's largest share was ${fmtPct(value(p, "nuclear", "share"))} in ${p.year}; its largest output ${fmtTWh(pa.v.nuclear)} in ${pa.year}.`,
        `In ${l.year} it generated ${fmtTWh(l.v.nuclear)}, ${fmtPct(value(l, "nuclear", "share"))} of the total.`,
        "Switch to Share to see how a steady output can be a rising or falling part of a changing total.",
      ];
    },
  },
];

/* ——— Compare presets ——— */

export type CompareQuestion = { id: string; label: string; from: (mix: LongYear[]) => number; to: (mix: LongYear[]) => number };

export const COMPARE_QUESTIONS: CompareQuestion[] = [
  {
    id: "replaced-coal",
    label: "What replaced coal?",
    from: (mix) => (at(mix, LONG_RUN_SOURCE.compareAnchor) ? LONG_RUN_SOURCE.compareAnchor : mix[0]!.year),
    to: (mix) => mix.at(-1)!.year,
  },
  { id: "total", label: "How did total generation change?", from: (mix) => peak(mix, (y) => y.total).year, to: (mix) => mix.at(-1)!.year },
];

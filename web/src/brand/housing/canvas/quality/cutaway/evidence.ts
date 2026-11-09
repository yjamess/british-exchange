/**
 * Inside the home — the survey evidence behind the cutaway, as one compact table.
 * Every cell is one published EHS figure: indicator × series × tenure × breakdown × area × period,
 * with its status (final / suppressed / not collected), published sample and caveat flags.
 * Shared by the server loader (evidence.server.ts) and the client (InsideHomes).
 */

export type Status = "final" | "provisional" | "suppressed" | "missing";
export type Breakdown = "none" | "dwelling-age" | "dwelling-type" | "floor-area" | "region" | "sub-national-area";

export type EvidenceSource = {
  id: string;
  title: string;
  publisher: string;
  sourceUrl: string;
  release: string;
  unit: string;
};

/** Wire format: dictionaries + integer tuples (keeps ~17k cells small). */
export type EvidencePayload = {
  dict: {
    ind: string[];
    series: string[];
    tenure: string[];
    bk: string[];
    cat: string[];
    area: string[];
    areaLabel: string[];
    label: string[];
    flags: string[];
    grouping: string[];
  };
  /** [ind, series, tenure, bk, cat, area, t*100, v|null, status, n, label, flags, grouping] */
  cells: (number | null)[][];
  sources: Record<string, EvidenceSource>;
};

export type Cell = {
  ind: string;
  series: string;
  tenure: string;
  bk: Breakdown;
  cat: string;
  area: string;
  areaLabel: string;
  t: number;
  year: number;
  v: number | null;
  status: Status;
  n: number | null;
  label: string;
  flags: string[];
  grouping: string;
};

export const STATUS: Status[] = ["final", "provisional", "suppressed", "missing"];

export function decode(p: EvidencePayload): Cell[] {
  const d = p.dict;
  return p.cells.map((c) => {
    const t = (c[6] as number) / 100;
    const fl = d.flags[c[11] as number] ?? "";
    return {
      ind: d.ind[c[0] as number]!,
      series: d.series[c[1] as number]!,
      tenure: d.tenure[c[2] as number]!,
      bk: d.bk[c[3] as number]! as Breakdown,
      cat: d.cat[c[4] as number]!,
      area: d.area[c[5] as number]!,
      areaLabel: d.areaLabel[c[5] as number]!,
      t,
      year: Math.floor(t + 1e-6),
      v: c[7] as number | null,
      status: STATUS[c[8] as number] ?? "final",
      n: (c[9] as number) || null,
      label: d.label[c[10] as number] ?? "",
      flags: fl ? fl.split("|") : [],
      grouping: d.grouping[c[12] as number] ?? "",
    };
  });
}

/* ——— Selection over the table ——— */

export const ENGLAND = "E92000001";
export type Selection = {
  /** "" = all dwellings, else "dwelling-age:pre-1919" etc. Mutually exclusive with a sub-England area. */
  archetype: string;
  area: string;
  tenure: string;
  year: number | null;
};

/** Cells for one indicator/series at the chosen archetype or area (any tenure, any year). */
export function slice(cells: Cell[], ind: string, series: string, sel: Pick<Selection, "archetype" | "area">): Cell[] {
  const [bk, cat] = sel.archetype ? (sel.archetype.split(":") as [Breakdown, string]) : ["none" as Breakdown, ""];
  return cells.filter((c) => {
    if (c.ind !== ind || c.series !== series) return false;
    if (sel.archetype) return c.bk === bk && c.cat === cat && c.area === ENGLAND;
    if (sel.area === ENGLAND) return c.bk === "none" && c.area === ENGLAND;
    return (c.bk === "region" || c.bk === "sub-national-area") && c.area === sel.area;
  });
}

export const ARCHETYPE_KINDS: Breakdown[] = ["dwelling-age", "dwelling-type", "floor-area"];

export function archetypesOf(cells: Cell[], ind: string, series: string): { value: string; label: string; kind: Breakdown; grouping: string }[] {
  const seen = new Map<string, { value: string; label: string; kind: Breakdown; grouping: string }>();
  for (const c of cells) {
    if (c.ind !== ind || c.series !== series || !ARCHETYPE_KINDS.includes(c.bk) || !c.cat) continue;
    const value = `${c.bk}:${c.cat}`;
    if (!seen.has(value)) seen.set(value, { value, label: prettyCat(c.bk, c.cat), kind: c.bk, grouping: c.grouping });
  }
  const order = (x: { kind: Breakdown }) => ARCHETYPE_KINDS.indexOf(x.kind);
  return [...seen.values()].sort((a, b) => order(a) - order(b));
}

export function areasOf(cells: Cell[], ind: string, series: string): { value: string; label: string; kind: Breakdown }[] {
  const seen = new Map<string, { value: string; label: string; kind: Breakdown }>();
  for (const c of cells) {
    if (c.ind !== ind || c.series !== series) continue;
    if (c.bk !== "region" && c.bk !== "sub-national-area") continue;
    if (!seen.has(c.area)) seen.set(c.area, { value: c.area, label: c.areaLabel, kind: c.bk });
  }
  return [...seen.values()].sort((a, b) => (a.kind === b.kind ? a.label.localeCompare(b.label) : a.kind === "region" ? -1 : 1));
}

export function prettyCat(bk: Breakdown, cat: string): string {
  let s = cat
    .replace(/m2/g, "m²")
    .replace(/(\d)-(\d)/g, "$1–$2")
    .replace(/-plus$/, " or more")
    .replace(/^under-/, "under ")
    .replace(/-/g, " ");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  const kind = bk === "dwelling-age" ? "Built" : bk === "dwelling-type" ? "Type" : bk === "floor-area" ? "Floor area" : "";
  return kind ? `${kind} · ${s}` : s;
}

/** Plain-language caveats for a cell's flags. */
export function caveatsOf(c: Cell | undefined): string[] {
  if (!c) return [];
  const out: string[] = [];
  for (const f of c.flags) {
    const [k, v] = f.split("=");
    if (k === "covid-modelled") out.push("2020–21: occupied dwellings only, modelled differently during COVID-19.");
    else if (k === "hybrid-sample") out.push("2022: hybrid sample (external-only 2021-22 plus full 2022-23 surveys).");
    else if (k === "floor-area-modelled") out.push("Floor area modelled for 2020–22 (internal survey not collected).");
    else if (k === "sap-version") out.push(`Energy rating method ${v?.toUpperCase()} — a method break at 2012.`);
    else if (k === "method") out.push("Excess cold uses new U-values from 2018; not like-for-like with earlier years.");
    else if (k === "base" && v && v !== "dwellings") out.push(`Base: ${v.replace(/-/g, " ")}.`);
  }
  if (c.status === "suppressed") out.push("Suppressed: fewer than five surveyed dwellings in this cell.");
  if (c.status === "missing") out.push("Not collected for this period (COVID-19).");
  return out;
}

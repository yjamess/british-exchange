/**
 * Wire format for sector payloads: observation rows packed by column.
 *
 * A raw API observation is ~440 bytes of JSON and most of it repeats on every row
 * (indicator id, release, unit, geography label, source version, six dimension keys of
 * which one varies). An Energy or Economy domain carries thousands of them, so the page
 * HTML and every rail hop shipped 3–6 MB. `packTree` walks a payload and rewrites each
 * large array of flat, same-shaped objects as columns: constant fields once, varying
 * fields as one array per row. `unpackTree` restores exactly the original objects, so
 * canvases and models are untouched. One nested level of plain objects (`dimensions`)
 * is flattened into dotted keys so its constant members pack too.
 *
 * Both halves are pure and side-effect free; numbers, strings, booleans and null pass
 * through JSON unchanged.
 */

const TAG = "\u0000cols";
const MIN_ROWS = 16;

type Prim = string | number | boolean | null;
/** `keys` is every flattened key in original order; a key is in `consts` or has a column in `rows`. */
type Packed = { [TAG]: string[]; consts: Record<string, Prim>; rows: Prim[][] };

/** Opaque: the same shape as T on the other side of `unpackTree`. */
export type Wire<T> = { readonly __wire: T };

const isPlain = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const isPrim = (v: unknown): v is Prim =>
  v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";

/** Flatten one level: `{a: 1, d: {x: 2}}` → `[["a", 1], ["d.x", 2]]`; null if not flat. */
function flatten(row: unknown): [string, Prim][] | null {
  if (!isPlain(row)) return null;
  const out: [string, Prim][] = [];
  for (const [k, v] of Object.entries(row)) {
    if (k.includes(".") || v === undefined) return null;
    if (isPrim(v)) out.push([k, v]);
    else if (isPlain(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        if (k2.includes(".") || !isPrim(v2)) return null;
        out.push([`${k}.${k2}`, v2]);
      }
    } else return null;
  }
  return out;
}

function packArray(arr: unknown[]): Packed | null {
  if (arr.length < MIN_ROWS) return null;
  const first = flatten(arr[0]);
  if (!first) return null;
  const keys = first.map(([k]) => k);
  const sig = keys.join("\u0001");
  const table: Prim[][] = [];
  for (const row of arr) {
    const flat = flatten(row);
    if (!flat || flat.map(([k]) => k).join("\u0001") !== sig) return null;
    table.push(flat.map(([, v]) => v));
  }
  const consts: Record<string, Prim> = {};
  const varying: number[] = [];
  keys.forEach((k, i) => {
    const v0 = table[0]![i];
    if (table.every((r) => r[i] === v0)) consts[k] = v0 as Prim;
    else varying.push(i);
  });
  return { [TAG]: keys, consts, rows: table.map((r) => varying.map((i) => r[i]!)) };
}

function unpackArray(p: Packed): Record<string, unknown>[] {
  // Rebuild in original key order: a key is either a constant or the next column.
  return p.rows.map((r) => {
    const flat: Record<string, Prim> = {};
    let col = 0;
    for (const k of p[TAG]) flat[k] = k in p.consts ? p.consts[k]! : r[col++]!;
    const out: Record<string, unknown> = {};
    for (const k of p[TAG]) {
      const dot = k.indexOf(".");
      if (dot < 0) out[k] = flat[k];
      else {
        const [a, b] = [k.slice(0, dot), k.slice(dot + 1)];
        ((out[a] ??= {}) as Record<string, Prim>)[b] = flat[k]!;
      }
    }
    return out;
  });
}

function walkPack(v: unknown): unknown {
  if (Array.isArray(v)) return packArray(v) ?? v.map(walkPack);
  if (isPlain(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = walkPack(x);
    return out;
  }
  return v;
}

function walkUnpack(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(walkUnpack);
  if (isPlain(v)) {
    if (TAG in v) return unpackArray(v as Packed);
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = walkUnpack(x);
    return out;
  }
  return v;
}

export function packTree<T>(data: T): Wire<T> {
  return walkPack(data) as unknown as Wire<T>;
}

export function unpackTree<T>(wire: Wire<T>): T {
  return walkUnpack(wire) as T;
}

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const input = await readFile(new URL("../src/brand/housing/canvas/renting/selection.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(input, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const stub = `export const fmt = { gbp: (v) => String(v), gbpCompact: (v) => String(v), pctSigned: (v) => String(v), count: (v) => String(v) };
export const fmtT = (t) => String(Math.floor(t));
export const toT = (iso) => Number(String(iso).slice(0, 4));
`;
const stubUrl = `data:text/javascript;base64,${Buffer.from(stub).toString("base64")}`;
const rewritten = outputText.replace(/from "\.\.\/\.\.\/\.\.\/data"/, `from "${stubUrl}"`);
const selection = await import(`data:text/javascript;base64,${Buffer.from(rewritten).toString("base64")}`);

test("an inherited period that misses the series is dropped, and the points stay", () => {
  const series = [{ points: [{ t: 2024, v: 1 }, { t: 2025.5, v: 2 }] }];
  const bounds = { min: 2024, max: 2025 };
  const applied = selection.applyWindow(series, bounds, 1990, 2001);
  assert.equal(applied.invalid, true);
  assert.equal(applied.from, 2024);
  assert.equal(applied.to, 2025);
  assert.equal(applied.series[0].points.length, 2);
});

test("a period that overlaps is clipped, including when the years are reversed", () => {
  const series = [{ points: [{ t: 2016, v: 1 }, { t: 2020, v: 2 }, { t: 2024, v: 3 }] }];
  const bounds = { min: 2016, max: 2024 };
  const applied = selection.applyWindow(series, bounds, 2024, 2019);
  assert.equal(applied.invalid, false);
  assert.equal(applied.from, 2019);
  assert.equal(applied.to, 2024);
  assert.deepEqual(applied.series[0].points.map((point) => point.v), [2, 3]);
});

test("the index baseline is read from the series unit", () => {
  const unit = "GBP per calendar month (average-rent); percent; index Jan 2023=100";
  assert.equal(selection.indexBaseline(unit), "January 2023 = 100");
  assert.equal(selection.indexBaseline("GBP"), null);
});

test("annual change and the index are not published by bedroom", () => {
  assert.equal(selection.isPublished("annual-change", "bedrooms-2"), false);
  assert.equal(selection.isPublished("index", "type-flat-maisonette"), false);
  assert.equal(selection.isPublished("average-rent", "bedrooms-2"), true);
});

test("the table follows Property: all homes, one type, or bedroom sizes", () => {
  const columns = [
    { id: "all|average-rent", category: "all", measure: "average-rent", label: "All homes", points: [] },
    { id: "all|index", category: "all", measure: "index", label: "Index", points: [] },
    { id: "bedrooms-1|average-rent", category: "bedrooms-1", measure: "average-rent", label: "1 bedroom", points: [] },
    { id: "type-flat-maisonette|average-rent", category: "type-flat-maisonette", measure: "average-rent", label: "Flat maisonette", points: [] },
  ];
  const allHomes = selection.tableColumns(columns, "index", "all");
  assert.equal(allHomes[0].measure, "index");
  assert.deepEqual(allHomes.map((col) => col.category), ["all", "all"]);
  const flat = selection.tableColumns(columns, "average-rent", "type-flat-maisonette");
  assert.deepEqual(flat.map((col) => col.id), ["type-flat-maisonette|average-rent"]);
  const beds = selection.tableColumns(columns, "bedrooms", "all");
  assert.deepEqual(beds.map((col) => col.category), ["bedrooms-1"]);
});

test("a bedroom property on Data keeps only that bedroom; index chart still refuses the cross-break", () => {
  const columns = [
    { id: "all|index", category: "all", measure: "index", label: "Index", points: [] },
    { id: "bedrooms-2|average-rent", category: "bedrooms-2", measure: "average-rent", label: "2 bedrooms", points: [] },
    { id: "all|average-rent", category: "all", measure: "average-rent", label: "All homes", points: [] },
  ];
  const table = selection.tableColumns(columns, "average-rent", "bedrooms-2");
  assert.deepEqual(table.map((col) => col.id), ["bedrooms-2|average-rent"]);
  const chart = selection.chartColumns(columns, "index", "index", "bedrooms-2");
  assert.equal(chart.columns.length, 0);
  assert.match(chart.emptyReason, /all homes/);
});

test("several places draw one rent line each, and one place still lists bedrooms", () => {
  const column = (id, category, measure, label) => ({ id, category, measure, label, points: [{ t: 2024, v: 1 }] });
  const london = {
    code: "E12000007",
    name: "London",
    columns: [column("all|average-rent", "all", "average-rent", "All homes")],
  };
  const southEast = {
    code: "E12000008",
    name: "South East",
    columns: [column("all|average-rent", "all", "average-rent", "All homes")],
  };
  const compared = selection.chartForPlaces([london, southEast], "monthly", "average-rent", "all");
  assert.deepEqual(compared.columns.map((col) => col.label), ["London", "South East"]);
  const beds = selection.chartForPlaces(
    [{
      code: "K02000001",
      name: "United Kingdom",
      columns: [
        column("bedrooms-1|average-rent", "bedrooms-1", "average-rent", "1 bedroom"),
        column("bedrooms-2|average-rent", "bedrooms-2", "average-rent", "2 bedrooms"),
      ],
    }],
    "bedrooms",
    "bedrooms",
    "all",
  );
  assert.equal(beds.columns.length, 2);
});

test("a rent place list keeps one code and caps a long list", () => {
  assert.deepEqual(selection.parseRentAreas(null), ["K02000001"]);
  assert.deepEqual(selection.parseRentAreas("E12000007"), ["E12000007"]);
  assert.equal(selection.parseRentAreas("a,b,c,d,e,f,g").length, 6);
  assert.equal(selection.rentAreasParam(["K02000001"]), null);
  assert.equal(selection.rentAreasParam(["E12000007", "E12000008"]), "E12000007,E12000008");
});

test("a compared place names its own table column", () => {
  const shared = { category: "all", measure: "average-rent", points: [] };
  assert.equal(selection.columnHeader({ ...shared, id: "all|average-rent", label: "All homes" }, null), "All homes · £");
  assert.equal(selection.columnHeader({ ...shared, id: "E12000007|all|average-rent", label: "London" }, null), "London · £");
});

test("bedroom labels come from the category id", () => {
  assert.equal(selection.categoryLabel("bedrooms-1"), "1 bedroom");
  assert.equal(selection.categoryLabel("bedrooms-4-plus"), "4+ bedrooms");
  assert.equal(selection.categoryLabel("type-flat-maisonette"), "Flat maisonette");
});

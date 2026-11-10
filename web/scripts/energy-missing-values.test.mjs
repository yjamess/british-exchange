import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function compile(file) {
  const input = await readFile(new URL(`../src/brand/energy/${file}.ts`, import.meta.url), "utf8");
  return ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
}
const url = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const dependency = url(await compile("consumption-model"));
const model = (await compile("appetite-model")).replace('"./consumption-model"', JSON.stringify(dependency));
const { appetiteData, measured } = await import(url(model));
const row = (year, sector, fuel, value) => ({ period_start: `${year}-01-01`, value, notes: `sector=${sector}; fuel=${fuel}` });

test("missing sector values remain gaps while a published zero remains zero", () => {
  const data = appetiteData([
    row(2020, "all-final", "Total", 100), row(2021, "all-final", "Total", 110),
    row(2020, "industry", "Total", 0),
  ], "sector", "all-final");
  const industry = data.series.find((s) => s.id === "industry");
  assert.equal(measured(data, industry, 0, "absolute", 0), 0);
  assert.ok(Number.isNaN(measured(data, industry, 1, "absolute", 0)));
  assert.ok(Number.isNaN(measured(data, industry, 1, "share", 0)));
});

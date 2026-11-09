/**
 * Portable station selection — identity outside Atlas UI state.
 * Run: npm run test:station
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const srcPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/brand/energy/station-model.ts",
);
const input = await readFile(srcPath, "utf8");
const rewritten = input
  .replace(/from ["']\.\/packs["']/g, 'from "data:text/javascript,export {}"')
  .replace(/from ["']\.\/generation-model["']/g, 'from "data:text/javascript,export {}"')
  .replace(/from ["']\.\/fuels["']/g, 'from "data:text/javascript,export {}"');
const { outputText } = ts.transpileModule(rewritten, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const mod = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const points = [
  {
    id: "R1",
    name: "Dogger Bank A",
    mw: 1200,
    family: "renewable",
    technology: "Wind Offshore",
    primaryFuel: "Wind Offshore",
    region: "Offshore",
    country: "England",
    operator: "SSE",
    operationalDate: "2023-10-01",
    lon: 1.5,
    lat: 54.8,
  },
  {
    id: "D9",
    name: "Drax",
    mw: 1980,
    family: "fossil",
    technology: "Coal",
    primaryFuel: "Coal",
    region: "Yorkshire and the Humber",
    country: "England",
    operator: "Drax",
    yearCommissioned: 1974,
    lon: -1.0,
    lat: 53.7,
  },
];

const mix = [
  {
    year: 2024,
    total: 100,
    provisional: false,
    partial: false,
    byFuel: { coal: 2, gas: 30, "offshore-wind": 40, "onshore-wind": 10, solar: 5, hydro: 2, nuclear: 11 },
  },
];

test("station keys always carry the register namespace", () => {
  assert.equal(mod.stationKey(points[0]), "repd:R1");
  assert.equal(mod.stationKey(points[1]), "dukes:D9");
  assert.deepEqual(mod.parseStationKey("repd:R1"), { register: "repd", id: "R1" });
  assert.deepEqual(mod.parseStationKey("dukes:D9"), { register: "dukes", id: "D9" });
  assert.equal(mod.parseStationKey("R1"), null);
  assert.equal(mod.parseStationKey("repd:"), null);
});

test("resolveStationSelection exposes identity, technology, dates and geography honesty", () => {
  const sel = mod.resolveStationSelection(points, "dukes:D9", mix);
  assert.equal(sel.key, "dukes:D9");
  assert.equal(sel.ref.register, "dukes");
  assert.equal(sel.technology, "Coal");
  assert.equal(sel.opened, "1974");
  assert.equal(sel.geography.regionLabel, "Yorkshire and Humber");
  assert.equal(sel.geography.geographyCode, null);
  assert.equal(sel.geography.geometryId, null);
  assert.ok(sel.nationalGeneration);
  assert.equal(sel.nationalGeneration.fuel, "coal");
  assert.match(sel.nationalGeneration.href, /domain=generation/);
  assert.match(sel.nationalGeneration.href, /fuel=coal/);
});

test("REPD offshore selection carries operational date and national wind connection", () => {
  const sel = mod.resolveStationSelection(points, "repd:R1", mix);
  assert.equal(sel.opened, "2023");
  assert.equal(sel.nationalGeneration.fuel, "offshore-wind");
  assert.equal(sel.geography.lon, 1.5);
});

test("unknown or bare ids do not invent a selection", () => {
  assert.equal(mod.resolveStationSelection(points, "repd:missing"), null);
  assert.equal(mod.resolveStationSelection(points, "D9"), null);
});

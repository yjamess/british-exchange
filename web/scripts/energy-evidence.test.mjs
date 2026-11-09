/**
 * Structural audit: every Energy Ready view declares equivalent evidence fields.
 *
 * Visual consistency alone cannot guarantee definition, geography, period and
 * method appear. This test checks the declarative contracts in
 * `web/src/brand/energy/views/*` — the modules canvases should import.
 *
 * Run: npm run test:evidence
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/brand/energy/views");

/** Transpile a TS module and its local relative imports into runnable ESM. */
async function loadViewsIndex() {
  const files = (await readdir(root)).filter((f) => f.endsWith(".ts"));
  const compiled = new Map();
  for (const file of files) {
    const input = await readFile(path.join(root, file), "utf8");
    // citations.ts lives one level up — stub ENERGY_SOURCE so evidence strings stay non-empty.
    const rewritten = input.replace(
      /from ["']\.\.\/citations["']/g,
      'from "data:text/javascript,export const ENERGY_SOURCE=new Proxy({},{get:(_,k)=>`DESNZ · ${String(k)}`})"',
    ).replace(
      /from ["']\.\.\/domain-sources["']/g,
      'from "data:text/javascript,export const ENERGY_DOMAINS=[]"',
    );
    const { outputText } = ts.transpileModule(rewritten, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: file,
    });
    compiled.set(file, outputText);
  }

  // Resolve relative ./foo imports between compiled view modules via data URLs.
  const dataUrls = new Map();
  const order = ["types.ts", ...files.filter((f) => f !== "types.ts" && f !== "index.ts"), "index.ts"];
  for (const file of order) {
    let code = compiled.get(file);
    code = code.replace(/from ["']\.\/([^"']+)["']/g, (_, spec) => {
      const name = spec.endsWith(".ts") ? spec : `${spec}.ts`;
      const url = dataUrls.get(name);
      if (!url) throw new Error(`${file} imports ./` + spec + " before it was compiled to a data URL");
      return `from "${url}"`;
    });
    const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
    dataUrls.set(file, url);
  }
  return import(dataUrls.get("index.ts"));
}

const views = await loadViewsIndex();

test("every Energy domain has a view module with ready|preparation status", () => {
  const domains = Object.keys(views.ENERGY_DOMAIN_VIEWS);
  assert.deepEqual(
    domains.sort(),
    [
      "consumption",
      "fossil",
      "generation",
      "imports",
      "industrial-work",
      "low-carbon",
      "manufacturing",
      "networks",
      "policy",
      "prices",
    ].sort(),
  );
  for (const id of domains) {
    const status = views.domainUiStatus(id);
    assert.ok(status === "ready" || status === "preparation", `${id} status`);
  }
});

test("every Ready view declares source, definition, method, geography, period, dataHref", () => {
  const rows = views.auditEvidence();
  const failed = rows.filter((r) => !r.ok);
  assert.equal(
    failed.length,
    0,
    failed.map((r) => `${r.domain}/${r.view}: missing ${r.missing.join(", ")}`).join("\n"),
  );
  assert.ok(rows.length >= 30, `expected a full Energy inventory, got ${rows.length} views`);
});

test("stageAvailability distinguishes unfinished domains from failed loads", () => {
  assert.equal(views.stageAvailability("preparation", false), "preparation");
  assert.equal(views.stageAvailability("preparation", true), "preparation");
  assert.equal(views.stageAvailability("ready", false), "unavailable");
  assert.equal(views.stageAvailability("ready", true), "ok");
  assert.equal(views.STAGE_EMPTY.unavailable.label, "Series unavailable");
  assert.equal(views.STAGE_EMPTY.preparation.label, "In preparation");
  assert.notEqual(views.STAGE_EMPTY.unavailable.hint, views.STAGE_EMPTY.preparation.hint);
});

test("allowedParams keeps domain navigation keys scoped per domain", () => {
  const gen = views.allowedParams("generation");
  assert.ok(gen.has("domain") && gen.has("view") && gen.has("atlas"));
  assert.equal(gen.has("bill_fuel"), false);
  assert.equal(gen.has("event"), false);

  const prices = views.allowedParams("prices");
  assert.ok(prices.has("bill_fuel"));
  assert.equal(prices.has("atlas"), false);

  const policy = views.allowedParams("policy");
  assert.ok(policy.has("event"));
  assert.equal(policy.has("fuel"), false);
});

test("canvases import view lists from modules (no parallel VIEWS literals)", async () => {
  const canvasDir = path.join(root, "..");
  const canvases = [
    ["GenerationCanvas.tsx", "GENERATION_VIEWS"],
    ["ConsumptionCanvas.tsx", "CONSUMPTION_VIEWS"],
    ["PricesCanvas.tsx", "PRICES_VIEWS"],
    ["FossilsCanvas.tsx", "FOSSIL_VIEWS"],
    ["ImportsCanvas.tsx", "IMPORTS_VIEWS"],
    ["RenewablesCanvas.tsx", "LOW_CARBON_VIEWS"],
    ["NetworksCanvas.tsx", "NETWORKS_VIEWS"],
    ["ManufacturingCanvas.tsx", "MANUFACTURING_VIEWS"],
    ["JobsCanvas.tsx", "INDUSTRIAL_WORK_VIEWS"],
  ];
  for (const [file, symbol] of canvases) {
    const src = await readFile(path.join(canvasDir, file), "utf8");
    assert.match(src, new RegExp(`import \\{[^}]*${symbol}`), `${file} should import ${symbol}`);
    assert.equal(
      /const VIEWS: ExplorerView\[\] = \[\s*\{ id:/.test(src),
      false,
      `${file} still declares an inline VIEWS literal — use the domain module`,
    );
  }
});

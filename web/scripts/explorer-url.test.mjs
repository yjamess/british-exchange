/**
 * Shared explorer URL contract — domain hop, control patch, fallbacks, portability.
 * Run: npm run test:url
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const srcPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/brand/navigation/explorer-url.ts",
);
const input = await readFile(srcPath, "utf8");
const { outputText } = ts.transpileModule(input, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const mod = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const generation = {
  domain: "generation",
  defaultView: "current",
  portableParams: ["year"],
  views: [
    { id: "current", params: ["measure", "year", "fuel", "from", "to"] },
    { id: "atlas", params: ["atlas", "family", "region", "station", "technology", "q", "fuel"] },
    { id: "year", params: ["year", "fuel", "measure"] },
  ],
};

const prices = {
  domain: "prices",
  defaultView: "bill",
  portableParams: ["year"],
  views: [
    { id: "bill", params: ["year", "payment", "tariff", "band", "bill_fuel"] },
    { id: "regions", params: ["year", "bill_fuel", "region"] },
  ],
};

const policy = {
  domain: "policy",
  defaultView: "ledger",
  portableParams: ["year"],
  views: [{ id: "ledger", params: ["event"] }],
};

test("shared link with unsupported view falls back to defaultView", () => {
  const r = mod.resolveExplorerUrl("domain=generation&view=nope&year=2020&bill_fuel=gas", generation);
  assert.equal(r.view, "current");
  assert.equal(r.params.get("year"), "2020");
  assert.equal(r.params.get("bill_fuel"), null);
  assert.ok(r.fallbacks.some((f) => f.key === "view" && f.reason.includes("unsupported")));
  assert.ok(r.fallbacks.some((f) => f.key === "bill_fuel"));
});

test("control patch within a view updates URL and uses replace history", () => {
  const r = mod.patchExplorerUrl("domain=generation&view=current&year=2019", generation, {
    year: 2024,
    measure: "share",
  });
  assert.equal(r.history, "replace");
  assert.equal(r.params.get("year"), "2024");
  assert.equal(r.params.get("measure"), "share");
  assert.equal(r.params.get("domain"), "generation");
});

test("switching view prunes params not declared on the destination view", () => {
  const r = mod.patchExplorerUrl(
    "domain=generation&view=current&year=2020&measure=share&from=1998&to=2020",
    generation,
    { view: "atlas" },
  );
  assert.equal(r.view, "atlas");
  assert.equal(r.params.get("year"), null); // year not on atlas view
  assert.equal(r.params.get("measure"), null);
  assert.equal(r.params.get("from"), null);
  assert.ok(r.fallbacks.some((f) => f.key === "measure"));
});

test("domain switch pushes and keeps only portable year when both sides declare it", () => {
  const r = mod.switchExplorerDomain(
    "domain=generation&view=current&year=2021&fuel=coal&measure=share",
    prices,
    { source: generation },
  );
  assert.equal(r.history, "push");
  assert.equal(r.domain, "prices");
  assert.equal(r.view, "bill");
  assert.equal(r.params.get("year"), "2021");
  assert.equal(r.params.get("fuel"), null);
  assert.equal(r.params.get("measure"), null);
  assert.ok(r.fallbacks.some((f) => f.key === "view"));
});

test("polysemous keys do not survive a domain hop even if both domains use the name", () => {
  // Both have `region`, but it is not portable — meanings differ (stations vs bill regions).
  const r = mod.switchExplorerDomain(
    "domain=generation&view=atlas&region=Scotland&year=2020",
    prices,
    { source: generation },
  );
  assert.equal(r.params.get("region"), null);
  assert.equal(r.params.get("year"), "2020");
  assert.ok(r.fallbacks.some((f) => f.key === "region"));
});

test("connection retain allowlist can keep a non-portable key when destination allows it", () => {
  const r = mod.switchExplorerDomain(
    "domain=prices&view=bill&event=cap-2022&year=2022",
    policy,
    { source: prices, retain: ["event"] },
  );
  assert.equal(r.params.get("event"), "cap-2022");
  assert.equal(r.params.get("year"), null); // policy views do not declare year
});

test("href builder and history mode helpers", () => {
  const r = mod.resolveExplorerUrl("domain=generation", generation);
  assert.equal(r.href("/energy"), "/energy?domain=generation&view=current");
  assert.equal(mod.explorerHistoryMode("generation", "prices"), "push");
  assert.equal(mod.explorerHistoryMode("prices", "prices"), "replace");
});

test("Energy canvases use useEnergyNavigation — no local history.replaceState", async () => {
  const canvasDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/brand/energy");
  const canvases = [
    "GenerationCanvas.tsx",
    "ConsumptionCanvas.tsx",
    "PricesCanvas.tsx",
    "FossilsCanvas.tsx",
    "ImportsCanvas.tsx",
    "RenewablesCanvas.tsx",
    "NetworksCanvas.tsx",
    "ManufacturingCanvas.tsx",
    "JobsCanvas.tsx",
    "PolicyCanvas.tsx",
    "EnergyCanvas.tsx",
  ];
  for (const file of canvases) {
    const src = await readFile(path.join(canvasDir, file), "utf8");
    assert.equal(
      src.includes("history.replaceState"),
      false,
      `${file} still calls history.replaceState — use useEnergyNavigation`,
    );
    if (file !== "EnergyCanvas.tsx") {
      assert.match(src, /useEnergyNavigation/, `${file} should call useEnergyNavigation`);
    }
  }
});

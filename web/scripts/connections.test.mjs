/**
 * Connections contract — retain ⊆ dest params; deferred edges have no href.
 * Run: npm run test:connections
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const brandRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/brand");
const connectionsRoot = path.join(brandRoot, "connections");
const viewsRoot = path.join(brandRoot, "energy/views");

async function transpile(filePath, fileName, rewrite = (s) => s) {
  const input = rewrite(await readFile(filePath, "utf8"));
  const { outputText } = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName,
  });
  return outputText;
}

/** Load pure connection modules (no React FollowLink). */
async function loadConnections() {
  const typesCode = await transpile(path.join(connectionsRoot, "types.ts"), "types.ts");
  const typesUrl = `data:text/javascript;base64,${Buffer.from(typesCode).toString("base64")}`;

  let resolveCode = await transpile(path.join(connectionsRoot, "resolve.ts"), "resolve.ts");
  resolveCode = resolveCode.replace(/from ["']\.\/types["']/g, `from "${typesUrl}"`);
  const resolveUrl = `data:text/javascript;base64,${Buffer.from(resolveCode).toString("base64")}`;

  let energyCode = await transpile(path.join(connectionsRoot, "energy.ts"), "energy.ts");
  energyCode = energyCode
    .replace(/from ["']\.\/types["']/g, `from "${typesUrl}"`)
    .replace(/from ["']\.\/resolve["']/g, `from "${resolveUrl}"`);
  const energyUrl = `data:text/javascript;base64,${Buffer.from(energyCode).toString("base64")}`;

  let housingCode = await transpile(path.join(connectionsRoot, "housing.ts"), "housing.ts");
  housingCode = housingCode
    .replace(/from ["']\.\/types["']/g, `from "${typesUrl}"`)
    .replace(/from ["']\.\/resolve["']/g, `from "${resolveUrl}"`);
  const housingUrl = `data:text/javascript;base64,${Buffer.from(housingCode).toString("base64")}`;

  const resolveMod = await import(resolveUrl);
  const energyMod = await import(energyUrl);
  const housingMod = await import(housingUrl);
  return { ...resolveMod, ...energyMod, ...housingMod };
}

/** Load ENERGY_DOMAIN_VIEWS for param declarations. */
async function loadViews() {
  const files = (await readdir(viewsRoot)).filter((f) => f.endsWith(".ts"));
  const compiled = new Map();
  for (const file of files) {
    const input = await readFile(path.join(viewsRoot, file), "utf8");
    const rewritten = input
      .replace(
        /from ["']\.\.\/citations["']/g,
        'from "data:text/javascript,export const ENERGY_SOURCE=new Proxy({},{get:(_,k)=>`DESNZ · ${String(k)}`})"',
      )
      .replace(
        /from ["']\.\.\/domain-sources["']/g,
        'from "data:text/javascript,export const ENERGY_DOMAINS=[]"',
      );
    const { outputText } = ts.transpileModule(rewritten, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: file,
    });
    compiled.set(file, outputText);
  }
  const dataUrls = new Map();
  const order = ["types.ts", ...files.filter((f) => f !== "types.ts" && f !== "index.ts"), "index.ts"];
  for (const file of order) {
    let code = compiled.get(file);
    code = code.replace(/from ["']\.\/([^"']+)["']/g, (_, spec) => {
      const name = spec.endsWith(".ts") ? spec : `${spec}.ts`;
      const url = dataUrls.get(name);
      if (!url) throw new Error(`${file} imports ./` + spec + " before it was compiled");
      return `from "${url}"`;
    });
    const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
    dataUrls.set(file, url);
  }
  return import(dataUrls.get("index.ts"));
}

const conn = await loadConnections();
const views = await loadViews();

function destAllowedKeys(domainId, viewId) {
  const mod = views.ENERGY_DOMAIN_VIEWS[domainId];
  assert.ok(mod, `unknown destination domain ${domainId}`);
  const view = mod.views.find((v) => v.id === (viewId ?? mod.defaultView));
  assert.ok(view, `unknown view ${viewId} on ${domainId}`);
  return new Set(["domain", "view", ...view.params]);
}

test("every Ready Energy connection retain/mapSelection/params ⊆ destination view params", () => {
  for (const edge of conn.ENERGY_CONNECTIONS) {
    if (edge.readiness !== "ready") continue;
    const allowed = destAllowedKeys(edge.to.domain, edge.to.view);
    for (const key of edge.to.retain) {
      assert.ok(
        allowed.has(key),
        `${edge.id}: retain key "${key}" not on ${edge.to.domain}/${edge.to.view ?? "default"}`,
      );
    }
    for (const key of edge.to.mapSelection ?? []) {
      assert.ok(
        allowed.has(key),
        `${edge.id}: mapSelection key "${key}" not on ${edge.to.domain}/${edge.to.view ?? "default"}`,
      );
    }
    for (const key of Object.keys(edge.to.params ?? {})) {
      assert.ok(
        allowed.has(key),
        `${edge.id}: params key "${key}" not on ${edge.to.domain}/${edge.to.view ?? "default"}`,
      );
    }
  }
});

test("deferred edges never produce a live href", () => {
  const deferred = {
    id: "test.deferred",
    kind: "contextual",
    from: { sector: "energy", domain: "generation" },
    to: {
      pathname: "/energy",
      domain: "fossil",
      retain: ["year"],
    },
    label: "Deferred hop",
    why: "Not ready",
    learn: "Wait for cloud",
    readiness: "deferred",
    destinationLabel: "Fossil fuels",
  };
  assert.equal(conn.resolveConnectionHref(deferred, { year: 2024 }), null);
});

test("Ready followFuel gas hop retains year and targets fossil", () => {
  const hit = conn.followFuelConnection("gas", { year: 2020 });
  assert.ok(hit);
  assert.ok(hit.href);
  assert.equal(hit.connection.kind, "contextual");
  assert.match(hit.href, /domain=fossil/);
  assert.match(hit.href, /fuel=gas/);
  assert.match(hit.href, /year=2020/);
});

test("followFuel unknown specialty falls back to generation data", () => {
  const hit = conn.followFuelConnection("hydro");
  assert.ok(hit);
  assert.ok(hit.href);
  assert.equal(hit.connection.id, "gen.fuel→gen.data");
  assert.match(hit.href, /view=data/);
  assert.match(hit.href, /fuel=hydro/);
});

test("station national generation href is Ready and honest destination", () => {
  const href = conn.stationNationalGenerationHref("offshore-wind", 2024);
  assert.ok(href);
  assert.match(href, /domain=generation/);
  assert.match(href, /view=data/);
  assert.match(href, /dataset=quarterly/);
  assert.match(href, /fuel=offshore-wind/);
  assert.match(href, /year=2024/);
});

test("imports lifelines primary is fossil gap (not a three-link strip)", () => {
  const primary = conn.primaryEnergyConnection({ domain: "imports", view: "lifelines" }, { year: 2019 });
  assert.ok(primary);
  assert.equal(primary.id, "imports.lifelines→fossil.gap");
  assert.equal(primary.primary, true);
  const href = conn.resolveEnergyConnectionHref(primary, { year: 2019 });
  assert.match(href, /domain=fossil/);
  assert.doesNotMatch(href, /domain=fossils/);
});

test("arrival context encodes from + return on the destination href", () => {
  const gas = conn.energyConnectionById("gen.fuel.gas→fossil");
  assert.ok(gas);
  const arrival = conn.buildArrivalContext({
    label: "Generation · Gas",
    pathname: "/energy",
    searchParams: "domain=generation&view=current&group=gas&year=2020",
  });
  const href = conn.resolveConnectionHref(gas, { fuel: "gas", year: 2020 }, null, arrival);
  assert.ok(href);
  assert.match(href, /via=Generation/);
  assert.match(href, /via_return=/);
  assert.match(decodeURIComponent(href), /domain=generation/);
});

test("every Ready connection declares destinationLabel", () => {
  for (const edge of [...conn.ENERGY_CONNECTIONS, ...conn.HOUSING_CONNECTIONS]) {
    assert.ok(edge.destinationLabel?.trim(), `${edge.id} missing destinationLabel`);
  }
});

test("Consumption metabolism Follow opens Generation history", () => {
  const primary = conn.primaryEnergyConnection(
    { domain: "consumption", view: "metabolism" },
    { year: 2020 },
  );
  assert.ok(primary);
  assert.equal(primary.id, "consumption.metabolism→generation");
  const href = conn.resolveEnergyConnectionHref(primary, { year: 2020 });
  assert.match(href, /domain=generation/);
  assert.match(href, /view=current/);
});

test("Networks night Follow opens Border anatomy", () => {
  const primary = conn.primaryEnergyConnection({ domain: "networks", view: "night" }, { year: 2023 });
  assert.ok(primary);
  assert.equal(primary.id, "networks.night→networks.border");
});

test("Manufacturing anatomy Follow opens Jobs productivity", () => {
  const primary = conn.primaryEnergyConnection(
    { domain: "manufacturing", view: "anatomy" },
    { year: 2022 },
  );
  assert.ok(primary);
  assert.equal(primary.id, "manufacturing.anatomy→jobs.productivity");
});

test("Low-carbon offshore Follow opens Generation atlas", () => {
  const primary = conn.primaryEnergyConnection(
    { domain: "low-carbon", view: "guide" },
    { tech: "offshore-wind", year: 2024 },
  );
  assert.ok(primary);
  assert.equal(primary.id, "low-carbon.tech.offshore→gen.atlas");
  const href = conn.resolveEnergyConnectionHref(primary, { tech: "offshore-wind", year: 2024 });
  assert.ok(href);
  assert.match(href, /domain=generation/);
  assert.match(href, /view=atlas/);
  // The map filters by family + technology; a bare `fuel=` would be ignored.
  assert.match(href, /family=renewable/);
  assert.match(href, /technology=Wind\+Offshore/);
  assert.doesNotMatch(href, /fuel=/);
  assert.doesNotMatch(href, /year=/);
});

test("Housing prices primary Follow opens affordability budget", () => {
  const primary = conn.primaryHousingConnection({ domain: "prices", view: "history" });
  assert.ok(primary);
  assert.equal(primary.id, "housing.prices→affordability");
  const href = conn.resolveHousingConnectionHref(primary, {}, "domain=prices&view=history&from=2015&to=2024");
  assert.ok(href);
  assert.match(href, /domain=affordability/);
  assert.match(href, /view=experiment/);
  assert.match(href, /from=2015/);
  assert.match(href, /to=2024/);
});

test("Housing quality energy Follow is cross-sector to Energy bills", () => {
  const primary = conn.primaryHousingConnection({ domain: "quality", view: "energy" });
  assert.ok(primary);
  assert.equal(primary.id, "housing.quality.energy→energy.prices");
  const href = conn.resolveHousingConnectionHref(primary);
  assert.ok(href);
  assert.match(href, /^\/energy\?/);
  assert.match(href, /domain=prices/);
  assert.match(href, /view=bill/);
});

test("Housing quality condition has no energy Follow (view-scoped)", () => {
  const primary = conn.primaryHousingConnection({ domain: "quality", view: "condition" });
  assert.equal(primary, null);
});

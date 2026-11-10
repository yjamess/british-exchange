import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/brand/energy/reset.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { viewReset } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("inactive tab state cannot expose Reset or be changed by it", () => {
  const defaults = { year: 2025, payment: "Overall", event: "default" };
  const current = { year: 2025, payment: "Credit", event: "other" };
  assert.deepEqual(viewReset(current, defaults, ["year"]), {});
  const patch = viewReset(current, defaults, ["event"]);
  assert.deepEqual(patch, { event: "default" });
  assert.deepEqual({ ...current, ...patch }, { year: 2025, payment: "Credit", event: "default" });
});

test("resetting a year uses the active dataset's latest usable year", () => {
  assert.deepEqual(viewReset({ year: 2025 }, { year: 2023 }, ["year"]), { year: 2023 });
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(relative, overrides = {}) {
  const input = readFileSync(new URL(relative, import.meta.url), "utf8");
  const code = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(name => name in overrides ? overrides[name] : require(name), module, module.exports);
  return module.exports;
}
const data = load("../src/brand/data.ts");
const { TimeChart, assignSeriesSlots, SERIES_TONES } = load("../src/brand/instrument/TimeChart.tsx", { "../data": data, "./motion": load("../src/brand/instrument/motion.ts"), "./instrument.module.css": new Proxy({}, { get: (_, key) => String(key) }) });
const render = (series, rest = {}) => renderToStaticMarkup(React.createElement(TimeChart, { series, cadence: "annual", format: String, label: "Test observations", ...rest }));
const line = points => [{ id: "a", label: "A", points }];

test("clean line has no decorative contour paths, even for legacy area callers", () => {
  const html = render(line([{ t: 2020, v: 10 }, { t: 2021, v: 20 }]), { area: true });
  assert.equal((html.match(/<path /g) ?? []).length, 4); // observed, provisional, missing and end leader only
  assert.match(html, /Exact values/);
});
test("missing annual periods do not acquire a solid connecting segment", () => {
  const html = render(line([{ t: 2020, v: 10 }, { t: 2022, v: 20 }]));
  assert.match(html, /<path d="" fill="none" stroke="var\(--bo-ink\)" stroke-width="2"/);
});
test("provisional status survives in the visible annotation and trace", () => {
  const html = render(line([{ t: 2020, v: 10 }, { t: 2021, v: 20, provisional: true }]));
  assert.match(html, /2021 · provisional/);
  assert.match(html, /stroke-dasharray="1.5 3.5"/);
});
test("multiple series stay visible without duplicate selection controls", () => {
  const html = render([...line([{ t: 2020, v: 10 }, { t: 2021, v: 20 }]), { id: "b", label: "B", points: [{ t: 2021, v: 30 }] }]);
  assert.doesNotMatch(html, /Separate panels|All series|Together|Focus a series/);
  assert.match(html, />A</);
  assert.match(html, />B</);
  assert.doesNotMatch(html, /<table|<td/);
});
test("unsorted observations are ordered and nonfinite values never reach SVG geometry", () => {
  const html = render(line([{ t: 2021, v: 20 }, { t: 2020, v: 10 }, { t: 2022, v: NaN }]));
  assert.doesNotMatch(html, /NaN/);
  assert.match(html, /A · 20 · 2021/);
});
test("financial year formatter applies to chart labels and table", () => {
  const html = render(line([{ t: 2024, v: 10 }]), { periodLabel: () => "2024–25" });
  assert.match(html, /2024–25/);
});
test("empty selection renders an honest empty state", () => {
  assert.match(render(line([])), /No observations/);
});


test("colours stay attached when series are removed, reordered and restored", () => {
  const original = assignSeriesSlots(new Map(), ["uk", "north", "wales"]);
  const removed = assignSeriesSlots(original, ["wales", "uk"]);
  const added = assignSeriesSlots(removed, ["uk", "east", "wales"]);
  const restored = assignSeriesSlots(added, ["north", "uk", "east", "wales"]);
  assert.equal(restored.get("north"), original.get("north"));
  assert.equal(restored.get("wales"), original.get("wales"));
  assert.equal(new Set(restored.values()).size, 4);
  assert.equal(SERIES_TONES.length, 5);
});

test("five series have direct end labels instead of a detached legend", () => {
  const html = render(Array.from({ length: 5 }, (_, i) => ({ id: String(i), label: `Place ${i}`, points: [{ t: 2020, v: i + 10 }, { t: 2021, v: i + 20 }] })));
  assert.equal((html.match(/<title>/g) ?? []).length, 5);
  assert.doesNotMatch(html, /<ul/);
});

test("explicit references use Slate and a dashed observed line", () => {
  const html = render([{ id: "target", label: "Target", role: "reference", points: [{ t: 2020, v: 10 }, { t: 2021, v: 10 }] }]);
  assert.match(html, /stroke="var\(--bo-chart-reference\)" stroke-width="2" stroke-dasharray="5 5"/);
  assert.match(html, /Target · 10 · 2021/);
});

test("closed exact-value disclosure omits observation rows from initial rendering", () => {
  const html = render(line(Array.from({ length: 1000 }, (_, i) => ({ t: 1900 + i / 12, v: i }))));
  assert.match(html, /Exact values/);
  assert.doesNotMatch(html, /<table|<td/);
});

test("an explorer with a Data view can omit the nested exact-value disclosure", () => {
  const html = render(line([{ t: 2020, v: 10 }, { t: 2021, v: 20 }]), { showTable: false });
  assert.doesNotMatch(html, /Exact values|<details|<table/);
  assert.match(html, /<svg/);
});

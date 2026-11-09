import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '../src/brand/energy');
let query = new URLSearchParams();
const controls = new Map();
const classes = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
const plot = name => props => React.createElement('div', { 'data-plot': name, 'aria-label': props.label }, props.rows?.map(row => row.label).join(', '));
const chart = { TimeChart: plot('time'), RankBars: plot('rank'), ChangeRows: plot('change') };
const template = {
  explorerClasses: classes,
  Stage: p => React.createElement('section', { 'data-stage': true }, p.title, p.children, p.foot),
  FigureRecord: p => React.createElement('footer', null, p.source, React.createElement('a', { href: p.dataHref }, 'View data')),
  ExplorerHead: p => { controls.set('view', p.onView); return React.createElement('nav', null, p.views.map(v => v.label).join(' · ')); },
  FigureStrip: p => React.createElement('div', { 'data-figures': true }, p.figures.map(f => `${f.label}: ${f.value}`).join(' | ')),
  ControlRow: p => React.createElement('div', { 'data-controls': true }, p.children),
  MenuControl: p => { controls.set(p.label, p.onChange); return React.createElement('span', { 'data-control': p.label }, p.value); },
  ResetButton: () => null,
  EmptyStage: p => React.createElement('p', null, p.label),
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const resolve = name => {
    if (name === 'next/navigation') return { usePathname: () => '/energy', useSearchParams: () => query };
    if (name.endsWith('.css')) return classes;
    if (name.endsWith('/template')) return template;
    if (name.endsWith('/instrument/TimeChart')) return chart;
    if (name.endsWith('/instrument/motion')) return { useReducedMotion: () => true, tween: () => {}, easeInOut: x => x };
    if (name.endsWith('/useWidth')) return { useWidth: () => [{ current: null }, 900] };
    if (name.endsWith('/charts/StationPointMap')) return { StationPointMap: plot('map') };
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(file), name);
      for (const ext of ['.ts', '.tsx']) if (existsSync(base + ext)) return load(base + ext);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', output)(resolve, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const { GenerationCanvas } = load(path.join(root, 'GenerationCanvas.tsx'));
const { LONG_FUELS } = load(path.join(root, 'long-run.ts'));
const mix = [1984, 1990, 2024].map(year => ({ year, total: 80, estimated: year < 1996, v: Object.fromEntries(LONG_FUELS.map(f => [f.id, 10])) }));
const meta = { indicator_id: 'fixture', title: 'Fixture', publisher: 'Test', series_id: 'test', caveats: '' };
const props = { pack: null, longRun: { mix, related: {} }, capacity: { meta, years: [2024], observations: [{ period_start: '2024-01-01', notes: 'fuel=Gas', value: 1000 }] }, yearMix: { meta, year: 2024, observations: [{ period_start: '2024-01-01', notes: 'fuel=Gas', value: 1e6 }] }, atlas: { meta, observations: [], renewablePoints: [{ id: "wind-1", name: "Test wind farm", mw: 100, technology: "Wind Offshore", family: "renewable", lon: 1, lat: 54 }], stations: null, operationalSites: 0 } };
function render(params) { query = new URLSearchParams(params); controls.clear(); return renderToStaticMarkup(React.createElement(GenerationCanvas, props)); }

test('all-fuel history contains one main SVG and no appended fuel page or breakdown', () => {
  const html = render('view=current');
  assert.equal((html.match(/<svg /g) ?? []).length, 1);
  assert.doesNotMatch(html, /Fuel breakdown|Jump to a year|Explore turning points|data-plot=/);
});
test('fuel selection replaces the main chart, retaining selected-year figures', () => {
  const html = render('view=current&group=oil&year=1984');
  assert.equal((html.match(/data-plot="time"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<svg |Fuel breakdown|Jump to a year/);
  assert.match(html, /Oil · 1984/);
  assert.match(html, /Share of generation/);
});
test('compare contains one difference visual, not duplicated ranks and ribbons', () => {
  const html = render('view=compare&compare=1984&year=2024');
  assert.equal((html.match(/data-plot=/g) ?? []).length, 1);
  assert.match(html, /data-plot="change"/);
});
test('monthly contains a single chart; imports are identified separately', () => {
  const html = render('view=year');
  assert.equal((html.match(/data-plot=/g) ?? []).length, 1);
  assert.match(html, /Imports are not electricity generated/);
});
test('map has one map and one external filter row, no ranking tables', () => {
  const html = render('view=atlas');
  assert.equal((html.match(/data-plot=/g) ?? []).length, 1);
  assert.match(html, /data-plot="map"/);
  assert.doesNotMatch(html, /<table/);
  assert.equal((html.match(/data-controls=/g) ?? []).length, 1);
});
test('capacity clamps a historical year to supported capacity coverage', () => {
  const html = render('view=capacity&year=1984');
  assert.match(html, /Installed capacity · 2024/);
  assert.match(html, /data-control="Year">2024/);
});
test('Data preserves historical fuel rather than silently switching publication', () => {
  const html = render('view=data&group=oil&year=1984');
  assert.match(html, /Historical generation · annual observations/);
  assert.match(html, /<th scope="col">Oil/);
  assert.doesNotMatch(html, /<th scope="col">Coal/);
  assert.match(html, /electricity-generation-long-run/);
});
test('URL changes and restored history are reflected without stale local state', () => {
  render('view=current&group=oil&year=1984');
  globalThis.window = { location: { search: '?view=current&group=oil&year=1984' }, history: { replaceState: (_, __, url) => { query = new URLSearchParams(url.split('?')[1]); } } };
  controls.get('view')('data');
  assert.equal(query.get('group'), 'oil');
  assert.equal(query.get('year'), '1984');
  assert.match(renderToStaticMarkup(React.createElement(GenerationCanvas, props)), /Historical generation/);
  assert.match(render('view=current&group=gas&year=1990'), /Natural gas · 1990/);
  delete globalThis.window;
});

test('map station selection replaces the overview in the same panel', () => {
  const html = render('view=atlas&station=repd%3Awind-1');
  assert.match(html, /Test wind farm/);
  assert.match(html, /100 MW/);
  assert.match(html, /No compatible station-output series/);
  assert.doesNotMatch(html, /Largest matching stations/);
  assert.equal((html.match(/data-plot=/g) ?? []).length, 1);
});

test('generation reading describes selected fuel and peak without changing the measure', () => {
  const { historyReading } = load(path.join(root, 'generation-reading.ts'));
  const rows = [
    {year:2000,total:100,v:{...mix[0].v,oil:30}},
    {year:2020,total:200,v:{...mix[0].v,oil:40}},
  ];
  assert.match(historyReading(rows,2020,'oil','absolute'), /40.*2020/);
  assert.match(historyReading(rows,2020,'oil','share'), /highest share.*30.*2000/);
  assert.equal(historyReading(rows,1900,'oil','share'),'');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const input = await readFile(new URL('../src/brand/housing/atlas/model.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const model = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const atlas = JSON.parse(await readFile(new URL('../../data/housing/housing-atlas/curated/atlas.json', import.meta.url), 'utf8'));
const topics = JSON.parse(await readFile(new URL('../../data/housing/housing-atlas/curated/topics.json', import.meta.url), 'utf8'));

test('annual change requires the exact prior-year observation, not the prior non-null row', () => {
  const area = { values: [100, null, ...Array(10).fill(110), 120, 125] };
  assert.ok(Math.abs(model.valueAt(area,12,'change') - 20) < 1e-10);
  assert.equal(model.valueAt(area,13,'change'), null);
  assert.equal(model.valueAt(area,0,'change'), null);
  assert.equal(model.valueAt({values:[0,...Array(11).fill(null),100]},12,'change'),null);
});
test('zero, no observation, and a missing geography remain distinct', () => {
  assert.equal(model.valueAt({values:[0]},0,'price'),0);
  assert.equal(model.valueAt({values:[null]},0,'price'),null);
  assert.equal(model.valueAt(undefined,0,'price'),null);
  assert.equal(model.band(null,model.breaks('average','price')),null);
  assert.equal(model.band(0,model.breaks('average','price')),0);
  assert.equal(model.formatValue(null,'average'),'Unavailable');
});
test('real Manchester price change uses same calendar month and displayed source values', () => {
  const raw=atlas.areas.find(a=>a.code==='E08000003');
  const area={...raw,values:raw.values.average};
  const index=atlas.months.indexOf('2026-08');
  assert.equal(area.values[index],256760);
  assert.ok(Math.abs(model.valueAt(area,index,'change') - 2.1150006761002427)<1e-6);
});
test('lagging sales show missing months rather than price or zero substitutions', () => {
  const raw=atlas.areas.find(a=>a.code==='K02000001');
  const area={...raw,values:raw.values['sales-volume']};
  assert.equal(model.valueAt(area,atlas.months.indexOf('2026-06'),'price'),55159);
  assert.equal(model.valueAt(area,atlas.months.indexOf('2026-08'),'price'),null);
});
test('rolling supply requires consecutive quarters and carries provisional status', () => {
  const last=model.rollingFour(topics.completions).at(-1);
  assert.equal(last.value,143790);
  assert.equal(last.status,'provisional');
  assert.equal(model.rollingFour([{period:'2025-01-01',value:1,status:'final'},{period:'2025-07-01',value:2,status:'final'},{period:'2025-10-01',value:3,status:'final'},{period:'2026-01-01',value:4,status:'final'}]).at(-1).value,null);
});
test('legend thresholds distinguish declines and increases and do not depend on month', () => {
  const thresholds=model.breaks('average','change');
  assert.ok(model.band(-8,thresholds)<model.band(0,thresholds));
  assert.ok(model.band(0,thresholds)<model.band(8,thresholds));
  assert.equal(model.band(200000,model.breaks('average','price')),2);
});

test('compact labels are deterministic across server and browser ICU versions', () => {
  assert.equal(model.formatValue(100000,'average','price',true),'£100k');
  assert.equal(model.formatValue(1200000,'average','price',true),'£1.2m');
  assert.equal(model.formatValue(1500,'sales-volume','price',true),'1.5k');
  assert.equal(model.periodLabel('2026-09'),'Sep 2026');
});

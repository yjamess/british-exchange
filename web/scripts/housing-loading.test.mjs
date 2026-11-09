import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(relative, overrides = {}) {
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name in overrides ? overrides[name] : require(name), module, module.exports);
  return module.exports;
}
const data = load('../src/brand/data.ts');
const domains = load('../src/brand/housing/domain-sources.ts');
const selection = load('../src/brand/housing/canvas/renting/selection.ts', { '../../../data': data });
function harness() {
  const calls = [];
  let fail = false;
  const api = {
    apiBase: () => 'http://unused.invalid',
    fetchIndicator: async id => ({ indicator_id: id, title: id, publisher: 'Test', series_id: id, unit: '', geography: 'UK', frequency: 'annual', source_url: '' }),
    fetchObservations: async (id, params) => {
      calls.push({ id, params });
      if (fail) throw new Error('temporary outage');
      return { observations: [] };
    },
  };
  const loader = load('../src/brand/housing/load.ts', { '@/lib/api': api, '../data': data, './domain-sources': domains, './canvas/renting/selection': selection });
  return { ...loader, calls, fail: () => { fail = true; } };
}
// Price Paid metadata is a separate endpoint, not part of the observation spine.
globalThis.fetch = async () => ({ ok: false });
for (const [domain, allowed] of Object.entries(domains.DOMAIN_SOURCES)) {
  test(`${domain} requests only its declared dependencies and caches successful loads`, async () => {
    const h = harness();
    const [first, concurrent] = await Promise.all([h.loadHousing(domain), h.loadHousing(domain)]);
    assert.equal(first, concurrent);
    assert.deepEqual([...new Set(h.calls.map(c => c.id))].sort(), [...allowed].sort());
    const count = h.calls.length;
    assert.equal(await h.loadHousing(domain), first);
    assert.equal(h.calls.length, count);
  });
}
test('failed domain loads are retried instead of cached as successful', async () => {
  const h = harness(); h.fail();
  await h.loadHousing('prices');
  const count = h.calls.length;
  await h.loadHousing('prices');
  assert.equal(h.calls.length, count * 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const mod = { exports: {} };
new Function('module','exports',ts.transpileModule(readFileSync(new URL('../src/brand/energy/station-model.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);
const { stationGroup, filterStations, generationContext, stationKey, stationPosition, isMapped } = mod.exports;
const wind = { id:'1',name:'Hornsea',family:'renewable',technology:'Wind Offshore',mw:1320,lon:1.54,lat:53.96 };
const battery = { ...wind,id:'2',name:'Battery site',technology:'Battery',mw:50 };
const gas = { ...wind,family:'fossil',name:'Pembroke',primaryFuel:'Natural Gas',mw:2325 };
test('storage is distinct from primary renewable generation', () => {
  assert.equal(stationGroup(battery),'storage');
  assert.equal(stationGroup({...battery,technology:'Pumped Storage Hydroelectricity'}),'storage');
  assert.deepEqual(filterStations([wind,battery], 'renewable','',''), [wind]);
  assert.deepEqual(filterStations([wind,battery], 'storage','',''), [battery]);
});
test('technology and search filters intersect and exclude invalid map values', () => {
  assert.deepEqual(filterStations([wind,gas,{...wind,lat:NaN}], 'all','Wind Offshore','HORN'),[wind]);
  assert.equal(isMapped({...wind,mw:-1}),false);
  assert.equal(isMapped({...wind,lat:64}),false);
});
test('source-prefixed identifiers cannot collide across registers', () => assert.notEqual(stationKey(wind),stationKey(gas)));
test('generation context uses latest complete year and explicit fuel match', () => {
  const rows = [ {year:2026,partial:true,total:10,byFuel:{'offshore-wind':9}}, {year:2025,partial:false,total:100,byFuel:{'offshore-wind':20}} ];
  const context = generationContext(wind,rows);
  assert.equal(context.year,2025); assert.equal(context.twh,20); assert.equal(context.share,20);
  assert.equal(generationContext(battery,rows),null);
  assert.equal(generationContext({...wind,technology:'Unknown'},rows),null);
  assert.equal(generationContext(gas,rows),null);
});
test('map projection has a fixed aspect-corrected scale independent of filtering', () => {
  const a=stationPosition(0,55),b=stationPosition(1,55),c=stationPosition(0,56);
  assert.ok(Math.abs((b[0]-a[0])/(a[1]-c[1])-Math.cos(55*Math.PI/180))<1e-9);
});

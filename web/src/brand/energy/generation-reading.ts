import { LONG_FUELS, fmtPct, fmtTWh, value, type LongYear, type LongFuelId, type Measure } from './long-run';
/** Descriptive arithmetic only: no claim that one source caused another to change. */
export function historyReading(mix: LongYear[], year: number, group: LongFuelId | null, measure: Measure): string {
  const row = mix.find(r => r.year === year);
  if (!row || !mix.length) return '';
  const format = measure === 'share' ? fmtPct : fmtTWh;
  if (group) {
    const fuel = LONG_FUELS.find(f => f.id === group)!;
    const peak = mix.reduce((a,b) => value(b,group,measure) > value(a,group,measure) ? b : a);
    return `${fuel.label} supplied ${format(value(row,group,measure))} in ${year}. Its highest ${measure === 'share' ? 'share' : 'annual generation'} in this series was ${format(value(peak,group,measure))} in ${peak.year}.`;
  }
  const leaders = LONG_FUELS.filter(f => f.selectable).toSorted((a,b) => row.v[b.id]-row.v[a.id]).slice(0,2);
  return `In ${year}, ${leaders.map(f => `${f.label.toLowerCase()} accounted for ${fmtPct(value(row,f.id,'share'))}`).join(' and ')} of UK generation. ${row.v.unallocated > 0 ? `${fmtTWh(row.v.unallocated)} of the published total is not allocated to a fuel.` : ''}`;
}

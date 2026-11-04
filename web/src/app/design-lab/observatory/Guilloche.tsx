/**
 * Guilloché — a banknote rosette generated from a series' own history.
 *
 * Two families of rings (± petals) cross into a moiré lattice; each ring's
 * radius is modulated by the series, sampled as a palindrome around the
 * circle so the curve closes. Same series → same rosette: a signature.
 */

type Props = {
  values: number[];
  ink: string;
  rings?: number;
  className?: string;
  opacity?: number;
};

export function guillochePaths(values: number[], rings = 20): string[] {
  const n = values.length;
  if (n < 2) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = values.map((v) => (v - min) / (max - min || 1));
  const sample = (t: number) => {
    const tt = t < 0.5 ? t * 2 : 2 - t * 2;
    const x = tt * (n - 1);
    const i = Math.floor(x);
    const f = x - i;
    return norm[i]! * (1 - f) + (norm[Math.min(n - 1, i + 1)] ?? norm[i]!) * f;
  };
  const petals = 7 + (n % 6);
  const R = 190;
  const steps = 540;
  const out: string[] = [];
  for (const dir of [1, -1]) {
    for (let k = 0; k < rings; k += 1) {
      const f = k / (rings - 1);
      let d = "";
      for (let s = 0; s <= steps; s += 1) {
        const t = s / steps;
        const th = t * Math.PI * 2;
        const rho =
          R * (0.3 + 0.62 * f) +
          R * 0.055 * Math.sin(dir * petals * th + k * 0.42) +
          R * 0.1 * (sample(t) - 0.5) * (0.35 + f);
        const x = 200 + rho * Math.cos(th);
        const y = 200 + rho * Math.sin(th);
        d += `${s ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      }
      out.push(`${d}Z`);
    }
  }
  return out;
}

export function Guilloche({ values, ink, rings = 20, className, opacity = 1 }: Props) {
  const paths = guillochePaths(values, rings);
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden="true" style={{ opacity }}>
      <g fill="none" stroke={ink} strokeWidth="0.6">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

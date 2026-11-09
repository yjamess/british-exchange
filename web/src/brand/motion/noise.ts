/** Small deterministic value noise + fbm for motion fields (no dependencies). */

function permutation(seed: number): Uint8Array {
  const a = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  return p;
}

const P = permutation(7);
const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Value noise in [0, 1]. */
export function noise3(x: number, y: number, z: number): number {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
  const fx = fade(x - X), fy = fade(y - Y), fz = fade(z - Z);
  const h = (i: number, j: number, k: number) => P[(P[(P[(X + i) & 255] + Y + j) & 255] + Z + k) & 255] / 255;
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), fx), lerp(h(0, 1, 0), h(1, 1, 0), fx), fy),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), fx), lerp(h(0, 1, 1), h(1, 1, 1), fx), fy),
    fz,
  );
}

/** Three-octave fbm, roughly [0, 0.875]. */
export function fbm3(x: number, y: number, z: number): number {
  return 0.5 * noise3(x, y, z) + 0.25 * noise3(x * 2.03, y * 2.03, z * 1.7) + 0.125 * noise3(x * 4.1, y * 4.1, z * 2.3);
}

/** Read a brand colour token (hex) from the element's computed style as [r, g, b] in 0..1. */
export function tokenRGB(el: Element, name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const m = raw.match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

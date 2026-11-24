export type RGB = readonly [number, number, number];

export function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function mul(a: RGB, k: number): RGB {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/** Couleur CSS d'un hex, éclaircie/assombrie par k (utilisé pour dessiner les portraits). */
export function shadeHex(h: string, k: number): string {
  const [r, g, b] = hex(h);
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

// Cache des chaînes fillStyle, quantifiées sur 5 bits par canal (32 768 entrées max).
const styleCache: string[] = [];
const q = (v: number): number => (v <= 0 ? 0 : v >= 255 ? 31 : v >> 3);

/** Clé de couleur quantifiée (15 bits), pour regrouper les glyphes de même couleur. */
export function styleKey(r: number, g: number, b: number): number {
  return (q(r) << 10) | (q(g) << 5) | q(b);
}

export function styleOfKey(key: number): string {
  return (styleCache[key] ??= `rgb(${(key >> 10) * 8 + 4},${((key >> 5) & 31) * 8 + 4},${(key & 31) * 8 + 4})`);
}

export function styleOf(r: number, g: number, b: number): string {
  const ri = q(r);
  const gi = q(g);
  const bi = q(b);
  const key = (ri << 10) | (gi << 5) | bi;
  return (styleCache[key] ??= `rgb(${ri * 8 + 4},${gi * 8 + 4},${bi * 8 + 4})`);
}

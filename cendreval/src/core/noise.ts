import { hash2 } from './rng';

/** Bruit de valeur 2D lissé + fBm. Simple, rapide et sans dépendance. */
export class Noise2D {
  constructor(private readonly seed: number) {}

  value(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, this.seed);
    const b = hash2(xi + 1, yi, this.seed);
    const c = hash2(xi, yi + 1, this.seed);
    const d = hash2(xi + 1, yi + 1, this.seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  fbm(x: number, y: number, octaves = 4): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.value(x * freq + i * 17.3, y * freq - i * 9.1);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }
}

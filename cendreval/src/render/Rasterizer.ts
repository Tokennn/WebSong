import { ASPECT } from '../core/math';
import { RAMP, rampChar } from './glyphs';

export interface RasterCell {
  ch: string;
  r: number;
  g: number;
  b: number;
}

export interface RasterOptions {
  ramp?: string;
  /** Multiplie la luminance avant le choix du glyphe. */
  gain?: number;
  /** Opacité minimale pour qu'une case existe. */
  minAlpha?: number;
  /** Petit bruit sur la luminance (scintillement des glyphes). */
  jitter?: (x: number, y: number) => number;
}

/**
 * "Shader ASCII" : on dessine une forme avec l'API Canvas 2D en haute résolution,
 * on la réduit à une image d'un pixel par case, puis chaque pixel devient un glyphe
 * choisi par sa luminance, coloré par sa teinte.
 *
 * L'espace de dessin est isotrope : 1 unité = 1 largeur de case sur les deux axes.
 * La zone fait donc `cols` unités de large et `rows * ASPECT` unités de haut.
 */
export class Rasterizer {
  private readonly big = document.createElement('canvas');
  private readonly small = document.createElement('canvas');
  private readonly bctx: CanvasRenderingContext2D;
  private readonly sctx: CanvasRenderingContext2D;

  constructor(
    readonly cols: number,
    readonly rows: number,
    private readonly ss = 6,
  ) {
    this.big.width = cols * ss;
    this.big.height = Math.round(rows * ss * ASPECT);
    this.small.width = cols;
    this.small.height = rows;
    const b = this.big.getContext('2d');
    const s = this.small.getContext('2d', { willReadFrequently: true });
    if (!b || !s) throw new Error('Canvas 2D indisponible');
    this.bctx = b;
    this.sctx = s;
  }

  /** Hauteur de la zone de dessin en unités isotropes. */
  get height(): number {
    return this.rows * ASPECT;
  }

  render(
    draw: (ctx: CanvasRenderingContext2D) => void,
    out: (x: number, y: number, cell: RasterCell) => void,
    opts: RasterOptions = {},
  ): void {
    const { ramp = RAMP, gain = 1.4, minAlpha = 0.28, jitter } = opts;
    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, this.big.width, this.big.height);
    b.setTransform(this.ss, 0, 0, this.ss, 0, 0);
    b.save();
    draw(b);
    b.restore();

    const s = this.sctx;
    s.clearRect(0, 0, this.cols, this.rows);
    s.imageSmoothingEnabled = true;
    s.imageSmoothingQuality = 'high';
    s.drawImage(this.big, 0, 0, this.cols, this.rows);
    const data = s.getImageData(0, 0, this.cols, this.rows).data;

    const cell: RasterCell = { ch: ' ', r: 0, g: 0, b: 0 };
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = (y * this.cols + x) * 4;
        const a = data[i + 3] / 255;
        if (a < minAlpha) continue;
        const r = data[i];
        const g = data[i + 1];
        const bl = data[i + 2];
        const lum = ((0.299 * r + 0.587 * g + 0.114 * bl) / 255) * a;
        const l = Math.min(1, Math.max(0.06, lum * gain + (jitter ? jitter(x, y) : 0)));
        const ch = rampChar(l, ramp);
        if (ch === ' ') continue;
        const boost = 0.75 + 0.7 * l;
        cell.ch = ch;
        cell.r = r * boost;
        cell.g = g * boost;
        cell.b = bl * boost;
        out(x, y, cell);
      }
    }
  }
}

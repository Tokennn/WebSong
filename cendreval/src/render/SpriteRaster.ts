import { ASPECT } from '../core/math';
import { lineChar, rampChar } from './glyphs';

/** Sous-échantillons par case : 3 × 4, soit des sous-pixels presque carrés (cases 1.4 fois plus hautes). */
export const SUB_X = 3;
export const SUB_Y = 4;
const N = SUB_X * SUB_Y;

/** Rampe de remplissage : une case couverte n'est jamais vide. */
export const FILL_RAMP = '.:-=+*#%&@';

export interface SpriteCell {
  x: number;
  y: number;
  ch: string;
  r: number;
  g: number;
  b: number;
  /** Couverture de la case par la forme (0..1). */
  a: number;
}

export interface ShapeOptions {
  ramp?: string;
  /** Multiplie la luminance avant le choix du glyphe de remplissage. */
  gain?: number;
  /** Petit bruit sur la luminance, en coordonnées de case du sprite. */
  jitter?: (x: number, y: number) => number;
}

// Position de chaque sous-échantillon par rapport au centre de la case, en largeurs de case.
const UX = new Float32Array(N);
const UY = new Float32Array(N);
for (let j = 0; j < SUB_Y; j++) {
  for (let k = 0; k < SUB_X; k++) {
    UX[j * SUB_X + k] = (k + 0.5) / SUB_X - 0.5;
    UY[j * SUB_X + k] = ((j + 0.5) / SUB_Y - 0.5) * ASPECT;
  }
}
let SXX = 0;
let SYY = 0;
for (let i = 0; i < N; i++) {
  SXX += UX[i] * UX[i];
  SYY += UY[i] * UY[i];
}

/**
 * "Shader ASCII" sensible aux formes, pour les personnages, les bêtes et la nature.
 * La forme est dessinée en Canvas 2D à 3 × 4 sous-pixels par case, puis chaque case
 * choisit son glyphe selon la façon dont elle est couverte :
 *  - case pleine : la luminance choisit la densité ; une arête nette à l'intérieur
 *    (ceinture, bord d'une plaque, mâchoire) devient un trait orienté ;
 *  - bord de silhouette : le glyphe épouse le contour ( ( ) / \ _ ¯ ) ;
 *  - trait fin (lame, patte, brin d'herbe) : un glyphe dans l'axe du trait.
 * Le contour suit la position sous-case du sprite : il glisse au lieu de sauter.
 */
export class SpriteRaster {
  private readonly cv = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly al = new Float32Array(N);
  private readonly lu = new Float32Array(N);

  constructor() {
    this.cv.width = 64;
    this.cv.height = 64;
    const ctx = this.cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D indisponible');
    this.ctx = ctx;
  }

  /**
   * Dessine dans une zone de `cols` × `rows` cases. `draw` reçoit un contexte en
   * sous-pixels (l'appelant pose sa transformation) ; les cases sont ajoutées à `out`.
   */
  render(cols: number, rows: number, draw: (ctx: CanvasRenderingContext2D) => void, out: SpriteCell[], opts: ShapeOptions = {}): void {
    const W = cols * SUB_X;
    const H = rows * SUB_Y;
    if (W <= 0 || H <= 0) return;
    if (this.cv.width < W || this.cv.height < H) {
      this.cv.width = Math.max(this.cv.width, W);
      this.cv.height = Math.max(this.cv.height, H);
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    draw(ctx);
    ctx.restore();
    const data = ctx.getImageData(0, 0, W, H).data;

    const { ramp = FILL_RAMP, gain = 1.25, jitter } = opts;
    const al = this.al;
    const lu = this.lu;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        let A = 0;
        let R = 0;
        let G = 0;
        let B = 0;
        let mx = 0;
        let my = 0;
        for (let j = 0; j < SUB_Y; j++) {
          let o = ((cy * SUB_Y + j) * W + cx * SUB_X) * 4;
          for (let k = 0; k < SUB_X; k++, o += 4) {
            const s = j * SUB_X + k;
            const a = data[o + 3] / 255;
            al[s] = a;
            lu[s] = ((0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) / 255) * a;
            A += a;
            R += data[o] * a;
            G += data[o + 1] * a;
            B += data[o + 2] * a;
            mx += a * UX[s];
            my += a * UY[s];
          }
        }
        const cov = A / N;
        if (cov < 0.1) continue;
        const r = R / A;
        const g = G / A;
        const b = B / A;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        let ch: string;
        let k = 0.8 + 0.55 * lum;

        if (cov > 0.8) {
          // Intérieur : arête de luminance nette → trait ; sinon densité.
          let gx = 0;
          let gy = 0;
          for (let s = 0; s < N; s++) {
            gx += lu[s] * UX[s];
            gy += lu[s] * UY[s];
          }
          gx /= SXX;
          gy /= SYY;
          if (gx * gx + gy * gy > 0.75) ch = lineChar(-gy, gx);
          else ch = rampChar(Math.min(1, Math.max(0, lum * gain + (jitter ? jitter(cx, cy) : 0))), ramp);
        } else {
          const ox = mx / A;
          const oy = my / A;
          if (ox * ox + oy * oy < 0.016) {
            // Couverture centrée : trait fin (axe principal) ou petit point.
            let vxx = 0;
            let vyy = 0;
            let vxy = 0;
            for (let s = 0; s < N; s++) {
              const dx = UX[s] - ox;
              const dy = UY[s] - oy;
              vxx += al[s] * dx * dx;
              vyy += al[s] * dy * dy;
              vxy += al[s] * dx * dy;
            }
            const tr = vxx + vyy || 1;
            const ani = Math.hypot(vxx - vyy, 2 * vxy) / tr;
            if (ani > 0.3) {
              const th = 0.5 * Math.atan2(2 * vxy, vxx - vyy);
              ch = lineChar(Math.cos(th), Math.sin(th));
            } else ch = cov < 0.25 ? '.' : cov < 0.5 ? '+' : 'o';
          } else {
            ch = edgeChar(ox, oy, cov);
            k *= 1.12; // liseré : le contour accroche un peu la lumière
          }
        }
        out.push({ x: cx, y: cy, ch, r: r * k, g: g * k, b: b * k, a: Math.min(1, cov) });
      }
    }
  }
}

/** Glyphe de contour : (ox, oy) pointe vers la partie couverte de la case. */
function edgeChar(ox: number, oy: number, cov: number): string {
  const a = Math.atan2(oy, ox); // y vers le bas
  const oct = (((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  switch (oct) {
    case 0: // couvert à droite : bord gauche d'une forme
      return '(';
    case 4:
      return ')';
    case 2: // couvert en bas : dessus d'une forme
      return cov < 0.3 ? '.' : '_';
    case 6: // couvert en haut : dessous d'une forme
      return cov < 0.3 ? "'" : '¯';
    case 1:
    case 5:
      return '/';
    default:
      return '\\';
  }
}

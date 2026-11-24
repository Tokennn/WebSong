import { styleKey, styleOfKey } from './color';

const FAMILY = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

/**
 * Grille de caractères dessinée sur un <canvas>.
 * On écrit d'abord dans des tampons (caractère + couleur par case), ce qui permet
 * d'assombrir après coup (ombres, lumière) avant le dessin final avec `flush()`.
 *
 * Avec `layers`, deux calques basse résolution passent sous le texte :
 *  - un fond coloré lissé (une teinte par case, étirée) qui donne du corps aux surfaces ;
 *  - un halo (bloom) autour de ce qui brille : feux, braises, yeux.
 * Puis un vignettage assombrit les bords.
 */
export class AsciiCanvas {
  cols = 0;
  rows = 0;
  cellW = 10;
  cellH = 14;
  bg = '#07080b';

  ch: string[] = [];
  r = new Float32Array(0);
  g = new Float32Array(0);
  b = new Float32Array(0);

  private keys = new Int32Array(0);
  private order = new Int32Array(0);
  private readonly bucket = new Int32Array(1 << 15);

  /** Active le fond lissé, le halo et le vignettage. */
  layers = false;
  private back = new Float32Array(0);
  private glow = new Float32Array(0);
  private backCv: HTMLCanvasElement | null = null;
  private glowCv: HTMLCanvasElement | null = null;
  private glowSmall: HTMLCanvasElement | null = null;
  private backImg: ImageData | null = null;
  private glowImg: ImageData | null = null;
  private vignette: CanvasGradient | null = null;

  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private fontPx = 12;
  private cssW = 0;
  private cssH = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponible');
    this.ctx = ctx;
  }

  /** Dimensionne la grille : cellH en px CSS, cellW = cellH / aspect. */
  resize(cssW: number, cssH: number, cellH: number, aspect: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssW = cssW;
    this.cssH = cssH;
    this.cellH = cellH;
    this.cellW = cellH / aspect;
    this.fontPx = Math.round(cellH * 0.92);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.cols = Math.ceil(cssW / this.cellW);
    this.rows = Math.ceil(cssH / this.cellH);
    const n = this.cols * this.rows;
    this.ch = new Array<string>(n).fill(' ');
    this.r = new Float32Array(n);
    this.g = new Float32Array(n);
    this.b = new Float32Array(n);
    if (this.layers) this.resizeLayers();
  }

  clear(): void {
    this.ch.fill(' ');
    if (this.layers) {
      this.back.fill(0);
      this.glow.fill(0);
    }
  }

  /** Teinte de fond d'une case (calque lissé). */
  setBack(x: number, y: number, r: number, g: number, b: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = (y * this.cols + x) * 3;
    this.back[i] = r;
    this.back[i + 1] = g;
    this.back[i + 2] = b;
  }

  /** Mélange une teinte dans le fond d'une case (corps plein des personnages). */
  mixBack(x: number, y: number, r: number, g: number, b: number, k: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = (y * this.cols + x) * 3;
    this.back[i] += (r - this.back[i]) * k;
    this.back[i + 1] += (g - this.back[i + 1]) * k;
    this.back[i + 2] += (b - this.back[i + 2]) * k;
  }

  /** Assombrit une case entière, glyphe et fond (ombre au sol, détourage). */
  darken(x: number, y: number, k: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = y * this.cols + x;
    this.r[i] *= k;
    this.g[i] *= k;
    this.b[i] *= k;
    if (!this.layers) return;
    const j = i * 3;
    this.back[j] *= k;
    this.back[j + 1] *= k;
    this.back[j + 2] *= k;
  }

  /** Teinte une case (glyphe et fond) par multiplication, dosée par k (0..1). */
  tint(x: number, y: number, mr: number, mg: number, mb: number, k: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = y * this.cols + x;
    const fr = 1 + (mr - 1) * k;
    const fg = 1 + (mg - 1) * k;
    const fb = 1 + (mb - 1) * k;
    this.r[i] *= fr;
    this.g[i] *= fg;
    this.b[i] *= fb;
    if (!this.layers) return;
    const j = i * 3;
    this.back[j] *= fr;
    this.back[j + 1] *= fg;
    this.back[j + 2] *= fb;
  }

  /** Ajoute de la lumière au halo autour d'une case. */
  addGlow(x: number, y: number, r: number, g: number, b: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = (y * this.cols + x) * 3;
    this.glow[i] += r;
    this.glow[i + 1] += g;
    this.glow[i + 2] += b;
  }

  private resizeLayers(): void {
    const { cols, rows } = this;
    const mk = (w: number, h: number): HTMLCanvasElement => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, w);
      c.height = Math.max(1, h);
      return c;
    };
    this.back = new Float32Array(cols * rows * 3);
    this.glow = new Float32Array(cols * rows * 3);
    this.backCv = mk(cols, rows);
    this.glowCv = mk(cols, rows);
    this.glowSmall = mk(Math.ceil(cols / 5), Math.ceil(rows / 5));
    this.backImg = this.backCv.getContext('2d')!.createImageData(cols, rows);
    this.glowImg = this.glowCv.getContext('2d')!.createImageData(cols, rows);
    const cx = this.cssW / 2;
    const cy = this.cssH / 2;
    const v = this.ctx.createRadialGradient(cx, cy, Math.min(cx, cy) * 0.45, cx, cy, Math.hypot(cx, cy));
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.7, 'rgba(0,0,0,0.28)');
    v.addColorStop(1, 'rgba(0,0,0,0.72)');
    this.vignette = v;
  }

  private drawLayers(): void {
    const ctx = this.ctx;
    const n = this.cols * this.rows;
    const bd = this.backImg!.data;
    const gd = this.glowImg!.data;
    for (let i = 0; i < n; i++) {
      const s = i * 3;
      const o = i * 4;
      bd[o] = this.back[s];
      bd[o + 1] = this.back[s + 1];
      bd[o + 2] = this.back[s + 2];
      bd[o + 3] = 255;
      gd[o] = this.glow[s];
      gd[o + 1] = this.glow[s + 1];
      gd[o + 2] = this.glow[s + 2];
      gd[o + 3] = 255;
    }
    this.backCv!.getContext('2d')!.putImageData(this.backImg!, 0, 0);
    this.glowCv!.getContext('2d')!.putImageData(this.glowImg!, 0, 0);
    const W = this.cols * this.cellW;
    const H = this.rows * this.cellH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.backCv!, 0, 0, W, H);
    // Halo : on réduit (flou gratuit) puis on étire par-dessus le fond.
    const sm = this.glowSmall!;
    const sctx = sm.getContext('2d')!;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'medium';
    sctx.drawImage(this.glowCv!, 0, 0, sm.width, sm.height);
    ctx.drawImage(sm, 0, 0, W, H);
    ctx.drawImage(sm, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  set(x: number, y: number, c: string, r: number, g: number, b: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = y * this.cols + x;
    this.ch[i] = c;
    this.r[i] = r;
    this.g[i] = g;
    this.b[i] = b;
  }

  text(x: number, y: number, s: string, r: number, g: number, b: number): void {
    for (let i = 0; i < s.length; i++) this.set(x + i, y, s[i], r, g, b);
  }

  /** Multiplie la couleur déjà écrite dans une case (ombre portée, voile…). */
  shade(x: number, y: number, k: number): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = y * this.cols + x;
    this.r[i] *= k;
    this.g[i] *= k;
    this.b[i] *= k;
  }

  flush(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (this.layers && this.backImg) this.drawLayers();
    ctx.font = `${this.fontPx}px ${FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { cols, rows, cellW, cellH } = this;
    const n = cols * rows;
    if (this.keys.length !== n) {
      this.keys = new Int32Array(n);
      this.order = new Int32Array(n);
    }
    // Tri par couleur (tri par comptage) : un seul changement de fillStyle par teinte.
    const keys = this.keys;
    const count = this.bucket;
    count.fill(0);
    let visible = 0;
    for (let i = 0; i < n; i++) {
      const r = this.r[i];
      const g = this.g[i];
      const b = this.b[i];
      // Invisible sur le fond : on économise un fillText.
      if (this.ch[i] === ' ' || r + g + b < 16) {
        keys[i] = -1;
        continue;
      }
      const k = styleKey(r, g, b);
      keys[i] = k;
      count[k]++;
      visible++;
    }
    let acc = 0;
    for (let k = 0; k < count.length; k++) {
      const c = count[k];
      count[k] = acc;
      acc += c;
    }
    const order = this.order;
    for (let i = 0; i < n; i++) if (keys[i] >= 0) order[count[keys[i]]++] = i;
    let last = -1;
    for (let j = 0; j < visible; j++) {
      const i = order[j];
      const k = keys[i];
      if (k !== last) {
        ctx.fillStyle = styleOfKey(k);
        last = k;
      }
      const y = (i / cols) | 0;
      ctx.fillText(this.ch[i], (i - y * cols + 0.5) * cellW, (y + 0.5) * cellH);
    }
    if (this.layers && this.vignette) {
      ctx.fillStyle = this.vignette;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }
  }
}

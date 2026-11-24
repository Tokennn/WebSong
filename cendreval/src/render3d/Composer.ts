import { clamp } from '../core/math';
import { hash2 } from '../core/rng';
import type { AsciiCanvas } from '../render/AsciiCanvas';
import { ROCK, lineChar, rampChar } from '../render/glyphs';
import { newShade, shadeTile, windAt, type Shade } from '../world/materials';
import { SHAPE_BUILT, type Relief } from '../world/relief';
import { T, isWater } from '../world/tiles';
import type { World } from '../world/World';
import { FACE_SEA, FACE_SIDE } from './mesh';
import { SUPERSAMPLE, type GBuffer } from './WorldRenderer';

/** Pierre taillée, du plus aéré au plus dense : la lumière choisit le glyphe. */
const STONE_RAMP = ' .,:;-=+*#%&8B@';
const PLASTER_RAMP = ' .,:-=+*#';
const EARTH_RAMP = ' .,:;i+%';
const FOG = [9, 11, 19];

/**
 * Rampes "lumière → glyphe" des matières statiques, du plus sombre au plus éclairé.
 * C'est ce qui fait lire les volumes : face éclairée dense, face à l'ombre clairsemée.
 */
const TOP_RAMP: Partial<Record<number, string>> = {
  [T.GRASS]: ' .,;:"',
  [T.DEAD]: " .,'`;:i!",
  [T.MUD]: ' .,~:;=',
  [T.ROAD]: ' .,:-=+*',
  [T.BRIDGE]: ' .-=#',
  [T.FLOOR]: ' .,:-=+#%',
  [T.SCORCHED]: ' .,;:x%',
  [T.ROCK]: ' .:;+=xX#%',
  [T.MOUNTAIN]: ' .:;+=xX#%@',
  [T.ROOF]: ' .-=+#%',
  [T.WALL]: STONE_RAMP,
  [T.FOREST]: ' .,:;+*%&8@',
};

/**
 * "Shader ASCII" de la scène 3D : relit le G-buffer et choisit un glyphe par case.
 *  - dessus des cases : comportements de matière existants (herbe au vent, pierre figée…) ;
 *  - flancs (murs, falaises) : rampe de densité selon la lumière reçue ;
 *  - pentes raides : hachures qui suivent la pente ;
 *  - silhouettes : traits sur les ruptures de profondeur ;
 *  - eau : reflet de ce qui se trouve au-dessus à l'écran (tours, arbres, rives).
 */
export class Composer {
  /** Profondeur de la surface visible par case (Infinity = rien). */
  depth = new Float32Array(0);
  /** 1 si la surface de la case peut cacher une entité (pas le feuillage). */
  occluder = new Uint8Array(0);
  fogStart = 100;
  fogEnd = 260;

  private cols = 0;
  private rows = 0;
  private kind = new Uint8Array(0);
  private tx = new Int16Array(0);
  private ty = new Int16Array(0);
  private fine = new Uint8Array(0);
  private lr = new Float32Array(0);
  private lg = new Float32Array(0);
  private lb = new Float32Array(0);
  private up = new Float32Array(0);
  private nsx = new Float32Array(0);
  private nsy = new Float32Array(0);
  private water = new Uint8Array(0);
  private readonly sh: Shade = newShade();

  resize(cols: number, rows: number): void {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.depth = new Float32Array(n);
    this.occluder = new Uint8Array(n);
    this.kind = new Uint8Array(n);
    this.tx = new Int16Array(n);
    this.ty = new Int16Array(n);
    this.fine = new Uint8Array(n);
    this.lr = new Float32Array(n);
    this.lg = new Float32Array(n);
    this.lb = new Float32Array(n);
    this.up = new Float32Array(n);
    this.nsx = new Float32Array(n);
    this.nsy = new Float32Array(n);
    this.water = new Uint8Array(n);
  }

  compose(gb: GBuffer, world: World, relief: Relief, c: AsciiCanvas, t: number): void {
    this.decode(gb, world);
    const { cols, rows } = this;
    const sh = this.sh;

    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        const kind = this.kind[i];
        this.water[i] = 0;
        if (!kind) continue;
        const tx = this.tx[i];
        const ty = this.ty[i];
        const tile = world.tile(tx, ty);
        const ti = ty * world.w + tx;
        const fine = this.fine[i];
        const lum = (this.lr[i] + this.lg[i] + this.lb[i]) / 3;
        // Silhouettes : seulement les flancs (murs, falaises), pas les toits ni le sol.
        let hard = kind === FACE_SIDE;

        if (kind !== FACE_SIDE) {
          if (relief.stair[ti]) {
            put(sh, fine % 3 ? '=' : '_', 150, 144, 140);
          } else if (isWater(tile)) {
            this.water[i] = 1;
            shadeTile(world, tx, ty, t, sh, true, fine);
          } else {
            shadeTile(world, tx, ty, t, sh, false, fine);
            const ramp = TOP_RAMP[tile];
            // Rafales sur l'herbe : on garde le glyphe du vent, sinon la lumière choisit.
            if (ramp && !sh.emissive && !(tile === T.GRASS && (sh.ch === '/' || sh.ch === '\\' || sh.ch === '`'))) {
              sh.ch = rampChar(clamp((tone(lum) - 0.12) / 1.7 + ((fine & 15) / 15 - 0.5) * 0.14, 0, 1), ramp);
            }
            // Pentes raides : hachures dans le sens de la pente, mêlées de roche.
            const up = this.up[i];
            if (!sh.emissive && up < 0.74 && relief.shape[ti] !== SHAPE_BUILT && tile !== T.FOREST) {
              const nx = this.nsx[i];
              const ny = this.nsy[i];
              if (Math.abs(nx) + Math.abs(ny) > 0.25 && fine % 4 !== 0) sh.ch = lineChar(nx, ny);
              else sh.ch = rampChar(clamp(lum * 0.7, 0.15, 1), ROCK);
            }
          }
        } else {
          this.side(world, tile, tx, ty, fine, lum, t, sh);
        }

        let r: number, g: number, b: number;
        if (sh.emissive) {
          r = sh.r;
          g = sh.g;
          b = sh.b;
          c.addGlow(cx, cy, r * 0.55, g * 0.4, b * 0.25);
        } else {
          r = sh.r * tone(this.lr[i]);
          g = sh.g * tone(this.lg[i]);
          b = sh.b * tone(this.lb[i]);
          // Les flaques de lumière chaude rayonnent un peu.
          if (lum > 0.85) c.addGlow(cx, cy, r * 0.05 * (lum - 0.85), g * 0.04 * (lum - 0.85), b * 0.02 * (lum - 0.85));
        }

        let ch = sh.ch;
        if (this.water[i]) {
          const refl = this.reflect(c, cx, cy, t);
          if (refl) {
            ch = refl.ch;
            r = refl.r;
            g = refl.g;
            b = refl.b;
          }
        } else if (hard) {
          const edge = this.edge(cx, cy);
          if (edge) {
            ch = edge;
            r = r * 1.35 + 14;
            g = g * 1.35 + 14;
            b = b * 1.35 + 16;
          }
        }

        // Plafond qui garde la teinte : la torche reste orangée au lieu de virer au blanc.
        const peak = Math.max(r, g, b);
        if (peak > 255) {
          const s = 255 / peak;
          r *= s;
          g *= s;
          b *= s;
        }
        // Brume au loin.
        const fog = clamp((this.depth[i] - this.fogStart) / (this.fogEnd - this.fogStart), 0, 0.9);
        if (fog > 0) {
          r += (FOG[0] - r) * fog;
          g += (FOG[1] - g) * fog;
          b += (FOG[2] - b) * fog;
        }
        // Le fond lissé garde la forme même là où l'ombre ne laisse aucun glyphe.
        const k = kind === FACE_SIDE ? 0.3 : 0.18;
        c.setBack(cx, cy, r * k + FOG[0] * fog, g * k + FOG[1] * fog, b * k + FOG[2] * fog);
        if (ch !== ' ') c.set(cx, cy, ch, r, g, b);
      }
    }
  }

  // ---------------------------------------------------------------- étapes

  private decode(gb: GBuffer, world: World): void {
    const S = SUPERSAMPLE;
    const W2 = gb.w;
    const { cols, rows } = this;
    const L = gb.light;
    const Tl = gb.tile;
    const G = gb.geo;
    const dScale = gb.depthRange / 65535;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        let best = -1;
        let bd = Infinity;
        let n = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let j = 0; j < S; j++) {
          for (let k = 0; k < S; k++) {
            const o = ((cy * S + j) * W2 + cx * S + k) * 4;
            if (!(Tl[o + 2] >> 2)) continue;
            const d = (G[o] * 256 + G[o + 1]) * dScale;
            n++;
            r += L[o];
            g += L[o + 1];
            b += L[o + 2];
            if (d < bd) {
              bd = d;
              best = o;
            }
          }
        }
        if (best < 0) {
          this.kind[i] = 0;
          this.depth[i] = Infinity;
          this.occluder[i] = 0;
          continue;
        }
        const hiBits = Tl[best + 2];
        const kind = (hiBits >> 2) & 3;
        // La mer hors du monde n'a pas de case : (-1, -1) se lit comme de l'eau profonde.
        const tx = kind === FACE_SEA ? -1 : Tl[best] | ((hiBits & 1) << 8);
        const ty = kind === FACE_SEA ? -1 : Tl[best + 1] | (((hiBits >> 1) & 1) << 8);
        this.kind[i] = kind;
        this.tx[i] = tx;
        this.ty[i] = ty;
        this.fine[i] = Tl[best + 3];
        const k = 2 / 255 / n;
        this.lr[i] = r * k;
        this.lg[i] = g * k;
        this.lb[i] = b * k;
        this.up[i] = L[best + 3] / 255;
        this.nsx[i] = (G[best + 2] / 255) * 2 - 1;
        this.nsy[i] = 1 - (G[best + 3] / 255) * 2;
        this.depth[i] = bd;
        const tile = world.tile(tx, ty);
        this.occluder[i] = kind !== FACE_SIDE && (tile === T.FOREST || tile === T.TALL) ? 0 : 1;
      }
    }
  }

  /** Flancs : murs de pierre, façades, pieux, falaises. La lumière choisit la densité. */
  private side(world: World, tile: number, tx: number, ty: number, fine: number, lum: number, t: number, o: Shade): void {
    const l = clamp(0.3 + lum * 0.62 + ((fine & 15) / 15 - 0.5) * 0.22, 0.1, 1);
    switch (tile) {
      case T.WALL:
      case T.FLOOR:
      case T.FIRE: {
        // Assises de pierre : quelques joints horizontaux, le reste dense et figé.
        const ch = fine % 9 === 0 ? '=' : rampChar(l, STONE_RAMP);
        const k = 0.85 + ((fine >> 4) / 15) * 0.3;
        put(o, ch, 150 * k, 148 * k, 158 * k);
        return;
      }
      case T.MOSS_WALL: {
        if (fine < 120) {
          const b = windAt(world, tx, ty, t);
          const ch = b > 0.5 ? '/' : b < -0.4 ? '\\' : ",;'\"`"[fine % 5];
          put(o, ch, 78 + fine * 0.2, 132 + fine * 0.25, 58);
        } else {
          put(o, rampChar(l, STONE_RAMP), 140, 142, 146);
        }
        return;
      }
      case T.ROOF:
        // Façades des maisons : colombages sombres dans un enduit clair.
        if (fine % 6 === 0) put(o, '|', 104, 74, 52);
        else put(o, rampChar(l, PLASTER_RAMP) === ' ' ? '.' : rampChar(l, PLASTER_RAMP), 184, 164, 132);
        return;
      case T.PALISADE:
        put(o, '|!I|'[fine % 4], 140, 100, 62);
        return;
      case T.BRIDGE:
        put(o, fine % 3 ? '|' : '=', 128, 92, 58);
        return;
      case T.TENT:
      case T.BANNER:
        shadeTile(world, tx, ty, t, o, false, fine);
        return;
      case T.MOUNTAIN:
      case T.ROCK:
        put(o, rampChar(l, ROCK), 122, 116, 114);
        return;
      case T.FOREST:
        shadeTile(world, tx, ty, t, o, false, fine);
        return;
      default:
        put(o, rampChar(l, EARTH_RAMP), 112, 92, 66);
    }
  }

  /** Trait de silhouette si la case est devant une surface nettement plus lointaine. */
  private edge(cx: number, cy: number): string | null {
    const { cols, rows } = this;
    const i = cy * cols + cx;
    const d = this.depth[i];
    const thr = 2 + d * 0.012;
    const far = (x: number, y: number): number => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return 0;
      return this.depth[y * cols + x] - d > thr ? 1 : 0;
    };
    const gx = far(cx + 1, cy) - far(cx - 1, cy);
    const gy = far(cx, cy + 1) - far(cx, cy - 1);
    if (!gx && !gy) return null;
    return lineChar(-gy, gx);
  }

  /** Reflet en espace écran : la rive est la première case non liquide au-dessus. */
  private reflect(c: AsciiCanvas, cx: number, cy: number, t: number): { ch: string; r: number; g: number; b: number } | null {
    const cols = this.cols;
    let s = cy - 1;
    while (s >= 0 && this.water[s * cols + cx] && cy - s < 16) s--;
    if (s < 0 || this.water[s * cols + cx]) return null;
    const dist = cy - s;
    const m = 2 * s + 1 - cy;
    if (m < 0) return null;
    const mc = cx + Math.round(Math.sin(cy * 1.3 + t * 2.2) * 0.6);
    if (mc < 0 || mc >= cols) return null;
    const mi = m * cols + mc;
    const ch = c.ch[mi];
    if (ch === ' ' || this.water[mi]) return null;
    const fade = 1 - dist / 17;
    const ripple = hash2(cx, cy, Math.floor(t * 3)) < 0.09;
    return {
      ch: ripple ? '~' : ch,
      r: c.r[mi] * 0.42 * fade + 10,
      g: c.g[mi] * 0.5 * fade + 18,
      b: c.b[mi] * 0.68 * fade + 38,
    };
  }
}

/** Exposition : relève les ombres de lune, garde de la marge pour la torche et les feux. */
function tone(l: number): number {
  return 2.3 * (1 - Math.exp(-1.6 * l));
}

function put(o: Shade, ch: string, r: number, g: number, b: number): void {
  o.ch = ch;
  o.r = r;
  o.g = g;
  o.b = b;
  o.emissive = false;
}

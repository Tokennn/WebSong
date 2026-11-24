import { ASPECT, clamp, smoothstep, vdist } from '../core/math';
import { hash2 } from '../core/rng';
import { T, isWater } from './tiles';
import type { World } from './World';

/**
 * Relief 3D du monde : à partir des cases, on donne une hauteur à chaque coin de case.
 * C'est une donnée pure (aucun rendu ici) : le moteur 3D en tire un maillage, et les
 * entités y lisent la hauteur du sol sous leurs pieds.
 *
 * Repère 3D : X = x (largeurs de case), Y = hauteur (largeurs de case), Z = y × ASPECT,
 * pour qu'une case garde ses proportions "visuelles" (plus haute que large).
 */
export const Z_SCALE = ASPECT;
export const WATER_LEVEL = 0;

/** Hauteur d'une tour au-dessus du sol (la plateforme où l'on monte). */
export const TOWER_RISE = 13;
const HOUSE_EAVE = 3.6;
const HOUSE_RIDGE = 2.6;

const ZONE_TOWER_IN = 1;
const ZONE_TOWER_RING = 2;
const ZONE_VILLAGE = 3;

/** Forme du dessus d'une case. */
export const SHAPE_SMOOTH = 0;
export const SHAPE_BUILT = 1;

export class Relief {
  readonly w: number;
  readonly h: number;
  /** Hauteur du sol nu, par case. */
  readonly ground: Float32Array;
  /** Sol nu aux coins de cases ((w+1) × (h+1)), là où marchent les entités. */
  readonly groundCorner: Float32Array;
  /** Bosse de végétation aux coins (couronnes d'arbres, hautes herbes). */
  readonly vegCorner: Float32Array;
  /** Hauteur des 4 coins du dessus de chaque case : NO, NE, SO, SE. */
  readonly tc: Float32Array;
  /** Sommet central (tentes, pieux) ; 0 = pas de sommet. */
  readonly peak: Float32Array;
  readonly shape: Uint8Array;
  /** 1..3 : marche d'escalier de tour (3 = la plus haute). */
  readonly stair: Uint8Array;
  /**
   * Champ de hauteur pour les ombres : [terrain lissé, construction] par case.
   * Le terrain se lit en bilinéaire, les constructions case par case (arêtes nettes).
   */
  readonly shadowField: Float32Array;
  maxHeight = 0;

  private readonly zone: Uint8Array;
  /** Sol de référence de la zone (pied de la tour). */
  private readonly zoneGround: Float32Array;
  private readonly crenel: Uint8Array;

  constructor(private readonly world: World) {
    const { w, h } = world;
    this.w = w;
    this.h = h;
    const n = w * h;
    const nc = (w + 1) * (h + 1);
    this.ground = new Float32Array(n);
    this.groundCorner = new Float32Array(nc);
    this.vegCorner = new Float32Array(nc);
    this.tc = new Float32Array(n * 4);
    this.peak = new Float32Array(n);
    this.shape = new Uint8Array(n);
    this.stair = new Uint8Array(n);
    this.shadowField = new Float32Array(n * 2);
    this.zone = new Uint8Array(n);
    this.zoneGround = new Float32Array(n);
    this.crenel = new Uint8Array(n);

    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.ground[y * w + x] = this.groundOf(x, y);
    this.computeZones();
    for (let cy = 0; cy <= h; cy++) for (let cx = 0; cx <= w; cx++) this.computeCorner(cx, cy);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.computeShape(x, y);
  }

  /** Une case a changé (feu de dragon…) : on recalcule ce qui l'entoure. */
  update(x: number, y: number): void {
    if (!this.world.inside(x, y)) return;
    this.ground[y * this.w + x] = this.groundOf(x, y);
    for (let cy = y; cy <= y + 1; cy++) for (let cx = x; cx <= x + 1; cx++) this.computeCorner(cx, cy);
    for (let ty = y - 1; ty <= y + 1; ty++) {
      for (let tx = x - 1; tx <= x + 1; tx++) if (this.world.inside(tx, ty)) this.computeShape(tx, ty);
    }
  }

  /** Hauteur du sol là où marche une entité (x, y en cases, flottants). */
  walkHeight(x: number, y: number): number {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (!this.world.inside(tx, ty)) return WATER_LEVEL;
    const fx = x - tx;
    const fy = y - ty;
    const i = ty * this.w + tx;
    let a: number, b: number, c: number, d: number;
    if (this.shape[i] === SHAPE_SMOOTH) {
      const W = this.w + 1;
      const k = ty * W + tx;
      a = this.groundCorner[k];
      b = this.groundCorner[k + 1];
      c = this.groundCorner[k + W];
      d = this.groundCorner[k + W + 1];
    } else {
      a = this.tc[i * 4];
      b = this.tc[i * 4 + 1];
      c = this.tc[i * 4 + 2];
      d = this.tc[i * 4 + 3];
    }
    const top = a + (b - a) * fx;
    const bot = c + (d - c) * fx;
    return Math.max(WATER_LEVEL, top + (bot - top) * fy);
  }

  // ---------------------------------------------------------------- calculs

  private groundOf(x: number, y: number): number {
    const w = this.world;
    const i = y * w.w + x;
    const t = w.tiles[i];
    if (isWater(t)) return WATER_LEVEL - 0.5;
    const e = w.elev[i];
    let g = 0.22 + Math.max(0, e - 0.355) * 6.5 + Math.pow(smoothstep(0.7, 1.02, e), 1.3) * 16;
    if (t === T.ROCK || t === T.MOUNTAIN) {
      g += (w.noise.value(x * 0.35 + 50, y * 0.35 * ASPECT) - 0.5) * 1.6 + (hash2(x, y, 31) - 0.5) * 0.5;
    }
    return g;
  }

  private computeZones(): void {
    const w = this.world;
    for (const v of w.byKind('village')) {
      this.forBox(v.x, v.y, 13, (x, y, i) => {
        if (vdist(x + 0.5 - v.x, y + 0.5 - v.y) < v.radius) this.zone[i] = ZONE_VILLAGE;
      });
    }
    for (const t of w.byKind('tower')) {
      const g0 = this.ground[Math.floor(t.y) * w.w + Math.floor(t.x)];
      this.forBox(t.x, t.y, 7, (x, y, i) => {
        const dx = x + 0.5 - t.x;
        const dy = y + 0.5 - t.y;
        const d = vdist(dx, dy);
        // Escalier au sud : la porte, puis deux marches dehors.
        const row = Math.round(dy - 2.5);
        if (Math.abs(dx) < 1.2 && dy > 0 && d >= 3.2 && row >= 0 && row <= 2) {
          const tile = w.tiles[i];
          if (tile === T.FLOOR || (!w.solid(x, y) && !isWater(tile))) {
            this.stair[i] = 3 - row;
            this.zoneGround[i] = g0;
            return;
          }
        }
        if (d < 3.2) {
          this.zone[i] = ZONE_TOWER_IN;
          this.zoneGround[i] = g0;
        } else if (d <= 4.6) {
          this.zone[i] = ZONE_TOWER_RING;
          this.zoneGround[i] = g0;
          // Créneaux : un merlon sur deux, sur la moitié extérieure de l'anneau.
          const a = Math.atan2(dy * ASPECT, dx);
          const bucket = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16);
          this.crenel[i] = d > 3.85 && bucket % 2 === 0 ? 1 : 0;
        }
      });
    }
  }

  private forBox(cx: number, cy: number, r: number, fn: (x: number, y: number, i: number) => void): void {
    const ry = Math.ceil(r / ASPECT) + 1;
    for (let y = Math.floor(cy) - ry; y <= Math.floor(cy) + ry; y++) {
      for (let x = Math.floor(cx) - r - 1; x <= Math.floor(cx) + r + 1; x++) {
        if (this.world.inside(x, y)) fn(x, y, y * this.w + x);
      }
    }
  }

  private computeCorner(cx: number, cy: number): void {
    const w = this.world;
    let sum = 0;
    let n = 0;
    let forest = 0;
    let tall = 0;
    let land = 0;
    for (let y = cy - 1; y <= cy; y++) {
      for (let x = cx - 1; x <= cx; x++) {
        if (!w.inside(x, y)) continue;
        const i = y * w.w + x;
        sum += this.ground[i];
        n++;
        const t = w.tiles[i];
        if (t === T.FOREST) forest++;
        else if (t === T.TALL) tall++;
        if (!isWater(t)) land++;
      }
    }
    let g = n ? sum / n : WATER_LEVEL - 0.5;
    // Les rives remontent juste au-dessus de l'eau : pas de terre noyée.
    if (land > 0) g = Math.max(g, WATER_LEVEL + 0.06);
    const k = cy * (w.w + 1) + cx;
    this.groundCorner[k] = g;
    // Couronnes d'arbres : même bruit que les glyphes de canopée, pour que le relief et le dessin coïncident.
    const crown = clamp(w.noise.value(cx * 0.5 + 11, cy * 0.5 * ASPECT) * 1.15 - 0.1, 0, 1);
    this.vegCorner[k] = Math.pow(forest / 4, 1.6) * (1.6 + 2.8 * crown) + (tall / 4) * 0.3;
  }

  private computeShape(x: number, y: number): void {
    const w = this.world;
    const W = w.w + 1;
    const i = y * w.w + x;
    const t = w.tiles[i];
    const k = y * W + x;
    const ks = [k, k + 1, k + W, k + W + 1];
    const gc = ks.map((c) => this.groundCorner[c]);
    const gmax = Math.max(gc[0], gc[1], gc[2], gc[3]);
    const z = this.zone[i];
    const z0 = this.zoneGround[i];
    let shape = SHAPE_BUILT;
    let peak = 0;
    let c0: number, c1: number, c2: number, c3: number;
    const flat = (hgt: number): void => {
      c0 = c1 = c2 = c3 = hgt;
    };

    if (this.stair[i]) {
      // Rampe d'une marche : le bord nord est plus haut que le bord sud.
      const s = this.stair[i];
      const north = z0 + (TOWER_RISE * s) / 3;
      const south = z0 + (TOWER_RISE * (s - 1)) / 3;
      c0 = c1 = north;
      c2 = c3 = Math.max(south, gmax * (s === 1 ? 1 : 0));
    } else {
      switch (t) {
        case T.DEEP:
        case T.WATER:
          flat(WATER_LEVEL);
          break;
        case T.BRIDGE:
          flat(WATER_LEVEL + 0.55);
          break;
        case T.WALL:
        case T.MOSS_WALL:
          if (z === ZONE_TOWER_RING) flat(z0 + TOWER_RISE + 0.6 + (this.crenel[i] ? 1.3 : 0));
          else if (z === ZONE_VILLAGE) flat(gmax + HOUSE_EAVE);
          else flat(gmax + 0.8 + (w.vari[i] % 5) * 0.42); // ruine : murs écroulés
          break;
        case T.ROOF: {
          // Toit en croupe : un coin entouré de toit monte au faîtage.
          const h = ks.map((c, j) => gc[j] + HOUSE_EAVE + (this.cornerAllRoof(c) ? HOUSE_RIDGE : 0));
          [c0, c1, c2, c3] = h;
          break;
        }
        case T.TENT:
          [c0, c1, c2, c3] = gc.map((g) => g + 0.25);
          peak = gmax + 2.4;
          break;
        case T.PALISADE:
          flat(gmax + 1.7);
          peak = gmax + 2.7;
          break;
        case T.FIRE:
          flat(gmax + 0.35);
          break;
        case T.BANNER:
          flat(gmax + 3.4);
          break;
        default:
          if (z === ZONE_TOWER_IN && !w.solid(x, y)) {
            flat(z0 + TOWER_RISE); // plateforme au sommet de la tour
          } else {
            shape = SHAPE_SMOOTH;
            [c0, c1, c2, c3] = ks.map((c, j) => gc[j] + this.vegCorner[c]);
          }
      }
    }

    const o = i * 4;
    this.tc[o] = c0!;
    this.tc[o + 1] = c1!;
    this.tc[o + 2] = c2!;
    this.tc[o + 3] = c3!;
    this.peak[i] = peak;
    this.shape[i] = shape;
    const top = Math.max(c0!, c1!, c2!, c3!, peak);
    if (top > this.maxHeight) this.maxHeight = top;
    // Ombres : le terrain lisse d'un côté, les constructions de l'autre (-100 = rien).
    if (shape === SHAPE_SMOOTH || isWater(t)) {
      this.shadowField[i * 2] = shape === SHAPE_SMOOTH ? (c0! + c1! + c2! + c3!) / 4 : WATER_LEVEL;
      this.shadowField[i * 2 + 1] = -100;
    } else {
      this.shadowField[i * 2] = (gc[0] + gc[1] + gc[2] + gc[3]) / 4;
      this.shadowField[i * 2 + 1] = top;
    }
  }

  private cornerAllRoof(c: number): boolean {
    const W = this.w + 1;
    const cx = c % W;
    const cy = Math.floor(c / W);
    for (let y = cy - 1; y <= cy; y++) for (let x = cx - 1; x <= cx; x++) if (this.world.tile(x, y) !== T.ROOF) return false;
    return true;
  }
}

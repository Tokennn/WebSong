import { Z_SCALE } from '../world/relief';

export interface Projected {
  /** Colonne et ligne d'écran (flottantes, en cases). */
  x: number;
  y: number;
  /** Profondeur le long de l'axe de visée (en largeurs de case). */
  depth: number;
}

const DEG = Math.PI / 180;
export const ZOOM_MIN = 1.4;
export const ZOOM_MAX = 6;

/**
 * Caméra perspective qui suit le héros, inclinée vers le nord.
 * L'échelle est réglée pour qu'au niveau du héros, une largeur de case du monde
 * fasse `zoom` colonnes d'écran : de près, personnages et bêtes occupent assez de
 * glyphes pour avoir une vraie silhouette ; tout ce qui a du volume se penche et
 * se cache comme dans une vraie scène 3D.
 */
export class Camera {
  readonly viewProj = new Float32Array(16);
  readonly eye = [0, 0, 0];
  readonly fwd = [0, 0, -1];
  readonly right = [1, 0, 0];
  readonly up = [0, 1, 0];
  /** Angle sous l'horizon de l'axe de visée. */
  pitch = 50 * DEG;
  fovY = 46 * DEG;
  dist = 100;
  near = 2;
  far = 600;
  cols = 1;
  rows = 1;
  /** Colonnes d'écran par largeur de case, au niveau du héros. */
  zoom = 3;
  private aspect = 1;
  private tanY = 1;

  setViewport(cols: number, rows: number, cellW: number, cellH: number): void {
    this.cols = cols;
    this.rows = rows;
    this.aspect = (cols * cellW) / (rows * cellH);
    this.setZoom(this.zoom);
  }

  /**
   * Rapproche ou éloigne la caméra. Plus elle est proche, plus elle s'abaisse vers
   * l'horizon : vue de trois quarts "cinéma" de près, vue tactique de loin.
   */
  setZoom(z: number): void {
    this.zoom = z;
    const k = Math.min(1, Math.max(0, (z - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)));
    this.pitch = (57 - 22 * k) * DEG;
    this.tanY = Math.tan(this.fovY / 2);
    // Distance telle que la largeur visible au niveau de la cible = `cols / zoom` cases.
    this.dist = this.cols / 2 / (this.tanY * this.aspect * z);
    this.far = this.dist * 7;
  }

  /** Vise un point du monde (x, y en cases ; h = hauteur). */
  lookAt(x: number, y: number, h: number): void {
    const tx = x;
    const ty = h;
    const tz = y * Z_SCALE;
    const s = Math.sin(this.pitch);
    const c = Math.cos(this.pitch);
    const e = this.eye;
    e[0] = tx;
    e[1] = ty + s * this.dist;
    e[2] = tz + c * this.dist;
    // Axe de visée vers le nord et vers le bas ; droite = +X ; haut d'écran = nord.
    this.fwd[0] = 0;
    this.fwd[1] = -s;
    this.fwd[2] = -c;
    this.up[0] = 0;
    this.up[1] = c;
    this.up[2] = -s;

    // Matrice de vue (colonnes) puis projection perspective.
    const r = this.right;
    const u = this.up;
    const f = this.fwd;
    const view = [
      r[0], u[0], -f[0], 0,
      r[1], u[1], -f[1], 0,
      r[2], u[2], -f[2], 0,
      -(r[0] * e[0] + r[1] * e[1] + r[2] * e[2]),
      -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]),
      f[0] * e[0] + f[1] * e[1] + f[2] * e[2],
      1,
    ];
    const ny = 1 / this.tanY;
    const nx = ny / this.aspect;
    const n = this.near;
    const fa = this.far;
    const proj = [nx, 0, 0, 0, 0, ny, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, (2 * fa * n) / (n - fa), 0];
    mul4(this.viewProj, proj, view);
  }

  copyFrom(o: Camera): void {
    this.viewProj.set(o.viewProj);
    for (let k = 0; k < 3; k++) {
      this.eye[k] = o.eye[k];
      this.fwd[k] = o.fwd[k];
      this.right[k] = o.right[k];
      this.up[k] = o.up[k];
    }
    this.pitch = o.pitch;
    this.fovY = o.fovY;
    this.dist = o.dist;
    this.near = o.near;
    this.far = o.far;
    this.cols = o.cols;
    this.rows = o.rows;
    this.zoom = o.zoom;
    this.aspect = o.aspect;
    this.tanY = o.tanY;
  }

  /** Projette un point du monde (X, hauteur, Z en unités 3D) vers l'écran. */
  project(X: number, Y: number, Z: number, out: Projected): Projected {
    const m = this.viewProj;
    const cx = m[0] * X + m[4] * Y + m[8] * Z + m[12];
    const cy = m[1] * X + m[5] * Y + m[9] * Z + m[13];
    const cw = m[3] * X + m[7] * Y + m[11] * Z + m[15];
    const iw = cw > 1e-4 ? 1 / cw : 1e4;
    out.x = (cx * iw * 0.5 + 0.5) * this.cols;
    out.y = (0.5 - cy * iw * 0.5) * this.rows;
    out.depth = (X - this.eye[0]) * this.fwd[0] + (Y - this.eye[1]) * this.fwd[1] + (Z - this.eye[2]) * this.fwd[2];
    return out;
  }

  /** Projette une position d'entité (x, y en cases) à la hauteur h. */
  projectTile(x: number, y: number, h: number, out: Projected): Projected {
    return this.project(x, h, y * Z_SCALE, out);
  }

  /** Rectangle de cases du sol visible à la hauteur h (pour le tri et les effets d'ambiance). */
  groundBounds(h: number): { x0: number; y0: number; x1: number; y1: number } {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const tanX = this.tanY * this.aspect;
    for (const sy of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const dx = this.fwd[0] + this.right[0] * sx * tanX + this.up[0] * sy * this.tanY;
        const dy = this.fwd[1] + this.right[1] * sx * tanX + this.up[1] * sy * this.tanY;
        const dz = this.fwd[2] + this.right[2] * sx * tanX + this.up[2] * sy * this.tanY;
        const t = dy < -1e-3 ? (h - this.eye[1]) / dy : this.far;
        const X = this.eye[0] + dx * t;
        const Z = this.eye[2] + dz * t;
        x0 = Math.min(x0, X);
        x1 = Math.max(x1, X);
        y0 = Math.min(y0, Z / Z_SCALE);
        y1 = Math.max(y1, Z / Z_SCALE);
      }
    }
    return { x0, y0, x1, y1 };
  }
}

function mul4(out: Float32Array, a: number[], b: number[]): void {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
}

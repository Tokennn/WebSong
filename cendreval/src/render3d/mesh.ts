import { Z_SCALE, type Relief } from '../world/relief';
import { isWater } from '../world/tiles';
import type { World } from '../world/World';

/** Sommet : position (X, Y, Z) + case propriétaire (x, y) + type de face (1 dessus, 2 flanc). */
export const FLOATS_PER_VERTEX = 6;
export const FACE_TOP = 1;
export const FACE_SIDE = 2;
/** Mer sans fin autour du monde (pas de case propriétaire). */
export const FACE_SEA = 3;

const OUTSIDE = -2;

/**
 * Construit le maillage d'un bloc de cases [x0, x1[ × [y0, y1[ :
 * - le dessus de chaque case (2 triangles, ou 4 vers un sommet pour tentes et pieux) ;
 * - les flancs verticaux là où deux cases voisines n'ont pas la même hauteur
 *   (murs, falaises, bord des toits, marches).
 */
export function buildChunk(world: World, r: Relief, x0: number, y0: number, x1: number, y1: number): Float32Array {
  const out: number[] = [];
  const A = Z_SCALE;
  const tc = r.tc;
  const W = world.w;

  const vtx = (X: number, Y: number, z: number, tx: number, ty: number, face: number): void => {
    out.push(X, Y, z * A, tx, ty, face);
  };

  // Hauteurs des coins d'une case (hors monde : sous l'eau).
  const corner = (x: number, y: number, j: number): number => (world.inside(x, y) ? tc[(y * W + x) * 4 + j] : OUTSIDE);

  /**
   * Flanc entre deux cases le long d'une arête (p → q). a* = hauteurs du côté A, b* = côté B.
   * Celui qui dépasse possède le flanc ; s'ils se croisent, chacun garde sa part.
   */
  const side = (
    px: number, py: number, qx: number, qy: number,
    a0: number, a1: number, ax: number, ay: number,
    b0: number, b1: number, bx: number, by: number,
  ): void => {
    const e = 0.01;
    if ((a0 > b0 + e || a1 > b1 + e) && !waterOwner(ax, ay)) {
      quad(px, py, qx, qy, Math.min(a0, b0), a0, Math.min(a1, b1), a1, ax, ay);
    }
    if ((b0 > a0 + e || b1 > a1 + e) && !waterOwner(bx, by)) {
      quad(px, py, qx, qy, Math.min(a0, b0), b0, Math.min(a1, b1), b1, bx, by);
    }
  };
  const waterOwner = (x: number, y: number): boolean => !world.inside(x, y) || isWater(world.tile(x, y));
  const quad = (
    px: number, py: number, qx: number, qy: number,
    lo0: number, hi0: number, lo1: number, hi1: number, tx: number, ty: number,
  ): void => {
    vtx(px, lo0, py, tx, ty, FACE_SIDE);
    vtx(qx, lo1, qy, tx, ty, FACE_SIDE);
    vtx(qx, hi1, qy, tx, ty, FACE_SIDE);
    vtx(px, lo0, py, tx, ty, FACE_SIDE);
    vtx(qx, hi1, qy, tx, ty, FACE_SIDE);
    vtx(px, hi0, py, tx, ty, FACE_SIDE);
  };

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * W + x;
      const nw = tc[i * 4];
      const ne = tc[i * 4 + 1];
      const sw = tc[i * 4 + 2];
      const se = tc[i * 4 + 3];
      const pk = r.peak[i];

      // Dessus.
      if (pk > 0) {
        const cx = x + 0.5;
        const cz = y + 0.5;
        const tri = (ax: number, ah: number, az: number, bx: number, bh: number, bz: number): void => {
          vtx(ax, ah, az, x, y, FACE_TOP);
          vtx(bx, bh, bz, x, y, FACE_TOP);
          vtx(cx, pk, cz, x, y, FACE_TOP);
        };
        tri(x, nw, y, x + 1, ne, y);
        tri(x + 1, ne, y, x + 1, se, y + 1);
        tri(x + 1, se, y + 1, x, sw, y + 1);
        tri(x, sw, y + 1, x, nw, y);
      } else if (Math.abs(nw - se) <= Math.abs(ne - sw)) {
        vtx(x, nw, y, x, y, FACE_TOP);
        vtx(x + 1, ne, y, x, y, FACE_TOP);
        vtx(x + 1, se, y + 1, x, y, FACE_TOP);
        vtx(x, nw, y, x, y, FACE_TOP);
        vtx(x + 1, se, y + 1, x, y, FACE_TOP);
        vtx(x, sw, y + 1, x, y, FACE_TOP);
      } else {
        vtx(x, nw, y, x, y, FACE_TOP);
        vtx(x + 1, ne, y, x, y, FACE_TOP);
        vtx(x, sw, y + 1, x, y, FACE_TOP);
        vtx(x + 1, ne, y, x, y, FACE_TOP);
        vtx(x + 1, se, y + 1, x, y, FACE_TOP);
        vtx(x, sw, y + 1, x, y, FACE_TOP);
      }

      // Flancs : arête est et arête sud (et bords du monde à l'ouest / au nord).
      side(x + 1, y, x + 1, y + 1, ne, se, x, y, corner(x + 1, y, 0), corner(x + 1, y, 2), x + 1, y);
      side(x, y + 1, x + 1, y + 1, sw, se, x, y, corner(x, y + 1, 0), corner(x, y + 1, 1), x, y + 1);
      if (x === 0) side(x, y, x, y + 1, nw, sw, x, y, OUTSIDE, OUTSIDE, -1, y);
      if (y === 0) side(x, y, x + 1, y, nw, ne, x, y, OUTSIDE, OUTSIDE, x, -1);
    }
  }
  return new Float32Array(out);
}

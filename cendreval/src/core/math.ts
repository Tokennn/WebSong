/**
 * Une case ASCII est plus haute que large. Toutes les distances "visuelles"
 * (rayons, portées, vitesses) sont exprimées en largeurs de case : on multiplie
 * l'axe vertical par ASPECT pour qu'un cercle du monde paraisse rond à l'écran.
 */
export const ASPECT = 1.4;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Distance visuelle entre deux points du monde (en largeurs de case). */
export function vdist(dx: number, dy: number): number {
  return Math.hypot(dx, dy * ASPECT);
}

/** Direction normalisée dans l'espace visuel, de (ax, ay) vers (bx, by). */
export function vdir(ax: number, ay: number, bx: number, by: number): { x: number; y: number; d: number } {
  const dx = bx - ax;
  const dy = (by - ay) * ASPECT;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d, d };
}

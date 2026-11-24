import { ASPECT } from '../core/math';
import type { World } from '../world/World';

/**
 * Déplace une entité avec collision par axe (glisse le long des murs).
 * dx et dyVisual sont en largeurs de case ; l'axe vertical est converti en cases.
 * `avoidSafe` : les monstres ne pénètrent pas dans les villages.
 */
export function moveEntity(e: { x: number; y: number }, dx: number, dyVisual: number, world: World, avoidSafe: boolean): boolean {
  const dy = dyVisual / ASPECT;
  let moved = false;
  if (dx && !blocked(world, e.x + dx, e.y, avoidSafe)) {
    e.x += dx;
    moved = true;
  }
  if (dy && !blocked(world, e.x, e.y + dy, avoidSafe)) {
    e.y += dy;
    moved = true;
  }
  return moved;
}

function blocked(world: World, x: number, y: number, avoidSafe: boolean): boolean {
  if (world.solid(Math.floor(x), Math.floor(y))) return true;
  return avoidSafe && world.safeAt(x, y);
}

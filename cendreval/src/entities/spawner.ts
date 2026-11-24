import { ASPECT, vdist } from '../core/math';
import type { Rng } from '../core/rng';
import type { World, Landmark } from '../world/World';
import { T } from '../world/tiles';
import { DRAGON_NAMES } from '../world/lore';
import type { Entity } from './Entity';
import { Wolf } from './Wolf';
import { Clansman } from './Clansman';
import { Dragon } from './Dragon';

const WOLF_GROUND: ReadonlySet<number> = new Set([T.FOREST, T.DEAD, T.TALL, T.GRASS]);

/** Peuple le monde : meutes, guerriers de chaque camp, un dragon par repaire. */
export function populate(world: World, rng: Rng): Entity[] {
  const list: Entity[] = [];

  for (const camp of world.byKind('camp')) {
    for (let i = 0; i < 6; i++) {
      const p = freeSpotNear(world, rng, camp.x, camp.y, 6.5);
      if (p) list.push(makeClansman(camp, p.x, p.y, false));
    }
    list.push(makeClansman(camp, camp.x + 2, camp.y + 1, true));
  }

  world.byKind('lair').forEach((lair, i) => list.push(makeDragon(lair, DRAGON_NAMES[i % DRAGON_NAMES.length])));

  let packs = 0;
  for (let tries = 0; tries < 6000 && packs < 46; tries++) {
    const x = rng.int(10, world.w - 10) + 0.5;
    const y = rng.int(10, world.h - 10) + 0.5;
    if (!WOLF_GROUND.has(world.tile(Math.floor(x), Math.floor(y)))) continue;
    if (vdist(x - world.spawn.x, y - world.spawn.y) < 34 || world.landmarkAt(x, y)) continue;
    const size = rng.int(2, 4);
    for (let k = 0; k < size; k++) {
      const p = freeSpotNear(world, rng, x, y, 3);
      if (p) list.push(makeWolf(p.x, p.y, x, y, rng.next()));
    }
    packs++;
  }
  return list;
}

function makeWolf(x: number, y: number, hx: number, hy: number, seed: number): Wolf {
  const w = new Wolf(x, y, hx, hy, seed);
  w.respawn = () => makeWolf(hx, hy, hx, hy, seed);
  return w;
}

function makeClansman(camp: Landmark, x: number, y: number, chief: boolean): Clansman {
  const c = new Clansman(x, y, camp.clan!, chief);
  c.homeX = camp.x;
  c.homeY = camp.y;
  c.respawn = () => makeClansman(camp, x, y, chief);
  return c;
}

function makeDragon(lair: Landmark, name: string): Dragon {
  const d = new Dragon(lair.x, lair.y, name);
  d.respawn = () => makeDragon(lair, name);
  return d;
}

function freeSpotNear(world: World, rng: Rng, cx: number, cy: number, r: number): { x: number; y: number } | null {
  for (let i = 0; i < 30; i++) {
    const x = cx + rng.range(-r, r);
    const y = cy + rng.range(-r, r) / ASPECT;
    if (!world.solid(Math.floor(x), Math.floor(y)) && !world.safeAt(x, y)) return { x, y };
  }
  return null;
}

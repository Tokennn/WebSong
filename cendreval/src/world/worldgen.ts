import { Noise2D } from '../core/noise';
import { ASPECT, smoothstep, vdist } from '../core/math';
import { Rng, hash2 } from '../core/rng';
import { World } from './World';
import { T, isBuilt, isWater } from './tiles';
import { CLANS, LAIR_NAMES, TOWER_NAMES, VILLAGE_NAMES } from './lore';

export const WORLD_SIZE = 320;

/**
 * Génère un monde complet à partir d'une graine :
 * relief et humidité → biomes, puis villages, tours, camps de clans, repaires
 * de dragons, ruines, routes et reflets de l'eau.
 */
export function generateWorld(seed: number): World {
  const world = new World(WORLD_SIZE, WORLD_SIZE, seed);
  const rng = new Rng(seed);

  terrain(world);

  const spawn = placeSpawnVillage(world, rng);
  const villages = [spawn];
  for (let i = 1; i < 3; i++) {
    const site = findSite(world, rng, (x, y) =>
      flatLand(world, x, y, 12) && villages.every((v) => vdist(x - v.x, y - v.y) > 75),
    );
    if (site) villages.push(placeVillage(world, site.x, site.y, VILLAGE_NAMES[i]));
  }

  const towers: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const site = findSite(world, rng, (x, y) => {
      const e = world.elevAt(x, y);
      return e > 0.5 && e < 0.7 && flatLand(world, x, y, 6) && [...villages, ...towers].every((p) => vdist(x - p.x, y - p.y) > 38);
    });
    if (site) {
      towers.push(site);
      placeTower(world, site.x, site.y, TOWER_NAMES[i % TOWER_NAMES.length]);
    }
  }

  const camps: { x: number; y: number }[] = [];
  for (let i = 0; i < CLANS.length; i++) {
    const site = findSite(world, rng, (x, y) =>
      flatLand(world, x, y, 11) &&
      vdist(x - spawn.x, y - spawn.y) > 85 &&
      villages.every((v) => vdist(x - v.x, y - v.y) > 50) &&
      camps.every((c) => vdist(x - c.x, y - c.y) > 60),
    );
    if (site) {
      camps.push(site);
      placeCamp(world, site.x, site.y, i);
    }
  }

  const lairs: { x: number; y: number }[] = [];
  for (let i = 0; i < LAIR_NAMES.length; i++) {
    const site = findSite(world, rng, (x, y) =>
      world.tile(x, y) === T.ROCK &&
      countAround(world, x, y, 7, T.MOUNTAIN) > 6 &&
      vdist(x - spawn.x, y - spawn.y) > 70 &&
      lairs.every((l) => vdist(x - l.x, y - l.y) > 70),
    );
    if (site) {
      lairs.push(site);
      placeLair(world, site.x, site.y, LAIR_NAMES[i]);
    }
  }

  // Routes : du village de départ vers les autres, et chaque village vers sa tour la plus proche.
  for (const v of villages.slice(1)) road(world, spawn.x, spawn.y, v.x, v.y, 0);
  for (const v of villages) {
    const t = nearest(towers, v.x, v.y);
    if (t) road(world, v.x, v.y, t.x, t.y, 4);
  }
  const firstCamp = nearest(camps, spawn.x, spawn.y);
  if (firstCamp) road(world, spawn.x, spawn.y, firstCamp.x, firstCamp.y, 14);

  for (let i = 0; i < 18; i++) {
    const site = findSite(world, rng, (x, y) => flatLand(world, x, y, 4) && !world.landmarkAt(x, y), 600);
    if (site) placeRuin(world, rng, site.x, site.y);
  }

  computeReflections(world);
  return world;
}

// ---------------------------------------------------------------- relief

function terrain(world: World): void {
  const { w, h, seed } = world;
  const n1 = world.noise;
  const n2 = new Noise2D(seed ^ 0x5bd1e995);
  const n3 = new Noise2D(seed + 77);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x / w - 0.5, y / h - 0.5) * 2;
      let e = (n1.fbm(x / 70, y / 70, 5) - 0.5) * 1.9 + 0.5;
      e += (n2.fbm(x / 20, y / 20, 3) - 0.5) * 0.22;
      e -= smoothstep(0.6, 1.02, d) * 0.8;
      e += 0.05;
      const m = (n3.fbm(x / 55, y / 55, 4) - 0.5) * 1.9 + 0.5;
      const r = hash2(x, y, seed);
      const i = y * w + x;
      world.elev[i] = e;
      world.vari[i] = Math.floor(r * 256);
      world.tiles[i] = pickTile(e, m, r, n1.value(x / 6 + 300, y / 6));
    }
  }
}

function pickTile(e: number, m: number, r: number, detail: number): number {
  if (e < 0.3) return T.DEEP;
  if (e < 0.355) return T.WATER;
  if (e < 0.38) return T.MUD;
  if (e > 0.76) return T.MOUNTAIN;
  if (e > 0.68) return T.ROCK;
  if (m > 0.62) return r < 0.8 ? T.FOREST : T.TALL;
  if (m > 0.53) return r < 0.16 ? T.FOREST : T.TALL;
  if (m < 0.34) return r < 0.012 ? T.BONES : T.DEAD;
  return detail > 0.62 ? T.TALL : T.GRASS;
}

// ---------------------------------------------------------------- outils

/** Parcourt les cases d'un disque visuel (rond à l'écran). d = distance au centre. */
function disk(cx: number, cy: number, r: number, fn: (x: number, y: number, d: number) => void): void {
  const ry = Math.ceil(r / ASPECT) + 1;
  const rx = Math.ceil(r) + 1;
  const fx = Math.floor(cx);
  const fy = Math.floor(cy);
  for (let y = fy - ry; y <= fy + ry; y++) {
    for (let x = fx - rx; x <= fx + rx; x++) {
      const d = vdist(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) fn(x, y, d);
    }
  }
}

function flatLand(world: World, x: number, y: number, r: number): boolean {
  const e = world.elevAt(x, y);
  if (e < 0.4 || e > 0.67) return false;
  let ok = true;
  disk(x + 0.5, y + 0.5, r, (tx, ty) => {
    const t = world.tile(tx, ty);
    if (isWater(t) || t === T.MOUNTAIN || isBuilt(t) || t === T.FLOOR) ok = false;
  });
  return ok;
}

function countAround(world: World, x: number, y: number, r: number, tile: number): number {
  let n = 0;
  disk(x + 0.5, y + 0.5, r, (tx, ty) => {
    if (world.tile(tx, ty) === tile) n++;
  });
  return n;
}

function findSite(world: World, rng: Rng, ok: (x: number, y: number) => boolean, tries = 4000): { x: number; y: number } | null {
  const m = 22;
  for (let i = 0; i < tries; i++) {
    const x = rng.int(m, world.w - m);
    const y = rng.int(m, world.h - m);
    if (ok(x, y)) return { x, y };
  }
  return null;
}

function nearest<P extends { x: number; y: number }>(list: P[], x: number, y: number): P | null {
  let best: P | null = null;
  let bd = Infinity;
  for (const p of list) {
    const d = vdist(p.x - x, p.y - y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

// ---------------------------------------------------------------- lieux

function placeSpawnVillage(world: World, rng: Rng): { x: number; y: number } {
  const c = world.w / 2;
  for (let spread = 20; spread < world.w / 2; spread += 10) {
    for (let i = 0; i < 300; i++) {
      const x = Math.floor(c + rng.range(-spread, spread));
      const y = Math.floor(c + rng.range(-spread, spread) / ASPECT);
      if (flatLand(world, x, y, 12)) {
        const v = placeVillage(world, x, y, VILLAGE_NAMES[0]);
        world.spawn = { x: x + 0.5, y: y + 2.5 };
        return v;
      }
    }
  }
  // Repli improbable : on force un village au centre.
  const v = placeVillage(world, c, c, VILLAGE_NAMES[0]);
  world.spawn = { x: c + 0.5, y: c + 2.5 };
  return v;
}

function placeVillage(world: World, cx: number, cy: number, name: string): { x: number; y: number } {
  const ox = cx + 0.5;
  const oy = cy + 0.5;
  disk(ox, oy, 11, (x, y, d) => {
    const t = world.tile(x, y);
    if (isWater(t)) world.set(x, y, T.MUD);
    else world.set(x, y, d < 3.5 ? T.ROAD : hash2(x, y, 3) < 0.15 ? T.TALL : T.GRASS);
  });
  world.set(cx, cy, T.FIRE);
  world.lights.push({ x: ox, y: oy, radius: 13, color: [255, 170, 90] });
  // Angles décalés de 54° : le sud reste libre entre deux maisons (sortie de la place).
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + (54 * Math.PI) / 180;
    const hx = Math.round(ox + Math.cos(a) * 7.2 - 2.5);
    const hy = Math.round(oy + (Math.sin(a) * 7.2) / ASPECT - 1.5);
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        world.set(hx + dx, hy + dy, dy === 2 ? (dx === 2 ? T.FLOOR : T.WALL) : T.ROOF);
      }
    }
  }
  world.landmarks.push({ kind: 'village', name, x: ox, y: oy, radius: 12 });
  return { x: cx, y: cy };
}

/** Tour : anneau de pierre statique, envahi par endroits de mousse qui bouge au vent. */
function placeTower(world: World, cx: number, cy: number, name: string): void {
  const ox = cx + 0.5;
  const oy = cy + 0.5;
  disk(ox, oy, 6.2, (x, y, d) => {
    const t = world.tile(x, y);
    if (d > 4.6) {
      if (isWater(t) || t === T.MOUNTAIN) world.set(x, y, T.ROCK);
      return;
    }
    const dx = x + 0.5 - ox;
    const dy = y + 0.5 - oy;
    if (d >= 3.2) {
      if (dy > 0 && Math.abs(dx) < 1.2) {
        world.set(x, y, T.FLOOR); // porte au sud
        return;
      }
      const moss = world.noise.value(x * 0.55 + 40, y * 0.55) + hash2(x, y, 7) * 0.35 > 0.72;
      world.set(x, y, moss ? T.MOSS_WALL : T.WALL);
    } else {
      world.set(x, y, hash2(x, y, 9) < 0.18 ? T.TALL : T.FLOOR);
    }
  });
  world.landmarks.push({ kind: 'tower', name, x: ox, y: oy, radius: 6.5 });
}

function placeCamp(world: World, cx: number, cy: number, clanIndex: number): void {
  const clan = CLANS[clanIndex];
  world.campClans.push(clan);
  const meta = world.campClans.length;
  const ox = cx + 0.5;
  const oy = cy + 0.5;
  disk(ox, oy, 11, (x, y, d) => {
    if (world.inside(x, y)) world.meta[y * world.w + x] = meta;
    const t = world.tile(x, y);
    if (d > 9.6) {
      if (isWater(t)) world.set(x, y, T.MUD);
      return;
    }
    const dy = (y + 0.5 - oy) * ASPECT;
    if (d >= 8.6) {
      world.set(x, y, Math.abs(dy) < 1.6 ? T.SCORCHED : T.PALISADE); // portes est et ouest
      return;
    }
    world.set(x, y, hash2(x, y, 4) < 0.05 ? T.BONES : T.SCORCHED);
  });
  world.set(cx, cy, T.FIRE);
  world.lights.push({ x: ox, y: oy, radius: 12, color: [255, 120, 60] });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI / 5;
    const tx = Math.round(ox + Math.cos(a) * 5.4 - 1.5);
    const ty = Math.round(oy + (Math.sin(a) * 5.4) / ASPECT);
    world.set(tx, ty, T.TENT);
    world.set(tx + 1, ty, T.TENT);
    world.set(tx + 2, ty, T.TENT);
    world.set(tx + 1, ty - 1, T.TENT);
  }
  for (const side of [-1, 1]) {
    for (const row of [-2, 2]) {
      const bx = Math.round(ox + side * 10.4);
      const by = Math.round(oy + row);
      world.set(bx, by, T.BANNER);
      if (world.inside(bx, by)) world.meta[by * world.w + bx] = meta;
    }
  }
  world.landmarks.push({ kind: 'camp', name: `Camp ${articleDe(clan.name)}`, x: ox, y: oy, radius: 13, clan });
}

function articleDe(name: string): string {
  if (name.startsWith('les ')) return `des ${name.slice(4)}`;
  if (name.startsWith('le ')) return `du ${name.slice(3)}`;
  if (name.startsWith('la ')) return `de la ${name.slice(3)}`;
  return `de ${name}`;
}

function placeLair(world: World, cx: number, cy: number, name: string): void {
  disk(cx + 0.5, cy + 0.5, 5.5, (x, y) => {
    if (world.tile(x, y) === T.MOUNTAIN) return;
    world.set(x, y, hash2(x, y, 11) < 0.14 ? T.BONES : T.SCORCHED);
  });
  world.landmarks.push({ kind: 'lair', name, x: cx + 0.5, y: cy + 0.5, radius: 14 });
}

function placeRuin(world: World, rng: Rng, cx: number, cy: number): void {
  const horizontal = rng.chance(0.5);
  const len = rng.int(3, 8);
  for (let i = 0; i < len; i++) {
    const x = horizontal ? cx + i : cx;
    const y = horizontal ? cy : cy + i;
    if (rng.chance(0.25) || world.tile(x, y) === T.ROAD) continue;
    world.set(x, y, rng.chance(0.5) ? T.MOSS_WALL : T.WALL);
  }
  for (let i = 0; i < 3; i++) {
    const x = cx + rng.int(-3, 3);
    const y = cy + rng.int(-2, 2);
    const t = world.tile(x, y);
    if (!isBuilt(t) && !isWater(t)) world.set(x, y, T.BONES);
  }
}

/** Route gloutonne : avance vers la cible en évitant montagnes et constructions, ponts sur l'eau. */
function road(world: World, ax: number, ay: number, bx: number, by: number, stopShort: number): void {
  let x = Math.floor(ax);
  let y = Math.floor(ay);
  const visited = new Set<number>();
  for (let step = 0; step < 2500; step++) {
    if (vdist(bx - x, by - y) <= stopShort + 1) break;
    const t = world.tile(x, y);
    if (isWater(t)) world.set(x, y, T.BRIDGE);
    else if (!isBuilt(t) && t !== T.MOUNTAIN && t !== T.FLOOR) world.set(x, y, T.ROAD);
    visited.add(y * world.w + x);

    let best: { x: number; y: number } | null = null;
    let bestCost = Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!world.inside(nx, ny) || visited.has(ny * world.w + nx)) continue;
        const nt = world.tile(nx, ny);
        let cost = vdist(bx - nx, by - ny);
        if (nt === T.MOUNTAIN) cost += 40;
        else if (isBuilt(nt)) cost += 60;
        else if (nt === T.DEEP) cost += 3;
        else if (nt === T.WATER) cost += 1.5;
        if (dx && dy) cost += 0.35;
        cost += hash2(nx, ny, world.seed + 5) * 0.9;
        if (cost < bestCost) {
          bestCost = cost;
          best = { x: nx, y: ny };
        }
      }
    }
    if (!best) break;
    x = best.x;
    y = best.y;
  }
}

function computeReflections(world: World): void {
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      if (!isWater(world.tile(x, y))) continue;
      for (let k = 1; k <= 9; k++) {
        if (!isWater(world.tile(x, y - k))) {
          world.reflect[y * world.w + x] = k;
          break;
        }
      }
    }
  }
}

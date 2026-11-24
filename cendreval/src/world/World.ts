import { Noise2D } from '../core/noise';
import { vdist } from '../core/math';
import type { RGB } from '../render/color';
import { T, TILE_INFO, isWater } from './tiles';
import { BIOME_NAMES, type Clan } from './lore';

export type LandmarkKind = 'village' | 'camp' | 'tower' | 'lair';

export interface Landmark {
  kind: LandmarkKind;
  name: string;
  x: number;
  y: number;
  /** Rayon visuel de la zone (en largeurs de case). */
  radius: number;
  clan?: Clan;
  visited?: boolean;
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: RGB;
}

/** Données du monde : grilles de cases + points d'intérêt. Aucune logique de rendu ici. */
export class World {
  readonly tiles: Uint8Array;
  readonly elev: Float32Array;
  /** Valeur aléatoire figée par case : choisit le glyphe "statique". */
  readonly vari: Uint8Array;
  /** Indice (+1) du camp propriétaire d'une case, pour colorer tentes et bannières. */
  readonly meta: Uint8Array;
  /** Pour l'eau : distance jusqu'à la rive au nord (0 = pas de reflet). */
  readonly reflect: Int8Array;
  readonly noise: Noise2D;
  readonly landmarks: Landmark[] = [];
  readonly lights: LightSource[] = [];
  /** Clan de chaque camp, dans l'ordre de `meta` (meta = indice + 1). */
  readonly campClans: Clan[] = [];
  spawn = { x: 0, y: 0 };
  onTileChange: ((x: number, y: number) => void) | null = null;

  constructor(
    readonly w: number,
    readonly h: number,
    readonly seed: number,
  ) {
    const n = w * h;
    this.tiles = new Uint8Array(n);
    this.elev = new Float32Array(n);
    this.vari = new Uint8Array(n);
    this.meta = new Uint8Array(n);
    this.reflect = new Int8Array(n);
    this.noise = new Noise2D(seed);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  tile(x: number, y: number): number {
    return this.inside(x, y) ? this.tiles[y * this.w + x] : T.DEEP;
  }

  set(x: number, y: number, t: number): void {
    if (this.inside(x, y)) this.tiles[y * this.w + x] = t;
  }

  /** Modification en cours de partie (feu de dragon…) : prévient la minimap. */
  change(x: number, y: number, t: number): void {
    if (!this.inside(x, y) || this.tile(x, y) === t) return;
    this.set(x, y, t);
    this.onTileChange?.(x, y);
  }

  elevAt(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.elev[y * this.w + x];
  }

  solid(x: number, y: number): boolean {
    return TILE_INFO[this.tile(x, y)].solid;
  }

  speedAt(x: number, y: number): number {
    return TILE_INFO[this.tile(x, y)].speed;
  }

  byKind(kind: LandmarkKind): Landmark[] {
    return this.landmarks.filter((l) => l.kind === kind);
  }

  /** Les villages sont des sanctuaires : les monstres n'y entrent pas. */
  safeAt(x: number, y: number): boolean {
    for (const l of this.landmarks) {
      if (l.kind === 'village' && vdist(x - l.x, y - l.y) < l.radius) return true;
    }
    return false;
  }

  landmarkAt(x: number, y: number): Landmark | null {
    let best: Landmark | null = null;
    let bestD = Infinity;
    for (const l of this.landmarks) {
      const d = vdist(x - l.x, y - l.y);
      if (d < l.radius && d < bestD) {
        best = l;
        bestD = d;
      }
    }
    return best;
  }

  /** Nom du lieu : point d'intérêt proche, sinon biome dominant autour. */
  regionName(x: number, y: number): { name: string; landmark: Landmark | null } {
    const lm = this.landmarkAt(x, y);
    if (lm) return { name: lm.name, landmark: lm };
    const counts: Record<string, number> = {};
    for (let dy = -3; dy <= 3; dy += 1.5) {
      for (let dx = -4; dx <= 4; dx += 2) {
        const b = biomeOf(this.tile(Math.floor(x + dx), Math.floor(y + dy)));
        counts[b] = (counts[b] ?? 0) + 1;
      }
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { name: BIOME_NAMES[top], landmark: null };
  }
}

function biomeOf(t: number): string {
  if (isWater(t)) return 'water';
  switch (t) {
    case T.FOREST:
      return 'forest';
    case T.DEAD:
    case T.BONES:
    case T.SCORCHED:
      return 'dead';
    case T.ROCK:
    case T.MOUNTAIN:
      return 'rock';
    case T.MUD:
      return 'mud';
    case T.ROAD:
    case T.BRIDGE:
      return 'road';
    default:
      return 'grass';
  }
}

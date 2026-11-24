import type { RGB } from '../render/color';

/** Identifiants des cases du monde (stockés dans un Uint8Array). */
export const T = {
  DEEP: 0,
  WATER: 1,
  MUD: 2,
  GRASS: 3,
  TALL: 4,
  FOREST: 5,
  DEAD: 6,
  BONES: 7,
  ROCK: 8,
  MOUNTAIN: 9,
  ROAD: 10,
  BRIDGE: 11,
  WALL: 12,
  MOSS_WALL: 13,
  FLOOR: 14,
  ROOF: 15,
  TENT: 16,
  PALISADE: 17,
  FIRE: 18,
  BANNER: 19,
  SCORCHED: 20,
} as const;

export type TileId = (typeof T)[keyof typeof T];

export interface TileInfo {
  name: string;
  solid: boolean;
  /** Multiplicateur de vitesse pour qui marche dessus. */
  speed: number;
  /** Couleur sur la minimap. */
  mini: RGB;
}

const info = (name: string, mini: RGB, solid = false, speed = 1): TileInfo => ({ name, mini, solid, speed });

export const TILE_INFO: readonly TileInfo[] = [
  info('eau profonde', [14, 26, 48], true),
  info('eau', [30, 56, 88], false, 0.55),
  info('boue', [64, 54, 38], false, 0.8),
  info('herbe', [44, 72, 38]),
  info('hautes herbes', [54, 88, 44], false, 0.92),
  info('forêt', [24, 50, 28], false, 0.75),
  info('lande', [78, 68, 52]),
  info('ossements', [150, 140, 120]),
  info('roche', [86, 86, 92], false, 0.9),
  info('montagne', [128, 122, 120], true),
  info('route', [128, 104, 70], false, 1.12),
  info('pont', [118, 86, 52], false, 1.05),
  info('mur', [160, 160, 170], true),
  info('mur moussu', [96, 128, 74], true),
  info('dallage', [96, 86, 70]),
  info('toit', [138, 60, 42], true),
  info('tente', [124, 94, 62], true),
  info('palissade', [102, 74, 46], true),
  info('feu', [255, 170, 60], true),
  info('bannière', [200, 60, 50], true),
  info('terre brûlée', [68, 38, 32]),
];

export const isWater = (t: number): boolean => t === T.DEEP || t === T.WATER;
export const isBuilt = (t: number): boolean =>
  t === T.WALL || t === T.MOSS_WALL || t === T.ROOF || t === T.TENT || t === T.PALISADE || t === T.FIRE || t === T.BANNER;
export const isVegetation = (t: number): boolean => t === T.GRASS || t === T.TALL || t === T.FOREST;

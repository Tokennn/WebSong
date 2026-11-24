import { ASPECT, clamp } from '../core/math';
import { hash2 } from '../core/rng';
import type { RGB } from '../render/color';
import { CANOPY, GRASS_LOW, MOSS, ROCK, STONE, rampChar } from '../render/glyphs';
import type { World } from './World';
import { T } from './tiles';

/**
 * "Comportements de symboles" : chaque matière choisit ses glyphes à sa façon.
 *  - pierre  : glyphe dense figé par case (ne bouge jamais)
 *  - herbe, mousse : glyphe qui suit le vent (vague + rafales)
 *  - feuillage : densité suivant un bruit, pour lire des couronnes d'arbres
 *  - eau : reflète ce qu'il y a sur la rive au nord, avec une ondulation
 *  - feu : scintille et émet sa propre lumière
 * Les couleurs données ici sont "en pleine lumière" ; GameScene applique l'éclairage.
 */
export interface Shade {
  ch: string;
  r: number;
  g: number;
  b: number;
  emissive: boolean;
}

export const newShade = (): Shade => ({ ch: ' ', r: 0, g: 0, b: 0, emissive: false });

function put(o: Shade, ch: string, r: number, g: number, b: number, emissive = false): void {
  o.ch = ch;
  o.r = r;
  o.g = g;
  o.b = b;
  o.emissive = emissive;
}

/** Vent : une vague qui traverse la carte + des rafales lentes. ≈ [-0.7, 1.8]. */
export function windAt(w: World, x: number, y: number, t: number): number {
  const base = Math.sin(x * 0.32 + y * 0.11 - t * 2.1 + w.noise.value(x * 0.08, y * 0.08) * 4);
  const gust = Math.max(0, Math.sin((x * 0.7 + y * 0.3) * 0.05 - t * 0.9)) * 1.1;
  return base * 0.7 + gust;
}

/** Éclairage du relief : lumière venant du nord-ouest. */
function slope(w: World, x: number, y: number): number {
  return (w.elevAt(x - 1, y - 1) - w.elevAt(x + 1, y + 1)) * 7;
}

const NO_CLAN: RGB = [120, 96, 70];

function clanColor(w: World, x: number, y: number, banner: boolean): RGB {
  const m = w.inside(x, y) ? w.meta[y * w.w + x] : 0;
  const clan = m ? w.campClans[m - 1] : undefined;
  if (!clan) return NO_CLAN;
  return banner ? clan.banner : clan.color;
}

function stone(o: Shade, v: number): void {
  const c = 110 + 60 * ((v >> 4) / 15);
  put(o, STONE[v % STONE.length], c, c, c + 12);
}

/**
 * `fine` (0..255) remplace la variation figée de la case : en 3D, une case proche
 * de la caméra couvre plusieurs glyphes, et ce petit hash "collé à la surface" les varie.
 */
export function shadeTile(w: World, x: number, y: number, t: number, o: Shade, reflected = false, fine = -1): void {
  const tile = w.tile(x, y);
  const v = fine >= 0 ? fine : w.inside(x, y) ? w.vari[y * w.w + x] : (x * 7 + y * 13) & 255;
  const vk = (v & 15) / 15;

  switch (tile) {
    case T.GRASS: {
      const b = windAt(w, x, y, t);
      if (b > 0.55) put(o, v & 1 ? '/' : ',', 64 + 34 * b, 112 + 34 * b, 54);
      else if (b < -0.5) put(o, v & 1 ? '\\' : '`', 50, 90, 44);
      else put(o, GRASS_LOW[v % GRASS_LOW.length], 40 + 20 * vk, 74 + 28 * vk, 38 + 10 * vk);
      return;
    }
    case T.TALL: {
      const b = windAt(w, x, y, t);
      const ch = b > 0.35 ? '/' : b < -0.35 ? '\\' : v % 7 === 0 ? '"' : '|';
      const hi = b > 0.85 ? 34 : 0;
      put(o, ch, 60 + 26 * vk + hi, 108 + 32 * vk + hi, 46);
      return;
    }
    case T.FOREST: {
      // Couronnes d'arbres : le cœur est dense, les bords s'aèrent, les creux restent sombres.
      const crown = w.noise.value(x * 0.5 + 11, y * 0.5 * ASPECT);
      const sway = windAt(w, x, y, t) * 0.06;
      const l = clamp(crown * 1.15 - 0.1 + sway + (vk - 0.5) * 0.12, 0, 1);
      put(o, rampChar(l, CANOPY), 18 + 52 * l, 46 + 86 * l, 26 + 30 * l);
      return;
    }
    case T.DEAD:
      put(o, v % 19 === 0 ? 'v' : ",.'`;"[v % 5], 82 + 30 * vk, 70 + 24 * vk, 54 + 16 * vk);
      return;
    case T.BONES:
      put(o, v & 1 ? '%' : 'x', 206, 198, 172);
      return;
    case T.MUD:
      put(o, '.:,~'[v % 4], 76 + 16 * vk, 62 + 12 * vk, 42 + 8 * vk);
      return;
    case T.ROCK: {
      const l = clamp(0.4 + slope(w, x, y), 0, 1);
      const k = 0.6 + l * 0.7;
      put(o, rampChar(l * 0.8 + vk * 0.2, ROCK), 96 * k, 96 * k, 104 * k);
      return;
    }
    case T.MOUNTAIN: {
      const l = clamp(0.45 + slope(w, x, y), 0, 1);
      const k = 0.45 + l * 0.8;
      if (w.elevAt(x, y) > 0.88) put(o, l > 0.5 ? '^' : '*', 200 * k, 206 * k, 224 * k);
      else put(o, rampChar(l, ' .^/A#M@'), 122 * k, 114 * k, 110 * k);
      return;
    }
    case T.ROAD:
      put(o, '.:·.'[v % 4], 130 + 22 * vk, 106 + 16 * vk, 72 + 10 * vk);
      return;
    case T.BRIDGE:
      put(o, '=', 124, 90, 56);
      return;
    case T.WALL:
      stone(o, v);
      return;
    case T.MOSS_WALL: {
      // Deux comportements sur la même case : pierre figée, ou mousse qui ondule.
      const moss = w.noise.value(x * 0.7 + 3, y * 0.7);
      if (moss > 0.48) {
        const b = windAt(w, x, y, t);
        const ch = b > 0.5 ? '/' : b < -0.4 ? '\\' : MOSS[v % MOSS.length];
        put(o, ch, 70 + 34 * moss, 122 + 44 * moss, 52);
      } else stone(o, v);
      return;
    }
    case T.FLOOR:
      put(o, '._,·'[v % 4], 94 + 20 * vk, 84 + 16 * vk, 70 + 12 * vk);
      return;
    case T.ROOF:
      put(o, y & 1 ? '=' : '#', 136 + 30 * vk, 56 + 14 * vk, 40 + 8 * vk);
      return;
    case T.TENT: {
      const c = clanColor(w, x, y, false);
      put(o, (x + y) & 1 ? '^' : 'A', c[0] * 0.8 + 30, c[1] * 0.8 + 24, c[2] * 0.8 + 16);
      return;
    }
    case T.PALISADE:
      put(o, '|!I|'[v % 4], 110 + 20 * vk, 80 + 14 * vk, 50 + 8 * vk);
      return;
    case T.FIRE: {
      const f = hash2(x, y, Math.floor(t * 12));
      put(o, f < 0.33 ? '^' : f < 0.66 ? '*' : '"', 255, 140 + 90 * f, 40 + 40 * f, !reflected);
      return;
    }
    case T.BANNER: {
      const c = clanColor(w, x, y, true);
      put(o, ['¶', 'P', 'q', '¶'][(Math.floor(t * 4) + v) & 3], c[0], c[1], c[2]);
      return;
    }
    case T.SCORCHED: {
      if (hash2(x, y, Math.floor(t * 2)) < 0.012) put(o, '*', 255, 120, 40, true);
      else put(o, ",.;:'"[v % 5], 76 + 14 * vk, 44 + 10 * vk, 34 + 6 * vk);
      return;
    }
    default:
      water(w, x, y, t, o, tile === T.DEEP, v, reflected);
  }
}

function water(w: World, x: number, y: number, t: number, o: Shade, deep: boolean, v: number, reflected: boolean): void {
  const k = reflected || !w.inside(x, y) ? 0 : w.reflect[y * w.w + x];
  if (k > 0 && k <= 8) {
    // Reflet : la rive au nord, retournée, assombrie et teintée de bleu.
    const rx = x + Math.round(Math.sin(y * 0.9 + t * 1.7) * 0.6);
    shadeTile(w, rx, y - 2 * k + 1, t, o, true);
    const fade = 1 - k / 12;
    o.r = o.r * 0.55 * fade + 14;
    o.g = o.g * 0.65 * fade + 26;
    o.b = o.b * 0.8 * fade + 52;
    o.emissive = false;
    if (o.ch === ' ' || hash2(x, y, Math.floor(t * 3)) < 0.08) o.ch = '~';
    return;
  }
  const wave = Math.sin(x * 0.45 + y * 1.2 + t * 1.5 + w.noise.value(x * 0.1, y * 0.1) * 5);
  if (deep) put(o, wave > 0.7 ? '~' : wave > 0.2 ? '-' : v % 5 === 0 ? '.' : ' ', 40, 70, 122);
  else put(o, wave > 0.6 ? '~' : wave > 0 ? '-' : '.', 60, 104, 150);
}

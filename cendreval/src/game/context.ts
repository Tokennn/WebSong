import type { Input } from '../core/input';
import type { Rng } from '../core/rng';
import type { RGB } from '../render/color';
import type { World } from '../world/World';
import type { Entity } from '../entities/Entity';
import type { Player } from '../entities/Player';
import type { Fx } from '../fx/Fx';

export type LogTone = 'info' | 'danger' | 'loot' | 'lore';

/** Ce que les entités et les effets peuvent lire ou déclencher pendant une image. */
export interface GameContext {
  world: World;
  player: Player;
  entities: Entity[];
  fx: Fx;
  input: Input;
  rng: Rng;
  time: number;
  log(message: string, tone?: LogTone): void;
}

export interface PutOptions {
  /** Ignore l'éclairage (feu, yeux qui brillent, texte). */
  emissive?: boolean;
  /** Luminosité minimale (un dragon dans le ciel reste visible). */
  minLight?: number;
}

/**
 * Sprite dessiné en formes 2D puis converti en glyphes (voir SpriteRaster).
 * Repère local en largeurs de case, ancré aux pieds (ou au centre pour un volant),
 * y vers le bas : un personnage de 3 cases de haut va de y = -3 à y = 0.
 * L'échelle suit la caméra : plus on zoome, plus il a de glyphes.
 */
export interface SpriteSpec {
  /** Boîte englobante du dessin (unités locales). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  draw(ctx: CanvasRenderingContext2D): void;
  ramp?: string;
  gain?: number;
  jitter?: (x: number, y: number) => number;
  /** Luminosité minimale (un dragon dans le ciel reste visible). */
  minLight?: number;
  /** Touché : la silhouette vire au blanc. */
  flash?: boolean;
  /** Points qui brillent dans le noir (yeux) : position locale, glyphe, couleur. */
  glow?: { x: number; y: number; ch: string; color: RGB }[];
}

/** Surface de dessin en coordonnées du monde : convertit en cases d'écran et applique la lumière. */
export interface View {
  sprite(spec: SpriteSpec): void;
  put(wx: number, wy: number, ch: string, color: RGB, opts?: PutOptions): void;
  text(wx: number, wy: number, s: string, color: RGB, emissive?: boolean): void;
  centerText(wx: number, wy: number, s: string, color: RGB, emissive?: boolean): void;
}

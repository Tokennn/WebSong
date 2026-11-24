import { vdir } from '../core/math';
import type { RGB } from '../render/color';
import type { GameContext, View } from '../game/context';
import { moveEntity } from './physics';

export type Faction = 'hero' | 'beast' | 'clan' | 'dragon';

export const WHITE: RGB = [255, 255, 255];

/** Base commune : position, vie, recul, clignotement quand on est touché. */
export abstract class Entity {
  hp: number;
  alive = true;
  hitFlash = 0;
  facing: 1 | -1 = 1;
  /** Rayon de la "boîte de coup" en largeurs de case. */
  radius = 0.5;
  /** Haut du sprite au-dessus de son ancre (largeurs de case) : on y pose le nom. */
  spriteTop = 2.6;
  homeX: number;
  homeY: number;
  /** Fabrique une remplaçante après la mort ; null = ne revient pas. */
  respawn: (() => Entity) | null = null;
  respawnDelay = 90;

  abstract readonly xp: number;
  abstract readonly label: string;

  protected kbx = 0;
  protected kby = 0;
  protected knockback = 7;
  protected bloodColor: RGB = [150, 24, 20];
  /** Les volants ignorent les collisions. */
  protected flying = false;

  constructor(
    public x: number,
    public y: number,
    public maxHp: number,
    readonly faction: Faction,
  ) {
    this.hp = maxHp;
    this.homeX = x;
    this.homeY = y;
  }

  get hostile(): boolean {
    return this.faction !== 'hero';
  }

  abstract update(dt: number, g: GameContext): void;
  abstract draw(v: View, t: number): void;

  hurt(dmg: number, from: { x: number; y: number } | null, g: GameContext): void {
    if (!this.alive) return;
    this.hp -= dmg;
    this.hitFlash = 0.14;
    if (from) {
      const d = vdir(from.x, from.y, this.x, this.y);
      this.kbx = d.x * this.knockback;
      this.kby = d.y * this.knockback;
    }
    // Le sang gicle dans le sens du coup, plus fort pour un coup lourd.
    const dir = from ? vdir(from.x, from.y, this.x, this.y) : { x: Math.random() - 0.5, y: Math.random() - 0.5 };
    const n = Math.round(Math.min(26, 6 + (dmg / this.maxHp) * 40));
    g.fx.blood(this.x, this.y, this.bloodColor, dir.x, dir.y, n, this.spriteTop * 0.5);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      if (!this.flying) {
        g.fx.blood(this.x, this.y, this.bloodColor, dir.x, dir.y, 18, this.spriteTop * 0.35);
        g.fx.pool(this.x, this.y, this.bloodColor, this.radius * 1.8 + 0.5);
      }
      this.onDeath(g);
    }
  }

  protected onDeath(_g: GameContext): void {}

  /** À appeler en début d'update : clignotement + recul amorti. */
  protected tick(dt: number, g: GameContext): void {
    this.hitFlash -= dt;
    if (Math.abs(this.kbx) + Math.abs(this.kby) > 0.05) {
      if (this.flying) {
        this.x += this.kbx * dt;
        this.y += this.kby * dt;
      } else {
        moveEntity(this, this.kbx * dt, this.kby * dt, g.world, this.hostile);
      }
      const damp = Math.max(0, 1 - dt * 10);
      this.kbx *= damp;
      this.kby *= damp;
    }
  }

  protected tint(c: RGB): RGB {
    return this.hitFlash > 0 ? WHITE : c;
  }
}

import { vdist, vdir } from '../core/math';
import { computeStats, type Appearance, type Stats } from '../character/appearance';
import { HERO_CENTER_X, HERO_FEET_Y, drawHero } from '../character/portrait';
import type { Kills, Progress } from '../character/storage';
import type { GameContext, View } from '../game/context';
import { Entity } from './Entity';
import { moveEntity } from './physics';

/**
 * Hauteur du cadre du héros en jeu, en cases. La silhouette (de la tête aux semelles)
 * en occupe 88 % : environ 3 cases, comme un guerrier de clan.
 */
const HERO_H = 3.4;
const HERO_K = HERO_H / HERO_FEET_Y;

export function xpForLevel(level: number): number {
  return Math.round(40 * level ** 1.45);
}

export class Player extends Entity {
  readonly xp = 0;
  readonly label: string;
  stats: Stats;
  level = 1;
  exp = 0;
  kills: Kills = { beast: 0, clan: 0, dragon: 0 };
  dirX = 1;
  dirY = 0;
  moving = false;

  private atkCd = 0;
  private swing = 0;
  private walkT = 0;
  /** 0 = de trois quarts face, 1 = de profil : suit la direction de la marche. */
  private turn = 0.15;
  private sinceHurt = 10;
  private invuln = 0;

  constructor(
    x: number,
    y: number,
    readonly app: Appearance,
    progress?: Progress,
  ) {
    super(x, y, computeStats(app).maxHp, 'hero');
    this.label = app.name;
    this.stats = computeStats(app);
    this.knockback = 3;
    this.spriteTop = HERO_H * 0.88 + 0.3;
    if (progress) {
      for (let l = 1; l < progress.level; l++) this.levelUpStats();
      this.level = progress.level;
      this.exp = progress.xp;
      this.kills = { ...progress.kills };
      this.hp = this.maxHp;
    }
  }

  get xpNext(): number {
    return xpForLevel(this.level);
  }

  update(dt: number, g: GameContext): void {
    this.tick(dt, g);
    if (!this.alive) return;
    this.atkCd -= dt;
    this.swing -= dt;
    this.invuln -= dt;
    this.sinceHurt += dt;

    const a = g.input.axis();
    this.moving = Math.hypot(a.x, a.y) > 0.05;
    if (this.moving) {
      const l = Math.hypot(a.x, a.y);
      this.dirX = a.x / l;
      this.dirY = a.y / l;
      if (Math.abs(a.x) > 0.1) this.facing = a.x > 0 ? 1 : -1;
      const sp = this.stats.speed * g.world.speedAt(Math.floor(this.x), Math.floor(this.y));
      moveEntity(this, a.x * sp * dt, a.y * sp * dt, g.world, false);
      this.walkT += dt;
    }
    const turnTo = this.moving ? Math.min(1, Math.abs(this.dirX) * 1.15) : 0.15;
    this.turn += (turnTo - this.turn) * (1 - Math.exp(-dt * 10));

    if (g.input.attack() && this.atkCd <= 0) this.attack(g);

    // Récupération : lente hors combat, rapide près d'un feu sacré.
    if (this.sinceHurt > 5) this.hp = Math.min(this.maxHp, this.hp + 3 * dt);
    const fire = g.world.byKind('village').find((v) => vdist(this.x - v.x, this.y - v.y) < 5);
    if (fire && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 16 * dt);
  }

  private attack(g: GameContext): void {
    this.atkCd = 0.36;
    this.swing = 0.16;
    const reach = 2.4;
    for (const e of g.entities) {
      if (!e.alive || !e.hostile) continue;
      const d = vdir(this.x, this.y, e.x, e.y);
      if (d.d > reach + e.radius) continue;
      const dot = d.x * this.dirX + d.y * this.dirY;
      if (dot < -0.15 && d.d > 1.2 + e.radius) continue;
      const crit = g.rng.chance(0.12);
      const dmg = Math.round(this.stats.atk * g.rng.range(0.85, 1.2) * (crit ? 1.8 : 1));
      e.hurt(dmg, this, g);
      g.fx.number(e.x, e.y - 1.5, dmg, crit ? [255, 220, 80] : [255, 255, 255]);
      if (!e.alive) this.onKill(e, g);
    }
    g.fx.slash(this.x, this.y, this.dirX, this.dirY);
  }

  private onKill(e: Entity, g: GameContext): void {
    if (e.faction === 'beast') this.kills.beast++;
    else if (e.faction === 'clan') this.kills.clan++;
    else if (e.faction === 'dragon') this.kills.dragon++;
    g.log(`${e.label} est terrassé. +${e.xp} XP`, e.faction === 'dragon' ? 'loot' : 'info');
    this.gainXp(e.xp, g);
  }

  gainXp(n: number, g: GameContext): void {
    this.exp += n;
    while (this.exp >= this.xpNext) {
      this.exp -= this.xpNext;
      this.level++;
      this.levelUpStats();
      this.hp = this.maxHp;
      g.log(`Niveau ${this.level} ! PV +12, ATQ +2.`, 'loot');
      g.fx.burst(this.x, this.y, [255, 210, 120], 18);
    }
  }

  private levelUpStats(): void {
    this.maxHp += 12;
    this.stats = { ...this.stats, maxHp: this.maxHp, atk: this.stats.atk + 2 };
  }

  override hurt(dmg: number, from: { x: number; y: number } | null, g: GameContext): void {
    if (this.invuln > 0 || !this.alive) return;
    const real = Math.max(1, Math.round(dmg * (100 / (100 + this.stats.def * 9))));
    super.hurt(real, from, g);
    this.invuln = 0.3;
    this.sinceHurt = 0;
    g.fx.number(this.x, this.y - 1.5, real, [255, 90, 80]);
    if (!this.alive) g.log('Tu t’effondres dans la cendre…', 'danger');
  }

  revive(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.hp = this.maxHp;
    this.exp = Math.floor(this.exp / 2);
    this.invuln = 2;
  }

  draw(v: View, t: number): void {
    if (!this.alive) {
      // Le héros tombé : une forme couchée dans une flaque sombre.
      v.sprite({
        x0: -1.8,
        x1: 1.8,
        y0: -0.8,
        y1: 0.2,
        draw: (ctx) => {
          ctx.fillStyle = 'rgba(90,14,12,0.85)';
          ctx.beginPath();
          ctx.ellipse(0, -0.12, 1.6, 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = this.app.colors.outfit;
          ctx.beginPath();
          ctx.ellipse(-0.1, -0.3, 1.1, 0.26, 0.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = this.app.colors.skin;
          ctx.beginPath();
          ctx.arc(1.1, -0.36, 0.22, 0, Math.PI * 2);
          ctx.fill();
        },
      });
      return;
    }
    const blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
    if (blink) return;
    const f = this.facing;
    const pose = {
      walk: this.walkT * 9,
      moving: this.moving,
      swing: Math.max(0, this.swing / 0.16),
      back: this.dirY < -0.55,
      turn: this.turn,
    };
    v.sprite({
      x0: -1.9,
      x1: 1.9,
      // Marge au-dessus de la tête : l'épée passe par-dessus l'épaule.
      y0: -(HERO_H + 0.6),
      y1: 0.15,
      flash: this.hitFlash > 0,
      draw: (ctx) => {
        ctx.scale(f * HERO_K, HERO_K);
        ctx.translate(-HERO_CENTER_X, -HERO_FEET_Y);
        drawHero(ctx, this.app, t, pose);
      },
    });
  }
}

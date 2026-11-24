import { ASPECT, vdist } from '../core/math';
import type { RGB } from '../render/color';
import { lineChar } from '../render/glyphs';
import type { GameContext, View } from '../game/context';
import { T, isVegetation } from '../world/tiles';

export interface Particle {
  x: number;
  y: number;
  /** Vitesse en largeurs de case / s (espace visuel). */
  vx: number;
  vy: number;
  life: number;
  max: number;
  ch: string;
  color: RGB;
  emissive: boolean;
  /** Dégâts infligés au héros au contact (une seule fois). */
  harm: number;
  hit: boolean;
  drag: number;
  gravity: number;
  fire: boolean;
  text: boolean;
}

const FIRE_HOT: RGB = [255, 230, 120];
const FIRE_MID: RGB = [255, 140, 40];
const FIRE_COLD: RGB = [170, 40, 20];

/** Particules : coups d'épée, sang, nombres de dégâts, souffle de dragon, cendres. */
export class Fx {
  readonly list: Particle[] = [];

  add(p: Partial<Particle> & { x: number; y: number }): void {
    const life = p.life ?? 1;
    this.list.push({
      vx: 0,
      vy: 0,
      ch: '.',
      color: [255, 255, 255],
      emissive: false,
      harm: 0,
      hit: false,
      drag: 0,
      gravity: 0,
      fire: false,
      text: false,
      ...p,
      life,
      max: life,
    });
  }

  update(dt: number, g: GameContext): void {
    const pl = g.player;
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.fire) this.ignite(g, p.x, p.y);
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += (p.vy * dt) / ASPECT;
      if (p.fire) {
        const k = p.life / p.max;
        p.ch = k > 0.7 ? '@' : k > 0.45 ? '#' : k > 0.2 ? '*' : '.';
        p.color = k > 0.6 ? FIRE_HOT : k > 0.3 ? FIRE_MID : FIRE_COLD;
      }
      if (p.harm > 0 && !p.hit && pl.alive && vdist(p.x - pl.x, p.y - pl.y) < 1) {
        p.hit = true;
        pl.hurt(p.harm, null, g);
      }
    }
  }

  draw(v: View): void {
    for (const p of this.list) {
      // Positions continues : de près, une case couvre plusieurs glyphes.
      if (p.text) v.centerText(p.x, p.y, p.ch, p.color, true);
      else v.put(p.x - 0.5, p.y - 0.5, p.ch, p.color, { emissive: p.emissive });
    }
  }

  /** Arc de lame devant le héros : chaque trait suit la tangente de l'arc. */
  slash(x: number, y: number, dx: number, dy: number, color: RGB = [255, 240, 200]): void {
    for (let i = 0; i < 9; i++) {
      const a = ((-72 + i * 18) * Math.PI) / 180;
      const rx = dx * Math.cos(a) - dy * Math.sin(a);
      const ry = dx * Math.sin(a) + dy * Math.cos(a);
      for (const rad of [1.7, 2.2]) {
        this.add({
          x: x + rx * rad,
          y: y + (ry * rad) / ASPECT,
          ch: lineChar(-ry, rx),
          color,
          emissive: true,
          life: 0.09 + i * 0.015,
        });
      }
    }
  }

  number(x: number, y: number, n: number, color: RGB): void {
    this.add({ x, y, ch: String(n), color, text: true, emissive: true, vy: -3, drag: 2, life: 0.8 });
  }

  blood(x: number, y: number, color: RGB): void {
    for (let i = 0; i < 7; i++) {
      this.add({ x, y, ch: ".,'`"[i % 4], color, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.8) * 9, gravity: 14, drag: 3, life: 0.45 + Math.random() * 0.25 });
    }
  }

  burst(x: number, y: number, color: RGB, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 6;
      this.add({ x, y, ch: '*', color, emissive: true, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3, life: 0.5 + Math.random() * 0.4 });
    }
  }

  fire(x: number, y: number, vx: number, vy: number, life: number): void {
    this.add({ x, y, vx, vy, life, fire: true, emissive: true, harm: 5, drag: 1.2, ch: '@', color: FIRE_HOT });
  }

  ember(x: number, y: number): void {
    this.add({ x, y, ch: Math.random() < 0.3 ? '*' : '.', color: [255, 150, 60], emissive: true, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, life: 1 + Math.random() });
  }

  ash(x: number, y: number): void {
    this.add({ x, y, ch: Math.random() < 0.5 ? '.' : '`', color: [150, 144, 138], vx: 1.4 + Math.random(), vy: 0.6 + Math.random() * 0.6, life: 3 + Math.random() * 2 });
  }

  /** Le feu du dragon laisse des traces : l'herbe touchée devient terre brûlée. */
  private ignite(g: GameContext, x: number, y: number): void {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (isVegetation(g.world.tile(tx, ty)) && g.rng.chance(0.3)) g.world.change(tx, ty, T.SCORCHED);
  }
}

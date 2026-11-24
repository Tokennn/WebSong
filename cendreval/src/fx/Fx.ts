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
  /** Hauteur au-dessus du sol (cases) ; absente : à hauteur de poitrine. */
  z?: number;
  vz: number;
  /** Goutte de sang : retombe sous la gravité et tache le sol où elle atterrit. */
  drop: boolean;
}

/** Tache de sang au sol : quelques gouttes elliptiques, qui s'étalent puis sèchent. */
export interface Stain {
  x: number;
  y: number;
  dots: { dx: number; dy: number; r: number }[];
  color: RGB;
  age: number;
  life: number;
  /** Durée d'étalement (flaque sous un corps), 0 = immédiat. */
  grow: number;
}

/** Sang séché : brun presque noir. */
export const DRIED: RGB = [62, 18, 14];
const MAX_STAINS = 360;
const GRAVITY_Z = 22;

const FIRE_HOT: RGB = [255, 230, 120];
const FIRE_MID: RGB = [255, 140, 40];
const FIRE_COLD: RGB = [170, 40, 20];

/** Particules : coups d'épée, sang, nombres de dégâts, souffle de dragon, cendres. */
export class Fx {
  readonly list: Particle[] = [];
  readonly stains: Stain[] = [];

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
      vz: 0,
      drop: false,
      ...p,
      life,
      max: life,
    });
  }

  update(dt: number, g: GameContext): void {
    const pl = g.player;
    const list = this.list;
    const st = this.stains;
    for (let i = st.length - 1; i >= 0; i--) {
      st[i].age += dt;
      if (st[i].age > st[i].life) st.splice(i, 1);
    }
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
      if (p.drop && p.z !== undefined) {
        p.vz -= GRAVITY_Z * dt;
        p.z += p.vz * dt;
        if (p.z <= 0) {
          this.splat(p.x, p.y, p.vx, p.vy, p.color, 0.07 + Math.random() * 0.07);
          list[i] = list[list.length - 1];
          list.pop();
          continue;
        }
        // Traînée dans le sens du mouvement à l'écran (la hauteur fait monter la goutte).
        const sx = p.vx;
        const sy = p.vy * 0.55 - p.vz;
        p.ch = Math.hypot(sx, sy) > 4 ? lineChar(sx, sy) : p.vz < 0 ? ',' : '.';
      }
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
      else v.put(p.x - 0.5, p.y - 0.5, p.ch, p.color, { emissive: p.emissive, h: p.z });
    }
  }

  /** Arc de lame devant le héros : chaque trait suit la tangente de l'arc. */
  slash(x: number, y: number, dx: number, dy: number, color: RGB = [255, 240, 200]): void {
    for (let i = 0; i < 17; i++) {
      const a = ((-72 + i * 9) * Math.PI) / 180;
      const rx = dx * Math.cos(a) - dy * Math.sin(a);
      const ry = dx * Math.sin(a) + dy * Math.cos(a);
      for (const rad of [1.6, 1.95, 2.3]) {
        this.add({
          x: x + rx * rad,
          y: y + (ry * rad) / ASPECT,
          ch: lineChar(-ry, rx),
          color,
          emissive: true,
          life: 0.09 + i * 0.008,
        });
      }
    }
  }

  number(x: number, y: number, n: number, color: RGB): void {
    this.add({ x, y, ch: String(n), color, text: true, emissive: true, vy: -3, drag: 2, life: 0.8 });
  }

  /**
   * Gerbe de sang : des gouttes partent du point d'impact (hauteur `h`) dans le sens
   * du coup (dx, dy), retombent en arc et tachent le sol là où elles atterrissent ;
   * une fine bruine rouge reste un instant en l'air.
   */
  blood(x: number, y: number, color: RGB, dx: number, dy: number, n: number, h = 1.1): void {
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < n; i++) {
      const a = base + (Math.random() - 0.5) * 1.5;
      const sp = 2.5 + Math.random() * 6;
      const k = 0.65 + Math.random() * 0.55;
      this.add({
        x: x + Math.cos(a) * 0.25,
        y: y + Math.sin(a) * 0.18,
        z: h * (0.8 + Math.random() * 0.4),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 1.2 + Math.random() * 4,
        drag: 1.4,
        drop: true,
        ch: '.',
        color: [color[0] * k, color[1] * k, color[2] * k],
        life: 3,
      });
    }
    for (let i = 0; i < Math.ceil(n / 2); i++) {
      const a = base + (Math.random() - 0.5) * 2;
      const sp = 1 + Math.random() * 3;
      this.add({
        x,
        y,
        z: h,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        drag: 6,
        ch: Math.random() < 0.5 ? '.' : ':',
        color: [color[0] * 0.7, color[1] * 0.6, color[2] * 0.6],
        life: 0.12 + Math.random() * 0.18,
      });
    }
  }

  /** Goutte qui tombe d'une blessure (héros mal en point). */
  drip(x: number, y: number, color: RGB, h: number): void {
    this.add({ x: x + (Math.random() - 0.5) * 0.4, y, z: h, vz: -0.5, drop: true, ch: '.', color, life: 2 });
  }

  /** Impact d'une goutte : une tache, et quelques éclaboussures dans le sens de sa course. */
  splat(x: number, y: number, vx: number, vy: number, color: RGB, r: number): void {
    const dots = [{ dx: 0, dy: 0, r }];
    const l = Math.hypot(vx, vy);
    if (l > 1.5) {
      const ux = vx / l;
      const uy = vy / l;
      const m = 1 + Math.floor(Math.random() * 3);
      for (let i = 1; i <= m; i++) {
        const d = r * (1.6 + i * 1.3) * Math.min(2, l / 4);
        dots.push({ dx: ux * d + (Math.random() - 0.5) * r, dy: uy * d + (Math.random() - 0.5) * r, r: r * (0.75 - i * 0.15) });
      }
    }
    this.addStain({ x, y, dots, color, age: 0, life: 60 + Math.random() * 20, grow: 0 });
  }

  /** Flaque qui s'étale lentement sous un corps. */
  pool(x: number, y: number, color: RGB, size: number): void {
    const dots = [{ dx: 0, dy: 0, r: size * 0.62 }];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.6;
      const d = size * (0.3 + Math.random() * 0.35);
      dots.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8, r: size * (0.28 + Math.random() * 0.22) });
    }
    this.addStain({ x, y, dots, color, age: 0, life: 110, grow: 4 });
  }

  private addStain(s: Stain): void {
    if (this.stains.length >= MAX_STAINS) this.stains.shift();
    this.stains.push(s);
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

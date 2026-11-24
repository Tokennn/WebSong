import { ASPECT, vdist, vdir } from '../core/math';
import type { RGB } from '../render/color';
import type { Clan } from '../world/lore';
import type { GameContext, View } from '../game/context';
import { Entity } from './Entity';
import { moveEntity } from './physics';

const TAU = Math.PI * 2;
const css = (c: RGB, k = 1): string => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;

/** Guerrier d'un clan : patrouille autour de son camp, appelle ses frères quand il est blessé. */
export class Clansman extends Entity {
  readonly xp: number;
  readonly label: string;
  private state: 'patrol' | 'chase' | 'return' = 'patrol';
  private tx: number;
  private ty: number;
  private think = 0;
  private atkCd = 0;
  private walkT = 0;
  private moving = false;
  private alert = 0;
  private strike = 0;
  private dirY = 0;
  private readonly dmg: [number, number];
  private readonly speed: number;

  constructor(
    x: number,
    y: number,
    readonly clan: Clan,
    readonly chief: boolean,
  ) {
    super(x, y, chief ? 110 : 36, 'clan');
    this.label = chief ? `Chef ${clan.member}` : clan.member;
    this.xp = chief ? 80 : 26;
    this.dmg = chief ? [12, 16] : [7, 10];
    this.speed = chief ? 4.6 : 5.1;
    this.tx = x;
    this.ty = y;
    this.radius = 0.6;
    this.respawnDelay = chief ? 180 : 100;
    this.spriteTop = chief ? 3.7 : 3.3;
  }

  update(dt: number, g: GameContext): void {
    this.tick(dt, g);
    if (!this.alive) return;
    this.atkCd -= dt;
    this.think -= dt;
    this.alert -= dt;
    this.strike = Math.max(0, this.strike - dt / 0.3);
    const p = g.player;
    const toP = vdir(this.x, this.y, p.x, p.y);
    const fromHome = vdist(this.x - this.homeX, this.y - this.homeY);
    const playerSafe = g.world.safeAt(p.x, p.y);

    if (this.state !== 'return' && p.alive && !playerSafe && (toP.d < 9 || this.alert > 0)) this.state = 'chase';
    if (this.state === 'chase' && (!p.alive || playerSafe || fromHome > 24 || (toP.d > 15 && this.alert <= 0))) this.state = 'return';
    if (this.state === 'return' && fromHome < 4) this.state = 'patrol';

    let dir = { x: 0, y: 0 };
    let speed = 0;
    if (this.state === 'chase') {
      if (toP.d > 1.5) {
        dir = toP;
        speed = this.speed;
      } else if (this.atkCd <= 0) {
        this.atkCd = this.chief ? 1.4 : 1.2;
        this.strike = 1;
        p.hurt(g.rng.int(this.dmg[0], this.dmg[1]), this, g);
        g.fx.slash(this.x, this.y, toP.x, toP.y, [255, 150, 120]);
      }
    } else if (this.state === 'return') {
      dir = vdir(this.x, this.y, this.homeX, this.homeY);
      speed = this.speed * 0.8;
    } else {
      if (this.think <= 0) {
        this.think = g.rng.range(2.5, 6);
        this.tx = this.homeX + g.rng.range(-6, 6);
        this.ty = this.homeY + g.rng.range(-6, 6) / ASPECT;
      }
      const d = vdir(this.x, this.y, this.tx, this.ty);
      if (d.d > 0.8) {
        dir = d;
        speed = 1.8;
      }
    }

    this.moving = speed > 0;
    if (this.moving) {
      const sp = speed * g.world.speedAt(Math.floor(this.x), Math.floor(this.y));
      if (!moveEntity(this, dir.x * sp * dt, dir.y * sp * dt, g.world, true)) this.think = 0;
      this.walkT += dt;
      if (Math.abs(dir.x) > 0.15) this.facing = dir.x > 0 ? 1 : -1;
      this.dirY = dir.y;
    } else if (this.state === 'chase') this.dirY = toP.y;
  }

  override hurt(dmg: number, from: { x: number; y: number } | null, g: GameContext): void {
    super.hurt(dmg, from, g);
    // Le cri d'alerte : tout le camp proche se lance à la poursuite.
    for (const e of g.entities) {
      if (e instanceof Clansman && e.clan === this.clan && vdist(e.x - this.x, e.y - this.y) < 14) e.alert = 8;
    }
  }

  draw(v: View, t: number): void {
    const H = this.chief ? 3.4 : 3.0;
    const k = H / 50;
    const f = this.facing;
    const pose = {
      walk: this.walkT * 8,
      moving: this.moving,
      strike: this.strike,
      back: this.dirY < -0.6 && this.moving,
    };
    v.sprite({
      x0: -2,
      x1: 2,
      y0: -(H + 0.5),
      y1: 0.15,
      flash: this.hitFlash > 0,
      draw: (ctx) => {
        ctx.scale(f * k, k);
        drawWarrior(ctx, t, this.clan, this.chief, pose);
      },
    });
  }

  protected override onDeath(g: GameContext): void {
    g.fx.burst(this.x, this.y, this.clan.banner, 10);
    if (this.chief) g.log(`Le chef ${articleOf(this.clan.name)} tombe. Le camp vacille.`, 'loot');
  }
}

function articleOf(name: string): string {
  if (name.startsWith('les ')) return `des ${name.slice(4)}`;
  if (name.startsWith('le ')) return `du ${name.slice(3)}`;
  return `de ${name}`;
}

/**
 * Guerrier de clan, de face (ou de dos), pieds en y = 0, environ 50 unités de haut.
 * Manteau de fourrure, tunique aux couleurs du clan, bouclier peint, hache.
 */
function drawWarrior(
  ctx: CanvasRenderingContext2D,
  t: number,
  clan: Clan,
  chief: boolean,
  pose: { walk: number; moving: boolean; strike: number; back: boolean },
): void {
  const { walk, moving, strike, back } = pose;
  const tunic = clan.color;
  const banner = clan.banner;
  const skin = '#b98a68';
  const furC: RGB = chief ? [196, 182, 150] : [138, 120, 96];
  const lift = [moving ? Math.max(0, Math.sin(walk)) * 3.4 : 0, moving ? Math.max(0, -Math.sin(walk)) * 3.4 : 0];
  const bob = moving ? -Math.abs(Math.sin(walk)) * 0.9 : Math.sin(t * 1.5) * 0.25;

  // Jambes bandées de cuir, bottes de fourrure.
  for (const [i, x] of [[0, -4.4], [1, 0.8]] as const) {
    const g = ctx.createLinearGradient(x, -20, x + 3.6, -2);
    g.addColorStop(0, '#6a4f38');
    g.addColorStop(1, '#2c2018');
    ctx.fillStyle = g;
    ctx.fillRect(x, -20, 3.6, 18 - lift[i]);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 0.35;
    for (let y = -17; y < -5 - lift[i]; y += 2.2) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3.6, y + 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = css(furC, 0.7);
    ctx.beginPath();
    ctx.roundRect(x - 0.6, -5.2 - lift[i], 4.8, 5.2, 1.2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(0, bob);

  // Bouclier dans le dos (vue de dos) : on le pose avant le corps de face.
  const shield = (sx: number, sy: number, r: number): void => {
    const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.35, 0.3, sx, sy, r);
    g.addColorStop(0, css(banner, 1.25));
    g.addColorStop(1, css(banner, 0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1c';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.5;
    for (const a of [0, Math.PI / 2]) {
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      ctx.lineTo(sx - Math.cos(a) * r, sy - Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = '#c8ccd2';
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.25, 0, TAU);
    ctx.fill();
  };

  // Tunique et jupe crénelée.
  const tg = ctx.createLinearGradient(-8, -36, 7, -14);
  tg.addColorStop(0, css(tunic, 1.45));
  tg.addColorStop(0.5, css(tunic, 0.95));
  tg.addColorStop(1, css(tunic, 0.4));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-7.6, -35);
  ctx.lineTo(7.6, -35);
  ctx.lineTo(6.2, -20);
  for (let x = 6.4; x >= -6.4; x -= 1.6) ctx.lineTo(x, -14.5 - (Math.round(x / 1.6) & 1 ? 1.2 : 0));
  ctx.lineTo(-6.2, -20);
  ctx.closePath();
  ctx.fill();
  // Ceinture et boucle.
  ctx.fillStyle = '#24180f';
  ctx.fillRect(-6.6, -21.4, 13.2, 1.8);
  ctx.fillStyle = chief ? '#e0b44a' : '#9a8a70';
  ctx.fillRect(-1, -21.6, 2, 2.2);

  if (back) shield(0, -27, 6.2);

  // Bras nus : la hache à droite (avant de l'image), le bouclier à gauche.
  const arm = (side: number): { hx: number; hy: number } => {
    const swingY = moving ? side * Math.sin(walk) * 1.4 : 0;
    const hx = side * 9.6;
    const hy = -21 + swingY;
    const g = ctx.createLinearGradient(side * 7, -34, side * 10, -20);
    g.addColorStop(0, side < 0 ? '#d6a684' : skin);
    g.addColorStop(1, '#6e4a36');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(side * 7, -34.5);
    ctx.lineTo(side * 9.8, -33.5);
    ctx.lineTo(side * 10.8, hy);
    ctx.lineTo(side * 8.4, hy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3b2a1e';
    ctx.fillRect(side > 0 ? 8.2 : -11, hy - 5, 2.8, 3.2);
    return { hx, hy };
  };
  const left = arm(-1);
  if (!back) shield(left.hx - 1.2, left.hy - 3, 5.4);

  // Manteau de fourrure sur les épaules, en mèches.
  const fur = ctx.createLinearGradient(0, -40, 0, -31);
  fur.addColorStop(0, css(furC, 1.25));
  fur.addColorStop(1, css(furC, 0.55));
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-10, -33);
  for (let x = -10; x <= 10; x += 1.25) ctx.lineTo(x, -31.2 - (Math.round(x * 4) % 2 ? 0 : 1.6));
  ctx.lineTo(10, -33);
  ctx.quadraticCurveTo(8, -38.5, 0, -38.5);
  ctx.quadraticCurveTo(-8, -38.5, -10, -33);
  ctx.closePath();
  ctx.fill();

  // Tête : visage barbu, ou nuque vue de dos.
  const hy = -42.5;
  if (back) {
    ctx.fillStyle = '#3a2618';
    ctx.beginPath();
    ctx.arc(0, hy, 4.4, 0, TAU);
    ctx.fill();
  } else {
    const face = ctx.createRadialGradient(-1.4, hy - 1.4, 0.4, 0, hy, 5);
    face.addColorStop(0, '#e0b090');
    face.addColorStop(1, '#6e4a36');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, hy, 4.2, 0, TAU);
    ctx.fill();
    // Peintures de guerre aux couleurs du clan.
    ctx.fillStyle = css(banner, 0.9);
    ctx.fillRect(-3.2, hy - 0.6, 6.4, 0.9);
    ctx.fillStyle = '#120c08';
    ctx.fillRect(-2.2, hy - 0.4, 1.2, 0.8);
    ctx.fillRect(1.0, hy - 0.4, 1.2, 0.8);
    // Barbe tressée.
    const beard = ctx.createLinearGradient(0, hy + 1, 0, hy + 8);
    beard.addColorStop(0, '#5a3a22');
    beard.addColorStop(1, '#2a1a10');
    ctx.fillStyle = beard;
    ctx.beginPath();
    ctx.moveTo(-3.8, hy + 0.8);
    ctx.quadraticCurveTo(-3, hy + 6, 0, hy + 8.2);
    ctx.quadraticCurveTo(3, hy + 6, 3.8, hy + 0.8);
    ctx.quadraticCurveTo(0, hy + 3.2, -3.8, hy + 0.8);
    ctx.fill();
  }
  // Casque de fer à nasal ; le chef porte cornes et bandeau d'or.
  const metal = ctx.createLinearGradient(-5, hy - 6, 5, hy);
  metal.addColorStop(0, '#c4cad2');
  metal.addColorStop(1, '#30343a');
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.ellipse(0, hy - 0.8, 4.7, 4.4, 0, Math.PI, TAU);
  ctx.fill();
  if (!back) ctx.fillRect(-0.45, hy - 1.2, 0.9, 3.4);
  if (chief) {
    ctx.fillStyle = '#e0b44a';
    ctx.fillRect(-4.8, hy - 1.6, 9.6, 1.2);
    const bone = ctx.createLinearGradient(0, hy - 14, 0, hy - 2);
    bone.addColorStop(0, '#f2e8cc');
    bone.addColorStop(1, '#8a7a5c');
    ctx.fillStyle = bone;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 3.8, hy - 2.6);
      ctx.quadraticCurveTo(s * 9.5, hy - 3, s * 9.2, hy - 10);
      ctx.quadraticCurveTo(s * 8.2, hy - 5, s * 3.2, hy - 0.8);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Bras droit et hache : levée puis abattue quand il frappe.
  const right = arm(1);
  ctx.save();
  ctx.translate(right.hx, right.hy);
  // Angle du manche (0 = droit vers le haut) : derrière la tête, par-dessus, puis vers l'avant.
  const a = strike > 0 ? -0.8 + (1 - strike) * 3.0 : -0.25 + (moving ? Math.sin(walk) * 0.12 : 0);
  ctx.rotate(a);
  ctx.strokeStyle = '#5a3c24';
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -14);
  ctx.stroke();
  const blade = ctx.createLinearGradient(0, -15, 6, -9);
  blade.addColorStop(0, '#eef2f6');
  blade.addColorStop(1, '#565e68');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, -13.5);
  ctx.quadraticCurveTo(5.5, -16, 6.4, -11);
  ctx.quadraticCurveTo(5, -7.8, 0, -9.5);
  ctx.closePath();
  ctx.fill();
  if (chief) {
    ctx.beginPath();
    ctx.moveTo(0, -13.5);
    ctx.quadraticCurveTo(-4.5, -15.5, -5.2, -11);
    ctx.quadraticCurveTo(-4, -8.4, 0, -9.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (strike > 0.2) {
    ctx.strokeStyle = `rgba(255,190,150,${strike * 0.6})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(right.hx, right.hy, 13, -0.8 - Math.PI / 2, a - Math.PI / 2);
    ctx.stroke();
  }
  ctx.restore();
}

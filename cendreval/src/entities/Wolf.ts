import { ASPECT, vdist, vdir } from '../core/math';
import type { RGB } from '../render/color';
import { hash2 } from '../core/rng';
import type { GameContext, View } from '../game/context';
import { Entity } from './Entity';
import { moveEntity } from './physics';

const EYES: RGB = [255, 60, 40];
const TAU = Math.PI * 2;

/** Chien-loup : chasse en meute, n'entre pas dans les villages, revient à sa tanière. */
export class Wolf extends Entity {
  readonly xp = 14;
  readonly label = 'Chien-loup';
  private state: 'wander' | 'chase' | 'return' = 'wander';
  private tx: number;
  private ty: number;
  private think = 0;
  private atkCd = 0;
  private walkT = 0;
  private moving = false;
  private lunge = 0;
  /** Décalage autour de la proie : la meute encercle au lieu de s'empiler. */
  private readonly flank: number;
  /** Pelage propre à chaque bête : du gris cendre au brun roux. */
  private readonly coat: number;

  constructor(x: number, y: number, homeX: number, homeY: number, seed: number) {
    super(x, y, 24, 'beast');
    this.homeX = homeX;
    this.homeY = homeY;
    this.tx = x;
    this.ty = y;
    this.radius = 0.7;
    this.flank = seed * Math.PI * 2;
    this.coat = hash2(Math.floor(seed * 1e4), 7, 3);
    this.respawnDelay = 70;
    this.spriteTop = 2.1;
  }

  update(dt: number, g: GameContext): void {
    this.tick(dt, g);
    if (!this.alive) return;
    this.atkCd -= dt;
    this.think -= dt;
    this.lunge = Math.max(0, this.lunge - dt * 4);
    const p = g.player;
    const toP = vdir(this.x, this.y, p.x, p.y);
    const fromHome = vdist(this.x - this.homeX, this.y - this.homeY);
    const playerSafe = g.world.safeAt(p.x, p.y);

    if (this.state !== 'return' && p.alive && toP.d < 10 && !playerSafe) this.state = 'chase';
    if (this.state === 'chase' && (toP.d > 16 || !p.alive || fromHome > 32 || playerSafe)) this.state = 'return';
    if (this.state === 'return' && fromHome < 6) this.state = 'wander';

    let dir = { x: 0, y: 0 };
    let speed = 0;
    if (this.state === 'chase') {
      if (toP.d > 1.4) {
        const ox = toP.d > 3 ? Math.cos(this.flank) * 1.2 : 0;
        const oy = toP.d > 3 ? (Math.sin(this.flank) * 1.2) / ASPECT : 0;
        dir = vdir(this.x, this.y, p.x + ox, p.y + oy);
        speed = 6.2;
      } else if (this.atkCd <= 0) {
        this.atkCd = 1.05;
        this.lunge = 1;
        p.hurt(g.rng.int(4, 7), this, g);
      }
    } else if (this.state === 'return') {
      dir = vdir(this.x, this.y, this.homeX, this.homeY);
      speed = 4.5;
    } else {
      if (this.think <= 0) {
        this.think = g.rng.range(2, 5);
        this.tx = this.homeX + g.rng.range(-8, 8);
        this.ty = this.homeY + g.rng.range(-8, 8) / ASPECT;
      }
      const d = vdir(this.x, this.y, this.tx, this.ty);
      if (d.d > 0.8) {
        dir = d;
        speed = 2.2;
      }
    }

    this.moving = speed > 0;
    if (this.moving) {
      const sp = speed * g.world.speedAt(Math.floor(this.x), Math.floor(this.y));
      if (!moveEntity(this, dir.x * sp * dt, dir.y * sp * dt, g.world, true)) this.think = 0;
      this.walkT += dt;
      if (Math.abs(dir.x) > 0.15) this.facing = dir.x > 0 ? 1 : -1;
    }
  }

  draw(v: View, t: number): void {
    const f = this.facing;
    const phase = this.walkT * (this.state === 'chase' ? 13 : 9);
    const run = this.moving && this.state === 'chase';
    const lunge = this.lunge;
    const coat = this.coat;
    v.sprite({
      x0: -2.4,
      x1: 2.4,
      y0: -2.1,
      y1: 0.15,
      flash: this.hitFlash > 0,
      draw: (ctx) => {
        ctx.scale(f, 1);
        drawWolf(ctx, t, phase, this.moving, run, lunge, coat);
      },
      glow: [{ x: f * (1.33 + lunge * 0.3), y: -1.38 + lunge * 0.12, ch: '•', color: EYES }],
    });
  }

}

/** Chien-loup de profil, tête vers la droite, pattes au sol en y = 0 (largeurs de case). */
function drawWolf(ctx: CanvasRenderingContext2D, t: number, phase: number, moving: boolean, run: boolean, lunge: number, coat: number): void {
  const base = [118 + coat * 40, 108 + coat * 18, 98 - coat * 16];
  const fur = (k: number, a = 1): string => `rgba(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0},${a})`;
  const stride = run ? 0.75 : 0.45;
  const bob = moving ? Math.abs(Math.sin(phase)) * (run ? 0.12 : 0.05) : Math.sin(t * 2) * 0.015;

  ctx.save();
  // Bond : le corps file vers l'avant, l'avant se dresse.
  ctx.translate(lunge * 0.35, -bob - lunge * 0.15);
  ctx.rotate(-lunge * 0.18);

  // Pattes : diagonales opposées (trot), le côté lointain plus sombre.
  const leg = (hx: number, hy: number, a: number, k: number, back: boolean): void => {
    const knee = back ? 0.32 : 0.36;
    const kx = hx + Math.sin(a) * knee + (back ? -0.08 : 0.03);
    const ky = hy + Math.cos(a) * knee;
    const lift = Math.max(0, -Math.cos(a * 2.2)) * (moving ? 0.1 : 0);
    const px = kx + Math.sin(a * 1.4) * 0.34 + (back ? 0.1 : 0);
    const py = Math.min(0, ky + 0.42 - lift);
    ctx.strokeStyle = fur(k * 0.85);
    ctx.lineCap = 'round';
    ctx.lineWidth = back ? 0.24 : 0.19;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = fur(k * 0.55);
    ctx.beginPath();
    ctx.ellipse(px + 0.06, py - 0.03, 0.11, 0.06, 0, 0, TAU);
    ctx.fill();
  };
  const s = moving ? Math.sin(phase) * stride : 0;
  leg(0.55, -0.82, -s, 0.55, false);
  leg(-0.95, -0.85, s, 0.55, true);

  // Queue touffue, qui fouette en courant.
  const wag = Math.sin(t * (run ? 9 : 3)) * (run ? 0.12 : 0.18);
  const tail = ctx.createLinearGradient(-1.2, -1, -2.1, -0.6);
  tail.addColorStop(0, fur(0.9));
  tail.addColorStop(1, fur(1.35));
  ctx.strokeStyle = tail;
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(-1.15, -1.08);
  ctx.quadraticCurveTo(-1.75, -1.0 + wag, -2.05, run ? -1.05 + wag : -0.55 + wag);
  ctx.stroke();

  // Corps : dos sombre, ventre plus clair, éclairé d'en haut à gauche.
  const body = ctx.createLinearGradient(0, -1.4, 0, -0.6);
  body.addColorStop(0, fur(1.25));
  body.addColorStop(0.55, fur(0.85));
  body.addColorStop(1, fur(0.5));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0.95, -1.05);
  ctx.quadraticCurveTo(0.75, -1.42, 0.25, -1.36);
  ctx.quadraticCurveTo(-0.6, -1.3, -1.2, -1.18);
  ctx.quadraticCurveTo(-1.42, -0.95, -1.15, -0.72);
  ctx.quadraticCurveTo(-0.5, -0.62, -0.15, -0.72);
  ctx.quadraticCurveTo(0.45, -0.6, 0.9, -0.78);
  ctx.closePath();
  ctx.fill();
  // Poils hérissés sur l'échine.
  ctx.fillStyle = fur(1.15);
  for (let x = -1.05; x < 0.6; x += 0.17) {
    const y = -1.25 - (x > -0.2 ? (x + 0.2) * 0.12 : 0);
    const h = 0.12 + hash2(Math.round(x * 10), 3, 9) * 0.1 + lunge * 0.08;
    ctx.beginPath();
    ctx.moveTo(x - 0.08, y + 0.05);
    ctx.lineTo(x + 0.04, y - h);
    ctx.lineTo(x + 0.1, y + 0.05);
    ctx.fill();
  }

  // Pattes du côté proche, par-dessus le corps.
  leg(0.72, -0.85, s, 1, false);
  leg(-0.78, -0.88, -s, 1, true);

  // Cou et tête.
  const open = Math.max(lunge, run ? 0.35 + 0.25 * Math.sin(t * 8) : 0.12 + 0.1 * Math.sin(t * 3));
  ctx.save();
  ctx.translate(1.0, -1.15);
  ctx.rotate(run ? 0.12 : -0.05);
  ctx.fillStyle = fur(1.05);
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.35);
  ctx.lineTo(-0.2, -0.22);
  ctx.lineTo(0.22, -0.3);
  ctx.lineTo(0.25, 0.1);
  ctx.closePath();
  ctx.fill();
  const head = ctx.createRadialGradient(0.18, -0.3, 0.02, 0.25, -0.18, 0.45);
  head.addColorStop(0, fur(1.4));
  head.addColorStop(1, fur(0.7));
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0.25, -0.18, 0.33, 0.25, -0.1, 0, TAU);
  ctx.fill();
  // Museau et mâchoire (ouverte quand il halète ou mord).
  ctx.beginPath();
  ctx.moveTo(0.4, -0.3);
  ctx.lineTo(0.8, -0.16);
  ctx.lineTo(0.8, -0.06);
  ctx.lineTo(0.4, -0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fur(0.6);
  ctx.beginPath();
  ctx.moveTo(0.38, 0.0);
  ctx.lineTo(0.74, -0.04 + open * 0.2);
  ctx.lineTo(0.7, 0.04 + open * 0.22);
  ctx.lineTo(0.32, 0.1);
  ctx.closePath();
  ctx.fill();
  if (open > 0.2) {
    ctx.fillStyle = '#8a1e1a';
    ctx.beginPath();
    ctx.moveTo(0.42, -0.02);
    ctx.lineTo(0.76, -0.06);
    ctx.lineTo(0.72, -0.02 + open * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e2d0';
    ctx.fillRect(0.66, -0.07, 0.05, 0.06);
    ctx.fillRect(0.6, -0.02 + open * 0.16, 0.05, 0.05);
  }
  ctx.fillStyle = '#100c0a';
  ctx.beginPath();
  ctx.arc(0.8, -0.12, 0.05, 0, TAU);
  ctx.fill();
  // Oreilles dressées (couchées pendant l'attaque).
  ctx.fillStyle = fur(0.95);
  for (const dx of [0, -0.13]) {
    ctx.beginPath();
    ctx.moveTo(0.06 + dx, -0.36);
    ctx.lineTo(0.12 + dx - lunge * 0.2, -0.7 + lunge * 0.25);
    ctx.lineTo(0.24 + dx, -0.38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

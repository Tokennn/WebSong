import { ASPECT, vdir } from '../core/math';
import { hash2 } from '../core/rng';
import type { GameContext, View } from '../game/context';
import { Entity } from './Entity';

/** Échelle du dessin : une unité du dessin = SCALE largeurs de case (envergure ≈ 19 cases). */
const SCALE = 0.6;
const TAU = Math.PI * 2;
const DRAGON_RAMP = '.:-=+*xX%#&@';
/** Position de la gueule par rapport au centre (unités isotropes, avant échelle). */
const HEAD = { x: 11.5, y: -4.2 };


/**
 * Dragon : tourne autour de son repaire, fond sur le héros et crache du feu.
 * Son sprite n'est pas dessiné à la main : il est rendu en formes 2D puis
 * converti en glyphes à chaque image (ailes qui battent, queue qui ondule).
 */
export class Dragon extends Entity {
  readonly xp = 320;
  readonly label: string;
  private state: 'patrol' | 'hunt' = 'patrol';
  private angle = 0;
  private breathCd = 3;
  private breathing = 0;
  private flap = 0;
  private roared = false;

  constructor(x: number, y: number, name: string) {
    super(x, y, 300, 'dragon');
    this.label = name;
    this.radius = 3.4;
    this.knockback = 0.8;
    this.flying = true;
    this.respawnDelay = 200;
    this.bloodColor = [255, 140, 40];
    this.spriteTop = 9.5 * SCALE;
  }

  /** Ombre au sol (centre et demi-axes en cases) : décalée car le dragon vole. */
  get shadow(): { x: number; y: number; rx: number; ry: number } {
    return { x: this.x + 1.5, y: this.y + 4.5, rx: 7.5, ry: 2.2 };
  }

  update(dt: number, g: GameContext): void {
    this.tick(dt, g);
    if (!this.alive) return;
    const p = g.player;
    const toP = vdir(this.x, this.y, p.x, p.y);
    const playerSafe = g.world.safeAt(p.x, p.y);
    this.flap += dt * (this.state === 'hunt' ? 5.5 : 3.4);

    if (this.state === 'patrol' && p.alive && toP.d < 26 && !playerSafe) {
      this.state = 'hunt';
      if (!this.roared) {
        this.roared = true;
        g.log(`${this.label} fond sur toi depuis les nuages !`, 'danger');
      }
    }
    if (this.state === 'hunt' && (!p.alive || toP.d > 46 || playerSafe)) this.state = 'patrol';

    let tx: number;
    let ty: number;
    let speed: number;
    if (this.state === 'patrol') {
      this.angle += dt * 0.22;
      tx = this.homeX + Math.cos(this.angle) * 16;
      ty = this.homeY + (Math.sin(this.angle) * 16) / ASPECT;
      speed = 5;
    } else {
      const side = toP.x > 0 ? -1 : 1;
      tx = p.x + side * 20;
      ty = p.y - 3;
      speed = 7.5;
      this.breathCd -= dt;
      if (this.breathCd <= 0 && toP.d < 16) {
        this.breathing = 1.3;
        this.breathCd = g.rng.range(3.5, 5.5);
      }
    }

    const d = vdir(this.x, this.y, tx, ty);
    if (d.d > 0.5) {
      const s = Math.min(speed, d.d * 2);
      this.x += d.x * s * dt;
      this.y += (d.y * s * dt) / ASPECT;
    }
    const lookX = this.state === 'hunt' ? toP.x : d.x;
    if (Math.abs(lookX) > 0.2) this.facing = lookX > 0 ? 1 : -1;

    if (this.breathing > 0) {
      this.breathing -= dt;
      const hx = this.x + this.facing * HEAD.x * SCALE;
      const hy = this.y + (HEAD.y * SCALE) / ASPECT;
      const aim = vdir(hx, hy, p.x, p.y);
      const n = Math.ceil(70 * dt);
      for (let i = 0; i < n; i++) {
        const a = Math.atan2(aim.y, aim.x) + g.rng.range(-0.22, 0.22);
        const sp = g.rng.range(11, 15);
        g.fx.fire(hx, hy, Math.cos(a) * sp, Math.sin(a) * sp, g.rng.range(0.75, 1.1));
      }
    }
  }

  override hurt(dmg: number, from: { x: number; y: number } | null, g: GameContext): void {
    super.hurt(dmg, from, g);
    this.state = 'hunt';
  }

  draw(v: View, t: number): void {
    const f = this.facing;
    v.sprite({
      x0: -18 * SCALE,
      x1: 18 * SCALE,
      y0: -12 * SCALE,
      y1: 7 * SCALE,
      flash: this.hitFlash > 0,
      minLight: 0.75,
      draw: (ctx) => {
        ctx.scale(SCALE, SCALE);
        drawDragon(ctx, t, f, this.flap);
      },
      // Rampe courte + grain fixe : des écailles plutôt que des rangées de lettres identiques.
      ramp: DRAGON_RAMP,
      gain: 1.35,
      jitter: (x, y) => (hash2(x, y, 7) - 0.5) * 0.22,
      glow: [{ x: f * (HEAD.x + 0.9) * SCALE, y: (HEAD.y - 0.6) * SCALE, ch: '*', color: [255, 224, 102] }],
    });
  }

  protected override onDeath(g: GameContext): void {
    g.fx.burst(this.x, this.y, [255, 160, 60], 40);
    g.log(`${this.label} s’écrase dans un fracas de cendres !`, 'loot');
  }
}

/** Dessin centré sur (0, 0), tête vers la droite. */
function drawDragon(ctx: CanvasRenderingContext2D, t: number, facing: number, flap: number): void {
  if (facing < 0) ctx.scale(-1, 1);
  const f = (Math.sin(flap) + 1) / 2; // 0 = ailes basses, 1 = ailes hautes

  wing(ctx, f * 0.85, -1.2, '#5a1e16', '#a4432e');

  // Queue.
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#b8402a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-5, 1);
  ctx.quadraticCurveTo(-10, 1 + Math.sin(t * 3) * 2, -15.5, Math.sin(t * 3 + 1) * 2.5);
  ctx.stroke();
  ctx.fillStyle = '#d0583a';
  ctx.beginPath();
  const tipY = Math.sin(t * 3 + 1) * 2.5;
  ctx.moveTo(-15.5, tipY - 1.2);
  ctx.lineTo(-17, tipY);
  ctx.lineTo(-15.5, tipY + 1.2);
  ctx.fill();

  // Corps.
  const body = ctx.createLinearGradient(0, -3, 0, 4);
  body.addColorStop(0, '#ff9a6a');
  body.addColorStop(0.5, '#c8442c');
  body.addColorStop(1, '#5c1a12');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 1, 7, 3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e0a060';
  ctx.beginPath();
  ctx.ellipse(1, 2.8, 5, 0.7, 0, 0, TAU);
  ctx.fill();

  // Cou et tête.
  ctx.strokeStyle = '#e0603e';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.quadraticCurveTo(8, -3.5, 10.5, -4);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(11.5, -4.2, 2.7, 1.6, -0.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#e8dcc0';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(10.6, -5.4);
  ctx.lineTo(8.4, -7.8);
  ctx.moveTo(11.6, -5.6);
  ctx.lineTo(10.2, -8.2);
  ctx.stroke();
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(HEAD.x + 0.9, HEAD.y - 0.6, 0.5, 0, TAU);
  ctx.fill();

  wing(ctx, f, 0, '#8a2c1e', '#ffb090');
}

function wing(ctx: CanvasRenderingContext2D, f: number, offset: number, membrane: string, bone: string): void {
  const tipY = 6 - 17 * f;
  ctx.fillStyle = membrane;
  ctx.beginPath();
  ctx.moveTo(2 + offset, -1);
  ctx.lineTo(-1 + offset, tipY * 0.55 - 1);
  ctx.lineTo(-6 + offset, tipY);
  ctx.lineTo(-7.5 + offset, tipY * 0.45);
  ctx.lineTo(-4 + offset, 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = bone;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(2 + offset, -1);
  ctx.lineTo(-1 + offset, tipY * 0.55 - 1);
  ctx.lineTo(-6 + offset, tipY);
  ctx.moveTo(-1 + offset, tipY * 0.55 - 1);
  ctx.lineTo(-7.5 + offset, tipY * 0.45);
  ctx.stroke();
}

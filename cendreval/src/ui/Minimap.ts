import { ASPECT, vdist } from '../core/math';
import type { World, Landmark } from '../world/World';
import { TILE_INFO } from '../world/tiles';
import type { Player } from '../entities/Player';

const TAU = Math.PI * 2;

const MARK: Record<Landmark['kind'], string> = {
  village: '#f2c46b',
  camp: '#e0503c',
  tower: '#c9ccd6',
  lair: '#ff8a3a',
};

/**
 * Carte en bas à gauche, avec brouillard de guerre.
 * base  : le monde entier, un pixel par case
 * mask  : ce qui a été exploré (disques blancs)
 * comp  : base masquée, recalculée seulement quand le masque change
 */
export class Minimap {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base = document.createElement('canvas');
  private readonly mask = document.createElement('canvas');
  private readonly comp = document.createElement('canvas');
  private readonly bctx: CanvasRenderingContext2D;
  private readonly mctx: CanvasRenderingContext2D;
  private readonly cctx: CanvasRenderingContext2D;
  private readonly found = new Set<Landmark>();
  private dirty = true;
  private large = false;
  private w = 0;
  private h = 0;

  constructor(
    parent: HTMLElement,
    private readonly world: World,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'minimap panel';
    this.el.innerHTML = `<canvas class="minimap__canvas" role="img" aria-label="Carte de la région"></canvas><span class="minimap__label">Carte · M</span>`;
    parent.appendChild(this.el);
    this.canvas = this.el.querySelector('canvas')!;
    const ctx = this.canvas.getContext('2d');
    const b = this.base.getContext('2d');
    const m = this.mask.getContext('2d');
    const c = this.comp.getContext('2d');
    if (!ctx || !b || !m || !c) throw new Error('Canvas 2D indisponible');
    this.ctx = ctx;
    this.bctx = b;
    this.mctx = m;
    this.cctx = c;
    for (const cv of [this.base, this.mask, this.comp]) {
      cv.width = world.w;
      cv.height = world.h;
    }
    this.paintAll();
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', () => this.toggle());
  }

  private paintAll(): void {
    const { world } = this;
    const img = this.bctx.createImageData(world.w, world.h);
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const i = y * world.w + x;
        const c = TILE_INFO[world.tiles[i]].mini;
        const shade = 0.75 + (world.elev[i] - 0.5) * 0.9;
        img.data[i * 4] = c[0] * shade;
        img.data[i * 4 + 1] = c[1] * shade;
        img.data[i * 4 + 2] = c[2] * shade;
        img.data[i * 4 + 3] = 255;
      }
    }
    this.bctx.putImageData(img, 0, 0);
  }

  paintTile(x: number, y: number): void {
    const c = TILE_INFO[this.world.tile(x, y)].mini;
    this.bctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    this.bctx.fillRect(x, y, 1, 1);
    this.dirty = true;
  }

  reveal(x: number, y: number, r: number): void {
    this.mctx.fillStyle = '#fff';
    this.mctx.beginPath();
    this.mctx.ellipse(x, y, r, r / ASPECT, 0, 0, TAU);
    this.mctx.fill();
    for (const l of this.world.landmarks) {
      if (!this.found.has(l) && vdist(l.x - x, l.y - y) < r) this.found.add(l);
    }
    this.dirty = true;
  }

  toggle(): void {
    this.large = !this.large;
    this.el.classList.toggle('is-large', this.large);
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(player: Player, t: number): void {
    if (this.dirty) {
      const c = this.cctx;
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, this.world.w, this.world.h);
      c.drawImage(this.base, 0, 0);
      c.globalCompositeOperation = 'destination-in';
      c.drawImage(this.mask, 0, 0);
      c.globalCompositeOperation = 'source-over';
      this.dirty = false;
    }
    const { ctx, w, h, world } = this;
    // Le monde est carré en cases, mais une case est plus haute que large.
    const sx = Math.min(w / world.w, h / (world.h * ASPECT));
    const sy = sx * ASPECT;
    const ox = (w - world.w * sx) / 2;
    const oy = (h - world.h * sy) / 2;
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.comp, ox, oy, world.w * sx, world.h * sy);

    for (const l of this.found) {
      const x = ox + l.x * sx;
      const y = oy + l.y * sy;
      ctx.fillStyle = MARK[l.kind];
      ctx.beginPath();
      if (l.kind === 'village') ctx.rect(x - 2.5, y - 2.5, 5, 5);
      else if (l.kind === 'lair') {
        ctx.moveTo(x, y - 3.5);
        ctx.lineTo(x + 3, y + 2.5);
        ctx.lineTo(x - 3, y + 2.5);
      } else ctx.arc(x, y, 2.2, 0, TAU);
      ctx.fill();
    }

    const px = ox + player.x * sx;
    const py = oy + player.y * sy;
    ctx.strokeStyle = 'rgba(255,240,210,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + player.dirX * 7, py + player.dirY * 7);
    ctx.stroke();
    ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ffffff' : '#f2c46b';
    ctx.beginPath();
    ctx.arc(px, py, 2.6, 0, TAU);
    ctx.fill();
  }
}

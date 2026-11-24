import type { Scene } from './Scene';
import { AsciiCanvas } from '../render/AsciiCanvas';
import { Rasterizer, type RasterCell } from '../render/Rasterizer';
import { ASPECT, clamp, lerp } from '../core/math';
import { hash2 } from '../core/rng';
import { drawHero, HERO_CENTER_X, HERO_HEAD_Y, HERO_REST_YAW, PORTRAIT_COLS, PORTRAIT_ROWS } from '../character/portrait';
import {
  BODIES,
  COLOR_GROUPS,
  DEFAULT_APPEARANCE,
  HEADS,
  OUTFITS,
  computeStats,
  formatBonus,
  randomName,
  type Appearance,
  type Option,
} from '../character/appearance';
import { saveHero, type SavedHero } from '../character/storage';

type Tab = 'head' | 'body' | 'outfit' | 'colors';
const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'head', label: 'Tête' },
  { id: 'body', label: 'Corps' },
  { id: 'outfit', label: 'Tenue' },
  { id: 'colors', label: 'Couleurs' },
];

export interface CreatorCallbacks {
  onStart(hero: SavedHero): void;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const TAU = Math.PI * 2;
/** Centre du héros entier dans son cadre (unités du portrait). */
const BODY_Y = 28.5;
/** Pas des boutons de rotation. */
const TURN_STEP = Math.PI / 4;
/** Durée du zoom vers la tête (s). */
const ZOOM_TIME = 0.75;

const easeInOut = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Page d'accueil : personnalisation du héros, aperçu ASCII animé, puis "Démarrer l'aventure". */
export class CreatorScene implements Scene {
  private root!: HTMLElement;
  private app: Appearance;
  private tab: Tab = 'head';
  private portrait!: AsciiCanvas;
  private title!: AsciiCanvas;
  /** Rastériseur à la taille de toute la scène : le gros plan garde la même finesse de glyphes. */
  private raster: Rasterizer | null = null;
  /** Rotation du héros (rad), élan du lancer, angle visé par les boutons. */
  private yaw = HERO_REST_YAW;
  private spin = 0;
  private yawGoal: number | null = null;
  /** Gros plan sur la tête : 0 = corps entier, 1 = tête. */
  private zoom = 0;
  private zoomTo = 0;
  private drag: { id: number; x0: number; yaw0: number; lastX: number; lastT: number; moved: boolean } | null = null;
  private stage!: HTMLElement;
  private titleCells: { x: number; y: number; ch: string; l: number }[] = [];
  private embers: Ember[] = [];
  private lastRender = -1;
  private ro: ResizeObserver | null = null;

  constructor(
    private readonly cb: CreatorCallbacks,
    private readonly saved: SavedHero | null,
  ) {
    this.app = structuredClone(saved?.appearance ?? DEFAULT_APPEARANCE);
    if (!this.app.name) this.app.name = randomName();
  }

  enter(host: HTMLElement): void {
    this.root = document.createElement('section');
    this.root.className = 'creator';
    this.root.innerHTML = `
      <header class="creator__head">
        <canvas class="creator__title" role="img" aria-label="Cendreval"></canvas>
        <p class="creator__tagline">Forge ton héros avant d’entrer dans les Terres Cendrées.</p>
      </header>
      <div class="creator__grid">
        <div class="creator__stage" tabindex="0" aria-label="Aperçu du héros : flèches pour tourner, Entrée pour le gros plan sur la tête">
          <canvas class="creator__portrait" role="img" aria-label="Aperçu du héros en ASCII"></canvas>
          <div class="stage__hud">
            <button type="button" class="stage__btn" data-action="turn-left" aria-label="Tourner vers la gauche">◂</button>
            <span class="stage__angle" aria-hidden="true">000°</span>
            <button type="button" class="stage__btn" data-action="turn-right" aria-label="Tourner vers la droite">▸</button>
            <button type="button" class="stage__btn stage__zoom" data-action="zoom">Gros plan · tête</button>
          </div>
          <p class="stage__hint">Glisse pour tourner · clique sur la tête</p>
        </div>
        <section class="panel forge" aria-label="Apparence">
          <div class="panel__bar">Forge · apparence</div>
          <div class="tabs" role="tablist">
            ${TABS.map((t) => `<button type="button" role="tab" class="tab" data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>
          <div class="forge__body" role="tabpanel"></div>
        </section>
        <section class="panel identity" aria-label="Identité">
          <div class="panel__bar">Identité</div>
          <label class="field" for="hero-name">Pseudo</label>
          <div class="field__row">
            <input id="hero-name" class="input" maxlength="18" autocomplete="off" spellcheck="false" />
            <button type="button" class="btn btn--ghost" data-action="random">Au hasard</button>
          </div>
          <div class="stats" aria-live="polite"></div>
          <p class="identity__save"></p>
          <button type="button" class="btn btn--start" data-action="start">Démarrer l’aventure</button>
          <p class="identity__hint">ZQSD ou flèches pour marcher · Espace ou clic pour frapper · M pour la carte</p>
        </section>
      </div>`;
    host.appendChild(this.root);

    this.portrait = new AsciiCanvas(this.q<HTMLCanvasElement>('.creator__portrait'));
    this.title = new AsciiCanvas(this.q<HTMLCanvasElement>('.creator__title'));
    this.title.bg = '#07080b';

    const input = this.q<HTMLInputElement>('#hero-name');
    input.value = this.app.name;
    input.addEventListener('input', () => {
      this.app.name = input.value.trim();
      this.renderSaveNote();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.start();
    });

    this.root.addEventListener('click', (e) => this.onClick(e));
    this.stage = this.q('.creator__stage');
    this.bindStage();
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(this.q('.creator__stage'));
    this.ro.observe(this.q('.creator__head'));

    this.renderTabs();
    this.renderStats();
    this.renderSaveNote();
    this.layout();
  }

  exit(): void {
    this.ro?.disconnect();
    this.root.remove();
  }

  update(dt: number): void {
    // Rotation : élan après un lancer, ou glissement vers l'angle des boutons.
    if (!this.drag) {
      if (this.yawGoal !== null) {
        this.yaw += (this.yawGoal - this.yaw) * (1 - Math.exp(-dt * 9));
        if (Math.abs(this.yawGoal - this.yaw) < 0.002) this.yawGoal = null;
      } else if (Math.abs(this.spin) > 0.01) {
        this.yaw += this.spin * dt;
        this.spin *= Math.exp(-dt * 2.6);
      } else this.spin = 0;
    }
    const z = this.zoom + Math.sign(this.zoomTo - this.zoom) * (dt / ZOOM_TIME);
    this.zoom = this.zoomTo > this.zoom ? Math.min(this.zoomTo, z) : Math.max(this.zoomTo, z);

    const { cols, rows } = this.portrait;
    if (cols === 0) return;
    if (Math.random() < dt * 22) {
      this.embers.push({ x: Math.random() * cols, y: rows - 1 - Math.random() * 6, vx: (Math.random() - 0.3) * 2, vy: -2 - Math.random() * 3, life: 2 + Math.random() * 3 });
    }
    for (const e of this.embers) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx += Math.sin(e.y * 0.3) * dt;
      e.life -= dt;
    }
    this.embers = this.embers.filter((e) => e.life > 0 && e.y > 0);
  }

  render(t: number): void {
    if (t - this.lastRender < 1 / 40) return;
    this.lastRender = t;

    const p = this.portrait;
    p.clear();
    for (const e of this.embers) {
      const k = Math.min(1, e.life / 2);
      p.set(Math.floor(e.x), Math.floor(e.y), e.life > 3 ? '*' : e.life > 1.5 ? "'" : '.', 255 * k, 140 * k, 50 * k);
    }
    const frame = Math.floor(t * 8);
    const r = this.raster;
    if (r) {
      const cam = this.camera();
      const detail = this.zoom > 0 || this.zoomTo > 0;
      r.render(
        (ctx) => {
          ctx.translate(r.cols / 2, r.height / 2);
          ctx.scale(cam.s, cam.s);
          ctx.translate(-cam.fx, -cam.fy);
          drawHero(ctx, this.app, t, undefined, { yaw: this.yaw, detail });
        },
        (x, y, c: RasterCell) => p.set(x, y, c.ch, c.r, c.g, c.b),
        // De près, moins de scintillement : les traits fins du visage restent lisibles.
        { gain: 2.3, jitter: (x, y) => (hash2(x, y, frame) - 0.5) * (0.06 - 0.035 * this.zoom) },
      );
    }
    p.flush();
    this.renderStageHud();

    const ti = this.title;
    ti.clear();
    for (const c of this.titleCells) {
      const wave = 0.5 + 0.5 * Math.sin(t * 1.8 + c.x * 0.18 - c.y * 0.4);
      const flick = 0.75 + 0.25 * hash2(c.x, c.y, Math.floor(t * 10));
      const k = c.l * flick;
      ti.set(c.x, c.y, c.ch, (200 + 55 * wave) * k, (70 + 120 * wave) * k, (30 + 40 * wave) * k);
    }
    ti.flush();
  }

  // ---------------------------------------------------------------- UI

  private q<T extends Element = HTMLElement>(sel: string): T {
    const el = this.root.querySelector<T>(sel);
    if (!el) throw new Error(`Élément manquant : ${sel}`);
    return el;
  }

  private onClick(e: Event): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!target) return;
    const { tab, pick, slot, color, action } = target.dataset;
    if (action === 'turn-left' || action === 'turn-right') {
      this.turnBy(action === 'turn-left' ? -TURN_STEP : TURN_STEP);
    } else if (action === 'zoom') {
      this.setZoom(this.zoomTo < 0.5);
    } else if (tab) {
      this.tab = tab as Tab;
      this.renderTabs();
    } else if (pick) {
      if (this.tab === 'head') this.app.head = pick as Appearance['head'];
      if (this.tab === 'body') this.app.body = pick as Appearance['body'];
      if (this.tab === 'outfit') this.app.outfit = pick as Appearance['outfit'];
      this.renderTabs();
      this.renderStats();
    } else if (slot && color) {
      this.app.colors[slot as keyof Appearance['colors']] = color;
      this.renderTabs();
    } else if (action === 'random') {
      this.app.name = randomName();
      this.q<HTMLInputElement>('#hero-name').value = this.app.name;
      this.renderSaveNote();
    } else if (action === 'start') {
      this.start();
    }
  }

  private renderTabs(): void {
    this.root.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
      const on = b.dataset.tab === this.tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const body = this.q('.forge__body');
    if (this.tab === 'colors') {
      body.innerHTML = COLOR_GROUPS.map(
        (g) => `
        <div class="swatches">
          <h3 class="swatches__label">${g.label}</h3>
          <div class="swatches__row">
            ${g.swatches
              .map((c) => {
                const on = this.app.colors[g.slot] === c;
                return `<button type="button" class="swatch${on ? ' is-on' : ''}" style="--c:${c}" data-slot="${g.slot}" data-color="${c}" aria-pressed="${on}" aria-label="${g.label} ${c}"></button>`;
              })
              .join('')}
          </div>
        </div>`,
      ).join('');
      return;
    }
    const list: readonly Option<string>[] = this.tab === 'head' ? HEADS : this.tab === 'body' ? BODIES : OUTFITS;
    const current = this.tab === 'head' ? this.app.head : this.tab === 'body' ? this.app.body : this.app.outfit;
    body.innerHTML = list
      .map((o) => {
        const on = o.id === current;
        return `<button type="button" class="opt${on ? ' is-on' : ''}" data-pick="${o.id}" aria-pressed="${on}">
          <span class="opt__name">${o.label}</span>
          <span class="opt__bonus">${formatBonus(o.bonus)}</span>
          <span class="opt__hint">${o.hint}</span>
        </button>`;
      })
      .join('');
  }

  private renderStats(): void {
    const s = computeStats(this.app);
    const rows: [string, number, number, string][] = [
      ['PV', s.maxHp, 150, String(s.maxHp)],
      ['ATQ', s.atk, 20, String(s.atk)],
      ['DEF', s.def, 14, String(s.def)],
      ['VIT', s.speed, 8, s.speed.toFixed(1)],
    ];
    this.q('.stats').innerHTML = rows
      .map(([label, v, max, shown]) => {
        const n = 14;
        const f = Math.round(clamp(v / max, 0, 1) * n);
        return `<div class="stat"><span class="stat__label">${label}</span><code class="stat__bar">${'█'.repeat(f)}${'░'.repeat(n - f)}</code><span class="stat__value">${shown}</span></div>`;
      })
      .join('');
  }

  private renderSaveNote(): void {
    const p = this.saved?.progress;
    const same = p && this.saved?.appearance.name === this.app.name;
    this.q('.identity__save').innerHTML = same
      ? `Partie retrouvée pour <b>${esc(this.app.name)}</b> : niveau ${p.level}.`
      : 'Nouvelle partie. Un monde neuf sera forgé.';
  }

  private start(): void {
    const name = this.app.name.trim() || randomName();
    this.app.name = name;
    const keep = this.saved?.progress && this.saved.appearance.name === name ? this.saved.progress : undefined;
    const hero: SavedHero = { appearance: structuredClone(this.app), progress: keep };
    saveHero(hero);
    this.cb.onStart(hero);
  }

  // ---------------------------------------------------------------- aperçu : rotation et gros plan

  /**
   * Cadrage du rastériseur : échelle (colonnes par unité du portrait) et point visé.
   * Le zoom est géométrique et la tête glisse en ligne droite vers le centre : elle ne
   * sort jamais du cadre pendant l'animation.
   */
  private camera(): { s: number; fx: number; fy: number } {
    const r = this.raster!;
    const W = r.cols;
    const Hh = r.height;
    const s0 = Math.min(W / 42, Hh / 57);
    const s1 = Math.max(s0, Math.min(W / 17, Hh / 16.5));
    const k = easeInOut(this.zoom);
    const s = s0 * (s1 / s0) ** k;
    // Hauteur de la tête à l'écran (par rapport au centre) : de sa place dans le plan large au centre.
    const hy = lerp((HERO_HEAD_Y - BODY_Y) * s0, 0, k);
    return { s, fx: HERO_CENTER_X, fy: HERO_HEAD_Y - hy / s };
  }

  /** Le point (px CSS dans la scène) tombe-t-il sur la tête du héros ? */
  private overHead(px: number, py: number): boolean {
    if (!this.raster) return false;
    const cw = this.portrait.cellW;
    const cam = this.camera();
    const hx = (px / cw - this.raster.cols / 2) / cam.s + cam.fx;
    const hy = (py / cw - this.raster.height / 2) / cam.s + cam.fy;
    return ((hx - HERO_CENTER_X) / 5.2) ** 2 + ((hy - HERO_HEAD_Y + 0.8) / 6.6) ** 2 < 1;
  }

  private turnBy(da: number): void {
    this.spin = 0;
    this.yawGoal = (this.yawGoal ?? this.yaw) + da;
  }

  private setZoom(on: boolean): void {
    this.zoomTo = on ? 1 : 0;
    this.stage.classList.toggle('is-zoomed', on);
    const btn = this.q('.stage__zoom');
    btn.textContent = on ? 'Corps entier' : 'Gros plan · tête';
    this.q('.stage__hint').textContent = on ? 'Glisse pour tourner la tête · clic ou Échap pour reculer' : 'Glisse pour tourner · clique sur la tête';
  }

  private bindStage(): void {
    const st = this.stage;
    const local = (e: PointerEvent): [number, number] => {
      const b = st.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };
    st.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button') || e.button !== 0) return;
      st.setPointerCapture(e.pointerId);
      this.drag = { id: e.pointerId, x0: e.clientX, yaw0: this.yaw, lastX: e.clientX, lastT: performance.now(), moved: false };
      this.spin = 0;
      this.yawGoal = null;
    });
    st.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) {
        const [x, y] = local(e);
        st.classList.toggle('is-head', this.zoomTo === 0 && this.overHead(x, y));
        return;
      }
      const dx = e.clientX - d.x0;
      if (Math.abs(dx) > 5) d.moved = true;
      if (!d.moved) return;
      st.classList.add('is-dragging');
      // Un glissement sur toute la largeur de la scène = un tour complet.
      const perPx = TAU / Math.max(240, st.clientWidth);
      this.yaw = d.yaw0 + dx * perPx;
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT) / 1000;
      this.spin = lerp(this.spin, ((e.clientX - d.lastX) * perPx) / dt, 0.5);
      d.lastX = e.clientX;
      d.lastT = now;
    });
    const end = (e: PointerEvent): void => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      st.classList.remove('is-dragging');
      if (d.moved) {
        // Pas d'élan si le doigt s'est arrêté avant de lâcher.
        if (performance.now() - d.lastT > 90) this.spin = 0;
        this.spin = clamp(this.spin, -14, 14);
        return;
      }
      this.spin = 0;
      if (e.type === 'pointercancel') return;
      const [x, y] = local(e);
      if (this.zoomTo > 0) this.setZoom(false);
      else if (this.overHead(x, y)) this.setZoom(true);
    };
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
    st.addEventListener('pointerleave', () => st.classList.remove('is-head'));
    st.addEventListener('keydown', (e) => {
      if (e.target !== st) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.turnBy(e.key === 'ArrowLeft' ? -TURN_STEP : TURN_STEP);
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.setZoom(this.zoomTo < 0.5);
        e.preventDefault();
      } else if (e.key === 'Escape' && this.zoomTo > 0) {
        this.setZoom(false);
      }
    });
  }

  private renderStageHud(): void {
    const deg = Math.round(((((this.yaw - HERO_REST_YAW) % TAU) + TAU) % TAU) * (180 / Math.PI)) % 360;
    const el = this.q('.stage__angle');
    const txt = `${String(deg).padStart(3, '0')}°`;
    if (el.textContent !== txt) el.textContent = txt;
  }

  // ---------------------------------------------------------------- tailles

  private layout(): void {
    const stage = this.q('.creator__stage');
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w > 0 && h > 0) {
      const cellH = clamp(Math.floor(Math.min(h / (PORTRAIT_ROWS + 2), (w * ASPECT) / (PORTRAIT_COLS + 4))), 6, 14);
      this.portrait.resize(w, h, cellH, ASPECT);
      const { cols, rows } = this.portrait;
      // Sur-échantillonnage réduit sur les grandes scènes : le coût reste celui de l'ancien portrait.
      const ss = clamp(Math.round(Math.sqrt(16000 / (cols * rows)) * 4), 3, 5);
      if (!this.raster || this.raster.cols !== cols || this.raster.rows !== rows) this.raster = new Rasterizer(cols, rows, ss);
    }

    const head = this.q('.creator__head');
    const tw = Math.min(head.clientWidth, 960);
    if (tw > 0) {
      const cellH = clamp(Math.floor(tw / 80), 6, 12);
      this.title.resize(tw, cellH * 11, cellH, ASPECT);
      this.buildTitle();
    }
    this.lastRender = -1;
  }

  private buildTitle(): void {
    const { cols, rows } = this.title;
    const r = new Rasterizer(cols, rows, 6);
    this.titleCells = [];
    r.render(
      (ctx) => {
        const target = cols * 0.94;
        ctx.font = '800 10px Cinzel, Georgia, serif';
        const w10 = ctx.measureText('CENDREVAL').width;
        const size = Math.min(rows * ASPECT * 0.95, (10 * target) / w10);
        ctx.font = `800 ${size}px Cinzel, Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Dégradé vertical : le haut des lettres prend des glyphes denses, le bas des plus légers.
        const g = ctx.createLinearGradient(0, r.height * 0.2, 0, r.height * 0.85);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#7a7a7a');
        ctx.fillStyle = g;
        ctx.strokeStyle = g;
        ctx.lineWidth = size * 0.07;
        ctx.lineJoin = 'round';
        const y = r.height / 2 + size * 0.06;
        ctx.strokeText('CENDREVAL', cols / 2, y);
        ctx.fillText('CENDREVAL', cols / 2, y);
      },
      (x, y, c) => this.titleCells.push({ x, y, ch: c.ch, l: Math.min(1, c.r / 230) }),
      { gain: 1.0, minAlpha: 0.35 },
    );
  }
}

import type { Scene } from './Scene';
import { ASPECT, clamp, vdist } from '../core/math';
import { Input } from '../core/input';
import { Rng } from '../core/rng';
import { AsciiCanvas } from '../render/AsciiCanvas';
import type { RGB } from '../render/color';
import { generateWorld } from '../world/worldgen';
import type { Landmark, World } from '../world/World';
import { Relief } from '../world/relief';
import { Camera, ZOOM_MAX, ZOOM_MIN, type Projected } from '../render3d/Camera';
import { SUB_X, SUB_Y, SpriteRaster, type SpriteCell } from '../render/SpriteRaster';
import { PROP_SHADOW, PROP_SOLID, drawProp, propBox, propsIn, type Prop } from '../world/props';
import { windAt } from '../world/materials';
import { Composer } from '../render3d/Composer';
import { WorldRenderer, type SceneLight } from '../render3d/WorldRenderer';
import { WORLD_NAME } from '../world/lore';
import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Dragon } from '../entities/Dragon';
import { populate } from '../entities/spawner';
import { DRIED, Fx, type Stain } from '../fx/Fx';
import { Hud } from '../ui/Hud';
import { Minimap } from '../ui/Minimap';
import { saveHero, type SavedHero } from '../character/storage';
import type { GameContext, PutOptions, SpriteSpec, View } from '../game/context';

export interface GameCallbacks {
  onNewHero(): void;
}

interface PendingRespawn {
  at: number;
  x: number;
  y: number;
  make: () => Entity;
}

const LABEL: RGB = [210, 120, 100];
const FOG: RGB = [9, 11, 19];
/** Zoom de départ : le héros fait une dizaine de lignes de haut. */
const ZOOM_DEFAULT = 4.4;
/** Taille maximale d'un sprite (cases), pour borner le coût d'un dragon tout proche. */
const MAX_SPRITE_COLS = 400;
const MAX_SPRITE_ROWS = 230;
/**
 * Hauteur des glyphes en px : petits et nombreux, comme une image fine en ASCII.
 * Le cadrage, lui, est réglé pour des glyphes de 15 px (12 px sur petit écran).
 */
const CELL_H = 10;
const CELL_H_SMALL = 8;

/** Sprite en cours de dessin : ses cases sont placées autour de son point projeté. */
interface SpriteOrigin {
  ex: number;
  ey: number;
  sx: number;
  sy: number;
  depth: number;
  light: number;
  occlude: boolean;
  xray: boolean;
  /** Colonnes d'écran par largeur de case à cette profondeur. */
  scale: number;
}

/** Ce qui se dessine par-dessus la scène, trié du nord au sud (les plus lointains d'abord). */
interface Drawable {
  y: number;
  draw: () => void;
}

/**
 * Le monde en jeu : simulation, rendu, HUD et minimap.
 * Le rendu est une vraie scène 3D (relief, murs, tours, ombres) convertie en glyphes :
 * WorldRenderer dessine un G-buffer, Composer en fait de l'ASCII, puis les entités
 * sont posées par-dessus comme des panneaux face caméra.
 */
export class GameScene implements Scene {
  private root!: HTMLElement;
  private canvas!: AsciiCanvas;
  private input!: Input;
  private hud!: Hud;
  private minimap!: Minimap;
  private world!: World;
  private player!: Player;
  private ctx!: GameContext;
  private ro: ResizeObserver | null = null;

  private readonly entities: Entity[] = [];
  private readonly fx = new Fx();
  private readonly respawns: PendingRespawn[] = [];
  private relief!: Relief;
  private renderer: WorldRenderer | null = null;
  private readonly composer = new Composer();
  private readonly cam = new Camera();
  /** Caméra de l'image affichée : celle du G-buffer relu (une ou deux images de retard). */
  private shown = this.cam;
  private readonly proj: Projected = { x: 0, y: 0, depth: 0 };
  private readonly proj2: Projected = { x: 0, y: 0, depth: 0 };
  private readonly raster = new SpriteRaster();
  private readonly cells: SpriteCell[] = [];
  /** Décor déjà converti en glyphes, par variante, échelle et vent (le décor ne bouge qu'au vent). */
  private readonly propCache = new Map<string, SpriteCell[]>();
  private readonly props: Prop[] = [];
  private zoomTarget = ZOOM_DEFAULT;
  private lookX = 0;
  private lookY = 0;
  private readonly lift = new WeakMap<Entity, number>();
  private bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private camX = 0;
  private camY = 0;
  private camH = 0;
  private camReady = false;
  private lastRender = 0;
  private time3d = 0;
  private torch = 1;
  private frameLights: SceneLight[] = [];
  private origin: SpriteOrigin | null = null;
  /** Les textes (noms, dégâts) restent lisibles, même derrière un mur. */
  private inText = false;
  private cx = 0;
  private cy = 0;
  private time = 0;
  private paused = false;
  private regionTimer = 0;
  private region: Landmark | null = null;
  private regionName = '';
  private lastTile = -1;
  private saveTimer = 0;
  private howlTimer = 15;

  constructor(
    private readonly hero: SavedHero,
    private readonly cb: GameCallbacks,
  ) {}

  enter(host: HTMLElement): void {
    this.root = document.createElement('div');
    this.root.className = 'game';
    this.root.innerHTML = '<canvas class="game__canvas" role="img" aria-label="Le monde de Cendreval en ASCII"></canvas>';
    host.appendChild(this.root);

    const seed = this.hero.progress?.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.world = generateWorld(seed);
    const rng = new Rng(seed ^ 0x2545f491);
    this.player = new Player(this.world.spawn.x, this.world.spawn.y, this.hero.appearance, this.hero.progress);
    this.entities.push(...populate(this.world, rng));
    if (import.meta.env.DEV) this.devTeleport();

    this.relief = new Relief(this.world);
    this.canvas = new AsciiCanvas(this.root.querySelector('canvas')!);
    this.canvas.layers = true;
    this.input = new Input(this.root);
    this.input.enabled = true;
    this.hud = new Hud(this.root, {
      onRespawn: () => this.respawnPlayer(),
      onResume: () => this.setPaused(false),
      onNewHero: () => {
        this.save();
        this.cb.onNewHero();
      },
      onAttack: () => this.input.queueAttack(),
    });
    this.minimap = new Minimap(this.root, this.world);
    this.world.onTileChange = (x, y) => {
      this.minimap.paintTile(x, y);
      this.relief.update(x, y);
      this.renderer?.tileChanged(x, y);
    };
    try {
      this.renderer = new WorldRenderer(this.world, this.relief);
    } catch (err) {
      console.error(err);
      this.hud.message('Ton navigateur ne gère pas WebGL2 : le monde ne peut pas être dessiné.', 'danger');
    }

    this.ctx = {
      world: this.world,
      player: this.player,
      entities: this.entities,
      fx: this.fx,
      input: this.input,
      rng,
      time: 0,
      log: (m, tone) => this.hud.message(m, tone),
    };

    const village = this.world.byKind('village')[0];
    this.hud.message(`Tu t’éveilles à ${village?.name ?? 'un village'}, aux portes des ${WORLD_NAME}.`, 'lore');
    this.hud.message('Le feu sacré soigne et protège. Au-delà, chiens-loups et clans rôdent.', 'info');
    this.hud.message('Monte en haut d’une tour pour dévoiler la région sur ta carte.', 'info');

    this.hud.message('Molette (ou + / −) : rapprocher ou éloigner la caméra.', 'info');
    this.root.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoomTarget = clamp(this.zoomTarget * Math.exp(-e.deltaY * 0.0012), ZOOM_MIN, ZOOM_MAX);
      },
      { passive: false },
    );
    this.cam.zoom = this.zoomTarget;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.root);
    this.resize();
    this.save();
  }

  exit(): void {
    this.save();
    this.renderer?.dispose();
    this.ro?.disconnect();
    this.input.dispose();
    this.root.remove();
  }

  private resize(): void {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h) return;
    const small = Math.min(w, h) < 640;
    const cellH = small ? CELL_H_SMALL : CELL_H;
    const c = this.canvas;
    c.resize(w, h, cellH, ASPECT);
    this.cam.cellScale = (small ? 12 : 15) / cellH;
    this.cam.setViewport(c.cols, c.rows, c.cellW, c.cellH);
    this.composer.resize(c.cols, c.rows);
    this.renderer?.resize(c.cols, c.rows);
    this.minimap.resize();
  }

  // ---------------------------------------------------------------- simulation

  update(dt: number): void {
    const input = this.input;
    if (input.wasPressed('Escape')) this.setPaused(!this.paused);
    if (input.wasPressed('KeyM')) this.minimap.toggle();
    if (input.isDown('Equal', 'NumpadAdd', 'PageUp')) this.zoomTarget = Math.min(ZOOM_MAX, this.zoomTarget * Math.exp(dt * 1.6));
    if (input.isDown('Minus', 'NumpadSubtract', 'Digit6', 'PageDown')) this.zoomTarget = Math.max(ZOOM_MIN, this.zoomTarget * Math.exp(-dt * 1.6));
    if (this.paused) {
      input.endFrame();
      return;
    }

    this.time += dt;
    this.ctx.time = this.time;
    const p = this.player;
    p.update(dt, this.ctx);

    for (const e of this.entities) {
      if (!e.alive) continue;
      // Les entités lointaines dorment : seuls les dragons patrouillent toujours.
      if (e instanceof Dragon || (Math.abs(e.x - p.x) < 80 && Math.abs(e.y - p.y) < 60)) e.update(dt, this.ctx);
    }
    this.collectDead();
    this.processRespawns();
    this.fx.update(dt, this.ctx);
    this.ambient(dt);
    this.explore(dt);

    this.saveTimer += dt;
    if (this.saveTimer > 20) {
      this.saveTimer = 0;
      this.save();
    }

    this.hud.update(p);
    this.hud.showDeath(!p.alive);
    input.endFrame();
  }

  private collectDead(): void {
    let j = 0;
    for (const e of this.entities) {
      if (e.alive) {
        this.entities[j++] = e;
      } else if (e.respawn) {
        this.respawns.push({ at: this.time + e.respawnDelay, x: e.homeX, y: e.homeY, make: e.respawn });
      }
    }
    this.entities.length = j;
  }

  private processRespawns(): void {
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      // On ne fait réapparaître qu'hors de la vue du héros.
      if (this.time >= r.at && vdist(r.x - this.player.x, r.y - this.player.y) > 45) {
        this.entities.push(r.make());
        this.respawns.splice(i, 1);
      }
    }
  }

  private ambient(dt: number): void {
    const b = this.bounds;
    if (Math.random() < dt * 22) this.fx.ash(b.x0 + Math.random() * (b.x1 - b.x0), b.y0 + Math.random() * (b.y1 - b.y0));
    for (const l of this.world.lights) {
      if (!this.onScreen(l.x, l.y, 0)) continue;
      if (Math.random() < dt * 6) this.fx.ember(l.x - 0.5 + Math.random(), l.y - 0.5);
    }
    this.howlTimer -= dt;
    if (this.howlTimer <= 0) {
      this.howlTimer = 25 + Math.random() * 20;
      const near = this.entities.some((e) => e.faction === 'beast' && vdist(e.x - this.player.x, e.y - this.player.y) < 30);
      if (near && this.player.alive) this.hud.message('Un hurlement de chien-loup, tout proche…', 'danger');
    }
  }

  private explore(dt: number): void {
    const p = this.player;
    const key = Math.floor(p.y) * this.world.w + Math.floor(p.x);
    if (key !== this.lastTile) {
      this.lastTile = key;
      this.minimap.reveal(p.x, p.y, 16);
    }
    for (const t of this.world.byKind('tower')) {
      if (!t.visited && vdist(p.x - t.x, p.y - t.y) < 3) {
        t.visited = true;
        this.minimap.reveal(t.x, t.y, 70);
        this.hud.message(`Du haut de la ${t.name}, la région se dévoile sur ta carte.`, 'loot');
      }
    }
    this.regionTimer -= dt;
    if (this.regionTimer > 0) return;
    this.regionTimer = 0.4;
    const { name, landmark } = this.world.regionName(p.x, p.y);
    if (name !== this.regionName) {
      this.regionName = name;
      this.hud.setRegion(name);
    }
    if (landmark !== this.region) {
      this.region = landmark;
      if (landmark?.kind === 'camp') this.hud.message(`Territoire hostile : ${landmark.name}.`, 'danger');
      if (landmark?.kind === 'lair') this.hud.message(`${landmark.name} : l’air sent le soufre.`, 'danger');
      if (landmark?.kind === 'village') this.hud.message(`${landmark.name} : un sanctuaire. Les bêtes n’y entrent pas.`, 'lore');
    }
  }

  /** Développement : `?at=tower|camp|lair|village` pose le héros près d'un lieu. */
  private devTeleport(): void {
    const at = new URLSearchParams(location.search).get('at');
    const l = at ? this.world.landmarks.find((m) => m.kind === at) : null;
    if (!l) return;
    this.player.x = l.x + 0.5;
    this.player.y = l.y + (l.kind === 'tower' ? 7.5 : l.kind === 'village' ? 3.5 : 0);
    if (l.kind === 'lair' || l.kind === 'camp') this.player.y += 14;
  }

  private setPaused(v: boolean): void {
    this.paused = v;
    this.hud.showPause(v);
    if (v) this.save();
  }

  private respawnPlayer(): void {
    this.player.revive(this.world.spawn.x, this.world.spawn.y);
    this.hud.message('Tu te relèves près du feu sacré.', 'lore');
    this.save();
  }

  private save(): void {
    if (!this.player) return;
    saveHero({
      appearance: this.hero.appearance,
      progress: { seed: this.world.seed, level: this.player.level, xp: this.player.exp, kills: { ...this.player.kills } },
    });
  }

  // ---------------------------------------------------------------- rendu

  render(time: number): void {
    const c = this.canvas;
    if (!c.cols) return;
    const dt = Math.min(0.1, Math.max(0, time - this.lastRender));
    this.lastRender = time;
    this.time3d = time;
    const p = this.player;

    // Hauteur affichée de chaque entité : lissée, pour monter les marches sans à-coups.
    for (const e of this.entities) if (e.alive && this.onScreen(e.x, e.y, 30)) this.liftOf(e, dt);
    const ph = this.liftOf(p, dt);

    // Caméra : zoom amorti, suit le héros en anticipant un peu sa marche.
    const zk = 1 - Math.exp(-dt * 8);
    if (Math.abs(this.zoomTarget - this.cam.zoom) > 1e-3) this.cam.setZoom(this.cam.zoom + (this.zoomTarget - this.cam.zoom) * zk);
    this.composer.fogStart = this.cam.dist * 0.95;
    this.composer.fogEnd = this.cam.dist * 2.7;
    const lk = 1 - Math.exp(-dt * 1.8);
    this.lookX += ((p.moving ? p.dirX * 2.2 : 0) - this.lookX) * lk;
    this.lookY += ((p.moving ? p.dirY * 1.4 : 0) - this.lookY) * lk;
    const k = this.camReady ? 1 - Math.exp(-dt * 7) : 1;
    this.camReady = true;
    this.camX += (p.x + this.lookX - this.camX) * k;
    this.camY += (p.y + this.lookY - this.camY) * k;
    this.camH += (ph - this.camH) * k;
    this.cam.lookAt(this.camX, this.camY, this.camH);
    this.bounds = this.cam.groundBounds(this.camH);

    c.clear();
    this.torch = p.alive ? 1.1 * (1 + Math.sin(time * 9) * 0.03 + Math.sin(time * 23) * 0.02) : 0;
    this.frameLights = this.world.lights
      .filter((l) => vdist(l.x - p.x, l.y - p.y) < 90)
      .map((l) => ({ x: l.x, y: l.y, h: this.relief.walkHeight(l.x, l.y) + 1.2, radius: l.radius, color: l.color }));
    if (this.renderer) {
      const gb = this.renderer.render(this.cam, {
        time,
        torch: { x: p.x, y: p.y, h: ph + 2.4, intensity: this.torch },
        lights: this.frameLights,
        blobs: this.entities.filter((e): e is Dragon => e instanceof Dragon && e.alive && this.onScreen(e.x, e.y, 30)).map((d) => d.shadow),
      });
      this.shown = this.renderer.viewCam;
      this.composer.compose(gb, this.world, this.relief, c, time);
    }

    const v = this.view;
    const ground = this.entities.filter((e) => !(e instanceof Dragon) && this.onScreen(e.x, e.y, 4));
    ground.push(p);

    // Décor naturel visible (avec de la marge au sud : les arbres hauts débordent vers le haut).
    const b = this.bounds;
    this.props.length = 0;
    propsIn(this.world, b.x0 - 3, b.y0 - 2, b.x1 + 3, b.y1 + 9, this.props);
    if (this.propCache.size > 2500) this.propCache.clear();

    // Ombres de contact, avant tout le reste : elles restent sous les silhouettes.
    for (const e of ground) {
      if (!e.alive) continue;
      this.beginSprite(e, true, false);
      const o = this.origin!;
      this.contactShadow(o.sx, o.sy, o.scale, e instanceof Player ? 0.9 : e.radius + 0.25, o.depth);
      this.origin = null;
    }
    // Sang au sol : sous les silhouettes et sous l'herbe haute.
    for (const st of this.fx.stains) if (this.onScreen(st.x, st.y, 3)) this.drawStain(st);
    const list: Drawable[] = [];
    for (const pr of this.props) {
      const r = PROP_SHADOW[pr.kind];
      if (r) {
        const P = this.shown.projectTile(pr.x, pr.y, this.relief.walkHeight(pr.x, pr.y), this.proj);
        if (P.x > -10 && P.x < c.cols + 10 && P.y > -2 && P.y < c.rows + 2) this.contactShadow(P.x, P.y, this.scaleAt(pr.x, pr.y, this.relief.walkHeight(pr.x, pr.y)), r, P.depth);
      }
      list.push({ y: pr.y, draw: () => this.drawProp(pr, time) });
    }
    for (const e of ground) {
      list.push({
        y: e.y,
        draw: () => {
          this.beginSprite(e, true, e === p);
          e.draw(v, time);
          this.origin = null;
        },
      });
    }
    list.sort((a, b2) => a.y - b2.y);
    for (const d of list) d.draw();

    this.fx.draw(v);
    for (const e of this.entities) {
      if (!(e instanceof Dragon) || !this.onScreen(e.x, e.y, 30)) continue;
      this.beginSprite(e, false, false);
      e.draw(v, time);
      this.origin = null;
    }
    this.renderLabels();

    c.flush();
    this.minimap.draw(p, time);
  }

  /** Hauteur du sol sous une entité, lissée dans le temps (dt = 0 : lecture seule). */
  private liftOf(e: Entity, dt: number): number {
    const target = e instanceof Dragon ? Math.max(this.relief.walkHeight(e.x, e.y), this.camH) : this.relief.walkHeight(e.x, e.y);
    const cur = this.lift.get(e);
    if (cur === undefined || Math.abs(cur - target) > 12) {
      this.lift.set(e, target);
      return target;
    }
    const rate = e instanceof Dragon ? 1.5 : 12;
    const next = cur + (target - cur) * (1 - Math.exp(-dt * rate));
    this.lift.set(e, next);
    return next;
  }

  /** Les sprites sont des panneaux face caméra, ancrés aux pieds (au centre pour un dragon). */
  private beginSprite(e: Entity, occlude: boolean, xray: boolean): void {
    const h = this.liftOf(e, 0) + (e instanceof Dragon ? 1.1 : 0);
    const P = this.shown.projectTile(e.x, e.y, h, this.proj);
    const sx = P.x;
    const sy = P.y;
    const depth = P.depth;
    const scale = this.scaleAt(e.x, e.y, h);
    this.origin = { ex: e.x, ey: e.y, sx, sy, depth, light: this.lightAt(e.x, e.y), occlude, xray, scale };
  }

  /** Colonnes d'écran pour une largeur de case, à cet endroit (la perspective rapetisse le lointain). */
  private scaleAt(x: number, y: number, h: number): number {
    const a = this.shown.projectTile(x - 0.5, y, h, this.proj2).x;
    const b = this.shown.projectTile(x + 0.5, y, h, this.proj2).x;
    return Math.max(0.2, b - a);
  }

  /** Ombre douce au sol sous un personnage ou un arbre (lune voilée + torche). */
  private contactShadow(sx: number, sy: number, s: number, r: number, depth: number): void {
    const c = this.canvas;
    const rx = Math.max(0.8, r * s);
    const ry = Math.max(0.6, (r * s * 0.55) / ASPECT);
    for (let y = Math.floor(sy - ry); y <= Math.ceil(sy + ry); y++) {
      for (let x = Math.floor(sx - rx); x <= Math.ceil(sx + rx); x++) {
        if (x < 0 || y < 0 || x >= c.cols || y >= c.rows) continue;
        // Pas d'ombre sur un mur devant le personnage.
        if (this.composer.depth[y * c.cols + x] < depth - 2.2) continue;
        const dx = (x + 0.5 - sx) / rx;
        const dy = (y + 0.5 - sy) / ry;
        const d = dx * dx + dy * dy;
        if (d < 1) c.darken(x, y, 0.35 + 0.65 * d);
      }
    }
  }

  /**
   * Tache de sang : teinte le sol déjà dessiné (le grain de l'herbe ou de la pierre
   * reste visible à travers), rouge vif puis brun en séchant ; une flaque fraîche
   * garde un reflet humide. Rien sur un mur qui passe devant.
   */
  private drawStain(st: Stain): void {
    const c = this.canvas;
    const h = this.relief.walkHeight(st.x, st.y);
    const P = this.shown.projectTile(st.x, st.y, h, this.proj);
    if (P.x < -20 || P.x > c.cols + 20 || P.y < -10 || P.y > c.rows + 10) return;
    const s = this.scaleAt(st.x, st.y, h);
    const grow = st.grow > 0 ? Math.sqrt(Math.min(1, st.age / st.grow)) : 1;
    const dry = clamp(st.age / 25, 0, 1);
    const fade = clamp((st.life - st.age) / 15, 0, 1);
    const col = st.color;
    const r = col[0] + (DRIED[0] - col[0]) * dry;
    const g = col[1] + (DRIED[1] - col[1]) * dry;
    const b = col[2] + (DRIED[2] - col[2]) * dry;
    // Teinte multiplicative : garde l'éclairage déjà calculé du sol.
    const mr = (r / 255) * 2.1;
    const mg = (g / 255) * 2.1;
    const mb = (b / 255) * 2.1;
    const k = tone(this.lightAt(st.x, st.y));
    const fy = (0.55 * s) / ASPECT;
    for (let n = 0; n < st.dots.length; n++) {
      const d = st.dots[n];
      const sx = P.x + d.dx * s * grow;
      const sy = P.y + d.dy * fy * grow;
      const rx = Math.max(0.45, d.r * grow * s);
      const ry = Math.max(0.4, d.r * grow * fy);
      for (let y = Math.floor(sy - ry); y <= Math.ceil(sy + ry); y++) {
        for (let x = Math.floor(sx - rx); x <= Math.ceil(sx + rx); x++) {
          if (x < 0 || y < 0 || x >= c.cols || y >= c.rows) continue;
          const i = y * c.cols + x;
          if (this.composer.depth[i] < P.depth - 2.2) continue;
          const dx = (x + 0.5 - sx) / rx;
          const dy = (y + 0.5 - sy) / ry;
          const q = dx * dx + dy * dy;
          if (q >= 1) continue;
          const a = fade * (q < 0.55 ? 0.95 : (1 - q) * 2.1);
          if (c.ch[i] === ' ' && q < 0.6) {
            // Sol nu ou très sombre : le sang forme sa propre matière.
            c.set(x, y, q < 0.25 && rx > 1.5 ? '%' : ':', r * k * 0.8 * fade, g * k * 0.8 * fade, b * k * 0.8 * fade);
          } else c.tint(x, y, mr, mg, mb, a);
        }
      }
      // Reflet humide de la flaque, du côté de la lumière.
      if (n === 0 && dry < 0.6 && rx > 1.6) c.tint(Math.floor(sx - rx * 0.35), Math.floor(sy - ry * 0.35), 1.9, 1.1, 1.05, 0.55 * (1 - dry) * fade);
    }
  }

  /** Convertit un sprite en cases, relatives à la case de l'ancre (fx, fy : position dans cette case). */
  private rasterize(spec: SpriteSpec, s: number, fx: number, fy: number, out: SpriteCell[]): void {
    const ky = s / ASPECT;
    const cX = Math.floor(fx + spec.x0 * s);
    const cY = Math.floor(fy + spec.y0 * ky);
    const cols = Math.min(MAX_SPRITE_COLS, Math.ceil(fx + spec.x1 * s) - cX);
    const rows = Math.min(MAX_SPRITE_ROWS, Math.ceil(fy + spec.y1 * ky) - cY);
    const start = out.length;
    this.raster.render(
      cols,
      rows,
      (ctx) => {
        ctx.translate((fx - cX) * SUB_X, (fy - cY) * SUB_Y);
        ctx.scale(s * SUB_X, ky * SUB_Y);
        spec.draw(ctx);
        if (spec.flash) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = 'rgba(255,255,255,0.72)';
          ctx.fillRect(0, 0, cols * SUB_X, rows * SUB_Y);
        }
      },
      out,
      spec,
    );
    for (let i = start; i < out.length; i++) {
      out[i].x += cX;
      out[i].y += cY;
    }
  }

  /** Est-ce qu'un mur, une tour ou une colline passe devant cette case du sprite ? */
  private hidden(o: SpriteOrigin, i: number): boolean {
    return o.occlude && this.composer.occluder[i] === 1 && this.composer.depth[i] < o.depth - 2.2;
  }

  /**
   * Pose les cases d'un sprite : détourage sombre autour de la silhouette (elle se
   * détache du décor), lumière de l'endroit, corps plein dans le fond lissé, brume au loin.
   */
  private blit(cells: SpriteCell[], ax: number, ay: number, o: SpriteOrigin, minLight: number, outline: boolean): void {
    const c = this.canvas;
    const { cols, rows } = c;
    const k = Math.max(tone(o.light), minLight);
    const fog = clamp((o.depth - this.composer.fogStart) / (this.composer.fogEnd - this.composer.fogStart), 0, 0.9);
    if (outline) {
      for (const cell of cells) {
        if (cell.a < 0.3) continue;
        const x = ax + cell.x;
        const y = ay + cell.y;
        for (let n = 0; n < 4; n++) {
          const nx = x + (n === 0 ? 1 : n === 1 ? -1 : 0);
          const ny = y + (n === 2 ? 1 : n === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || this.hidden(o, ny * cols + nx)) continue;
          c.darken(nx, ny, 0.62);
        }
      }
    }
    for (const cell of cells) {
      const x = ax + cell.x;
      const y = ay + cell.y;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      if (this.hidden(o, y * cols + x)) {
        // Derrière un mur : le héros reste visible en silhouette bleutée.
        if (o.xray && cell.a > 0.35) c.set(x, y, cell.ch, 70, 96, 136);
        continue;
      }
      let r = cell.r * k;
      let g = cell.g * k;
      let b = cell.b * k;
      // Plafond qui garde la teinte : sous la torche, la cape reste rouge au lieu de virer au blanc.
      const peak = Math.max(r, g, b);
      if (peak > 255) {
        r *= 255 / peak;
        g *= 255 / peak;
        b *= 255 / peak;
      }
      if (fog > 0) {
        r += (FOG[0] - r) * fog;
        g += (FOG[1] - g) * fog;
        b += (FOG[2] - b) * fog;
      }
      c.set(x, y, cell.ch, r, g, b);
      c.mixBack(x, y, r * 0.34, g * 0.34, b * 0.34, cell.a * 0.85);
    }
  }

  /** Décor : converti une fois par variante, échelle et force du vent, puis réutilisé. */
  private drawProp(pr: Prop, time: number): void {
    const c = this.canvas;
    const h = this.relief.walkHeight(pr.x, pr.y);
    const P = this.shown.projectTile(pr.x, pr.y, h, this.proj);
    const sx = P.x;
    const sy = P.y;
    const depth = P.depth;
    if (sx < -40 || sx > c.cols + 40 || sy < -2 || sy > c.rows + 80) return;
    const s = Math.round(this.scaleAt(pr.x, pr.y, h) * 4) / 4;
    if (s < 0.5) return;
    const sway = Math.round(windAt(this.world, Math.floor(pr.x), Math.floor(pr.y), time) * 2) / 2;
    const key = `${pr.kind}|${pr.v}|${s}|${sway}`;
    let cells = this.propCache.get(key);
    if (!cells) {
      cells = [];
      const box = propBox(pr);
      this.rasterize({ ...box, draw: (ctx) => drawProp(ctx, pr, sway) }, s, 0.5, 0.95, cells);
      this.propCache.set(key, cells);
    }
    const o: SpriteOrigin = { ex: pr.x, ey: pr.y, sx, sy, depth, light: this.lightAt(pr.x, pr.y), occlude: true, xray: false, scale: s };
    this.blit(cells, Math.floor(sx), Math.floor(sy), o, 0.22, PROP_SOLID[pr.kind]);
  }

  /** Lumière reçue par une entité : lune voilée, torche, feux (sans ombres). */
  private lightAt(x: number, y: number): number {
    const t = this.time3d;
    const p = this.player;
    const cloud = 0.6 + 0.55 * this.world.noise.value(x * 0.035 - t * 0.05, y * 0.05 + t * 0.015);
    let l = 0.34 * cloud;
    const d = vdist(x - p.x, y - p.y);
    if (d < 18) {
      const k = 1 - d / 18;
      l += k * k * this.torch * 0.9;
    }
    for (const s of this.frameLights) {
      const ld = vdist(x - s.x, y - s.y);
      const r = s.radius * 1.25;
      if (ld >= r) continue;
      const k = 1 - ld / r;
      l += (k * k * 1.3 * (s.color[0] + s.color[1] + s.color[2])) / 765;
    }
    return l;
  }

  /** Case d'écran d'un point du monde : relatif au sprite en cours, sinon projeté au sol. */
  private cellOf(wx: number, wy: number, h = 1.1): boolean {
    const o = this.origin;
    if (o) {
      this.cx = Math.floor(o.sx + wx + 0.5 - o.ex);
      this.cy = Math.floor(o.sy + wy + 0.5 - o.ey);
    } else {
      const P = this.shown.projectTile(wx + 0.5, wy + 0.5, this.relief.walkHeight(wx + 0.5, wy + 0.5) + h, this.proj);
      this.cx = Math.floor(P.x);
      this.cy = Math.floor(P.y);
    }
    return this.cx >= 0 && this.cy >= 0 && this.cx < this.canvas.cols && this.cy < this.canvas.rows;
  }

  private renderLabels(): void {
    const p = this.player;
    if (p.alive) this.label(p, 0, p.label, [232, 200, 140]);
    for (const e of this.entities) {
      if (!e.alive) continue;
      const d = vdist(e.x - p.x, e.y - p.y);
      if (e instanceof Dragon) {
        if (d < 34 && this.onScreen(e.x, e.y, 12)) {
          this.label(e, 1, e.label, [255, 170, 90]);
          this.label(e, 0, hpBar(e.hp, e.maxHp, 16), [230, 90, 60]);
        }
        continue;
      }
      if (d > 9) continue;
      this.label(e, 0, e.hp < e.maxHp ? hpBar(e.hp, e.maxHp, 8) : e.label, LABEL);
    }
  }

  /** Texte au-dessus de la tête d'une entité (`line` lignes plus haut). */
  private label(e: Entity, line: number, text: string, col: RGB): void {
    this.beginSprite(e, false, false);
    const o = this.origin!;
    o.sy = Math.floor(o.sy - (e.spriteTop * o.scale) / ASPECT) - 1 - line;
    o.ey = 0;
    this.view.centerText(e.x, 0, text, col, true);
    this.origin = null;
  }

  private onScreen(x: number, y: number, margin: number): boolean {
    const b = this.bounds;
    return x > b.x0 - margin && x < b.x1 + margin && y > b.y0 - margin && y < b.y1 + margin;
  }

  private readonly view: View = {
    sprite: (spec: SpriteSpec) => {
      const o = this.origin;
      if (!o) return;
      const cells = this.cells;
      cells.length = 0;
      const ax = Math.floor(o.sx);
      const ay = Math.floor(o.sy);
      this.rasterize(spec, o.scale, o.sx - ax, o.sy - ay, cells);
      this.blit(cells, ax, ay, o, spec.minLight ?? 0.3, true);
      // Yeux et braises : visibles même dans le noir.
      for (const gl of spec.glow ?? []) {
        const x = Math.floor(o.sx + gl.x * o.scale);
        const y = Math.floor(o.sy + (gl.y * o.scale) / ASPECT);
        if (x < 0 || y < 0 || x >= this.canvas.cols || y >= this.canvas.rows || this.hidden(o, y * this.canvas.cols + x)) continue;
        this.canvas.set(x, y, gl.ch, gl.color[0], gl.color[1], gl.color[2]);
        this.canvas.addGlow(x, y, gl.color[0] * 0.25, gl.color[1] * 0.18, gl.color[2] * 0.12);
      }
    },
    put: (wx: number, wy: number, ch: string, col: RGB, opts?: PutOptions) => {
      if (ch === ' ' || !this.cellOf(wx, wy, opts?.h)) return;
      const c = this.canvas;
      const { cx, cy } = this;
      const o = this.origin;
      const i = cy * c.cols + cx;
      // Derrière un mur ou une tour : caché, sauf le héros qui reste visible en silhouette.
      if (o?.occlude && !this.inText && this.composer.occluder[i] && this.composer.depth[i] < o.depth - 2.2) {
        if (o.xray) c.set(cx, cy, ch, 86, 112, 150);
        return;
      }
      if (opts?.emissive) {
        c.set(cx, cy, ch, col[0], col[1], col[2]);
        c.addGlow(cx, cy, col[0] * 0.12, col[1] * 0.1, col[2] * 0.08);
        return;
      }
      const light = o ? o.light : this.lightAt(wx + 0.5, wy + 0.5);
      const k = Math.max(tone(light), opts?.minLight ?? 0.3);
      c.set(cx, cy, ch, col[0] * k, col[1] * k, col[2] * k);
    },
    text: (wx: number, wy: number, s: string, col: RGB, emissive = false) => {
      // Hors sprite, le texte est posé d'un bloc à partir du point projeté de son début.
      const temp = !this.origin;
      if (temp) {
        const P = this.shown.projectTile(wx + 0.5, wy + 0.5, this.relief.walkHeight(wx + 0.5, wy + 0.5) + 1.1, this.proj);
        this.origin = { ex: wx, ey: wy, sx: P.x - 0.5, sy: P.y - 0.5, depth: P.depth, light: 1, occlude: false, xray: false, scale: 1 };
      }
      this.inText = true;
      for (let i = 0; i < s.length; i++) {
        // Un espace dans un texte efface la case, pour que le décor ne transparaisse pas.
        if (s[i] === ' ') {
          if (this.cellOf(wx + i, wy)) this.canvas.set(this.cx, this.cy, ' ', 0, 0, 0);
        } else this.view.put(wx + i, wy, s[i], col, { emissive });
      }
      this.inText = false;
      if (temp) this.origin = null;
    },
    centerText: (wx: number, wy: number, s: string, col: RGB, emissive = false) => {
      if (this.origin) {
        this.view.text(Math.round(wx - s.length / 2), wy, s, col, emissive);
        return;
      }
      // Hors sprite (nombres de dégâts) : centré sur le point projeté, sans se caler sur les cases.
      const P = this.shown.projectTile(wx, wy, this.relief.walkHeight(wx, wy) + 1.1, this.proj);
      this.origin = { ex: 0, ey: 0, sx: P.x - s.length / 2, sy: P.y - 0.5, depth: P.depth, light: 1, occlude: false, xray: false, scale: 1 };
      this.view.text(0, 0, s, col, emissive);
      this.origin = null;
    },
  };
}

/** Même exposition que le décor (Composer), pour que les personnages s'y fondent. */
function tone(l: number): number {
  return 2.3 * (1 - Math.exp(-1.6 * l));
}

function hpBar(hp: number, max: number, n: number): string {
  const f = Math.max(0, Math.min(n, Math.ceil((hp / max) * n)));
  return `[${'■'.repeat(f)}${'·'.repeat(n - f)}]`;
}

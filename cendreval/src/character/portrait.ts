import { shadeHex } from '../render/color';
import type { Appearance, BodyId } from './appearance';

/** Le portrait occupe 40 × 40 cases (soit 40 × 56 unités isotropes). */
export const PORTRAIT_COLS = 40;
export const PORTRAIT_ROWS = 40;

const TAU = Math.PI * 2;

/** Hauteur du dessin, du haut du cadre aux semelles (unités du portrait). */
export const HERO_FEET_Y = 51;
export const HERO_CENTER_X = 20;

/** Posture en jeu : course, coup d'épée, orientation. */
export interface HeroPose {
  /** Phase du pas (radians). */
  walk: number;
  moving: boolean;
  /** Avancement du coup : 1 = début, 0 = fini (ou pas de coup). */
  swing: number;
  /** Vu de dos (le héros remonte vers le nord). */
  back: boolean;
  /** 0 = de trois quarts face, 1 = presque de profil, tourné vers +x. */
  turn?: number;
}

/**
 * Gabarit : largeur du tronc et épaisseur des membres. Le squelette, lui, est le
 * même pour tous : environ 7,3 têtes de haut, jambes = moitié de la taille.
 */
const BUILD: Record<BodyId, { w: number; limb: number }> = {
  svelte: { w: 0.86, limb: 0.84 },
  robuste: { w: 1, limb: 1 },
  colosse: { w: 1.22, limb: 1.28 },
};

const THIGH = 10.6;
const SHIN = 10.2;
/** De la cheville à la semelle. */
const ANKLE_H = 1.55;
const UPPER_ARM = 7.9;
const FOREARM = 6.9;
const BLADE = 12.5;
/** Vu un peu d'en haut : ce qui avance vers nous descend à l'écran. */
const TILT = 0.16;
/** Lumière principale : en haut à gauche de l'écran. */
const LX = -0.5;
const LY = -0.866;

const BOOT = '#2a1f19';
const GLOVE = '#2e2420';
const GAUNTLET = '#3a3e45';
const LEATHER = '#3b2a1f';
const STRAP = '#24160e';
const GOLD = '#c9a24a';
const STEEL = '#b9c1ca';
const BLACK_STEEL = '#4a4f58';

type V3 = [number, number, number];
interface Pt {
  x: number;
  y: number;
  /** Profondeur vers le spectateur (plus grand = plus proche). */
  d: number;
}

/**
 * Projection du repère du corps vers le dessin : x latéral, y vers le bas, z vers l'avant
 * du héros. `yaw` tourne le corps (0 = de face, π/2 = de profil vers +x, π = de dos).
 */
class Proj {
  readonly c: number;
  readonly s: number;
  constructor(
    readonly cx: number,
    yaw: number,
  ) {
    this.c = Math.cos(yaw);
    this.s = Math.sin(yaw);
  }

  p(v: V3): Pt {
    const d = -v[0] * this.s + v[2] * this.c;
    return { x: this.cx + v[0] * this.c + v[2] * this.s, y: v[1] + d * TILT, d };
  }

  /** Demi-largeur à l'écran d'une section elliptique (demi-largeur W, demi-épaisseur D). */
  ext(W: number, D: number): number {
    return Math.hypot(W * this.c, D * this.s);
  }
}

/** Section horizontale du tronc ou d'un vêtement. */
interface Sec {
  y: number;
  W: number;
  D: number;
  z: number;
  /** Centre et demi-largeur à l'écran. */
  c: number;
  e: number;
}

interface Arm {
  s: number;
  sh: V3;
  el: V3;
  wr: V3;
  hand: V3;
  /** Direction de la lame (bras armé, au repos ou en marche). */
  blade?: V3;
}

interface Leg {
  s: number;
  hip: V3;
  knee: V3;
  ankle: V3;
  /** Pointe du pied vers le bas quand il quitte le sol. */
  pitch: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/**
 * Dessine le héros comme un petit mannequin 3D : squelette articulé (hanches, genoux,
 * coudes), volumes éclairés en haut à gauche avec un liseré de lune à droite, cape en
 * bandes de tissu qui flottent. Le même dessin sert au portrait et au jeu, où
 * SpriteRaster le convertit en glyphes.
 */
export function drawHero(ctx: CanvasRenderingContext2D, a: Appearance, t: number, pose?: HeroPose): void {
  const cx = HERO_CENTER_X;
  const { w: wk, limb: lk } = BUILD[a.body];
  const { outfit, accent, skin } = a.colors;
  const moving = !!pose?.moving;
  const phase = pose?.walk ?? 0;
  const back = !!pose?.back;
  const turn = pose ? clamp01(pose.turn ?? 0) : 0.05;
  const yaw0 = 0.28 + 0.98 * turn;
  const pr = new Proj(cx, back ? Math.PI - yaw0 : yaw0);
  const swing = pose?.swing ?? 0;
  const breathe = Math.sin(t * 1.6) * 0.22;

  if (!pose) {
    // Socle : une lueur de braise sous les pieds.
    const glow = ctx.createRadialGradient(cx, 52.5, 0, cx, 52.5, 14);
    glow.addColorStop(0, 'rgba(232,131,58,0.6)');
    glow.addColorStop(1, 'rgba(232,131,58,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, 52.5, 14, 2.8, 0, 0, TAU);
    ctx.fill();
  }

  // --- Squelette -----------------------------------------------------------
  // Jambes : la cuisse balance, le genou plie pendant que la jambe revient vers l'avant.
  const legs: Leg[] = [1, -1].map((s) => {
    const ph = phase + (s > 0 ? 0 : Math.PI);
    const th = moving ? 0.55 * Math.sin(ph) : 0;
    const kb = moving ? 0.14 + 1.2 * Math.max(0, Math.cos(ph)) ** 1.4 : 0.05;
    const sh = th - kb;
    const knee: V3 = [s * 2.08 * wk, THIGH * Math.cos(th), THIGH * Math.sin(th)];
    const ankle: V3 = [s * 2.2 * wk, knee[1] + SHIN * Math.cos(sh), knee[2] + SHIN * Math.sin(sh)];
    return { s, hip: [s * 2.0 * wk, 0, 0], knee, ankle, pitch: sh < -0.3 ? (sh + 0.3) * 0.9 : 0 };
  });
  // Le bassin descend jusqu'à ce que le pied d'appui touche le sol : le pas fait onduler le corps.
  const P = HERO_FEET_Y - ANKLE_H - Math.max(legs[0].ankle[1], legs[1].ankle[1]);
  for (const l of legs) for (const v of [l.hip, l.knee, l.ankle]) v[1] += P;

  // Le buste penche en avant à la course.
  const lean = moving ? 1.3 : 0;
  const zAt = (y: number): number => lean * clamp01((P - y) / 15);
  const sec = (dy: number, W: number, D: number, dz = 0): Sec => {
    const y = P + dy - (dy < -9 ? breathe : 0);
    const z = zAt(y) + dz;
    return { y, W, D, z, c: cx + z * pr.s, e: pr.ext(W, D) };
  };

  // Bras : balancier opposé aux jambes, coudes pliés à la course.
  const arms: Arm[] = [1, -1].map((s) => {
    const armed = s < 0;
    const ph = phase + (s > 0 ? Math.PI : 0);
    let ang: number;
    let eb: number;
    if (!moving) {
      ang = armed ? 0.1 : 0.06;
      eb = armed ? 0.62 : 0.22;
    } else {
      ang = (armed ? 0.3 : 0.5) * Math.sin(ph);
      eb = armed ? 0.95 : 1.0 + 0.35 * Math.max(0, Math.sin(ph));
    }
    const abd = moving ? 0.16 : 0.13;
    const sh: V3 = [s * 4.75 * wk, P - 13.0 - breathe, zAt(P - 13)];
    const el = add(sh, [s * Math.sin(abd), Math.cos(ang), Math.sin(ang)], UPPER_ARM);
    const fd: V3 = [s * Math.sin(abd * 0.7), Math.cos(ang + eb), Math.sin(ang + eb)];
    const wr = add(el, fd, FOREARM);
    const arm: Arm = { s, sh, el, wr, hand: add(wr, fd, 0.85) };
    if (armed) {
      const b = ang + eb * 0.5 + 0.45;
      const n = Math.hypot(0.2, 1);
      arm.blade = [-0.2 / n, Math.cos(b) / n, Math.sin(b) / n];
    }
    return arm;
  });

  // --- Tronc et vêtements --------------------------------------------------
  const st = Math.abs(legs[0].knee[2] - legs[1].knee[2]) * 0.32;
  const kz = (legs[0].knee[2] + legs[1].knee[2]) * 0.25;
  const torsoSecs: Sec[] = [
    sec(-15.5, 1.5, 1.4),
    sec(-14.7, 3.3 * wk, 2.1 * wk),
    sec(-13.4, 5.15 * wk, 2.55 * wk),
    sec(-10.6, 5.0 * wk, 2.9 * wk),
    sec(-7.2, 4.4 * wk, 2.65 * wk),
    sec(-4.1, 3.65 * wk, 2.35 * wk),
    sec(-0.9, 4.05 * wk, 2.6 * wk),
  ];
  const skirt: Sec[] = (() => {
    switch (a.outfit) {
      case 'mailles':
        return [sec(2.5, 4.35 * wk, 2.9 * wk, kz * 0.4), sec(5.2, 4.7 * wk + st, 3.2 * wk + st, kz * 0.7), sec(7.0, 4.9 * wk + st, 3.35 * wk + st, kz)];
      case 'plates':
        return [sec(2.5, 4.4 * wk, 2.95 * wk, kz * 0.4), sec(5.4, 4.75 * wk + st, 3.25 * wk + st, kz)];
      case 'cuir':
        return [sec(1.8, 4.2 * wk, 2.75 * wk, kz * 0.3), sec(3.6, 4.35 * wk + st * 0.6, 2.9 * wk + st * 0.6, kz * 0.6)];
      case 'robe': {
        const hem = HERO_FEET_Y - 0.9 - P;
        return [
          sec(4, 4.6 * wk, 3.0 * wk, kz * 0.3),
          sec(10, 5.3 * wk + st, 3.5 * wk + st, kz * 0.7),
          sec(16, 6.0 * wk + st, 4.0 * wk + st, kz),
          sec(hem, 6.5 * wk + st, 4.4 * wk + st, kz * 1.1),
        ];
      }
    }
  })();
  const body = [...torsoSecs, ...skirt];
  const bodyPath = outline(body, 0.55 + Math.abs(pr.c) * 0.4);

  /** Point de la surface du tronc (côté visible) à une position latérale et une hauteur. */
  const surf = (lat: number, y: number): Pt => {
    let i = 0;
    while (i < body.length - 2 && body[i + 1].y < y) i++;
    const A = body[i];
    const B = body[i + 1];
    const k = clamp01((y - A.y) / (B.y - A.y || 1));
    const W = A.W + (B.W - A.W) * k;
    const D = A.D + (B.D - A.D) * k;
    const z = A.z + (B.z - A.z) * k;
    const side = pr.c >= 0 ? 1 : -1;
    return pr.p([lat, y, z + side * D * Math.sqrt(Math.max(0, 1 - (lat / W) ** 2))]);
  };
  /** Bande qui fait le tour du corps (ceinture, lames d'armure) : courbe à cause de la vue plongeante. */
  const band = (y: number, width: number, color: string): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    const w = body.reduce((m, s) => (Math.abs(s.y - y) < Math.abs(m.y - y) ? s : m)).W;
    for (let i = 0; i <= 10; i++) {
      const q = surf(-w + (2 * w * i) / 10, y);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  };
  const frontVisible = pr.c > 0.08;

  const drawTorso = (): void => {
    const xl = Math.min(...body.map((s) => s.c - s.e));
    const xr = Math.max(...body.map((s) => s.c + s.e));
    const yt = body[0].y;
    const yb = body[body.length - 1].y + 1;
    ctx.fillStyle = shadeHex(outfit, a.outfit === 'plates' ? 1.05 : 0.95);
    ctx.fill(bodyPath);

    ctx.save();
    ctx.clip(bodyPath);
    ctx.lineCap = 'round';
    switch (a.outfit) {
      case 'mailles': {
        // Anneaux : donne la texture "o=o=" des cottes de mailles.
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.22;
        rings(ctx, xl, xr, yt, yb, 1.25, 0.48);
        if (frontVisible) {
          // Fente du haubert entre les jambes.
          const q0 = surf(0, P + 2.6);
          const q1 = surf(0, P + 7.4);
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(q0.x, q0.y);
          ctx.lineTo(q1.x, q1.y);
          ctx.stroke();
        }
        band(P - 2.0, 1.3, STRAP);
        break;
      }
      case 'plates': {
        // Lames horizontales : bord sombre puis arête claire.
        for (let y = P - 8.6; y < yb; y += 2.2) {
          band(y, 0.45, 'rgba(0,0,0,0.5)');
          band(y + 0.5, 0.35, 'rgba(255,255,255,0.22)');
        }
        if (frontVisible) {
          // Arête du plastron.
          ctx.strokeStyle = 'rgba(255,255,255,0.32)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let y = P - 13; y <= P - 2; y += 1) {
            const q = surf(0, y);
            if (y === P - 13) ctx.moveTo(q.x, q.y);
            else ctx.lineTo(q.x, q.y);
          }
          ctx.stroke();
        }
        band(P - 2.0, 1.1, STRAP);
        break;
      }
      case 'cuir': {
        // Baudrier en travers du buste, rivets de laiton.
        ctx.strokeStyle = STRAP;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        const pts: Pt[] = [];
        for (let i = 0; i <= 8; i++) {
          const k = i / 8;
          pts.push(surf((3.5 - 7 * k) * wk, P - 13.2 + 11.4 * k));
        }
        pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.stroke();
        ctx.fillStyle = '#d8c08a';
        for (let i = 1; i < 8; i += 2) {
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, 0.3, 0, TAU);
          ctx.fill();
        }
        // Coutures de la tunique.
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.3;
        for (const lat of [-0.55, 0.55]) {
          ctx.beginPath();
          for (let y = P - 6; y <= P + 3.4; y += 1) {
            const q = surf(lat * 4 * wk, y);
            if (y === P - 6) ctx.moveTo(q.x, q.y);
            else ctx.lineTo(q.x, q.y);
          }
          ctx.stroke();
        }
        band(P - 2.0, 1.4, STRAP);
        break;
      }
      case 'robe': {
        // Plis verticaux du tissu, plus marqués en bas.
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 0.35;
        for (let i = -6; i <= 6; i++) {
          ctx.beginPath();
          for (let y = P - 13; y <= yb; y += 2) {
            const sway = Math.sin(y * 0.3 + i + t * 1.5) * 0.25 * clamp01((y - P) / 10);
            const q = surf(i * 0.15 * body[Math.min(body.length - 1, 6)].W + sway, y);
            if (y === P - 13) ctx.moveTo(q.x, q.y);
            else ctx.lineTo(q.x, q.y);
          }
          ctx.stroke();
        }
        if (frontVisible) {
          // Étole de la couleur d'accent, du cou à l'ourlet.
          ctx.strokeStyle = shadeHex(accent, 1.2);
          ctx.lineWidth = 0.9;
          for (const lat of [-0.9, 0.9]) {
            ctx.beginPath();
            for (let y = P - 14.6; y <= P + 16; y += 1.5) {
              const q = surf(lat, y);
              if (y === P - 14.6) ctx.moveTo(q.x, q.y);
              else ctx.lineTo(q.x, q.y);
            }
            ctx.stroke();
          }
        }
        band(P - 3.0, 1.5, shadeHex(accent, 0.9));
        break;
      }
    }
    if (a.outfit !== 'robe' && frontVisible) {
      // Boucle de ceinture.
      const q = surf(0, P - 2.0);
      ctx.fillStyle = GOLD;
      ctx.fillRect(q.x - 0.75, q.y - 0.8, 1.5, 1.6);
    }
    ctx.restore();
    volume(ctx, bodyPath, xl, xr, yt, yb);
  };

  // --- Bras, jambes, épée --------------------------------------------------
  const legColor = a.outfit === 'cuir' ? LEATHER : a.outfit === 'robe' ? '#2b2427' : a.outfit === 'plates' ? outfit : scaleHex(outfit, 0.75);
  const drawLeg = (l: Leg): void => {
    const H = pr.p(l.hip);
    const K = pr.p(l.knee);
    const A = pr.p(l.ankle);
    tube(ctx, H, K, 1.8 * lk, 1.2 * lk, legColor, 0.22 * lk);
    tube(ctx, K, A, 1.2 * lk, 0.74 * lk, legColor, 0.3 * lk);
    const boot = a.outfit === 'plates' ? scaleHex(outfit, 0.7) : BOOT;
    tube(ctx, pr.p(lerp3(l.knee, l.ankle, 0.42)), A, 1.08 * lk, 0.88 * lk, boot, 0.05);
    const heel = pr.p(add(l.ankle, [0, 1.0, -0.55]));
    const toe = pr.p(add(l.ankle, [0, 1.15 - 2.5 * Math.sin(l.pitch), 2.5 * Math.cos(l.pitch)]));
    tube(ctx, heel, toe, 0.95 * lk, 0.72 * lk, boot);
    if (a.outfit === 'plates') blob(ctx, K.x, K.y, 1.05 * lk, 0.95 * lk, outfit, 1.15);
  };

  const sleeve = outfit;
  const forearm = a.outfit === 'cuir' ? skin : outfit;
  const hand = a.outfit === 'mailles' || a.outfit === 'cuir' ? GLOVE : a.outfit === 'plates' ? GAUNTLET : skin;
  const drawArm = (arm: Arm): void => {
    const armed = !!arm.blade;
    const S = pr.p(arm.sh);
    let E = pr.p(arm.el);
    let W = pr.p(arm.wr);
    let Hd = pr.p(arm.hand);
    let sword: (() => void) | null = null;
    if (armed && swing > 0) {
      // Coup d'épée : le bras passe de derrière l'épaule à devant, lame dans l'axe, traînée claire.
      const al = -2.55 + (1 - swing) * 3.9;
      const R = UPPER_ARM + FOREARM + 0.85 + BLADE * 0.72;
      ctx.strokeStyle = `rgba(255,236,190,${0.22 + 0.45 * swing})`;
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(S.x, S.y, R, Math.PI / 2 + 2.55, Math.PI / 2 - al, true);
      ctx.stroke();
      E = { x: S.x + Math.sin(al) * UPPER_ARM, y: S.y + Math.cos(al) * UPPER_ARM, d: S.d };
      const a2 = al + 0.12;
      W = { x: E.x + Math.sin(a2) * FOREARM, y: E.y + Math.cos(a2) * FOREARM, d: S.d };
      Hd = { x: W.x + Math.sin(a2) * 0.85, y: W.y + Math.cos(a2) * 0.85, d: S.d };
      const bx = Math.sin(al + 0.2);
      const by = Math.cos(al + 0.2);
      const G = { x: Hd.x + bx * 0.95, y: Hd.y + by * 0.95 };
      sword = () =>
        drawSword(ctx, G, { x: G.x + bx * BLADE, y: G.y + by * BLADE }, { x: Hd.x - bx * 1.9, y: Hd.y - by * 1.9 }, { x: G.x - by * 1.75, y: G.y + bx * 1.75 }, { x: G.x + by * 1.75, y: G.y - bx * 1.75 });
    } else if (arm.blade) {
      const bd = arm.blade;
      const g3 = add(arm.hand, bd, 0.95);
      sword = () => drawSword(ctx, pr.p(g3), pr.p(add(g3, bd, BLADE)), pr.p(add(arm.hand, bd, -1.9)), pr.p(add(g3, [1, 0, 0], 1.75)), pr.p(add(g3, [1, 0, 0], -1.75)));
    }

    blob(ctx, S.x, S.y + 0.3, 1.7 * lk, 1.8 * lk, sleeve);
    tube(ctx, S, E, 1.42 * lk, 1.02 * lk, sleeve, 0.2 * lk);
    if (a.outfit === 'robe') tube(ctx, E, W, 1.1 * lk, 1.6 * lk, outfit);
    else tube(ctx, E, W, 1.06 * lk, 0.72 * lk, forearm, 0.18 * lk);
    if (a.outfit === 'cuir') tube(ctx, lerp(E, W, 0.45), W, 0.95 * lk, 0.82 * lk, LEATHER);
    if (a.outfit === 'plates') {
      blob(ctx, E.x, E.y, 0.95 * lk, 0.9 * lk, outfit, 1.15);
      // Épaulière.
      blob(ctx, S.x, S.y - 0.2, 2.4 * lk, 1.8 * lk, outfit, 1.2);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.ellipse(S.x, S.y + 0.5, 2.1 * lk, 1.1 * lk, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    sword?.();
    blob(ctx, Hd.x, Hd.y, 0.88 * lk, 0.88 * lk, hand);
  };

  // --- Ordre de dessin : du plus loin au plus proche ------------------------
  const items: { d: number; draw: () => void }[] = [];
  if (a.outfit !== 'robe') {
    const capeBottom = a.outfit === 'cuir' ? P + 8 : HERO_FEET_Y - 3.2;
    const trail = moving ? 2.4 + Math.sin(t * 7) * 0.5 : 0.35 + Math.sin(t * 1.1) * 0.3;
    items.push({
      d: -2.8 * wk * pr.c,
      draw: () => drawCape(ctx, pr, accent, P - 13.6 - breathe, capeBottom, zAt(P - 13), 5.0 * wk, 2.6 * wk, trail, Math.sin(t * 1.1) * 0.4, t),
    });
  }
  const H: V3 = [0, P - 19.7 - breathe, zAt(P - 19.7) + 0.25];
  const flow = moving ? 1.2 : 0.2 + Math.sin(t * 1.1) * 0.15;
  if (a.head === 'criniere') items.push({ d: pr.p([0, 0, -2.2]).d * 1.4, draw: () => drawHairBack(ctx, pr, a.colors.hair, H, flow, t) });
  for (const l of legs) items.push({ d: pr.p(l.knee).d * 0.3 - 1.2, draw: () => drawLeg(l) });
  items.push({ d: 0, draw: drawTorso });
  for (const arm of arms) items.push({ d: arm.blade && swing > 0 ? 10 : pr.p(arm.el).d + 0.4, draw: () => drawArm(arm) });
  items.push({
    d: 0.5,
    draw: () => tube(ctx, pr.p([0, P - 15.0, zAt(P - 15)]), pr.p([0, P - 18.2, zAt(P - 18) + 0.2]), 1.2 * Math.sqrt(wk), 1.05, skin, 0, 0.78),
  });
  items.push({ d: 3, draw: () => drawHead(ctx, pr, a, H, wk, t, flow) });
  items.sort((p, q) => p.d - q.d);
  for (const it of items) it.draw();
}

// --- Cape -------------------------------------------------------------------

/**
 * Cape en bandes verticales autour des épaules : chaque bande a sa normale, donc sa
 * lumière ; on voit la doublure (plus sombre) quand elle est tournée vers nous.
 */
function drawCape(
  ctx: CanvasRenderingContext2D,
  pr: Proj,
  color: string,
  top: number,
  bottom: number,
  z0: number,
  W: number,
  D: number,
  trail: number,
  sway: number,
  t: number,
): void {
  const N = 14;
  const tops: Pt[] = [];
  const bots: Pt[] = [];
  const us: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = -1.5 + (3 * i) / N;
    const su = Math.sin(u);
    const cu = Math.cos(u);
    us.push(u);
    tops.push(pr.p([(W + 0.25) * su, top - 0.7 * cu, z0 - D * cu]));
    const hem = bottom - trail * 0.55 + Math.sin(u * 4.5 + t * 3) * 0.55;
    bots.push(pr.p([(W + 2.8) * su + sway, hem, z0 - (D + 0.6) * cu - trail * (0.6 + 0.4 * cu)]));
  }
  // Lumière dans le repère du corps : vers la gauche de l'écran et vers nous.
  const lx = -0.62 * pr.c - 0.55 * pr.s;
  const lz = -0.62 * pr.s + 0.55 * pr.c;
  const strips: { d: number; i: number; k: number }[] = [];
  for (let i = 0; i < N; i++) {
    const um = (us[i] + us[i + 1]) / 2;
    const nx = Math.sin(um);
    const nz = -Math.cos(um);
    const view = -nx * pr.s + nz * pr.c;
    const side = view >= 0 ? 1 : -1;
    const lam = Math.max(0, side * (nx * lx + nz * lz));
    let k = 0.4 + 0.85 * lam + 0.14 * Math.sin(um * 7 + 0.8);
    if (view < 0) k *= 0.6;
    strips.push({ d: (tops[i].d + tops[i + 1].d + bots[i].d + bots[i + 1].d) / 4, i, k });
  }
  strips.sort((p, q) => p.d - q.d);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.3;
  for (const { i, k } of strips) {
    const a = tops[i];
    const b = tops[i + 1];
    const c = bots[i + 1];
    const d = bots[i];
    const g = ctx.createLinearGradient(0, Math.min(a.y, b.y), 0, Math.max(c.y, d.y));
    g.addColorStop(0, shadeHex(color, k * 1.08));
    g.addColorStop(1, shadeHex(color, k * 0.55));
    ctx.fillStyle = g;
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// --- Tête ---------------------------------------------------------------------

/** Ellipsoïde (centre local à la tête, demi-axes W, H, D) ajouté à un chemin. */
function ell(path: Path2D, pr: Proj, H: V3, o: V3, W: number, h: number, D: number): Pt {
  const c = pr.p(add(H, o));
  const rx = pr.ext(W, D);
  path.moveTo(c.x + rx, c.y);
  path.ellipse(c.x, c.y, rx, h, 0, 0, TAU);
  return c;
}

/** Crâne, mâchoire et menton : la forme de la tête sous n'importe quel angle. */
function headShape(pr: Proj, H: V3): Path2D {
  const path = new Path2D();
  ell(path, pr, H, [0, -0.45, -0.3], 2.3, 2.75, 2.8);
  ell(path, pr, H, [0, 1.25, 0.45], 1.95, 1.75, 1.85);
  ell(path, pr, H, [0, 2.4, 1.3], 1.05, 0.72, 0.85);
  return path;
}

function drawHead(ctx: CanvasRenderingContext2D, pr: Proj, a: Appearance, H: V3, wk: number, t: number, flow: number): void {
  const { accent, hair, skin } = a.colors;
  const hp = (x: number, y: number, z: number): Pt => pr.p(add(H, [x, y, z]));
  const front = pr.c > 0.02;
  const center = hp(0, 0, 0);
  const bx0 = center.x - 4;
  const bx1 = center.x + 4;

  if (a.head === 'capuche') {
    // Pèlerine sur les épaules, puis capuche ; le visage reste un trou d'ombre.
    const mantle = outline(
      [
        mk(pr, H, 2.6, 2.9, 3.0, -0.2),
        mk(pr, H, 4.6, 4.9 * wk, 3.0 * wk, -0.5),
        mk(pr, H, 6.3, 5.7 * wk, 3.2 * wk, -0.6),
      ],
      0.9,
    );
    ctx.fillStyle = shadeHex(accent, 0.95);
    ctx.fill(mantle);
    volume(ctx, mantle, bx0 - 2.5 * wk, bx1 + 2.5 * wk, H[1] + 2.6, H[1] + 7.2);
    const hood = new Path2D();
    ell(hood, pr, H, [0, -0.55, -0.55 - flow * 0.3], 3.15, 3.45, 3.45);
    ell(hood, pr, H, [0, -3.3, -1.3 - flow * 0.5], 1.1, 1.05, 1.1);
    ctx.fillStyle = shadeHex(accent, 1.0);
    ctx.fill(hood);
    volume(ctx, hood, bx0, bx1, H[1] - 4.5, H[1] + 3);
    if (front) {
      const o = hp(0, 0.45, 2.1);
      ctx.fillStyle = '#0a0706';
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, 1.75 * pr.c + 0.3, 2.35, 0, 0, TAU);
      ctx.fill();
      const blink = Math.sin(t * 0.7) > 0.985 ? 0.1 : 1;
      ctx.fillStyle = `rgba(255,207,106,${blink})`;
      for (const s of [-1, 1]) {
        const vis = -s * 0.4 * pr.s + 0.92 * pr.c;
        if (vis < 0.15) continue;
        const e = hp(s * 0.85, 0.15, 2.0);
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 0.42 * vis + 0.08, 0.42, 0, 0, TAU);
        ctx.fill();
      }
    } else {
      // Couture de la capuche vue de dos.
      const q0 = hp(0, -3.9, -1.2);
      const q1 = hp(0, 2.6, -3.2);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y);
      ctx.quadraticCurveTo(hp(0, -1, -3.6).x, hp(0, -1, -3.6).y, q1.x, q1.y);
      ctx.stroke();
    }
    return;
  }

  const helmed = a.head === 'casque' || a.head === 'cornes';
  const horns = a.head === 'cornes';
  if (horns) for (const s of [1, -1]) if (hp(s * 2.2, -1.4, 0.1).d < center.d) drawHorn(ctx, pr, H, s);

  if (helmed) {
    // Camail de mailles sous le casque : couvre le cou et tombe sur les épaules.
    const coif = outline([mk(pr, H, 0.4, 2.55, 2.95, -0.2), mk(pr, H, 3.4, 2.95, 3.0, -0.4), mk(pr, H, 5.6, 4.4 * wk, 3.1 * wk, -0.5)], 0.7);
    ctx.save();
    ctx.fillStyle = shadeHex(horns ? BLACK_STEEL : STEEL, 0.75);
    ctx.fill(coif);
    ctx.clip(coif);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.2;
    rings(ctx, bx0 - 3, bx1 + 3, H[1] - 1, H[1] + 7, 1.1, 0.42);
    ctx.restore();
    volume(ctx, coif, bx0 - 2, bx1 + 2, H[1], H[1] + 6.5);
  }

  if (!horns) {
    // Visage : crâne, mâchoire, menton.
    const head = headShape(pr, H);
    const lit = hp(-0.9, -0.9, 1.6);
    const g = ctx.createRadialGradient(lit.x, lit.y, 0.2, center.x, center.y + 0.4, 4.4);
    g.addColorStop(0, shadeHex(skin, 1.3));
    g.addColorStop(0.55, shadeHex(skin, 0.95));
    g.addColorStop(1, shadeHex(skin, 0.45));
    ctx.fillStyle = g;
    ctx.fill(head);
    volume(ctx, head, bx0 + 1.5, bx1 - 1.5, H[1] - 3.3, H[1] + 3.2, 0.7);
    if (front) drawFace(ctx, pr, hp, a.head === 'rase' ? hair : null);
    if (a.head === 'rase') {
      // Oreille du côté visible, chaume sur le crâne, cicatrice.
      for (const s of [1, -1]) {
        const e = hp(s * 2.25, 0.2, -0.1);
        if (e.d < center.d - 0.3) continue;
        ctx.fillStyle = shadeHex(skin, 0.8);
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 0.55 * Math.abs(pr.s) + 0.2, 0.85, 0, 0, TAU);
        ctx.fill();
      }
      capOverFace(ctx, pr, H, front, () => {
        const cap = new Path2D();
        ell(cap, pr, H, [0, -0.6, -0.35], 2.36, 2.8, 2.86);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = shadeHex(hair, 0.9);
        ctx.fill(cap);
        ctx.globalAlpha = 1;
      });
      if (front && pr.s > -0.3) {
        const s0 = hp(1.1, -2.6, 1.6);
        const s1 = hp(1.7, 0.6, 1.9);
        ctx.strokeStyle = '#7a2a22';
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.stroke();
      }
    }
    if (a.head === 'criniere') {
      // Calotte de cheveux, mèches qui encadrent le visage.
      capOverFace(ctx, pr, H, front, () => {
        const cap = new Path2D();
        ell(cap, pr, H, [0, -0.7, -0.45 - flow * 0.2], 2.6, 2.95, 3.05);
        ctx.fillStyle = hairGradient(ctx, hair, H[1] - 3.8, H[1] + 2);
        ctx.fill(cap);
      });
      for (const s of [1, -1]) {
        const top = hp(s * 2.15, -0.6, 0.5);
        if (top.d < center.d - 0.6) continue;
        tube(ctx, top, hp(s * 2.55, 4.4, -0.2 - flow * 0.6), 0.7, 0.35, hair);
      }
    }
  }

  if (helmed) {
    const metal = horns ? BLACK_STEEL : STEEL;
    if (horns) {
      // Heaume fermé : fente de vision, souffle, lueur rouge au fond.
      const helm = new Path2D();
      ell(helm, pr, H, [0, -0.35, -0.2], 2.7, 3.1, 3.1);
      ell(helm, pr, H, [0, 1.6, 0.5], 2.25, 1.75, 2.35);
      metalFill(ctx, helm, metal, hp(-1, -1.6, 1.4), center);
      volume(ctx, helm, bx0 + 1, bx1 - 1, H[1] - 3.5, H[1] + 3.4, 0.8);
      if (front) {
        const slit = hp(0, -0.15, 2.55);
        ctx.fillStyle = '#060506';
        ctx.beginPath();
        ctx.ellipse(slit.x, slit.y, 1.75 * pr.c + 0.2, 0.36, 0, 0, TAU);
        ctx.fill();
        const br = hp(0, 1.6, 2.75);
        ctx.fillRect(br.x - 0.2, br.y - 0.8, 0.4, 1.6);
        ctx.fillStyle = 'rgba(255,80,50,0.75)';
        for (const s of [-1, 1]) {
          const e = hp(s * 0.8, -0.15, 2.45);
          if (-s * 0.4 * pr.s + 0.9 * pr.c < 0.2) continue;
          ctx.fillRect(e.x - 0.25, e.y - 0.12, 0.5, 0.24);
        }
      }
    } else {
      // Casque à nasal : calotte jusqu'aux sourcils, protège-joues, nasal.
      const dome = new Path2D();
      ell(dome, pr, H, [0, -1.0, -0.3], 2.6, 2.6, 3.05);
      const brow = hp(0, -0.5, 0).y;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx0 - 2, H[1] - 6, bx1 - bx0 + 4, brow - (H[1] - 6));
      ctx.clip();
      metalFill(ctx, dome, metal, hp(-1, -2.4, 1.2), center);
      ctx.restore();
      ctx.strokeStyle = shadeHex(metal, 0.55);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const u = -Math.PI / 2 + (Math.PI * i) / 12;
        const side = pr.c >= 0 ? 1 : -1;
        const q = hp(2.62 * Math.sin(u), -0.55, -0.3 + side * 3.0 * Math.cos(u));
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      for (const s of [1, -1]) {
        const g = hp(s * 2.05, 0.9, 0.9);
        if (g.d < center.d - 1.2) continue;
        blob(ctx, g.x, g.y, 0.55 + 0.4 * Math.abs(pr.s), 1.6, metal, 0.95);
      }
      if (front) tube(ctx, hp(0, -0.7, 2.75), hp(0, 1.3, 2.85), 0.34, 0.3, metal, 0, 1.05);
    }
  }
  if (horns) for (const s of [1, -1]) if (hp(s * 2.2, -1.4, 0.1).d >= center.d) drawHorn(ctx, pr, H, s);
}

/** Orbites, nez, bouche ; barbe naissante si `stubble` est donné. */
function drawFace(ctx: CanvasRenderingContext2D, pr: Proj, hp: (x: number, y: number, z: number) => Pt, stubble: string | null): void {
  for (const s of [-1, 1]) {
    const vis = -s * 0.42 * pr.s + 0.9 * pr.c;
    if (vis <= 0.05) continue;
    const e = hp(s * 0.9, -0.1, 2.05);
    ctx.fillStyle = 'rgba(35,18,12,0.6)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 0.65 * vis + 0.12, 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(235,225,205,0.6)';
    ctx.beginPath();
    ctx.ellipse(e.x + 0.1 * pr.s, e.y + 0.05, 0.2 * vis + 0.05, 0.16, 0, 0, TAU);
    ctx.fill();
  }
  // Nez : ombre côté opposé à la lumière, reflet sur la pointe.
  const bridge = hp(0, -0.2, 2.35);
  const tip = hp(0, 0.95, 2.8);
  const base = hp(0, 1.25, 2.3);
  ctx.fillStyle = 'rgba(40,20,14,0.4)';
  ctx.beginPath();
  ctx.moveTo(bridge.x, bridge.y);
  ctx.lineTo(tip.x + 0.15, tip.y);
  ctx.lineTo(base.x + 0.55, base.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,235,215,0.35)';
  ctx.beginPath();
  ctx.ellipse(tip.x - 0.15, tip.y - 0.2, 0.25, 0.3, 0, 0, TAU);
  ctx.fill();
  const m0 = hp(-0.62, 1.85, 2.0);
  const m1 = hp(0.62, 1.85, 2.0);
  ctx.strokeStyle = 'rgba(70,30,24,0.75)';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y);
  ctx.lineTo(m1.x, m1.y);
  ctx.stroke();
  if (stubble) {
    const j = hp(0, 2.1, 1.1);
    ctx.fillStyle = shadeHex(stubble, 0.8);
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(j.x, j.y, pr.ext(1.85, 1.6), 1.1, 0, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Dessine une calotte (cheveux, chaume) sans couvrir l'ovale du visage quand on le voit. */
function capOverFace(ctx: CanvasRenderingContext2D, pr: Proj, H: V3, front: boolean, draw: () => void): void {
  ctx.save();
  if (front) {
    const keep = new Path2D();
    keep.rect(-100, -100, 300, 300);
    ell(keep, pr, H, [0, 1.05, 0.85], 1.9, 2.45, 1.9);
    ctx.clip(keep, 'evenodd');
  }
  draw();
  ctx.restore();
}

/** Longue chevelure qui tombe dans le dos et flotte à la course. */
function drawHairBack(ctx: CanvasRenderingContext2D, pr: Proj, color: string, H: V3, flow: number, t: number): void {
  const secs = [mk(pr, H, -1.6, 2.55, 2.95, -0.4), mk(pr, H, 1.0, 2.6, 2.4, -1.0), mk(pr, H, 3.8, 2.85, 1.4, -2.0 - flow * 0.8), mk(pr, H, 6.6, 2.9, 0.8, -2.6 - flow * 1.6)];
  secs[3].c += Math.sin(t * 2.3) * 0.25;
  const path = outline(secs, 0.6);
  ctx.fillStyle = hairGradient(ctx, color, H[1] - 3, H[1] + 7);
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.3;
  for (let i = -3; i <= 3; i++) {
    const x = secs[1].c + i * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, H[1] - 1);
    ctx.quadraticCurveTo(x + i * 0.2, H[1] + 3, secs[3].c + i * 0.9, H[1] + 7.5);
    ctx.stroke();
  }
  ctx.restore();
  volume(ctx, path, secs[0].c - 3, secs[0].c + 3, H[1] - 3, H[1] + 7.2);
}

function drawHorn(ctx: CanvasRenderingContext2D, pr: Proj, H: V3, s: number): void {
  const p0: V3 = [s * 2.2, -1.4, 0.1];
  const p1: V3 = [s * 5.0, -2.0, 0.4];
  const p2: V3 = [s * 4.6, -6.4, 1.3];
  const left: Pt[] = [];
  const right: Pt[] = [];
  const N = 8;
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const q: V3 = [0, 1, 2].map((j) => (1 - k) ** 2 * p0[j] + 2 * (1 - k) * k * p1[j] + k * k * p2[j]) as V3;
    pts.push(pr.p(add(H, q)));
  }
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(N, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const r = 0.8 * (1 - i / N) + 0.05;
    left.push({ x: pts[i].x - (dy / l) * r, y: pts[i].y + (dx / l) * r, d: 0 });
    right.push({ x: pts[i].x + (dy / l) * r, y: pts[i].y - (dx / l) * r, d: 0 });
  }
  const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[N].x, pts[N].y);
  g.addColorStop(0, '#6a5a42');
  g.addColorStop(1, '#efe4c8');
  ctx.fillStyle = g;
  ctx.beginPath();
  left.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  for (let i = N; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();
}

// --- Épée ---------------------------------------------------------------------

function drawSword(
  ctx: CanvasRenderingContext2D,
  G: { x: number; y: number },
  T: { x: number; y: number },
  Pm: { x: number; y: number },
  ga: { x: number; y: number },
  gb: { x: number; y: number },
): void {
  ctx.lineCap = 'round';
  // Fusée et pommeau.
  ctx.strokeStyle = '#3a2a1c';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(G.x, G.y);
  ctx.lineTo(Pm.x, Pm.y);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(Pm.x, Pm.y, 0.55, 0, TAU);
  ctx.fill();
  // Lame effilée.
  const dx = T.x - G.x;
  const dy = T.y - G.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const blade = ctx.createLinearGradient(G.x, G.y, T.x, T.y);
  blade.addColorStop(0, '#eef2f6');
  blade.addColorStop(1, '#6c7680');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(G.x + nx * 0.45, G.y + ny * 0.45);
  ctx.lineTo(G.x + dx * 0.85 + nx * 0.3, G.y + dy * 0.85 + ny * 0.3);
  ctx.lineTo(T.x, T.y);
  ctx.lineTo(G.x + dx * 0.85 - nx * 0.3, G.y + dy * 0.85 - ny * 0.3);
  ctx.lineTo(G.x - nx * 0.45, G.y - ny * 0.45);
  ctx.closePath();
  ctx.fill();
  // Garde.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(ga.x, ga.y);
  ctx.lineTo(gb.x, gb.y);
  ctx.stroke();
}

// --- Volumes et lumière -------------------------------------------------------

/** Section en coordonnées de la tête (pour pèlerine, camail, chevelure). */
function mk(pr: Proj, H: V3, dy: number, W: number, D: number, dz: number): Sec {
  const z = H[2] + dz;
  return { y: H[1] + dy, W, D, z, c: pr.cx + z * pr.s, e: pr.ext(W, D) };
}

/** Contour lissé d'une pile de sections : côté gauche, ourlet arrondi, côté droit. */
function outline(secs: Sec[], hem: number): Path2D {
  const pts: [number, number][] = [];
  for (const s of secs) pts.push([s.c - s.e, s.y]);
  const last = secs[secs.length - 1];
  pts.push([last.c, last.y + hem]);
  for (let i = secs.length - 1; i >= 0; i--) pts.push([secs[i].c + secs[i].e, secs[i].y]);
  const path = new Path2D();
  const n = pts.length;
  const mid = (i: number): [number, number] => {
    const p = pts[i % n];
    const q = pts[(i + 1) % n];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  };
  const m0 = mid(n - 1);
  path.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    path.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  path.closePath();
  return path;
}

/**
 * Modelé d'une forme déjà remplie : lumière chaude à gauche, ombre propre à droite,
 * liseré froid de lune sur le bord, occlusion vers le bas. Garde l'opacité de la forme.
 */
function volume(ctx: CanvasRenderingContext2D, path: Path2D, x0: number, x1: number, y0: number, y1: number, k = 1): void {
  ctx.save();
  ctx.clip(path);
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, `rgba(255,236,210,${0.3 * k})`);
  g.addColorStop(0.3, 'rgba(255,236,210,0)');
  g.addColorStop(0.58, `rgba(0,0,0,${0.14 * k})`);
  g.addColorStop(0.9, `rgba(0,0,0,${0.52 * k})`);
  g.addColorStop(1, `rgba(150,172,220,${0.25 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
  const v = ctx.createLinearGradient(0, y0, 0, y1);
  v.addColorStop(0, `rgba(255,236,210,${0.12 * k})`);
  v.addColorStop(0.5, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.28 * k})`);
  ctx.fillStyle = v;
  ctx.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
  ctx.restore();
}

/** Membre en cylindre effilé (renflement du muscle), éclairé en travers de son axe. */
function tube(ctx: CanvasRenderingContext2D, A: Pt, B: Pt, r0: number, r1: number, color: string, bulge = 0, k = 1): void {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) {
    blob(ctx, A.x, A.y, Math.max(r0, r1), Math.max(r0, r1), color, k);
    return;
  }
  const nx = -dy / len;
  const ny = dx / len;
  const mx = A.x + dx * 0.42;
  const my = A.y + dy * 0.42;
  const rm = (r0 + r1) / 2 + bulge;
  const kc = 2 * rm - (r0 + r1) / 2;
  const an = Math.atan2(ny, nx);
  ctx.beginPath();
  ctx.moveTo(A.x + nx * r0, A.y + ny * r0);
  ctx.quadraticCurveTo(mx + nx * kc, my + ny * kc, B.x + nx * r1, B.y + ny * r1);
  ctx.arc(B.x, B.y, r1, an, an - Math.PI, true);
  ctx.quadraticCurveTo(mx - nx * kc, my - ny * kc, A.x - nx * r0, A.y - ny * r0);
  ctx.arc(A.x, A.y, r0, an - Math.PI, an - TAU, true);
  ctx.closePath();
  const R = Math.max(r0, r1, rm);
  const sg = nx * LX + ny * LY >= 0 ? 1 : -1;
  const g = ctx.createLinearGradient(mx + nx * R * sg, my + ny * R * sg, mx - nx * R * sg, my - ny * R * sg);
  g.addColorStop(0, shadeHex(color, 1.32 * k));
  g.addColorStop(0.3, shadeHex(color, 1.05 * k));
  g.addColorStop(0.68, shadeHex(color, 0.62 * k));
  g.addColorStop(0.9, shadeHex(color, 0.42 * k));
  g.addColorStop(1, shadeHex(color, 0.6 * k));
  ctx.fillStyle = g;
  ctx.fill();
}

/** Volume arrondi (articulation, main, épaulière) éclairé en haut à gauche. */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, k = 1): void {
  const g = ctx.createRadialGradient(x + LX * rx * 0.45, y + LY * ry * 0.45, 0.1, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, shadeHex(color, 1.35 * k));
  g.addColorStop(0.55, shadeHex(color, 0.95 * k));
  g.addColorStop(0.9, shadeHex(color, 0.5 * k));
  g.addColorStop(1, shadeHex(color, 0.62 * k));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/** Métal poli : reflet serré, ombre franche. */
function metalFill(ctx: CanvasRenderingContext2D, path: Path2D, metal: string, hi: Pt, c: Pt): void {
  const g = ctx.createRadialGradient(hi.x, hi.y, 0.1, c.x, c.y, 4.2);
  g.addColorStop(0, shadeHex(metal, 1.7));
  g.addColorStop(0.25, shadeHex(metal, 1.1));
  g.addColorStop(0.7, shadeHex(metal, 0.6));
  g.addColorStop(1, shadeHex(metal, 0.3));
  ctx.fillStyle = g;
  ctx.fill(path);
}

/** Texture de mailles : anneaux en quinconce, tracés d'un seul trait. */
function rings(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, step: number, r: number): void {
  ctx.beginPath();
  let row = 0;
  for (let y = y0; y < y1; y += step, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
  }
  ctx.stroke();
}

function hairGradient(ctx: CanvasRenderingContext2D, color: string, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shadeHex(color, 1.3));
  g.addColorStop(1, shadeHex(color, 0.5));
  return g;
}

function lerp(A: Pt, B: Pt, k: number): Pt {
  return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, d: A.d + (B.d - A.d) * k };
}

/** Comme shadeHex, mais rend un hex (pour s'en servir comme couleur de base). */
function scaleHex(h: string, k: number): string {
  const n = parseInt(h.slice(1), 16);
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}

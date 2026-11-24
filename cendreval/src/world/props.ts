import { hash2 } from '../core/rng';
import { T, isWater } from './tiles';
import type { World } from './World';

/**
 * Décor naturel posé sur les cases : arbres isolés, lisières de forêt, buissons,
 * touffes d'herbe, fleurs, rochers, roseaux. C'est une donnée pure et déterministe
 * (un hash par case) : rien n'est stocké, on relit ce qui est visible à chaque image.
 * Le dessin (formes Canvas 2D) est converti en glyphes comme les personnages.
 */
export type PropKind = 'oak' | 'pine' | 'dead' | 'bush' | 'tuft' | 'drytuft' | 'flowers' | 'rock' | 'reeds' | 'stump';

export interface Prop {
  kind: PropKind;
  /** Position au sol (cases, flottants). */
  x: number;
  y: number;
  /** Variante figée 0..7 (taille, forme, couleur). */
  v: number;
}

/** Les gros éléments sont détourés et projettent une ombre de contact. */
export const PROP_SOLID: Record<PropKind, boolean> = {
  oak: true,
  pine: true,
  dead: true,
  bush: true,
  rock: true,
  stump: true,
  tuft: false,
  drytuft: false,
  flowers: false,
  reeds: false,
};

/** Rayon de l'ombre de contact (cases). */
export const PROP_SHADOW: Partial<Record<PropKind, number>> = { oak: 1.5, pine: 1.1, dead: 0.7, bush: 0.8, rock: 0.75, stump: 0.4 };

/** Boîte englobante du dessin (largeurs de case, pieds en y = 0, y vers le bas). */
export function propBox(p: Prop): { x0: number; x1: number; y0: number; y1: number } {
  const k = p.v / 7;
  // Marges calculées sur les dessins ci-dessous, vent le plus fort compris.
  switch (p.kind) {
    case 'oak': {
      const w = 1.55 * (1.7 + 0.6 * k) + 0.6;
      return { x0: -w, x1: w, y0: -(6.5 + 1.9 * k), y1: 0.3 };
    }
    case 'pine': {
      const w = 1.5 + 0.4 * k + 0.8;
      return { x0: -w, x1: w, y0: -(1.05 * (6.2 + 1.8 * k) + 0.3), y1: 0.3 };
    }
    case 'dead':
      return { x0: -2.8, x1: 2.8, y0: -(5.7 + k), y1: 0.3 };
    case 'bush':
      return { x0: -1.8, x1: 1.8, y0: -1.8, y1: 0.2 };
    case 'rock':
      return { x0: -1.25, x1: 1.25, y0: -1.45, y1: 0.2 };
    case 'stump':
      return { x0: -0.6, x1: 0.6, y0: -0.9, y1: 0.2 };
    case 'reeds':
      return { x0: -2.1, x1: 2.1, y0: -2.4, y1: 0.2 };
    case 'flowers':
      return { x0: -1.3, x1: 1.3, y0: -1.1, y1: 0.2 };
    default:
      return { x0: -1.9, x1: 1.9, y0: -1.8, y1: 0.2 };
  }
}

/** Ajoute à `out` le décor des cases [x0, x1] × [y0, y1]. */
export function propsIn(w: World, x0: number, y0: number, x1: number, y1: number, out: Prop[]): void {
  const X0 = Math.max(1, Math.floor(x0));
  const Y0 = Math.max(1, Math.floor(y0));
  const X1 = Math.min(w.w - 2, Math.ceil(x1));
  const Y1 = Math.min(w.h - 2, Math.ceil(y1));
  for (let ty = Y0; ty <= Y1; ty++) {
    for (let tx = X0; tx <= X1; tx++) {
      const kind = pick(w, tx, ty);
      if (!kind) continue;
      out.push({
        kind,
        x: tx + 0.25 + hash2(tx, ty, 303) * 0.5,
        y: ty + 0.3 + hash2(tx, ty, 404) * 0.45,
        v: Math.floor(hash2(tx, ty, 202) * 8),
      });
    }
  }
}

function pick(w: World, x: number, y: number): PropKind | null {
  const tile = w.tile(x, y);
  const h = hash2(x, y, 101);
  switch (tile) {
    case T.GRASS: {
      if (h > 0.2) return null;
      const shore = isWater(w.tile(x, y - 1)) || isWater(w.tile(x, y + 1)) || isWater(w.tile(x - 1, y)) || isWater(w.tile(x + 1, y));
      if (shore) return h < 0.16 ? 'reeds' : null;
      if (w.landmarkAt(x + 0.5, y + 0.5)) return h < 0.05 ? 'flowers' : null;
      if (h < 0.014) return hash2(x, y, 7) < 0.6 ? 'oak' : 'pine';
      if (h < 0.04) return 'bush';
      if (h < 0.1) return 'tuft';
      if (h < 0.13) return 'flowers';
      if (h < 0.142) return 'rock';
      return null;
    }
    case T.TALL:
      return h < 0.32 ? 'tuft' : h < 0.36 ? 'flowers' : null;
    case T.DEAD:
      if (h < 0.03) return 'dead';
      if (h < 0.08) return 'drytuft';
      if (h < 0.1) return 'rock';
      if (h < 0.11) return 'stump';
      return null;
    case T.MUD:
      return h < 0.2 ? 'reeds' : null;
    case T.ROCK:
      return h < 0.09 ? 'rock' : null;
    case T.SCORCHED:
      return h < 0.025 ? 'stump' : null;
    case T.FOREST: {
      // Lisières : de vrais troncs sous la canopée, surtout côté caméra (sud).
      const south = w.tile(x, y + 1) !== T.FOREST;
      const edge = south || w.tile(x - 1, y) !== T.FOREST || w.tile(x + 1, y) !== T.FOREST;
      if (south && h < 0.6) return hash2(x, y, 7) < 0.55 ? 'pine' : 'oak';
      if (edge && h < 0.28) return hash2(x, y, 7) < 0.5 ? 'pine' : 'oak';
      return null;
    }
    default:
      return null;
  }
}

const TAU = Math.PI * 2;

/**
 * Dessine un élément de décor, pieds en (0, 0), y vers le bas, en largeurs de case.
 * `sway` : le vent (≈ -0.7..1.8) penche les cimes et les brins.
 */
export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, sway: number): void {
  const k = p.v / 7;
  const rnd = (i: number): number => hash2(p.v, i, 77);
  switch (p.kind) {
    case 'oak':
      return oak(ctx, k, sway, rnd);
    case 'pine':
      return pine(ctx, k, sway, rnd);
    case 'dead':
      return deadTree(ctx, k, sway, rnd);
    case 'bush':
      return bush(ctx, k, sway, rnd);
    case 'rock':
      return rock(ctx, k, rnd);
    case 'stump':
      return stump(ctx, k);
    case 'reeds':
      return reeds(ctx, k, sway, rnd);
    case 'tuft':
      return tuft(ctx, sway, rnd, ['#3f6a2c', '#8fb45e'], 1 + k * 0.4);
    case 'drytuft':
      return tuft(ctx, sway, rnd, ['#5e4a30', '#b49a62'], 0.85 + k * 0.4);
    case 'flowers':
      tuft(ctx, sway, rnd, ['#3a5e2a', '#7a9a50'], 0.7);
      return flowers(ctx, k, sway, rnd);
  }
}

function trunk(ctx: CanvasRenderingContext2D, base: number, top: number, height: number, lean: number, light: string, dark: string): void {
  const g = ctx.createLinearGradient(-base, 0, base, 0);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-base * 1.6, 0);
  ctx.quadraticCurveTo(-base, -0.25, -base * 0.8, -0.5);
  ctx.lineTo(-top + lean, -height);
  ctx.lineTo(top + lean, -height);
  ctx.lineTo(base * 0.8, -0.5);
  ctx.quadraticCurveTo(base, -0.25, base * 1.6, 0);
  ctx.closePath();
  ctx.fill();
}

/** Feuillu : tronc noueux, houppier en grappes éclairées par la lune (en haut à gauche). */
function oak(ctx: CanvasRenderingContext2D, k: number, sway: number, rnd: (i: number) => number): void {
  const H = 5.4 + k * 1.6;
  const R = 1.7 + k * 0.6;
  const lean = sway * 0.18;
  const cy = -H + R;
  trunk(ctx, 0.32, 0.16, H - R * 0.9, lean * 0.6, '#7a5638', '#22160e');
  ctx.strokeStyle = '#3a281a';
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const s = i - 1;
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.moveTo(lean * 0.5, -H * 0.42 - i * 0.3);
    ctx.quadraticCurveTo(s * R * 0.35 + lean, cy + 0.6, s * R * 0.7 + lean, cy + 0.1);
    ctx.stroke();
  }
  const blobs = 7;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * TAU + rnd(i) * 0.8;
    const d = i === 0 ? 0 : R * (0.45 + rnd(i + 10) * 0.35);
    const bx = Math.cos(a) * d + lean * (1.2 + (cy - Math.sin(a) * d * 0.7) / -H);
    const by = cy + Math.sin(a) * d * 0.72;
    const br = R * (0.5 + rnd(i + 20) * 0.25);
    const g = ctx.createRadialGradient(bx - br * 0.45, by - br * 0.5, br * 0.1, bx, by, br * 1.05);
    g.addColorStop(0, '#86ad58');
    g.addColorStop(0.55, '#3f6a30');
    g.addColorStop(1, '#16301a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fill();
  }
  // Grain de feuilles : petites taches claires et sombres → glyphes variés.
  for (let i = 0; i < 26; i++) {
    const a = rnd(i + 40) * TAU;
    const d = Math.sqrt(rnd(i + 70)) * R * 0.95;
    const x = Math.cos(a) * d + lean;
    const y = cy + Math.sin(a) * d * 0.75;
    ctx.fillStyle = y < cy && x < lean ? 'rgba(190,220,140,0.55)' : 'rgba(8,20,10,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, 0.13, 0, TAU);
    ctx.fill();
  }
}

/** Résineux : étages de branches dentelés, la cime plie au vent. */
function pine(ctx: CanvasRenderingContext2D, k: number, sway: number, rnd: (i: number) => number): void {
  const H = 6.2 + k * 1.8;
  const W = 1.5 + k * 0.4;
  trunk(ctx, 0.22, 0.12, H * 0.35, 0, '#6a4a32', '#1e140c');
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const f = i / tiers;
    const yb = -H * (0.22 + f * 0.62);
    const yt = yb - H * 0.3;
    const w = W * (1 - f * 0.72);
    const lean = sway * 0.22 * (0.3 + f);
    const g = ctx.createLinearGradient(-w + lean, yt, w + lean, yb);
    g.addColorStop(0, '#5e8a5a');
    g.addColorStop(0.5, '#284a30');
    g.addColorStop(1, '#0e2016');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lean * 1.3, yt);
    const n = 6;
    for (let j = 0; j <= n; j++) {
      const x = w - (2 * w * j) / n + lean;
      const y = yb + (j % 2 ? -0.28 : 0.06) + (rnd(i * 9 + j) - 0.5) * 0.12;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/** Arbre mort : branches nues, tordues. */
function deadTree(ctx: CanvasRenderingContext2D, k: number, sway: number, rnd: (i: number) => number): void {
  const H = 3.8 + k;
  trunk(ctx, 0.28, 0.1, H, sway * 0.08, '#8a7c6c', '#2a221c');
  ctx.lineCap = 'round';
  const branch = (x: number, y: number, a: number, len: number, w: number, depth: number, seed: number): void => {
    const ex = x + Math.cos(a) * len + sway * 0.06 * len;
    const ey = y + Math.sin(a) * len;
    ctx.strokeStyle = depth ? '#4e443a' : '#6a5e50';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (depth >= 2) return;
    branch(ex, ey, a - 0.5 - rnd(seed) * 0.3, len * 0.62, w * 0.65, depth + 1, seed + 3);
    branch(ex, ey, a + 0.4 + rnd(seed + 1) * 0.3, len * 0.55, w * 0.65, depth + 1, seed + 7);
  };
  branch(0, -H * 0.62, -Math.PI / 2 - 0.7, 1.3, 0.16, 0, 1);
  branch(0, -H * 0.8, -Math.PI / 2 + 0.6, 1.2, 0.14, 0, 11);
  branch(0, -H, -Math.PI / 2 - 0.1, 0.9, 0.12, 1, 21);
}

function bush(ctx: CanvasRenderingContext2D, k: number, sway: number, rnd: (i: number) => number): void {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * 1.5 + (rnd(i) - 0.5) * 0.3 + sway * 0.05;
    const r = 0.42 + rnd(i + 5) * 0.25;
    const y = -r * 0.95 - (i % 2) * 0.25;
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, 0.05, x, y, r);
    g.addColorStop(0, '#6e9448');
    g.addColorStop(1, '#183018');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  if (k > 0.55) {
    ctx.fillStyle = '#b83a30';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc((rnd(i + 30) - 0.5) * 1.4, -0.4 - rnd(i + 40) * 0.8, 0.09, 0, TAU);
      ctx.fill();
    }
  }
}

function rock(ctx: CanvasRenderingContext2D, k: number, rnd: (i: number) => number): void {
  const w = 0.7 + k * 0.4;
  const h = 0.6 + k * 0.6;
  const g = ctx.createLinearGradient(-w, -h, w, 0);
  g.addColorStop(0, '#b4b2b8');
  g.addColorStop(0.5, '#6e6c74');
  g.addColorStop(1, '#25242a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(-w * 0.9, -h * 0.55);
  ctx.lineTo(-w * 0.4, -h * (0.9 + rnd(1) * 0.1));
  ctx.lineTo(w * 0.25, -h);
  ctx.lineTo(w * 0.85, -h * 0.6);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,10,14,0.7)';
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.95);
  ctx.lineTo(w * 0.1, -h * 0.5);
  ctx.lineTo(-w * 0.05, -h * 0.15);
  ctx.stroke();
  if (k > 0.45) {
    ctx.fillStyle = 'rgba(90,130,60,0.85)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.2, -h * 0.9, w * 0.45, h * 0.14, -0.15, 0, TAU);
    ctx.fill();
  }
}

function stump(ctx: CanvasRenderingContext2D, k: number): void {
  const g = ctx.createLinearGradient(-0.4, 0, 0.4, 0);
  g.addColorStop(0, k > 0.5 ? '#6a5040' : '#3a2e28');
  g.addColorStop(1, '#16100c');
  ctx.fillStyle = g;
  ctx.fillRect(-0.32, -0.6, 0.64, 0.6);
  ctx.fillStyle = '#9a7a56';
  ctx.beginPath();
  ctx.ellipse(0, -0.6, 0.32, 0.12, 0, 0, TAU);
  ctx.fill();
}

function reeds(ctx: CanvasRenderingContext2D, k: number, sway: number, rnd: (i: number) => number): void {
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x = (i / 6 - 0.5) * 1.4 + (rnd(i) - 0.5) * 0.2;
    const h = 1.2 + rnd(i + 9) * 0.7 + k * 0.2;
    const bend = (sway * 0.25 + (rnd(i + 3) - 0.5) * 0.2) * h;
    ctx.strokeStyle = i % 2 ? '#5e7a3a' : '#7a8e4a';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x, -h * 0.6, x + bend, -h);
    ctx.stroke();
    if (i % 3 === 1) {
      ctx.fillStyle = '#5a3a22';
      ctx.beginPath();
      ctx.ellipse(x + bend * 0.85, -h * 0.88, 0.09, 0.22, bend * 0.3, 0, TAU);
      ctx.fill();
    }
  }
}

function tuft(ctx: CanvasRenderingContext2D, sway: number, rnd: (i: number) => number, cols: [string, string], scale: number): void {
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const x = (i / 7 - 0.5) * 0.9 * scale;
    const h = (0.55 + rnd(i) * 0.5) * scale;
    const spread = (i / 7 - 0.5) * 0.5;
    const tip = x + spread + sway * 0.32 * h;
    const g = ctx.createLinearGradient(0, 0, 0, -h);
    g.addColorStop(0, cols[0]);
    g.addColorStop(1, cols[1]);
    ctx.strokeStyle = g;
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(x * 0.4, 0);
    ctx.quadraticCurveTo(x * 0.7, -h * 0.6, tip, -h);
    ctx.stroke();
  }
}

function flowers(ctx: CanvasRenderingContext2D, k: number, sway: number, rnd: (i: number) => number): void {
  const palette = ['#efe6cc', '#e6c04a', '#a882d8', '#d85a48'];
  ctx.fillStyle = palette[Math.floor(k * 3.99)];
  for (let i = 0; i < 4; i++) {
    const x = (rnd(i + 50) - 0.5) * 0.9 + sway * 0.12;
    const y = -0.5 - rnd(i + 60) * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, 0.11, 0, TAU);
    ctx.fill();
  }
}

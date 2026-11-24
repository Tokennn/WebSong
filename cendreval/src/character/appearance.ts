export type HeadId = 'casque' | 'capuche' | 'rase' | 'criniere' | 'cornes';
export type BodyId = 'svelte' | 'robuste' | 'colosse';
export type OutfitId = 'mailles' | 'cuir' | 'robe' | 'plates';
export type ColorSlot = 'outfit' | 'accent' | 'hair' | 'skin';

export interface Appearance {
  name: string;
  head: HeadId;
  body: BodyId;
  outfit: OutfitId;
  colors: Record<ColorSlot, string>;
}

export interface Stats {
  maxHp: number;
  atk: number;
  def: number;
  /** Vitesse en largeurs de case par seconde. */
  speed: number;
}

type Bonus = Partial<Stats>;

export interface Option<T extends string> {
  id: T;
  label: string;
  hint: string;
  bonus: Bonus;
}

export const HEADS: readonly Option<HeadId>[] = [
  { id: 'casque', label: 'Casque de fer', hint: 'Nasal et joues forgés.', bonus: { def: 2 } },
  { id: 'capuche', label: 'Capuche', hint: 'Le visage reste dans l’ombre.', bonus: { speed: 0.3 } },
  { id: 'rase', label: 'Crâne rasé', hint: 'Une cicatrice, pas de remords.', bonus: { atk: 1 } },
  { id: 'criniere', label: 'Crinière', hint: 'Cheveux longs au vent.', bonus: { maxHp: 6 } },
  { id: 'cornes', label: 'Heaume à cornes', hint: 'Fer noir et os de bête.', bonus: { atk: 2, def: 1, speed: -0.2 } },
];

export const BODIES: readonly Option<BodyId>[] = [
  { id: 'svelte', label: 'Svelte', hint: 'Rapide, mais fragile.', bonus: { maxHp: -12, speed: 1.1 } },
  { id: 'robuste', label: 'Robuste', hint: 'L’équilibre du mercenaire.', bonus: { maxHp: 10, atk: 1 } },
  { id: 'colosse', label: 'Colosse', hint: 'Frappe fort, avance lentement.', bonus: { maxHp: 35, atk: 3, speed: -0.9 } },
];

export const OUTFITS: readonly Option<OutfitId>[] = [
  { id: 'mailles', label: 'Cotte de mailles', hint: 'Anneaux rivetés, bonne défense.', bonus: { def: 4 } },
  { id: 'cuir', label: 'Cuir de rôdeur', hint: 'Léger, sangles et rivets.', bonus: { def: 2, speed: 0.5 } },
  { id: 'robe', label: 'Robe de cendre', hint: 'Tissu brûlé, coups chargés de braise.', bonus: { atk: 4 } },
  { id: 'plates', label: 'Plates noires', hint: 'Lourde armure de plaques.', bonus: { def: 7, speed: -0.5 } },
];

export interface ColorGroup {
  slot: ColorSlot;
  label: string;
  swatches: readonly string[];
}

export const COLOR_GROUPS: readonly ColorGroup[] = [
  { slot: 'outfit', label: 'Tenue', swatches: ['#7a2e26', '#3f5a7a', '#4f5b3a', '#6b5a48', '#45414f', '#8c7a52'] },
  { slot: 'accent', label: 'Cape et capuche', swatches: ['#6a1f1c', '#2b3a5c', '#3d4a2c', '#7a5220', '#2a2530', '#6e5c8a'] },
  { slot: 'hair', label: 'Cheveux', swatches: ['#1f1714', '#5a3a22', '#9a6a3a', '#c8b48a', '#8f8f8f', '#7a2a1a'] },
  { slot: 'skin', label: 'Peau', swatches: ['#f0c8a0', '#d8a47a', '#b07850', '#7a5038', '#e6d2c4', '#9c8a7a'] },
];

export const DEFAULT_APPEARANCE: Appearance = {
  name: '',
  head: 'capuche',
  body: 'robuste',
  outfit: 'mailles',
  colors: { outfit: '#3f5a7a', accent: '#6a1f1c', hair: '#1f1714', skin: '#d8a47a' },
};

const BASE: Stats = { maxHp: 100, atk: 10, def: 2, speed: 6 };

export function computeStats(a: Appearance): Stats {
  const s = { ...BASE };
  const opts: Option<string>[] = [
    HEADS.find((o) => o.id === a.head)!,
    BODIES.find((o) => o.id === a.body)!,
    OUTFITS.find((o) => o.id === a.outfit)!,
  ];
  for (const o of opts) {
    s.maxHp += o.bonus.maxHp ?? 0;
    s.atk += o.bonus.atk ?? 0;
    s.def += o.bonus.def ?? 0;
    s.speed += o.bonus.speed ?? 0;
  }
  return s;
}

export function formatBonus(b: Bonus): string {
  const parts: string[] = [];
  const f = (v: number, label: string, digits = 0): void => {
    if (v) parts.push(`${label}${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`);
  };
  f(b.maxHp ?? 0, 'PV');
  f(b.atk ?? 0, 'ATQ');
  f(b.def ?? 0, 'DEF');
  f(b.speed ?? 0, 'VIT', 1);
  return parts.join(' ');
}

const NAME_A = ['Kael', 'Vorn', 'Ysel', 'Maer', 'Thal', 'Brann', 'Sorel', 'Edda', 'Rhun', 'Isk', 'Oryn', 'Vesna'];
const NAME_B = ['', 'ric', 'wen', 'dar', 'ys', 'mund', 'ra', 'oth', 'el'];
const NAME_C = ['', ' le Gris', ' Main-Froide', ' des Cendres', ' Sans-Feu', ''];

export function randomName(rand: () => number = Math.random): string {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const name = pick(NAME_A) + pick(NAME_B) + pick(NAME_C);
  return name.slice(0, 18);
}

export function isAppearance(v: unknown): v is Appearance {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  const colors = a.colors as Record<string, unknown> | undefined;
  return (
    typeof a.name === 'string' &&
    HEADS.some((o) => o.id === a.head) &&
    BODIES.some((o) => o.id === a.body) &&
    OUTFITS.some((o) => o.id === a.outfit) &&
    !!colors &&
    (['outfit', 'accent', 'hair', 'skin'] as const).every((k) => typeof colors[k] === 'string' && /^#[0-9a-f]{6}$/i.test(colors[k] as string))
  );
}

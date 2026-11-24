import { isAppearance, type Appearance } from './appearance';

export interface Kills {
  beast: number;
  clan: number;
  dragon: number;
}

export interface Progress {
  seed: number;
  level: number;
  xp: number;
  kills: Kills;
}

export interface SavedHero {
  appearance: Appearance;
  progress?: Progress;
}

const KEY = 'cendreval.hero.v1';

/** Sauvegarde locale au navigateur. Tout est protégé : le jeu marche sans stockage. */
export function loadHero(): SavedHero | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SavedHero> | null;
    if (!data || !isAppearance(data.appearance)) return null;
    return { appearance: data.appearance, progress: isProgress(data.progress) ? data.progress : undefined };
  } catch {
    return null;
  }
}

export function saveHero(hero: SavedHero): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(hero));
  } catch {
    /* stockage indisponible : on continue sans sauvegarde */
  }
}

function isProgress(p: unknown): p is Progress {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  const k = o.kills as Record<string, unknown> | undefined;
  return (
    typeof o.seed === 'number' &&
    typeof o.level === 'number' &&
    typeof o.xp === 'number' &&
    !!k &&
    typeof k.beast === 'number' &&
    typeof k.clan === 'number' &&
    typeof k.dragon === 'number'
  );
}

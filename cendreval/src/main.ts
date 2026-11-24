import './styles/main.css';
import { startLoop } from './core/loop';
import type { Scene } from './scenes/Scene';
import { CreatorScene } from './scenes/CreatorScene';
import { GameScene } from './scenes/GameScene';
import { loadHero, type SavedHero } from './character/storage';
import { DEFAULT_APPEARANCE } from './character/appearance';

/** Le canvas a besoin des polices chargées pour mesurer les glyphes. */
async function waitForFonts(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('16px "JetBrains Mono"'), document.fonts.load('800 32px Cinzel')]),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    /* police de secours : monospace du système */
  }
}

function boot(): void {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app introuvable');
  let scene: Scene | null = null;

  const go = (next: Scene): void => {
    scene?.exit();
    scene = next;
    next.enter(host);
    // Accès console en développement : window.__scene
    if (import.meta.env.DEV) (window as unknown as { __scene: Scene }).__scene = next;
  };
  const toCreator = (): void => go(new CreatorScene({ onStart: toGame }, loadHero()));
  const toGame = (hero: SavedHero): void => go(new GameScene(hero, { onNewHero: toCreator }));

  // Développement : `?play` saute l'écran de création (avec le héros sauvegardé, sinon celui par défaut).
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('play')) {
    toGame(loadHero() ?? { appearance: { ...DEFAULT_APPEARANCE, name: DEFAULT_APPEARANCE.name || 'Aldric' } });
  } else toCreator();
  startLoop((dt, t) => {
    if (!scene) return;
    scene.update(dt, t);
    scene.render(t);
  });
}

void waitForFonts().then(boot);

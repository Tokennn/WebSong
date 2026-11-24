import type { LogTone } from '../game/context';
import type { Player } from '../entities/Player';

export interface HudHandlers {
  onRespawn(): void;
  onResume(): void;
  onNewHero(): void;
  onAttack(): void;
}

const bar = (v: number, max: number, n = 20): string => {
  const f = Math.max(0, Math.min(n, Math.round((v / max) * n)));
  return '█'.repeat(f) + '░'.repeat(n - f);
};

/** Interface en surimpression (DOM) : vie, expérience, lieu, journal, mort et pause. */
export class Hud {
  readonly el: HTMLElement;
  private readonly cache = new Map<HTMLElement, string>();
  private readonly name: HTMLElement;
  private readonly level: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly xp: HTMLElement;
  private readonly region: HTMLElement;
  private readonly kills: HTMLElement;
  private readonly log: HTMLElement;
  private readonly death: HTMLElement;
  private readonly pause: HTMLElement;

  constructor(parent: HTMLElement, handlers: HudHandlers) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud__hero panel">
        <div class="hud__title"><span class="hud__name"></span><span class="hud__level"></span></div>
        <div class="hud__row"><span class="hud__label">PV</span><code class="hud__bar hud__bar--hp"></code></div>
        <div class="hud__row"><span class="hud__label">XP</span><code class="hud__bar hud__bar--xp"></code></div>
      </div>
      <div class="hud__region" aria-live="polite"></div>
      <div class="hud__kills panel"></div>
      <div class="hud__log" aria-live="polite"></div>
      <p class="hud__help">ZQSD / flèches : marcher · Espace / clic : frapper · M : carte · Échap : pause</p>
      <button type="button" class="hud__attack btn btn--start">Frapper</button>
      <div class="overlay overlay--death" hidden>
        <div class="overlay__card panel">
          <h2 class="overlay__title">Tu es tombé</h2>
          <p class="overlay__text">Les braises du feu sacré te ramènent à la vie. Tu perds la moitié de ton expérience en cours.</p>
          <button type="button" class="btn btn--start" data-act="respawn">Se relever</button>
        </div>
      </div>
      <div class="overlay overlay--pause" hidden>
        <div class="overlay__card panel">
          <h2 class="overlay__title">Pause</h2>
          <p class="overlay__text">Ta progression est sauvegardée dans ce navigateur.</p>
          <div class="overlay__actions">
            <button type="button" class="btn btn--start" data-act="resume">Reprendre</button>
            <button type="button" class="btn btn--ghost" data-act="new">Nouveau héros</button>
          </div>
        </div>
      </div>`;
    parent.appendChild(this.el);

    const q = (s: string): HTMLElement => {
      const el = this.el.querySelector<HTMLElement>(s);
      if (!el) throw new Error(`HUD : ${s} manquant`);
      return el;
    };
    this.name = q('.hud__name');
    this.level = q('.hud__level');
    this.hp = q('.hud__bar--hp');
    this.xp = q('.hud__bar--xp');
    this.region = q('.hud__region');
    this.kills = q('.hud__kills');
    this.log = q('.hud__log');
    this.death = q('.overlay--death');
    this.pause = q('.overlay--pause');

    // Les clics sur l'interface ne doivent pas déclencher d'attaque ni le joystick tactile.
    this.el.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.panel, .btn, .overlay')) e.stopPropagation();
    });
    q('.hud__attack').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      handlers.onAttack();
    });
    this.el.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'respawn') handlers.onRespawn();
      if (act === 'resume') handlers.onResume();
      if (act === 'new') handlers.onNewHero();
    });
  }

  private set(el: HTMLElement, value: string): void {
    if (this.cache.get(el) === value) return;
    this.cache.set(el, value);
    el.textContent = value;
  }

  update(p: Player): void {
    this.set(this.name, p.label);
    this.set(this.level, `Niv. ${p.level}`);
    this.set(this.hp, `${bar(p.hp, p.maxHp)} ${Math.ceil(p.hp)}/${p.maxHp}`);
    this.set(this.xp, `${bar(p.exp, p.xpNext)} ${p.exp}/${p.xpNext}`);
    this.set(this.kills, `Chiens-loups ${p.kills.beast} · Guerriers ${p.kills.clan} · Dragons ${p.kills.dragon}`);
    this.hp.classList.toggle('is-low', p.hp / p.maxHp < 0.3);
  }

  setRegion(name: string): void {
    this.set(this.region, name);
    this.region.classList.remove('is-new');
    void this.region.offsetWidth; // relance l'animation
    this.region.classList.add('is-new');
  }

  message(text: string, tone: LogTone = 'info'): void {
    const line = document.createElement('p');
    line.className = `hud__line hud__line--${tone}`;
    line.textContent = text;
    this.log.appendChild(line);
    while (this.log.children.length > 5) this.log.firstElementChild?.remove();
    window.setTimeout(() => line.classList.add('is-old'), 7000);
    window.setTimeout(() => line.remove(), 9000);
  }

  showDeath(show: boolean): void {
    this.death.hidden = !show;
  }

  showPause(show: boolean): void {
    this.pause.hidden = !show;
  }
}

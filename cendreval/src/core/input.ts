/**
 * Clavier + souris + tactile.
 * On lit `KeyboardEvent.code` (position physique) : WASD en QWERTY = ZQSD en AZERTY.
 * Au tactile, glisser n'importe où agit comme un joystick relatif.
 */
export class Input {
  enabled = false;
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private attackQueued = false;
  private touchId: number | null = null;
  private origin = { x: 0, y: 0 };
  private touch = { x: 0, y: 0, active: false };
  private readonly disposers: (() => void)[] = [];

  constructor(target: HTMLElement) {
    const on = <K extends keyof WindowEventMap>(el: Window, type: K, fn: (e: WindowEventMap[K]) => void): void => {
      el.addEventListener(type, fn);
      this.disposers.push(() => el.removeEventListener(type, fn));
    };
    const onEl = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void): void => {
      target.addEventListener(type, fn);
      this.disposers.push(() => target.removeEventListener(type, fn));
    };

    on(window, 'keydown', (e) => {
      if (!this.enabled || isTyping(e.target)) return;
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    on(window, 'keyup', (e) => this.down.delete(e.code));
    on(window, 'blur', () => this.down.clear());

    onEl('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (e.button === 0) this.attackQueued = true;
        return;
      }
      if (this.touchId !== null) return;
      this.touchId = e.pointerId;
      this.origin = { x: e.clientX, y: e.clientY };
      this.touch = { x: 0, y: 0, active: true };
      target.setPointerCapture(e.pointerId);
    });
    onEl('pointermove', (e) => {
      if (e.pointerId !== this.touchId) return;
      const dx = e.clientX - this.origin.x;
      const dy = e.clientY - this.origin.y;
      const len = Math.hypot(dx, dy);
      const k = len < 10 ? 0 : Math.min(1, len / 60) / len;
      this.touch.x = dx * k;
      this.touch.y = dy * k;
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== this.touchId) return;
      this.touchId = null;
      this.touch = { x: 0, y: 0, active: false };
    };
    onEl('pointerup', end);
    onEl('pointercancel', end);
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  /** Vecteur de déplacement normalisé (x droite, y bas). */
  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
    if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyW', 'ArrowUp')) y -= 1;
    if (this.isDown('KeyS', 'ArrowDown')) y += 1;
    if (this.touch.active) {
      x += this.touch.x;
      y += this.touch.y;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }

  attack(): boolean {
    return this.attackQueued || this.wasPressed('Space', 'KeyJ', 'Enter');
  }

  /** Pour le bouton "Frapper" tactile. */
  queueAttack(): void {
    this.attackQueued = true;
  }

  endFrame(): void {
    this.pressed.clear();
    this.attackQueued = false;
  }

  dispose(): void {
    this.disposers.forEach((d) => d());
    this.disposers.length = 0;
  }
}

function isTyping(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
}

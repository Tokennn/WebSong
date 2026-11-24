/** Un écran du jeu (création du héros, monde…). Le gestionnaire de main.ts en affiche un à la fois. */
export interface Scene {
  enter(host: HTMLElement): void;
  exit(): void;
  update(dt: number, time: number): void;
  render(time: number): void;
}

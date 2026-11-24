/** Rampe classique du plus "vide" au plus "plein" (≈ quantité d'encre). */
export const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

/** Pierre taillée : glyphes denses, choisis une fois pour toutes par case (comportement "statique"). */
export const STONE = '#%&8B$@WMQ0O';
/** Roche naturelle, plus aérée. */
export const ROCK = ';:+=*x%#';
export const GRASS_LOW = ",.'`\"";
export const MOSS = ",;'\"`";
export const CANOPY = ' .,:;+*%&8@';

export function rampChar(l: number, ramp: string = RAMP): string {
  const i = Math.max(0, Math.min(ramp.length - 1, Math.floor(l * (ramp.length - 1))));
  return ramp[i];
}

/** Trait qui suit une direction à l'écran (y vers le bas). */
export function lineChar(dx: number, dy: number): string {
  const a = Math.atan2(dy, dx);
  const k = (((Math.round(a / (Math.PI / 4)) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  return ['-', '\\', '|', '/'][k];
}

import type { RGB } from '../render/color';

/**
 * Univers original de Cendreval : noms, clans, dragons.
 * Tout le texte du monde est ici, pour le traduire ou l'enrichir sans toucher au code.
 */

export interface Clan {
  id: string;
  name: string;
  /** Nom d'un membre, affiché au-dessus des guerriers. */
  member: string;
  color: RGB;
  banner: RGB;
}

export const CLANS: readonly Clan[] = [
  { id: 'crocs', name: 'les Crocs-Noirs', member: 'Croc-Noir', color: [150, 40, 38], banner: [200, 46, 38] },
  { id: 'corbeau', name: 'le Clan du Corbeau Pâle', member: 'Corbeau Pâle', color: [126, 116, 160], banner: [176, 166, 210] },
  { id: 'braise', name: 'les Fils de la Braise', member: 'Fils de la Braise', color: [196, 98, 32], banner: [236, 132, 44] },
  { id: 'os', name: 'la Horde des Os', member: 'Horde des Os', color: [196, 186, 156], banner: [226, 214, 182] },
];

export const VILLAGE_NAMES = ['Havre-des-Cendres', 'Bourg-Morne', 'Val-Givre', 'Pierrefaux'];
export const TOWER_NAMES = ['Tour du Guet', 'Tour Moussue', 'Tour de l’Ermite', 'Tour Brisée', 'Tour des Corbeaux', 'Tour d’Orvhal', 'Tour Grise'];
export const LAIR_NAMES = ['Pic du Wyrm Cendré', 'Nid de Braise', 'Crête Écarlate'];
export const DRAGON_NAMES = ['Vharzul le Cendré', 'Ignaroth', 'Sylmaëth la Pâle'];

export const BIOME_NAMES: Record<string, string> = {
  forest: 'Forêt de Sombrebois',
  dead: 'Landes Cendrées',
  rock: 'Crêtes de Fer',
  water: 'Eaux Noires',
  mud: 'Rives Boueuses',
  grass: 'Plaines d’Orvhal',
  road: 'Vieille Route',
};

export const WORLD_NAME = 'Terres Cendrées';

import type { MissionStub } from './types';
import { mission1 } from './mission1';
import { mission2 } from './mission2';

export const missions = [mission1, mission2];

/** Parcours A1 (missions 2 à 8 : contenu à venir). */
export const a1Path: MissionStub[] = [
  { number: 1, title: 'Commander au bar à tapas', titleEs: 'En el bar de tapas', place: 'Madrid' },
  { number: 2, title: 'Se présenter, faire connaissance', titleEs: 'Mucho gusto', place: 'Madrid' },
  { number: 3, title: 'Demander son chemin', titleEs: '¿Dónde está…?', place: 'Ciudad de México' },
  { number: 4, title: 'Faire le marché', titleEs: 'En el mercado', place: 'Ciudad de México' },
  { number: 5, title: 'Réserver une chambre', titleEs: 'Reservar una habitación', place: 'Sevilla' },
  { number: 6, title: 'Parler de soi et de sa famille', titleEs: 'Mi familia y yo', place: 'Oaxaca' },
  { number: 7, title: 'Au restaurant : goûts et préférences', titleEs: 'Me gusta…', place: 'San Sebastián' },
  { number: 8, title: 'Raconter sa journée', titleEs: 'Un día normal', place: 'Madrid' },
];

export const allChunks = missions.flatMap((m) => m.chunks);
export const chunkById = Object.fromEntries(allChunks.map((c) => [c.id, c]));

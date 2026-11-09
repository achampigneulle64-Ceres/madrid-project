export type ErrorCat =
  | 'Compréhension orale'
  | 'Genre (un / una)'
  | 'Accord masculin / féminin'
  | 'Ordre des mots'
  | 'Production écrite'
  | 'Accents et ñ'
  | 'Interaction';

export interface Chunk {
  id: string;
  es: string;
  fr: string;
  note?: string;
}

export interface DialogueLine {
  /** Nom affiché de la personne qui parle ; « Vous » pour l'apprenant. */
  who: string;
  es: string;
  fr: string;
}

/**
 * Texte enrichi des explications :
 * **mot** = surligné · *mot* = italique (espagnol) · [mot] = gras · {m:mot} = masculin · {f:mot} = féminin
 */
export type GrammarBlock =
  | { kind: 'table'; rows: [string, string][] }
  | { kind: 'gender'; mascLabel: string; femLabel: string; masc: string[]; fem: string[] }
  | { kind: 'tip'; title: string; text: string; tone?: 'mx' | 'warn' };

export interface GrammarSection {
  title: string;
  blocks: GrammarBlock[];
}

export type Exercise =
  | { kind: 'listen'; chunk: string; options: string[]; answer: number }
  | { kind: 'gender'; noun: string; fr: string; answer: 'un' | 'una' }
  | { kind: 'order'; chunk: string; fr: string; prefix?: string; tokens: string[]; suffix?: string }
  | { kind: 'translate'; chunk: string; fr: string; accepted: string[] }
  | { kind: 'shadow'; chunk: string }
  | { kind: 'agree'; sentence: string; fr: string; options: [string, string]; answer: 0 | 1; why: string };

export interface RoleplayStep {
  waiter?: string; // réplique de l'interlocuteur (lue à voix haute)
  waiterFr?: string;
  prompt: string; // consigne en français
  options: { es: string; ok: boolean; why: string }[];
}

export interface Mission {
  id: string;
  number: number;
  title: string;
  titleEs: string;
  place: string;
  goal: string;
  context: string;
  /** Interlocuteur du jeu de rôle (« Le serveur », « Lucía »…). */
  partner: string;
  /** Résumé de l'étape « Comprendre » pour l'introduction. */
  understand: string;
  /** Ce que l'apprenant sait faire à la fin (bilan). */
  outcome: string;
  grammar: GrammarSection[];
  chunks: Chunk[];
  dialogue: DialogueLine[];
  exercises: Exercise[];
  roleplay: RoleplayStep[];
}

export interface MissionStub {
  number: number;
  title: string;
  titleEs: string;
  place: string;
}

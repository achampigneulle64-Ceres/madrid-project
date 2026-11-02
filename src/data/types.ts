export type ErrorCat =
  | 'Compréhension orale'
  | 'Genre (un / una)'
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
  who: 'camarero' | 'tú';
  es: string;
  fr: string;
}

export type Exercise =
  | { kind: 'listen'; chunk: string; options: string[]; answer: number }
  | { kind: 'gender'; noun: string; fr: string; answer: 'un' | 'una' }
  | { kind: 'order'; chunk: string; fr: string; prefix?: string; tokens: string[]; suffix?: string }
  | { kind: 'translate'; chunk: string; fr: string; accepted: string[] }
  | { kind: 'shadow'; chunk: string };

export interface RoleplayStep {
  waiter?: string; // réplique du serveur (lue à voix haute)
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

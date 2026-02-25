export interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  etymology?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  enriched: boolean;
  createdAt: number;
}

export interface VocabSet {
  id: string;
  name: string;
  words: VocabWord[];
  createdAt: number;
}

export interface TestQuestion {
  wordId: string;
  word: string;
  meaning: string;
  direction: 'en-to-ko' | 'ko-to-en';
}

export interface TestAnswer {
  wordId: string;
  userAnswer: string;
  correct: boolean;
}

export interface TestSession {
  id: string;
  setId: string;
  questions: TestQuestion[];
  answers: TestAnswer[];
  direction: 'en-to-ko' | 'ko-to-en' | 'mixed';
  startedAt: number;
  completedAt?: number;
}

export interface WrongWord {
  wordId: string;
  setId: string;
  word: string;
  meaning: string;
  wrongCount: number;
}

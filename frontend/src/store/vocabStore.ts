import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VocabSet, VocabWord, TestSession, WrongWord } from '../types/vocab';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface VocabStore {
  sets: VocabSet[];
  currentSetId: string | null;
  testSessions: TestSession[];
  wrongWords: WrongWord[];

  // Set actions
  createSet: (name: string) => string;
  deleteSet: (setId: string) => void;
  setCurrentSet: (setId: string | null) => void;
  getCurrentSet: () => VocabSet | null;

  // Word actions
  addWords: (setId: string, words: Array<{ word: string; meaning: string }>) => void;
  updateWord: (setId: string, wordId: string, updates: Partial<VocabWord>) => void;
  deleteWord: (setId: string, wordId: string) => void;
  enrichWord: (setId: string, wordId: string, data: { part_of_speech?: string; etymology: string; example_sentence: string; example_translation: string }) => void;

  // Test actions
  saveTestSession: (session: TestSession) => void;
  updateWrongWords: (setId: string, answers: Array<{ wordId: string; word: string; meaning: string; correct: boolean }>) => void;
  clearWrongWords: (setId?: string) => void;
}

export const useVocabStore = create<VocabStore>()(
  persist(
    (set, get) => ({
      sets: [],
      currentSetId: null,
      testSessions: [],
      wrongWords: [],

      createSet: (name: string) => {
        const id = generateId();
        const newSet: VocabSet = {
          id,
          name,
          words: [],
          createdAt: Date.now(),
        };
        // 새 단어장 = 새 학습 사이클 → 오답 초기화
        set((state) => ({ sets: [...state.sets, newSet], wrongWords: [] }));
        return id;
      },

      deleteSet: (setId: string) => {
        set((state) => ({
          sets: state.sets.filter((s) => s.id !== setId),
          currentSetId: state.currentSetId === setId ? null : state.currentSetId,
        }));
      },

      setCurrentSet: (setId: string | null) => {
        set({ currentSetId: setId });
      },

      getCurrentSet: () => {
        const { sets, currentSetId } = get();
        return sets.find((s) => s.id === currentSetId) ?? null;
      },

      addWords: (setId: string, words: Array<{ word: string; meaning: string }>) => {
        const newWords: VocabWord[] = words.map((w) => ({
          id: generateId(),
          word: w.word,
          meaning: w.meaning,
          enriched: false,
          createdAt: Date.now(),
        }));
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === setId ? { ...s, words: [...s.words, ...newWords] } : s
          ),
        }));
      },

      updateWord: (setId: string, wordId: string, updates: Partial<VocabWord>) => {
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  words: s.words.map((w) =>
                    w.id === wordId ? { ...w, ...updates } : w
                  ),
                }
              : s
          ),
        }));
      },

      deleteWord: (setId: string, wordId: string) => {
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === setId
              ? { ...s, words: s.words.filter((w) => w.id !== wordId) }
              : s
          ),
        }));
      },

      enrichWord: (setId: string, wordId: string, data) => {
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  words: s.words.map((w) =>
                    w.id === wordId
                      ? {
                          ...w,
                          partOfSpeech: data.part_of_speech || w.partOfSpeech,
                          etymology: data.etymology,
                          exampleSentence: data.example_sentence,
                          exampleTranslation: data.example_translation,
                          enriched: true,
                        }
                      : w
                  ),
                }
              : s
          ),
        }));
      },

      saveTestSession: (session: TestSession) => {
        set((state) => ({
          testSessions: [session, ...state.testSessions].slice(0, 20),
        }));
      },

      updateWrongWords: (setId, answers) => {
        set((state) => {
          const wrongMap = new Map<string, WrongWord>(
            state.wrongWords.map((w) => [w.wordId, w])
          );

          for (const answer of answers) {
            if (!answer.correct) {
              const existing = wrongMap.get(answer.wordId);
              if (existing) {
                wrongMap.set(answer.wordId, { ...existing, wrongCount: existing.wrongCount + 1 });
              } else {
                wrongMap.set(answer.wordId, {
                  wordId: answer.wordId,
                  setId,
                  word: answer.word,
                  meaning: answer.meaning,
                  wrongCount: 1,
                });
              }
            } else {
              const existing = wrongMap.get(answer.wordId);
              if (existing) {
                if (existing.wrongCount <= 1) wrongMap.delete(answer.wordId);
                else wrongMap.set(answer.wordId, { ...existing, wrongCount: existing.wrongCount - 1 });
              }
            }
          }

          return { wrongWords: Array.from(wrongMap.values()) };
        });
      },

      clearWrongWords: (setId?: string) => {
        if (setId) {
          set((state) => ({ wrongWords: state.wrongWords.filter((w) => w.setId !== setId) }));
        } else {
          set({ wrongWords: [] });
        }
      },
    }),
    {
      name: 'vocab-app-storage',
    }
  )
);

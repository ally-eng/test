import { useState, useCallback } from 'react';
import type { VocabWord } from '../types/vocab';
import type { TestQuestion, TestAnswer, TestSession } from '../types/vocab';
import { useVocabStore } from '../store/vocabStore';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeAnswer(answer: string): string[] {
  return answer
    .split(/[,，、\/]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function checkAnswer(userAnswer: string, question: TestQuestion): boolean {
  if (!userAnswer.trim()) return false;

  // ko-to-en: 영어 스펠링 체크 (정확히 일치)
  if (question.direction === 'ko-to-en') {
    return userAnswer.trim().toLowerCase() === question.word.trim().toLowerCase();
  }

  // en-to-ko: 뜻 체크 (부분 일치 허용)
  const userParts = normalizeAnswer(userAnswer);
  const correctParts = normalizeAnswer(question.meaning);
  return userParts.some((u) =>
    correctParts.some((c) => c === u || c.includes(u) || u.includes(c))
  );
}

const QUESTIONS_PER_TEST = 10;

interface UseTestOptions {
  words: VocabWord[];
  direction: 'en-to-ko' | 'ko-to-en' | 'mixed';
  setId: string;
}

export function useTest({ words, direction, setId }: UseTestOptions) {
  const saveTestSession = useVocabStore((s) => s.saveTestSession);
  const updateWrongWords = useVocabStore((s) => s.updateWrongWords);

  const [questions] = useState<TestQuestion[]>(() => {
    // 최대 20개 랜덤 선택
    const selected = shuffle(words).slice(0, QUESTIONS_PER_TEST);
    return selected.map((w) => {
      let qDir: 'en-to-ko' | 'ko-to-en';
      if (direction === 'mixed') {
        qDir = Math.random() < 0.5 ? 'en-to-ko' : 'ko-to-en';
      } else {
        qDir = direction;
      }
      return {
        wordId: w.id,
        word: w.word,
        meaning: w.meaning,
        partOfSpeech: w.partOfSpeech,
        direction: qDir,
      };
    });
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId] = useState(() => generateId());
  const [startedAt] = useState(() => Date.now());

  const submitAnswer = useCallback(
    (userAnswer: string) => {
      const question = questions[currentIndex];
      if (!question) return;

      const correct = checkAnswer(userAnswer, question);

      const answer: TestAnswer = {
        wordId: question.wordId,
        userAnswer,
        correct,
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);

      if (currentIndex + 1 >= questions.length) {
        // Test complete
        const session: TestSession = {
          id: sessionId,
          setId,
          questions,
          answers: newAnswers,
          direction,
          startedAt,
          completedAt: Date.now(),
        };
        saveTestSession(session);
        updateWrongWords(
          setId,
          newAnswers.map((a, i) => ({
            wordId: a.wordId,
            word: questions[i].word,
            meaning: questions[i].meaning,
            correct: a.correct,
          }))
        );
        setIsComplete(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [questions, currentIndex, answers, direction, sessionId, setId, startedAt, saveTestSession, updateWrongWords]
  );

  const currentQuestion = questions[currentIndex];
  const progress = answers.length;
  const total = questions.length;
  const score = answers.filter((a) => a.correct).length;

  return {
    currentQuestion,
    currentIndex,
    questions,
    answers,
    isComplete,
    progress,
    total,
    score,
    submitAnswer,
  };
}

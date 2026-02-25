import { useState, useEffect } from 'react';
import type { VocabWord } from '../types/vocab';
import { useTTS } from '../hooks/useTTS';

interface FlashcardProps {
  word: VocabWord;
  onNext: () => void;
  onPrev: () => void;
  onOpenDetail: () => void;
  current: number;
  total: number;
}

export function Flashcard({ word, onNext, onPrev, onOpenDetail, current, total }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const { speak, isSupported } = useTTS();

  useEffect(() => {
    setFlipped(false);
  }, [word.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        onNext();
      } else if (e.code === 'ArrowLeft') {
        onPrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress */}
      <div className="text-sm text-gray-500">
        {current} / {total}
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-lg h-64 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 border border-gray-100"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {word.partOfSpeech && (
              <span className="mb-3 px-2.5 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-full">
                {word.partOfSpeech}
              </span>
            )}
            <p className="text-4xl font-bold text-gray-800 text-center">{word.word}</p>
            <p className="mt-4 text-sm text-gray-400">클릭하거나 Space를 눌러 뒤집기</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-indigo-50 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 border border-indigo-100"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {word.partOfSpeech && (
              <span className="mb-3 px-2.5 py-0.5 bg-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
                {word.partOfSpeech}
              </span>
            )}
            <p className="text-3xl font-bold text-indigo-700 text-center">{word.meaning}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPrev}
          className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
        >
          ← 이전
        </button>

        {isSupported && (
          <button
            onClick={() => speak(word.word)}
            className="px-5 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium transition-colors"
          >
            🔊 발음
          </button>
        )}

        <button
          onClick={onOpenDetail}
          className="px-5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium transition-colors"
        >
          📖 어원
        </button>

        <button
          onClick={onNext}
          className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
        >
          다음 →
        </button>
      </div>

      <p className="text-xs text-gray-400">← → 화살표로 이동 | Space로 뒤집기</p>
    </div>
  );
}

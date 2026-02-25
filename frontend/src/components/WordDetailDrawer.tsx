import { useEffect, useState } from 'react';
import type { VocabWord } from '../types/vocab';
import { enrichWord } from '../api/client';
import { useVocabStore } from '../store/vocabStore';
import { useTTS } from '../hooks/useTTS';

interface WordDetailDrawerProps {
  word: VocabWord;
  setId: string;
  onClose: () => void;
}

export function WordDetailDrawer({ word, setId, onClose }: WordDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enrichWordStore = useVocabStore((s) => s.enrichWord);
  const { speak, isSupported } = useTTS();

  useEffect(() => {
    if (!word.enriched) {
      setLoading(true);
      setError(null);
      enrichWord(word.word, word.meaning)
        .then((data) => {
          enrichWordStore(setId, word.id, data);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [word.id, word.enriched, word.word, word.meaning, setId, enrichWordStore]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{word.word}</h2>
            <p className="text-gray-500 text-sm">{word.meaning}</p>
          </div>
          <div className="flex items-center gap-2">
            {isSupported && (
              <button
                onClick={() => speak(word.word)}
                className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"
              >
                🔊
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">AI가 분석 중...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 rounded-xl p-4 text-red-600 text-sm">
              <p className="font-medium mb-1">오류 발생</p>
              <p>{error}</p>
            </div>
          )}

          {word.enriched && (
            <>
              {word.etymology && (
                <section>
                  <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">
                    📚 어원
                  </h3>
                  <p className="text-gray-700 leading-relaxed bg-amber-50 rounded-xl p-4">
                    {word.etymology}
                  </p>
                </section>
              )}

              {word.exampleSentence && (
                <section>
                  <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-2">
                    💬 예문
                  </h3>
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-gray-800 font-medium leading-relaxed">
                      {word.exampleSentence}
                    </p>
                    {isSupported && (
                      <button
                        onClick={() => speak(word.exampleSentence!)}
                        className="mt-2 text-green-600 hover:text-green-800 text-xs"
                      >
                        🔊 예문 듣기
                      </button>
                    )}
                    {word.exampleTranslation && (
                      <p className="mt-2 text-gray-500 text-sm">{word.exampleTranslation}</p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

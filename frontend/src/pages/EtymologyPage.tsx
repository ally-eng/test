import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVocabStore } from '../store/vocabStore';
import { useTTS } from '../hooks/useTTS';

export function EtymologyPage() {
  const navigate = useNavigate();
  const { sets } = useVocabStore();
  const { speak, isSupported } = useTTS();
  const [search, setSearch] = useState('');

  // 어원이 있는 단어만 모두 모으기
  const enrichedWords = sets
    .flatMap((s) => s.words.map((w) => ({ ...w, setName: s.name })))
    .filter((w) => w.enriched && w.etymology);

  const filtered = search.trim()
    ? enrichedWords.filter(
        (w) =>
          w.word.toLowerCase().includes(search.toLowerCase()) ||
          w.meaning.includes(search)
      )
    : enrichedWords;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            ← 뒤로
          </button>
          <h1 className="font-bold text-gray-800 flex-1">📚 어원 모아보기</h1>
          <span className="text-sm text-gray-400">{filtered.length}개</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="단어 또는 뜻으로 검색..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none mb-5"
        />

        {enrichedWords.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">📖</p>
            <p className="font-medium">아직 어원 데이터가 없어요</p>
            <p className="text-sm mt-1">단어장에서 어원 일괄 생성을 먼저 실행하세요</p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 px-5 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium"
            >
              홈으로
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>검색 결과가 없어요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((w) => (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Word header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-indigo-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-indigo-700">{w.word}</span>
                      {isSupported && (
                        <button
                          onClick={() => speak(w.word)}
                          className="text-indigo-400 hover:text-indigo-600 text-sm"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                    <span className="text-sm text-indigo-400">{w.meaning}</span>
                  </div>
                  <span className="text-xs text-indigo-300 bg-indigo-100 px-2 py-1 rounded-full">
                    {w.setName}
                  </span>
                </div>

                {/* Etymology */}
                <div className="px-5 py-4 border-t border-gray-50">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">어원</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{w.etymology}</p>
                </div>

                {/* Example */}
                {w.exampleSentence && (
                  <div className="px-5 pb-4">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">예문</p>
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <p className="text-gray-800 text-sm leading-relaxed flex-1">{w.exampleSentence}</p>
                        {isSupported && (
                          <button
                            onClick={() => speak(w.exampleSentence!)}
                            className="text-green-500 shrink-0 text-sm"
                          >
                            🔊
                          </button>
                        )}
                      </div>
                      {w.exampleTranslation && (
                        <p className="text-gray-400 text-xs mt-1">{w.exampleTranslation}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

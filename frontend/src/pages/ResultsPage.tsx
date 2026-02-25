import { useNavigate } from 'react-router-dom';
import { useVocabStore } from '../store/vocabStore';

export function ResultsPage() {
  const navigate = useNavigate();
  const { wrongWords, clearWrongWords, sets, setCurrentSet } = useVocabStore();

  // 단어장별로 그룹핑
  const groupedBySet = sets
    .map((s) => ({
      set: s,
      wrongs: wrongWords
        .filter((w) => w.setId === s.id)
        .sort((a, b) => b.wrongCount - a.wrongCount),
    }))
    .filter((g) => g.wrongs.length > 0);

  const totalCount = wrongWords.length;

  const handleRetestSet = (setId: string) => {
    setCurrentSet(setId);
    navigate('/test');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            ← 뒤로
          </button>
          <h1 className="font-bold text-gray-800 flex-1">❌ 오답 노트</h1>
          {totalCount > 0 && (
            <button
              onClick={() => { if (confirm('모든 오답을 초기화할까요?')) clearWrongWords(); }}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              전체 초기화
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {totalCount === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-lg font-bold text-gray-700">오답이 없어요!</p>
            <p className="text-gray-400 text-sm mt-1">시현아, 다 맞혔어! 최고야!</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium"
            >
              홈으로
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedBySet.map(({ set, wrongs }) => (
              <div key={set.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* 단어장 헤더 */}
                <div className="flex items-center justify-between px-5 py-3 bg-red-50 border-b border-red-100">
                  <div>
                    <span className="font-bold text-red-700">{set.name}</span>
                    <span className="ml-2 text-sm text-red-400">{wrongs.length}개 오답</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (confirm(`"${set.name}" 오답을 초기화할까요?`)) clearWrongWords(set.id); }}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      초기화
                    </button>
                    <button
                      onClick={() => handleRetestSet(set.id)}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      오답만 시험
                    </button>
                  </div>
                </div>

                {/* 오답 목록 */}
                <div className="divide-y divide-gray-50">
                  {wrongs.map((w) => (
                    <div key={w.wordId} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{w.word}</p>
                        <p className="text-gray-400 text-sm truncate">{w.meaning}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: Math.min(w.wrongCount, 5) }).map((_, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        ))}
                        {w.wrongCount > 5 && (
                          <span className="text-red-400 text-xs font-bold ml-1">+{w.wrongCount - 5}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
            >
              홈으로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

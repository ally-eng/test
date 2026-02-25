import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVocabStore } from '../store/vocabStore';
import { AddWordModal } from '../components/AddWordModal';
import { UploadModal, type EnrichedWord } from '../components/UploadModal';
import { WordDetailDrawer } from '../components/WordDetailDrawer';
import { enrichBatch } from '../api/client';
import type { VocabWord } from '../types/vocab';

export function HomePage() {
  const navigate = useNavigate();
  const { sets, currentSetId, createSet, deleteSet, setCurrentSet, addWords, deleteWord, updateWord, enrichWord: enrichWordStore, wrongWords } = useVocabStore();
  const currentSet = sets.find((s) => s.id === currentSetId);

  const [showAddWord, setShowAddWord] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewSet, setShowNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ word: '', meaning: '' });
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number } | null>(null);
  const [justCreated, setJustCreated] = useState(false);

  // 어원 일괄 생성 (단어 추가 직후 자동 호출)
  const runBatchEnrich = useCallback(async (setId: string, words: VocabWord[]) => {
    const unenriched = words.filter((w) => !w.enriched);
    if (unenriched.length === 0) return;

    setEnrichProgress({ current: 0, total: unenriched.length });
    try {
      const results = await enrichBatch(unenriched.map((w) => ({ word: w.word, meaning: w.meaning })));
      let count = 0;
      for (const result of results) {
        const matched = unenriched.find((w) => w.word === result.word);
        if (matched && result.success && result.etymology) {
          enrichWordStore(setId, matched.id, {
            etymology: result.etymology,
            example_sentence: result.example_sentence ?? '',
            example_translation: result.example_translation ?? '',
          });
        }
        count++;
        setEnrichProgress({ current: count, total: unenriched.length });
      }
    } catch (e) {
      console.error('Batch enrich failed:', e);
    } finally {
      setEnrichProgress(null);
    }
  }, [enrichWordStore]);

  // 단어 추가 (업로드 modal: 어원 포함 / 수동 입력: 어원 없음)
  const handleAddWords = useCallback((words: EnrichedWord[]) => {
    if (!currentSetId) return;
    addWords(currentSetId, words);

    setTimeout(() => {
      const updatedSet = useVocabStore.getState().sets.find((s) => s.id === currentSetId);
      if (!updatedSet) return;

      // 어원이 이미 있는 단어는 스토어에 바로 적용
      const preEnriched = words.filter((w) => w.etymology);
      for (const enriched of preEnriched) {
        const storeWord = updatedSet.words.find((w) => w.word === enriched.word && !w.enriched);
        if (storeWord) {
          enrichWordStore(currentSetId, storeWord.id, {
            etymology: enriched.etymology!,
            example_sentence: enriched.exampleSentence ?? '',
            example_translation: enriched.exampleTranslation ?? '',
          });
        }
      }

      // 어원 없는 단어만 배치 생성
      const unenriched = updatedSet.words.filter(
        (w) => !w.enriched && !preEnriched.find((p) => p.word === w.word)
      );
      if (unenriched.length > 0) runBatchEnrich(currentSetId, unenriched);
    }, 50);
  }, [currentSetId, addWords, enrichWordStore, runBatchEnrich]);

  // 오늘 날짜를 기본 단어장 이름으로
  const todayLabel = (() => {
    const d = new Date();
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  })();

  const handleCreateSet = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSetName.trim() || todayLabel;
    const id = createSet(name);
    setCurrentSet(id);
    setNewSetName('');
    setShowNewSet(false);
    setJustCreated(true);
    setShowUpload(true); // 단어장 생성 즉시 사진 업로드 오픈
  };

  const handleCreateTodaySet = () => {
    const id = createSet(todayLabel);
    setCurrentSet(id);
    setJustCreated(true);
    setShowUpload(true); // 단어장 생성 즉시 사진 업로드 오픈
  };

  const startEdit = (w: VocabWord) => {
    setEditingWordId(w.id);
    setEditValues({ word: w.word, meaning: w.meaning });
  };

  const saveEdit = () => {
    if (!currentSetId || !editingWordId) return;
    updateWord(currentSetId, editingWordId, {
      word: editValues.word.trim(),
      meaning: editValues.meaning.trim(),
    });
    setEditingWordId(null);
  };

  const CHEERS = [
    '시현아, 오늘도 화이팅! 🌟',
    '단어 하나하나가 시현이의 실력이 되고 있어! 💪',
    '잘하고 있어, 시현아! 계속 해보자! 🎉',
    '시현이는 할 수 있어! 포기하지 마! 🔥',
    '오늘 배운 단어는 평생 기억될 거야! 📚',
    '시현아, 너의 노력이 빛나고 있어! ✨',
  ];
  const cheer = CHEERS[new Date().getDay() % CHEERS.length];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-600">📚 시현이의 단어장</h1>
            <p className="text-xs text-indigo-300 hidden sm:block">{cheer}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/etymology')}
              className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
            >
              📖 어원
            </button>
            {wrongWords.length > 0 && (
              <button
                onClick={() => navigate('/results')}
                className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200"
              >
                오답 {wrongWords.length}개
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 새 단어장 생성 직후 배너 */}
        {justCreated && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-indigo-700">
              🎉 새 단어장이 만들어졌어! 오답도 초기화됐어. 오늘 단어 열심히 외워보자, 시현아!
            </p>
            <button onClick={() => setJustCreated(false)} className="text-indigo-300 hover:text-indigo-500 ml-3">✕</button>
          </div>
        )}

        {/* Set selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {sets.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentSet(s.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  s.id === currentSetId
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                {s.name} ({s.words.length})
              </button>
            ))}
            {showNewSet ? (
              <form onSubmit={handleCreateSet} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder={todayLabel}
                  className="px-3 py-2 border rounded-full text-sm focus:border-indigo-400 focus:outline-none"
                />
                <button type="submit" className="px-3 py-2 bg-indigo-500 text-white rounded-full text-sm">만들기</button>
                <button type="button" onClick={() => setShowNewSet(false)} className="px-3 py-2 text-gray-400 text-sm">취소</button>
              </form>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTodaySet}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-50 text-indigo-500 border border-indigo-200 hover:bg-indigo-100"
                >
                  + {todayLabel} 단어장
                </button>
                <button
                  onClick={() => setShowNewSet(true)}
                  className="px-3 py-2 rounded-full text-sm text-gray-400 border border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-400"
                >
                  이름 직접 입력
                </button>
              </div>
            )}
          </div>
        </div>

        {currentSet ? (
          <>
            {/* Actions */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 flex-1">{currentSet.name}</h2>
              <button
                onClick={() => setShowUpload(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                📷 사진으로 추가
              </button>
              <button
                onClick={() => setShowAddWord(true)}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                + 단어 추가
              </button>
              {currentSet.words.some((w) => !w.enriched) && !enrichProgress && (
                <button
                  onClick={() => runBatchEnrich(currentSet.id, currentSet.words)}
                  className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm font-medium transition-colors"
                >
                  📚 어원 일괄 생성 ({currentSet.words.filter((w) => !w.enriched).length}개)
                </button>
              )}
              {currentSet.words.length >= 2 && (
                <>
                  <button
                    onClick={() => navigate('/study')}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    📖 학습
                  </button>
                  <button
                    onClick={() => navigate('/test')}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    ✏️ 시험
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  if (confirm(`"${currentSet.name}" 단어장을 삭제할까요?`)) {
                    deleteSet(currentSet.id);
                  }
                }}
                className="px-3 py-2 text-gray-400 hover:text-red-500 text-sm"
              >
                삭제
              </button>
            </div>

            {/* 어원 생성 진행 상황 */}
            {enrichProgress && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-700">
                    📚 어원 생성 중... {enrichProgress.current} / {enrichProgress.total}
                  </span>
                  <span className="text-sm text-amber-600 font-bold">
                    {Math.round((enrichProgress.current / enrichProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(enrichProgress.current / enrichProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Word list */}
            {currentSet.words.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-3">📝</p>
                <p className="font-medium">단어가 없습니다</p>
                <p className="text-sm mt-1">사진으로 추가하거나 직접 입력하세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentSet.words.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    {editingWordId === w.id ? (
                      <>
                        <input
                          value={editValues.word}
                          onChange={(e) => setEditValues((v) => ({ ...v, word: e.target.value }))}
                          className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:border-indigo-400"
                        />
                        <input
                          value={editValues.meaning}
                          onChange={(e) => setEditValues((v) => ({ ...v, meaning: e.target.value }))}
                          className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:border-indigo-400"
                        />
                        <button onClick={saveEdit} className="text-indigo-500 text-sm font-medium hover:text-indigo-700">저장</button>
                        <button onClick={() => setEditingWordId(null)} className="text-gray-400 text-sm">취소</button>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-gray-800 w-32 shrink-0">{w.word}</span>
                        <span className="text-gray-500 flex-1">{w.meaning}</span>
                        {w.enriched && <span className="text-xs text-amber-500">📚</span>}
                        <button
                          onClick={() => setSelectedWord(w)}
                          className="text-xs text-gray-400 hover:text-amber-500 px-2 py-1 rounded"
                        >
                          어원
                        </button>
                        <button
                          onClick={() => startEdit(w)}
                          className="text-xs text-gray-400 hover:text-indigo-500 px-2 py-1 rounded"
                        >
                          편집
                        </button>
                        <button
                          onClick={() => deleteWord(currentSet.id, w.id)}
                          className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">📚</p>
            <p className="font-medium">단어장을 선택하거나 새로 만드세요</p>
          </div>
        )}
      </div>

      {showAddWord && currentSet && (
        <AddWordModal
          onAdd={handleAddWords}
          onClose={() => setShowAddWord(false)}
        />
      )}
      {showUpload && currentSet && (
        <UploadModal
          onAdd={handleAddWords}
          onClose={() => setShowUpload(false)}
        />
      )}
      {selectedWord && currentSet && (
        <WordDetailDrawer
          word={selectedWord}
          setId={currentSet.id}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVocabStore } from '../store/vocabStore';
import { useTest } from '../hooks/useTest';
import { TestQuestion } from '../components/TestQuestion';

type Direction = 'en-to-ko' | 'ko-to-en' | 'mixed';

function TestSetup({
  wordCount,
  wrongCount,
  onStart,
}: {
  wordCount: number;
  wrongCount: number;
  onStart: (direction: Direction, useWrong: boolean) => void;
}) {
  const [direction, setDirection] = useState<Direction>('mixed');
  const [useWrong, setUseWrong] = useState(false);

  const testCount = Math.min(20, useWrong ? wrongCount : wordCount);

  return (
    <div className="flex flex-col items-center gap-8 max-w-sm mx-auto py-10">
      <div className="text-center">
        <p className="text-5xl mb-3">✏️</p>
        <h2 className="text-2xl font-bold text-gray-800">시험 설정</h2>
        <p className="text-gray-400 text-sm mt-1">20개씩 랜덤 출제</p>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">시험 유형</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setDirection('mixed')}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                direction === 'mixed'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              🔀 혼합 (뜻 쓰기 + 스펠링 쓰기)
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setDirection('en-to-ko')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
                  direction === 'en-to-ko'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                영어 → 뜻 쓰기
              </button>
              <button
                onClick={() => setDirection('ko-to-en')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
                  direction === 'ko-to-en'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                뜻 → 스펠링 쓰기
              </button>
            </div>
          </div>
        </div>

        {wrongCount > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">범위</p>
            <div className="flex gap-2">
              <button
                onClick={() => setUseWrong(false)}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
                  !useWrong ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                전체 ({wordCount}개)
              </button>
              <button
                onClick={() => setUseWrong(true)}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
                  useWrong ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                오답만 ({wrongCount}개)
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onStart(direction, useWrong)}
        className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-lg transition-colors"
      >
        시험 시작 ({testCount}문제)
      </button>
    </div>
  );
}

function TestRunner({
  words,
  direction,
  setId,
  onFinish,
}: {
  words: Array<{ id: string; word: string; meaning: string }>;
  direction: Direction;
  setId: string;
  onFinish: () => void;
}) {
  const navigate = useNavigate();
  const { currentQuestion, currentIndex, questions, answers, isComplete, total, score, submitAnswer } = useTest({
    words: words as any,
    direction,
    setId,
  });

  if (isComplete) {
    const wrongAnswers = answers
      .map((a, i) => ({ ...a, question: questions[i] }))
      .filter((a) => !a.correct);

    const pct = Math.round((score / total) * 100);
    const isPerfect = pct === 100;

    const cheerMsg =
      isPerfect ? '완벽해! 시현이 최고야! 🏆' :
      pct >= 80 ? '정말 잘했어, 시현아! 조금만 더! 💪' :
      pct >= 60 ? '잘하고 있어! 틀린 단어 다시 도전해보자! 🔥' :
      '괜찮아, 시현아! 반복이 실력이야! 다시 해보자! 😊';

    // 헬로키티 이미지 (무료 공개 이미지, 매번 랜덤)
    const kittyId = Math.floor(Math.random() * 4);
    const kittyEmojis = ['🎀', '🌸', '⭐', '🍓'];

    return (
      <div className="flex flex-col items-center gap-6 max-w-lg mx-auto py-10">
        {isPerfect ? (
          <div className="text-center">
            <div className="text-8xl mb-2 animate-bounce">{kittyEmojis[kittyId]}</div>
            <div className="bg-pink-50 border-2 border-pink-200 rounded-3xl p-6 mb-2">
              {/* 헬로키티 SVG 인라인 */}
              <svg viewBox="0 0 100 100" className="w-36 h-36 mx-auto" xmlns="http://www.w3.org/2000/svg">
                {/* 머리 */}
                <ellipse cx="50" cy="48" rx="34" ry="32" fill="white" stroke="#f9a8d4" strokeWidth="2"/>
                {/* 귀 */}
                <polygon points="20,22 10,5 32,18" fill="white" stroke="#f9a8d4" strokeWidth="2"/>
                <polygon points="80,22 90,5 68,18" fill="white" stroke="#f9a8d4" strokeWidth="2"/>
                {/* 귀 안 */}
                <polygon points="20,20 14,9 28,18" fill="#fce7f3"/>
                <polygon points="80,20 86,9 72,18" fill="#fce7f3"/>
                {/* 눈 */}
                <ellipse cx="37" cy="44" rx="5" ry="5.5" fill="#1a1a1a"/>
                <ellipse cx="63" cy="44" rx="5" ry="5.5" fill="#1a1a1a"/>
                <circle cx="39" cy="42" r="1.5" fill="white"/>
                <circle cx="65" cy="42" r="1.5" fill="white"/>
                {/* 코 */}
                <ellipse cx="50" cy="52" rx="3" ry="2" fill="#f472b6"/>
                {/* 수염 */}
                <line x1="15" y1="50" x2="42" y2="54" stroke="#9ca3af" strokeWidth="1.2"/>
                <line x1="15" y1="56" x2="42" y2="57" stroke="#9ca3af" strokeWidth="1.2"/>
                <line x1="58" y1="54" x2="85" y2="50" stroke="#9ca3af" strokeWidth="1.2"/>
                <line x1="58" y1="57" x2="85" y2="56" stroke="#9ca3af" strokeWidth="1.2"/>
                {/* 리본 */}
                <polygon points="70,18 80,10 80,26" fill="#f43f5e"/>
                <polygon points="90,18 80,10 80,26" fill="#fb7185"/>
                <circle cx="80" cy="18" r="3.5" fill="#f43f5e"/>
              </svg>
              <p className="text-pink-600 font-bold text-xl mt-2">만점이야! 🎉</p>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">시험 완료!</h2>
            <p className="text-gray-500 mt-1">
              {total}문제 중 <span className="text-pink-500 font-bold">{score}개</span> 정답
              <span className="ml-2 text-lg font-bold text-pink-500">(100점!)</span>
            </p>
            <p className="mt-3 text-pink-500 font-bold">{cheerMsg}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-6xl mb-3">{pct >= 70 ? '👏' : '😅'}</p>
            <h2 className="text-2xl font-bold text-gray-800">시험 완료!</h2>
            <p className="text-gray-500 mt-1">
              {total}문제 중 <span className="text-indigo-600 font-bold">{score}개</span> 정답
              <span className="ml-2 text-lg font-bold">({pct}점)</span>
            </p>
            <p className="mt-3 text-indigo-500 font-medium">{cheerMsg}</p>
          </div>
        )}

        {wrongAnswers.length > 0 && (
          <div className="w-full bg-red-50 rounded-2xl p-5">
            <h3 className="font-bold text-red-700 mb-3">틀린 단어 ({wrongAnswers.length}개)</h3>
            <div className="space-y-2">
              {wrongAnswers.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{a.question.word}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-gray-600">{a.question.meaning}</span>
                  </div>
                  {a.userAnswer && (
                    <span className="text-red-500 text-sm line-through">{a.userAnswer}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
          >
            홈으로
          </button>
          {wrongAnswers.length > 0 ? (
            <button
              onClick={() => navigate('/results')}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold"
            >
              오답 노트 ({wrongAnswers.length}개)
            </button>
          ) : (
            <button
              onClick={onFinish}
              className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium"
            >
              다시 시험
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 px-4">
      <TestQuestion
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        total={total}
        onSubmit={submitAnswer}
      />
    </div>
  );
}

export function TestPage() {
  const navigate = useNavigate();
  const { sets, currentSetId, wrongWords } = useVocabStore();
  const currentSet = sets.find((s) => s.id === currentSetId);

  const [started, setStarted] = useState(false);
  const [direction, setDirection] = useState<Direction>('mixed');
  const [useWrong, setUseWrong] = useState(false);
  const [key, setKey] = useState(0);

  if (!currentSet || currentSet.words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">단어가 없습니다.</p>
        <button onClick={() => navigate('/')} className="px-5 py-2 bg-indigo-500 text-white rounded-xl">
          홈으로
        </button>
      </div>
    );
  }

  const allWords = currentSet.words;
  // 현재 단어장의 오답만 필터링
  const setWrongWords = wrongWords.filter((w) => w.setId === currentSet.id);
  const wrongWordIds = new Set(setWrongWords.map((w) => w.wordId));
  const testWords = useWrong
    ? allWords.filter((w) => wrongWordIds.has(w.id))
    : allWords;

  const handleStart = (dir: Direction, wrong: boolean) => {
    setDirection(dir);
    setUseWrong(wrong);
    setStarted(true);
  };

  const handleReset = () => {
    setStarted(false);
    setKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
            ← 뒤로
          </button>
          <h1 className="font-bold text-gray-800">{currentSet.name} - 시험</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4">
        {!started ? (
          <TestSetup
            wordCount={allWords.length}
            wrongCount={setWrongWords.length}
            onStart={handleStart}
          />
        ) : (
          <TestRunner
            key={key}
            words={testWords}
            direction={direction}
            setId={currentSet.id}
            onFinish={handleReset}
          />
        )}
      </div>
    </div>
  );
}

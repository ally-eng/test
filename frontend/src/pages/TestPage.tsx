import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVocabStore } from '../store/vocabStore';
import { useTest } from '../hooks/useTest';
import { TestQuestion as TestQuestionComponent } from '../components/TestQuestion';
import type { VocabWord, TestQuestion, TestAnswer } from '../types/vocab';

type Direction = 'en-to-ko' | 'ko-to-en' | 'mixed';
type Phase = 'setup' | 'running' | 'round-result' | 'final';

interface RoundResult {
  roundNumber: number;
  questions: TestQuestion[];
  answers: TestAnswer[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 시험 설정 화면
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

  const total = useWrong ? wrongCount : wordCount;
  const rounds = Math.min(4, Math.ceil(total / 10));
  const perRound = Math.ceil(total / rounds) || 10;

  return (
    <div className="flex flex-col items-center gap-8 max-w-sm mx-auto py-10 px-4">
      <div className="text-center">
        <p className="text-5xl mb-3">✏️</p>
        <h2 className="text-2xl font-bold text-gray-800">시험 설정</h2>
        <p className="text-gray-400 text-sm mt-1">10개씩 최대 4라운드</p>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">시험 유형</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setDirection('mixed')}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                direction === 'mixed' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              🔀 혼합 (뜻 쓰기 + 스펠링 쓰기)
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setDirection('en-to-ko')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
                  direction === 'en-to-ko' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                영어 → 뜻 쓰기
              </button>
              <button
                onClick={() => setDirection('ko-to-en')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
                  direction === 'ko-to-en' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
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

        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-sm text-indigo-600 font-medium">
            {rounds}라운드 × {perRound}문제 = 총 {Math.min(total, rounds * perRound)}문제
          </p>
        </div>
      </div>

      <button
        onClick={() => onStart(direction, useWrong)}
        className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-lg transition-colors"
      >
        시험 시작
      </button>
    </div>
  );
}

// 라운드 진행 화면
function RoundRunner({
  words,
  direction,
  setId,
  roundNumber,
  totalRounds,
  onComplete,
  onBack,
}: {
  words: VocabWord[];
  direction: Direction;
  setId: string;
  roundNumber: number;
  totalRounds: number;
  onComplete: (result: RoundResult) => void;
  onBack: () => void;
}) {
  const { currentQuestion, currentIndex, questions, answers, isComplete, total, submitAnswer } = useTest({
    words: words as any,
    direction,
    setId,
  });

  useEffect(() => {
    if (isComplete) {
      onComplete({ roundNumber, questions, answers });
    }
  }, [isComplete]); // eslint-disable-line

  if (isComplete) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => { if (confirm('시험을 중단할까요?')) onBack(); }}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← 중단
        </button>
        <span className="font-bold text-gray-700">
          {roundNumber} / {totalRounds} 라운드
        </span>
        <span className="text-sm text-gray-400">{currentIndex + 1}/{total}</span>
      </div>
      <div className="py-8 px-4 max-w-lg mx-auto">
        <TestQuestionComponent
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          total={total}
          onSubmit={submitAnswer}
        />
      </div>
    </div>
  );
}

// 라운드 결과 화면
function RoundResultView({
  result,
  isLast,
  totalRounds,
  onNext,
}: {
  result: RoundResult;
  isLast: boolean;
  totalRounds: number;
  onNext: () => void;
}) {
  const correct = result.answers.filter((a) => a.correct).length;
  const total = result.answers.length;
  const pct = Math.round((correct / total) * 100);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="text-center mb-5">
        <p className="text-4xl mb-2">{pct === 100 ? '🎉' : pct >= 70 ? '👏' : '💪'}</p>
        <h2 className="text-xl font-bold text-gray-800">{result.roundNumber}라운드 결과</h2>
        <p className="text-gray-500 mt-1">
          {total}문제 중 <span className="font-bold text-indigo-600">{correct}개</span> 정답
          <span className="ml-2 font-bold text-indigo-600">({pct}점)</span>
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {result.answers.map((answer, i) => {
          const q = result.questions[i];
          const prompt = q.direction === 'en-to-ko' ? q.word : q.meaning;
          const correctAnswer = q.direction === 'en-to-ko' ? q.meaning : q.word;

          return (
            <div
              key={i}
              className={`rounded-xl p-3 border ${
                answer.correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`text-lg font-bold shrink-0 ${answer.correct ? 'text-green-500' : 'text-red-500'}`}>
                  {answer.correct ? '✓' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">
                    {q.direction === 'en-to-ko' ? '뜻 쓰기' : '스펠링 쓰기'}
                  </p>
                  <p className="font-semibold text-gray-800 text-sm">{prompt}</p>
                  {answer.correct ? (
                    <p className="text-green-600 text-sm mt-0.5">{answer.userAnswer}</p>
                  ) : (
                    <div className="mt-0.5">
                      {answer.userAnswer ? (
                        <p className="text-red-400 text-sm line-through">{answer.userAnswer}</p>
                      ) : (
                        <p className="text-red-300 text-sm italic">무응답</p>
                      )}
                      <p className="text-green-600 text-sm font-medium">→ {correctAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-lg transition-colors"
      >
        {isLast ? '최종 결과 보기 →' : `${result.roundNumber + 1}라운드 시작 →`}
      </button>
    </div>
  );
}

// 최종 결과 화면
function FinalResultView({
  allResults,
  onHome,
  onRetry,
}: {
  allResults: RoundResult[];
  onHome: () => void;
  onRetry: () => void;
}) {
  const totalCorrect = allResults.reduce((sum, r) => sum + r.answers.filter((a) => a.correct).length, 0);
  const totalQuestions = allResults.reduce((sum, r) => sum + r.answers.length, 0);
  const totalPct = Math.round((totalCorrect / totalQuestions) * 100);
  const isPerfect = totalPct === 100;

  const kittyEmojis = ['🎀', '🌸', '⭐', '🍓'];
  const kittyId = Math.floor(Math.random() * 4);

  const cheerMsg =
    isPerfect ? '완벽해! 시현이 최고야! 🏆' :
    totalPct >= 80 ? '정말 잘했어, 시현아! 조금만 더! 💪' :
    totalPct >= 60 ? '잘하고 있어! 틀린 단어 다시 도전해보자! 🔥' :
    '괜찮아, 시현아! 반복이 실력이야! 다시 해보자! 😊';

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="text-center mb-6">
        {isPerfect ? (
          <>
            <div className="text-6xl mb-2 animate-bounce">{kittyEmojis[kittyId]}</div>
            <div className="bg-pink-50 border-2 border-pink-200 rounded-3xl p-5 mb-3 inline-block">
              <svg viewBox="0 0 100 100" className="w-28 h-28 mx-auto" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="50" cy="48" rx="34" ry="32" fill="white" stroke="#f9a8d4" strokeWidth="2"/>
                <polygon points="20,22 10,5 32,18" fill="white" stroke="#f9a8d4" strokeWidth="2"/>
                <polygon points="80,22 90,5 68,18" fill="white" stroke="#f9a8d4" strokeWidth="2"/>
                <polygon points="20,20 14,9 28,18" fill="#fce7f3"/>
                <polygon points="80,20 86,9 72,18" fill="#fce7f3"/>
                <ellipse cx="37" cy="44" rx="5" ry="5.5" fill="#1a1a1a"/>
                <ellipse cx="63" cy="44" rx="5" ry="5.5" fill="#1a1a1a"/>
                <circle cx="39" cy="42" r="1.5" fill="white"/>
                <circle cx="65" cy="42" r="1.5" fill="white"/>
                <ellipse cx="50" cy="52" rx="3" ry="2" fill="#f472b6"/>
                <line x1="15" y1="50" x2="42" y2="54" stroke="#9ca3af" strokeWidth="1.2"/>
                <line x1="15" y1="56" x2="42" y2="57" stroke="#9ca3af" strokeWidth="1.2"/>
                <line x1="58" y1="54" x2="85" y2="50" stroke="#9ca3af" strokeWidth="1.2"/>
                <line x1="58" y1="57" x2="85" y2="56" stroke="#9ca3af" strokeWidth="1.2"/>
                <polygon points="70,18 80,10 80,26" fill="#f43f5e"/>
                <polygon points="90,18 80,10 80,26" fill="#fb7185"/>
                <circle cx="80" cy="18" r="3.5" fill="#f43f5e"/>
              </svg>
            </div>
          </>
        ) : (
          <p className="text-6xl mb-3">{totalPct >= 70 ? '👏' : '😅'}</p>
        )}
        <h2 className="text-2xl font-bold text-gray-800">모든 라운드 완료!</h2>
        <p className="text-gray-500 mt-1">
          {totalQuestions}문제 중 <span className="font-bold text-indigo-600">{totalCorrect}개</span> 정답
        </p>
        <p className="text-2xl font-bold text-indigo-600 mt-1">{totalPct}점</p>
        <p className="mt-2 text-indigo-500 font-medium text-sm">{cheerMsg}</p>
      </div>

      {/* 라운드별 점수 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {allResults.map((r) => {
          const c = r.answers.filter((a) => a.correct).length;
          const t = r.answers.length;
          return (
            <div key={r.roundNumber} className="bg-white rounded-xl border p-3 text-center">
              <p className="text-xs text-gray-400">{r.roundNumber}라운드</p>
              <p className="font-bold text-indigo-600">{c}/{t}</p>
              <p className="text-xs text-gray-500">{Math.round((c / t) * 100)}점</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onHome}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
        >
          홈으로
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold"
        >
          다시 시험
        </button>
      </div>
    </div>
  );
}

export function TestPage() {
  const navigate = useNavigate();
  const { sets, currentSetId, wrongWords } = useVocabStore();
  const currentSet = sets.find((s) => s.id === currentSetId);

  const [phase, setPhase] = useState<Phase>('setup');
  const [direction, setDirection] = useState<Direction>('mixed');
  const [wordGroups, setWordGroups] = useState<VocabWord[][]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [roundKey, setRoundKey] = useState(0);

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
  const setWrongWords = wrongWords.filter((w) => w.setId === currentSet.id);
  const wrongWordIds = new Set(setWrongWords.map((w) => w.wordId));

  const handleStart = (dir: Direction, useWrong: boolean) => {
    const words = useWrong ? allWords.filter((w) => wrongWordIds.has(w.id)) : allWords;
    const shuffled = shuffle(words);
    const groups: VocabWord[][] = [];
    for (let i = 0; i < shuffled.length && groups.length < 4; i += 10) {
      groups.push(shuffled.slice(i, i + 10));
    }
    setWordGroups(groups);
    setDirection(dir);
    setCurrentRound(0);
    setRoundResults([]);
    setRoundKey((k) => k + 1);
    setPhase('running');
  };

  const handleRoundComplete = (result: RoundResult) => {
    const newResults = [...roundResults, result];
    setRoundResults(newResults);
    setPhase('round-result');
  };

  const handleNextRound = () => {
    const next = currentRound + 1;
    if (next >= wordGroups.length) {
      setPhase('final');
    } else {
      setCurrentRound(next);
      setRoundKey((k) => k + 1);
      setPhase('running');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 (running 중엔 RoundRunner 내부에서 헤더 표시) */}
      {phase !== 'running' && (
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => phase === 'setup' ? navigate('/') : setPhase('setup')} className="text-gray-500 hover:text-gray-700">
              ← 뒤로
            </button>
            <h1 className="font-bold text-gray-800">{currentSet.name} - 시험</h1>
          </div>
        </header>
      )}

      <div className="max-w-2xl mx-auto">
        {phase === 'setup' && (
          <TestSetup
            wordCount={allWords.length}
            wrongCount={setWrongWords.length}
            onStart={handleStart}
          />
        )}

        {phase === 'running' && wordGroups[currentRound] && (
          <RoundRunner
            key={roundKey}
            words={wordGroups[currentRound]}
            direction={direction}
            setId={currentSet.id}
            roundNumber={currentRound + 1}
            totalRounds={wordGroups.length}
            onComplete={handleRoundComplete}
            onBack={() => setPhase('setup')}
          />
        )}

        {phase === 'round-result' && roundResults.length > 0 && (
          <RoundResultView
            result={roundResults[roundResults.length - 1]}
            isLast={currentRound + 1 >= wordGroups.length}
            totalRounds={wordGroups.length}
            onNext={handleNextRound}
          />
        )}

        {phase === 'final' && (
          <FinalResultView
            allResults={roundResults}
            onHome={() => navigate('/')}
            onRetry={() => handleStart(direction, false)}
          />
        )}
      </div>
    </div>
  );
}

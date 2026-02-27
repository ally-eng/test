import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGrammarContent } from '../api/client';

type Phase = 'topics' | 'loading' | 'study' | 'result';

interface GrammarQuestion {
  sentenceWithBlank: string;
  hint: string;
  correctAnswer: string;
  grammarPoint: string;
}

interface QuestionResult {
  question: GrammarQuestion;
  userAnswer: string;
  correct: boolean;
}

const GRAMMAR_TOPICS = [
  // 문장 형식
  { id: 'sentence_1st', label: '1형식 (S+V)' },
  { id: 'sentence_2nd', label: '2형식 (S+V+C)' },
  { id: 'sentence_3rd', label: '3형식 (S+V+O)' },
  { id: 'sentence_4th', label: '4형식 (S+V+IO+DO)' },
  { id: 'sentence_5th', label: '5형식 (S+V+O+OC)' },
  // be동사 / 일반동사
  { id: 'be_verb', label: 'be동사 (am/is/are)' },
  { id: 'be_verb_past', label: 'be동사 과거 (was/were)' },
  { id: 'general_verb', label: '일반동사 현재형' },
  // 시제
  { id: 'present_simple', label: '현재시제' },
  { id: 'past_simple', label: '과거시제' },
  { id: 'future_will', label: '미래시제 (will)' },
  { id: 'future_going_to', label: '미래시제 (be going to)' },
  { id: 'present_continuous', label: '현재진행형' },
  { id: 'past_continuous', label: '과거진행형' },
  { id: 'present_perfect', label: '현재완료 (have+p.p)' },
  // 조동사
  { id: 'can_modal', label: '조동사 can' },
  { id: 'will_modal', label: '조동사 will' },
  { id: 'must_modal', label: '조동사 must' },
  { id: 'should_modal', label: '조동사 should' },
  { id: 'may_modal', label: '조동사 may' },
  // 명사 / 관사
  { id: 'plural', label: '복수형 (-s/-es)' },
  { id: 'articles', label: '관사 (a/an/the)' },
  { id: 'countable_uncountable', label: '셀 수 있는/없는 명사' },
  // 형용사 / 부사
  { id: 'adjective', label: '형용사' },
  { id: 'adverb', label: '부사' },
  { id: 'comparative', label: '비교급 (-er/more)' },
  { id: 'superlative', label: '최상급 (-est/most)' },
  // 전치사 / 접속사
  { id: 'prepositions_place', label: '전치사 - 장소 (in/on/at)' },
  { id: 'prepositions_time', label: '전치사 - 시간 (in/on/at)' },
  { id: 'conjunctions', label: '접속사 (and/but/because)' },
  { id: 'conjunction_when_if', label: '접속사 (when/if)' },
  // 의문문 / 부정문
  { id: 'question_form', label: '의문문 만들기' },
  { id: 'wh_questions', label: '의문사 (what/when/where/who/how)' },
  { id: 'negation', label: '부정문 만들기' },
  // to부정사 / 동명사
  { id: 'to_infinitive', label: 'to부정사' },
  { id: 'gerund', label: '동명사 (-ing)' },
  // 수동태 / 관계대명사
  { id: 'passive_voice', label: '수동태 기초' },
  { id: 'relative_pronoun', label: '관계대명사 (who/which/that)' },
];

export function GrammarPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('topics');
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; label: string } | null>(null);
  const [explanation, setExplanation] = useState('');
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [error, setError] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'study' && !submitted) {
      inputRef.current?.focus();
    }
  }, [phase, currentIndex, submitted]);

  const handleTopicSelect = async (topic: { id: string; label: string }) => {
    setSelectedTopic(topic);
    setPhase('loading');
    setError('');
    try {
      const data = await fetchGrammarContent(topic.id, topic.label);
      const mapped: GrammarQuestion[] = data.questions.map((q) => ({
        sentenceWithBlank: q.sentence_with_blank,
        hint: q.hint,
        correctAnswer: q.correct_answer,
        grammarPoint: q.grammar_point,
      }));
      setExplanation(data.explanation);
      setQuestions(mapped);
      setCurrentIndex(0);
      setResults([]);
      setUserAnswer('');
      setSubmitted(false);
      setPhase('study');
    } catch (e) {
      setError('문제 생성에 실패했어요. 다시 시도해주세요.');
      setPhase('topics');
    }
  };

  const handleSubmit = () => {
    if (!userAnswer.trim() && !submitted) return;
    if (submitted) {
      // 다음 문제로
      const next = currentIndex + 1;
      if (next >= questions.length) {
        setPhase('result');
      } else {
        setCurrentIndex(next);
        setUserAnswer('');
        setSubmitted(false);
      }
      return;
    }

    const q = questions[currentIndex];
    const correct = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    setResults((prev) => [...prev, { question: q, userAnswer: userAnswer.trim(), correct }]);
    setSubmitted(true);
  };

  const handleSkip = () => {
    const q = questions[currentIndex];
    setResults((prev) => [...prev, { question: q, userAnswer: '', correct: false }]);
    setSubmitted(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const correctCount = results.filter((r) => r.correct).length;

  if (phase === 'topics') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
              ← 뒤로
            </button>
            <h1 className="font-bold text-gray-800">문법 공부</h1>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <p className="text-4xl mb-2">✏️</p>
            <h2 className="text-xl font-bold text-gray-800">어떤 문법을 공부할까요?</h2>
            <p className="text-gray-400 text-sm mt-1">직접 입력하거나 아래 주제를 선택하세요</p>
          </div>

          {/* 직접 입력 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const keyword = customKeyword.trim();
              if (!keyword) return;
              handleTopicSelect({ id: 'custom', label: keyword });
            }}
            className="mb-6 flex gap-2"
          >
            <input
              ref={customInputRef}
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              placeholder="궁금한 문법 키워드를 입력하세요 (예: 현재완료, 5형식...)"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-800 text-sm"
            />
            <button
              type="submit"
              disabled={!customKeyword.trim()}
              className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-medium text-sm transition-colors"
            >
              시작
            </button>
          </form>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <p className="text-xs text-gray-400 font-medium mb-3">또는 주제 선택</p>
          <div className="flex flex-wrap gap-2">
            {GRAMMAR_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicSelect(topic)}
                className="px-4 py-2 rounded-full bg-white border border-indigo-200 text-indigo-600 font-medium text-sm hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
              >
                #{topic.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">#{selectedTopic?.label} 문제 만드는 중...</p>
      </div>
    );
  }

  if (phase === 'study') {
    const q = questions[currentIndex];
    const total = questions.length;

    // 빈칸 문장 렌더링: _____를 강조 표시
    const renderSentence = (sentence: string) => {
      const parts = sentence.split('_____');
      return (
        <span>
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && (
                <span className="inline-block min-w-[80px] border-b-2 border-indigo-400 mx-1 text-center font-bold text-indigo-500">
                  {submitted ? (
                    <span className={results[results.length - 1]?.correct ? 'text-green-600' : 'text-red-500'}>
                      {results[results.length - 1]?.userAnswer || '(무응답)'}
                    </span>
                  ) : '　　　'}
                </span>
              )}
            </span>
          ))}
        </span>
      );
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => {
                if (confirm('문법 공부를 중단할까요?')) setPhase('topics');
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← 중단
            </button>
            <h1 className="font-bold text-gray-800 flex-1">#{selectedTopic?.label}</h1>
            <span className="text-sm text-gray-400">{currentIndex + 1}/{total}</span>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
          {/* 진행 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / total) * 100}%` }}
            />
          </div>

          {/* 설명 카드 (항상 고정) */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 mb-1 uppercase tracking-wide">📖 개념 설명</p>
            <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-line">{explanation}</p>
          </div>

          {/* 문제 카드 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs text-gray-400 font-medium mb-3">문제 {currentIndex + 1}</p>
            <p className="text-lg font-medium text-gray-800 leading-relaxed mb-2">
              {renderSentence(q.sentenceWithBlank)}
            </p>

            {/* 정오답 피드백 */}
            {submitted && (
              <div className={`mt-4 rounded-xl p-3 ${results[results.length - 1]?.correct ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                {results[results.length - 1]?.correct ? (
                  <p className="text-green-700 font-medium text-sm">✓ 정답이에요!</p>
                ) : (
                  <div>
                    <p className="text-red-600 font-medium text-sm">✗ 정답은 <span className="font-bold">{q.correctAnswer}</span></p>
                  </div>
                )}
                <p className="text-gray-500 text-xs mt-1">{q.grammarPoint}</p>
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          {!submitted && (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="정답을 입력하세요"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-gray-800"
              />
              <button
                onClick={handleSkip}
                className="px-4 py-3 text-gray-400 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                스킵
              </button>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              submitted
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                : userAnswer.trim()
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!submitted && !userAnswer.trim()}
          >
            {submitted
              ? currentIndex + 1 >= total ? '결과 보기 →' : '다음 문제 →'
              : '제출'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const pct = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <h1 className="font-bold text-gray-800">#{selectedTopic?.label} 결과</h1>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <p className="text-5xl mb-2">{pct === 100 ? '🎉' : pct >= 60 ? '👏' : '💪'}</p>
            <h2 className="text-2xl font-bold text-gray-800">{questions.length}문제 완료!</h2>
            <p className="text-gray-500 mt-1">
              <span className="font-bold text-indigo-600">{correctCount}개</span> 정답
            </p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{pct}점</p>
          </div>

          <div className="space-y-2 mb-6">
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 border ${r.correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-lg font-bold shrink-0 ${r.correct ? 'text-green-500' : 'text-red-500'}`}>
                    {r.correct ? '✓' : '✗'}
                  </span>
                  <div>
                    <p className="text-sm text-gray-700">{r.question.sentenceWithBlank.replace('_____', `[${r.question.correctAnswer}]`)}</p>
                    {!r.correct && (
                      <p className="text-xs text-red-400 mt-0.5">
                        내 답: {r.userAnswer || '(무응답)'} → 정답: <span className="font-bold text-green-600">{r.question.correctAnswer}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{r.question.grammarPoint}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('topics')}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
            >
              다른 주제
            </button>
            <button
              onClick={() => selectedTopic && handleTopicSelect(selectedTopic)}
              className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold"
            >
              다시 풀기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

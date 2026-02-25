import { useState, useEffect, useRef } from 'react';
import type { TestQuestion as TestQuestionType } from '../types/vocab';
import { useTTS } from '../hooks/useTTS';

interface TestQuestionProps {
  question: TestQuestionType;
  questionNumber: number;
  total: number;
  onSubmit: (answer: string) => void;
}

export function TestQuestion({ question, questionNumber, total, onSubmit }: TestQuestionProps) {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { speak, isSupported } = useTTS();

  useEffect(() => {
    setAnswer('');
    inputRef.current?.focus();
  }, [question.wordId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answer);
  };

  const prompt = question.direction === 'en-to-ko' ? question.word : question.meaning;
  const placeholder = question.direction === 'en-to-ko' ? '한국어 뜻을 입력하세요' : '영어 단어를 입력하세요';

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="w-full">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>문제 {questionNumber} / {total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="w-full bg-white rounded-2xl shadow-md p-8 text-center">
        <p className="text-sm text-gray-500 mb-3">
          {question.direction === 'en-to-ko' ? '이 단어의 뜻은?' : '이 뜻의 영어 단어는?'}
        </p>
        <p className="text-4xl font-bold text-gray-800">{prompt}</p>
        {isSupported && question.direction === 'en-to-ko' && (
          <button
            type="button"
            onClick={() => speak(question.word)}
            className="mt-4 text-blue-500 hover:text-blue-700 text-sm"
          >
            🔊 발음 듣기
          </button>
        )}
      </div>

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={placeholder}
          className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none text-center"
          autoComplete="off"
        />
        <button
          type="submit"
          className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-lg transition-colors"
        >
          확인 (Enter)
        </button>
        <button
          type="button"
          onClick={() => onSubmit('')}
          className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm"
        >
          모르겠어요 (건너뛰기)
        </button>
      </form>
    </div>
  );
}

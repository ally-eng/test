import { useState, useCallback, useRef, useEffect } from 'react';
import type { VocabWord } from '../types/vocab';

interface PodcastPlayerProps {
  words: VocabWord[];
  setName: string;
}

export function PodcastPlayer({ words, setName }: PodcastPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const cancelRef = useRef(false);

  // 컴포넌트 언마운트 시 중지
  useEffect(() => {
    return () => {
      cancelRef.current = true;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakAsync = (text: string, lang: string, rate: number): Promise<void> =>
    new Promise((resolve) => {
      if (cancelRef.current) { resolve(); return; }
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = rate;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      window.speechSynthesis.speak(utt);
    });

  const pause = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const startPodcast = useCallback(async () => {
    if (!window.speechSynthesis) return;
    cancelRef.current = false;
    setPlaying(true);

    for (let i = 0; i < words.length; i++) {
      if (cancelRef.current) break;
      setCurrentIdx(i);
      const w = words[i];

      // 영어 단어 (미국식 발음, 느리게)
      await speakAsync(w.word, 'en-US', 0.8);
      if (cancelRef.current) break;
      await pause(400);

      // 한국어 뜻
      await speakAsync(w.meaning, 'ko-KR', 1.0);
      if (cancelRef.current) break;
      await pause(300);

      // 영어 한 번 더
      await speakAsync(w.word, 'en-US', 0.8);
      if (cancelRef.current) break;
      await pause(800);
    }

    if (!cancelRef.current) setCurrentIdx(null);
    setPlaying(false);
  }, [words]);

  const stopPodcast = useCallback(() => {
    cancelRef.current = true;
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setCurrentIdx(null);
  }, []);

  if (!window.speechSynthesis) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{playing ? '🎙️' : '🎧'}</span>
          <div className="min-w-0">
            <p className="font-semibold text-indigo-700 text-sm">팟캐스트 듣기</p>
            {playing && currentIdx !== null ? (
              <p className="text-indigo-400 text-xs truncate">
                {currentIdx + 1}/{words.length} · {words[currentIdx].word}
              </p>
            ) : (
              <p className="text-indigo-300 text-xs">단어 → 뜻 → 단어 순서로 읽어줘요</p>
            )}
          </div>
        </div>

        {playing ? (
          <button
            onClick={stopPodcast}
            className="shrink-0 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-sm font-medium transition-colors"
          >
            ■ 정지
          </button>
        ) : (
          <button
            onClick={startPodcast}
            className="shrink-0 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            ▶ 재생
          </button>
        )}
      </div>

      {/* 진행 바 */}
      {playing && (
        <div className="mt-3 w-full bg-indigo-100 rounded-full h-1.5">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: currentIdx !== null ? `${((currentIdx + 1) / words.length) * 100}%` : '0%' }}
          />
        </div>
      )}
    </div>
  );
}

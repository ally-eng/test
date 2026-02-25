import { useCallback, useRef } from 'react';

// 미국식 영어 음성 우선순위 목록
const EN_US_VOICE_PRIORITY = [
  'Samantha',        // iOS 미국식
  'Google US English',
  'Microsoft Aria',
  'Microsoft Guy',
  'Alex',
];

function getBestVoice(lang: 'en-US' | 'ko-KR'): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (lang === 'en-US') {
    // 우선순위 음성 먼저 탐색
    for (const name of EN_US_VOICE_PRIORITY) {
      const v = voices.find((v) => v.name.includes(name) && v.lang.startsWith('en'));
      if (v) return v;
    }
    // 그 외 en-US 음성
    return voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
  } else {
    return voices.find((v) => v.lang === 'ko-KR') ?? voices.find((v) => v.lang.startsWith('ko')) ?? null;
  }
}

export function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, lang: 'en-US' | 'ko-KR' = 'en-US') => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === 'en-US' ? 0.85 : 1.0;
    utterance.pitch = 1;

    const voice = getBestVoice(lang);
    if (voice) utterance.voice = voice;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSupported };
}

import { useCallback, useRef } from 'react';

export function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, lang: 'en-US' | 'ko-KR' = 'en-US') => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === 'en-US' ? 0.85 : 1.0;
    utterance.pitch = 1;
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

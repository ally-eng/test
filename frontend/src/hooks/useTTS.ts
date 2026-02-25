import { useCallback, useRef } from 'react';

const EN_US_PRIORITY = [
  'Google US English',   // Android Chrome
  'Samantha',            // iOS
  'Microsoft Aria',      // Windows
  'Microsoft Guy',
  'Alex',
];

// 음성 목록 비동기 로딩 (안드로이드 대응)
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    // 안드로이드: voiceschanged 이벤트 대기
    const handler = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // 1초 내 이벤트가 없으면 그냥 진행
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

async function pickVoice(lang: 'en-US' | 'ko-KR'): Promise<SpeechSynthesisVoice | null> {
  const voices = await getVoices();
  if (!voices.length) return null;

  if (lang === 'en-US') {
    for (const name of EN_US_PRIORITY) {
      const v = voices.find((v) => v.name.includes(name));
      if (v) return v;
    }
    return voices.find((v) => v.lang === 'en-US')
      ?? voices.find((v) => v.lang.startsWith('en'))
      ?? null;
  } else {
    return voices.find((v) => v.lang === 'ko-KR')
      ?? voices.find((v) => v.lang.startsWith('ko'))
      ?? null;
  }
}

export function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(async (text: string, lang: 'en-US' | 'ko-KR' = 'en-US') => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const voice = await pickVoice(lang);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === 'en-US' ? 0.85 : 1.0;
    utterance.pitch = 1;
    if (voice) utterance.voice = voice;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return { speak, stop, isSupported };
}

// PodcastPlayer용 export
export { pickVoice };

import { useCallback, useRef } from 'react';

// 음성 목록 비동기 로딩 (안드로이드/iOS 대응)
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }

    // Android: voiceschanged 이벤트 대기
    const handler = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // iOS는 이벤트가 안 오는 경우가 있어서 0.5초 후 재시도
    setTimeout(() => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) { resolve(v); window.speechSynthesis.removeEventListener('voiceschanged', handler); }
    }, 500);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 2000);
  });
}

async function pickVoice(lang: 'en-US' | 'ko-KR'): Promise<SpeechSynthesisVoice | null> {
  const voices = await getVoices();
  if (!voices.length) return null;

  if (lang === 'en-US') {
    // 1순위: 로컬 en-US 음성 중 선호 이름 포함
    const preferred = ['Google US English', 'Samantha', 'Microsoft Aria', 'Microsoft Guy', 'Alex'];
    for (const name of preferred) {
      const v = voices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (v) return v;
    }
    // 2순위: lang이 en-US인 로컬 음성
    const local = voices.find((v) => v.lang === 'en-US' && v.localService);
    if (local) return local;
    // 3순위: lang이 en-US인 모든 음성
    const enUS = voices.find((v) => v.lang === 'en-US');
    if (enUS) return enUS;
    // 4순위: en으로 시작하는 음성
    return voices.find((v) => v.lang.startsWith('en')) ?? null;
  } else {
    const local = voices.find((v) => v.lang === 'ko-KR' && v.localService);
    if (local) return local;
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

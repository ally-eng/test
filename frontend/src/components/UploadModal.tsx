import { useState, useRef } from 'react';
import { ocrImage, enrichBatch } from '../api/client';

export interface EnrichedWord {
  word: string;
  meaning: string;
  partOfSpeech?: string;
  etymology?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
}

interface UploadModalProps {
  onAdd: (words: EnrichedWord[]) => void;
  onClose: () => void;
}

type Step = 'upload' | 'ocr' | 'enriching' | 'review';

const LOADING_TIPS = [
  '단어를 많이 알수록 세상이 더 넓어 보여! 🌏',
  '오늘 외운 단어는 평생 기억될 거야! 💪',
  '조금만 기다려봐, 시현아! 거의 다 됐어! ✨',
  '어원을 알면 단어가 훨씬 쉽게 외워져! 🧠',
];

export function UploadModal({ onAdd, onClose }: UploadModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [words, setWords] = useState<EnrichedWord[]>([]);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });
  const [tipIndex] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일을 선택해주세요.');
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setError(null);

    // 1단계: OCR
    setStep('ocr');
    let extracted: Array<{ word: string; meaning: string }> = [];
    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.size > 4.5 * 1024 * 1024 ? 'image/jpeg' : file.type;
      extracted = await ocrImage(base64, mediaType);
      if (extracted.length === 0) {
        setError('단어를 찾을 수 없습니다. 다른 사진을 시도해보세요.');
        setStep('upload');
        return;
      }
    } catch (e) {
      setError((e as Error).message);
      setStep('upload');
      return;
    }

    // 2단계: 어원 일괄 생성
    setStep('enriching');
    setEnrichProgress({ current: 0, total: extracted.length });

    const enriched: EnrichedWord[] = extracted.map((w) => ({ ...w }));

    try {
      const results = await enrichBatch(extracted);
      let count = 0;
      for (const result of results) {
        const idx = enriched.findIndex((w) => w.word === result.word);
        if (idx !== -1 && result.success) {
          enriched[idx] = {
            ...enriched[idx],
            partOfSpeech: result.part_of_speech,
            etymology: result.etymology,
            exampleSentence: result.example_sentence,
            exampleTranslation: result.example_translation,
          };
        }
        count++;
        setEnrichProgress({ current: count, total: extracted.length });
      }
    } catch {
      // 어원 실패해도 단어 목록은 그냥 표시
    }

    setWords(enriched);
    setStep('review');
  };

  const updateWord = (i: number, field: 'word' | 'meaning', value: string) => {
    setWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, [field]: value } : w)));
  };

  const removeWord = (i: number) => {
    setWords((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleConfirm = () => {
    const valid = words.filter((w) => w.word.trim() && w.meaning.trim());
    if (valid.length > 0) {
      onAdd(valid);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={step === 'upload' ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {step === 'upload' && '📷 사진으로 단어 추출'}
            {step === 'ocr' && '🔍 단어 인식 중...'}
            {step === 'enriching' && '📚 어원 분석 중...'}
            {step === 'review' && `📝 추출 결과 확인 (${words.length}개)`}
          </h2>
          {(step === 'upload' || step === 'review') && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
          )}
        </div>

        {/* Upload step */}
        {step === 'upload' && (
          <div className="p-5 flex flex-col gap-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <p className="text-5xl mb-3">🖼️</p>
              <p className="text-gray-600 font-medium">사진첩에서 고르기</p>
              <p className="text-gray-400 text-sm mt-1">저장된 사진, 스크린샷 등</p>
            </div>
            <button
              onClick={() => cameraRef.current?.click()}
              className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors w-full"
            >
              <p className="text-5xl mb-3">📷</p>
              <p className="text-gray-600 font-medium">카메라로 촬영하기</p>
              <p className="text-gray-400 text-sm mt-1">단어장, 교과서, 필기 노트 등</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {error && <div className="bg-red-50 rounded-xl p-4 text-red-600 text-sm">{error}</div>}
          </div>
        )}

        {/* OCR loading */}
        {step === 'ocr' && (
          <div className="flex flex-col items-center gap-6 p-10">
            {previewUrl && (
              <img src={previewUrl} alt="preview" className="max-h-40 rounded-xl object-contain opacity-60" />
            )}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-700 font-medium text-lg">사진에서 단어를 찾고 있어요...</p>
              <p className="text-gray-400 text-sm">AI가 꼼꼼하게 읽고 있어요 🤖</p>
            </div>
            <p className="text-indigo-400 text-sm italic">{LOADING_TIPS[tipIndex]}</p>
          </div>
        )}

        {/* Enriching loading */}
        {step === 'enriching' && (
          <div className="flex flex-col items-center gap-6 p-10">
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="text-4xl animate-bounce">📚</div>
              <p className="text-gray-700 font-medium text-lg text-center">어원을 분석하고 있어요!</p>
              <p className="text-gray-400 text-sm">
                {enrichProgress.current} / {enrichProgress.total} 완료
              </p>
              {/* 진행 바 */}
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: enrichProgress.total > 0
                      ? `${(enrichProgress.current / enrichProgress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="text-indigo-500 font-bold text-xl">
                {enrichProgress.total > 0
                  ? Math.round((enrichProgress.current / enrichProgress.total) * 100)
                  : 0}%
              </p>
            </div>
            <p className="text-indigo-400 text-sm italic text-center">{LOADING_TIPS[(tipIndex + 1) % LOADING_TIPS.length]}</p>
          </div>
        )}

        {/* Review step */}
        {step === 'review' && (
          <>
            <div className="overflow-y-auto flex-1 p-5">
              <p className="text-sm text-gray-500 mb-3">
                총 <span className="font-bold text-indigo-600">{words.length}개</span> 추출됨.
                어원이 분석된 단어는 <span className="text-amber-500">📚</span> 표시돼요. 수정이 필요하면 편집하세요.
              </p>
              {words.map((w, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <input
                      value={w.word}
                      onChange={(e) => updateWord(i, 'word', e.target.value)}
                      placeholder="영어"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                    />
                    <input
                      value={w.meaning}
                      onChange={(e) => updateWord(i, 'meaning', e.target.value)}
                      placeholder="뜻"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-base" title={w.etymology}>{w.etymology ? '📚' : ''}</span>
                    <button onClick={() => removeWord(i)} className="p-1 text-gray-300 hover:text-red-500 text-lg">✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t flex gap-3">
              <button
                onClick={() => { setStep('upload'); setError(null); }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
              >
                다시 촬영
              </button>
              <button
                onClick={handleConfirm}
                disabled={words.filter((w) => w.word && w.meaning).length === 0}
                className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
              >
                {words.filter((w) => w.word && w.meaning).length}개 단어 저장
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const MAX_BYTES = 4.5 * 1024 * 1024;

  if (file.size <= MAX_BYTES) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const MAX_DIM = 2000;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      let base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      while (base64.length * 0.75 > MAX_BYTES && quality > 0.3) {
        quality -= 0.1;
        base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      }
      resolve(base64);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// 프로덕션: VITE_API_URL 환경변수 사용 / 개발: Vite 프록시(/api)
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function checkHealth(): Promise<{ status: string; has_api_key: boolean }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function ocrImage(
  imageBase64: string,
  mediaType: string
): Promise<Array<{ word: string; meaning: string }>> {
  const res = await fetch(`${BASE_URL}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'OCR failed' }));
    throw new Error(err.detail || 'OCR failed');
  }
  const data = await res.json();
  return data.words;
}

export async function enrichWord(
  word: string,
  meaning: string
): Promise<{ etymology: string; example_sentence: string; example_translation: string }> {
  const res = await fetch(`${BASE_URL}/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, meaning }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Enrich failed' }));
    throw new Error(err.detail || 'Enrich failed');
  }
  return res.json();
}

export async function enrichBatch(
  words: Array<{ word: string; meaning: string }>
): Promise<Array<{ word: string; success: boolean; part_of_speech?: string; etymology?: string; example_sentence?: string; example_translation?: string }>> {
  const res = await fetch(`${BASE_URL}/enrich/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(words),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Batch enrich failed' }));
    throw new Error(err.detail || 'Batch enrich failed');
  }
  const data = await res.json();
  return data.results;
}

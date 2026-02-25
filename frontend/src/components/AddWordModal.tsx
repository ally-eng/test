import { useState } from 'react';
import type { EnrichedWord } from './UploadModal';

interface AddWordModalProps {
  onAdd: (words: EnrichedWord[]) => void;
  onClose: () => void;
}

export function AddWordModal({ onAdd, onClose }: AddWordModalProps) {
  const [rows, setRows] = useState([{ word: '', meaning: '' }]);

  const updateRow = (index: number, field: 'word' | 'meaning', value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { word: '', meaning: '' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = rows.filter((r) => r.word.trim() && r.meaning.trim());
    if (valid.length === 0) return;
    onAdd(valid);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">단어 직접 입력</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-5">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">영어 단어</span>
              <span className="text-xs font-medium text-gray-500 uppercase">한국어 뜻</span>
              <span />
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                <input
                  type="text"
                  value={row.word}
                  onChange={(e) => updateRow(i, 'word', e.target.value)}
                  placeholder="e.g. abundant"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={row.meaning}
                  onChange={(e) => updateRow(i, 'meaning', e.target.value)}
                  placeholder="e.g. 풍부한"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="mt-2 text-indigo-500 hover:text-indigo-700 text-sm font-medium"
            >
              + 행 추가
            </button>
          </div>

          <div className="p-5 border-t flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

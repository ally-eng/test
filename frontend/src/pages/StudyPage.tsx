import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVocabStore } from '../store/vocabStore';
import { Flashcard } from '../components/Flashcard';
import { WordDetailDrawer } from '../components/WordDetailDrawer';
import { PodcastPlayer } from '../components/PodcastPlayer';
import type { VocabWord } from '../types/vocab';

export function StudyPage() {
  const navigate = useNavigate();
  const { sets, currentSetId } = useVocabStore();
  const currentSet = sets.find((s) => s.id === currentSetId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);

  if (!currentSet || currentSet.words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">단어가 없습니다.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2 bg-indigo-500 text-white rounded-xl"
        >
          홈으로
        </button>
      </div>
    );
  }

  const words = currentSet.words;
  const word = words[currentIndex];

  const handleNext = () => setCurrentIndex((i) => (i + 1) % words.length);
  const handlePrev = () => setCurrentIndex((i) => (i - 1 + words.length) % words.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← 뒤로
          </button>
          <h1 className="font-bold text-gray-800 flex-1">{currentSet.name} - 학습</h1>
          <button
            onClick={() => navigate('/test')}
            className="px-4 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium"
          >
            시험 보기
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <PodcastPlayer words={words} setName={currentSet.name} />
        <Flashcard
          word={word}
          onNext={handleNext}
          onPrev={handlePrev}
          onOpenDetail={() => setSelectedWord(word)}
          current={currentIndex + 1}
          total={words.length}
        />
      </div>

      {selectedWord && (
        <WordDetailDrawer
          word={selectedWord}
          setId={currentSet.id}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}

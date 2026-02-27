import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { checkHealth } from './api/client';
import { HomePage } from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import { TestPage } from './pages/TestPage';
import { ResultsPage } from './pages/ResultsPage';
import { SetupPage } from './pages/SetupPage';
import { EtymologyPage } from './pages/EtymologyPage';
import { GrammarPage } from './pages/GrammarPage';

type AppStatus = 'loading' | 'ready' | 'no_api_key' | 'backend_down';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading');

  useEffect(() => {
    checkHealth()
      .then((res) => {
        if (res.has_api_key) {
          setStatus('ready');
        } else {
          setStatus('no_api_key');
        }
      })
      .catch(() => {
        setStatus('backend_down');
      });
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">연결 확인 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'no_api_key') {
    return <SetupPage />;
  }

  if (status === 'backend_down') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <p className="text-5xl mb-3">⚠️</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">백엔드 서버를 시작해주세요</h1>
          <p className="text-gray-500 text-sm mb-6">
            아래 명령어로 백엔드 서버를 실행하세요.
          </p>
          <div className="bg-gray-900 rounded-xl p-4 text-left mb-6">
            <div className="font-mono text-xs text-green-400 space-y-1">
              <p>cd vocab-app/backend</p>
              <p>pip install -r requirements.txt</p>
              <p>uvicorn main:app --reload</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium"
          >
            다시 연결
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/study" element={<StudyPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/etymology" element={<EtymologyPage />} />
        <Route path="/grammar" element={<GrammarPage />} />
      </Routes>
    </BrowserRouter>
  );
}

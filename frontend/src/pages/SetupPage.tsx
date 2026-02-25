export function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🔑</p>
          <h1 className="text-2xl font-bold text-gray-800">API 키 설정 필요</h1>
          <p className="text-gray-500 mt-2">
            앱을 사용하려면 Anthropic API 키가 필요합니다.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <h2 className="font-bold text-blue-800 mb-3">📋 설정 방법</h2>
            <ol className="space-y-3 text-sm text-blue-700">
              <li className="flex gap-2">
                <span className="font-bold shrink-0">1.</span>
                <span>
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    console.anthropic.com
                  </a>
                  에서 계정을 만들고 로그인하세요.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">2.</span>
                <span>
                  <strong>API Keys</strong> 메뉴에서{' '}
                  <strong>Create Key</strong>를 클릭해 새 키를 생성하세요.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">3.</span>
                <span>
                  생성된 키를 복사한 후, 백엔드 폴더의{' '}
                  <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">
                    .env
                  </code>{' '}
                  파일에 붙여넣으세요:
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2 font-mono">backend/.env</p>
            <code className="text-green-400 font-mono text-sm">
              ANTHROPIC_API_KEY=sk-ant-api03-...
            </code>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h2 className="font-bold text-gray-700 mb-2">🚀 백엔드 실행 방법</h2>
            <div className="space-y-2 font-mono text-xs text-gray-600 bg-gray-100 p-3 rounded-lg">
              <p>cd vocab-app/backend</p>
              <p>pip install -r requirements.txt</p>
              <p>cp .env.example .env</p>
              <p># .env 파일에 API 키 입력 후:</p>
              <p>uvicorn main:app --reload</p>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
          >
            다시 확인
          </button>
        </div>
      </div>
    </div>
  );
}

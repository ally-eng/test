#!/bin/bash
# Start both backend and frontend

echo "🚀 단어 암기 앱 시작..."

# Check if backend .env exists
if [ ! -f backend/.env ]; then
  echo "⚠️  backend/.env 파일이 없습니다."
  echo "    cp backend/.env.example backend/.env"
  echo "    후 ANTHROPIC_API_KEY를 입력하세요."
  exit 1
fi

# Start backend in background
echo "📡 백엔드 서버 시작 (포트 8000)..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "🌐 프론트엔드 시작 (포트 5173)..."
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 앱이 시작되었습니다!"
echo "   프론트엔드: http://localhost:5173"
echo "   백엔드 API: http://localhost:8000"
echo "   API 문서:   http://localhost:8000/docs"
echo ""
echo "종료하려면 Ctrl+C를 누르세요."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

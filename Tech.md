# Tech.md — 기술 구현 상세

이 문서는 MVP를 실제로 코드로 만들기 위한 **기술 선택, 아키텍처, 파일 구조, 설치/검증 절차**를 정리한 문서입니다.

---

## 1. 기술 스택 (Tech Stack)

| 영역 | 선택한 기술 | 버전 | 선택 이유 |
|---|---|---|---|
| Framework | **Next.js** (App Router) | `^15` | React 기반 풀스택. 화면 + API를 한 곳에서. |
| UI Library | **React** | `^19` | Next.js 기본 |
| Rich Text Editor | **TipTap** | `^2` | ProseMirror 기반 headless 에디터, Yjs 연동 공식 지원 |
| Realtime (CRDT) | **Yjs** | `^13` | 다중 사용자 편집 충돌 자동 해결 |
| Realtime Transport | **y-websocket** | `^2` | Yjs 공식 WebSocket 서버/클라이언트 |
| Database | **SQLite** | — | 파일 하나로 끝, 제로 설정 |
| ORM | **Prisma** | `^5` | 타입 안전 DB 접근 |
| Auth | **iron-session** | `^8` | 경량 쿠키 세션 (NextAuth보다 간단) |
| Styling | **Tailwind CSS** | `^4` | 빠른 UI 개발 |
| WebSocket 라이브러리 | **ws** | `^8` | Node.js 표준 WebSocket |
| TypeScript 런타임 | **tsx** | `^4` | WS 서버를 TypeScript로 바로 실행 |
| 프로세스 오케스트레이션 | **concurrently** | `^8` | `npm run dev` 한 번으로 두 서버 동시 실행 |

### 왜 이 조합인가

- **TipTap + Yjs**: TipTap은 `@tiptap/extension-collaboration`과 `@tiptap/extension-collaboration-cursor`를 공식 제공합니다. 거의 설정만으로 실시간 편집 + 라이브 커서가 완성됩니다.
- **y-websocket (self-hosted)**: Liveblocks 같은 SaaS는 더 빠르지만 외부 계정이 필요하고 무료 한도가 있습니다. y-websocket은 코드 몇 줄로 로컬 서버를 띄울 수 있어 MVP에 최적.
- **SQLite**: 개발/데모 환경에서 DB 설치 없이 즉시 동작. Postgres가 필요해지면 Prisma schema만 바꾸면 됩니다.
- **iron-session**: NextAuth는 5+ 파일의 보일러플레이트가 필요하지만, MVP에는 "이름만 입력 → 쿠키 발급"이면 충분합니다. iron-session은 이걸 60줄로 해결.

---

## 2. 아키텍처 (Architecture)

### 2.1. 프로세스 구성

개발 환경에서는 **2개의 Node 프로세스**가 동시에 실행됩니다:

```
 npm run dev  (concurrently로 동시 실행)
 ├── Next.js app        →  port 3000  (화면, API, DB 접근)
 └── y-websocket server →  port 1234  (실시간 중계 + Yjs 상태 저장)
```

> **왜 분리?** Next.js App Router + Vercel 서버리스 환경에서는 API Route 안에 장기 실행 WebSocket을 띄우기 어렵습니다. y-websocket을 **형제 프로세스**로 분리하는 것이 Next.js + Yjs의 표준 패턴입니다.

### 2.2. 편집 데이터 흐름

```
 사용자 타이핑
    ↓
 TipTap editor
    ↓
 Y.Doc 변경 발생
    ↓
 WebsocketProvider → y-websocket 서버 (port 1234)
    ↓                    ↓
    ↓                    broadcast → 다른 클라이언트
    ↓                    ↓
    ↓                    (2초 debounce)
    ↓                    ↓
    ↓                    Prisma → SQLite
    ↓                    └── Document.ydocState (Bytes)
    ↓
 다른 사용자 화면에 즉시 반영
```

### 2.3. 초기 로드 흐름

```
 사용자가 /docs/abc123 접속
    ↓
 Next.js (port 3000) → Prisma → Document 조회 → 화면 렌더
    ↓
 클라이언트 <Editor> 마운트
    ↓
 WebsocketProvider 연결 시도 → ws://localhost:1234/abc123
    ↓
 y-websocket 서버: bindState('abc123', ydoc) 호출
    ↓
 Prisma로 Document.ydocState 조회
    ↓
 있으면 Y.applyUpdate(ydoc, bytes) → 기존 내용 복원
 없으면 빈 Y.Doc 그대로
    ↓
 클라이언트와 동기화 완료
```

### 2.4. Persistence Hook (핵심)

`y-websocket/bin/utils`가 제공하는 `setPersistence` 확장 포인트를 사용합니다:

```typescript
// server/websocket.ts (개념)
import { setPersistence, setupWSConnection } from 'y-websocket/bin/utils'
import * as Y from 'yjs'
import { prisma } from '@/lib/db'

setPersistence({
  bindState: async (docName, ydoc) => {
    // 1. DB에서 기존 상태 로드
    const doc = await prisma.document.findUnique({ where: { id: docName } })
    if (doc?.ydocState) Y.applyUpdate(ydoc, doc.ydocState)

    // 2. 변경이 생길 때마다 debounce 저장
    let timeout: NodeJS.Timeout | null = null
    ydoc.on('update', () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(async () => {
        const bytes = Buffer.from(Y.encodeStateAsUpdate(ydoc))
        await prisma.document.update({
          where: { id: docName },
          data: { ydocState: bytes }
        })
      }, 2000)
    })
  },
  writeState: async (docName, ydoc) => {
    // 마지막 클라이언트 disconnect 시 최종 flush
    const bytes = Buffer.from(Y.encodeStateAsUpdate(ydoc))
    await prisma.document.update({
      where: { id: docName },
      data: { ydocState: bytes }
    })
  }
})
```

---

## 3. 데이터 모델

### 3.1. Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String   @unique
  color     String   // hex, 예: "#22C55E"
  createdAt DateTime @default(now())
}

model Document {
  id        String   @id @default(cuid())
  title     String   @default("Untitled")
  ydocState Bytes?   // Y.encodeStateAsUpdate 결과
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3.2. 필드 설명

| 테이블 | 필드 | 용도 |
|---|---|---|
| User | `name` | 로그인 시 입력한 이름. `@unique`로 중복 방지. |
| User | `color` | 커서/배지 색상. 이름 해시로 프리셋 10색 중 하나 결정. |
| Document | `id` | URL에 들어가는 고유 ID (`/docs/[id]`) |
| Document | `title` | 문서 제목. REST API로 저장. |
| Document | `ydocState` | **Yjs의 바이너리 상태**. 문서 본문은 여기에 저장. 텍스트가 아니라 변경 이력을 포함한 압축 바이트. |
| Document | `updatedAt` | 목록에서 정렬 기준 |

> **왜 User와 Document에 관계가 없나?** MVP에서는 모든 문서가 전역 공개이기 때문입니다. 권한 기능이 추가될 때 `Document` 테이블에 `ownerId`, `DocumentAccess` 테이블을 추가하면 됩니다.

---

## 4. 라우트 구조 (Route Structure)

### 4.1. 페이지

| 경로 | 종류 | 설명 |
|---|---|---|
| `/` | Server Component | 세션 확인 후 `/login` 또는 `/docs`로 redirect |
| `/login` | Client Component | 이름 입력 폼 |
| `/docs` | Server Component | 모든 문서 목록 (로그인 필요) |
| `/docs/[id]` | Server Component → Editor(Client) | 문서 편집 화면 |

### 4.2. API Routes

| 경로 | 메서드 | 동작 |
|---|---|---|
| `/api/auth/login` | POST | `{ name }` 받아서 User upsert, 세션 쿠키 발급 |
| `/api/auth/logout` | POST | 세션 쿠키 삭제 |
| `/api/auth/me` | GET | 현재 로그인 사용자 정보 반환 (클라이언트 Editor가 호출) |
| `/api/docs` | POST | 새 Document 생성, `{ id }` 반환 |
| `/api/docs/[id]` | PATCH | `{ title }` 받아서 제목 변경 |

---

## 5. 파일 구조 (File Structure)

```
test/
├── CLAUDE.md
├── Project.md          ← 프로젝트 정의
├── Visual.md           ← UX/UI 다이어그램
├── Tech.md             ← 이 문서
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
├── .gitignore
│
├── prisma/
│   └── schema.prisma
│
├── lib/
│   ├── db.ts           ← PrismaClient 싱글톤
│   └── auth.ts         ← iron-session 설정, getCurrentUser, assignColor
│
├── server/
│   └── websocket.ts    ← ⭐ y-websocket 중계 서버
│
├── components/
│   ├── Editor.tsx      ← ⭐ TipTap + Yjs 실시간 에디터
│   ├── NewDocButton.tsx
│   └── PresenceList.tsx
│
└── app/
    ├── layout.tsx
    ├── globals.css
    ├── page.tsx        ← 루트 redirect
    │
    ├── login/
    │   └── page.tsx
    │
    ├── docs/
    │   ├── page.tsx    ← 문서 목록
    │   └── [id]/
    │       └── page.tsx ← ⭐ 편집 화면
    │
    └── api/
        ├── auth/
        │   ├── login/route.ts
        │   ├── logout/route.ts
        │   └── me/route.ts
        └── docs/
            ├── route.ts        ← POST: 새 문서
            └── [id]/route.ts   ← PATCH: 제목 변경
```

⭐ = 가장 핵심적인 파일

---

## 6. 핵심 코드 포인트

### 6.1. `components/Editor.tsx` — 실시간 에디터

```typescript
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useMemo, useEffect, useState } from 'react'

export function Editor({ documentId, user }: Props) {
  const ydoc = useMemo(() => new Y.Doc(), [documentId])

  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  useEffect(() => {
    const p = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL!,
      documentId,
      ydoc
    )
    p.awareness.setLocalStateField('user', {
      name: user.name,
      color: user.color
    })
    setProvider(p)
    return () => p.destroy()
  }, [documentId, ydoc, user])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),  // Yjs가 history 대신 담당
      Collaboration.configure({ document: ydoc }),
      provider && CollaborationCursor.configure({
        provider,
        user: { name: user.name, color: user.color }
      })
    ].filter(Boolean)
  }, [provider])

  return <EditorContent editor={editor} />
}
```

### 6.2. `server/websocket.ts` — 중계 서버

```typescript
import { WebSocketServer } from 'ws'
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils'
import * as Y from 'yjs'
import { prisma } from '../lib/db'

const port = Number(process.env.WS_PORT ?? 1234)
const wss = new WebSocketServer({ port })

setPersistence({
  bindState: async (docName, ydoc) => {
    const doc = await prisma.document.findUnique({ where: { id: docName } })
    if (doc?.ydocState) Y.applyUpdate(ydoc, doc.ydocState)

    let timeout: NodeJS.Timeout | null = null
    ydoc.on('update', () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(async () => {
        const bytes = Buffer.from(Y.encodeStateAsUpdate(ydoc))
        await prisma.document.update({
          where: { id: docName },
          data: { ydocState: bytes }
        })
      }, 2000)
    })
  },
  writeState: async (docName, ydoc) => {
    const bytes = Buffer.from(Y.encodeStateAsUpdate(ydoc))
    await prisma.document.update({
      where: { id: docName },
      data: { ydocState: bytes }
    })
  }
})

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true })
})

console.log(`WebSocket server listening on ws://localhost:${port}`)
```

### 6.3. `lib/auth.ts` — 세션 & 색상 할당

```typescript
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from './db'

export const sessionOptions = {
  cookieName: 'collab-doc-session',
  password: process.env.SESSION_PASSWORD!,
  cookieOptions: { secure: process.env.NODE_ENV === 'production' }
}

const PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981',
  '#3B82F6', '#06B6D4', '#8B5CF6', '#A855F7', '#F43F5E'
]

export function assignColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export async function getCurrentUser() {
  const session = await getIronSession<{ userId?: string }>(
    await cookies(),
    sessionOptions
  )
  if (!session.userId) return null
  return prisma.user.findUnique({ where: { id: session.userId } })
}
```

---

## 7. 환경 변수 (`.env.example`)

```bash
# SQLite DB 파일 경로
DATABASE_URL="file:./dev.db"

# iron-session 암호화 키 (32자+ 랜덤 문자열)
SESSION_PASSWORD="change-me-to-a-random-32-plus-char-string"

# WebSocket 서버 주소 (브라우저 → 서버)
NEXT_PUBLIC_WS_URL="ws://localhost:1234"

# WebSocket 서버 포트 (서버 기동 시)
WS_PORT=1234
```

> **주의**: 실제 `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 올라가지 않습니다.

---

## 8. npm scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "concurrently -n next,ws -c blue,green \"next dev\" \"tsx server/websocket.ts\"",
    "build": "prisma generate && next build",
    "start": "concurrently \"next start\" \"tsx server/websocket.ts\"",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "lint": "next lint"
  }
}
```

---

## 9. 설치 및 실행 절차 (Setup & Run)

### 최초 세팅 (한 번만)

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 복사 후 SESSION_PASSWORD 설정
cp .env.example .env
# .env 파일을 열어 SESSION_PASSWORD를 32자+ 랜덤 문자열로 변경

# 3. DB 스키마 적용 (dev.db 파일 생성)
npx prisma db push
```

### 개발 실행

```bash
npm run dev
```

실행하면 터미널에 아래와 같이 두 프로세스 로그가 찍힙니다:

```
 [next]  ready started server on 0.0.0.0:3000
 [ws]    WebSocket server listening on ws://localhost:1234
```

브라우저에서 `http://localhost:3000` 접속.

---

## 10. 검증 계획 (End-to-End Verification)

### 10.1. 2-브라우저 협업 테스트

1. **Chrome 일반 창** → `http://localhost:3000`
2. 이름 `Alice` 입력 → 로그인 → `/docs`
3. `+ 새 문서` 클릭 → `/docs/[id]` 이동
4. **Chrome 시크릿 창** → 같은 `http://localhost:3000`
5. 이름 `Bob` 입력 → 로그인 → `/docs`에서 같은 문서 클릭

### 10.2. 체크리스트

| # | 항목 | 기대 결과 |
|---|---|---|
| 1 | Alice 타이핑 → Bob 화면 반영 | 1초 이내 |
| 2 | Alice/Bob 동시 타이핑 | 글자 손실/중복 없음 |
| 3 | Bob 화면에 Alice 커서 표시 | 색상 + 이름 라벨 |
| 4 | 상단 presence | 두 사용자 모두 표시 |
| 5 | 두 창 닫고 서버 재시작 후 재접속 | 내용 그대로 복원 |
| 6 | 제목 변경 → `/docs` 새로고침 | 변경된 제목 표시 |

### 10.3. Failure Mode 테스트

- **WS 서버 강제 종료**: 편집 중 `ws` 프로세스 kill → 에디터는 로컬 편집 계속 가능 → WS 재시작 시 자동 reconnect → 변경사항 동기화
- **하드 리프레시**: 편집 중 `Cmd+R` → `bindState`가 최신 스냅샷 로드 → 내용 복원

### 10.4. DB 검증

```bash
npx prisma studio
```

브라우저에서 Prisma Studio가 열림. `Document` 테이블에서:
- `ydocState` 컬럼에 바이트 값이 있는지 확인
- `updatedAt`이 최근 시간으로 업데이트되는지 확인

---

## 11. 알려진 한계 및 Post-MVP 과제

| 한계 | 영향 | 해결 방향 |
|---|---|---|
| WS 서버에 인증 없음 | 로컬 데모 전용, 공개 배포 불가 | 로그인 시 단기 서명 토큰(JWT) 발급 → WS 클라이언트가 `params`로 전달 → 서버에서 검증 |
| 모든 문서 전역 공개 | 권한 관리 불가 | `Document` 테이블에 `ownerId`, `DocumentAccess` 테이블 추가 |
| 제목 실시간 동기화 없음 | 옆 사람은 새로고침 필요 | 제목을 Y.Doc 안의 `Y.Text`로 이동 |
| 프로덕션 배포 미고려 | Vercel serverless와 WS가 분리 필요 | WS 서버를 Railway/Fly.io 등에 별도 배포, Next.js는 Vercel |
| 문서 삭제 없음 | UI 부재 | `DELETE /api/docs/[id]` 추가 |

# CLAUDE.md

This file provides guidance for AI assistants (including Claude) working in this repository.

## Repository Overview

- **Repository**: ally-eng/test
- **Status**: Active development — meeting management service
- **Primary branch**: `claude/meeting-management-service-diaFQ`

외부 기업 미팅을 기록·분석하고, 액션아이템·협력 시나리오를 자동 도출하며, Obsidian과 연동되는 고객관리 서비스. Claude API(claude-opus-4-6)로 티로(tiro) 스크립트를 처리합니다.

## Project Structure

```
.
├── CLAUDE.md               # AI assistant guidance (this file)
├── main.py                 # CLI entry point (analyze / list / proposal / export)
├── analyzer.py             # Claude API: transcript analysis + proposal generation
├── storage.py              # JSON persistence at ~/.meeting-manager/<company>.json
├── obsidian.py             # Obsidian vault markdown exporter
├── models.py               # Dataclasses: MeetingAnalysis, ActionItem, CollaborationScenario
├── requirements.txt        # Python deps: anthropic
└── sample_transcript.txt   # Example tiro-format meeting transcript
```

## Development Setup

### Prerequisites

- Python 3.12+
- `ANTHROPIC_API_KEY` environment variable

### Installation

```bash
pip install -r requirements.txt
```

### Running the Project

```bash
# 미팅 스크립트 분석
python main.py analyze sample_transcript.txt --company "테크노바"

# Obsidian 볼트 연동
python main.py analyze sample_transcript.txt --company "테크노바" --obsidian ~/MyVault

# 미팅 목록 조회
python main.py list
python main.py list --company "테크노바"

# 제안서 생성 (파트너십 / poc / investment / mou)
python main.py proposal "테크노바" --type partnership --output proposal.md

# Obsidian 전체 내보내기
python main.py export --vault ~/MyVault
```

## Build and Test

| Action | Command |
|--------|---------|
| Run    | `python main.py <command>` |
| Lint   | `ruff check .` |
| Format | `ruff format .` |

## Code Conventions

When contributing to this repository, follow these guidelines:

### General

- Keep changes focused and minimal — avoid unnecessary refactors or scope creep.
- Prefer editing existing files over creating new ones.
- Do not add dead code, speculative features, or premature abstractions.
- Remove unused code completely rather than commenting it out.

### Commits

- Write clear, concise commit messages that explain **why**, not just **what**.
- Keep commits atomic — one logical change per commit.
- Do not commit secrets, credentials, or environment files (`.env`, API keys, etc.).

### Code Style

_To be determined — document linter/formatter configurations and style rules here once established._

### Testing

_To be determined — document testing conventions, coverage expectations, and test file naming patterns here._

## Architecture

```
tiro 스크립트 파일
      │
      ▼
  analyzer.py  ──── Claude Opus 4.6 (structured JSON output)
      │                   ↳ 날짜, 참석자, 요약, 액션아이템, 협력 시나리오 추출
      ▼
  storage.py   ──── ~/.meeting-manager/<company>.json
      │
      ├──▶ obsidian.py ── Obsidian 볼트
      │        ├── Meetings/<Company>/<date>_<id>.md  (미팅 노트)
      │        ├── Meetings/<Company>/_Overview.md    (회사 개요)
      │        └── Meetings/_Index.md                (마스터 인덱스)
      │
      └──▶ analyzer.py ── Claude Opus 4.6 (streaming + adaptive thinking)
               └── 제안서 마크다운 생성
```

**핵심 설계 결정:**
- `output_config.format` 구조화 출력으로 트랜스크립트 분석을 단일 API 호출로 처리
- 제안서는 스트리밍 + `thinking: {type: "adaptive"}`로 고품질 장문 생성
- 데이터는 기업별 JSON 파일로 저장 (외부 DB 불필요)
- Obsidian은 파일시스템 기반 연동 (YAML 프론트매터, 위키링크)

## CI/CD

_To be determined — document pipeline configuration, deployment process, and environment details here._

## Useful Context for AI Assistants

- This is a fresh repository. When adding new functionality, establish clean patterns from the start.
- Always read existing files before modifying them.
- Validate changes by running the appropriate build/test/lint commands before committing.
- When introducing new tooling or dependencies, update this file accordingly.
- Prefer standard, well-known libraries and patterns over custom solutions.

## Updating This File

Keep this file current. Update it when:

- The tech stack or project structure changes
- New build/test/lint commands are added
- Architectural decisions are made
- Onboarding steps change
- New conventions are adopted

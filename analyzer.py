"""Claude API integration for meeting transcript analysis and proposal generation."""

import json
import uuid
from datetime import datetime

import anthropic

from models import ActionItem, CollaborationScenario, MeetingAnalysis

client = anthropic.Anthropic()

# JSON schema for structured extraction from meeting transcripts
_MEETING_SCHEMA = {
    "type": "object",
    "properties": {
        "date": {
            "type": "string",
            "description": "Meeting date in YYYY-MM-DD format. Use today if not found in transcript.",
        },
        "attendees": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of attendees (name and role if mentioned)",
        },
        "key_topics": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Main topics discussed",
        },
        "summary": {
            "type": "string",
            "description": "Concise summary of the meeting (3-5 sentences)",
        },
        "action_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "owner": {"type": "string"},
                    "deadline": {"type": "string"},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["description", "priority"],
                "additionalProperties": False,
            },
        },
        "collaboration_scenarios": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "benefits": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "next_steps": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "feasibility": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["title", "description", "benefits", "next_steps", "feasibility"],
                "additionalProperties": False,
            },
        },
        "sentiment": {
            "type": "string",
            "enum": ["positive", "neutral", "negative"],
            "description": "Overall tone of the meeting",
        },
        "follow_up_required": {
            "type": "boolean",
            "description": "Whether a follow-up meeting or action is needed soon",
        },
    },
    "required": [
        "date",
        "attendees",
        "key_topics",
        "summary",
        "action_items",
        "collaboration_scenarios",
        "sentiment",
        "follow_up_required",
    ],
    "additionalProperties": False,
}

_PROPOSAL_TYPES = {
    "partnership": "파트너십 제안서",
    "poc": "PoC(개념검증) 제안서",
    "investment": "투자 제안서",
    "mou": "MOU 체결 제안서",
}


def analyze_transcript(transcript: str, company: str) -> MeetingAnalysis:
    """Analyze a meeting transcript and return structured MeetingAnalysis.

    Uses structured JSON output to reliably extract all fields in a single call.
    Handles Korean and English transcripts, including tiro-formatted speaker labels.
    """
    today = datetime.now().strftime("%Y-%m-%d")

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=(
            "당신은 비즈니스 미팅 분석 전문가입니다. "
            "미팅 스크립트(한국어 또는 영어)를 분석하여 핵심 정보, 액션아이템, "
            "실현 가능한 협력 시나리오를 추출합니다. "
            "티로(tiro) 포맷의 화자 레이블([화자 1], [화자 2] 등)을 올바르게 처리합니다. "
            f"스크립트에 날짜가 없으면 오늘({today})을 사용하세요."
        ),
        messages=[
            {
                "role": "user",
                "content": (
                    f"{company}와의 미팅 스크립트를 분석해 주세요.\n\n"
                    "---\n"
                    f"{transcript}\n"
                    "---\n\n"
                    "다음을 추출해 주세요:\n"
                    "1. 날짜, 참석자, 주요 토픽\n"
                    "2. 미팅 요약 (3~5문장)\n"
                    "3. 액션아이템 (담당자·기한·우선순위 포함)\n"
                    "4. 구체적이고 실현 가능한 협력 시나리오 (2~4개)\n"
                    "5. 미팅 분위기 및 후속 조치 필요 여부"
                ),
            }
        ],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": _MEETING_SCHEMA,
            }
        },
    )

    data = json.loads(response.content[0].text)

    return MeetingAnalysis(
        meeting_id=str(uuid.uuid4())[:8],
        date=data["date"],
        company=company,
        attendees=data["attendees"],
        key_topics=data["key_topics"],
        summary=data["summary"],
        action_items=[ActionItem(**ai) for ai in data["action_items"]],
        collaboration_scenarios=[
            CollaborationScenario(**cs) for cs in data["collaboration_scenarios"]
        ],
        sentiment=data["sentiment"],
        follow_up_required=data["follow_up_required"],
    )


def generate_proposal(
    company: str,
    meetings: list[MeetingAnalysis],
    proposal_type: str = "partnership",
) -> str:
    """Generate a business proposal based on meeting history.

    Uses streaming with adaptive thinking for high-quality long-form output.
    Streams text to stdout while collecting the full response.
    """
    type_label = _PROPOSAL_TYPES.get(proposal_type, proposal_type)

    meetings_context = "\n\n".join(
        f"### 미팅 {i + 1} ({m.date})\n"
        f"**요약:** {m.summary}\n"
        f"**주요 토픽:** {', '.join(m.key_topics)}\n"
        f"**협력 시나리오:** {', '.join(s.title for s in m.collaboration_scenarios)}\n"
        f"**액션아이템:** {len(m.action_items)}개"
        for i, m in enumerate(sorted(meetings, key=lambda m: m.date))
    )

    print(f"✍️  {type_label} 작성 중...\n", flush=True)
    print("─" * 60)

    full_response = ""
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=8192,
        thinking={"type": "adaptive"},
        system=(
            "당신은 전문 비즈니스 제안서 작성자입니다. "
            "미팅 히스토리를 바탕으로 구체적이고 설득력 있는 제안서를 작성합니다. "
            "마크다운 형식, 전문적인 한국어 비즈니스 언어를 사용합니다."
        ),
        messages=[
            {
                "role": "user",
                "content": (
                    f"{company}와의 미팅 히스토리를 바탕으로 **{type_label}**를 작성해 주세요.\n\n"
                    f"## 미팅 히스토리\n\n{meetings_context}\n\n"
                    "## 제안서 포함 항목\n"
                    "1. 제안 배경 및 목적\n"
                    "2. 협력 범위 및 세부 내용\n"
                    "3. 기대 효과 및 ROI\n"
                    "4. 추진 로드맵 (단계별 일정)\n"
                    "5. 역할 분담\n"
                    "6. 다음 단계 (Next Steps)"
                ),
            }
        ],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
            full_response += text

    print("\n" + "─" * 60)
    return full_response

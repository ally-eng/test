import anthropic
import os
import json

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def generate_grammar_content(topic_id: str, topic_label: str) -> dict:
    """선택한 문법 주제에 대한 설명과 빈칸 채우기 문제 5개를 생성합니다."""
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""초등학생을 위한 영어 문법 수업을 만들어주세요. 주제: {topic_label}

1. explanation: 초등학생이 쉽게 이해할 수 있게 한국어로 설명해주세요.
   - 이 문법이 무엇인지 간단한 개념 설명
   - 예문을 최소 3개 이상 들어서 패턴을 눈으로 익힐 수 있게 해주세요
   - 예문은 "영어 문장 → 한국어 뜻" 형식으로
   - 줄바꿈(\\n)을 활용해서 읽기 쉽게

2. questions: 이 문법 주제를 연습할 수 있는 빈칸 채우기 문제 5개.
   - 쉽고 친숙한 단어 사용 (동물, 음식, 학교, 가족 등)
   - 빈칸은 _____ 로만 표시 (힌트 괄호 없이)
   - grammar_point는 한국어로 짧고 명확하게 (왜 이 답인지 한 문장)

JSON으로만 답하세요. 다른 말은 쓰지 마세요:
{{
  "explanation": "현재시제는 평소에 항상 하는 일을 말할 때 써요!\\n\\n📌 I, You, We, They → 동사 그대로\\n• I play soccer. (나는 축구를 해요)\\n• They eat pizza. (그들은 피자를 먹어요)\\n\\n📌 He, She, It → 동사에 -(e)s 붙이기\\n• She plays soccer. (그녀는 축구를 해요)\\n• He eats pizza. (그는 피자를 먹어요)\\n• My cat sleeps a lot. (내 고양이는 많이 자요)",
  "questions": [
    {{
      "sentence_with_blank": "She _____ soccer every day.",
      "hint": "play",
      "correct_answer": "plays",
      "grammar_point": "주어가 She(3인칭 단수)이므로 동사에 -s를 붙여요"
    }}
  ]
}}"""
        }],
    )
    text = _clean_json(message.content[0].text)
    return json.loads(text)


def _clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return text

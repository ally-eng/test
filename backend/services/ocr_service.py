import anthropic
import os
import json

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def extract_words_from_image(image_base64: str, media_type: str) -> list[dict]:
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": """이 이미지에서 영어 단어와 한국어 뜻을 추출해주세요.
최대 40개까지 추출하고, 반드시 아래 JSON 형식으로만 응답하세요.
다른 설명 없이 JSON만 출력하세요.

[
  {"word": "영어단어", "meaning": "한국어뜻"},
  ...
]

단어가 없으면 빈 배열 []을 반환하세요."""
                    }
                ],
            }
        ],
    )

    text = message.content[0].text.strip()

    # JSON 파싱
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])

    words = json.loads(text)

    # 유효성 검사
    result = []
    for item in words:
        if isinstance(item, dict) and "word" in item and "meaning" in item:
            result.append({
                "word": str(item["word"]).strip(),
                "meaning": str(item["meaning"]).strip()
            })

    return result

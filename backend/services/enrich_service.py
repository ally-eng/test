import anthropic
import os
import json
import asyncio

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# 단일 단어 (WordDetailDrawer용)
async def enrich_word(word: str, meaning: str) -> dict:
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{
            "role": "user",
            "content": f"""영어 단어 "{word}" (뜻: {meaning})에 대해 JSON으로만 답하세요.

어원은 초등학생도 이해할 수 있게 쉽고 재미있게 2-3문장으로.

{{"etymology":"어원설명","example_sentence":"B1 영어예문","example_translation":"한국어번역"}}"""
        }],
    )
    text = _clean_json(message.content[0].text)
    return json.loads(text)


# 여러 단어를 한 번의 API 호출로 처리 (핵심 최적화)
async def enrich_words_chunk(words: list[dict]) -> list[dict]:
    """words: [{"word": ..., "meaning": ...}, ...]"""
    numbered = "\n".join(
        f'{i+1}. {w["word"]} ({w["meaning"]})'
        for i, w in enumerate(words)
    )
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200 * len(words),
        messages=[{
            "role": "user",
            "content": f"""아래 영어 단어들의 어원과 예문을 JSON 배열로만 답하세요. 다른 말은 쓰지 마세요.
어원은 초등학생도 이해할 수 있게 쉽고 재미있게 2문장으로.

{numbered}

[{{"word":"단어","etymology":"어원","example_sentence":"예문","example_translation":"번역"}},...]"""
        }],
    )
    text = _clean_json(message.content[0].text)
    return json.loads(text)


# 배치 처리: 청크로 나눠 병렬 실행
async def enrich_batch(words: list[dict], chunk_size: int = 10) -> list[dict]:
    chunks = [words[i:i+chunk_size] for i in range(0, len(words), chunk_size)]

    async def process_chunk(chunk):
        try:
            results = await enrich_words_chunk(chunk)
            # 원본 단어 순서와 매핑
            out = []
            for w in chunk:
                matched = next((r for r in results if r.get("word", "").lower() == w["word"].lower()), None)
                if matched:
                    out.append({"word": w["word"], "success": True,
                                "etymology": matched.get("etymology", ""),
                                "example_sentence": matched.get("example_sentence", ""),
                                "example_translation": matched.get("example_translation", "")})
                else:
                    out.append({"word": w["word"], "success": False})
            return out
        except Exception as e:
            return [{"word": w["word"], "success": False, "error": str(e)} for w in chunk]

    chunk_results = await asyncio.gather(*[process_chunk(c) for c in chunks])
    return [item for sublist in chunk_results for item in sublist]


def _clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return text

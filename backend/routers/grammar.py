from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.grammar_service import generate_grammar_content

router = APIRouter()


class GrammarTopicRequest(BaseModel):
    topic_id: str
    topic_label: str


@router.post("/grammar/topic")
async def grammar_topic_endpoint(request: GrammarTopicRequest):
    try:
        result = await generate_grammar_content(request.topic_id, request.topic_label)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

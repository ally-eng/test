from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.enrich_service import enrich_word, enrich_batch

router = APIRouter()

class EnrichRequest(BaseModel):
    word: str
    meaning: str

@router.post("/enrich")
async def enrich_endpoint(request: EnrichRequest):
    try:
        result = await enrich_word(request.word, request.meaning)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enrich/batch")
async def enrich_batch_endpoint(requests: list[EnrichRequest]):
    try:
        words = [{"word": r.word, "meaning": r.meaning} for r in requests]
        results = await enrich_batch(words)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

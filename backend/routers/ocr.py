from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.ocr_service import extract_words_from_image

router = APIRouter()

class OCRRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"

@router.post("/ocr")
async def ocr_endpoint(request: OCRRequest):
    try:
        words = await extract_words_from_image(request.image_base64, request.media_type)
        return {"words": words}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    has_key = bool(api_key and api_key != "your_api_key_here")
    return {
        "status": "ok" if has_key else "no_api_key",
        "has_api_key": has_key,
    }

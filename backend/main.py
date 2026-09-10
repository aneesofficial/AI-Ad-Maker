from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI Ad Maker API")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    import os
    key = os.getenv("GEMINI_API_KEY")
    return {"status": "ok", "api_key_detected": bool(key and key != "your_key_here")}

from pydantic import BaseModel, Field
from fastapi import Form, UploadFile, File, HTTPException
from fastapi.responses import Response
import json

from services.gemini_service import generate_script
from services.tts_service import generate_voice
from services.video_service import generate_video

class ScriptRequest(BaseModel):
    product_description: str = Field(..., min_length=1)
    language: str = "english"

@app.post("/api/generate-script")
async def api_generate_script(request: ScriptRequest):
    try:
        result = generate_script(request.product_description, request.language)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class VoiceRequest(BaseModel):
    script: str = Field(..., min_length=1)
    language: str = "english"

@app.post("/api/generate-voice")
async def api_generate_voice(request: VoiceRequest):
    try:
        audio_bytes = await generate_voice(request.script, request.language)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-ad-video")
async def api_generate_ad_video(
    image: UploadFile = File(...),
    audio: UploadFile = File(...),
    highlights: str = Form(...)  # JSON string array
):
    try:
        image_bytes = await image.read()
        audio_bytes = await audio.read()
        
        if not image_bytes or not audio_bytes:
            raise HTTPException(status_code=400, detail="Image and audio files must not be empty.")
            
        try:
            parsed_highlights = json.loads(highlights)
            if not isinstance(parsed_highlights, list):
                raise ValueError("Highlights must be a JSON array of strings.")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON for highlights.")
            
        video_bytes = generate_video(image_bytes, audio_bytes, parsed_highlights)
        return Response(content=video_bytes, media_type="video/mp4")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


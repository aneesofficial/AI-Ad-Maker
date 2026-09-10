from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

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
    audio_mode: str = "voice"
    music_track: Optional[str] = None

@app.post("/api/generate-voice")
async def api_generate_voice(request: VoiceRequest):
    try:
        if request.audio_mode == "music" and request.music_track:
            import os
            track_path = os.path.join("assets", "music", f"{request.music_track}.mp3")
            if not os.path.exists(track_path):
                raise HTTPException(status_code=400, detail="Invalid music track selected.")
            with open(track_path, "rb") as f:
                audio_bytes = f.read()
            return Response(content=audio_bytes, media_type="audio/mpeg")
            
        audio_bytes = await generate_voice(request.script, request.language)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-ad-video")
async def api_generate_ad_video(
    image: UploadFile = File(None),
    video: UploadFile = File(None),
    audio: UploadFile = File(...),
    highlights: str = Form(...)  # JSON string array
):
    try:
        image_bytes = await image.read() if image else None
        video_bytes = await video.read() if video else None
        audio_bytes = await audio.read()
        
        if not image_bytes and not video_bytes:
            raise HTTPException(status_code=400, detail="Must provide either an image or a video file.")
        if image_bytes and video_bytes:
            raise HTTPException(status_code=400, detail="Cannot provide both an image and a video file.")
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file must not be empty.")
            
        if video and video.size and video.size > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Video file exceeds 50MB limit.")
            
        try:
            parsed_highlights = json.loads(highlights)
            if not isinstance(parsed_highlights, list):
                raise ValueError("Highlights must be a JSON array of strings.")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON for highlights.")
            
        output_video_bytes = generate_video(
            image_bytes=image_bytes,
            video_bytes=video_bytes,
            audio_bytes=audio_bytes,
            highlights=parsed_highlights
        )
        return Response(content=output_video_bytes, media_type="video/mp4")
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from services.motion_service import generate_motion_video

@app.post("/api/generate-motion-video")
async def api_generate_motion_video(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Image file is required.")
        
        video_bytes = await generate_motion_video(image_bytes)
        return Response(content=video_bytes, media_type="video/mp4")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=503, 
            detail="Automatic motion video generation is currently unavailable — all free providers are down or busy right now."
        )

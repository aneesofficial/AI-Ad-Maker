from dotenv import load_dotenv
load_dotenv()

import os
import tempfile
import asyncio
import edge_tts
import logging

logger = logging.getLogger(__name__)

async def generate_voice(script: str, language: str = "english") -> bytes:
    voice = os.getenv("TTS_VOICE_ENGLISH", "en-US-ChristopherNeural")
    if language.lower() == "urdu":
        voice = os.getenv("TTS_VOICE_URDU", "ur-PK-AsadNeural")
        
    logger.info(f"Generating voice using {voice}")
    
    # We will generate the voice and return bytes
    communicate = edge_tts.Communicate(script, voice)
    
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
        temp_path = temp_audio.name
        
    try:
        await communicate.save(temp_path)
        with open(temp_path, "rb") as f:
            audio_bytes = f.read()
        return audio_bytes
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise Exception("Failed to generate voice.")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

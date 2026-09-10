import os
import subprocess
import tempfile
import json
import logging
import math
import shutil

logger = logging.getLogger(__name__)

def check_dependencies():
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg not found on PATH")
    if not shutil.which("ffprobe"):
        raise RuntimeError("ffprobe not found on PATH")

def get_audio_duration(audio_path: str) -> float:
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error", "-show_entries",
                "format=duration", "-of",
                "default=noprint_wrappers=1:nokey=1", audio_path
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        return float(result.stdout.strip())
    except Exception as e:
        logger.error(f"Failed to get audio duration: {e}")
        raise

def generate_video(image_bytes: bytes, audio_bytes: bytes, highlights: list) -> bytes:
    check_dependencies()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        image_path = os.path.join(temp_dir, "input.jpg")
        audio_path = os.path.join(temp_dir, "input.mp3")
        output_path = os.path.join(temp_dir, "output.mp4")
        
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        with open(audio_path, "wb") as f:
            f.write(audio_bytes)
            
        duration = get_audio_duration(audio_path)
        if duration <= 0:
            raise ValueError("Audio duration is 0 or invalid.")
            
        fps = 30
        frames = int(duration * fps)
        
        # Build filtergraph
        # 1. Scale and pad to 1280x720 to ensure standard sizing before zoompan
        # 2. zoompan: zoom in slowly to 1.5x over the duration
        #   zoompan=z='min(zoom+0.0015,1.5)':d={frames}:s=1280x720:fps={fps}
        filter_chains = []
        filter_chains.append(f"scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p")
        filter_chains.append(f"zoompan=z='1.08+0.10*sin(2*PI*on/({frames}/2.5))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1280x720:fps={fps}")
        
        # 3. Add text highlights
        if highlights and len(highlights) > 0:
            slice_duration = duration / len(highlights)
            for i, text in enumerate(highlights):
                start_time = i * slice_duration
                end_time = (i + 1) * slice_duration
                # Clean up text to avoid ffmpeg parsing issues
                clean_text = text.replace("'", "").replace(":", "\\:").replace("'", "\\'")
                
                # Draw text at bottom center (x=(w-text_w)/2, y=h-150)
                # White text, black semi-transparent background box
                drawtext = (
                    f"drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='{clean_text}':fontcolor=white:fontsize=48:"
                    f"box=1:boxcolor=black@0.6:boxborderw=10:"
                    f"x=(w-text_w)/2:y=h-150:"
                    f"enable='between(t,{start_time},{end_time})'"
                )
                filter_chains.append(drawtext)
                
        filtergraph = ",".join(filter_chains)
        
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", image_path,
            "-i", audio_path,
            "-vf", filtergraph,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-t", str(duration),
            output_path
        ]
        
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg failed. stderr: {e.stderr.decode('utf-8')}")
            raise RuntimeError("Video generation failed.")
            
        # Validate output
        try:
            validation = subprocess.run(
                [
                    "ffprobe", "-v", "error", "-show_entries",
                    "stream=codec_type", "-of",
                    "default=noprint_wrappers=1:nokey=1", output_path
                ],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True
            )
            streams = validation.stdout.strip().split()
            if "video" not in streams or "audio" not in streams:
                raise RuntimeError("Generated video is missing video or audio stream.")
        except Exception as e:
            logger.error(f"Video validation failed: {e}")
            raise RuntimeError("Generated video failed validation.")
            
        with open(output_path, "rb") as f:
            video_bytes = f.read()
            
        return video_bytes

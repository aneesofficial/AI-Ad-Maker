import os
import requests
import time
import subprocess

API_URL_VOICE = "http://localhost:8000/api/generate-voice"
API_URL_VIDEO = "http://localhost:8000/api/generate-ad-video"
IMAGE_PATH = "frame.jpg"
VIDEO_PATH = "test_oscillation.mp4"

def validate_video(file_path):
    print(f"Validating {file_path}...")
    if not os.path.exists(file_path):
        print("File not found!")
        return False
        
    size = os.path.getsize(file_path)
    print(f"Size: {size} bytes")
    
    try:
        validation = subprocess.run(
            [
                "ffprobe", "-v", "error", "-show_entries",
                "stream=codec_type,duration", "-of",
                "default=noprint_wrappers=1:nokey=1", file_path
            ],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True
        )
        output = validation.stdout.strip().split('\n')
        streams = [o for o in output if not o.replace('.', '', 1).isdigit()]
        durations = [float(o) for o in output if o.replace('.', '', 1).isdigit()]
        duration = durations[0] if durations else 0
        
        print(f"Streams: {streams}, Duration: {duration:.2f}s")
        if "video" in streams and "audio" in streams and duration > 0:
            print("SUCCESS: Valid video with audio")
            return True
        else:
            print("FAILURE: Missing streams or zero duration")
            return False
    except Exception as e:
        print(f"Validation failed: {e}")
        return False

def test_music_pipeline():
    print("\n--- Testing /api/generate-voice (Music Mode) ---")
    data = {
        "script": "Test script",
        "language": "english",
        "audio_mode": "music",
        "music_track": "upbeat"
    }
    r = requests.post(API_URL_VOICE, json=data)
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print("Failed to get music audio")
        return
        
    audio_bytes = r.content
    with open("test_music.mp3", "wb") as f:
        f.write(audio_bytes)
    print(f"Downloaded music audio, size: {len(audio_bytes)} bytes")
    
    print("\n--- Testing Image Path with Music ---")
    files = {
        'image': open(IMAGE_PATH, 'rb'),
        'audio': open("test_music.mp3", 'rb')
    }
    data_vid = {
        'highlights': '["Music Test", "Photo"]'
    }
    r2 = requests.post(API_URL_VIDEO, files=files, data=data_vid)
    print(f"Status: {r2.status_code}")
    if r2.status_code == 200:
        with open("test_out_music_image.mp4", "wb") as f:
            f.write(r2.content)
        validate_video("test_out_music_image.mp4")
        
    print("\n--- Testing Video Path with Music ---")
    files = {
        'video': open(VIDEO_PATH, 'rb'),
        'audio': open("test_music.mp3", 'rb')
    }
    data_vid = {
        'highlights': '["Music Test", "Video"]'
    }
    r3 = requests.post(API_URL_VIDEO, files=files, data=data_vid)
    print(f"Status: {r3.status_code}")
    if r3.status_code == 200:
        with open("test_out_music_video.mp4", "wb") as f:
            f.write(r3.content)
        validate_video("test_out_music_video.mp4")

if __name__ == "__main__":
    test_music_pipeline()

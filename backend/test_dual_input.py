import os
import requests
import time
import subprocess

API_URL = "http://localhost:8000/api/generate-ad-video"
IMAGE_PATH = "frame.jpg"
VIDEO_PATH = "test_oscillation.mp4"
AUDIO_PATH = "silent.mp3"

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

def test_image_path():
    print("\n--- Testing Image Path (Regression) ---")
    files = {
        'image': open(IMAGE_PATH, 'rb'),
        'audio': open(AUDIO_PATH, 'rb')
    }
    data = {
        'highlights': '["Test 1", "Test 2"]'
    }
    t0 = time.time()
    r = requests.post(API_URL, files=files, data=data)
    print(f"Status: {r.status_code} in {time.time()-t0:.2f}s")
    if r.status_code == 200:
        with open("test_out_image.mp4", "wb") as f:
            f.write(r.content)
        validate_video("test_out_image.mp4")
    else:
        print(f"Error: {r.text}")

def test_video_path():
    print("\n--- Testing Video Path ---")
    files = {
        'video': open(VIDEO_PATH, 'rb'),
        'audio': open(AUDIO_PATH, 'rb')
    }
    data = {
        'highlights': '["Video Test 1", "Video Test 2"]'
    }
    t0 = time.time()
    r = requests.post(API_URL, files=files, data=data)
    print(f"Status: {r.status_code} in {time.time()-t0:.2f}s")
    if r.status_code == 200:
        with open("test_out_video.mp4", "wb") as f:
            f.write(r.content)
        validate_video("test_out_video.mp4")
    else:
        print(f"Error: {r.text}")

def test_both_error():
    print("\n--- Testing Validation: Both Image and Video ---")
    files = {
        'image': open(IMAGE_PATH, 'rb'),
        'video': open(VIDEO_PATH, 'rb'),
        'audio': open(AUDIO_PATH, 'rb')
    }
    data = {
        'highlights': '["Test 1"]'
    }
    r = requests.post(API_URL, files=files, data=data)
    print(f"Status: {r.status_code} (Expected 400)")
    print(f"Response: {r.text}")

def test_neither_error():
    print("\n--- Testing Validation: Neither Image nor Video ---")
    files = {
        'audio': open(AUDIO_PATH, 'rb')
    }
    data = {
        'highlights': '["Test 1"]'
    }
    r = requests.post(API_URL, files=files, data=data)
    print(f"Status: {r.status_code} (Expected 400)")
    print(f"Response: {r.text}")

if __name__ == "__main__":
    test_both_error()
    test_neither_error()
    test_image_path()
    test_video_path()

import os
import requests

MUSIC_DIR = "backend/assets/music"
os.makedirs(MUSIC_DIR, exist_ok=True)

tracks = {
    "upbeat.mp3": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    "calm.mp3": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_27731238aa.mp3",
    "corporate.mp3": "https://cdn.pixabay.com/download/audio/2022/10/25/audio_4945d8bfa2.mp3"
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

for name, url in tracks.items():
    print(f"Downloading {name} from {url}...")
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            file_path = os.path.join(MUSIC_DIR, name)
            with open(file_path, "wb") as f:
                f.write(response.content)
            size = os.path.getsize(file_path)
            print(f"SUCCESS: Saved {name} ({size} bytes)")
        else:
            print(f"FAILED to download {name}: HTTP {response.status_code}")
    except Exception as e:
        print(f"ERROR: {e}")

import os
import tempfile
import asyncio
from gradio_client import Client, handle_file
import logging

logger = logging.getLogger(__name__)

CANDIDATES = [
    {"space": "multimodalart/stable-video-diffusion", "api_name": "/video"},
    {"space": "stabilityai/stable-video-diffusion", "api_name": "/video"},
]

def run_gradio_predict(space: str, api_name: str, image_path: str):
    client = Client(space)
    # The signature for /video is (image, seed, randomize_seed, motion_bucket_id, fps_id) -> (video_dict, seed)
    result = client.predict(
        image=handle_file(image_path),
        seed=0,
        randomize_seed=True,
        motion_bucket_id=127,
        fps_id=6,
        api_name=api_name
    )
    return result

async def generate_motion_video(image_bytes: bytes) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_img:
        temp_img.write(image_bytes)
        temp_img_path = temp_img.name

    try:
        for candidate in CANDIDATES:
            logger.info(f"Trying to generate motion video using {candidate['space']}...")
            try:
                # Run the synchronous gradio client predict in a thread with a timeout
                result = await asyncio.wait_for(
                    asyncio.to_thread(run_gradio_predict, candidate["space"], candidate["api_name"], temp_img_path),
                    timeout=45.0
                )
                
                # result is (dict, seed)
                if isinstance(result, tuple) and len(result) > 0:
                    video_dict = result[0]
                    if isinstance(video_dict, dict) and "video" in video_dict:
                        video_path = video_dict["video"]
                        if os.path.exists(video_path):
                            with open(video_path, "rb") as f:
                                video_bytes = f.read()
                            if len(video_bytes) > 0:
                                logger.info(f"Success with {candidate['space']}")
                                return video_bytes
            except asyncio.TimeoutError:
                logger.warning(f"Timeout while trying {candidate['space']}")
            except Exception as e:
                logger.warning(f"Failed with {candidate['space']}: {e}")
                
        raise Exception("All motion video generation candidates failed.")
    finally:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

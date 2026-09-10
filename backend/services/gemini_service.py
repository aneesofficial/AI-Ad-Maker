from dotenv import load_dotenv
load_dotenv()

import os
import json
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Initialize client using environment variable GEMINI_API_KEY
# If GEMINI_API_KEY is not set, we'll try to instantiate and let it throw if missing
client = None

def get_client():
    global client
    if client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_key_here":
            logger.warning("GEMINI_API_KEY not set properly.")
        client = genai.Client()
    return client

def generate_script(product_description: str, language: str = "english") -> dict:
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "script_prompt.txt")
    with open(prompt_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    prompt = prompt_template.format(product_description=product_description, language=language)
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # Attempt to parse JSON response. Retry once if fails.
    for attempt in range(2):
        try:
            c = get_client()
            # We enforce JSON output
            response = c.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            
            # The response text should be valid JSON
            text = response.text
            with open("raw_gemini.txt", "w", encoding="utf-8") as rf:
                rf.write(text)
            # Strip markdown fences if Gemini added them
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            parsed = json.loads(text)
            
            # Validate expected keys
            if "script" not in parsed or "highlights" not in parsed:
                raise ValueError("Missing 'script' or 'highlights' in JSON")
                
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Gemini (attempt {attempt+1}): {e}")
            if attempt == 1:
                raise Exception("Failed to generate a valid JSON response from Gemini.")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            raise Exception(f"Failed to generate script: {e}")

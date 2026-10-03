import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from backend.config import get_gemini_key, GEMINI_MODEL
from google import genai

key = get_gemini_key()
print("Gemini key configured:", bool(key), "Model:", GEMINI_MODEL)
if key:
    client = genai.Client(api_key=key)
    model = GEMINI_MODEL or "gemini-2.5-flash"
    try:
        res = client.models.generate_content(
            model=model,
            contents="Say 'Gemini is fully operational' in 4 words."
        )
        print("Gemini output:", res.text.strip())
    except Exception as e:
        print("Gemini error:", e)

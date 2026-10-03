import sys
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.config import get_pixabay_key

key = get_pixabay_key()
queries = [
    "cyber security",
    "cyber attack",
    "network traffic",
    "server room",
    "security operations",
    "hacker computer",
    "data center server",
    "cyber security analyst",
    "network monitor",
]

for q in queries:
    r = httpx.get("https://pixabay.com/api/videos/", params={"key": key, "q": q, "per_page": 4})
    hits = r.json().get("hits", [])
    print(f"=== Query: {q} ({len(hits)} hits) ===")
    for h in hits:
        print(f"  ID: {h['id']} | Tags: {h.get('tags')} | Dur: {h.get('duration')}s")

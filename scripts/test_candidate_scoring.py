import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from google import genai
from google.genai import types
from backend.config import get_gemini_key, GEMINI_MODEL

client = genai.Client(api_key=get_gemini_key())

prompt = """Evaluate these 3 video clip candidates for a scene with:
Intent: Cybersecurity analyst notices unusual network activity inside a dark futuristic SOC
Required Visuals: SOC, multiple monitors, dark environment, security dashboard, analyst
Negative Concepts: office meeting, cooking, cars, street traffic, generic laptop in coffee shop

Candidate 1 (id=142363): tags='spy, surveillance, hud, computer, tracking, security, cyber, hacking'
Candidate 2 (id=230036): tags='street, cars, traffic, path, city, motorway, speed, vehicles, modern'
Candidate 3 (id=286689): tags='cybersecurity, data center, server, it professional, technology, laptop, server room, coding, workspace'

Return JSON list:
[
  {
    "candidate_id": 142363,
    "subjectMatch": 0.8,
    "actionMatch": 0.7,
    "environmentMatch": 0.85,
    "objectMatch": 0.8,
    "topicMatch": 0.9,
    "styleMatch": 0.85,
    "hasNegativeConcept": false,
    "overallScore": 0.82,
    "reason": "..."
  }
]
"""

response = client.models.generate_content(
    model=GEMINI_MODEL or "gemini-3.8-flash",
    contents=prompt,
    config=types.GenerateContentConfig(response_mime_type="application/json")
)
print(response.text)

import sys
from pathlib import Path
import httpx

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.config import get_pixabay_key
from backend.services.semantic_matcher import score_candidate_multisignal

k = get_pixabay_key()

test_scenes = [
    (142363, "Establish SOC with monitors", ["monitors", "security screens", "hud"], ["office", "cars"], "cybersecurity analyst", "cyber attack", "monitoring", "futuristic SOC"),
    (326411, "Ransomware detection alert", ["cyber attack", "alert code", "virus"], ["cars", "street"], "cybersecurity analyst", "ransomware attack", "detecting attack", "SOC"),
    (305053, "Tracing network traffic telemetry", ["network flow", "data stream", "cyber"], ["cars", "highway"], "cybersecurity analyst", "cyber attack", "tracing network traffic", "SOC"),
    (286689, "Infected server room cluster", ["server room", "data center", "hardware"], ["kitchen", "nature"], "cybersecurity analyst", "cyber attack", "investigating server", "server room"),
    (262696, "Attack stopped and quarantined with shield", ["cyber defense", "shield", "protection"], ["food", "cars"], "cybersecurity analyst", "cyber attack", "stopping attack", "SOC"),
]

for vid_id, intent, req, neg, subj, topic, act, env in test_scenes:
    # Fetch hit metadata
    h = httpx.get("https://pixabay.com/api/videos/", params={"key": k, "id": str(vid_id)}).json().get("hits", [])[0]
    scores = score_candidate_multisignal(
        candidate=h,
        scene_intent=intent,
        required_visuals=req,
        negative_concepts=neg,
        main_subject=subj,
        topic=topic,
        action=act,
        environment=env,
        visual_style="cinematic tech thriller",
        lighting="dramatic blue lighting"
    )
    print(f"Candidate {vid_id} for '{intent[:30]}':")
    print(f"  Score: {scores.composite_score:.2f} | Acceptable: {scores.is_acceptable}")
    print(f"  Detail: {scores.explanation}")

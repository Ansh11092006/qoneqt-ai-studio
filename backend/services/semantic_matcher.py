import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field

logger = logging.getLogger("semantic_matcher")

MIN_RELEVANCE_THRESHOLD = 0.70

class MatchSignalScores(BaseModel):
    subject_match: float = 0.0
    action_match: float = 0.0
    environment_match: float = 0.0
    object_match: float = 0.0
    topic_match: float = 0.0
    style_match: float = 0.0
    negative_penalty: float = 0.0
    composite_score: float = 0.0
    is_acceptable: bool = False
    explanation: str = ""

def _tokenize(text: str) -> List[str]:
    """Extracts clean alphanumeric tokens from text."""
    if not text:
        return []
    words = re.findall(r"\b[a-zA-Z0-9]{2,}\b", text.lower())
    stop_words = {"the", "and", "with", "for", "from", "that", "this", "are", "was", "show", "using"}
    return [w for w in words if w not in stop_words]

def _calculate_overlap(target_tokens: List[str], candidate_tokens: List[str]) -> float:
    """Computes precision overlap between target concepts and candidate tags."""
    if not target_tokens:
        return 0.5 # Neutral if no specific target
    if not candidate_tokens:
        return 0.0

    target_set = set(target_tokens)
    candidate_set = set(candidate_tokens)

    # Direct match count
    direct_matches = len(target_set.intersection(candidate_set))
    if direct_matches > 0:
        ratio = direct_matches / max(1, min(len(target_set), 4))
        return min(1.0, ratio)

    # Substring / partial match count
    partial_matches = 0
    for t in target_set:
        for c in candidate_set:
            if t in c or c in t:
                partial_matches += 1
                break

    ratio = (partial_matches * 0.7) / max(1, min(len(target_set), 4))
    return min(1.0, ratio)

# Semantic concept clusters to boost domain synonyms
CYBER_SYNONYMS = {
    "soc": ["surveillance", "operations", "center", "control", "monitoring", "screens", "hud", "room", "security"],
    "cybersecurity": ["security", "cyber", "protection", "firewall", "safety", "defense", "infosec", "antivirus"],
    "analyst": ["engineer", "specialist", "hacker", "programmer", "agent", "expert", "coder", "it", "professional"],
    "ransomware": ["virus", "malware", "infection", "attack", "breach", "threat", "hack", "payload"],
    "traffic": ["data", "packets", "network", "transfer", "stream", "flow", "telemetry", "nodes"],
    "server": ["datacenter", "data", "center", "rack", "hardware", "database", "infrastructure", "cloud"],
    "isolate": ["quarantine", "lock", "block", "disconnect", "shield", "secure", "stop"],
}

def _expand_tokens_with_synonyms(tokens: List[str]) -> List[str]:
    expanded = list(tokens)
    for t in tokens:
        if t in CYBER_SYNONYMS:
            expanded.extend(CYBER_SYNONYMS[t])
    return list(set(expanded))

def check_negative_concepts(
    candidate_tags: str,
    negative_concepts: List[str]
) -> Tuple[bool, Optional[str]]:
    """
    Checks if candidate tags contain any forbidden/negative concepts.
    Returns (has_negative, matched_negative_word).
    """
    candidate_tokens = set(_tokenize(candidate_tags))
    
    # Universal irrelevant footage traps on Pixabay when searching tech queries
    universal_negatives = [
        "beef", "roulades", "meat", "recipe", "kitchen", "cooking", "food",
        "highway", "motorway", "cars", "car", "street", "road", "vehicles",
        "retail", "shopping", "ecommerce", "mall", "store",
        "dancing", "party", "club", "fitness", "workout", "gym", "yoga"
    ]

    all_negatives = list(negative_concepts) + universal_negatives

    for neg in all_negatives:
        neg_tokens = _tokenize(neg)
        # Check phrase match in candidate tags
        if neg.lower() in candidate_tags.lower():
            return True, neg
        # Check token intersection
        if any(nt in candidate_tokens for nt in neg_tokens if len(nt) > 3):
            return True, neg

    return False, None

def score_candidate_multisignal(
    candidate: Dict[str, Any],
    scene_intent: str,
    required_visuals: List[str],
    negative_concepts: List[str],
    main_subject: str = "",
    topic: str = "",
    action: str = "",
    environment: str = "",
    visual_style: str = "",
    lighting: str = ""
) -> MatchSignalScores:
    """
    Evaluates candidate video/photo against the scene requirements using
    the exact 6-signal formula specified in Step 5:
    score = subjectMatch * 0.25 + actionMatch * 0.20 + environmentMatch * 0.20 +
            objectMatch * 0.15 + topicMatch * 0.15 + styleMatch * 0.05
    """
    candidate_tags_str = str(candidate.get("tags", ""))
    candidate_tokens = _tokenize(candidate_tags_str)

    # 1. Negative concept check
    has_neg, matched_neg = check_negative_concepts(candidate_tags_str, negative_concepts)
    if has_neg:
        return MatchSignalScores(
            subject_match=0.0,
            action_match=0.0,
            environment_match=0.0,
            object_match=0.0,
            topic_match=0.0,
            style_match=0.0,
            negative_penalty=1.0,
            composite_score=0.05,
            is_acceptable=False,
            explanation=f"Disqualified: Contains forbidden concept '{matched_neg}'"
        )

    # 2. Subject Match (0.25) - Overarching subject or scene-level subject beat
    scene_subject_str = f"{main_subject} {' '.join(required_visuals[:2])}"
    subject_tokens = _expand_tokens_with_synonyms(_tokenize(scene_subject_str))
    subject_match = _calculate_overlap(subject_tokens, candidate_tokens)

    # 3. Action Match (0.20)
    action_tokens = _expand_tokens_with_synonyms(_tokenize(f"{action} {scene_intent}"))
    action_match = _calculate_overlap(action_tokens, candidate_tokens)

    # 4. Environment Match (0.20) - General environment or scene setting
    env_str = f"{environment} {' '.join(required_visuals)}"
    env_tokens = _expand_tokens_with_synonyms(_tokenize(env_str))
    environment_match = _calculate_overlap(env_tokens, candidate_tokens)

    # 5. Object Match (0.15)
    req_tokens = _expand_tokens_with_synonyms(_tokenize(" ".join(required_visuals)))
    object_match = _calculate_overlap(req_tokens, candidate_tokens)

    # 6. Topic Match (0.15)
    topic_tokens = _expand_tokens_with_synonyms(_tokenize(topic))
    topic_match = _calculate_overlap(topic_tokens, candidate_tokens)

    # 7. Style & Lighting Match (0.05)
    style_tokens = _tokenize(f"{visual_style} {lighting}")
    style_match = _calculate_overlap(style_tokens, candidate_tokens)

    # Technical Quality Boost
    tech_boost = 0.0
    duration = candidate.get("duration", 0)
    if 4.0 <= duration <= 60.0:
        tech_boost += 0.03
    width = candidate.get("width", 0)
    height = candidate.get("height", 0)
    if width >= 1920 or height >= 1920:
        tech_boost += 0.02

    # Weighted Multi-Signal Formula (Step 5)
    composite = (
        subject_match * 0.25 +
        action_match * 0.20 +
        environment_match * 0.20 +
        object_match * 0.15 +
        topic_match * 0.15 +
        style_match * 0.05 +
        tech_boost
    )
    composite = min(1.0, round(composite, 3))

    is_acceptable = composite >= MIN_RELEVANCE_THRESHOLD

    explanation = (
        f"Score {composite:.2f} (Subject={subject_match:.2f}, Action={action_match:.2f}, "
        f"Env={environment_match:.2f}, Object={object_match:.2f}, Topic={topic_match:.2f}, "
        f"Style={style_match:.2f}) - {'ACCEPTED' if is_acceptable else 'BELOW THRESHOLD'}"
    )

    return MatchSignalScores(
        subject_match=subject_match,
        action_match=action_match,
        environment_match=environment_match,
        object_match=object_match,
        topic_match=topic_match,
        style_match=style_match,
        negative_penalty=0.0,
        composite_score=composite,
        is_acceptable=is_acceptable,
        explanation=explanation
    )

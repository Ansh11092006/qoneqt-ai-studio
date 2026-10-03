import os
import sys
import asyncio
import subprocess
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.config import DATA_DIR, FFMPEG_BIN, FFPROBE_BIN, UPLOADS_DIR
from backend.services.director import generate_content_plan
from backend.models import JobOptions, Scene, ContentPlan
from backend.services.tts import synthesize_scene_audio
from backend.services.captions import generate_ass_subtitles
from backend.services.media import prepare_scene_visual
from backend.services.composer import normalize_scene_clip, compose_final_video

def create_sample_uploaded_asset(dest_path: Path):
    """Creates a sample uploaded image to verify upload override feature."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        FFMPEG_BIN, "-y",
        "-f", "lavfi",
        "-i", "color=c=0x1e1b4b:s=1080x1920:d=1",
        "-vframes", "1",
        str(dest_path)
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    print(f" Created sample uploaded image: {dest_path.name}")

async def main():
    print("=" * 60)
    print("PHASE 2 CLI TEST: Full Video Pipeline (Pexels + TTS + Captions + FFmpeg)")
    print("=" * 60)

    test_job_id = "test_phase2_job"
    job_dir = DATA_DIR / "jobs" / test_job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    topic = "5 Cybersecurity Mistakes College Students Make"
    options = JobOptions(duration=15, tone="Educational", language="en", voice="M")

    print("\n[Step 1/5] Generating Content Plan (3 scenes for rapid CLI test)...")
    full_plan = await generate_content_plan(mode="topic", user_input=topic, options=options)
    
    # Use 3 scenes for fast CLI verification (< 45s)
    test_scenes = full_plan.scenes[:3]
    theme = full_plan.theme
    print(f" Theme Mood: {theme.mood} | Accent: {theme.palette.accent}")

    print("\n[Step 2/5] Creating simulated user upload for Scene 1 override...")
    sample_upload = UPLOADS_DIR / "user_scene1_override.png"
    create_sample_uploaded_asset(sample_upload)

    print("\n[Step 3/5] Synthesizing Voiceover (edge-tts / gTTS)...")
    scene_audios = []
    scene_durations = []
    scene_timings = []
    current_time = 0.0

    for scene in test_scenes:
        print(f"  Synthesizing Scene {scene.id}: \"{scene.narration[:45]}...\"")
        audio_path, duration, word_boundaries = await synthesize_scene_audio(
            scene_id=scene.id,
            narration=scene.narration,
            output_dir=job_dir,
            language=full_plan.language,
            voice_gender=options.voice
        )
        scene_audios.append(audio_path)
        scene_durations.append(duration)
        scene_timings.append({
            "scene_start_time": current_time,
            "scene_duration": duration,
            "word_boundaries": word_boundaries,
            "fallback_text": scene.narration
        })
        current_time += duration
        print(f"    -> Audio generated: {audio_path.name} ({duration:.2f}s, {len(word_boundaries)} words timed)")

    print("\n[Step 4/5] Preparing Visuals (Upload Override for Scene 1, Pexels/Cards for others)...")
    visual_clips = []
    for i, scene in enumerate(test_scenes):
        dur = scene_durations[i]
        upload_override = sample_upload if i == 0 else None
        
        print(f"  Preparing visual for Scene {scene.id} (override={bool(upload_override)})...")
        raw_clip = await prepare_scene_visual(
            scene=scene,
            duration=dur,
            theme=theme,
            job_dir=job_dir,
            uploaded_asset_path=upload_override
        )
        
        # Normalize and pair with audio
        norm_clip = job_dir / f"scene_{scene.id}_norm.mp4"
        print(f"  Normalizing Scene {scene.id} to 1080x1920 30fps...")
        success = normalize_scene_clip(raw_clip, scene_audios[i], dur, norm_clip)
        assert success, f"Failed to normalize Scene {scene.id}!"
        visual_clips.append(norm_clip)

    print("\n[Step 5/5] Generating Dynamic ASS Subtitles & Composing Final MP4...")
    ass_file = job_dir / "subtitles.ass"
    generate_ass_subtitles(scene_timings, theme.palette.accent, ass_file)
    print(f"  Generated ASS subtitles: {ass_file.name}")

    final_mp4 = compose_final_video(
        scene_clips=visual_clips,
        ass_subtitles_path=ass_file,
        theme=theme,
        job_dir=job_dir,
        cta_text=full_plan.cta,
        output_filename="final_output.mp4"
    )

    # Verification of final output
    assert final_mp4.exists(), "Final video file was not created!"
    file_size_mb = final_mp4.stat().st_size / (1024 * 1024)
    print(f"\n Final Video Created: {final_mp4.name} ({file_size_mb:.2f} MB)")

    # Probe final video with ffprobe
    probe_cmd = [
        FFPROBE_BIN, "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,duration",
        "-of", "default=noprint_wrappers=1",
        str(final_mp4)
    ]
    res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    probe_output = res.stdout.strip()
    print(" FFprobe Stream Analysis:")
    print(probe_output)

    assert "width=1080" in probe_output, "Width is not 1080!"
    assert "height=1920" in probe_output, "Height is not 1920!"

    thumb_file = job_dir / "thumb.jpg"
    assert thumb_file.exists(), "Thumbnail JPG was not generated!"
    print(f" Poster frame thumbnail verified: {thumb_file.name} ({thumb_file.stat().st_size} bytes)")

    print("\n" + "=" * 60)
    print("PHASE 2 VERIFICATION PASSED SUCCESSFULLY")
    print(f"Output Video: {final_mp4.resolve()}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

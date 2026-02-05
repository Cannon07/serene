"""
Hume AI service for emotion detection from video and audio.
"""
import os
import json
import asyncio
import tempfile
from typing import Optional

from hume import AsyncHumeClient
from opik import track


class HumeServiceError(Exception):
    """Raised when Hume API returns an error."""
    pass


def _get_api_key() -> Optional[str]:
    """Get API key at runtime."""
    return os.getenv("HUME_API_KEY")


async def _wait_for_job(client: AsyncHumeClient, job_id: str, timeout: int = 120) -> None:
    """
    Poll for job completion.

    Args:
        client: Hume client
        job_id: Job ID to wait for
        timeout: Maximum seconds to wait

    Raises:
        HumeServiceError: If job fails or times out
    """
    elapsed = 0
    poll_interval = 3

    while elapsed < timeout:
        job = await client.expression_measurement.batch.get_job_details(id=job_id)
        state = job.state.status if job.state else None

        if state == "COMPLETED":
            return
        elif state == "FAILED":
            raise HumeServiceError(f"Hume job failed: {job.state.message if job.state else 'Unknown error'}")

        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

    raise HumeServiceError(f"Hume job timed out after {timeout} seconds")


def _extract_emotions_from_predictions(predictions, model_type: str) -> dict:
    """
    Extract emotion scores from Hume predictions.

    Args:
        predictions: Raw predictions from Hume API (list or single object)
        model_type: "face" or "prosody"

    Returns:
        Dict mapping emotion names to average scores (0-1)
    """
    emotion_totals = {}
    emotion_counts = {}

    # Handle both list and single prediction
    if not isinstance(predictions, list):
        predictions = [predictions]

    for prediction in predictions:
        # Navigate to the model results
        results = prediction.results
        if not results:
            continue

        predictions_list = results.predictions
        if not predictions_list:
            continue

        for pred in predictions_list:
            # Get model-specific data
            if model_type == "face":
                model_data = pred.models.face if pred.models else None
            else:  # prosody
                model_data = pred.models.prosody if pred.models else None

            if not model_data:
                continue

            # Face model has grouped_predictions, prosody has grouped_predictions
            grouped = model_data.grouped_predictions
            if not grouped:
                continue

            for group in grouped:
                # Each group has predictions with emotions
                for frame in group.predictions:
                    emotions = frame.emotions
                    if not emotions:
                        continue

                    for emotion in emotions:
                        name = emotion.name
                        score = emotion.score

                        if name not in emotion_totals:
                            emotion_totals[name] = 0.0
                            emotion_counts[name] = 0

                        emotion_totals[name] += score
                        emotion_counts[name] += 1

    # Calculate averages
    emotions = {}
    for name, total in emotion_totals.items():
        count = emotion_counts[name]
        emotions[name] = total / count if count > 0 else 0.0

    return emotions


@track(name="HumeService.analyze_video")
async def analyze_video(video_bytes: bytes, filename: str = "video.mp4") -> dict:
    """
    Analyze facial expressions from video using Hume Face model.

    Args:
        video_bytes: Raw video file bytes
        filename: Filename with extension (for format detection)

    Returns:
        Dict mapping emotion names to scores (0-1)

    Raises:
        HumeServiceError: If API key is missing or analysis fails
    """
    api_key = _get_api_key()
    if not api_key:
        raise HumeServiceError("HUME_API_KEY not configured")

    # Write bytes to temp file with proper extension
    suffix = os.path.splitext(filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        client = AsyncHumeClient(api_key=api_key)

        # Configure face model as JSON
        config = {
            "models": {
                "face": {}
            }
        }

        # Open file in binary mode and start job
        with open(tmp_path, "rb") as file_obj:
            job_id = await client.expression_measurement.batch.start_inference_job_from_local_file(
                file=[file_obj],
                json=config,
            )

        # Wait for completion
        await _wait_for_job(client, job_id)

        # Get predictions
        predictions = await client.expression_measurement.batch.get_job_predictions(id=job_id)

        # Extract emotions
        emotions = _extract_emotions_from_predictions(predictions, "face")

        return emotions

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@track(name="HumeService.analyze_audio")
async def analyze_audio(audio_bytes: bytes, filename: str = "audio.wav") -> dict:
    """
    Analyze speech prosody from audio using Hume Prosody model.

    Args:
        audio_bytes: Raw audio file bytes
        filename: Filename with extension (for format detection)

    Returns:
        Dict mapping emotion names to scores (0-1)

    Raises:
        HumeServiceError: If API key is missing or analysis fails
    """
    api_key = _get_api_key()
    if not api_key:
        raise HumeServiceError("HUME_API_KEY not configured")

    # Write bytes to temp file with proper extension
    suffix = os.path.splitext(filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        client = AsyncHumeClient(api_key=api_key)

        # Configure prosody model as JSON
        config = {
            "models": {
                "prosody": {
                    "granularity": "utterance"
                }
            }
        }

        # Open file in binary mode and start job
        with open(tmp_path, "rb") as file_obj:
            job_id = await client.expression_measurement.batch.start_inference_job_from_local_file(
                file=[file_obj],
                json=config,
            )

        # Wait for completion
        await _wait_for_job(client, job_id)

        # Get predictions
        predictions = await client.expression_measurement.batch.get_job_predictions(id=job_id)

        # Extract emotions
        emotions = _extract_emotions_from_predictions(predictions, "prosody")

        return emotions

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@track(name="HumeService.extract_stress_score")
def extract_stress_score(emotions: dict) -> float:
    """
    Convert emotions to a 0-1 stress score using PRD formula.

    Formula:
        stress = fear*0.3 + anxiety*0.3 + anger*0.15 + sadness*0.1 + (1-joy)*0.15

    Args:
        emotions: Dict mapping emotion names to scores (0-1)

    Returns:
        Stress score between 0 and 1
    """
    # Hume emotion names (capitalized)
    fear = emotions.get("Fear", 0.0)
    anxiety = emotions.get("Anxiety", 0.0)
    anger = emotions.get("Anger", 0.0)
    sadness = emotions.get("Sadness", 0.0)
    joy = emotions.get("Joy", 0.0)

    stress = (
        fear * 0.3 +
        anxiety * 0.3 +
        anger * 0.15 +
        sadness * 0.1 +
        (1 - joy) * 0.15
    )

    # Clamp to 0-1 range
    return min(1.0, max(0.0, stress))


def get_stress_level(stress_score: float) -> str:
    """
    Convert stress score to level label.

    Args:
        stress_score: Score between 0 and 1

    Returns:
        "LOW", "MEDIUM", "HIGH", or "CRITICAL"
    """
    if stress_score < 0.3:
        return "LOW"
    elif stress_score < 0.6:
        return "MEDIUM"
    elif stress_score < 0.8:
        return "HIGH"
    else:
        return "CRITICAL"

"""
Emotion API endpoints for video and audio analysis.
"""
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.config import get_db
from models.database import Drive, DriveEvent
from models.enums import EventType
from agents.emotion_agent import EmotionAgent


router = APIRouter(prefix="/api/emotion", tags=["emotion"])

# Create agent instance
emotion_agent = EmotionAgent()


@router.post("/video")
async def analyze_video(
    file: UploadFile = File(..., description="Video file for emotion analysis"),
    context: str = Form("PRE_DRIVE", description="PRE_DRIVE or POST_DRIVE"),
):
    """
    Analyze video for emotions (pre/post drive check-in).

    Returns stress score, stress level, emotions, detected concerns, and recommendations.
    """
    # Validate context
    if context not in ("PRE_DRIVE", "POST_DRIVE"):
        raise HTTPException(
            status_code=422,
            detail="context must be 'PRE_DRIVE' or 'POST_DRIVE'"
        )

    # Read video bytes
    video_bytes = await file.read()
    if not video_bytes:
        raise HTTPException(status_code=400, detail="Empty video file")

    # Process with emotion agent
    try:
        result = await emotion_agent.process_video_checkin(
            video_bytes=video_bytes,
            filename=file.filename or "video.mp4",
            context=context,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio")
async def analyze_audio(
    file: UploadFile = File(..., description="Audio file for emotion analysis"),
    drive_id: Optional[str] = Form(default=None, description="Drive ID to record event"),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze audio for emotions (during drive monitoring).

    Returns stress score, stress level, and intervention decision.

    If drive_id is provided, records a STRESS_DETECTED event on the drive.
    """
    # Read audio bytes
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Process with emotion agent
    try:
        result = await emotion_agent.process_audio_during_drive(
            audio_bytes=audio_bytes,
            filename=file.filename or "audio.wav",
        )

        # If drive_id provided, record STRESS_DETECTED event
        if drive_id:
            drive_result = await db.execute(
                select(Drive).where(Drive.id == drive_id)
            )
            drive = drive_result.scalar_one_or_none()

            # Only record if drive exists and is active (not completed)
            if drive and not drive.completed_at:
                event = DriveEvent(
                    drive_id=drive_id,
                    event_type=EventType.STRESS_DETECTED.value,
                    stress_level=result["stress_score"],
                    details={
                        "stress_level_category": result["stress_level"],
                        "trigger_intervention": result["trigger_intervention"],
                        "intervention_type": result.get("intervention_type"),
                    },
                )
                db.add(event)
                await db.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
Debrief API for processing post-drive debriefs.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database.config import get_db
from models.database import User, Drive, DriveEvent
from models.schemas import DebriefRequest, DebriefResponse, EmotionalJourney
from agents.debrief_agent import DebriefAgent


router = APIRouter(prefix="/api/debrief", tags=["debrief"])

# Agent singleton
_debrief_agent = DebriefAgent()


async def _get_user_with_data(user_id: str, db: AsyncSession) -> Optional[User]:
    """Fetch user with triggers and preferences."""
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.stress_triggers),
            selectinload(User.calming_preferences),
        )
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def _get_drive_with_events(drive_id: str, db: AsyncSession) -> Optional[Drive]:
    """Fetch drive with events."""
    result = await db.execute(
        select(Drive)
        .options(selectinload(Drive.events))
        .where(Drive.id == drive_id)
    )
    return result.scalar_one_or_none()


def _format_triggers(user: User) -> list[dict]:
    """Format user triggers for agent."""
    return [
        {
            "trigger": trigger.trigger,
            "severity": trigger.severity,
        }
        for trigger in user.stress_triggers
    ]


def _format_preferences(user: User) -> list[dict]:
    """Format user preferences for agent."""
    return [
        {
            "preference": pref.preference,
            "effectiveness": pref.effectiveness,
        }
        for pref in user.calming_preferences
    ]


@router.post("/process", response_model=DebriefResponse)
async def process_debrief(
    request: DebriefRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Process post-drive debrief.

    Analyzes the drive events, calculates emotional journey, extracts learnings,
    suggests profile updates, and generates an encouraging summary.

    Request:
    - user_id: User's ID
    - drive_id: Drive's ID
    - post_drive_stress_score: Optional stress score from post-drive check-in (0-1)

    Response includes:
    - emotional_journey: Pre/post stress comparison
    - learnings: Key insights from the drive
    - profile_updates: Suggested updates to user profile
    - encouragement: Personalized encouraging message
    """
    # Validate user exists
    user = await _get_user_with_data(request.user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate and fetch drive
    drive = await _get_drive_with_events(request.drive_id, db)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Verify drive belongs to user
    if drive.user_id != request.user_id:
        raise HTTPException(status_code=403, detail="Drive does not belong to this user")

    # Determine post-drive stress score
    post_stress = request.post_drive_stress_score
    if post_stress is None:
        # Default to medium if not provided
        post_stress = 0.4

    # Format user data for agent
    user_triggers = _format_triggers(user)
    user_preferences = _format_preferences(user)

    # Process debrief
    result = await _debrief_agent.process_debrief(
        pre_drive_stress=drive.pre_drive_stress,
        post_drive_stress=post_stress,
        drive_events=drive.events,
        user_triggers=user_triggers,
        user_preferences=user_preferences,
    )

    # Update drive record
    drive.post_drive_stress = post_stress
    # Only set completed_at if not already set (might have been ended via voice command or /end endpoint)
    if not drive.completed_at:
        drive.completed_at = datetime.utcnow()
    await db.commit()

    # Build response
    emotional_journey = result["emotional_journey"]

    return DebriefResponse(
        emotional_journey=EmotionalJourney(
            pre_drive=emotional_journey["pre_drive"],
            post_drive=emotional_journey["post_drive"],
            improvement=emotional_journey["improvement"],
        ),
        learnings=result["learnings"],
        profile_updates=result["profile_updates"],
        encouragement=result["encouragement"],
    )

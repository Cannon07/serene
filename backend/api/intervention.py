"""
Intervention API endpoints for calming interventions.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database.config import get_db
from models.database import User, UserCalmingPreference, Drive, DriveEvent
from models.enums import EventType
from models.schemas import InterventionRequest, InterventionResponse, RerouteOptionBrief
from agents.calm_agent import CalmAgent
from agents.reroute_agent import RerouteAgent
from agents.emotion_agent import InterventionType


router = APIRouter(prefix="/api/intervention", tags=["intervention"])

# Agent singletons
_calm_agent = CalmAgent()
_reroute_agent = RerouteAgent()


def _determine_intervention_type(stress_score: float) -> str:
    """Determine intervention type based on stress score."""
    if stress_score >= 0.8:
        return InterventionType.PULL_OVER.value
    elif stress_score >= 0.6:
        return InterventionType.BREATHING_EXERCISE.value
    elif stress_score >= 0.3:
        return InterventionType.CALMING_MESSAGE.value
    else:
        return InterventionType.NONE.value


async def _get_user_preferences(
    user_id: str,
    db: AsyncSession
) -> list[dict]:
    """Fetch user calming preferences from database."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.calming_preferences))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        return []

    return [
        {
            # Handle both enum and string values
            "preference": pref.preference.value if hasattr(pref.preference, 'value') else pref.preference,
            "effectiveness": pref.effectiveness,
        }
        for pref in user.calming_preferences
    ]


async def _get_user_triggers(
    user_id: str,
    db: AsyncSession
) -> list[dict]:
    """Fetch user stress triggers from database."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.stress_triggers))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        return []

    return [
        {
            # Handle both enum and string values
            "trigger": trigger.trigger.value if hasattr(trigger.trigger, 'value') else trigger.trigger,
            "severity": trigger.severity,
        }
        for trigger in user.stress_triggers
    ]


async def _check_reroute_option(
    current_location: Optional[dict],
    destination: Optional[str],
    current_calm_score: Optional[int],
    user_triggers: list[dict],
    stress_score: float,
) -> Optional[RerouteOptionBrief]:
    """Check if a calmer reroute is available."""
    # Need location and destination to check reroute
    if not current_location or not destination:
        return None

    # Only check reroute for high stress
    if stress_score < 0.6:
        return None

    try:
        result = await _reroute_agent.find_calmer_route(
            current_location=current_location,
            destination=destination,
            current_calm_score=current_calm_score,
            user_triggers=user_triggers,
        )

        if result.get("reroute_available") and result.get("suggested_route"):
            sr = result["suggested_route"]
            return RerouteOptionBrief(
                current_route_calm_score=current_calm_score or result.get("current_route", {}).get("calm_score", 0),
                alternative_route_name=sr.get("name", "Calmer Route"),
                alternative_route_calm_score=sr.get("calm_score", 0),
                extra_time_minutes=sr.get("extra_time_minutes", 0),
                maps_url=sr.get("maps_url", ""),
            )
    except Exception as e:
        print(f"Error checking reroute: {e}")

    return None


@router.post("/decide", response_model=InterventionResponse)
async def decide_intervention(
    request: InterventionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Decide and generate appropriate intervention based on stress level.

    The intervention type is determined by the stress score:
    - < 0.3: No intervention needed
    - 0.3 - 0.6: Calming message
    - 0.6 - 0.8: Breathing exercise
    - > 0.8: Pull over suggestion with grounding

    User preferences are used to personalize the intervention.
    If current_location and destination are provided, also checks for calmer reroute options.
    """
    # Validate user exists
    user_result = await db.execute(select(User).where(User.id == request.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate drive ownership if drive_id provided
    drive = None
    if request.drive_id:
        drive_result = await db.execute(
            select(Drive).where(Drive.id == request.drive_id)
        )
        drive = drive_result.scalar_one_or_none()
        if not drive:
            raise HTTPException(status_code=404, detail="Drive not found")
        if drive.user_id != request.user_id:
            raise HTTPException(status_code=403, detail="Drive does not belong to this user")
        if drive.completed_at:
            raise HTTPException(status_code=400, detail="Cannot record events on a completed drive")

    # Determine intervention type
    intervention_type = _determine_intervention_type(request.stress_score)

    if intervention_type == InterventionType.NONE.value:
        return InterventionResponse(
            intervention_type=intervention_type,
            stress_level=request.stress_level,
            stress_score=request.stress_score,
            message="You're doing great! Keep driving calmly.",
            reroute_available=False,
            sources=[],
        )

    # Get user preferences and triggers for personalization
    user_preferences = await _get_user_preferences(request.user_id, db)
    user_triggers = await _get_user_triggers(request.user_id, db)

    # Check for reroute option if location and destination provided
    reroute_option = None
    if request.current_location and request.destination:
        reroute_option = await _check_reroute_option(
            current_location=request.current_location,
            destination=request.destination,
            current_calm_score=request.current_route_calm_score,
            user_triggers=user_triggers,
            stress_score=request.stress_score,
        )

    # Generate intervention using CalmAgent
    try:
        result = await _calm_agent.generate_intervention(
            intervention_type=intervention_type,
            stress_level=request.stress_level,
            stress_score=request.stress_score,
            user_preferences=user_preferences,
            context=request.context,
        )

        # If drive_id provided, record INTERVENTION event and increment counter
        if drive:
            event = DriveEvent(
                drive_id=request.drive_id,
                event_type=EventType.INTERVENTION.value,
                stress_level=request.stress_score,
                details={
                    "intervention_type": result["intervention_type"],
                    "stress_level_category": result["stress_level"],
                    "reroute_offered": reroute_option is not None,
                },
            )
            db.add(event)

            # Increment interventions_triggered counter
            drive.interventions_triggered += 1
            await db.commit()

        return InterventionResponse(
            intervention_type=result["intervention_type"],
            stress_level=result["stress_level"],
            stress_score=result["stress_score"],
            message=result.get("message", "I'm here to help."),
            breathing_content=result.get("breathing_content"),
            grounding_content=result.get("grounding_content"),
            pull_over_guidance=result.get("pull_over_guidance"),
            reroute_available=reroute_option is not None,
            reroute_option=reroute_option,
            sources=result.get("sources", []),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating intervention: {str(e)}"
        )


@router.post("/calming-message")
async def get_calming_message(
    request: InterventionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a personalized calming message.

    Use this endpoint when you specifically want a calming message
    regardless of stress level.
    """
    user_preferences = await _get_user_preferences(request.user_id, db)

    try:
        result = await _calm_agent.generate_calming_message(
            stress_level=request.stress_level,
            stress_score=request.stress_score,
            user_preferences=user_preferences,
            context=request.context,
        )

        return {
            "message": result["message"],
            "sources": result["sources"],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating calming message: {str(e)}"
        )


@router.post("/breathing-exercise")
async def get_breathing_exercise(
    request: InterventionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a personalized breathing exercise.

    Use this endpoint when you specifically want a breathing exercise
    regardless of stress level.
    """
    user_preferences = await _get_user_preferences(request.user_id, db)

    try:
        result = await _calm_agent.get_breathing_exercise(
            stress_level=request.stress_level,
            user_preferences=user_preferences,
        )

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating breathing exercise: {str(e)}"
        )


@router.post("/grounding-exercise")
async def get_grounding_exercise(
    request: InterventionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a personalized grounding exercise.

    Use this endpoint when you specifically want a grounding exercise
    (typically for HIGH or CRITICAL stress levels).
    """
    user_preferences = await _get_user_preferences(request.user_id, db)

    try:
        result = await _calm_agent.get_grounding_exercise(
            stress_level=request.stress_level,
            stress_score=request.stress_score,
            user_preferences=user_preferences,
        )

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating grounding exercise: {str(e)}"
        )

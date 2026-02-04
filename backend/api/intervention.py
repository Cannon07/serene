"""
Intervention API endpoints for calming interventions.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database.config import get_db
from models.database import User, UserCalmingPreference
from models.schemas import InterventionRequest, InterventionResponse
from agents.calm_agent import CalmAgent
from agents.emotion_agent import InterventionType


router = APIRouter(prefix="/api/intervention", tags=["intervention"])

# Agent singleton
_calm_agent = CalmAgent()


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
            "preference": pref.preference.value,
            "effectiveness": pref.effectiveness,
        }
        for pref in user.calming_preferences
    ]


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
    """
    # Determine intervention type
    intervention_type = _determine_intervention_type(request.stress_score)

    if intervention_type == InterventionType.NONE.value:
        return InterventionResponse(
            intervention_type=intervention_type,
            stress_level=request.stress_level,
            stress_score=request.stress_score,
            message="You're doing great! Keep driving calmly.",
            sources=[],
        )

    # Get user preferences for personalization
    user_preferences = await _get_user_preferences(request.user_id, db)

    # Generate intervention using CalmAgent
    try:
        result = await _calm_agent.generate_intervention(
            intervention_type=intervention_type,
            stress_level=request.stress_level,
            stress_score=request.stress_score,
            user_preferences=user_preferences,
            context=request.context,
        )

        return InterventionResponse(
            intervention_type=result["intervention_type"],
            stress_level=result["stress_level"],
            stress_score=result["stress_score"],
            message=result.get("message", "I'm here to help."),
            breathing_content=result.get("breathing_content"),
            grounding_content=result.get("grounding_content"),
            pull_over_guidance=result.get("pull_over_guidance"),
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

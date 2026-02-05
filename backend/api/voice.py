"""
Voice Command API for processing voice commands during drives.
"""
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database.config import get_db
from models.database import User, Drive
from models.schemas import VoiceCommandRequest, VoiceCommandResponse
from agents.calm_agent import CalmAgent
from agents.reroute_agent import RerouteAgent
from agents.emotion_agent import InterventionType


router = APIRouter(prefix="/api/voice", tags=["voice"])

# Agent singletons
_calm_agent = CalmAgent()
_reroute_agent = RerouteAgent()


# Command patterns for intent recognition
COMMAND_PATTERNS = {
    "STRESS_REPORT": [
        r"\b(i'?m|i am|feeling)\s*(stressed|anxious|nervous|scared|worried|panicking|panicked)\b",
        r"\b(i\s+)?need\s+help\b",
        r"\b(help\s+me|i'?m\s+not\s+ok(ay)?)\b",
        r"\bstress(ed)?\b",
        r"\banxi(ous|ety)\b",
        r"\bpanic(king)?\b",
    ],
    "REROUTE": [
        r"\b(find|get|show)\s*(me\s+)?(a\s+)?(calmer|calm|easier|better)\s+route\b",
        r"\breroute\b",
        r"\b(different|alternative|another)\s+route\b",
        r"\bchange\s+(the\s+)?route\b",
    ],
    "PULL_OVER": [
        r"\b(i\s+)?need\s+to\s+pull\s+over\b",
        r"\b(find|where)\s+(a\s+)?(safe\s+)?(spot|place)\s+(to\s+)?(stop|pull\s+over)\b",
        r"\bpull\s+over\b",
        r"\bstop\s+the\s+car\b",
        r"\bi\s+can'?t\s+(do\s+this|drive|continue)\b",
    ],
    "ETA_UPDATE": [
        r"\bhow\s+(much\s+)?long(er)?\b",
        r"\bwhen\s+(will\s+)?(we|i)\s+(get|arrive|be)\s+there\b",
        r"\beta\b",
        r"\btime\s+(left|remaining)\b",
        r"\bhow\s+far\b",
    ],
    "END_DRIVE": [
        r"\bend\s+(the\s+)?drive\b",
        r"\b(i'?m|we'?re)\s+(here|done|finished|arrived)\b",
        r"\bfinish(ed)?\s+(the\s+)?drive\b",
        r"\bstop\s+tracking\b",
    ],
}

# Speech responses for different scenarios
SPEECH_RESPONSES = {
    "STRESS_ACKNOWLEDGED": [
        "I hear you. Let's take a moment to breathe together.",
        "I'm here with you. Let's do a quick breathing exercise.",
        "I understand. Let me help you calm down.",
    ],
    "REROUTE_FOUND": "I found a calmer route for you. It's {improvement} points calmer and adds {extra_time} minutes. Would you like me to switch?",
    "REROUTE_NOT_FOUND": "I checked for calmer routes, but your current route is already the best option. You're doing great!",
    "PULL_OVER_GUIDANCE": "Let's find a safe place to stop. Signal right and look for a parking lot or wide shoulder. Turn on your hazards when you stop. I'm here with you.",
    "ETA_RESPONSE": "You're about {minutes} minutes away from your destination.",
    "END_DRIVE_CONFIRMED": "Great job completing your drive! Let me start your post-drive check-in.",
    "NOT_UNDERSTOOD": "I didn't quite catch that. You can say things like 'I'm stressed', 'find a calmer route', or 'how much longer'.",
    "LOCATION_NEEDED": "I need your current location to help with that. Please make sure location sharing is enabled.",
}


def _detect_command_type(text: str) -> tuple[str, float]:
    """
    Detect the command type from transcribed text using pattern matching.

    Args:
        text: Transcribed voice command

    Returns:
        Tuple of (command_type, confidence_score)
    """
    text_lower = text.lower().strip()

    for command_type, patterns in COMMAND_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return command_type, 0.9  # High confidence for pattern match

    return "UNKNOWN", 0.0


async def _validate_user(user_id: str, db: AsyncSession) -> bool:
    """Check if user exists in database."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none() is not None


async def _get_user_preferences(user_id: str, db: AsyncSession) -> list[dict]:
    """Fetch user calming preferences."""
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
            "preference": pref.preference.value if hasattr(pref.preference, 'value') else pref.preference,
            "effectiveness": pref.effectiveness,
        }
        for pref in user.calming_preferences
    ]


async def _get_user_triggers(user_id: str, db: AsyncSession) -> list[dict]:
    """Fetch user stress triggers."""
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
            "trigger": trigger.trigger.value if hasattr(trigger.trigger, 'value') else trigger.trigger,
            "severity": trigger.severity,
        }
        for trigger in user.stress_triggers
    ]


async def _handle_stress_report(
    request: VoiceCommandRequest,
    db: AsyncSession,
) -> VoiceCommandResponse:
    """Handle stress report command - trigger intervention."""
    user_preferences = await _get_user_preferences(request.user_id, db)

    # Generate intervention (assume HIGH stress since they're reporting it)
    try:
        intervention = await _calm_agent.generate_intervention(
            intervention_type=InterventionType.BREATHING_EXERCISE.value,
            stress_level="HIGH",
            stress_score=0.7,  # Assumed stress level
            user_preferences=user_preferences,
            context=request.context,
        )

        speech = SPEECH_RESPONSES["STRESS_ACKNOWLEDGED"][0]

        return VoiceCommandResponse(
            understood=True,
            command_type="STRESS_REPORT",
            action="TRIGGER_INTERVENTION",
            speech_response=speech,
            intervention=intervention,
        )
    except Exception as e:
        return VoiceCommandResponse(
            understood=True,
            command_type="STRESS_REPORT",
            action="TRIGGER_INTERVENTION",
            speech_response="I hear you. Let's breathe together. Breathe in slowly... hold... and breathe out.",
            intervention=None,
        )


async def _handle_reroute(
    request: VoiceCommandRequest,
    db: AsyncSession,
) -> VoiceCommandResponse:
    """Handle reroute command - find calmer route."""
    if not request.current_location or not request.destination:
        return VoiceCommandResponse(
            understood=True,
            command_type="REROUTE",
            action="NONE",
            speech_response=SPEECH_RESPONSES["LOCATION_NEEDED"],
        )

    user_triggers = await _get_user_triggers(request.user_id, db)

    try:
        result = await _reroute_agent.find_calmer_route(
            current_location=request.current_location,
            destination=request.destination,
            current_calm_score=request.current_route_calm_score,
            user_triggers=user_triggers,
        )

        if result.get("reroute_available") and result.get("suggested_route"):
            sr = result["suggested_route"]
            speech = SPEECH_RESPONSES["REROUTE_FOUND"].format(
                improvement=sr.get("calm_score_improvement", 0),
                extra_time=sr.get("extra_time_minutes", 0),
            )
            return VoiceCommandResponse(
                understood=True,
                command_type="REROUTE",
                action="FIND_ROUTE",
                speech_response=speech,
                reroute=result,
            )
        else:
            return VoiceCommandResponse(
                understood=True,
                command_type="REROUTE",
                action="NONE",
                speech_response=SPEECH_RESPONSES["REROUTE_NOT_FOUND"],
            )
    except Exception as e:
        return VoiceCommandResponse(
            understood=True,
            command_type="REROUTE",
            action="NONE",
            speech_response="I'm having trouble finding routes right now. Please try again in a moment.",
        )


async def _handle_pull_over(
    request: VoiceCommandRequest,
    db: AsyncSession,
) -> VoiceCommandResponse:
    """Handle pull over command - provide guidance and grounding."""
    user_preferences = await _get_user_preferences(request.user_id, db)

    # Generate grounding exercise for pull-over situation
    try:
        intervention = await _calm_agent.generate_intervention(
            intervention_type=InterventionType.PULL_OVER.value,
            stress_level="CRITICAL",
            stress_score=0.85,
            user_preferences=user_preferences,
            context="DURING_DRIVE",
        )

        return VoiceCommandResponse(
            understood=True,
            command_type="PULL_OVER",
            action="FIND_SAFE_SPOT",
            speech_response=SPEECH_RESPONSES["PULL_OVER_GUIDANCE"],
            intervention=intervention,
        )
    except Exception:
        return VoiceCommandResponse(
            understood=True,
            command_type="PULL_OVER",
            action="FIND_SAFE_SPOT",
            speech_response=SPEECH_RESPONSES["PULL_OVER_GUIDANCE"],
        )


async def _handle_eta_update(
    request: VoiceCommandRequest,
    db: AsyncSession,
) -> VoiceCommandResponse:
    """Handle ETA request - direct to navigation app."""
    return VoiceCommandResponse(
        understood=True,
        command_type="ETA_UPDATE",
        action="PROVIDE_ETA",
        speech_response="Please check your navigation app for the estimated arrival time.",
        eta_info=None,
    )


async def _handle_end_drive(
    request: VoiceCommandRequest,
    db: AsyncSession,
) -> VoiceCommandResponse:
    """Handle end drive command - initiate post-drive flow."""
    return VoiceCommandResponse(
        understood=True,
        command_type="END_DRIVE",
        action="START_DEBRIEF",
        speech_response=SPEECH_RESPONSES["END_DRIVE_CONFIRMED"],
    )


@router.post("/command", response_model=VoiceCommandResponse)
async def process_voice_command(
    request: VoiceCommandRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Process a voice command from the user.

    Accepts transcribed text (speech-to-text done client-side) and determines
    the appropriate action based on intent recognition.

    Supported commands:
    - "I'm stressed" / "I need help" → Trigger breathing intervention
    - "Find calmer route" / "Reroute" → Find alternative route
    - "I need to pull over" → Provide pull-over guidance
    - "How much longer" → ETA update
    - "End drive" → Start post-drive debrief
    """
    # Validate user exists
    user_exists = await _validate_user(request.user_id, db)
    if not user_exists:
        raise HTTPException(status_code=404, detail="User not found")

    # Detect command type
    command_type, confidence = _detect_command_type(request.transcribed_text)

    # Route to appropriate handler
    if command_type == "STRESS_REPORT":
        return await _handle_stress_report(request, db)

    elif command_type == "REROUTE":
        return await _handle_reroute(request, db)

    elif command_type == "PULL_OVER":
        return await _handle_pull_over(request, db)

    elif command_type == "ETA_UPDATE":
        return await _handle_eta_update(request, db)

    elif command_type == "END_DRIVE":
        return await _handle_end_drive(request, db)

    else:
        # Command not understood
        return VoiceCommandResponse(
            understood=False,
            command_type="UNKNOWN",
            action="NONE",
            speech_response=SPEECH_RESPONSES["NOT_UNDERSTOOD"],
        )

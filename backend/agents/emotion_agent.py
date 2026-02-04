"""
Emotion Agent for processing video/audio and determining intervention needs.
"""
from enum import Enum
from typing import Optional
from opik import track

from agents.base_agent import BaseAgent
from services.hume_service import (
    analyze_video,
    analyze_audio,
    extract_stress_score,
    get_stress_level,
)


class InterventionType(str, Enum):
    """Types of interventions that can be triggered."""
    NONE = "NONE"
    CALMING_MESSAGE = "CALMING_MESSAGE"
    BREATHING_EXERCISE = "BREATHING_EXERCISE"
    PULL_OVER = "PULL_OVER"


# Thresholds for detecting concerning emotions
CONCERN_THRESHOLDS = {
    "Fear": (0.4, "Elevated fear detected"),
    "Anxiety": (0.4, "Signs of anxiety detected"),
    "Anger": (0.3, "Signs of frustration detected"),
    "Distress": (0.4, "Distress indicators present"),
    "Sadness": (0.4, "Low mood detected"),
    "Tension": (0.4, "Facial tension elevated"),
    "Nervousness": (0.35, "Nervousness detected"),
}

# Recommendations based on context
PRE_DRIVE_RECOMMENDATIONS = {
    "LOW": [
        "You seem calm and ready to drive!",
    ],
    "MEDIUM": [
        "Consider the calmer route option",
        "Try the breathing exercise before driving",
    ],
    "HIGH": [
        "Take a few minutes to relax before driving",
        "Try the 4-7-8 breathing exercise",
        "Consider the calmer route option",
    ],
    "CRITICAL": [
        "Consider delaying your drive if possible",
        "Take 5-10 minutes for deep breathing",
        "Talk to someone about how you're feeling",
    ],
}

POST_DRIVE_RECOMMENDATIONS = {
    "LOW": [
        "Great job completing the drive!",
        "Your stress levels were well managed",
    ],
    "MEDIUM": [
        "You handled the drive well",
        "Consider journaling about what went well",
    ],
    "HIGH": [
        "The drive is complete - take a moment to decompress",
        "Consider what triggered stress and how to prepare next time",
    ],
    "CRITICAL": [
        "Take some time to relax and recover",
        "Consider talking to someone about your experience",
        "Review the route for potential improvements",
    ],
}


class EmotionAgent(BaseAgent):
    """Agent for emotion analysis and intervention decisions."""

    def __init__(self):
        super().__init__("EmotionAgent")

    @track(name="EmotionAgent.process_video_checkin")
    async def process_video_checkin(
        self,
        video_bytes: bytes,
        filename: str,
        context: str = "PRE_DRIVE"
    ) -> dict:
        """
        Process video for pre/post drive check-ins.

        Args:
            video_bytes: Raw video file bytes
            filename: Filename with extension
            context: "PRE_DRIVE" or "POST_DRIVE"

        Returns:
            Dict with stress_score, stress_level, emotions, detected_concerns, recommendations
        """
        # Analyze video for emotions
        emotions = await analyze_video(video_bytes, filename)

        # Calculate stress score and level
        stress_score = extract_stress_score(emotions)
        stress_level = get_stress_level(stress_score)

        # Detect concerns from emotions
        detected_concerns = self.detect_concerns(emotions)

        # Generate recommendations based on context and stress level
        recommendations = self.generate_recommendations(stress_level, context)

        # Get key emotions for response (subset that's most relevant)
        key_emotions = self._extract_key_emotions(emotions)

        return {
            "stress_score": round(stress_score, 2),
            "stress_level": stress_level,
            "emotions": key_emotions,
            "detected_concerns": detected_concerns,
            "recommendations": recommendations,
        }

    @track(name="EmotionAgent.process_audio_during_drive")
    async def process_audio_during_drive(
        self,
        audio_bytes: bytes,
        filename: str
    ) -> dict:
        """
        Process audio for during-drive monitoring.

        Args:
            audio_bytes: Raw audio file bytes
            filename: Filename with extension

        Returns:
            Dict with stress_score, stress_level, trigger_intervention, intervention_type
        """
        # Analyze audio for emotions
        emotions = await analyze_audio(audio_bytes, filename)

        # Calculate stress score and level
        stress_score = extract_stress_score(emotions)
        stress_level = get_stress_level(stress_score)

        # Determine if intervention is needed
        trigger_intervention, intervention_type = self.should_trigger_intervention(stress_score)

        return {
            "stress_score": round(stress_score, 2),
            "stress_level": stress_level,
            "trigger_intervention": trigger_intervention,
            "intervention_type": intervention_type,
        }

    @track(name="EmotionAgent.should_trigger_intervention")
    def should_trigger_intervention(self, stress_score: float) -> tuple[bool, str]:
        """
        Determine if intervention should be triggered based on stress score.

        Thresholds (from PRD):
            < 0.3: No intervention (LOW)
            0.3 - 0.6: Optional calming message (MEDIUM)
            > 0.6: Trigger breathing exercise (HIGH)
            > 0.8: Suggest pulling over (CRITICAL)

        Args:
            stress_score: Score between 0 and 1

        Returns:
            Tuple of (should_trigger: bool, intervention_type: str)
        """
        if stress_score >= 0.8:
            return True, InterventionType.PULL_OVER.value
        elif stress_score >= 0.6:
            return True, InterventionType.BREATHING_EXERCISE.value
        elif stress_score >= 0.3:
            return True, InterventionType.CALMING_MESSAGE.value
        else:
            return False, InterventionType.NONE.value

    def detect_concerns(self, emotions: dict) -> list[str]:
        """
        Detect concerning patterns in emotions.

        Args:
            emotions: Dict mapping emotion names to scores

        Returns:
            List of concern descriptions
        """
        concerns = []

        for emotion_name, (threshold, message) in CONCERN_THRESHOLDS.items():
            score = emotions.get(emotion_name, 0.0)
            if score >= threshold:
                concerns.append(message)

        # Check for combined patterns
        fear = emotions.get("Fear", 0.0)
        anxiety = emotions.get("Anxiety", 0.0)
        if fear >= 0.3 and anxiety >= 0.3:
            if "Signs of anxiety detected" not in concerns:
                concerns.append("Combined fear and anxiety indicators")

        # Check voice-specific concerns (if prosody was used)
        tremor = emotions.get("Awkwardness", 0.0)  # Proxy for voice tremor
        if tremor >= 0.4:
            concerns.append("Voice tremor detected")

        return concerns

    def generate_recommendations(self, stress_level: str, context: str) -> list[str]:
        """
        Generate recommendations based on stress level and context.

        Args:
            stress_level: "LOW", "MEDIUM", "HIGH", or "CRITICAL"
            context: "PRE_DRIVE" or "POST_DRIVE"

        Returns:
            List of recommendation strings
        """
        if context == "POST_DRIVE":
            recommendations = POST_DRIVE_RECOMMENDATIONS.get(stress_level, [])
        else:
            recommendations = PRE_DRIVE_RECOMMENDATIONS.get(stress_level, [])

        return list(recommendations)

    def _extract_key_emotions(self, emotions: dict) -> dict:
        """
        Extract key emotions for the response.

        Args:
            emotions: Full dict of all emotions

        Returns:
            Dict with subset of key emotions
        """
        key_emotion_names = [
            "Fear", "Anxiety", "Anger", "Joy", "Sadness",
            "Calmness", "Distress", "Concentration"
        ]

        key_emotions = {}
        for name in key_emotion_names:
            if name in emotions:
                key_emotions[name.lower()] = round(emotions[name], 3)

        return key_emotions

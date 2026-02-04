"""
Calm Agent for generating personalized calming interventions using RAG.
"""
import json
import re
from typing import Optional

from opik import track
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from agents.base_agent import BaseAgent
from services.rag_service import RAGService
from config.rag_config import get_openai_api_key, is_rag_configured


# Prompt templates for different intervention types
CALMING_MESSAGE_TEMPLATE = """You are Serene, a compassionate AI companion helping someone with driving anxiety.
The driver is currently experiencing {stress_level} stress (score: {stress_score}).

Their preferred calming methods are: {preferences}

Context: {context}

Relevant calming techniques from our knowledge base:
{retrieved_content}

Generate a brief, warm, calming message for them. Keep it:
- Short (2-3 sentences)
- Warm and supportive in tone
- Focused on the present moment
- Encouraging without being dismissive of their feelings

Message:"""

BREATHING_EXERCISE_TEMPLATE = """You are Serene, a compassionate AI companion helping someone with driving anxiety.
The driver needs a breathing exercise. Their stress level is {stress_level}.

Their preferred calming methods are: {preferences}
Available time: approximately {available_time} seconds

Relevant breathing techniques from our knowledge base:
{retrieved_content}

Select the most appropriate breathing exercise and provide:
1. A brief introduction (1 sentence)
2. The exercise name
3. Clear, numbered instructions
4. An audio script for guiding them (safe for driving)

Respond in this JSON format:
{{
  "intro": "...",
  "name": "...",
  "duration_seconds": ...,
  "instructions": ["step 1", "step 2", ...],
  "audio_script": "..."
}}"""

GROUNDING_EXERCISE_TEMPLATE = """You are Serene, a compassionate AI companion helping someone with driving anxiety.
The driver needs grounding - they may be experiencing panic or dissociation.
Stress level: {stress_level} (score: {stress_score})

Their preferred calming methods are: {preferences}

Relevant grounding techniques from our knowledge base:
{retrieved_content}

Provide a grounding exercise that:
1. Is safe to do while driving (eyes on road)
2. Uses their senses to return to the present
3. Is quick and effective

Respond in this JSON format:
{{
  "intro": "...",
  "name": "...",
  "instructions": ["step 1", "step 2", ...],
  "audio_script": "..."
}}"""


class CalmAgent(BaseAgent):
    """Agent for generating personalized calming interventions using RAG."""

    def __init__(self):
        super().__init__("CalmAgent")
        self.rag_service = RAGService.get_instance()
        self._llm_mini: Optional[ChatOpenAI] = None
        self._llm_full: Optional[ChatOpenAI] = None
        self._initialized = False

    async def _ensure_initialized(self) -> bool:
        """Ensure agent is initialized with LLMs and RAG."""
        if self._initialized:
            return True

        if not is_rag_configured():
            print("Warning: CalmAgent requires OPENAI_API_KEY")
            return False

        api_key = get_openai_api_key()

        try:
            self._llm_mini = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.7,
                openai_api_key=api_key,
            )
            self._llm_full = ChatOpenAI(
                model="gpt-4o",
                temperature=0.7,
                openai_api_key=api_key,
            )

            # Initialize RAG service
            await self.rag_service.initialize()

            self._initialized = True
            return True
        except Exception as e:
            print(f"Warning: CalmAgent initialization failed: {e}")
            return False

    def _get_fallback_response(self, intervention_type: str, stress_level: str) -> dict:
        """Return fallback responses when LLM is unavailable."""
        fallback_messages = {
            "LOW": "You're doing well. Keep up the calm driving!",
            "MEDIUM": "I'm here with you. Take a slow, deep breath. You've got this.",
            "HIGH": "Let's breathe together. Inhale slowly... hold... and exhale. You're safe.",
            "CRITICAL": "Your safety comes first. Please find a safe place to pull over when you can.",
        }

        fallback_breathing = {
            "name": "4-7-8 Breathing",
            "duration_seconds": 120,
            "instructions": [
                "Breathe in through your nose for 4 seconds",
                "Hold your breath for 7 seconds",
                "Exhale through your mouth for 8 seconds",
                "Repeat 3-4 times"
            ],
            "audio_script": "Breathe in... 2... 3... 4... Hold... 2... 3... 4... 5... 6... 7... Out... 2... 3... 4... 5... 6... 7... 8..."
        }

        fallback_grounding = {
            "name": "5-4-3-2-1 Grounding",
            "instructions": [
                "Name 5 things you can see",
                "Name 4 things you can feel",
                "Name 3 things you can hear",
                "Name 2 things you can smell",
                "Name 1 thing you can taste"
            ],
            "audio_script": "Let's ground yourself. Name 5 things you can see... 4 things you can feel... 3 things you can hear..."
        }

        result = {
            "intervention_type": intervention_type,
            "stress_level": stress_level,
            "message": fallback_messages.get(stress_level, fallback_messages["MEDIUM"]),
            "sources": ["fallback"],
        }

        if intervention_type == "BREATHING_EXERCISE":
            result["breathing_content"] = fallback_breathing
        elif intervention_type == "PULL_OVER":
            result["grounding_content"] = fallback_grounding
            result["pull_over_guidance"] = [
                "Signal and move to the right lane",
                "Look for a safe spot - parking lot, rest area, or wide shoulder",
                "Turn on your hazard lights",
                "Put the car in park and take your time",
            ]

        return result

    def _select_llm(self, stress_level: str) -> ChatOpenAI:
        """Select LLM based on stress severity."""
        if stress_level in ("HIGH", "CRITICAL"):
            return self._llm_full
        return self._llm_mini

    def _format_preferences(self, preferences: list[dict]) -> str:
        """Format user preferences for prompt."""
        if not preferences:
            return "No specific preferences"

        formatted = []
        for pref in preferences:
            name = pref.get("preference", "Unknown")
            effectiveness = pref.get("effectiveness", 3)
            formatted.append(f"{name} (effectiveness: {effectiveness}/5)")

        return ", ".join(formatted)

    def _format_retrieved_content(self, documents: list) -> str:
        """Format retrieved documents for prompt."""
        if not documents:
            return "No specific techniques found."

        content_parts = []
        for doc in documents:
            title = doc.metadata.get("title", "Technique")
            content_parts.append(f"### {title}\n{doc.page_content[:500]}...")

        return "\n\n".join(content_parts)

    def _parse_json_response(self, content: str, fallback: dict) -> dict:
        """Parse JSON from LLM response, stripping markdown code blocks if present."""
        # Remove markdown code blocks if present
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if json_match:
            content = json_match.group(1)

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return fallback

    @track(name="CalmAgent.generate_calming_message")
    async def generate_calming_message(
        self,
        stress_level: str,
        stress_score: float,
        user_preferences: list[dict],
        context: Optional[str] = None,
    ) -> dict:
        """
        Generate a personalized calming message.

        Args:
            stress_level: LOW, MEDIUM, HIGH, or CRITICAL
            stress_score: 0-1 stress score
            user_preferences: List of user calming preference dicts
            context: Optional context about the situation

        Returns:
            Dict with message and sources
        """
        await self._ensure_initialized()

        # Retrieve relevant content
        query = f"calming message for {stress_level} stress driving anxiety"
        documents = await self.rag_service.retrieve(query, k=3)

        # Build prompt
        prompt = ChatPromptTemplate.from_template(CALMING_MESSAGE_TEMPLATE)
        llm = self._select_llm(stress_level)

        # Generate response
        chain = prompt | llm
        response = await chain.ainvoke({
            "stress_level": stress_level,
            "stress_score": stress_score,
            "preferences": self._format_preferences(user_preferences),
            "context": context or "During a drive",
            "retrieved_content": self._format_retrieved_content(documents),
        })

        return {
            "message": response.content,
            "sources": [doc.metadata.get("id", "unknown") for doc in documents],
        }

    @track(name="CalmAgent.get_breathing_exercise")
    async def get_breathing_exercise(
        self,
        stress_level: str,
        user_preferences: list[dict],
        available_time_seconds: int = 120,
    ) -> dict:
        """
        Get appropriate breathing exercise with guidance.

        Args:
            stress_level: LOW, MEDIUM, HIGH, or CRITICAL
            user_preferences: List of user calming preference dicts
            available_time_seconds: How long they have for the exercise

        Returns:
            Dict with exercise details and audio script
        """
        await self._ensure_initialized()

        # Retrieve breathing techniques
        query = f"breathing exercise for {stress_level} driving anxiety quick safe"
        documents = await self.rag_service.retrieve(
            query,
            k=3,
            filter_metadata={"category": "breathing_techniques"},
        )

        # Build prompt
        prompt = ChatPromptTemplate.from_template(BREATHING_EXERCISE_TEMPLATE)
        llm = self._select_llm(stress_level)

        # Generate response
        chain = prompt | llm
        response = await chain.ainvoke({
            "stress_level": stress_level,
            "preferences": self._format_preferences(user_preferences),
            "available_time": available_time_seconds,
            "retrieved_content": self._format_retrieved_content(documents),
        })

        # Parse JSON response
        exercise_data = self._parse_json_response(response.content, {
            "intro": "Let's try a breathing exercise.",
            "name": "4-7-8 Breathing",
            "duration_seconds": 120,
            "instructions": [
                "Breathe in for 4 seconds",
                "Hold for 7 seconds",
                "Breathe out for 8 seconds",
                "Repeat 3 times"
            ],
            "audio_script": response.content,
        })

        exercise_data["sources"] = [doc.metadata.get("id", "unknown") for doc in documents]
        return exercise_data

    @track(name="CalmAgent.get_grounding_exercise")
    async def get_grounding_exercise(
        self,
        stress_level: str,
        stress_score: float,
        user_preferences: list[dict],
    ) -> dict:
        """
        Get grounding exercise for severe anxiety.

        Args:
            stress_level: HIGH or CRITICAL typically
            stress_score: 0-1 stress score
            user_preferences: List of user calming preference dicts

        Returns:
            Dict with grounding exercise details
        """
        await self._ensure_initialized()

        # Retrieve grounding techniques
        query = f"grounding exercise for panic driving anxiety sensory"
        documents = await self.rag_service.retrieve(
            query,
            k=3,
            filter_metadata={"category": "grounding_exercises"},
        )

        # Build prompt
        prompt = ChatPromptTemplate.from_template(GROUNDING_EXERCISE_TEMPLATE)
        llm = self._select_llm(stress_level)

        # Generate response
        chain = prompt | llm
        response = await chain.ainvoke({
            "stress_level": stress_level,
            "stress_score": stress_score,
            "preferences": self._format_preferences(user_preferences),
            "retrieved_content": self._format_retrieved_content(documents),
        })

        # Parse JSON response
        exercise_data = self._parse_json_response(response.content, {
            "intro": "Let's ground you in the present moment.",
            "name": "5-4-3-2-1 Grounding",
            "instructions": [
                "Name 5 things you can see",
                "Name 4 things you can feel",
                "Name 3 things you can hear",
                "Name 2 things you can smell",
                "Name 1 thing you can taste"
            ],
            "audio_script": response.content,
        })

        exercise_data["sources"] = [doc.metadata.get("id", "unknown") for doc in documents]
        return exercise_data

    @track(name="CalmAgent.generate_intervention")
    async def generate_intervention(
        self,
        intervention_type: str,
        stress_level: str,
        stress_score: float,
        user_preferences: list[dict],
        context: Optional[str] = None,
    ) -> dict:
        """
        Main entry point - generate appropriate intervention.

        Args:
            intervention_type: CALMING_MESSAGE, BREATHING_EXERCISE, or PULL_OVER
            stress_level: LOW, MEDIUM, HIGH, or CRITICAL
            stress_score: 0-1 stress score
            user_preferences: List of user calming preference dicts
            context: Optional context about the situation

        Returns:
            Dict with intervention details
        """
        initialized = await self._ensure_initialized()

        # Use fallback if LLM/RAG not available
        if not initialized:
            fallback = self._get_fallback_response(intervention_type, stress_level)
            fallback["stress_score"] = stress_score
            return fallback

        result = {
            "intervention_type": intervention_type,
            "stress_level": stress_level,
            "stress_score": stress_score,
        }

        if intervention_type == "CALMING_MESSAGE":
            message_result = await self.generate_calming_message(
                stress_level, stress_score, user_preferences, context
            )
            result["message"] = message_result["message"]
            result["sources"] = message_result["sources"]

        elif intervention_type == "BREATHING_EXERCISE":
            breathing_result = await self.get_breathing_exercise(
                stress_level, user_preferences
            )
            result["message"] = breathing_result.get("intro", "Let's breathe together.")
            result["breathing_content"] = {
                "name": breathing_result.get("name", "Breathing Exercise"),
                "duration_seconds": breathing_result.get("duration_seconds", 120),
                "instructions": breathing_result.get("instructions", []),
                "audio_script": breathing_result.get("audio_script"),
            }
            result["sources"] = breathing_result.get("sources", [])

        elif intervention_type == "PULL_OVER":
            # For critical stress, provide grounding + pull over guidance
            grounding_result = await self.get_grounding_exercise(
                stress_level, stress_score, user_preferences
            )
            result["message"] = (
                "Your safety is the priority. Let's find a safe place to pull over. "
                "In the meantime, I'll help you stay grounded."
            )
            result["grounding_content"] = {
                "name": grounding_result.get("name", "Grounding Exercise"),
                "instructions": grounding_result.get("instructions", []),
                "audio_script": grounding_result.get("audio_script"),
            }
            result["pull_over_guidance"] = [
                "Signal and move to the right lane",
                "Look for a safe spot - parking lot, rest area, or wide shoulder",
                "Turn on your hazard lights",
                "Put the car in park and take your time",
            ]
            result["sources"] = grounding_result.get("sources", [])

        else:
            # Default to calming message
            message_result = await self.generate_calming_message(
                stress_level, stress_score, user_preferences, context
            )
            result["message"] = message_result["message"]
            result["sources"] = message_result["sources"]

        return result

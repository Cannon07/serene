"""
Debrief Agent for processing post-drive debriefs and generating insights.
"""
from datetime import datetime
from typing import Optional

from opik import track

from agents.base_agent import BaseAgent
from services.rag_service import RAGService
from services.hume_service import get_stress_level
from config.rag_config import get_openai_api_key, is_rag_configured

# Conditional imports for LLM
try:
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False


ENCOURAGEMENT_TEMPLATE = """You are Serene, a compassionate AI companion helping someone with driving anxiety.
The driver has just completed a drive and you're generating an encouraging debrief message.

Emotional journey:
- Pre-drive stress: {pre_stress_level} ({pre_stress_score:.0%})
- Post-drive stress: {post_stress_level} ({post_stress_score:.0%})
- Improvement: {improvement:.0%}

Key learnings from this drive:
{learnings}

Their preferred calming methods: {preferences}

Relevant encouragement techniques from our knowledge base:
{retrieved_content}

Generate a warm, encouraging message (2-4 sentences) that:
- Acknowledges their accomplishment
- Highlights specific progress (if any)
- Reinforces positive coping strategies they used
- Motivates them for future drives

Message:"""


class DebriefAgent(BaseAgent):
    """Agent for processing post-drive debriefs and generating personalized insights."""

    def __init__(self):
        super().__init__("DebriefAgent")
        self.rag_service = RAGService.get_instance()
        self._llm: Optional[object] = None
        self._initialized = False

    async def _ensure_initialized(self) -> bool:
        """Ensure agent is initialized with LLM and RAG."""
        if self._initialized:
            return True

        if not is_rag_configured() or not HAS_LANGCHAIN:
            print("Warning: DebriefAgent requires OPENAI_API_KEY and langchain")
            return False

        api_key = get_openai_api_key()

        try:
            self._llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.7,
                openai_api_key=api_key,
            )

            await self.rag_service.initialize()

            self._initialized = True
            return True
        except Exception as e:
            print(f"Warning: DebriefAgent initialization failed: {e}")
            return False

    def _get_stress_level(self, score: float) -> str:
        """Convert stress score to level string."""
        return get_stress_level(score)

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
            return "No specific content found."

        content_parts = []
        for doc in documents:
            title = doc.metadata.get("title", "Content")
            content_parts.append(f"### {title}\n{doc.page_content[:500]}...")

        return "\n\n".join(content_parts)

    @track(name="DebriefAgent.calculate_emotional_journey")
    def calculate_emotional_journey(
        self,
        pre_stress: Optional[float],
        post_stress: float,
    ) -> dict:
        """
        Calculate emotional journey metrics from pre and post drive stress.

        Args:
            pre_stress: Pre-drive stress score (0-1), None if not recorded
            post_stress: Post-drive stress score (0-1)

        Returns:
            Dict with pre_drive, post_drive, and improvement data
        """
        pre_score = pre_stress if pre_stress is not None else 0.5  # Default to medium
        pre_level = self._get_stress_level(pre_score)
        post_level = self._get_stress_level(post_stress)

        # Calculate improvement (positive = stress reduced)
        improvement = pre_score - post_stress

        return {
            "pre_drive": {
                "stress": round(pre_score, 2),
                "level": pre_level,
            },
            "post_drive": {
                "stress": round(post_stress, 2),
                "level": post_level,
            },
            "improvement": round(improvement, 2),
        }

    @track(name="DebriefAgent.extract_learnings")
    def extract_learnings(
        self,
        drive_events: list,
        user_triggers: list[dict],
    ) -> list[str]:
        """
        Analyze drive events to extract key learnings.

        Args:
            drive_events: List of DriveEvent objects
            user_triggers: List of user stress trigger dicts

        Returns:
            List of learning strings
        """
        learnings = []

        # Analyze events by type
        stress_events = [e for e in drive_events if e.event_type == "STRESS_DETECTED"]
        intervention_events = [e for e in drive_events if e.event_type == "INTERVENTION"]
        reroute_offered = [e for e in drive_events if e.event_type == "REROUTE_OFFERED"]
        reroute_accepted = [e for e in drive_events if e.event_type == "REROUTE_ACCEPTED"]
        pull_over_events = [e for e in drive_events if e.event_type == "PULL_OVER_REQUESTED"]

        # Learning: Identify main stress points
        if stress_events:
            high_stress_events = [e for e in stress_events if e.stress_level and e.stress_level >= 0.6]
            if high_stress_events:
                # Check if any relate to user's known triggers
                for event in high_stress_events:
                    details = event.details or {}
                    trigger_type = details.get("trigger_type")
                    if trigger_type:
                        learnings.append(f"{trigger_type.replace('_', ' ').title()} was a significant stress point")
                    else:
                        learnings.append("High stress moment detected during the drive")
            else:
                learnings.append("Stress levels remained manageable throughout the drive")

        # Learning: Intervention effectiveness
        if intervention_events:
            intervention_types = set()
            for event in intervention_events:
                details = event.details or {}
                int_type = details.get("intervention_type", "intervention")
                intervention_types.add(int_type)

            for int_type in intervention_types:
                learnings.append(f"{int_type.replace('_', ' ').title()} was used during the drive")

            # Check if stress reduced after interventions
            if stress_events:
                post_intervention_stress = [
                    e.stress_level for e in stress_events
                    if any(i.timestamp < e.timestamp for i in intervention_events)
                    and e.stress_level is not None
                ]
                if post_intervention_stress and len(post_intervention_stress) >= 2:
                    if post_intervention_stress[-1] < post_intervention_stress[0]:
                        learnings.append("Interventions helped reduce stress levels")

        # Learning: Reroute decisions
        if reroute_offered:
            if reroute_accepted:
                learnings.append("Alternative calmer route was accepted and used")
                # Check if this helped
                if stress_events:
                    post_reroute_stress = [
                        e.stress_level for e in stress_events
                        if any(r.timestamp < e.timestamp for r in reroute_accepted)
                        and e.stress_level is not None
                    ]
                    if post_reroute_stress:
                        avg_post = sum(post_reroute_stress) / len(post_reroute_stress)
                        if avg_post < 0.5:
                            learnings.append("Reroute helped maintain lower stress levels")
            else:
                learnings.append("Calmer route was offered but original route was kept")

        # Learning: Pull over requests (indicates critical stress moments)
        if pull_over_events:
            learnings.append(f"Needed to pull over {len(pull_over_events)} time(s) during the drive")
            # This is important for tracking severe anxiety moments

        # If no events, provide general learning
        if not learnings:
            learnings.append("Drive completed without significant stress events")

        return learnings[:5]  # Limit to 5 learnings

    @track(name="DebriefAgent.suggest_profile_updates")
    def suggest_profile_updates(
        self,
        learnings: list[str],
        drive_events: list,
        user_triggers: list[dict],
        emotional_journey: dict,
    ) -> list[str]:
        """
        Suggest profile updates based on drive insights.

        Args:
            learnings: List of extracted learnings
            drive_events: List of DriveEvent objects
            user_triggers: List of user stress trigger dicts
            emotional_journey: Emotional journey dict

        Returns:
            List of suggested profile update strings
        """
        updates = []

        stress_events = [e for e in drive_events if e.event_type == "STRESS_DETECTED"]
        intervention_events = [e for e in drive_events if e.event_type == "INTERVENTION"]
        reroute_accepted = [e for e in drive_events if e.event_type == "REROUTE_ACCEPTED"]

        # Check for trigger severity updates
        high_stress_events = [e for e in stress_events if e.stress_level and e.stress_level >= 0.6]
        for event in high_stress_events:
            details = event.details or {}
            trigger_type = details.get("trigger_type")
            if trigger_type:
                # Check if this trigger is in user's known triggers
                existing_trigger = next(
                    (t for t in user_triggers if t.get("trigger") == trigger_type),
                    None
                )
                if existing_trigger:
                    current_severity = existing_trigger.get("severity", 3)
                    if event.stress_level >= 0.7 and current_severity < 5:
                        updates.append(f"{trigger_type.replace('_', ' ').title()}: Consider increasing severity rating")
                else:
                    updates.append(f"{trigger_type.replace('_', ' ').title()}: Consider adding as a stress trigger")

        # Check intervention effectiveness
        for event in intervention_events:
            details = event.details or {}
            int_type = details.get("intervention_type")
            if int_type and emotional_journey.get("improvement", 0) > 0.2:
                updates.append(f"{int_type.replace('_', ' ').title()}: Confirmed effective - consider prioritizing")

        # Reroute preference
        if reroute_accepted and emotional_journey.get("improvement", 0) > 0.1:
            updates.append("Calmer routes: Preference confirmed - prioritize in future route planning")

        # Overall improvement tracking
        improvement = emotional_journey.get("improvement", 0)
        if improvement > 0.3:
            updates.append(f"Significant stress reduction achieved ({improvement:.0%} improvement)")
        elif improvement < -0.1:
            updates.append("Stress increased during drive - review triggers and coping strategies")

        return updates[:4]  # Limit to 4 updates

    @track(name="DebriefAgent.generate_encouragement")
    async def generate_encouragement(
        self,
        emotional_journey: dict,
        learnings: list[str],
        user_preferences: list[dict],
    ) -> str:
        """
        Generate personalized encouragement using RAG + LLM.

        Args:
            emotional_journey: Emotional journey dict
            learnings: List of extracted learnings
            user_preferences: List of user calming preference dicts

        Returns:
            Encouraging message string
        """
        initialized = await self._ensure_initialized()

        # Get values from emotional journey
        pre_drive = emotional_journey.get("pre_drive", {})
        post_drive = emotional_journey.get("post_drive", {})
        improvement = emotional_journey.get("improvement", 0)

        pre_stress_score = pre_drive.get("stress", 0.5)
        pre_stress_level = pre_drive.get("level", "MEDIUM")
        post_stress_score = post_drive.get("stress", 0.5)
        post_stress_level = post_drive.get("level", "MEDIUM")

        # Fallback if LLM not available
        if not initialized:
            return self._get_fallback_encouragement(improvement, post_stress_level)

        try:
            # Retrieve relevant encouragement content
            query = "encouragement after driving anxiety completion progress positive reinforcement"
            documents = await self.rag_service.retrieve(query, k=2)

            # Build prompt
            prompt = ChatPromptTemplate.from_template(ENCOURAGEMENT_TEMPLATE)

            # Generate response
            chain = prompt | self._llm
            response = await chain.ainvoke({
                "pre_stress_score": pre_stress_score,
                "pre_stress_level": pre_stress_level,
                "post_stress_score": post_stress_score,
                "post_stress_level": post_stress_level,
                "improvement": improvement,
                "learnings": "\n".join(f"- {l}" for l in learnings) if learnings else "No specific learnings",
                "preferences": self._format_preferences(user_preferences),
                "retrieved_content": self._format_retrieved_content(documents),
            })

            return response.content
        except Exception as e:
            print(f"Warning: Encouragement generation failed: {e}")
            return self._get_fallback_encouragement(improvement, post_stress_level)

    def _get_fallback_encouragement(self, improvement: float, post_stress_level: str) -> str:
        """Generate fallback encouragement when LLM is unavailable."""
        if improvement > 0.3:
            return f"Excellent work! Your stress reduced by {improvement:.0%} during this drive. You're building real confidence behind the wheel."
        elif improvement > 0.1:
            return f"Good job completing your drive! Your stress improved by {improvement:.0%}. Every drive is progress."
        elif improvement > -0.1:
            return "You completed your drive - that's an achievement in itself! Remember, building confidence takes time and you're on the right path."
        else:
            return "The drive is complete. It's okay if this one was challenging - every experience helps you learn. Take a moment to rest and recharge."

    @track(name="DebriefAgent.process_debrief")
    async def process_debrief(
        self,
        pre_drive_stress: Optional[float],
        post_drive_stress: float,
        drive_events: list,
        user_triggers: list[dict],
        user_preferences: list[dict],
    ) -> dict:
        """
        Main entry point - process complete post-drive debrief.

        Args:
            pre_drive_stress: Pre-drive stress score (0-1), None if not recorded
            post_drive_stress: Post-drive stress score (0-1)
            drive_events: List of DriveEvent objects from the drive
            user_triggers: List of user stress trigger dicts
            user_preferences: List of user calming preference dicts

        Returns:
            Dict with emotional_journey, learnings, profile_updates, encouragement
        """
        # Calculate emotional journey
        emotional_journey = self.calculate_emotional_journey(
            pre_drive_stress, post_drive_stress
        )

        # Extract learnings from events
        learnings = self.extract_learnings(drive_events, user_triggers)

        # Suggest profile updates
        profile_updates = self.suggest_profile_updates(
            learnings, drive_events, user_triggers, emotional_journey
        )

        # Generate encouragement
        encouragement = await self.generate_encouragement(
            emotional_journey, learnings, user_preferences
        )

        return {
            "emotional_journey": emotional_journey,
            "learnings": learnings,
            "profile_updates": profile_updates,
            "encouragement": encouragement,
        }

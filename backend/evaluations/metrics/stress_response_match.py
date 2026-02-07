"""
Deterministic metric: Does the intervention type match the stress level thresholds?

Serene's intervention rules:
  stress_score < 0.3  → NONE
  0.3 - 0.6           → CALMING_MESSAGE
  0.6 - 0.8           → BREATHING_EXERCISE
  >= 0.8              → PULL_OVER

Scoring:
  1.0 = exact match
  0.5 = adjacent level (one step off)
  0.0 = mismatch (two+ steps off)
"""
from typing import Any
from opik.evaluation.metrics import BaseMetric
from opik.evaluation.metrics.score_result import ScoreResult


# Ordered by severity so we can measure adjacency
INTERVENTION_ORDER = ["NONE", "CALMING_MESSAGE", "BREATHING_EXERCISE", "PULL_OVER"]


def _expected_intervention(stress_score: float) -> str:
    """Return the expected intervention type for a given stress score."""
    if stress_score >= 0.8:
        return "PULL_OVER"
    elif stress_score >= 0.6:
        return "BREATHING_EXERCISE"
    elif stress_score >= 0.3:
        return "CALMING_MESSAGE"
    return "NONE"


class StressResponseMatchMetric(BaseMetric):
    """Check if the intervention type matches the stress level thresholds."""

    name = "stress_response_match"

    def __init__(self):
        super().__init__(name=self.name)

    def score(
        self,
        output: str,
        stress_score: float = 0.0,
        intervention_type: str = "",
        **ignored_kwargs: Any,
    ) -> ScoreResult:
        actual = intervention_type or output
        expected = _expected_intervention(stress_score)

        if actual == expected:
            return ScoreResult(
                value=1.0,
                name=self.name,
                reason=f"Correct: {actual} for stress_score={stress_score:.2f}",
            )

        # Check adjacency
        try:
            actual_idx = INTERVENTION_ORDER.index(actual)
            expected_idx = INTERVENTION_ORDER.index(expected)
        except ValueError:
            return ScoreResult(
                value=0.0,
                name=self.name,
                reason=f"Unknown intervention type: {actual}",
            )

        distance = abs(actual_idx - expected_idx)
        if distance == 1:
            return ScoreResult(
                value=0.5,
                name=self.name,
                reason=f"Adjacent: got {actual}, expected {expected} for stress_score={stress_score:.2f}",
            )

        return ScoreResult(
            value=0.0,
            name=self.name,
            reason=f"Mismatch: got {actual}, expected {expected} for stress_score={stress_score:.2f}",
        )

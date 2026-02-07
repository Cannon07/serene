"""
RAG Groundedness metric: Is the generated message grounded in retrieved documents?

Wraps Opik's built-in Hallucination metric and inverts the score so that
1.0 = fully grounded (no hallucination) and 0.0 = fully hallucinated.
"""
from typing import Any
from opik.evaluation.metrics import BaseMetric
from opik.evaluation.metrics.score_result import ScoreResult

try:
    from opik.evaluation.metrics import Hallucination
    _HALLUCINATION_AVAILABLE = True
except ImportError:
    _HALLUCINATION_AVAILABLE = False


class RAGGroundednessMetric(BaseMetric):
    """Check if generated intervention is grounded in RAG-retrieved documents."""

    name = "rag_groundedness"

    def __init__(self, model: str = "gpt-4o-mini"):
        super().__init__(name=self.name)
        if _HALLUCINATION_AVAILABLE:
            self._hallucination = Hallucination(model=model)
        else:
            self._hallucination = None

    def score(
        self,
        output: str,
        context: list[str] | None = None,
        **ignored_kwargs: Any,
    ) -> ScoreResult:
        # If no RAG context provided, we can't evaluate groundedness
        if not context:
            return ScoreResult(
                value=0.5,
                name=self.name,
                reason="No RAG context provided — cannot evaluate groundedness",
            )

        if not self._hallucination:
            return ScoreResult(
                value=0.5,
                name=self.name,
                reason="Opik Hallucination metric not available",
            )

        try:
            h_result = self._hallucination.score(
                output=output,
                context=context,
            )
            # Invert: Hallucination gives 1.0 = hallucinated,
            # we want 1.0 = grounded
            grounded_score = 1.0 - h_result.value
            return ScoreResult(
                value=max(0.0, min(1.0, grounded_score)),
                name=self.name,
                reason=f"Groundedness (inverted hallucination): {h_result.reason}",
            )
        except Exception as e:
            return ScoreResult(
                value=0.5,
                name=self.name,
                reason=f"Hallucination check failed: {e}",
            )

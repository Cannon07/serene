"""
LLM-as-judge metric: Is the tone warm, empathetic, and supportive for someone
experiencing driving anxiety?
"""
import os
import json
from typing import Any
from opik.evaluation.metrics import BaseMetric
from opik.evaluation.metrics.score_result import ScoreResult


EMPATHY_JUDGE_PROMPT = """You are evaluating a response from Serene, a driving anxiety support AI.

**Response being evaluated:**
---
{response}
---

Rate the EMPATHY and WARMTH of this response on a 0.0 to 1.0 scale. Consider:

1. **Acknowledgment**: Does it acknowledge the person's feelings without dismissing them?
2. **Warmth**: Is the tone warm and supportive, not clinical or robotic?
3. **Non-patronizing**: Does it avoid patronizing or condescending language?
4. **Validation**: Would a real anxiety sufferer feel validated and understood?
5. **Encouragement**: Does it gently encourage without pressuring?

A score of 1.0 means the response is deeply empathetic and would comfort someone with driving anxiety.
A score of 0.0 means the response is cold, dismissive, or would make anxiety worse.

Respond with ONLY a JSON object:
{{"score": <float 0.0-1.0>, "reason": "<brief explanation>"}}
"""


class ToneEmpathyMetric(BaseMetric):
    """Evaluate empathy and warmth of AI responses."""

    name = "tone_empathy"

    def __init__(self, model: str = "gpt-4o-mini"):
        super().__init__(name=self.name)
        self._model = model

    def score(
        self,
        output: str,
        **ignored_kwargs: Any,
    ) -> ScoreResult:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            prompt = EMPATHY_JUDGE_PROMPT.format(response=output)
            response = client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=200,
            )
            content = response.choices[0].message.content.strip()
            parsed = json.loads(content)
            return ScoreResult(
                value=max(0.0, min(1.0, float(parsed["score"]))),
                name=self.name,
                reason=parsed.get("reason", "LLM empathy evaluation"),
            )
        except Exception as e:
            return ScoreResult(
                value=0.5,
                name=self.name,
                reason=f"LLM judge failed: {e}",
            )

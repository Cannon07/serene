"""
Model comparison experiment: GPT-4o vs GPT-4o-mini.

Runs the same intervention scenarios with each model forced and compares
quality, safety, and empathy scores side-by-side in Opik.

Usage:
    python -m evaluations.experiments.run_model_comparison
"""
import asyncio
from typing import Any

from dotenv import load_dotenv
load_dotenv()

import opik
from opik.evaluation import evaluate
from langchain_openai import ChatOpenAI

from config.opik_config import init_opik
from config.rag_config import get_openai_api_key
from agents.calm_agent import CalmAgent
from evaluations.metrics import (
    InterventionQualityMetric,
    SafetyMetric,
    ToneEmpathyMetric,
)
from evaluations.experiments.datasets import INTERVENTION_SCENARIOS


def _intervention_type_for_score(stress_score: float) -> str:
    if stress_score >= 0.8:
        return "PULL_OVER"
    elif stress_score >= 0.6:
        return "BREATHING_EXERCISE"
    elif stress_score >= 0.3:
        return "CALMING_MESSAGE"
    return "NONE"


def _parse_preferences(preferences: str) -> list[dict]:
    pref_list = []
    for pref in preferences.split(", "):
        parts = pref.split(" (effectiveness: ")
        if len(parts) == 2:
            pref_list.append({
                "preference": parts[0],
                "effectiveness": int(parts[1].rstrip(")")),
            })
    return pref_list


def _make_task(model_name: str):
    """Create a task function that uses a specific model."""
    agent = CalmAgent()

    # Override the model selection after initialization
    async def _ensure_and_override():
        await agent._ensure_initialized()
        api_key = get_openai_api_key()
        if api_key:
            forced_llm = ChatOpenAI(
                model=model_name,
                temperature=0.7,
                api_key=api_key,
            )
            agent._llm_full = forced_llm
            agent._llm_mini = forced_llm

    asyncio.run(_ensure_and_override())

    def task(dataset_item: dict[str, Any]) -> dict[str, Any]:
        stress_score = dataset_item.get("stress_score", 0.5)
        stress_level = dataset_item.get("stress_level", "MEDIUM")
        preferences = dataset_item.get("preferences", "")
        context = dataset_item.get("context", "")
        intervention_type = _intervention_type_for_score(stress_score)

        if intervention_type == "NONE":
            return {
                "output": "You're doing great! Keep driving calmly.",
                "intervention_type": "NONE",
                "stress_score": stress_score,
                "stress_level": stress_level,
                "user_preferences": preferences,
            }

        pref_list = _parse_preferences(preferences)

        result = asyncio.run(
            agent.generate_intervention(
                intervention_type=intervention_type,
                stress_level=stress_level,
                stress_score=stress_score,
                user_preferences=pref_list,
                context=context,
            )
        )

        return {
            "output": result.get("message", ""),
            "intervention_type": result.get("intervention_type", intervention_type),
            "stress_score": stress_score,
            "stress_level": stress_level,
            "user_preferences": preferences,
        }

    return task


def run_model_comparison():
    """Run GPT-4o vs GPT-4o-mini comparison experiment."""
    init_opik()
    client = opik.Opik()

    dataset = client.get_or_create_dataset(
        name="serene-intervention-scenarios",
        description="Driving anxiety intervention scenarios across all stress levels",
    )

    # Ensure dataset has items
    items = dataset.get_items()
    if not items:
        print("Dataset empty — populating from scenarios...")
        dataset.insert([
            {
                "input": f"Stress: {s['stress_level']} ({s['stress_score']}), "
                         f"Preferences: {s['preferences']}, Context: {s['context']}",
                "expected_output": s["expected_intervention"],
                "stress_score": s["stress_score"],
                "stress_level": s["stress_level"],
                "preferences": s["preferences"],
                "context": s["context"],
            }
            for s in INTERVENTION_SCENARIOS
        ])

    metrics = [
        InterventionQualityMetric(),
        SafetyMetric(),
        ToneEmpathyMetric(),
    ]

    # Experiment 1: GPT-4o
    print("Running experiment with gpt-4o...")
    result_4o = evaluate(
        dataset=dataset,
        task=_make_task("gpt-4o"),
        scoring_metrics=metrics,
        experiment_name="model-comparison-gpt4o",
        experiment_config={
            "model": "gpt-4o",
            "temperature": 0.7,
            "rag_enabled": True,
        },
    )
    print(f"  GPT-4o results: {result_4o}")

    # Experiment 2: GPT-4o-mini
    print("Running experiment with gpt-4o-mini...")
    result_mini = evaluate(
        dataset=dataset,
        task=_make_task("gpt-4o-mini"),
        scoring_metrics=metrics,
        experiment_name="model-comparison-gpt4o-mini",
        experiment_config={
            "model": "gpt-4o-mini",
            "temperature": 0.7,
            "rag_enabled": True,
        },
    )
    print(f"  GPT-4o-mini results: {result_mini}")

    print("\nModel comparison complete! Check Opik dashboard to compare side-by-side.")


if __name__ == "__main__":
    run_model_comparison()

"""
Main intervention quality experiment.

Runs CalmAgent against all intervention scenarios and scores with all 5 metrics.

Usage:
    python -m evaluations.experiments.run_intervention_eval
"""
import asyncio
from typing import Any

from dotenv import load_dotenv
load_dotenv()

import opik
from opik.evaluation import evaluate

from config.opik_config import init_opik
from agents.calm_agent import CalmAgent
from evaluations.metrics import (
    StressResponseMatchMetric,
    SafetyMetric,
    InterventionQualityMetric,
    RAGGroundednessMetric,
    ToneEmpathyMetric,
)
from evaluations.experiments.datasets import INTERVENTION_SCENARIOS


_calm_agent = CalmAgent()


def _intervention_type_for_score(stress_score: float) -> str:
    """Determine intervention type from stress score (mirrors backend logic)."""
    if stress_score >= 0.8:
        return "PULL_OVER"
    elif stress_score >= 0.6:
        return "BREATHING_EXERCISE"
    elif stress_score >= 0.3:
        return "CALMING_MESSAGE"
    return "NONE"


def intervention_task(dataset_item: dict[str, Any]) -> dict[str, Any]:
    """Task function: generate an intervention for a given scenario."""
    stress_score = dataset_item.get("stress_score", 0.5)
    stress_level = dataset_item.get("stress_level", "MEDIUM")
    preferences = dataset_item.get("preferences", "")
    context = dataset_item.get("context", "")
    intervention_type = _intervention_type_for_score(stress_score)

    # Skip NONE interventions — CalmAgent doesn't handle them
    if intervention_type == "NONE":
        return {
            "output": "You're doing great! Keep driving calmly.",
            "intervention_type": "NONE",
            "stress_score": stress_score,
            "stress_level": stress_level,
            "user_preferences": preferences,
            "context": [],
        }

    # Parse preferences into list of dicts for the agent
    pref_list = []
    for pref in preferences.split(", "):
        parts = pref.split(" (effectiveness: ")
        if len(parts) == 2:
            pref_list.append({
                "preference": parts[0],
                "effectiveness": int(parts[1].rstrip(")")),
            })

    # Run CalmAgent
    result = asyncio.run(
        _calm_agent.generate_intervention(
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
        "context": result.get("sources", []),  # RAG sources for groundedness
    }


def run_evaluation():
    """Run the intervention quality experiment."""
    init_opik()
    client = opik.Opik()

    # Ensure dataset exists
    dataset = client.get_or_create_dataset(
        name="serene-intervention-scenarios",
        description="Driving anxiety intervention scenarios across all stress levels",
    )

    # Check if dataset has items, if not populate it
    items = dataset.get_items()
    if not items:
        print("Dataset empty — populating from scenarios...")
        dataset.insert([
            {
                "input": f"Stress: {s['stress_level']} ({s['stress_score']}), "
                         f"Preferences: {s['preferences']}, "
                         f"Context: {s['context']}",
                "expected_output": s["expected_intervention"],
                "stress_score": s["stress_score"],
                "stress_level": s["stress_level"],
                "preferences": s["preferences"],
                "context": s["context"],
            }
            for s in INTERVENTION_SCENARIOS
        ])

    print("Running intervention quality experiment...")
    print(f"  Dataset: serene-intervention-scenarios ({len(INTERVENTION_SCENARIOS)} scenarios)")
    print("  Metrics: StressResponseMatch, Safety, InterventionQuality, RAGGroundedness, ToneEmpathy")

    result = evaluate(
        dataset=dataset,
        task=intervention_task,
        scoring_metrics=[
            StressResponseMatchMetric(),
            SafetyMetric(),
            InterventionQualityMetric(),
            RAGGroundednessMetric(),
            ToneEmpathyMetric(),
        ],
        experiment_name="intervention-quality-v1",
        experiment_config={
            "model": "gpt-4o (HIGH/CRITICAL) + gpt-4o-mini (LOW/MEDIUM)",
            "rag_enabled": True,
            "rag_search_type": "mmr",
            "rag_k": 4,
            "temperature": 0.7,
        },
    )

    print(f"\nExperiment complete!")
    print(f"Results: {result}")


if __name__ == "__main__":
    run_evaluation()

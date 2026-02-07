"""
Debrief quality experiment.

Evaluates DebriefAgent's encouragement generation across different
post-drive scenarios.

Usage:
    python -m evaluations.experiments.run_debrief_eval
"""
import asyncio
from typing import Any

from dotenv import load_dotenv
load_dotenv()

import opik
from opik.evaluation import evaluate

from config.opik_config import init_opik
from agents.debrief_agent import DebriefAgent
from evaluations.metrics import SafetyMetric, ToneEmpathyMetric
from evaluations.experiments.datasets import DEBRIEF_SCENARIOS


_debrief_agent = DebriefAgent()


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


def _parse_triggers(triggers: str) -> list[dict]:
    trigger_list = []
    for trigger in triggers.split(", "):
        parts = trigger.split(" (severity: ")
        if len(parts) == 2:
            trigger_list.append({
                "trigger": parts[0],
                "severity": int(parts[1].rstrip(")")),
            })
    return trigger_list


def debrief_task(dataset_item: dict[str, Any]) -> dict[str, Any]:
    """Task function: generate a debrief for a given scenario."""
    pre_stress = dataset_item.get("pre_stress", 0.5)
    post_stress = dataset_item.get("post_stress", 0.3)
    triggers = dataset_item.get("triggers", "")
    preferences = dataset_item.get("preferences", "")

    trigger_list = _parse_triggers(triggers)
    pref_list = _parse_preferences(preferences)

    # Run DebriefAgent (passing empty events list for simplicity —
    # the encouragement generation mainly uses stress scores + preferences)
    result = asyncio.run(
        _debrief_agent.process_debrief(
            pre_drive_stress=pre_stress,
            post_drive_stress=post_stress,
            drive_events=[],  # Simplified — learnings extracted from scores
            user_triggers=trigger_list,
            user_preferences=pref_list,
        )
    )

    return {
        "output": result.get("encouragement", ""),
        "learnings": str(result.get("learnings", [])),
        "improvement": result.get("emotional_journey", {}).get("improvement", 0),
    }


def run_debrief_evaluation():
    """Run the debrief quality experiment."""
    init_opik()
    client = opik.Opik()

    dataset = client.get_or_create_dataset(
        name="serene-debrief-scenarios",
        description="Post-drive debrief scenarios with varying stress outcomes",
    )

    # Ensure dataset has items
    items = dataset.get_items()
    if not items:
        print("Dataset empty — populating from scenarios...")
        dataset.insert([
            {
                "input": f"Pre-stress: {s['pre_stress']}, Post-stress: {s['post_stress']}, "
                         f"Events: {s['events']}, Triggers: {s['triggers']}, "
                         f"Preferences: {s['preferences']}",
                "expected_output": s["description"],
                "pre_stress": s["pre_stress"],
                "post_stress": s["post_stress"],
                "events": s["events"],
                "triggers": s["triggers"],
                "preferences": s["preferences"],
            }
            for s in DEBRIEF_SCENARIOS
        ])

    print("Running debrief quality experiment...")
    print(f"  Dataset: serene-debrief-scenarios ({len(DEBRIEF_SCENARIOS)} scenarios)")
    print("  Metrics: ToneEmpathy, Safety")

    result = evaluate(
        dataset=dataset,
        task=debrief_task,
        scoring_metrics=[
            ToneEmpathyMetric(),
            SafetyMetric(),
        ],
        experiment_name="debrief-encouragement-v1",
        experiment_config={
            "model": "gpt-4o-mini",
            "rag_enabled": True,
            "temperature": 0.7,
        },
    )

    print(f"\nExperiment complete!")
    print(f"Results: {result}")


if __name__ == "__main__":
    run_debrief_evaluation()

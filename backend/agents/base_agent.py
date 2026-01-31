"""
Base agent class with Opik tracing support.
All agents should inherit from this.
"""
from typing import Callable
from opik import track
from config.opik_config import is_opik_configured


class BaseAgent:
    """Base class for all agents with built-in tracing."""

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.tracing_enabled = is_opik_configured()

    def trace(self, operation_name: str = None):
        """
        Decorator for tracing agent operations.

        Usage:
            @self.trace("calculate_calm_score")
            async def calculate_calm_score(self, route):
                ...
        """
        def decorator(func: Callable) -> Callable:
            if not self.tracing_enabled:
                return func

            name = operation_name or f"{self.agent_name}.{func.__name__}"
            return track(name=name)(func)

        return decorator

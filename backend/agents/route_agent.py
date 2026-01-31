"""
Route Agent for calculating calm scores and analyzing routes.
"""
import re
from typing import Optional
from opik import track

from agents.base_agent import BaseAgent
from config.opik_config import is_opik_configured


class RouteAgent(BaseAgent):
    """Agent responsible for analyzing routes and calculating calm scores."""

    # Penalty values (from PRD)
    PENALTY_HIGHWAY = 15  # per segment
    PENALTY_HEAVY_TRAFFIC = 20
    PENALTY_TRAFFIC_SIGNAL = 2  # per signal
    PENALTY_COMPLEX_INTERSECTION = 5  # per intersection
    PENALTY_CONSTRUCTION = 10  # per zone

    # Bonus values
    BONUS_SCENIC = 10
    BONUS_RESIDENTIAL = 5
    BONUS_LOW_SPEED = 5

    # Detection patterns
    HIGHWAY_PATTERNS = re.compile(
        r'\b(highway|expressway|freeway|motorway|interstate|toll road|national highway|nh\d+)\b',
        re.IGNORECASE
    )
    SCENIC_PATTERNS = re.compile(
        r'\b(park|lake|river|garden|beach|waterfront|scenic|forest|nature)\b',
        re.IGNORECASE
    )
    RESIDENTIAL_PATTERNS = re.compile(
        r'\b(residential|colony|society|apartments|housing)\b',
        re.IGNORECASE
    )
    PEDESTRIAN_PATTERNS = re.compile(
        r'\b(pedestrian|walking|footpath|crosswalk|school zone)\b',
        re.IGNORECASE
    )
    COMPLEX_MANEUVERS = {'roundabout', 'merge', 'fork', 'ramp', 'uturn', 'u-turn'}

    def __init__(self):
        super().__init__("RouteAgent")

    @track(name="RouteAgent.analyze_routes")
    async def analyze_routes(
        self,
        routes: list[dict],
        user_triggers: Optional[list[dict]] = None
    ) -> list[dict]:
        """
        Analyze routes and calculate calm scores.

        Args:
            routes: List of routes from maps_service.get_routes()
            user_triggers: List of user's stress triggers with severity
                          e.g., [{"trigger": "HIGHWAYS", "severity": 4}, ...]

        Returns:
            Routes with added calm_score, stress_level, stress_points, is_recommended
        """
        user_triggers = user_triggers or []
        analyzed_routes = []

        for i, route in enumerate(routes):
            score, stress_points = self.calculate_calm_score(route, user_triggers)

            analyzed_route = {
                **route,
                "id": f"route_{i + 1}",
                "name": route.get("summary", f"Route {i + 1}"),
                "calm_score": score,
                "stress_level": self.get_stress_level(score),
                "stress_points": stress_points,
                "duration_minutes": round(route.get("duration_seconds", 0) / 60),
                "distance_km": round(route.get("distance_meters", 0) / 1000, 1),
            }
            analyzed_routes.append(analyzed_route)

        # Determine recommended route (highest calm score)
        if analyzed_routes:
            max_score = max(r["calm_score"] for r in analyzed_routes)
            # If scores are tied, prefer the fastest route
            candidates = [r for r in analyzed_routes if r["calm_score"] == max_score]
            if len(candidates) > 1:
                recommended = min(candidates, key=lambda r: r["duration_minutes"])
            else:
                recommended = candidates[0]

            for route in analyzed_routes:
                route["is_recommended"] = (route["id"] == recommended["id"])

        return analyzed_routes

    @track(name="RouteAgent.calculate_calm_score")
    def calculate_calm_score(
        self,
        route: dict,
        user_triggers: list[dict]
    ) -> tuple[int, list[dict]]:
        """
        Calculate calm score for a single route.

        Args:
            route: Route data from Google Maps API
            user_triggers: User's stress triggers with severity

        Returns:
            Tuple of (score, stress_points)
        """
        score = 100
        stress_points = []

        # Build user trigger lookup for 2x penalty
        user_trigger_set = {t.get("trigger") for t in user_triggers}

        # Detect stress points from route
        detected = self.detect_stress_points(route)

        # Apply penalties for each stress point
        penalty_counts = {}
        for point in detected:
            point_type = point["type"]
            penalty_counts[point_type] = penalty_counts.get(point_type, 0) + 1

            # Get base penalty
            base_penalty = self._get_penalty_for_type(point_type)

            # Apply 2x multiplier if user has this trigger
            if point_type in user_trigger_set:
                base_penalty *= 2

            score -= base_penalty
            stress_points.append(point)

        # Check for heavy traffic (route-level)
        traffic_penalty = self._calculate_traffic_penalty(route, user_trigger_set)
        if traffic_penalty > 0:
            score -= traffic_penalty
            stress_points.append({
                "location": "Entire route",
                "type": "HEAVY_TRAFFIC",
                "severity": "HIGH" if traffic_penalty >= 30 else "MEDIUM"
            })

        # Apply bonuses
        bonuses = self._calculate_bonuses(route)
        score += bonuses

        # Clamp score to 0-100
        score = max(0, min(100, score))

        return score, stress_points

    def detect_stress_points(self, route: dict) -> list[dict]:
        """
        Detect stress-inducing points in a route.

        Args:
            route: Route data with steps

        Returns:
            List of stress points with location, type, and severity
        """
        stress_points = []
        steps = route.get("steps", [])

        for i, step in enumerate(steps):
            instruction = step.get("instruction", "")
            maneuver = step.get("maneuver", "").lower()
            step_num = i + 1

            # Detect highway segments
            if self.HIGHWAY_PATTERNS.search(instruction):
                stress_points.append({
                    "location": f"Step {step_num}: {self._truncate(instruction, 50)}",
                    "type": "HIGHWAYS",
                    "severity": "HIGH"
                })

            # Detect complex intersections
            if maneuver in self.COMPLEX_MANEUVERS:
                stress_points.append({
                    "location": f"Step {step_num}: {maneuver.title()}",
                    "type": "COMPLEX_INTERSECTIONS",
                    "severity": "MEDIUM"
                })

            # Detect pedestrian areas
            if self.PEDESTRIAN_PATTERNS.search(instruction):
                stress_points.append({
                    "location": f"Step {step_num}: {self._truncate(instruction, 50)}",
                    "type": "PEDESTRIAN_AREAS",
                    "severity": "MEDIUM"
                })

        # Check route warnings for construction
        warnings = route.get("warnings", [])
        for warning in warnings:
            if "construction" in warning.lower():
                stress_points.append({
                    "location": "Route warning: Construction zone",
                    "type": "CONSTRUCTION",
                    "severity": "HIGH"
                })

        return stress_points

    def get_stress_level(self, score: int) -> str:
        """
        Convert calm score to stress level label.

        Args:
            score: Calm score (0-100)

        Returns:
            "LOW", "MEDIUM", or "HIGH"
        """
        if score >= 70:
            return "LOW"
        elif score >= 40:
            return "MEDIUM"
        else:
            return "HIGH"

    def _get_penalty_for_type(self, stress_type: str) -> int:
        """Get base penalty for a stress point type."""
        penalties = {
            "HIGHWAYS": self.PENALTY_HIGHWAY,
            "HEAVY_TRAFFIC": self.PENALTY_HEAVY_TRAFFIC,
            "TRAFFIC_SIGNAL": self.PENALTY_TRAFFIC_SIGNAL,
            "COMPLEX_INTERSECTIONS": self.PENALTY_COMPLEX_INTERSECTION,
            "CONSTRUCTION": self.PENALTY_CONSTRUCTION,
            "PEDESTRIAN_AREAS": 3,  # Mild penalty
        }
        return penalties.get(stress_type, 5)

    def _calculate_traffic_penalty(
        self,
        route: dict,
        user_trigger_set: set
    ) -> int:
        """
        Calculate penalty based on traffic conditions.

        Compares duration_in_traffic vs static_duration.
        >30% difference = heavy traffic
        """
        duration_traffic = route.get("duration_in_traffic_seconds", 0)
        duration_static = route.get("static_duration_seconds", 0)

        if duration_static == 0:
            return 0

        traffic_ratio = (duration_traffic - duration_static) / duration_static

        if traffic_ratio > 0.3:
            penalty = self.PENALTY_HEAVY_TRAFFIC
            if "HEAVY_TRAFFIC" in user_trigger_set:
                penalty *= 2
            return penalty

        return 0

    def _calculate_bonuses(self, route: dict) -> int:
        """Calculate bonuses for positive route characteristics."""
        bonus = 0
        steps = route.get("steps", [])

        scenic_found = False
        residential_found = False

        for step in steps:
            instruction = step.get("instruction", "")

            if not scenic_found and self.SCENIC_PATTERNS.search(instruction):
                bonus += self.BONUS_SCENIC
                scenic_found = True

            if not residential_found and self.RESIDENTIAL_PATTERNS.search(instruction):
                bonus += self.BONUS_RESIDENTIAL
                residential_found = True

        return bonus

    def _truncate(self, text: str, max_len: int) -> str:
        """Truncate text to max length with ellipsis."""
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', text)
        if len(clean) <= max_len:
            return clean
        return clean[:max_len - 3] + "..."

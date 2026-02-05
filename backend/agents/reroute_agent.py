"""
Reroute Agent for finding calmer alternative routes during a drive.
"""
from typing import Optional
from opik import track

from agents.base_agent import BaseAgent
from agents.route_agent import RouteAgent
from services.maps_service import get_routes, generate_maps_deep_link, MapsServiceError


# Minimum calm score improvement to suggest a reroute
MIN_CALM_SCORE_IMPROVEMENT = 20

# Maximum number of waypoints to include in deep link (Google Maps limit is ~10)
MAX_WAYPOINTS = 5


class RerouteAgent(BaseAgent):
    """Agent for finding and suggesting calmer alternative routes."""

    def __init__(self):
        super().__init__("RerouteAgent")
        self._route_agent = RouteAgent()

    def _extract_waypoints(self, route: dict, max_waypoints: int = MAX_WAYPOINTS) -> list[dict]:
        """
        Extract key waypoints from a route's steps to make the deep link route-specific.

        Args:
            route: Analyzed route with steps
            max_waypoints: Maximum number of waypoints to extract

        Returns:
            List of waypoint dicts with latitude and longitude
        """
        steps = route.get("steps", [])
        if not steps:
            return []

        waypoints = []

        # If we have few steps, use all of them
        if len(steps) <= max_waypoints:
            for step in steps[:-1]:  # Exclude last step (it's the destination)
                location = step.get("end_location", {})
                if location.get("latitude") and location.get("longitude"):
                    waypoints.append({
                        "latitude": location["latitude"],
                        "longitude": location["longitude"]
                    })
        else:
            # Select evenly spaced waypoints
            step_interval = len(steps) // (max_waypoints + 1)
            for i in range(1, max_waypoints + 1):
                idx = i * step_interval
                if idx < len(steps):
                    location = steps[idx].get("end_location", {})
                    if location.get("latitude") and location.get("longitude"):
                        waypoints.append({
                            "latitude": location["latitude"],
                            "longitude": location["longitude"]
                        })

        return waypoints

    @track(name="RerouteAgent.find_calmer_route")
    async def find_calmer_route(
        self,
        current_location: dict,
        destination: str,
        current_calm_score: Optional[int] = None,
        user_triggers: Optional[list[dict]] = None,
    ) -> dict:
        """
        Find a calmer alternative route from current location.

        Args:
            current_location: Dict with "latitude" and "longitude"
            destination: Destination address
            current_calm_score: Current route's calm score (for comparison)
            user_triggers: User's stress triggers for personalization

        Returns:
            Dict with reroute_available, message, current_route, suggested_route
        """
        user_triggers = user_triggers or []

        # Format current location as coordinate string for Maps API
        origin = f"{current_location['latitude']},{current_location['longitude']}"

        # Fetch routes from current location
        try:
            maps_result = await get_routes(
                origin=origin,
                destination=destination,
                alternatives=True,
            )
        except MapsServiceError as e:
            return {
                "reroute_available": False,
                "message": f"Unable to fetch routes: {str(e)}",
                "current_route": None,
                "suggested_route": None,
            }

        raw_routes = maps_result.get("routes", [])
        if not raw_routes:
            return {
                "reroute_available": False,
                "message": "No alternative routes found from your current location.",
                "current_route": None,
                "suggested_route": None,
            }

        # Analyze routes with RouteAgent
        analyzed_routes = await self._route_agent.analyze_routes(raw_routes, user_triggers)

        if not analyzed_routes:
            return {
                "reroute_available": False,
                "message": "Unable to analyze routes.",
                "current_route": None,
                "suggested_route": None,
            }

        # Find the calmest route
        calmest_route = max(analyzed_routes, key=lambda r: r.get("calm_score", 0))
        fastest_route = min(analyzed_routes, key=lambda r: r.get("duration_minutes", float("inf")))

        calmest_score = calmest_route.get("calm_score", 0)
        calmest_duration = calmest_route.get("duration_minutes", 0)
        fastest_duration = fastest_route.get("duration_minutes", 0)

        # Calculate improvement
        if current_calm_score is not None:
            improvement = calmest_score - current_calm_score
        else:
            # If no current score provided, compare against fastest route
            fastest_score = fastest_route.get("calm_score", 0)
            improvement = calmest_score - fastest_score
            current_calm_score = fastest_score

        # Check if improvement is significant enough
        if improvement < MIN_CALM_SCORE_IMPROVEMENT:
            return {
                "reroute_available": False,
                "message": "No significantly calmer route available. Your current route is good!",
                "current_route": {
                    "calm_score": current_calm_score,
                },
                "suggested_route": None,
            }

        # Extract waypoints from the route to make the deep link route-specific
        waypoints = self._extract_waypoints(calmest_route)

        # Generate Google Maps deep link for the calmer route
        maps_url = generate_maps_deep_link(
            origin=current_location,
            destination=destination,
            waypoints=waypoints,
        )

        # Build suggested route response
        extra_time = max(0, calmest_duration - fastest_duration)

        suggested_route = {
            "name": calmest_route.get("name", "Calmer Route"),
            "calm_score": calmest_score,
            "stress_level": calmest_route.get("stress_level", "MEDIUM"),
            "duration_minutes": calmest_duration,
            "distance_km": calmest_route.get("distance_km", 0.0),
            "extra_time_minutes": extra_time,
            "calm_score_improvement": improvement,
            "maps_url": maps_url,
            "stress_points": calmest_route.get("stress_points", []),
        }

        # Generate appropriate message based on improvement
        if improvement >= 30:
            message = f"I found a much calmer route! It's {improvement} points calmer and only adds {extra_time} minutes."
        else:
            message = f"There's a calmer route available (+{improvement} calm score, +{extra_time} min)."

        return {
            "reroute_available": True,
            "message": message,
            "current_route": {
                "calm_score": current_calm_score,
            },
            "suggested_route": suggested_route,
        }

    @track(name="RerouteAgent.should_suggest_reroute")
    def should_suggest_reroute(
        self,
        stress_score: float,
        current_calm_score: int,
    ) -> bool:
        """
        Determine if we should proactively suggest a reroute based on stress.

        Args:
            stress_score: Current stress score (0-1)
            current_calm_score: Current route's calm score

        Returns:
            True if reroute should be suggested
        """
        # Suggest reroute if:
        # 1. Stress is high (>= 0.6) AND route has room for improvement (<70 calm score)
        # 2. Stress is critical (>= 0.8)
        if stress_score >= 0.8:
            return True
        if stress_score >= 0.6 and current_calm_score < 70:
            return True
        return False

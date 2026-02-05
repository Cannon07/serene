"""
Route Planning API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.config import get_db
from models.database import User, Drive, DriveEvent
from models.enums import EventType
from models.schemas import (
    RoutePlanRequest,
    RoutePlanResponse,
    RoutePrepareRequest,
    RoutePrepareResponse,
    RouteResponse,
    StressPointResponse,
    StressPointWithTip,
    BreathingExercise,
    RerouteRequest,
    RerouteResponse,
    RerouteOption,
)
from services.maps_service import get_routes, generate_maps_deep_link, MapsServiceError
from agents.route_agent import RouteAgent
from agents.reroute_agent import RerouteAgent

router = APIRouter(prefix="/api/routes", tags=["routes"])

# In-memory cache for planned routes (keyed by route_id)
_route_cache: dict[str, dict] = {}

# Agent singletons
_route_agent = RouteAgent()
_reroute_agent = RerouteAgent()

# Tips for each stress point type
STRESS_TIPS = {
    "HIGHWAYS": "Stay in the middle lane when possible. Maintain a steady speed and keep safe following distance.",
    "HEAVY_TRAFFIC": "Keep safe following distance. Use this time for calming music or deep breathing.",
    "COMPLEX_INTERSECTIONS": "Stay in your lane early. Watch for lane markings and take your time.",
    "CONSTRUCTION": "Slow down and follow signs. Expect lane changes and be patient.",
    "PEDESTRIAN_AREAS": "Reduce speed and stay alert. Watch for crossing pedestrians.",
    "HONKING": "Stay calm and focus on your driving. Other drivers' impatience is not your concern.",
    "NIGHT_DRIVING": "Ensure headlights are on. Reduce speed and increase following distance.",
}

# Default tip for unknown types
DEFAULT_TIP = "Take your time and stay calm. You've got this."

# Breathing exercise
BREATHING_EXERCISE = BreathingExercise(
    name="4-7-8 Breathing",
    duration_seconds=120,
    instructions=[
        "Breathe in for 4 seconds",
        "Hold for 7 seconds",
        "Breathe out for 8 seconds",
        "Repeat 4 times"
    ]
)

# Maximum waypoints for deep links
MAX_WAYPOINTS = 5

# Base checklist items
BASE_CHECKLIST = [
    "Review stress points below",
    "Set phone to Do Not Disturb",
]


def _extract_waypoints(route: dict, max_waypoints: int = MAX_WAYPOINTS) -> list[dict]:
    """Extract key waypoints from route steps to make deep link route-specific."""
    steps = route.get("steps", [])
    if not steps:
        return []

    waypoints = []

    if len(steps) <= max_waypoints:
        for step in steps[:-1]:  # Exclude last step
            location = step.get("end_location", {})
            if location.get("latitude") and location.get("longitude"):
                waypoints.append({
                    "latitude": location["latitude"],
                    "longitude": location["longitude"]
                })
    else:
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

# Preference-based checklist items
PREFERENCE_CHECKLIST = {
    "CALMING_MUSIC": "Prepare calming playlist",
    "DEEP_BREATHING": "Optional: 2-minute breathing exercise before starting",
    "PULLING_OVER": "Identify potential rest stops along route",
    "TALKING": "Consider calling a friend for support during the drive",
    "SILENCE": "Ensure a quiet environment in the car",
}


async def _get_user_with_preferences(db: AsyncSession, user_id: str) -> User:
    """Fetch user with stress triggers and calming preferences."""
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.stress_triggers),
            selectinload(User.calming_preferences)
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/plan", response_model=RoutePlanResponse)
async def plan_routes(request: RoutePlanRequest, db: AsyncSession = Depends(get_db)):
    """
    Plan routes for a trip with calm scores.

    Fetches routes from Google Maps, analyzes them using the Route Agent,
    and returns routes with calm scores and stress points.
    """
    global _route_cache

    # 1. Fetch user with stress triggers
    user = await _get_user_with_preferences(db, request.user_id)

    # Convert user triggers to the format expected by RouteAgent
    user_triggers = [
        {"trigger": t.trigger, "severity": t.severity}
        for t in user.stress_triggers
    ]

    # 2. Fetch routes from Google Maps
    try:
        maps_result = await get_routes(
            origin=request.origin,
            destination=request.destination,
            alternatives=True,
            departure_time=request.departure_time,
        )
    except MapsServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Maps service error: {str(e)}"
        )

    raw_routes = maps_result.get("routes", [])
    if not raw_routes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No routes found between origin and destination"
        )

    # 3. Analyze routes with RouteAgent
    analyzed_routes = await _route_agent.analyze_routes(raw_routes, user_triggers)

    # 4. Cache routes for /prepare endpoint and build response
    _route_cache.clear()  # Clear previous cache

    response_routes = []
    for route in analyzed_routes:
        route_id = route.get("id", "")
        _route_cache[route_id] = route  # Cache full route data

        # Extract waypoints to make deep link route-specific
        waypoints = _extract_waypoints(route)

        # Generate Google Maps deep link with waypoints
        maps_url = generate_maps_deep_link(
            origin=request.origin,
            destination=request.destination,
            waypoints=waypoints,
        )

        response_routes.append(RouteResponse(
            id=route_id,
            name=route.get("name", ""),
            duration_minutes=route.get("duration_minutes", 0),
            distance_km=route.get("distance_km", 0.0),
            calm_score=route.get("calm_score", 0),
            stress_level=route.get("stress_level", "MEDIUM"),
            is_recommended=route.get("is_recommended", False),
            stress_points=[
                StressPointResponse(
                    location=sp.get("location", ""),
                    type=sp.get("type", ""),
                    severity=sp.get("severity", "MEDIUM"),
                )
                for sp in route.get("stress_points", [])
            ],
            polyline=route.get("polyline", ""),
            maps_url=maps_url,
        ))

    return RoutePlanResponse(routes=response_routes)


@router.post("/prepare", response_model=RoutePrepareResponse)
async def prepare_route(request: RoutePrepareRequest, db: AsyncSession = Depends(get_db)):
    """
    Get preparation details for a selected route.

    Returns a checklist, tips for stress points, and a breathing exercise.
    """
    # 1. Fetch user for calming preferences
    user = await _get_user_with_preferences(db, request.user_id)

    # 2. Retrieve route from cache
    route = _route_cache.get(request.route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route '{request.route_id}' not found. Please call /plan first."
        )

    # 3. Generate checklist based on user's calming preferences
    checklist = list(BASE_CHECKLIST)  # Copy base items

    for pref in user.calming_preferences:
        pref_value = pref.preference
        if pref_value in PREFERENCE_CHECKLIST:
            checklist.append(PREFERENCE_CHECKLIST[pref_value])

    # 4. Generate tips for each stress point
    stress_points_with_tips = []
    for sp in route.get("stress_points", []):
        sp_type = sp.get("type", "")
        tip = STRESS_TIPS.get(sp_type, DEFAULT_TIP)

        stress_points_with_tips.append(StressPointWithTip(
            location=sp.get("location", ""),
            type=sp_type,
            severity=sp.get("severity", "MEDIUM"),
            tip=tip,
        ))

    return RoutePrepareResponse(
        checklist=checklist,
        stress_points_with_tips=stress_points_with_tips,
        breathing_exercise=BREATHING_EXERCISE,
    )


@router.post("/reroute", response_model=RerouteResponse)
async def find_reroute(request: RerouteRequest, db: AsyncSession = Depends(get_db)):
    """
    Find a calmer alternative route from current location.

    Use this endpoint when a driver is experiencing stress and might benefit
    from a calmer route. Only suggests reroute if the alternative is
    significantly calmer (+20 calm score improvement).

    Returns Google Maps deep link for easy navigation to the new route.

    If drive_id is provided, records REROUTE_OFFERED event when a reroute is available.
    """
    # 1. Fetch user with stress triggers for personalization
    user = await _get_user_with_preferences(db, request.user_id)

    user_triggers = [
        {"trigger": t.trigger, "severity": t.severity}
        for t in user.stress_triggers
    ]

    # 2. Validate drive if drive_id provided
    drive = None
    if request.drive_id:
        drive_result = await db.execute(
            select(Drive).where(Drive.id == request.drive_id)
        )
        drive = drive_result.scalar_one_or_none()
        # Only use drive if it exists, belongs to user, and is active
        if drive and (drive.user_id != request.user_id or drive.completed_at):
            drive = None

    # 3. Find calmer route using RerouteAgent
    current_location = {
        "latitude": request.current_location.latitude,
        "longitude": request.current_location.longitude,
    }

    result = await _reroute_agent.find_calmer_route(
        current_location=current_location,
        destination=request.destination,
        current_calm_score=request.current_route_calm_score,
        user_triggers=user_triggers,
    )

    # 4. Build response
    suggested_route = None
    if result.get("suggested_route"):
        sr = result["suggested_route"]
        suggested_route = RerouteOption(
            name=sr.get("name", "Calmer Route"),
            calm_score=sr.get("calm_score", 0),
            stress_level=sr.get("stress_level", "MEDIUM"),
            duration_minutes=sr.get("duration_minutes", 0),
            distance_km=sr.get("distance_km", 0.0),
            extra_time_minutes=sr.get("extra_time_minutes", 0),
            calm_score_improvement=sr.get("calm_score_improvement", 0),
            maps_url=sr.get("maps_url", ""),
            stress_points=[
                StressPointResponse(
                    location=sp.get("location", ""),
                    type=sp.get("type", ""),
                    severity=sp.get("severity", "MEDIUM"),
                )
                for sp in sr.get("stress_points", [])
            ],
        )

    # 5. Record REROUTE_OFFERED event if drive_id provided and reroute available
    if drive and result.get("reroute_available"):
        event = DriveEvent(
            drive_id=drive.id,
            event_type=EventType.REROUTE_OFFERED.value,
            details={
                "route_name": suggested_route.name if suggested_route else None,
                "calm_score_improvement": suggested_route.calm_score_improvement if suggested_route else None,
                "extra_time_minutes": suggested_route.extra_time_minutes if suggested_route else None,
            },
        )
        db.add(event)

        # Increment reroutes_offered counter
        drive.reroutes_offered += 1
        await db.commit()

    return RerouteResponse(
        reroute_available=result.get("reroute_available", False),
        message=result.get("message", ""),
        current_route=result.get("current_route"),
        suggested_route=suggested_route,
    )

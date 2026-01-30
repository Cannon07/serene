import os
from typing import Optional
from datetime import datetime

import httpx

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# New API endpoints
ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"


class MapsServiceError(Exception):
    """Raised when Google Maps API returns an error."""
    pass


async def get_routes(
    origin: str,
    destination: str,
    alternatives: bool = True,
    departure_time: Optional[datetime] = None,
) -> dict:
    """
    Fetch routes from Google Routes API (New).

    Args:
        origin: Starting address or place
        destination: Ending address or place
        alternatives: Whether to return alternative routes
        departure_time: When to depart (defaults to now for traffic data)

    Returns:
        Dict with list of routes, each containing summary, duration, distance, steps, etc.

    Raises:
        MapsServiceError: If API key is missing or API returns an error
    """
    if not GOOGLE_MAPS_API_KEY:
        raise MapsServiceError("GOOGLE_MAPS_API_KEY not configured")

    # Build request body
    request_body = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": alternatives,
        "languageCode": "en-US",
        "units": "METRIC",
    }

    # Add departure time if specified
    if departure_time:
        request_body["departureTime"] = departure_time.isoformat() + "Z"

    # Headers for Routes API
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": (
            "routes.description,"
            "routes.duration,"
            "routes.staticDuration,"
            "routes.distanceMeters,"
            "routes.polyline.encodedPolyline,"
            "routes.legs.startLocation,"
            "routes.legs.endLocation,"
            "routes.legs.steps.navigationInstruction,"
            "routes.legs.steps.distanceMeters,"
            "routes.legs.steps.staticDuration,"
            "routes.legs.steps.polyline.encodedPolyline,"
            "routes.legs.steps.startLocation,"
            "routes.legs.steps.endLocation,"
            "routes.legs.localizedValues,"
            "routes.warnings,"
            "geocodingResults"
        ),
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            ROUTES_API_URL,
            json=request_body,
            headers=headers,
        )
        data = response.json()

    # Check for errors
    if "error" in data:
        error = data["error"]
        error_msg = error.get("message", error.get("status", "Unknown error"))
        raise MapsServiceError(f"Routes API error: {error_msg}")

    # Parse routes
    routes = []
    geocoding = data.get("geocodingResults", {})

    for route in data.get("routes", []):
        routes.append(get_route_details(route, geocoding))

    return {"routes": routes}


def get_route_details(route: dict, geocoding: dict = None) -> dict:
    """
    Extract structured details from a single Google Routes API route.

    Args:
        route: Raw route object from Google Routes API
        geocoding: Geocoding results from the response

    Returns:
        Structured route data with summary, duration, distance, steps, polyline, etc.
    """
    geocoding = geocoding or {}

    # Basic info
    description = route.get("description", "")
    warnings = route.get("warnings", [])
    polyline = route.get("polyline", {}).get("encodedPolyline", "")

    # Duration - Routes API returns duration as string like "1234s"
    duration_str = route.get("duration", "0s")
    duration_seconds = _parse_duration(duration_str)

    static_duration_str = route.get("staticDuration", "0s")
    static_duration_seconds = _parse_duration(static_duration_str)

    # Distance
    distance_meters = route.get("distanceMeters", 0)

    # Get the first leg (single origin-destination)
    legs = route.get("legs", [{}])
    leg = legs[0] if legs else {}

    # Localized values for display
    localized = leg.get("localizedValues", {})
    duration_text = localized.get("duration", {}).get("text", _format_duration(duration_seconds))
    distance_text = localized.get("distance", {}).get("text", _format_distance(distance_meters))
    static_duration_text = localized.get("staticDuration", {}).get("text", _format_duration(static_duration_seconds))

    # Start/end locations
    start_location = leg.get("startLocation", {}).get("latLng", {})
    end_location = leg.get("endLocation", {}).get("latLng", {})

    # Extract addresses from geocoding results
    origin_geocode = geocoding.get("origin", {}).get("geocoderStatus")
    dest_geocode = geocoding.get("destination", {}).get("geocoderStatus")

    # Extract steps
    steps = []
    for step in leg.get("steps", []):
        nav_instruction = step.get("navigationInstruction", {})
        step_duration_str = step.get("staticDuration", "0s")
        step_duration_seconds = _parse_duration(step_duration_str)

        steps.append({
            "instruction": nav_instruction.get("instructions", ""),
            "maneuver": nav_instruction.get("maneuver", ""),
            "distance_meters": step.get("distanceMeters", 0),
            "duration_seconds": step_duration_seconds,
            "start_location": step.get("startLocation", {}).get("latLng", {}),
            "end_location": step.get("endLocation", {}).get("latLng", {}),
            "polyline": step.get("polyline", {}).get("encodedPolyline", ""),
        })

    return {
        "summary": description,
        "duration_seconds": duration_seconds,
        "duration_text": duration_text,
        "duration_in_traffic_seconds": duration_seconds,  # With TRAFFIC_AWARE, duration includes traffic
        "duration_in_traffic_text": duration_text,
        "static_duration_seconds": static_duration_seconds,  # Without traffic
        "static_duration_text": static_duration_text,
        "distance_meters": distance_meters,
        "distance_text": distance_text,
        "start_location": start_location,
        "end_location": end_location,
        "steps": steps,
        "polyline": polyline,
        "warnings": warnings,
    }


def _parse_duration(duration_str: str) -> int:
    """Parse duration string like '1234s' to seconds."""
    if not duration_str:
        return 0
    return int(duration_str.rstrip("s"))


def _format_duration(seconds: int) -> str:
    """Format seconds to human readable string."""
    if seconds < 60:
        return f"{seconds} secs"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} mins"
    hours = minutes // 60
    remaining_mins = minutes % 60
    if remaining_mins:
        return f"{hours} hr {remaining_mins} mins"
    return f"{hours} hr"


def _format_distance(meters: int) -> str:
    """Format meters to human readable string."""
    if meters < 1000:
        return f"{meters} m"
    km = meters / 1000
    return f"{km:.1f} km"


async def get_place_autocomplete(
    query: str,
    location: Optional[dict] = None,
    radius: float = 50000.0,
) -> list[dict]:
    """
    Search for places using Google Places API (New) Autocomplete.

    Args:
        query: Search text (partial address or place name)
        location: Optional bias location as {"latitude": x, "longitude": y}
        radius: Search radius in meters (default 50km)

    Returns:
        List of place predictions with place_id, description, and structured info

    Raises:
        MapsServiceError: If API key is missing or API returns an error
    """
    if not GOOGLE_MAPS_API_KEY:
        raise MapsServiceError("GOOGLE_MAPS_API_KEY not configured")

    # Build request body
    request_body = {
        "input": query,
        "languageCode": "en",
    }

    # Add location bias if provided
    if location:
        request_body["locationBias"] = {
            "circle": {
                "center": location,
                "radius": radius,
            }
        }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            PLACES_AUTOCOMPLETE_URL,
            json=request_body,
            headers=headers,
        )
        data = response.json()

    # Check for errors
    if "error" in data:
        error = data["error"]
        error_msg = error.get("message", error.get("status", "Unknown error"))
        raise MapsServiceError(f"Places API error: {error_msg}")

    predictions = []
    for suggestion in data.get("suggestions", []):
        place_pred = suggestion.get("placePrediction")
        if place_pred:
            structured = place_pred.get("structuredFormat", {})
            predictions.append({
                "place_id": place_pred.get("placeId", ""),
                "description": place_pred.get("text", {}).get("text", ""),
                "main_text": structured.get("mainText", {}).get("text", ""),
                "secondary_text": structured.get("secondaryText", {}).get("text", ""),
                "types": place_pred.get("types", []),
            })

    return predictions

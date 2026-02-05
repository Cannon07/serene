from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

from models.enums import (
    ResolutionGoal,
    DrivingExperience,
    DrivingFrequency,
    StressTrigger,
    CalmingPreference,
)


# --- Nested schemas for triggers and preferences ---


class StressTriggerItem(BaseModel):
    trigger: StressTrigger
    severity: int = Field(ge=1, le=5)


class CalmingPreferenceItem(BaseModel):
    preference: CalmingPreference
    effectiveness: int = Field(ge=1, le=5)


# --- User schemas ---


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    resolution_goal: ResolutionGoal
    resolution_deadline: Optional[date] = None
    driving_experience: DrivingExperience
    driving_frequency: DrivingFrequency
    stress_triggers: list[StressTrigger] = Field(default_factory=list)
    calming_preferences: list[CalmingPreference] = Field(default_factory=list)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    resolution_goal: Optional[ResolutionGoal] = None
    resolution_deadline: Optional[date] = None
    driving_experience: Optional[DrivingExperience] = None
    driving_frequency: Optional[DrivingFrequency] = None
    stress_triggers: Optional[list[StressTrigger]] = None
    calming_preferences: Optional[list[CalmingPreference]] = None


class UserResponse(BaseModel):
    id: str
    name: str
    resolution_goal: ResolutionGoal
    resolution_deadline: Optional[date]
    driving_experience: DrivingExperience
    driving_frequency: DrivingFrequency
    stress_triggers: list[StressTriggerItem]
    calming_preferences: list[CalmingPreferenceItem]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStats(BaseModel):
    total_drives: int
    completed_drives: int
    average_pre_stress: Optional[float]
    average_post_stress: Optional[float]
    stress_improvement: Optional[float]
    reroute_acceptance_rate: Optional[float]
    drives_this_week: int
    current_streak: int


# --- Route Planning schemas ---


class RoutePlanRequest(BaseModel):
    user_id: str
    origin: str = Field(min_length=1)
    destination: str = Field(min_length=1)
    departure_time: Optional[datetime] = None


class RoutePrepareRequest(BaseModel):
    user_id: str
    route_id: str


class StressPointResponse(BaseModel):
    location: str
    type: str
    severity: str


class RouteResponse(BaseModel):
    id: str
    name: str
    duration_minutes: int
    distance_km: float
    calm_score: int
    stress_level: str
    is_recommended: bool
    stress_points: list[StressPointResponse]
    polyline: str
    maps_url: Optional[str] = None  # Google Maps deep link


class RoutePlanResponse(BaseModel):
    routes: list[RouteResponse]


class StressPointWithTip(BaseModel):
    location: str
    type: str
    severity: str
    tip: str


class BreathingExercise(BaseModel):
    name: str
    duration_seconds: int
    instructions: list[str]


class RoutePrepareResponse(BaseModel):
    checklist: list[str]
    stress_points_with_tips: list[StressPointWithTip]
    breathing_exercise: BreathingExercise


# --- Intervention schemas ---


class InterventionRequest(BaseModel):
    user_id: str
    drive_id: Optional[str] = None
    stress_score: float = Field(ge=0, le=1)
    stress_level: str = Field(pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    current_location: Optional[dict] = None  # {"latitude": x, "longitude": y}
    destination: Optional[str] = None  # For reroute suggestions
    current_route_calm_score: Optional[int] = None  # For reroute comparison
    context: Optional[str] = None


class BreathingContent(BaseModel):
    name: str
    duration_seconds: int
    instructions: list[str]
    audio_script: Optional[str] = None


class GroundingContent(BaseModel):
    name: str
    instructions: list[str]
    audio_script: Optional[str] = None


class RerouteOptionBrief(BaseModel):
    """Brief reroute option for intervention response."""
    current_route_calm_score: int
    alternative_route_name: str
    alternative_route_calm_score: int
    extra_time_minutes: int
    maps_url: str


class InterventionResponse(BaseModel):
    intervention_type: str
    stress_level: str
    stress_score: float
    message: str
    breathing_content: Optional[BreathingContent] = None
    grounding_content: Optional[GroundingContent] = None
    pull_over_guidance: Optional[list[str]] = None
    reroute_available: bool = False
    reroute_option: Optional[RerouteOptionBrief] = None
    sources: list[str] = Field(default_factory=list)


# --- Reroute schemas ---


class Location(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class RerouteRequest(BaseModel):
    user_id: str
    current_location: Location
    destination: str
    current_route_calm_score: Optional[int] = None  # For comparison


class RerouteOption(BaseModel):
    name: str
    calm_score: int
    stress_level: str
    duration_minutes: int
    distance_km: float
    extra_time_minutes: int  # Compared to fastest route
    calm_score_improvement: int  # Compared to current route
    maps_url: str  # Google Maps deep link
    stress_points: list[StressPointResponse]


class RerouteResponse(BaseModel):
    reroute_available: bool
    message: str
    current_route: Optional[dict] = None
    suggested_route: Optional[RerouteOption] = None


# --- Voice Command schemas ---


class VoiceCommandRequest(BaseModel):
    user_id: str
    drive_id: Optional[str] = None
    transcribed_text: str = Field(min_length=1)
    context: str = Field(default="DURING_DRIVE", pattern="^(PRE_DRIVE|DURING_DRIVE|POST_DRIVE)$")
    # Optional location for reroute/pull-over commands
    current_location: Optional[dict] = None  # {"latitude": x, "longitude": y}
    destination: Optional[str] = None
    current_route_calm_score: Optional[int] = None


class VoiceCommandResponse(BaseModel):
    understood: bool
    command_type: str  # STRESS_REPORT, REROUTE, PULL_OVER, ETA_UPDATE, END_DRIVE, UNKNOWN
    action: str  # TRIGGER_INTERVENTION, FIND_ROUTE, FIND_SAFE_SPOT, PROVIDE_ETA, START_DEBRIEF, NONE
    speech_response: str  # Text-to-speech friendly response
    intervention: Optional[dict] = None  # Intervention details if triggered
    reroute: Optional[dict] = None  # Reroute details if available
    eta_info: Optional[dict] = None  # ETA information if requested

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

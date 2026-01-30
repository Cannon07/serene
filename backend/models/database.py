import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, Date, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.config import Base
from models.enums import (
    ResolutionGoal,
    DrivingExperience,
    DrivingFrequency,
    StressTrigger,
    CalmingPreference,
    RouteType,
    EventType,
)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolution_goal: Mapped[str] = mapped_column(String(50))
    resolution_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    driving_experience: Mapped[str] = mapped_column(String(20))
    driving_frequency: Mapped[str] = mapped_column(String(20))

    stress_triggers: Mapped[list["UserStressTrigger"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    calming_preferences: Mapped[list["UserCalmingPreference"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    drives: Mapped[list["Drive"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserStressTrigger(Base):
    __tablename__ = "user_stress_triggers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    trigger: Mapped[str] = mapped_column(String(30))
    severity: Mapped[int] = mapped_column(Integer, default=3)

    user: Mapped["User"] = relationship(back_populates="stress_triggers")


class UserCalmingPreference(Base):
    __tablename__ = "user_calming_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    preference: Mapped[str] = mapped_column(String(30))
    effectiveness: Mapped[int] = mapped_column(Integer, default=3)

    user: Mapped["User"] = relationship(back_populates="calming_preferences")


class Drive(Base):
    __tablename__ = "drives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    origin: Mapped[str] = mapped_column(String(255))
    destination: Mapped[str] = mapped_column(String(255))
    selected_route_type: Mapped[str] = mapped_column(String(20))
    pre_drive_stress: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    post_drive_stress: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reroutes_offered: Mapped[int] = mapped_column(Integer, default=0)
    reroutes_accepted: Mapped[int] = mapped_column(Integer, default=0)
    interventions_triggered: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    user: Mapped["User"] = relationship(back_populates="drives")
    events: Mapped[list["DriveEvent"]] = relationship(
        back_populates="drive", cascade="all, delete-orphan"
    )


class DriveEvent(Base):
    __tablename__ = "drive_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    drive_id: Mapped[str] = mapped_column(String(36), ForeignKey("drives.id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    event_type: Mapped[str] = mapped_column(String(30))
    stress_level: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    drive: Mapped["Drive"] = relationship(back_populates="events")

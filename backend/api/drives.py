"""
Drives API for managing drive lifecycle.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database.config import get_db
from models.database import User, Drive, DriveEvent
from models.enums import EventType
from models.schemas import (
    DriveStartRequest,
    DriveStartResponse,
    DriveDetailResponse,
    DriveEventResponse,
    DriveEndResponse,
    DriveSummary,
    ActiveDriveResponse,
    DriveListResponse,
    DriveListItem,
    AcceptRerouteRequest,
    AcceptRerouteResponse,
)


router = APIRouter(prefix="/api/drives", tags=["drives"])


async def _validate_user(user_id: str, db: AsyncSession) -> User:
    """Validate user exists and return user object."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def _get_drive_with_events(
    drive_id: str, db: AsyncSession
) -> Optional[Drive]:
    """Fetch drive with events."""
    result = await db.execute(
        select(Drive)
        .options(selectinload(Drive.events))
        .where(Drive.id == drive_id)
    )
    return result.scalar_one_or_none()


async def _validate_drive_ownership(
    drive_id: str, user_id: str, db: AsyncSession
) -> Drive:
    """Validate drive exists and belongs to user."""
    drive = await _get_drive_with_events(drive_id, db)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")
    if drive.user_id != user_id:
        raise HTTPException(status_code=403, detail="Drive does not belong to this user")
    return drive


def _get_drive_status(drive: Drive) -> str:
    """Get drive status based on completed_at."""
    return "COMPLETED" if drive.completed_at else "IN_PROGRESS"


def _calculate_avg_stress(events: list[DriveEvent]) -> Optional[float]:
    """Calculate average stress level from events."""
    stress_events = [
        e.stress_level for e in events
        if e.stress_level is not None
    ]
    if not stress_events:
        return None
    return round(sum(stress_events) / len(stress_events), 2)


@router.post("/start", response_model=DriveStartResponse)
async def start_drive(
    request: DriveStartRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Start a new drive.

    Creates a new drive record with the provided details.
    The drive_id returned should be used for all subsequent
    drive-related API calls during the drive.
    """
    # Validate user exists
    await _validate_user(request.user_id, db)

    # Check if user already has an active drive
    result = await db.execute(
        select(Drive)
        .where(Drive.user_id == request.user_id)
        .where(Drive.completed_at.is_(None))
    )
    active_drive = result.scalar_one_or_none()
    if active_drive:
        raise HTTPException(
            status_code=409,
            detail=f"User already has an active drive (id: {active_drive.id}). End it before starting a new one."
        )

    # Create new drive
    drive = Drive(
        user_id=request.user_id,
        origin=request.origin,
        destination=request.destination,
        selected_route_type=request.selected_route_type,
        pre_drive_stress=request.pre_drive_stress,
        maps_url=request.maps_url,
    )
    db.add(drive)
    await db.commit()
    await db.refresh(drive)

    return DriveStartResponse(
        id=drive.id,
        user_id=drive.user_id,
        started_at=drive.started_at,
        origin=drive.origin,
        destination=drive.destination,
        selected_route_type=drive.selected_route_type,
        pre_drive_stress=drive.pre_drive_stress,
        maps_url=drive.maps_url,
        status="IN_PROGRESS",
    )


@router.get("/{drive_id}", response_model=DriveDetailResponse)
async def get_drive(
    drive_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get drive details with all events.

    Returns the complete drive record including all events
    that occurred during the drive.
    """
    drive = await _get_drive_with_events(drive_id, db)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    # Sort events by timestamp
    sorted_events = sorted(drive.events, key=lambda e: e.timestamp)

    return DriveDetailResponse(
        id=drive.id,
        user_id=drive.user_id,
        started_at=drive.started_at,
        completed_at=drive.completed_at,
        origin=drive.origin,
        destination=drive.destination,
        selected_route_type=drive.selected_route_type,
        pre_drive_stress=drive.pre_drive_stress,
        post_drive_stress=drive.post_drive_stress,
        interventions_triggered=drive.interventions_triggered,
        reroutes_offered=drive.reroutes_offered,
        reroutes_accepted=drive.reroutes_accepted,
        rating=drive.rating,
        events=[
            DriveEventResponse(
                id=e.id,
                timestamp=e.timestamp,
                event_type=e.event_type,
                stress_level=e.stress_level,
                details=e.details,
            )
            for e in sorted_events
        ],
    )


@router.post("/{drive_id}/end", response_model=DriveEndResponse)
async def end_drive(
    drive_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    End a drive.

    Marks the drive as completed and returns a summary of the drive
    including event counts and average stress level.
    """
    drive = await _get_drive_with_events(drive_id, db)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    if drive.completed_at:
        raise HTTPException(status_code=400, detail="Drive is already completed")

    # Mark drive as completed
    drive.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(drive)

    # Calculate duration
    duration = drive.completed_at - drive.started_at
    duration_minutes = int(duration.total_seconds() / 60)

    # Calculate summary
    avg_stress = _calculate_avg_stress(drive.events)

    return DriveEndResponse(
        id=drive.id,
        completed_at=drive.completed_at,
        duration_minutes=duration_minutes,
        summary=DriveSummary(
            events_count=len(drive.events),
            interventions_triggered=drive.interventions_triggered,
            reroutes_offered=drive.reroutes_offered,
            reroutes_accepted=drive.reroutes_accepted,
            avg_stress_level=avg_stress,
        ),
    )


@router.post("/{drive_id}/accept-reroute", response_model=AcceptRerouteResponse)
async def accept_reroute(
    drive_id: str,
    request: AcceptRerouteRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Record that user accepted a reroute suggestion.

    Creates a REROUTE_ACCEPTED event and increments the
    reroutes_accepted counter on the drive.
    """
    drive = await _get_drive_with_events(drive_id, db)
    if not drive:
        raise HTTPException(status_code=404, detail="Drive not found")

    if drive.completed_at:
        raise HTTPException(status_code=400, detail="Cannot modify a completed drive")

    # Create REROUTE_ACCEPTED event
    event = DriveEvent(
        drive_id=drive_id,
        event_type=EventType.REROUTE_ACCEPTED.value,
        details={
            "route_name": request.route_name,
            "calm_score_improvement": request.calm_score_improvement,
        },
    )
    db.add(event)

    # Increment counter
    drive.reroutes_accepted += 1
    await db.commit()

    return AcceptRerouteResponse(
        success=True,
        reroutes_accepted=drive.reroutes_accepted,
    )


# --- User-centric drive endpoints ---
# These are registered under /api/users but implemented here for cohesion


user_drives_router = APIRouter(prefix="/api/users", tags=["users", "drives"])


@user_drives_router.get("/{user_id}/active-drive")
async def get_active_drive(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's current active (in-progress) drive.

    Returns the active drive if one exists, or null if the user
    has no active drive. Useful when app is reopened mid-drive.
    """
    # Validate user exists
    await _validate_user(user_id, db)

    # Find active drive (not completed)
    result = await db.execute(
        select(Drive)
        .options(selectinload(Drive.events))
        .where(Drive.user_id == user_id)
        .where(Drive.completed_at.is_(None))
    )
    drive = result.scalar_one_or_none()

    if not drive:
        return {"active_drive": None}

    # Get latest stress level from events
    stress_events = [
        e for e in drive.events
        if e.stress_level is not None
    ]
    latest_stress = None
    if stress_events:
        latest_event = max(stress_events, key=lambda e: e.timestamp)
        latest_stress = latest_event.stress_level

    return ActiveDriveResponse(
        id=drive.id,
        started_at=drive.started_at,
        origin=drive.origin,
        destination=drive.destination,
        selected_route_type=drive.selected_route_type,
        pre_drive_stress=drive.pre_drive_stress,
        maps_url=drive.maps_url,
        events_count=len(drive.events),
        latest_stress_level=latest_stress,
    )


@user_drives_router.get("/{user_id}/drives", response_model=DriveListResponse)
async def list_user_drives(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: Optional[str] = Query(default=None, pattern="^(completed|in_progress)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    List user's drive history with pagination.

    Query parameters:
    - limit: Number of drives to return (default 10, max 100)
    - offset: Pagination offset (default 0)
    - status: Filter by "completed" or "in_progress" (optional)
    """
    # Validate user exists
    await _validate_user(user_id, db)

    # Build base query
    query = select(Drive).where(Drive.user_id == user_id)

    # Apply status filter
    if status == "completed":
        query = query.where(Drive.completed_at.is_not(None))
    elif status == "in_progress":
        query = query.where(Drive.completed_at.is_(None))

    # Get total count
    count_query = select(func.count(Drive.id)).where(Drive.user_id == user_id)
    if status == "completed":
        count_query = count_query.where(Drive.completed_at.is_not(None))
    elif status == "in_progress":
        count_query = count_query.where(Drive.completed_at.is_(None))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(Drive.started_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    drives = result.scalars().all()

    return DriveListResponse(
        drives=[
            DriveListItem(
                id=d.id,
                started_at=d.started_at,
                completed_at=d.completed_at,
                origin=d.origin,
                destination=d.destination,
                pre_drive_stress=d.pre_drive_stress,
                post_drive_stress=d.post_drive_stress,
                rating=d.rating,
            )
            for d in drives
        ],
        total=total,
        limit=limit,
        offset=offset,
    )

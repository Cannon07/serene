from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.config import get_db
from models.database import User, UserStressTrigger, UserCalmingPreference, Drive
from models.schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserStats,
    StressTriggerItem,
    CalmingPreferenceItem,
)

router = APIRouter(prefix="/api/users", tags=["users"])


def _user_to_response(user: User) -> UserResponse:
    """Convert database User model to response schema."""
    return UserResponse(
        id=user.id,
        name=user.name,
        resolution_goal=user.resolution_goal,
        resolution_deadline=user.resolution_deadline,
        driving_experience=user.driving_experience,
        driving_frequency=user.driving_frequency,
        stress_triggers=[
            StressTriggerItem(trigger=t.trigger, severity=t.severity)
            for t in user.stress_triggers
        ],
        calming_preferences=[
            CalmingPreferenceItem(preference=p.preference, effectiveness=p.effectiveness)
            for p in user.calming_preferences
        ],
        created_at=user.created_at,
    )


async def _get_user_or_404(db: AsyncSession, user_id: str) -> User:
    """Fetch user with relations or raise 404."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.stress_triggers), selectinload(User.calming_preferences))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def create_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user with onboarding data."""
    # Create user
    user = User(
        name=user_data.name,
        resolution_goal=user_data.resolution_goal.value,
        resolution_deadline=user_data.resolution_deadline,
        driving_experience=user_data.driving_experience.value,
        driving_frequency=user_data.driving_frequency.value,
    )
    db.add(user)
    await db.flush()  # Get user.id

    # Add stress triggers with default severity of 3
    for trigger in user_data.stress_triggers:
        db.add(UserStressTrigger(user_id=user.id, trigger=trigger.value, severity=3))

    # Add calming preferences with default effectiveness of 3
    for preference in user_data.calming_preferences:
        db.add(UserCalmingPreference(user_id=user.id, preference=preference.value, effectiveness=3))

    await db.commit()

    # Reload with relations
    user = await _get_user_or_404(db, user.id)
    return _user_to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get user profile with triggers and preferences."""
    user = await _get_user_or_404(db, user_id)
    return _user_to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, db: AsyncSession = Depends(get_db)):
    """Update user profile. Triggers and preferences are replaced if provided."""
    user = await _get_user_or_404(db, user_id)

    # Update scalar fields if provided
    if user_data.name is not None:
        user.name = user_data.name
    if user_data.resolution_goal is not None:
        user.resolution_goal = user_data.resolution_goal.value
    if user_data.resolution_deadline is not None:
        user.resolution_deadline = user_data.resolution_deadline
    if user_data.driving_experience is not None:
        user.driving_experience = user_data.driving_experience.value
    if user_data.driving_frequency is not None:
        user.driving_frequency = user_data.driving_frequency.value

    # Replace stress triggers if provided
    if user_data.stress_triggers is not None:
        # Delete existing
        for trigger in user.stress_triggers:
            await db.delete(trigger)
        # Add new with default severity
        for trigger in user_data.stress_triggers:
            db.add(UserStressTrigger(user_id=user.id, trigger=trigger.value, severity=3))

    # Replace calming preferences if provided
    if user_data.calming_preferences is not None:
        # Delete existing
        for pref in user.calming_preferences:
            await db.delete(pref)
        # Add new with default effectiveness
        for preference in user_data.calming_preferences:
            db.add(UserCalmingPreference(user_id=user.id, preference=preference.value, effectiveness=3))

    await db.commit()

    # Reload with relations
    user = await _get_user_or_404(db, user.id)
    return _user_to_response(user)


@router.get("/{user_id}/stats", response_model=UserStats)
async def get_user_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get user driving statistics."""
    # Verify user exists
    await _get_user_or_404(db, user_id)

    # Get all drives for user
    result = await db.execute(select(Drive).where(Drive.user_id == user_id))
    drives = result.scalars().all()

    total_drives = len(drives)
    completed_drives = len([d for d in drives if d.completed_at is not None])

    # Calculate averages
    pre_stresses = [d.pre_drive_stress for d in drives if d.pre_drive_stress is not None]
    post_stresses = [d.post_drive_stress for d in drives if d.post_drive_stress is not None]

    avg_pre = sum(pre_stresses) / len(pre_stresses) if pre_stresses else None
    avg_post = sum(post_stresses) / len(post_stresses) if post_stresses else None

    # Stress improvement (positive means improvement)
    stress_improvement = None
    if avg_pre is not None and avg_post is not None:
        stress_improvement = round(avg_pre - avg_post, 2)

    # Reroute acceptance rate
    total_reroutes_offered = sum(d.reroutes_offered for d in drives)
    total_reroutes_accepted = sum(d.reroutes_accepted for d in drives)
    reroute_rate = None
    if total_reroutes_offered > 0:
        reroute_rate = round(total_reroutes_accepted / total_reroutes_offered, 2)

    # Drives this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    drives_this_week = len([d for d in drives if d.started_at >= week_ago])

    # Current streak (consecutive days with at least one drive, ending today or yesterday)
    current_streak = _calculate_streak(drives)

    return UserStats(
        total_drives=total_drives,
        completed_drives=completed_drives,
        average_pre_stress=round(avg_pre, 2) if avg_pre else None,
        average_post_stress=round(avg_post, 2) if avg_post else None,
        stress_improvement=stress_improvement,
        reroute_acceptance_rate=reroute_rate,
        drives_this_week=drives_this_week,
        current_streak=current_streak,
    )


def _calculate_streak(drives: list[Drive]) -> int:
    """Calculate current driving streak (consecutive days)."""
    if not drives:
        return 0

    # Get unique dates with drives, sorted descending
    drive_dates = sorted(set(d.started_at.date() for d in drives), reverse=True)
    if not drive_dates:
        return 0

    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    # Streak must start from today or yesterday
    if drive_dates[0] != today and drive_dates[0] != yesterday:
        return 0

    streak = 1
    for i in range(1, len(drive_dates)):
        expected_date = drive_dates[i - 1] - timedelta(days=1)
        if drive_dates[i] == expected_date:
            streak += 1
        else:
            break

    return streak

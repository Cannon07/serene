"""
Metrics API for dashboard aggregations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database.config import get_db
from models.database import Drive, DriveEvent, User


router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/dashboard")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """
    Get aggregated metrics for dashboard.

    Returns:
    - Total drives, completions, completion rate
    - Average stress improvement
    - Total interventions triggered
    - Reroute acceptance rate
    """
    # Total drives
    total_drives = await db.scalar(select(func.count(Drive.id)))
    completed_drives = await db.scalar(
        select(func.count(Drive.id)).where(Drive.completed_at.isnot(None))
    )

    # Average stress improvement
    stress_query = await db.execute(
        select(
            func.avg(Drive.pre_drive_stress),
            func.avg(Drive.post_drive_stress)
        ).where(
            Drive.pre_drive_stress.isnot(None),
            Drive.post_drive_stress.isnot(None)
        )
    )
    avg_pre, avg_post = stress_query.one()

    # Intervention counts
    intervention_count = await db.scalar(
        select(func.sum(Drive.interventions_triggered))
    )

    # Reroute acceptance
    reroutes_offered = await db.scalar(
        select(func.sum(Drive.reroutes_offered))
    )
    reroutes_accepted = await db.scalar(
        select(func.sum(Drive.reroutes_accepted))
    )

    # Calculate derived metrics
    total = total_drives or 0
    completed = completed_drives or 0
    completion_rate = round(completed / total, 3) if total > 0 else 0

    stress_improvement = None
    if avg_pre is not None and avg_post is not None:
        stress_improvement = round(avg_pre - avg_post, 3)

    offered = reroutes_offered or 0
    accepted = reroutes_accepted or 0
    acceptance_rate = round(accepted / offered, 3) if offered > 0 else 0

    return {
        "drives": {
            "total": total,
            "completed": completed,
            "completion_rate": completion_rate,
        },
        "stress": {
            "avg_pre_drive": round(avg_pre, 3) if avg_pre else None,
            "avg_post_drive": round(avg_post, 3) if avg_post else None,
            "avg_improvement": stress_improvement,
        },
        "interventions": {
            "total_triggered": intervention_count or 0,
        },
        "reroutes": {
            "offered": offered,
            "accepted": accepted,
            "acceptance_rate": acceptance_rate,
        },
    }


@router.get("/user/{user_id}")
async def get_user_metrics(user_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get metrics for a specific user.

    Returns user's drive stats, stress improvement, and reroute engagement.
    """
    # Validate user exists
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # User's drives
    user_drives = await db.execute(
        select(Drive).where(Drive.user_id == user_id)
    )
    drives = user_drives.scalars().all()

    if not drives:
        return {
            "user_id": user_id,
            "drives": {
                "total": 0,
                "completed": 0,
            },
            "stress": {
                "avg_improvement": None,
            },
            "interventions": 0,
            "reroutes": {
                "offered": 0,
                "accepted": 0,
            },
        }

    completed = [d for d in drives if d.completed_at]
    with_stress = [
        d for d in completed
        if d.pre_drive_stress is not None and d.post_drive_stress is not None
    ]

    avg_improvement = None
    if with_stress:
        improvements = [d.pre_drive_stress - d.post_drive_stress for d in with_stress]
        avg_improvement = round(sum(improvements) / len(improvements), 3)

    return {
        "user_id": user_id,
        "drives": {
            "total": len(drives),
            "completed": len(completed),
        },
        "stress": {
            "avg_improvement": avg_improvement,
        },
        "interventions": sum(d.interventions_triggered for d in drives),
        "reroutes": {
            "offered": sum(d.reroutes_offered for d in drives),
            "accepted": sum(d.reroutes_accepted for d in drives),
        },
    }


@router.get("/events/summary")
async def get_event_summary(db: AsyncSession = Depends(get_db)):
    """
    Get summary of drive events by type.

    Returns count of each event type across all drives.
    """
    # Count events by type
    event_counts = await db.execute(
        select(
            DriveEvent.event_type,
            func.count(DriveEvent.id).label("count")
        ).group_by(DriveEvent.event_type)
    )

    events = {row.event_type: row.count for row in event_counts}

    return {
        "events": events,
        "total": sum(events.values()),
    }

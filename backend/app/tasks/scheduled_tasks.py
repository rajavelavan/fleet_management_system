import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.delivery import Delivery, DeliveryStatus
from app.models.geofence import Alert, AlertSeverity, AlertType
from app.models.vehicle import Vehicle, VehicleStatus

logger = logging.getLogger("celery.tasks")


def run_async(coro):
    """Utility to run asynchronous DB operations within sync Celery tasks."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # In an active event loop (e.g. pytest-asyncio or async context)
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


async def _async_mark_unresponsive_vehicles(threshold_minutes: int = 15, session=None) -> dict:
    cutoff_time = datetime.now(UTC) - timedelta(minutes=threshold_minutes)

    async def _execute(s):
        # 1. Identify non-OFFLINE vehicles whose last_seen_at is older than cutoff or None
        query = select(Vehicle).where(
            Vehicle.deleted_at.is_(None),
            Vehicle.status != VehicleStatus.OFFLINE,
            (Vehicle.last_seen_at < cutoff_time) | (Vehicle.last_seen_at.is_(None)),
        )
        res = await s.execute(query)
        unresponsive_vehicles = res.scalars().all()

        updated_count = 0
        new_alerts = []
        for vehicle in unresponsive_vehicles:
            vehicle.status = VehicleStatus.OFFLINE
            updated_count += 1

            # Create an OFFLINE alert for the vehicle
            alert = Alert(
                vehicle_id=vehicle.id,
                alert_type=AlertType.OFFLINE,
                severity=AlertSeverity.WARNING.value,
                message=f"Vehicle {vehicle.plate_number} has not reported GPS telemetry in over {threshold_minutes} minutes and was marked OFFLINE.",
                metadata_={
                    "plate_number": vehicle.plate_number,
                    "last_seen_at": vehicle.last_seen_at.isoformat() if vehicle.last_seen_at else None,
                    "threshold_minutes": threshold_minutes,
                },
            )
            new_alerts.append(alert)

        if new_alerts:
            s.add_all(new_alerts)

        await s.commit()
        logger.info(f"Marked {updated_count} vehicles as OFFLINE (cutoff={cutoff_time.isoformat()}).")
        return {
            "marked_offline_count": updated_count,
            "cutoff_time": cutoff_time.isoformat(),
        }

    if session:
        return await _execute(session)
    async with AsyncSessionLocal() as s:
        return await _execute(s)


async def _async_daily_fleet_summary(session=None) -> dict:
    now = datetime.now(UTC)
    yesterday = now - timedelta(days=1)

    async def _execute(s):
        # Deliveries completed in the past 24 hours
        d_query = select(func.count()).select_from(Delivery).where(
            Delivery.delivered_at >= yesterday,
            Delivery.status == DeliveryStatus.DELIVERED,
        )
        delivered_count = (await s.execute(d_query)).scalar_one() or 0

        # Deliveries created
        c_query = select(func.count()).select_from(Delivery).where(
            Delivery.created_at >= yesterday,
        )
        created_count = (await s.execute(c_query)).scalar_one() or 0

        # Active vehicles
        v_query = select(func.count()).select_from(Vehicle).where(
            Vehicle.deleted_at.is_(None),
            Vehicle.status == VehicleStatus.ACTIVE,
        )
        active_vehicles = (await s.execute(v_query)).scalar_one() or 0

        # Alerts triggered in last 24h
        a_query = select(func.count()).select_from(Alert).where(
            Alert.triggered_at >= yesterday,
        )
        alerts_24h = (await s.execute(a_query)).scalar_one() or 0

        summary = {
            "timestamp": now.isoformat(),
            "period": "past_24_hours",
            "delivered_count": delivered_count,
            "created_count": created_count,
            "active_vehicles": active_vehicles,
            "alerts_count": alerts_24h,
        }
        logger.info(f"Daily Fleet Summary generated: {summary}")
        return summary

    if session:
        return await _execute(session)
    async with AsyncSessionLocal() as s:
        return await _execute(s)


@celery_app.task(name="app.tasks.scheduled_tasks.mark_unresponsive_vehicles_offline")
def mark_unresponsive_vehicles_offline():
    """Hourly background cron task: marks vehicles with no GPS ping for >15 mins as OFFLINE."""
    return run_async(_async_mark_unresponsive_vehicles(threshold_minutes=15))


@celery_app.task(name="app.tasks.scheduled_tasks.daily_fleet_summary_digest")
def daily_fleet_summary_digest():
    """Daily background cron task: generates 24h summary digest of deliveries, fleet, and alerts."""
    return run_async(_async_daily_fleet_summary())

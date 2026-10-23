import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Optional

import redis.asyncio as aioredis
from geoalchemy2.functions import ST_Covers, ST_GeogFromText
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis_client
from app.models.geofence import Alert, AlertSeverity, AlertType, Geofence
from app.models.user import User
from app.models.vehicle import Vehicle

logger = logging.getLogger("geofence.engine")


async def evaluate_geofences_for_ping(
    db: AsyncSession,
    redis_client: aioredis.Redis,
    vehicle: Vehicle,
    latitude: float,
    longitude: float,
    speed: Optional[float],
    recorded_at: datetime,
) -> list[Alert]:
    """
    Statefully evaluate geofences and speeding checks for an ingested telemetry ping.
    
    1. Spatial Query: Find all active geofences whose POLYGON covers POINT(lng lat).
    2. Redis Sets: Query 'vehicle:{vehicle_id}:active_geofences'
       - Newly entered geofences: in current matches but NOT in Redis -> create GEOFENCE_ENTRY
       - Exited geofences: in Redis but NOT in current matches -> create GEOFENCE_EXIT
    3. Speeding Query:
       - Check if current vehicle speed exceeds any matched geofence's speed_limit.
       - If speeding, create SPEEDING alert.
    4. Save generated alerts to Postgres 'alerts' table.
    5. Publish generated alerts to Redis:
       - 'alerts:broadcast' (global alert stream)
       - 'alerts:{user_id}' for all active dispatchers and admins.
    """
    generated_alerts: list[Alert] = []

    try:
        point_wkt = f"SRID=4326;POINT({longitude} {latitude})"
        point_geom = ST_GeogFromText(point_wkt)

        # 1. Query PostGIS for active geofences containing this location
        query = select(Geofence).where(
            Geofence.is_active.is_(True),
            ST_Covers(Geofence.area, point_geom),
        )
        result = await db.execute(query)
        current_matched_geofences = result.scalars().all()
        current_geofence_map = {str(gf.id): gf for gf in current_matched_geofences}
        current_geofence_ids = set(current_geofence_map.keys())

        # 2. Redis state comparison
        redis_key = f"vehicle:{vehicle.id}:active_geofences"
        previous_geofence_ids: set[str] = set(await redis_client.smembers(redis_key))

        entered_ids = current_geofence_ids - previous_geofence_ids
        exited_ids = previous_geofence_ids - current_geofence_ids

        # Fetch exited geofences details if any exited
        exited_geofence_map: dict[str, Geofence] = {}
        if exited_ids:
            try:
                exited_uuids = [uuid.UUID(gid) for gid in exited_ids]
                exited_res = await db.execute(select(Geofence).where(Geofence.id.in_(exited_uuids)))
                for gf in exited_res.scalars().all():
                    exited_geofence_map[str(gf.id)] = gf
            except Exception as e:
                logger.warning(f"Error resolving exited geofences: {e}")

        # Process GEOFENCE_ENTRY
        for gid in entered_ids:
            gf = current_geofence_map.get(gid)
            gf_name = gf.name if gf else f"Zone {gid[:8]}"
            alert = Alert(
                id=uuid.uuid4(),
                vehicle_id=vehicle.id,
                alert_type=AlertType.GEOFENCE_ENTRY,
                severity=AlertSeverity.INFO.value,
                message=f"Vehicle {vehicle.plate_number} entered geofence '{gf_name}'",
                metadata_={
                    "geofence_id": gid,
                    "geofence_name": gf_name,
                    "latitude": latitude,
                    "longitude": longitude,
                    "speed": speed,
                    "triggered_at": recorded_at.isoformat(),
                    "plate_number": vehicle.plate_number,
                },
                is_read=False,
                triggered_at=recorded_at,
            )
            db.add(alert)
            generated_alerts.append(alert)
            await redis_client.sadd(redis_key, gid)

        # Process GEOFENCE_EXIT
        for gid in exited_ids:
            gf = exited_geofence_map.get(gid)
            gf_name = gf.name if gf else f"Zone {gid[:8]}"
            alert = Alert(
                id=uuid.uuid4(),
                vehicle_id=vehicle.id,
                alert_type=AlertType.GEOFENCE_EXIT,
                severity=AlertSeverity.WARNING.value,
                message=f"Vehicle {vehicle.plate_number} exited geofence '{gf_name}'",
                metadata_={
                    "geofence_id": gid,
                    "geofence_name": gf_name,
                    "latitude": latitude,
                    "longitude": longitude,
                    "speed": speed,
                    "triggered_at": recorded_at.isoformat(),
                    "plate_number": vehicle.plate_number,
                },
                is_read=False,
                triggered_at=recorded_at,
            )
            db.add(alert)
            generated_alerts.append(alert)
            await redis_client.srem(redis_key, gid)

        # 3. Check for SPEEDING inside geofences with defined speed_limit
        if speed is not None and speed > 0:
            for gf in current_matched_geofences:
                if gf.speed_limit is not None and speed > gf.speed_limit:
                    speed_diff = round(speed - gf.speed_limit, 1)
                    alert = Alert(
                        id=uuid.uuid4(),
                        vehicle_id=vehicle.id,
                        alert_type=AlertType.SPEEDING,
                        severity=AlertSeverity.CRITICAL.value if speed_diff > 20 else AlertSeverity.WARNING.value,
                        message=f"Speeding detected: Vehicle {vehicle.plate_number} is driving at {speed:.1f} km/h (limit: {gf.speed_limit:.1f} km/h in '{gf.name}')",
                        metadata_={
                            "geofence_id": str(gf.id),
                            "geofence_name": gf.name,
                            "speed": speed,
                            "speed_limit": gf.speed_limit,
                            "exceeded_by": speed_diff,
                            "latitude": latitude,
                            "longitude": longitude,
                            "triggered_at": recorded_at.isoformat(),
                            "plate_number": vehicle.plate_number,
                        },
                        is_read=False,
                        triggered_at=recorded_at,
                    )
                    db.add(alert)
                    generated_alerts.append(alert)

        # 4. Commit alerts to Postgres if any generated
        if generated_alerts:
            await db.commit()
            for a in generated_alerts:
                await db.refresh(a)

            # 5. Broadcast alerts to Redis pub/sub
            await broadcast_alerts(db, redis_client, generated_alerts, vehicle.plate_number)

    except Exception as e:
        logger.error(f"Error in geofence detection engine: {e}", exc_info=True)

    return generated_alerts


async def broadcast_alerts(
    db: AsyncSession,
    redis_client: aioredis.Redis,
    alerts: list[Alert],
    plate_number: str,
):
    """
    Publish alerts to Redis:
    - 'alerts:broadcast' channel for all listening clients.
    - 'alerts:{user_id}' channels for dispatchers and admins.
    """
    try:
        # Fetch active admin and dispatcher user IDs to deliver targeted notifications
        stmt = select(User.id).where(
            User.is_active.is_(True),
            User.role.in_(["ADMIN", "DISPATCHER"]),
        )
        res = await db.execute(stmt)
        user_ids = [str(uid) for uid in res.scalars().all()]

        for alert in alerts:
            alert_payload = {
                "type": "alert",
                "alert": {
                    "id": str(alert.id),
                    "vehicle_id": str(alert.vehicle_id),
                    "plate_number": plate_number,
                    "alert_type": alert.alert_type.value if hasattr(alert.alert_type, "value") else str(alert.alert_type),
                    "severity": alert.severity,
                    "message": alert.message,
                    "metadata": alert.metadata_,
                    "is_read": alert.is_read,
                    "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else datetime.now(UTC).isoformat(),
                },
            }
            payload_str = json.dumps(alert_payload)

            # Global alert channel
            await redis_client.publish("alerts:broadcast", payload_str)

            # Per-user alert channels: alerts:{user_id}
            for uid in user_ids:
                channel = f"alerts:{uid}"
                await redis_client.publish(channel, payload_str)

    except Exception as e:
        logger.error(f"Failed to broadcast alerts to Redis: {e}", exc_info=True)

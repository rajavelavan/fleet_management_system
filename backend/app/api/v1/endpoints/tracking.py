import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from geoalchemy2.functions import ST_GeogFromText
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis_client
from app.core.ws_manager import ws_manager
from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.vehicle_location import VehicleLocation
from app.schemas.tracking import (
    LocationIngestRequest,
    LocationIngestResponse,
)
from app.services.geofence_service import evaluate_geofences_for_ping

logger = logging.getLogger("tracking.api")
router = APIRouter()


@router.post(
    "/ingest",
    response_model=LocationIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest GPS Telemetry Ping",
    description="Validates GPS payload, persists to PostGIS vehicle_locations, updates vehicles quick-access fields, and publishes event to Redis channel 'vehicle:{vehicle_id}:location'.",
)
async def ingest_location(
    payload: LocationIngestRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LocationIngestResponse:
    # 1. Verify vehicle exists and is not soft-deleted
    v_stmt = select(Vehicle).where(
        Vehicle.id == payload.vehicle_id,
        Vehicle.deleted_at.is_(None),
    )
    vehicle = (await db.execute(v_stmt)).scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{payload.vehicle_id}' not found",
        )

    # 2. Determine recorded_at
    recorded_at = payload.recorded_at or datetime.now(UTC)

    # 3. Create PostGIS POINT Geography: POINT(lng lat)
    point_wkt = f"SRID=4326;POINT({payload.longitude} {payload.latitude})"
    location_geom = ST_GeogFromText(point_wkt)

    # 4. Insert into vehicle_locations
    location_record = VehicleLocation(
        id=uuid.uuid4(),
        vehicle_id=payload.vehicle_id,
        location=location_geom,
        speed=payload.speed,
        heading=payload.heading,
        altitude=payload.altitude,
        accuracy=payload.accuracy,
        recorded_at=recorded_at,
    )
    db.add(location_record)

    # 5. Update vehicle quick-access fields for lightning-fast dashboard/map renders
    vehicle.last_lat = payload.latitude
    vehicle.last_lng = payload.longitude
    vehicle.last_speed = payload.speed
    vehicle.last_seen_at = recorded_at

    await db.commit()

    # 6. Publish real-time event to Redis channel "vehicle:{vehicle_id}:location"
    event_data = {
        "id": str(location_record.id),
        "vehicle_id": str(payload.vehicle_id),
        "plate_number": vehicle.plate_number,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "speed": payload.speed,
        "heading": payload.heading,
        "altitude": payload.altitude,
        "accuracy": payload.accuracy,
        "recorded_at": recorded_at.isoformat(),
        "type": "location_update",
    }

    try:
        redis_client = await get_redis_client()
        channel_name = f"vehicle:{payload.vehicle_id}:location"
        await redis_client.publish(channel_name, json.dumps(event_data))

        # 7. Stateful Geofence Detection Engine (FastAPI async ingestion flow without Celery)
        await evaluate_geofences_for_ping(
            db=db,
            redis_client=redis_client,
            vehicle=vehicle,
            latitude=payload.latitude,
            longitude=payload.longitude,
            speed=payload.speed,
            recorded_at=recorded_at,
        )
    except Exception as e:
        logger.error(f"Failed to publish GPS ping or evaluate geofences: {e}", exc_info=True)

    return LocationIngestResponse(
        id=location_record.id,
        vehicle_id=payload.vehicle_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        speed=payload.speed,
        heading=payload.heading,
        altitude=payload.altitude,
        accuracy=payload.accuracy,
        recorded_at=recorded_at,
        message="GPS ping ingested and broadcasted successfully",
    )


@router.websocket("/ws/tracking")
async def websocket_tracking_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time fleet telemetry streaming.
    Allows clients to subscribe to specific vehicle IDs or wildcard '*' for all vehicles.
    Receives live telemetry broadcasts within ~100ms.

    Protocol:
      - Client sends JSON:
        {"action": "subscribe", "vehicle_id": "c343a90b-..."} or {"action": "subscribe", "vehicle_ids": ["...", "..."]}
        {"action": "subscribe", "vehicle_id": "*"} (subscribe to all vehicles)
        {"action": "unsubscribe", "vehicle_id": "..."}
      - Server sends JSON:
        {"type": "subscribed", "vehicle_id": "..."}
        {"type": "location_update", ...}
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Invalid JSON format"})
                )
                continue

            action = msg.get("action")
            if action == "subscribe":
                # Single vehicle_id or list of vehicle_ids
                if "vehicle_ids" in msg and isinstance(msg["vehicle_ids"], list):
                    for v_id in msg["vehicle_ids"]:
                        await ws_manager.subscribe(websocket, str(v_id))
                    await websocket.send_text(
                        json.dumps({
                            "type": "subscribed",
                            "vehicle_ids": [str(v) for v in msg["vehicle_ids"]],
                        })
                    )
                elif "vehicle_id" in msg:
                    v_id = str(msg["vehicle_id"])
                    await ws_manager.subscribe(websocket, v_id)
                    await websocket.send_text(
                        json.dumps({"type": "subscribed", "vehicle_id": v_id})
                    )
                else:
                    await websocket.send_text(
                        json.dumps({
                            "type": "error",
                            "message": "Missing 'vehicle_id' or 'vehicle_ids' in subscribe action",
                        })
                    )

            elif action == "unsubscribe":
                if "vehicle_id" in msg:
                    v_id = str(msg["vehicle_id"])
                    await ws_manager.unsubscribe(websocket, v_id)
                    await websocket.send_text(
                        json.dumps({"type": "unsubscribed", "vehicle_id": v_id})
                    )
                else:
                    await websocket.send_text(
                        json.dumps({
                            "type": "error",
                            "message": "Missing 'vehicle_id' in unsubscribe action",
                        })
                    )

            elif action == "subscribe_alerts":
                # Subscribe to specific user alerts channel or all alerts
                user_id = msg.get("user_id")
                if user_id:
                    await ws_manager.subscribe_user_alerts(websocket, str(user_id))
                    await websocket.send_text(
                        json.dumps({"type": "subscribed_alerts", "user_id": str(user_id)})
                    )
                else:
                    await websocket.send_text(
                        json.dumps({"type": "subscribed_alerts", "channel": "broadcast"})
                    )

            elif action == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            else:
                await websocket.send_text(
                    json.dumps({
                        "type": "error",
                        "message": f"Unknown action: '{action}'",
                    })
                )

    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        await ws_manager.disconnect(websocket)

import json
import logging
import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.functions import ST_AsGeoJSON, ST_GeogFromText
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_dispatcher
from app.database import get_db
from app.models.geofence import Alert, Geofence
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.geofence import (
    AlertResponse,
    AlertStatsResponse,
    Coordinate,
    GeofenceCreate,
    GeofenceResponse,
    GeofenceUpdate,
)

logger = logging.getLogger("geofence.api")
router = APIRouter()


def coords_to_wkt_polygon(coordinates: List[Coordinate]) -> str:
    """Convert Coordinate list (lat/lng) to PostGIS POLYGON((lng lat, ...)) WKT."""
    ring_points = [f"{c.lng} {c.lat}" for c in coordinates]
    # Ensure closure
    if ring_points[0] != ring_points[-1]:
        ring_points.append(ring_points[0])
    wkt = f"SRID=4326;POLYGON(({', '.join(ring_points)}))"
    return wkt


def parse_geofence_coordinates(geofence: Geofence) -> tuple[List[Coordinate], Optional[dict]]:
    """Convert GeoAlchemy2 geography to coordinate list and GeoJSON geometry."""
    try:
        shape_geom = to_shape(geofence.area)
        coords = [
            Coordinate(lat=point[1], lng=point[0])
            for point in shape_geom.exterior.coords
        ]
        geojson = {
            "type": "Polygon",
            "coordinates": [[[p[0], p[1]] for p in shape_geom.exterior.coords]],
        }
        return coords, geojson
    except Exception as e:
        logger.warning(f"Error parsing polygon coordinates for geofence {geofence.id}: {e}")
        return [], None


# ---------------------------------------------------------
# Geofences CRUD
# ---------------------------------------------------------

@router.post(
    "/geofences",
    response_model=GeofenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Geofence Zone",
)
async def create_geofence(
    payload: GeofenceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
) -> GeofenceResponse:
    wkt = coords_to_wkt_polygon(payload.coordinates)
    area_geom = ST_GeogFromText(wkt)

    geofence = Geofence(
        id=uuid.uuid4(),
        name=payload.name,
        description=payload.description,
        area=area_geom,
        is_active=payload.is_active,
        speed_limit=payload.speed_limit,
        created_by=current_user.id,
    )
    db.add(geofence)
    await db.commit()
    await db.refresh(geofence)

    coords, geojson = parse_geofence_coordinates(geofence)
    return GeofenceResponse(
        id=geofence.id,
        name=geofence.name,
        description=geofence.description,
        is_active=geofence.is_active,
        speed_limit=geofence.speed_limit,
        created_by=geofence.created_by,
        created_at=geofence.created_at,
        updated_at=geofence.updated_at,
        coordinates=coords,
        geojson=geojson,
    )


@router.get(
    "/geofences",
    response_model=List[GeofenceResponse],
    summary="List all Geofences",
)
async def list_geofences(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
) -> List[GeofenceResponse]:
    stmt = select(Geofence).order_by(Geofence.created_at.desc())
    if is_active is not None:
        stmt = stmt.where(Geofence.is_active == is_active)

    res = await db.execute(stmt)
    geofences = res.scalars().all()

    responses = []
    for gf in geofences:
        coords, geojson = parse_geofence_coordinates(gf)
        responses.append(
            GeofenceResponse(
                id=gf.id,
                name=gf.name,
                description=gf.description,
                is_active=gf.is_active,
                speed_limit=gf.speed_limit,
                created_by=gf.created_by,
                created_at=gf.created_at,
                updated_at=gf.updated_at,
                coordinates=coords,
                geojson=geojson,
            )
        )
    return responses


@router.get(
    "/geofences/{geofence_id}",
    response_model=GeofenceResponse,
    summary="Get Geofence by ID",
)
async def get_geofence(
    geofence_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> GeofenceResponse:
    gf = await db.get(Geofence, geofence_id)
    if not gf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Geofence with ID '{geofence_id}' not found",
        )

    coords, geojson = parse_geofence_coordinates(gf)
    return GeofenceResponse(
        id=gf.id,
        name=gf.name,
        description=gf.description,
        is_active=gf.is_active,
        speed_limit=gf.speed_limit,
        created_by=gf.created_by,
        created_at=gf.created_at,
        updated_at=gf.updated_at,
        coordinates=coords,
        geojson=geojson,
    )


@router.patch(
    "/geofences/{geofence_id}",
    response_model=GeofenceResponse,
    summary="Update a Geofence Zone",
)
async def update_geofence(
    geofence_id: uuid.UUID,
    payload: GeofenceUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
) -> GeofenceResponse:
    gf = await db.get(Geofence, geofence_id)
    if not gf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Geofence with ID '{geofence_id}' not found",
        )

    if payload.name is not None:
        gf.name = payload.name
    if payload.description is not None:
        gf.description = payload.description
    if payload.is_active is not None:
        gf.is_active = payload.is_active
    if payload.speed_limit is not None:
        gf.speed_limit = payload.speed_limit
    if payload.coordinates is not None:
        wkt = coords_to_wkt_polygon(payload.coordinates)
        gf.area = ST_GeogFromText(wkt)

    await db.commit()
    await db.refresh(gf)

    coords, geojson = parse_geofence_coordinates(gf)
    return GeofenceResponse(
        id=gf.id,
        name=gf.name,
        description=gf.description,
        is_active=gf.is_active,
        speed_limit=gf.speed_limit,
        created_by=gf.created_by,
        created_at=gf.created_at,
        updated_at=gf.updated_at,
        coordinates=coords,
        geojson=geojson,
    )


@router.delete(
    "/geofences/{geofence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Geofence",
)
async def delete_geofence(
    geofence_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
):
    gf = await db.get(Geofence, geofence_id)
    if not gf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Geofence with ID '{geofence_id}' not found",
        )
    await db.delete(gf)
    await db.commit()
    return None


# ---------------------------------------------------------
# Alerts API
# ---------------------------------------------------------

@router.get(
    "/alerts",
    response_model=List[AlertResponse],
    summary="List fleet alerts with filtering and pagination",
)
async def list_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    vehicle_id: Optional[uuid.UUID] = Query(None),
    alert_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[AlertResponse]:
    stmt = (
        select(Alert, Vehicle.plate_number)
        .outerjoin(Vehicle, Alert.vehicle_id == Vehicle.id)
        .order_by(Alert.triggered_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if vehicle_id:
        stmt = stmt.where(Alert.vehicle_id == vehicle_id)
    if alert_type:
        stmt = stmt.where(Alert.alert_type == alert_type)
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if is_read is not None:
        stmt = stmt.where(Alert.is_read == is_read)

    res = await db.execute(stmt)
    rows = res.all()

    alert_responses = []
    for alert, plate in rows:
        alert_responses.append(
            AlertResponse(
                id=alert.id,
                vehicle_id=alert.vehicle_id,
                plate_number=plate or alert.metadata_.get("plate_number"),
                alert_type=alert.alert_type.value if hasattr(alert.alert_type, "value") else str(alert.alert_type),
                severity=alert.severity,
                message=alert.message,
                metadata=alert.metadata_,
                is_read=alert.is_read,
                triggered_at=alert.triggered_at,
            )
        )
    return alert_responses


@router.get(
    "/alerts/stats",
    response_model=AlertStatsResponse,
    summary="Get alert statistics (unread count, severity breakdown)",
)
async def get_alert_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AlertStatsResponse:
    total_q = select(func.count(Alert.id))
    unread_q = select(func.count(Alert.id)).where(Alert.is_read.is_(False))
    crit_q = select(func.count(Alert.id)).where(Alert.severity == "CRITICAL", Alert.is_read.is_(False))
    warn_q = select(func.count(Alert.id)).where(Alert.severity == "WARNING", Alert.is_read.is_(False))
    info_q = select(func.count(Alert.id)).where(Alert.severity == "INFO", Alert.is_read.is_(False))

    total = (await db.execute(total_q)).scalar() or 0
    unread = (await db.execute(unread_q)).scalar() or 0
    crit = (await db.execute(crit_q)).scalar() or 0
    warn = (await db.execute(warn_q)).scalar() or 0
    info = (await db.execute(info_q)).scalar() or 0

    return AlertStatsResponse(
        total_count=total,
        unread_count=unread,
        critical_count=crit,
        warning_count=warn,
        info_count=info,
    )


@router.patch(
    "/alerts/{alert_id}/read",
    response_model=AlertResponse,
    summary="Mark an alert as read",
)
async def mark_alert_read(
    alert_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AlertResponse:
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found",
        )
    alert.is_read = True
    await db.commit()
    await db.refresh(alert)

    v = await db.get(Vehicle, alert.vehicle_id)
    return AlertResponse(
        id=alert.id,
        vehicle_id=alert.vehicle_id,
        plate_number=v.plate_number if v else alert.metadata_.get("plate_number"),
        alert_type=alert.alert_type.value if hasattr(alert.alert_type, "value") else str(alert.alert_type),
        severity=alert.severity,
        message=alert.message,
        metadata=alert.metadata_,
        is_read=alert.is_read,
        triggered_at=alert.triggered_at,
    )


@router.post(
    "/alerts/mark-all-read",
    summary="Mark all alerts as read",
)
async def mark_all_alerts_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    from sqlalchemy import update
    stmt = update(Alert).where(Alert.is_read.is_(False)).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return {"message": "All alerts marked as read"}

import json
import logging
import math
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.functions import ST_X, ST_Y
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_dispatcher
from app.core.redis import get_redis_client
from app.database import get_db
from app.models.delivery import Delivery, DeliveryStatus
from app.models.driver import Driver
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.vehicle_driver_assignment import VehicleDriverAssignment
from app.schemas.delivery import (
    DeliveryAssignRequest,
    DeliveryCreate,
    DeliveryDriverSummary,
    DeliveryListResponse,
    DeliveryResponse,
    DeliveryUpdate,
    DeliveryVehicleSummary,
    DriverStatusUpdateRequest,
)
from app.services.routes_service import calculate_google_route

logger = logging.getLogger("fleet.deliveries")
router = APIRouter()


async def _format_delivery_response(
    db: AsyncSession, delivery: Delivery
) -> DeliveryResponse:
    """Format delivery ORM model with extracted coordinates and eager vehicle/driver info."""
    # Extract coordinates via ST_Y (lat) and ST_X (lng)
    coord_stmt = select(
        ST_Y(delivery.pickup_location),
        ST_X(delivery.pickup_location),
        ST_Y(delivery.dropoff_location),
        ST_X(delivery.dropoff_location),
    )
    coord_res = await db.execute(coord_stmt)
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng = coord_res.one()

    # Format vehicle
    vehicle_summary = None
    if delivery.vehicle:
        v = delivery.vehicle
        vehicle_summary = DeliveryVehicleSummary(
            id=v.id,
            plate_number=v.plate_number,
            make=v.make,
            model=v.model,
            status=v.status.value if hasattr(v.status, "value") else str(v.status),
            last_lat=v.last_lat,
            last_lng=v.last_lng,
        )

    # Format driver
    driver_summary = None
    if delivery.driver:
        d = delivery.driver
        email = d.user.email if (hasattr(d, "user") and d.user) else None
        driver_summary = DeliveryDriverSummary(
            id=d.id,
            user_id=d.user_id,
            license_number=d.license_number,
            phone=d.phone,
            email=email,
        )

    return DeliveryResponse(
        id=delivery.id,
        order_number=delivery.order_number,
        status=delivery.status,
        pickup_address=delivery.pickup_address,
        pickup_latitude=float(pickup_lat),
        pickup_longitude=float(pickup_lng),
        dropoff_address=delivery.dropoff_address,
        dropoff_latitude=float(dropoff_lat),
        dropoff_longitude=float(dropoff_lng),
        vehicle_id=delivery.vehicle_id,
        driver_id=delivery.driver_id,
        assigned_at=delivery.assigned_at,
        picked_up_at=delivery.picked_up_at,
        delivered_at=delivery.delivered_at,
        estimated_duration_mins=delivery.estimated_duration_mins,
        planned_route=delivery.planned_route,
        created_at=delivery.created_at,
        updated_at=delivery.updated_at,
        vehicle=vehicle_summary,
        driver=driver_summary,
    )


async def _get_delivery_or_404(db: AsyncSession, delivery_id: uuid.UUID) -> Delivery:
    stmt = (
        select(Delivery)
        .where(Delivery.id == delivery_id)
        .options(
            selectinload(Delivery.vehicle),
            selectinload(Delivery.driver).selectinload(Driver.user),
        )
    )
    res = await db.execute(stmt)
    delivery = res.scalar_one_or_none()
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery order with ID {delivery_id} not found",
        )
    return delivery


@router.post(
    "",
    response_model=DeliveryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create delivery order",
)
async def create_delivery(
    payload: DeliveryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(require_dispatcher)],
):
    """Create a new delivery order. Can optionally assign a vehicle and driver directly."""
    # Check duplicate order number
    exist_stmt = select(Delivery.id).where(Delivery.order_number == payload.order_number)
    exist_res = await db.execute(exist_stmt)
    if exist_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Delivery with order number '{payload.order_number}' already exists",
        )

    # Validate vehicle if supplied
    vehicle = None
    if payload.vehicle_id:
        vehicle = await db.get(Vehicle, payload.vehicle_id)
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID {payload.vehicle_id} not found",
            )

    # Validate driver if supplied
    driver = None
    if payload.driver_id:
        driver = await db.get(Driver, payload.driver_id)
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Driver with ID {payload.driver_id} not found",
            )
    elif payload.vehicle_id and not payload.driver_id:
        # Check if vehicle has an active assigned driver
        assign_stmt = select(VehicleDriverAssignment).where(
            VehicleDriverAssignment.vehicle_id == payload.vehicle_id,
            VehicleDriverAssignment.is_active == True,  # noqa: E712
        )
        asgn_res = await db.execute(assign_stmt)
        active_asgn = asgn_res.scalar_one_or_none()
        if active_asgn:
            payload.driver_id = active_asgn.driver_id

    # Create Delivery record
    pickup_geom = from_shape(
        Point(payload.pickup_longitude, payload.pickup_latitude), srid=4326
    )
    dropoff_geom = from_shape(
        Point(payload.dropoff_longitude, payload.dropoff_latitude), srid=4326
    )

    initial_status = (
        DeliveryStatus.ASSIGNED
        if (payload.vehicle_id or payload.driver_id)
        else DeliveryStatus.PENDING
    )
    assigned_time = datetime.now(UTC) if initial_status == DeliveryStatus.ASSIGNED else None

    delivery = Delivery(
        order_number=payload.order_number,
        status=initial_status,
        pickup_address=payload.pickup_address,
        pickup_location=pickup_geom,
        dropoff_address=payload.dropoff_address,
        dropoff_location=dropoff_geom,
        vehicle_id=payload.vehicle_id,
        driver_id=payload.driver_id,
        assigned_at=assigned_time,
    )
    db.add(delivery)
    await db.commit()
    await db.refresh(delivery)

    # Automatically calculate initial optimal route via Google Routes API
    try:
        route_data = await calculate_google_route(
            payload.pickup_latitude,
            payload.pickup_longitude,
            payload.dropoff_latitude,
            payload.dropoff_longitude,
        )
        delivery.planned_route = route_data
        duration_sec = route_data.get("duration_seconds", 0)
        delivery.estimated_duration_mins = max(1, int(round(duration_sec / 60)))
        await db.commit()
        await db.refresh(delivery)

        # Cache in Redis for 1 hour (3600 seconds)
        try:
            redis_client = await get_redis_client()
            cache_key = f"route:delivery:{delivery.id}"
            await redis_client.set(cache_key, json.dumps(route_data), ex=3600)
        except Exception as r_err:
            logger.warning(f"Redis route caching failed: {r_err}")
    except Exception as e:
        logger.warning(f"Initial route calculation warning: {e}")

    # Re-fetch delivery with relationships
    delivery_loaded = await _get_delivery_or_404(db, delivery.id)
    return await _format_delivery_response(db, delivery_loaded)


@router.get(
    "",
    response_model=DeliveryListResponse,
    summary="List delivery orders with filtering and pagination",
)
async def list_deliveries(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status_filter: DeliveryStatus | None = Query(None, alias="status"),
    vehicle_id: uuid.UUID | None = Query(None),
    driver_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """
    List delivery orders.
    Drivers automatically only see deliveries assigned to them or their vehicle unless admin/dispatcher.
    """
    stmt = (
        select(Delivery)
        .options(
            selectinload(Delivery.vehicle),
            selectinload(Delivery.driver).selectinload(Driver.user),
        )
        .order_by(Delivery.created_at.desc())
    )

    # Driver role isolation
    if current_user.role == UserRole.DRIVER:
        # Find driver profile
        driver_stmt = select(Driver).where(Driver.user_id == current_user.id)
        d_res = await db.execute(driver_stmt)
        my_driver = d_res.scalar_one_or_none()
        if my_driver:
            stmt = stmt.where(Delivery.driver_id == my_driver.id)
        else:
            return DeliveryListResponse(items=[], total=0, page=page, size=size, pages=0)

    if status_filter:
        stmt = stmt.where(Delivery.status == status_filter)
    if vehicle_id:
        stmt = stmt.where(Delivery.vehicle_id == vehicle_id)
    if driver_id:
        stmt = stmt.where(Delivery.driver_id == driver_id)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Delivery.order_number.ilike(search_pattern),
                Delivery.pickup_address.ilike(search_pattern),
                Delivery.dropoff_address.ilike(search_pattern),
            )
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    # Pagination
    stmt = stmt.offset((page - 1) * size).limit(size)
    res = await db.execute(stmt)
    deliveries = res.scalars().all()

    items = [await _format_delivery_response(db, d) for d in deliveries]
    pages = math.ceil(total / size) if size > 0 else 0

    return DeliveryListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get(
    "/{id}",
    response_model=DeliveryResponse,
    summary="Get delivery order details by ID",
)
async def get_delivery(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Retrieve details for a single delivery order."""
    delivery = await _get_delivery_or_404(db, id)

    # If user is a driver, verify delivery belongs to them
    if current_user.role == UserRole.DRIVER:
        driver_stmt = select(Driver).where(Driver.user_id == current_user.id)
        d_res = await db.execute(driver_stmt)
        my_driver = d_res.scalar_one_or_none()
        if not my_driver or delivery.driver_id != my_driver.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access delivery orders assigned to you",
            )

    return await _format_delivery_response(db, delivery)


@router.put(
    "/{id}",
    response_model=DeliveryResponse,
    summary="Update delivery order details",
)
async def update_delivery(
    id: uuid.UUID,
    payload: DeliveryUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(require_dispatcher)],
):
    """Update order details, addresses, or status (Dispatcher / Admin only)."""
    delivery = await _get_delivery_or_404(db, id)

    if payload.order_number is not None and payload.order_number != delivery.order_number:
        exist_stmt = select(Delivery.id).where(
            Delivery.order_number == payload.order_number,
            Delivery.id != id,
        )
        exist_res = await db.execute(exist_stmt)
        if exist_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Delivery with order number '{payload.order_number}' already exists",
            )
        delivery.order_number = payload.order_number

    coords_changed = False
    if payload.pickup_address is not None:
        delivery.pickup_address = payload.pickup_address
    if payload.pickup_latitude is not None and payload.pickup_longitude is not None:
        delivery.pickup_location = from_shape(
            Point(payload.pickup_longitude, payload.pickup_latitude), srid=4326
        )
        coords_changed = True

    if payload.dropoff_address is not None:
        delivery.dropoff_address = payload.dropoff_address
    if payload.dropoff_latitude is not None and payload.dropoff_longitude is not None:
        delivery.dropoff_location = from_shape(
            Point(payload.dropoff_longitude, payload.dropoff_latitude), srid=4326
        )
        coords_changed = True

    if payload.vehicle_id is not None:
        vehicle = await db.get(Vehicle, payload.vehicle_id)
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID {payload.vehicle_id} not found",
            )
        delivery.vehicle_id = payload.vehicle_id

    if payload.driver_id is not None:
        driver = await db.get(Driver, payload.driver_id)
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Driver with ID {payload.driver_id} not found",
            )
        delivery.driver_id = payload.driver_id

    if payload.status is not None:
        delivery.status = payload.status
        now = datetime.now(UTC)
        if payload.status == DeliveryStatus.PICKED_UP and not delivery.picked_up_at:
            delivery.picked_up_at = now
        elif payload.status == DeliveryStatus.DELIVERED and not delivery.delivered_at:
            delivery.delivered_at = now

    await db.commit()
    await db.refresh(delivery)

    # Invalidate cached route if coordinates changed
    if coords_changed:
        try:
            redis_client = await get_redis_client()
            await redis_client.delete(f"route:delivery:{delivery.id}")
        except Exception:
            pass

    delivery_loaded = await _get_delivery_or_404(db, delivery.id)
    return await _format_delivery_response(db, delivery_loaded)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete delivery order",
)
async def delete_delivery(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(require_dispatcher)],
):
    """Delete a delivery order (Dispatcher / Admin only)."""
    delivery = await _get_delivery_or_404(db, id)
    await db.delete(delivery)
    await db.commit()

    # Clear redis cache
    try:
        redis_client = await get_redis_client()
        await redis_client.delete(f"route:delivery:{id}")
    except Exception:
        pass


@router.post(
    "/{id}/assign",
    response_model=DeliveryResponse,
    summary="Assign vehicle and driver to delivery",
)
async def assign_delivery(
    id: uuid.UUID,
    payload: DeliveryAssignRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(require_dispatcher)],
):
    """Assign delivery to a specific vehicle and optional driver."""
    delivery = await _get_delivery_or_404(db, id)

    vehicle = await db.get(Vehicle, payload.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID {payload.vehicle_id} not found",
        )

    driver_id = payload.driver_id
    if driver_id:
        driver = await db.get(Driver, driver_id)
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Driver with ID {driver_id} not found",
            )
    else:
        # Check active assignment on vehicle
        asgn_stmt = select(VehicleDriverAssignment).where(
            VehicleDriverAssignment.vehicle_id == payload.vehicle_id,
            VehicleDriverAssignment.is_active == True,  # noqa: E712
        )
        asgn_res = await db.execute(asgn_stmt)
        active_asgn = asgn_res.scalar_one_or_none()
        if active_asgn:
            driver_id = active_asgn.driver_id

    delivery.vehicle_id = payload.vehicle_id
    delivery.driver_id = driver_id
    delivery.status = DeliveryStatus.ASSIGNED
    delivery.assigned_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(delivery)

    delivery_loaded = await _get_delivery_or_404(db, delivery.id)
    return await _format_delivery_response(db, delivery_loaded)


@router.post(
    "/{id}/calculate-route",
    response_model=DeliveryResponse,
    summary="Calculate optimal route via Google Routes API with Redis caching",
)
async def calculate_delivery_route(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Calls Google Routes API with pickup and dropoff coordinates.
    Stores the encoded polyline and ETA in `planned_route` and caches the result in Redis for 1 hour.
    """
    delivery = await _get_delivery_or_404(db, id)

    # Extract coordinates
    coord_stmt = select(
        ST_Y(delivery.pickup_location),
        ST_X(delivery.pickup_location),
        ST_Y(delivery.dropoff_location),
        ST_X(delivery.dropoff_location),
    )
    coord_res = await db.execute(coord_stmt)
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng = coord_res.one()

    cache_key = f"route:delivery:{delivery.id}"
    route_data = None

    # Check Redis cache first
    try:
        redis_client = await get_redis_client()
        cached = await redis_client.get(cache_key)
        if cached:
            route_data = json.loads(cached)
            logger.info(f"Loaded calculated route for delivery {delivery.id} from Redis cache")
    except Exception as r_err:
        logger.warning(f"Redis cache lookup failed: {r_err}")

    # If not cached, call Google Routes API
    if not route_data:
        route_data = await calculate_google_route(
            float(pickup_lat),
            float(pickup_lng),
            float(dropoff_lat),
            float(dropoff_lng),
        )
        # Store in Redis cache for 1 hour (3600 seconds)
        try:
            redis_client = await get_redis_client()
            await redis_client.set(cache_key, json.dumps(route_data), ex=3600)
        except Exception as r_err:
            logger.warning(f"Failed to cache route in Redis: {r_err}")

    # Persist in DB
    delivery.planned_route = route_data
    duration_sec = route_data.get("duration_seconds", 0)
    delivery.estimated_duration_mins = max(1, int(round(duration_sec / 60)))

    await db.commit()
    await db.refresh(delivery)

    delivery_loaded = await _get_delivery_or_404(db, delivery.id)
    return await _format_delivery_response(db, delivery_loaded)


@router.post(
    "/{id}/status",
    response_model=DeliveryResponse,
    summary="Driver updates delivery workflow status",
)
async def update_driver_delivery_status(
    id: uuid.UUID,
    payload: DriverStatusUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Driver endpoint to update delivery workflow status:
    `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`.
    Updates timestamps accordingly (`picked_up_at`, `delivered_at`).
    """
    delivery = await _get_delivery_or_404(db, id)

    # Authorization verification
    if current_user.role == UserRole.DRIVER:
        driver_stmt = select(Driver).where(Driver.user_id == current_user.id)
        d_res = await db.execute(driver_stmt)
        my_driver = d_res.scalar_one_or_none()
        if not my_driver or delivery.driver_id != my_driver.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update the status of deliveries assigned to you",
            )

    valid_driver_statuses = {
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
    }
    if payload.status not in valid_driver_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid driver status update. Allowed: {', '.join([s.value for s in valid_driver_statuses])}",
        )

    now = datetime.now(UTC)
    delivery.status = payload.status

    if payload.status in (DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT):
        if not delivery.picked_up_at:
            delivery.picked_up_at = now
    elif payload.status == DeliveryStatus.DELIVERED and not delivery.delivered_at:
        delivery.delivered_at = now

    await db.commit()
    await db.refresh(delivery)

    delivery_loaded = await _get_delivery_or_404(db, delivery.id)
    return await _format_delivery_response(db, delivery_loaded)

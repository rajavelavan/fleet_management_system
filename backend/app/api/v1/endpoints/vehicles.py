import math
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin, require_dispatcher
from app.api.v1.endpoints.analytics import calculate_vehicle_trip_summary
from app.database import get_db
from app.models.driver import Driver
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleStatus, VehicleType
from app.models.vehicle_driver_assignment import VehicleDriverAssignment
from app.models.vehicle_location import VehicleLocation
from app.schemas.analytics import TripSummaryResponse
from app.schemas.assignment import DriverAssignmentRequest, DriverAssignmentResponse
from app.schemas.tracking import LocationPoint, RouteHistoryResponse
from app.schemas.vehicle import (
    AssignedDriverInfo,
    VehicleCreate,
    VehicleListResponse,
    VehicleResponse,
    VehicleUpdate,
)

router = APIRouter()


def _format_vehicle_response(
    vehicle: Vehicle, active_assignment: Optional[VehicleDriverAssignment] = None
) -> VehicleResponse:
    driver_info = None
    if active_assignment and active_assignment.driver:
        d = active_assignment.driver
        email = (
            d.user.email
            if "user" in d.__dict__ and d.user
            else None
        )
        driver_info = AssignedDriverInfo(
            id=d.id,
            user_id=d.user_id,
            email=email,
            license_number=d.license_number,
            phone=d.phone,
            assigned_at=active_assignment.assigned_at,
        )
    elif "assignments" in vehicle.__dict__ and vehicle.assignments:
        for asgn in vehicle.assignments:
            if asgn.is_active and "driver" in asgn.__dict__ and asgn.driver:
                email = (
                    asgn.driver.user.email
                    if "user" in asgn.driver.__dict__ and asgn.driver.user
                    else None
                )
                driver_info = AssignedDriverInfo(
                    id=asgn.driver.id,
                    user_id=asgn.driver.user_id,
                    email=email,
                    license_number=asgn.driver.license_number,
                    phone=asgn.driver.phone,
                    assigned_at=asgn.assigned_at,
                )
                break

    return VehicleResponse(
        id=vehicle.id,
        plate_number=vehicle.plate_number,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
        type=vehicle.type,
        status=vehicle.status,
        fuel_capacity=vehicle.fuel_capacity,
        current_fuel=vehicle.current_fuel,
        last_lat=vehicle.last_lat,
        last_lng=vehicle.last_lng,
        last_speed=vehicle.last_speed,
        last_seen_at=vehicle.last_seen_at,
        deleted_at=vehicle.deleted_at,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
        current_driver=driver_info,
    )


async def get_vehicle_by_id_loaded(
    db: AsyncSession, vehicle_id: uuid.UUID
) -> Optional[Vehicle]:
    stmt = (
        select(Vehicle)
        .options(
            selectinload(Vehicle.assignments)
            .selectinload(VehicleDriverAssignment.driver)
            .selectinload(Driver.user)
        )
        .where(Vehicle.id == vehicle_id, Vehicle.deleted_at.is_(None))
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get(
    "",
    response_model=VehicleListResponse,
    summary="List Vehicles",
    description="Retrieve paginated vehicles with optional filtering by status and type.",
)
async def list_vehicles(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[VehicleStatus] = Query(None, description="Filter by status"),
    type: Optional[VehicleType] = Query(None, description="Filter by vehicle type"),
    search: Optional[str] = Query(None, description="Search plate, make, or model"),
    include_deleted: bool = Query(False, description="Include soft-deleted vehicles"),
) -> VehicleListResponse:
    query = select(Vehicle)
    count_query = select(func.count(Vehicle.id))

    if not include_deleted:
        query = query.where(Vehicle.deleted_at.is_(None))
        count_query = count_query.where(Vehicle.deleted_at.is_(None))

    if status:
        query = query.where(Vehicle.status == status)
        count_query = count_query.where(Vehicle.status == status)

    if type:
        query = query.where(Vehicle.type == type)
        count_query = count_query.where(Vehicle.type == type)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            (Vehicle.plate_number.ilike(search_pattern))
            | (Vehicle.make.ilike(search_pattern))
            | (Vehicle.model.ilike(search_pattern))
        )
        count_query = count_query.where(
            (Vehicle.plate_number.ilike(search_pattern))
            | (Vehicle.make.ilike(search_pattern))
            | (Vehicle.model.ilike(search_pattern))
        )

    # Count total items
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Eager load active assignments and drivers with users
    query = (
        query.options(
            selectinload(Vehicle.assignments)
            .selectinload(VehicleDriverAssignment.driver)
            .selectinload(Driver.user)
        )
        .order_by(Vehicle.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )

    items_result = await db.execute(query)
    vehicles = items_result.scalars().all()

    items = [_format_vehicle_response(v) for v in vehicles]
    pages = math.ceil(total / size) if size > 0 else 0

    return VehicleListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Vehicle",
    description="Register a new vehicle in the fleet roster.",
)
async def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> VehicleResponse:
    # Check plate uniqueness
    stmt = select(Vehicle).where(
        Vehicle.plate_number == vehicle_in.plate_number.strip().upper(),
        Vehicle.deleted_at.is_(None),
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with plate number '{vehicle_in.plate_number}' already exists",
        )

    vehicle = Vehicle(
        plate_number=vehicle_in.plate_number.strip().upper(),
        make=vehicle_in.make.strip(),
        model=vehicle_in.model.strip(),
        year=vehicle_in.year,
        type=vehicle_in.type,
        status=vehicle_in.status,
        fuel_capacity=vehicle_in.fuel_capacity,
        current_fuel=vehicle_in.current_fuel,
        last_lat=vehicle_in.last_lat,
        last_lng=vehicle_in.last_lng,
        last_speed=vehicle_in.last_speed,
        last_seen_at=vehicle_in.last_seen_at,
    )
    db.add(vehicle)
    await db.commit()

    loaded = await get_vehicle_by_id_loaded(db, vehicle.id)
    return _format_vehicle_response(loaded or vehicle)


@router.get(
    "/{id}",
    response_model=VehicleResponse,
    summary="Get Vehicle by ID",
    description="Retrieve vehicle details along with current active driver assignment.",
)
async def get_vehicle(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
) -> VehicleResponse:
    vehicle = await get_vehicle_by_id_loaded(db, id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )
    return _format_vehicle_response(vehicle)


@router.put(
    "/{id}",
    response_model=VehicleResponse,
    summary="Update Vehicle",
    description="Update vehicle attributes and telemetry.",
)
async def update_vehicle(
    id: uuid.UUID,
    vehicle_in: VehicleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> VehicleResponse:
    vehicle = await get_vehicle_by_id_loaded(db, id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    update_data = vehicle_in.model_dump(exclude_unset=True)

    if "plate_number" in update_data and update_data["plate_number"]:
        clean_plate = update_data["plate_number"].strip().upper()
        check_stmt = select(Vehicle).where(
            Vehicle.plate_number == clean_plate,
            Vehicle.id != id,
            Vehicle.deleted_at.is_(None),
        )
        duplicate = (await db.execute(check_stmt)).scalar_one_or_none()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with plate number '{clean_plate}' already exists",
            )
        update_data["plate_number"] = clean_plate

    for key, value in update_data.items():
        setattr(vehicle, key, value)

    await db.commit()
    loaded = await get_vehicle_by_id_loaded(db, id)
    return _format_vehicle_response(loaded or vehicle)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Vehicle (Soft Delete)",
    description="Soft-deletes a vehicle and unassigns any active driver.",
)
async def delete_vehicle(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    stmt = (
        select(Vehicle)
        .options(selectinload(Vehicle.assignments))
        .where(Vehicle.id == id, Vehicle.deleted_at.is_(None))
    )
    vehicle = (await db.execute(stmt)).scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    now = datetime.now(timezone.utc)
    vehicle.deleted_at = now
    vehicle.status = VehicleStatus.OFFLINE

    # Mark active assignments as unassigned
    for asgn in vehicle.assignments:
        if asgn.is_active:
            asgn.is_active = False
            asgn.unassigned_at = now

    await db.commit()
    return None


@router.post(
    "/{id}/assign-driver",
    response_model=DriverAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign Driver to Vehicle",
    description="Assigns an active driver to a vehicle. If the vehicle or driver already has an active assignment, it automatically unassigns the previous one.",
)
async def assign_driver(
    id: uuid.UUID,
    assignment_in: DriverAssignmentRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
) -> DriverAssignmentResponse:
    # 1. Fetch vehicle
    v_stmt = select(Vehicle).where(Vehicle.id == id, Vehicle.deleted_at.is_(None))
    vehicle = (await db.execute(v_stmt)).scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # 2. Fetch driver
    d_stmt = select(Driver).where(Driver.id == assignment_in.driver_id)
    driver = (await db.execute(d_stmt)).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    if not driver.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive driver",
        )

    now = datetime.now(timezone.utc)

    # 3. Unassign any existing active assignments for this vehicle
    v_asgns_stmt = select(VehicleDriverAssignment).where(
        VehicleDriverAssignment.vehicle_id == id,
        VehicleDriverAssignment.is_active.is_(True),
    )
    active_vehicle_asgns = (await db.execute(v_asgns_stmt)).scalars().all()
    for asgn in active_vehicle_asgns:
        asgn.is_active = False
        asgn.unassigned_at = now

    # 4. Unassign any existing active assignments for this driver
    d_asgns_stmt = select(VehicleDriverAssignment).where(
        VehicleDriverAssignment.driver_id == assignment_in.driver_id,
        VehicleDriverAssignment.is_active.is_(True),
    )
    active_driver_asgns = (await db.execute(d_asgns_stmt)).scalars().all()
    for asgn in active_driver_asgns:
        asgn.is_active = False
        asgn.unassigned_at = now

    # 5. Create new assignment
    new_assignment = VehicleDriverAssignment(
        vehicle_id=vehicle.id,
        driver_id=driver.id,
        assigned_at=now,
        is_active=True,
    )
    db.add(new_assignment)

    # If vehicle was IDLE or OFFLINE, update status to ACTIVE
    if vehicle.status in (VehicleStatus.IDLE, VehicleStatus.OFFLINE):
        vehicle.status = VehicleStatus.ACTIVE

    await db.commit()
    await db.refresh(new_assignment)

    return DriverAssignmentResponse.model_validate(new_assignment)


@router.delete(
    "/{id}/unassign-driver",
    response_model=dict,
    summary="Unassign Driver from Vehicle",
    description="Removes current active driver assignment from vehicle and marks it unassigned.",
)
async def unassign_driver(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
) -> dict:
    # 1. Fetch vehicle
    v_stmt = select(Vehicle).where(Vehicle.id == id, Vehicle.deleted_at.is_(None))
    vehicle = (await db.execute(v_stmt)).scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # 2. Find active assignment
    asgn_stmt = select(VehicleDriverAssignment).where(
        VehicleDriverAssignment.vehicle_id == id,
        VehicleDriverAssignment.is_active.is_(True),
    )
    active_asgn = (await db.execute(asgn_stmt)).scalar_one_or_none()
    if not active_asgn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active driver assigned to this vehicle",
        )

    now = datetime.now(timezone.utc)
    active_asgn.is_active = False
    active_asgn.unassigned_at = now

    # If vehicle was ACTIVE, set to IDLE
    if vehicle.status == VehicleStatus.ACTIVE:
        vehicle.status = VehicleStatus.IDLE

    await db.commit()

    return {
        "message": "Driver successfully unassigned",
        "vehicle_id": str(vehicle.id),
        "unassigned_at": now.isoformat(),
    }


@router.get(
    "/{id}/route-history",
    response_model=RouteHistoryResponse,
    summary="Get Vehicle Route History",
    description="Returns historical coordinate trail and telemetry points for a vehicle within the specified time window.",
)
async def get_vehicle_route_history(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    from_time: Annotated[
        Optional[datetime],
        Query(
            alias="from",
            description="Start timestamp in ISO 8601 format (e.g. 2026-10-22T00:00:00Z)",
        ),
    ] = None,
    to_time: Annotated[
        Optional[datetime],
        Query(
            alias="to",
            description="End timestamp in ISO 8601 format (defaults to current time)",
        ),
    ] = None,
    limit: Annotated[
        int,
        Query(
            ge=1,
            le=5000,
            description="Maximum number of historical points to return",
        ),
    ] = 1000,
) -> RouteHistoryResponse:
    # 1. Verify vehicle exists
    v_stmt = select(Vehicle).where(Vehicle.id == id, Vehicle.deleted_at.is_(None))
    vehicle = (await db.execute(v_stmt)).scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{id}' not found",
        )

    # 2. Defaults for time window: default from_time to beginning of today or epoch if not specified
    now = datetime.now(timezone.utc)
    effective_to = to_time or now
    effective_from = from_time or datetime(1970, 1, 1, tzinfo=timezone.utc)

    # 3. Query vehicle_locations with PostGIS ST_X (longitude) and ST_Y (latitude)
    geom_cast = func.geometry(VehicleLocation.location)
    query = (
        select(
            VehicleLocation.id,
            func.ST_X(geom_cast).label("longitude"),
            func.ST_Y(geom_cast).label("latitude"),
            VehicleLocation.speed,
            VehicleLocation.heading,
            VehicleLocation.altitude,
            VehicleLocation.accuracy,
            VehicleLocation.recorded_at,
        )
        .where(
            VehicleLocation.vehicle_id == id,
            VehicleLocation.recorded_at >= effective_from,
            VehicleLocation.recorded_at <= effective_to,
        )
        .order_by(VehicleLocation.recorded_at.asc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    points = [
        LocationPoint(
            id=row.id,
            longitude=float(row.longitude),
            latitude=float(row.latitude),
            speed=row.speed,
            heading=row.heading,
            altitude=row.altitude,
            accuracy=row.accuracy,
            recorded_at=row.recorded_at,
        )
        for row in rows
    ]

    return RouteHistoryResponse(
        vehicle_id=id,
        from_time=effective_from,
        to_time=effective_to,
        total_points=len(points),
        coordinates=points,
    )


@router.get(
    "/{id}/trip-summary",
    response_model=TripSummaryResponse,
    summary="Get Vehicle Trip Summary",
    description="Returns aggregate trip metrics (distance, duration, average speed, max speed) for a vehicle.",
)
async def get_vehicle_trip_summary(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_dispatcher)],
    from_time: Annotated[
        Optional[datetime],
        Query(
            alias="from",
            description="Start timestamp in ISO 8601 format",
        ),
    ] = None,
    to_time: Annotated[
        Optional[datetime],
        Query(
            alias="to",
            description="End timestamp in ISO 8601 format",
        ),
    ] = None,
) -> TripSummaryResponse:
    return await calculate_vehicle_trip_summary(
        db=db,
        vehicle_id=id,
        from_time=from_time,
        to_time=to_time,
    )



import math
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_admin, require_dispatcher
from app.database import get_db
from app.models.driver import Driver
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.vehicle_driver_assignment import VehicleDriverAssignment
from app.schemas.driver import (
    AssignedVehicleInfo,
    DriverCreate,
    DriverListResponse,
    DriverResponse,
    DriverUpdate,
)
from app.schemas.user import UserResponse

router = APIRouter()


def _format_driver_response(
    driver: Driver, active_assignment: Optional[VehicleDriverAssignment] = None
) -> DriverResponse:
    vehicle_info = None
    if active_assignment and active_assignment.vehicle:
        v = active_assignment.vehicle
        vehicle_info = AssignedVehicleInfo(
            id=v.id,
            plate_number=v.plate_number,
            make=v.make,
            model=v.model,
            type=v.type.value if hasattr(v.type, "value") else str(v.type),
            status=v.status.value if hasattr(v.status, "value") else str(v.status),
            assigned_at=active_assignment.assigned_at,
        )
    elif "assignments" in driver.__dict__ and driver.assignments:
        for asgn in driver.assignments:
            if asgn.is_active and "vehicle" in asgn.__dict__ and asgn.vehicle:
                v = asgn.vehicle
                vehicle_info = AssignedVehicleInfo(
                    id=v.id,
                    plate_number=v.plate_number,
                    make=v.make,
                    model=v.model,
                    type=v.type.value if hasattr(v.type, "value") else str(v.type),
                    status=v.status.value if hasattr(v.status, "value") else str(v.status),
                    assigned_at=asgn.assigned_at,
                )
                break

    user_resp = (
        UserResponse.model_validate(driver.user)
        if "user" in driver.__dict__ and driver.user
        else None
    )

    return DriverResponse(
        id=driver.id,
        user_id=driver.user_id,
        license_number=driver.license_number,
        license_expiry=driver.license_expiry,
        phone=driver.phone,
        is_active=driver.is_active,
        created_at=driver.created_at,
        updated_at=driver.updated_at,
        user=user_resp,
        current_vehicle=vehicle_info,
    )


async def get_driver_by_id_loaded(
    db: AsyncSession, driver_id: uuid.UUID
) -> Optional[Driver]:
    stmt = (
        select(Driver)
        .options(
            selectinload(Driver.user),
            selectinload(Driver.assignments)
            .selectinload(VehicleDriverAssignment.vehicle),
        )
        .where(Driver.id == driver_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get(
    "",
    response_model=DriverListResponse,
    summary="List Drivers",
    description="Retrieve paginated drivers with filtering by active status and search query.",
)
async def list_drivers(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search license number or phone"),
) -> DriverListResponse:
    query = select(Driver)
    count_query = select(func.count(Driver.id))

    if is_active is not None:
        query = query.where(Driver.is_active == is_active)
        count_query = count_query.where(Driver.is_active == is_active)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.join(Driver.user, isouter=True).where(
            (Driver.license_number.ilike(search_pattern))
            | (Driver.phone.ilike(search_pattern))
            | (User.email.ilike(search_pattern))
        )
        count_query = count_query.join(Driver.user, isouter=True).where(
            (Driver.license_number.ilike(search_pattern))
            | (Driver.phone.ilike(search_pattern))
            | (User.email.ilike(search_pattern))
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = (
        query.options(
            selectinload(Driver.user),
            selectinload(Driver.assignments)
            .selectinload(VehicleDriverAssignment.vehicle),
        )
        .order_by(Driver.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )

    items_result = await db.execute(query)
    drivers = items_result.scalars().all()

    items = [_format_driver_response(d) for d in drivers]
    pages = math.ceil(total / size) if size > 0 else 0

    return DriverListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post(
    "",
    response_model=DriverResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Driver Profile",
    description="Create a driver profile linked to a user account with DRIVER role.",
)
async def create_driver(
    driver_in: DriverCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> DriverResponse:
    # 1. Verify user exists
    user_stmt = select(User).where(User.id == driver_in.user_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # 2. Verify user doesn't already have a driver profile
    existing_user_driver = (
        await db.execute(select(Driver).where(Driver.user_id == driver_in.user_id))
    ).scalar_one_or_none()
    if existing_user_driver:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an associated driver profile",
        )

    # 3. Verify license uniqueness
    existing_license = (
        await db.execute(
            select(Driver).where(
                Driver.license_number == driver_in.license_number.strip().upper()
            )
        )
    ).scalar_one_or_none()
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with license '{driver_in.license_number}' already exists",
        )

    driver = Driver(
        user_id=driver_in.user_id,
        license_number=driver_in.license_number.strip().upper(),
        license_expiry=driver_in.license_expiry,
        phone=driver_in.phone.strip(),
        is_active=driver_in.is_active,
    )
    db.add(driver)
    await db.commit()

    loaded = await get_driver_by_id_loaded(db, driver.id)
    return _format_driver_response(loaded or driver)


@router.get(
    "/me",
    response_model=DriverResponse,
    summary="Get Current Driver Profile",
    description="Retrieve the authenticated driver's own profile and currently assigned vehicle.",
)
async def get_my_driver_profile(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DriverResponse:
    stmt = (
        select(Driver)
        .options(
            selectinload(Driver.user),
            selectinload(Driver.assignments).selectinload(VehicleDriverAssignment.vehicle),
        )
        .where(Driver.user_id == current_user.id)
    )
    driver = (await db.execute(stmt)).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No driver profile associated with the current user",
        )
    return _format_driver_response(driver)


@router.get(
    "/{id}",
    response_model=DriverResponse,
    summary="Get Driver by ID",
    description="Retrieve driver profile and currently assigned vehicle.",
)
async def get_driver(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_dispatcher)],
) -> DriverResponse:
    driver = await get_driver_by_id_loaded(db, id)
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )
    return _format_driver_response(driver)


@router.put(
    "/{id}",
    response_model=DriverResponse,
    summary="Update Driver Profile",
    description="Update driver license, phone, or active status.",
)
async def update_driver(
    id: uuid.UUID,
    driver_in: DriverUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
) -> DriverResponse:
    driver = await get_driver_by_id_loaded(db, id)
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    update_data = driver_in.model_dump(exclude_unset=True)

    if "license_number" in update_data and update_data["license_number"]:
        clean_license = update_data["license_number"].strip().upper()
        # Verify uniqueness
        check_stmt = select(Driver).where(
            Driver.license_number == clean_license,
            Driver.id != id,
        )
        duplicate = (await db.execute(check_stmt)).scalar_one_or_none()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver with license '{clean_license}' already exists",
            )
        update_data["license_number"] = clean_license

    if "user_id" in update_data and update_data["user_id"]:
        user_uuid = update_data["user_id"]
        # Check user exists
        user_stmt = select(User).where(User.id == user_uuid)
        user = (await db.execute(user_stmt)).scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        # Check not assigned to another driver
        dup_user = (
            await db.execute(
                select(Driver).where(Driver.user_id == user_uuid, Driver.id != id)
            )
        ).scalar_one_or_none()
        if dup_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already associated with another driver profile",
            )

    if "phone" in update_data and update_data["phone"]:
        update_data["phone"] = update_data["phone"].strip()

    for key, value in update_data.items():
        setattr(driver, key, value)

    await db.commit()
    loaded = await get_driver_by_id_loaded(db, id)
    return _format_driver_response(loaded or driver)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Driver Profile",
    description="Delete a driver profile and remove active assignments.",
)
async def delete_driver(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    stmt = select(Driver).where(Driver.id == id)
    driver = (await db.execute(stmt)).scalar_one_or_none()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    await db.delete(driver)
    await db.commit()
    return None

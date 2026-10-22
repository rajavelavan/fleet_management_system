import uuid
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.vehicle import VehicleStatus, VehicleType


class VehicleBase(BaseModel):
    plate_number: Annotated[str, Field(min_length=1, max_length=50)]
    make: Annotated[str, Field(min_length=1, max_length=100)]
    model: Annotated[str, Field(min_length=1, max_length=100)]
    year: Annotated[int, Field(ge=1900, le=2100)]
    type: VehicleType = VehicleType.VAN
    status: VehicleStatus = VehicleStatus.IDLE
    fuel_capacity: Annotated[float, Field(ge=0.0)] = 0.0
    current_fuel: Annotated[float, Field(ge=0.0)] = 0.0


class VehicleCreate(VehicleBase):
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    last_speed: Optional[float] = None
    last_seen_at: Optional[datetime] = None


class VehicleUpdate(BaseModel):
    plate_number: Optional[Annotated[str, Field(min_length=1, max_length=50)]] = None
    make: Optional[Annotated[str, Field(min_length=1, max_length=100)]] = None
    model: Optional[Annotated[str, Field(min_length=1, max_length=100)]] = None
    year: Optional[Annotated[int, Field(ge=1900, le=2100)]] = None
    type: Optional[VehicleType] = None
    status: Optional[VehicleStatus] = None
    fuel_capacity: Optional[Annotated[float, Field(ge=0.0)]] = None
    current_fuel: Optional[Annotated[float, Field(ge=0.0)]] = None
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    last_speed: Optional[float] = None
    last_seen_at: Optional[datetime] = None


class AssignedDriverInfo(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: Optional[str] = None
    license_number: str
    phone: str
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleResponse(VehicleBase):
    id: uuid.UUID
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    last_speed: Optional[float] = None
    last_seen_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    current_driver: Optional[AssignedDriverInfo] = None

    model_config = ConfigDict(from_attributes=True)


class VehicleListResponse(BaseModel):
    items: list[VehicleResponse]
    total: int
    page: int
    size: int
    pages: int

import uuid
from datetime import date, datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserResponse


class DriverBase(BaseModel):
    license_number: Annotated[str, Field(min_length=1, max_length=100)]
    license_expiry: date
    phone: Annotated[str, Field(min_length=1, max_length=50)]
    is_active: bool = True


class DriverCreate(DriverBase):
    user_id: uuid.UUID


class DriverUpdate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    license_number: Optional[Annotated[str, Field(min_length=1, max_length=100)]] = None
    license_expiry: Optional[date] = None
    phone: Optional[Annotated[str, Field(min_length=1, max_length=50)]] = None
    is_active: Optional[bool] = None


class AssignedVehicleInfo(BaseModel):
    id: uuid.UUID
    plate_number: str
    make: str
    model: str
    type: str
    status: str
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DriverResponse(DriverBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    user: Optional[UserResponse] = None
    current_vehicle: Optional[AssignedVehicleInfo] = None

    model_config = ConfigDict(from_attributes=True)


class DriverListResponse(BaseModel):
    items: list[DriverResponse]
    total: int
    page: int
    size: int
    pages: int

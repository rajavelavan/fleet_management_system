import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.delivery import DeliveryStatus


class LocationCoord(BaseModel):
    latitude: Annotated[float, Field(ge=-90.0, le=90.0)]
    longitude: Annotated[float, Field(ge=-180.0, le=180.0)]


class DeliveryCreate(BaseModel):
    order_number: Annotated[str, Field(min_length=1, max_length=100)]
    pickup_address: Annotated[str, Field(min_length=1, max_length=500)]
    pickup_latitude: Annotated[float, Field(ge=-90.0, le=90.0)]
    pickup_longitude: Annotated[float, Field(ge=-180.0, le=180.0)]
    dropoff_address: Annotated[str, Field(min_length=1, max_length=500)]
    dropoff_latitude: Annotated[float, Field(ge=-90.0, le=90.0)]
    dropoff_longitude: Annotated[float, Field(ge=-180.0, le=180.0)]
    vehicle_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None


class DeliveryUpdate(BaseModel):
    order_number: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    pickup_address: Annotated[str, Field(min_length=1, max_length=500)] | None = None
    pickup_latitude: Annotated[float, Field(ge=-90.0, le=90.0)] | None = None
    pickup_longitude: Annotated[float, Field(ge=-180.0, le=180.0)] | None = None
    dropoff_address: Annotated[str, Field(min_length=1, max_length=500)] | None = None
    dropoff_latitude: Annotated[float, Field(ge=-90.0, le=90.0)] | None = None
    dropoff_longitude: Annotated[float, Field(ge=-180.0, le=180.0)] | None = None
    status: DeliveryStatus | None = None
    vehicle_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None


class DeliveryAssignRequest(BaseModel):
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID | None = None


class DriverStatusUpdateRequest(BaseModel):
    status: DeliveryStatus = Field(
        description="Allowed statuses: PICKED_UP, IN_TRANSIT, DELIVERED, FAILED"
    )


class DeliveryVehicleSummary(BaseModel):
    id: uuid.UUID
    plate_number: str
    make: str
    model: str
    status: str
    last_lat: float | None = None
    last_lng: float | None = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryDriverSummary(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    license_number: str
    phone: str
    email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    status: DeliveryStatus
    pickup_address: str
    pickup_latitude: float
    pickup_longitude: float
    dropoff_address: str
    dropoff_latitude: float
    dropoff_longitude: float
    vehicle_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None
    assigned_at: datetime | None = None
    picked_up_at: datetime | None = None
    delivered_at: datetime | None = None
    estimated_duration_mins: int | None = None
    planned_route: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    vehicle: DeliveryVehicleSummary | None = None
    driver: DeliveryDriverSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryListResponse(BaseModel):
    items: list[DeliveryResponse]
    total: int
    page: int
    size: int
    pages: int

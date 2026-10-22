import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class LocationIngestRequest(BaseModel):
    """Pydantic validated GPS payload sent by vehicle trackers or simulators."""
    vehicle_id: uuid.UUID = Field(
        ...,
        description="UUID of the vehicle emitting GPS telemetry",
        examples=["c343a90b-3a6a-4a62-9172-5d25d8bc0bcc"],
    )
    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="WGS 84 Latitude in decimal degrees (-90.0 to 90.0)",
        examples=[37.774929],
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="WGS 84 Longitude in decimal degrees (-180.0 to 180.0)",
        examples=[-122.419418],
    )
    speed: float | None = Field(
        default=None,
        ge=0.0,
        description="Speed in km/h or m/s",
        examples=[65.4],
    )
    heading: float | None = Field(
        default=None,
        ge=0.0,
        le=360.0,
        description="Compass heading in degrees (0.0 to 360.0)",
        examples=[184.2],
    )
    altitude: float | None = Field(
        default=None,
        description="Altitude in meters above sea level",
        examples=[12.5],
    )
    accuracy: float | None = Field(
        default=None,
        ge=0.0,
        description="Horizontal GPS accuracy in meters",
        examples=[3.2],
    )
    recorded_at: datetime | None = Field(
        default=None,
        description="Timestamp when telemetry was recorded on device (defaults to server now)",
    )


class LocationIngestResponse(BaseModel):
    """Response returned upon successful GPS ping ingestion."""
    id: uuid.UUID
    vehicle_id: uuid.UUID
    latitude: float
    longitude: float
    speed: float | None = None
    heading: float | None = None
    altitude: float | None = None
    accuracy: float | None = None
    recorded_at: datetime
    message: str = "GPS ping ingested and broadcasted successfully"


class LocationPoint(BaseModel):
    """Single point in a vehicle's route history."""
    id: uuid.UUID
    latitude: float
    longitude: float
    speed: float | None = None
    heading: float | None = None
    altitude: float | None = None
    accuracy: float | None = None
    recorded_at: datetime


class RouteHistoryResponse(BaseModel):
    """Historical coordinate trails and route summary."""
    vehicle_id: uuid.UUID
    from_time: datetime
    to_time: datetime
    total_points: int
    coordinates: list[LocationPoint]

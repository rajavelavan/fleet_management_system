import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Coordinate(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")


class GeofenceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Name of the geofence zone")
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = Field(True, description="Whether the geofence is currently monitored")
    speed_limit: Optional[float] = Field(None, ge=0.0, description="Speed limit in km/h within zone")


class GeofenceCreate(GeofenceBase):
    coordinates: List[Coordinate] = Field(
        ...,
        min_length=3,
        description="List of lat/lng vertices defining the polygon boundary",
    )

    @field_validator("coordinates")
    @classmethod
    def validate_polygon_closed(cls, v: List[Coordinate]) -> List[Coordinate]:
        if len(v) < 3:
            raise ValueError("Polygon must have at least 3 vertices")
        first = v[0]
        last = v[-1]
        if first.lat != last.lat or first.lng != last.lng:
            return list(v) + [Coordinate(lat=first.lat, lng=first.lng)]
        return v


class GeofenceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    speed_limit: Optional[float] = Field(None, ge=0.0)
    coordinates: Optional[List[Coordinate]] = Field(None, min_length=3)

    @field_validator("coordinates")
    @classmethod
    def validate_polygon_closed(cls, v: Optional[List[Coordinate]]) -> Optional[List[Coordinate]]:
        if v is None:
            return v
        if len(v) < 3:
            raise ValueError("Polygon must have at least 3 vertices")
        first = v[0]
        last = v[-1]
        if first.lat != last.lat or first.lng != last.lng:
            return list(v) + [Coordinate(lat=first.lat, lng=first.lng)]
        return v


class GeofenceResponse(GeofenceBase):
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    coordinates: List[Coordinate] = Field(
        default_factory=list,
        description="Vertices of the polygon in lat/lng order",
    )
    geojson: Optional[dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class AlertResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    plate_number: Optional[str] = None
    alert_type: str
    severity: str
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_read: bool
    triggered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertStatsResponse(BaseModel):
    total_count: int
    unread_count: int
    critical_count: int
    warning_count: int
    info_count: int

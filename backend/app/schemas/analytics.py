import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class FleetStatusCounts(BaseModel):
    total: int = 0
    active: int = 0
    idle: int = 0
    offline: int = 0
    maintenance: int = 0


class DeliveryStatusCounts(BaseModel):
    total: int = 0
    pending: int = 0
    assigned: int = 0
    picked_up: int = 0
    in_transit: int = 0
    delivered: int = 0
    failed: int = 0
    cancelled: int = 0


class KPISummaryResponse(BaseModel):
    fleet_status: FleetStatusCounts
    delivery_status: DeliveryStatusCounts
    active_alerts_count: int
    active_drivers_count: int
    fuel_efficiency_avg: float
    on_time_delivery_rate: float
    total_trips_completed: int


class DeliveryTrendPoint(BaseModel):
    date: str
    delivered: int = 0
    failed: int = 0
    total: int = 0


class DeliveriesTrendResponse(BaseModel):
    days: int
    data: list[DeliveryTrendPoint]


class AlertBreakdownItem(BaseModel):
    type: str
    count: int
    critical_count: int
    warning_count: int
    info_count: int


class AlertsBreakdownResponse(BaseModel):
    total_alerts: int
    breakdown: list[AlertBreakdownItem]


class TripSummaryResponse(BaseModel):
    vehicle_id: uuid.UUID
    plate_number: str
    total_distance_km: float
    total_duration_hours: float
    avg_speed_kmh: float
    max_speed_kmh: float
    trips_count: int
    start_time: datetime | None = None
    end_time: datetime | None = None

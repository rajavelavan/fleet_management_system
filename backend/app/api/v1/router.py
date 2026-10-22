from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    auth,
    deliveries,
    drivers,
    geofences,
    health,
    reports,
    tracking,
    vehicles,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(
    auth.router, prefix="/auth", tags=["Authentication & User Management"]
)
api_router.include_router(
    vehicles.router, prefix="/vehicles", tags=["Vehicles Management"]
)
api_router.include_router(
    drivers.router, prefix="/drivers", tags=["Drivers Management"]
)
api_router.include_router(
    deliveries.router, prefix="/deliveries", tags=["Deliveries & Route Management"]
)
api_router.include_router(
    geofences.router, tags=["Geofencing & Alerts Engine"]
)
api_router.include_router(
    tracking.router, prefix="/tracking", tags=["Live GPS Telemetry & Tracking"]
)
api_router.include_router(
    analytics.router, prefix="/analytics", tags=["Dashboard & Executive Analytics"]
)
api_router.include_router(
    reports.router, prefix="/reports", tags=["Excel & Operational Reports"]
)
# Also include tracking at router root so WS /api/v1/ws/tracking works directly
api_router.add_api_websocket_route("/ws/tracking", tracking.websocket_tracking_endpoint)

from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status

from app.config import settings
from app.tasks.scheduled_tasks import (
    _async_daily_fleet_summary,
    _async_mark_unresponsive_vehicles,
)

router = APIRouter()


def verify_cron_secret(
    authorization: Annotated[str | None, Header()] = None,
    x_cron_secret: Annotated[str | None, Header(alias="X-Cron-Secret")] = None,
) -> None:
    """Validate that the incoming request has the secret cron token."""
    bearer_token = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer_token = authorization.split(" ", 1)[1].strip()

    received = x_cron_secret or bearer_token
    if not received or received != settings.CRON_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing cron authentication secret",
        )


@router.post(
    "/check-offline-vehicles",
    summary="Trigger Offline Vehicles Check",
    description="Marks vehicles with no GPS telemetry in the last 15 minutes as OFFLINE. Called periodically by external cron.",
)
async def trigger_offline_vehicles(
    authorization: Annotated[str | None, Header()] = None,
    x_cron_secret: Annotated[str | None, Header(alias="X-Cron-Secret")] = None,
):
    verify_cron_secret(authorization, x_cron_secret)
    result = await _async_mark_unresponsive_vehicles(threshold_minutes=15)
    return {"status": "success", "task": "mark_unresponsive_vehicles_offline", "result": result}


@router.post(
    "/daily-summary",
    summary="Trigger Daily Fleet Summary",
    description="Generates a 24-hour summary of completed deliveries, fleet status, and alerts. Called daily at midnight by external cron.",
)
async def trigger_daily_summary(
    authorization: Annotated[str | None, Header()] = None,
    x_cron_secret: Annotated[str | None, Header(alias="X-Cron-Secret")] = None,
):
    verify_cron_secret(authorization, x_cron_secret)
    result = await _async_daily_fleet_summary()
    return {"status": "success", "task": "daily_fleet_summary_digest", "result": result}

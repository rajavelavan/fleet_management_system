from typing import Any

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

router = APIRouter()


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    response_model=dict[str, Any],
    summary="Service Health Check",
    description="Check the operational status of the API, PostgreSQL + PostGIS, and Redis services.",
)
async def health_check(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    db_status = "unavailable"
    postgis_version = None
    redis_status = "unavailable"

    # Verify Database and PostGIS
    try:
        result = await db.execute(text("SELECT postgis_version();"))
        version = result.scalar()
        db_status = "healthy"
        postgis_version = str(version)
    except Exception:
        # Fallback to basic ping if PostGIS extension is not yet loaded in this exact query
        try:
            await db.execute(text("SELECT 1;"))
            db_status = "healthy (no postgis)"
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"

    # Verify Redis
    try:
        r = aioredis.from_url(str(settings.REDIS_URL), socket_timeout=2.0)
        pong = await r.ping()
        await r.aclose()
        if pong:
            redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    overall_ok = "healthy" in db_status and redis_status == "healthy"

    return {
        "status": "ok" if overall_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "components": {
            "database": {
                "status": db_status,
                "postgis_version": postgis_version,
            },
            "redis": {
                "status": redis_status,
            },
        },
    }

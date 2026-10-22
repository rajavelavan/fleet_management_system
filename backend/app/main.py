from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings
from app.core.redis import close_redis_client, get_redis_client
from app.core.subscriber import start_pubsub_listener, stop_pubsub_listener
from app.database import engine
from app.db_init import seed_initial_users


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup actions: verify Redis client, start pubsub listener and seed initial development users
    try:
        await get_redis_client()
        await start_pubsub_listener()
    except Exception as e:
        import logging

        logging.getLogger("uvicorn.error").warning(
            f"Redis initialization warning: {e}"
        )

    try:
        await seed_initial_users()
    except Exception as e:
        import logging

        logging.getLogger("uvicorn.error").warning(
            f"Initial user seed skipped or failed: {e}"
        )
    yield
    # Shutdown actions: cleanly close Redis listener, Redis client and database connection pool
    await stop_pubsub_listener()
    await close_redis_client()
    await engine.dispose()


def create_app() -> FastAPI:
    """App Factory pattern for FastAPI application initialization."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Configure CORS middleware
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Register API v1 Router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs": f"{settings.API_V1_STR}/docs",
            "health": f"{settings.API_V1_STR}/health",
        }

    return app


app = create_app()

import asyncio
import redis.asyncio as aioredis
from app.config import settings

# Global redis client instance and the event loop it belongs to
_redis_client: aioredis.Redis | None = None
_redis_loop: asyncio.AbstractEventLoop | None = None


async def get_redis_client() -> aioredis.Redis:
    """Return a shared Redis client instance for the current running event loop."""
    global _redis_client, _redis_loop
    current_loop = asyncio.get_running_loop()
    if _redis_client is None or _redis_loop is not current_loop:
        _redis_client = aioredis.from_url(
            str(settings.REDIS_URL),
            encoding="utf-8",
            decode_responses=True,
        )
        _redis_loop = current_loop
    return _redis_client


async def close_redis_client() -> None:
    """Close the global redis client connection."""
    global _redis_client, _redis_loop
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception:
            pass
        _redis_client = None
        _redis_loop = None

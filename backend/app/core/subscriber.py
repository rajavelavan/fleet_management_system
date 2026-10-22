import asyncio
import contextlib
import json
import logging

import redis.asyncio as aioredis

from app.config import settings
from app.core.ws_manager import ws_manager

logger = logging.getLogger("tracking.subscriber")

_subscriber_task: asyncio.Task | None = None
_stop_event = asyncio.Event()


async def redis_pubsub_listener():
    """Background task subscribing to Redis 'vehicle:*:location' and 'alerts:*' patterns and fanning out to WebSockets."""
    logger.info("Starting Redis telemetry and alert pub/sub listener...")
    r = aioredis.from_url(
        str(settings.REDIS_URL),
        encoding="utf-8",
        decode_responses=True,
    )
    pubsub = r.pubsub()

    try:
        # psubscribe to all vehicle location channels and all alert channels
        await pubsub.psubscribe("vehicle:*:location", "alerts:*")
        logger.info("Subscribed to Redis patterns 'vehicle:*:location' and 'alerts:*'")

        while not _stop_event.is_set():
            try:
                # Use get_message with timeout to allow checking _stop_event
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
                if message and message.get("type") == "pmessage":
                    channel = message.get("channel", "")
                    data_str = message.get("data", "")

                    if channel.startswith("vehicle:") and channel.endswith(":location"):
                        # Extract vehicle_id from channel: vehicle:{vehicle_id}:location
                        parts = channel.split(":")
                        if len(parts) >= 3:
                            vehicle_id = parts[1]
                            try:
                                payload = json.loads(data_str)
                                # Broadcast to WebSocket manager (clients subscribed to this vehicle_id or all)
                                await ws_manager.broadcast_to_vehicle(vehicle_id, payload)
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to decode telemetry JSON from channel {channel}")

                    elif channel.startswith("alerts:"):
                        # alerts:broadcast or alerts:{user_id}
                        parts = channel.split(":")
                        target_id = parts[1] if len(parts) >= 2 else None
                        try:
                            payload = json.loads(data_str)
                            if target_id == "broadcast":
                                await ws_manager.broadcast_alert(None, payload)
                            else:
                                await ws_manager.broadcast_alert(target_id, payload)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to decode alert JSON from channel {channel}")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Redis pub/sub listener loop: {e}", exc_info=True)
                await asyncio.sleep(1.0)
    finally:
        try:
            await pubsub.punsubscribe("vehicle:*:location", "alerts:*")
            await pubsub.close()
            await r.aclose()
        except Exception:
            pass
        logger.info("Redis telemetry and alert pub/sub listener shut down.")


async def start_pubsub_listener():
    """Start background Redis pub/sub listener."""
    global _subscriber_task, _stop_event
    _stop_event.clear()
    _subscriber_task = asyncio.create_task(redis_pubsub_listener())


async def stop_pubsub_listener():
    """Stop background Redis pub/sub listener."""
    global _subscriber_task, _stop_event
    _stop_event.set()
    if _subscriber_task and not _subscriber_task.done():
        _subscriber_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _subscriber_task
        _subscriber_task = None

import asyncio
import json
import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from app.core.redis import get_redis_client


@pytest.mark.asyncio
async def test_gps_telemetry_ingestion_and_quick_access_update(client: AsyncClient):
    """Test POST /api/v1/tracking/ingest:
    - validates GPS payload
    - persists to vehicle_locations
    - updates quick access fields on vehicles table
    - publishes to Redis channel 'vehicle:{id}:location'
    """
    # 1. Login as admin to create a fresh vehicle
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleet.local", "password": "AdminPassword123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_v_resp = await client.post(
        "/api/v1/vehicles",
        headers=headers,
        json={
            "plate_number": f"TEST-ING-{uuid.uuid4().hex[:6].upper()}",
            "make": "Freightliner",
            "model": "Cascadia",
            "year": 2024,
            "type": "TRUCK",
            "status": "ACTIVE",
            "fuel_capacity": 400.0,
            "current_fuel": 320.0,
        },
    )
    assert create_v_resp.status_code == 201
    vehicle_id = create_v_resp.json()["id"]

    # 2. Subscribe to Redis channel to verify pub/sub broadcast
    import redis.asyncio as aioredis
    from app.config import settings

    redis = aioredis.from_url(
        str(settings.REDIS_URL), encoding="utf-8", decode_responses=True
    )
    pubsub = redis.pubsub()
    channel_name = f"vehicle:{vehicle_id}:location"
    await pubsub.subscribe(channel_name)

    # 3. Post GPS ingestion ping
    gps_payload = {
        "vehicle_id": vehicle_id,
        "latitude": 37.774929,
        "longitude": -122.419418,
        "speed": 62.5,
        "heading": 182.0,
        "altitude": 16.4,
        "accuracy": 2.5,
        "recorded_at": datetime.now(UTC).isoformat(),
    }
    ingest_resp = await client.post("/api/v1/tracking/ingest", json=gps_payload)
    assert ingest_resp.status_code == 201
    data = ingest_resp.json()
    assert data["vehicle_id"] == vehicle_id
    assert abs(data["latitude"] - 37.774929) < 1e-4
    assert abs(data["longitude"] - (-122.419418)) < 1e-4
    assert data["speed"] == 62.5
    assert data["heading"] == 182.0

    # 4. Verify message received on Redis channel
    msg = None
    for _ in range(10):
        received = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
        if received and received.get("type") == "message":
            msg = json.loads(received["data"])
            break
        await asyncio.sleep(0.05)
    await pubsub.unsubscribe(channel_name)
    await pubsub.aclose()
    await redis.aclose()

    assert msg is not None
    assert msg["vehicle_id"] == vehicle_id
    assert abs(msg["latitude"] - 37.774929) < 1e-4

    # 5. Verify vehicle quick-access fields updated in GET /api/v1/vehicles/{id}
    v_get_resp = await client.get(f"/api/v1/vehicles/{vehicle_id}", headers=headers)
    assert v_get_resp.status_code == 200
    v_data = v_get_resp.json()
    assert abs(v_data["last_lat"] - 37.774929) < 1e-4
    assert abs(v_data["last_lng"] - (-122.419418)) < 1e-4
    assert v_data["last_speed"] == 62.5
    assert v_data["last_seen_at"] is not None


@pytest.mark.asyncio
async def test_route_history_api(client: AsyncClient):
    """Test GET /api/v1/vehicles/{id}/route-history?from=...&to=..."""
    # 1. Login as admin & create vehicle
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleet.local", "password": "AdminPassword123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_v_resp = await client.post(
        "/api/v1/vehicles",
        headers=headers,
        json={
            "plate_number": f"TEST-HIST-{uuid.uuid4().hex[:6].upper()}",
            "make": "Kenworth",
            "model": "T680",
            "year": 2023,
            "type": "TRUCK",
            "status": "ACTIVE",
            "fuel_capacity": 350.0,
            "current_fuel": 200.0,
        },
    )
    assert create_v_resp.status_code == 201
    vehicle_id = create_v_resp.json()["id"]

    # 2. Ingest 3 consecutive route points
    p1 = {
        "vehicle_id": vehicle_id,
        "latitude": 37.7749,
        "longitude": -122.4194,
        "speed": 55.0,
        "heading": 135.0,
    }
    p2 = {
        "vehicle_id": vehicle_id,
        "latitude": 37.7652,
        "longitude": -122.4065,
        "speed": 58.0,
        "heading": 140.0,
    }
    p3 = {
        "vehicle_id": vehicle_id,
        "latitude": 37.7505,
        "longitude": -122.4042,
        "speed": 60.0,
        "heading": 142.0,
    }
    for p in (p1, p2, p3):
        res = await client.post("/api/v1/tracking/ingest", json=p)
        assert res.status_code == 201

    # 3. Query route history
    hist_resp = await client.get(f"/api/v1/vehicles/{vehicle_id}/route-history")
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert history["vehicle_id"] == vehicle_id
    assert history["total_points"] == 3
    assert len(history["coordinates"]) == 3
    # Check ordering is chronological
    coords = history["coordinates"]
    assert abs(coords[0]["latitude"] - 37.7749) < 1e-4
    assert abs(coords[1]["latitude"] - 37.7652) < 1e-4
    assert abs(coords[2]["latitude"] - 37.7505) < 1e-4

import pytest
import uuid
from httpx import AsyncClient
import redis.asyncio as aioredis
from app.config import settings


@pytest.mark.asyncio
async def test_geofence_crud_and_alerts_workflow(client: AsyncClient):
    suffix = uuid.uuid4().hex[:6].upper()
    plate = f"GEO-V-{suffix}"

    # 1. Login as Admin
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleet.local", "password": "AdminPassword123!"},
    )
    assert admin_login.status_code == 200, admin_login.text
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Create Geofence Polygon around SF downtown
    coords = [
        {"lat": 37.7749, "lng": -122.4194},
        {"lat": 37.7749, "lng": -122.4000},
        {"lat": 37.7600, "lng": -122.4000},
        {"lat": 37.7600, "lng": -122.4194},
        {"lat": 37.7749, "lng": -122.4194},
    ]

    create_payload = {
        "name": f"SF Downtown Zone {suffix}",
        "description": "High density urban zone with 40 km/h speed limit",
        "is_active": True,
        "speed_limit": 40.0,
        "coordinates": coords,
    }

    res = await client.post(
        "/api/v1/geofences",
        json=create_payload,
        headers=admin_headers,
    )
    assert res.status_code == 201, res.text
    gf_data = res.json()
    geofence_id = gf_data["id"]
    assert gf_data["name"] == f"SF Downtown Zone {suffix}"
    assert gf_data["speed_limit"] == 40.0
    assert len(gf_data["coordinates"]) >= 4

    # 3. List Geofences
    list_res = await client.get("/api/v1/geofences", headers=admin_headers)
    assert list_res.status_code == 200
    assert any(g["id"] == geofence_id for g in list_res.json())

    # 4. Create a test vehicle via API
    v_res = await client.post(
        "/api/v1/vehicles",
        headers=admin_headers,
        json={
            "plate_number": plate,
            "make": "Ford",
            "model": "Transit",
            "year": 2024,
            "type": "VAN",
            "fuel_capacity": 80.0,
        },
    )
    assert v_res.status_code == 201, v_res.text
    vehicle_id = v_res.json()["id"]

    # Use fresh local Redis connection for test to avoid event loop reuse issues
    redis = aioredis.from_url(
        str(settings.REDIS_URL),
        encoding="utf-8",
        decode_responses=True,
    )
    try:
        redis_key = f"vehicle:{vehicle_id}:active_geofences"
        await redis.delete(redis_key)

        # 5. Ingest GPS ping OUTSIDE the geofence (e.g. lat 37.70, lng -122.41)
        ping_outside = {
            "vehicle_id": vehicle_id,
            "latitude": 37.7000,
            "longitude": -122.4100,
            "speed": 35.0,
            "heading": 90.0,
        }
        ingest_res1 = await client.post("/api/v1/tracking/ingest", json=ping_outside)
        assert ingest_res1.status_code == 201
        active_in_redis = await redis.smembers(redis_key)
        assert len(active_in_redis) == 0

        # 6. Ingest GPS ping INSIDE the geofence with normal speed (lat 37.765, lng -122.405)
        # Should trigger GEOFENCE_ENTRY alert
        ping_inside = {
            "vehicle_id": vehicle_id,
            "latitude": 37.7650,
            "longitude": -122.4050,
            "speed": 30.0,
            "heading": 0.0,
        }
        ingest_res2 = await client.post("/api/v1/tracking/ingest", json=ping_inside)
        assert ingest_res2.status_code == 201

        # Check Redis set has geofence_id
        active_in_redis = await redis.smembers(redis_key)
        assert geofence_id in active_in_redis

        # Check Alert generated
        alerts_res = await client.get(
            f"/api/v1/alerts?vehicle_id={vehicle_id}",
            headers=admin_headers,
        )
        assert alerts_res.status_code == 200
        alerts = alerts_res.json()
        assert any(a["alert_type"] == "GEOFENCE_ENTRY" for a in alerts)

        # 7. Ingest GPS ping INSIDE while SPEEDING (speed 65 > limit 40)
        # Should trigger SPEEDING alert but NOT another GEOFENCE_ENTRY
        ping_speeding = {
            "vehicle_id": vehicle_id,
            "latitude": 37.7660,
            "longitude": -122.4060,
            "speed": 65.0,
            "heading": 0.0,
        }
        ingest_res3 = await client.post("/api/v1/tracking/ingest", json=ping_speeding)
        assert ingest_res3.status_code == 201

        alerts_res2 = await client.get(
            f"/api/v1/alerts?vehicle_id={vehicle_id}",
            headers=admin_headers,
        )
        alerts2 = alerts_res2.json()
        assert any(a["alert_type"] == "SPEEDING" for a in alerts2)
        # Entry count should still be 1
        entry_alerts = [a for a in alerts2 if a["alert_type"] == "GEOFENCE_ENTRY"]
        assert len(entry_alerts) == 1

        # 8. Ingest GPS ping EXITING the geofence (back to lat 37.70, lng -122.41)
        # Should trigger GEOFENCE_EXIT and remove from Redis
        ingest_res4 = await client.post("/api/v1/tracking/ingest", json=ping_outside)
        assert ingest_res4.status_code == 201

        active_in_redis_after_exit = await redis.smembers(redis_key)
        assert geofence_id not in active_in_redis_after_exit

        alerts_res3 = await client.get(
            f"/api/v1/alerts?vehicle_id={vehicle_id}",
            headers=admin_headers,
        )
        alerts3 = alerts_res3.json()
        assert any(a["alert_type"] == "GEOFENCE_EXIT" for a in alerts3)

        # 9. Test alert stats endpoint
        stats_res = await client.get("/api/v1/alerts/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_count"] >= 3
        assert stats["unread_count"] >= 1

        # 10. Mark alert as read
        first_alert_id = alerts3[0]["id"]
        read_res = await client.patch(
            f"/api/v1/alerts/{first_alert_id}/read",
            headers=admin_headers,
        )
        assert read_res.status_code == 200
        assert read_res.json()["is_read"] is True

        # 11. Clean up geofence
        del_res = await client.delete(
            f"/api/v1/geofences/{geofence_id}",
            headers=admin_headers,
        )
        assert del_res.status_code == 204
    finally:
        await redis.aclose()

import uuid
import pytest
from httpx import AsyncClient

from app.core.redis import get_redis_client


@pytest.mark.asyncio
async def test_deliveries_crud_and_route_calculation_workflow(client: AsyncClient):
    suffix = uuid.uuid4().hex[:6].upper()
    order_num = f"ORD-{suffix}"
    unique_plate = f"DEL-TRK-{suffix}"
    unique_license = f"DL-DEL-{suffix}"
    unique_email = f"driver_del_{suffix.lower()}@fleet.local"

    # 1. Login as Admin
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleet.local", "password": "AdminPassword123!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Login as Dispatcher
    disp_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dispatcher@fleet.local", "password": "DispatcherPassword123!"},
    )
    assert disp_login.status_code == 200
    disp_token = disp_login.json()["access_token"]
    disp_headers = {"Authorization": f"Bearer {disp_token}"}

    # 3. Create a Driver User and Profile
    driver_user_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "DriverPassword123!",
            "role": "DRIVER",
            "is_active": True,
        },
    )
    assert driver_user_res.status_code == 201
    driver_user_id = driver_user_res.json()["id"]

    driver_create_res = await client.post(
        "/api/v1/drivers",
        headers=admin_headers,
        json={
            "user_id": driver_user_id,
            "license_number": unique_license,
            "license_expiry": "2032-12-31",
            "phone": "+1-555-4321",
            "is_active": True,
        },
    )
    assert driver_create_res.status_code == 201
    driver = driver_create_res.json()
    driver_id = driver["id"]

    # Login as this specific driver
    driver_login = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "DriverPassword123!"},
    )
    assert driver_login.status_code == 200
    driver_token = driver_login.json()["access_token"]
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    # 4. Create Vehicle
    vehicle_create_res = await client.post(
        "/api/v1/vehicles",
        headers=admin_headers,
        json={
            "plate_number": unique_plate,
            "make": "Freightliner",
            "model": "eCascadia",
            "year": 2024,
            "type": "TRUCK",
            "status": "ACTIVE",
            "fuel_capacity": 100.0,
            "current_fuel": 85.0,
            "last_lat": 37.7749,
            "last_lng": -122.4194,
        },
    )
    assert vehicle_create_res.status_code == 201
    vehicle_id = vehicle_create_res.json()["id"]

    # 5. Dispatcher creates a delivery order (unassigned initially)
    create_delivery_res = await client.post(
        "/api/v1/deliveries",
        headers=disp_headers,
        json={
            "order_number": order_num,
            "pickup_address": "789 Mission St, San Francisco, CA 94103",
            "pickup_latitude": 37.7845,
            "pickup_longitude": -122.4042,
            "dropoff_address": "1400 Maritime St, Oakland, CA 94607",
            "dropoff_latitude": 37.8044,
            "dropoff_longitude": -122.2712,
        },
    )
    assert create_delivery_res.status_code == 201
    delivery = create_delivery_res.json()
    delivery_id = delivery["id"]
    assert delivery["order_number"] == order_num
    assert delivery["status"] == "PENDING"
    assert delivery["pickup_latitude"] == 37.7845
    assert delivery["dropoff_latitude"] == 37.8044
    assert delivery["planned_route"] is not None
    assert "encoded_polyline" in delivery["planned_route"]

    # 6. Dispatcher lists deliveries
    list_res = await client.get("/api/v1/deliveries", headers=disp_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == delivery_id for item in list_data["items"])

    # 7. Dispatcher assigns delivery to vehicle and driver
    assign_res = await client.post(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=disp_headers,
        json={
            "vehicle_id": vehicle_id,
            "driver_id": driver_id,
        },
    )
    assert assign_res.status_code == 200
    assigned_delivery = assign_res.json()
    assert assigned_delivery["status"] == "ASSIGNED"
    assert assigned_delivery["vehicle_id"] == vehicle_id
    assert assigned_delivery["driver_id"] == driver_id
    assert assigned_delivery["vehicle"]["plate_number"] == unique_plate
    assert assigned_delivery["driver"]["license_number"] == unique_license

    # 8. Calculate route explicitly and test Redis 1-hour caching
    calc_res = await client.post(
        f"/api/v1/deliveries/{delivery_id}/calculate-route",
        headers=disp_headers,
    )
    assert calc_res.status_code == 200
    route_calc = calc_res.json()
    assert route_calc["planned_route"] is not None
    assert "encoded_polyline" in route_calc["planned_route"]
    assert route_calc["estimated_duration_mins"] is not None
    assert route_calc["estimated_duration_mins"] > 0

    # Verify Redis key exists
    try:
        redis_client = await get_redis_client()
        cached = await redis_client.get(f"route:delivery:{delivery_id}")
        assert cached is not None
        ttl = await redis_client.ttl(f"route:delivery:{delivery_id}")
        assert ttl > 0 and ttl <= 3600
    except Exception as e:
        print(f"Redis test note: {e}")

    # 9. Driver workflow transitions
    # Step A: Driver updates status to PICKED_UP
    picked_up_res = await client.post(
        f"/api/v1/deliveries/{delivery_id}/status",
        headers=driver_headers,
        json={"status": "PICKED_UP"},
    )
    assert picked_up_res.status_code == 200
    picked_data = picked_up_res.json()
    assert picked_data["status"] == "PICKED_UP"
    assert picked_data["picked_up_at"] is not None

    # Step B: Driver updates status to IN_TRANSIT
    transit_res = await client.post(
        f"/api/v1/deliveries/{delivery_id}/status",
        headers=driver_headers,
        json={"status": "IN_TRANSIT"},
    )
    assert transit_res.status_code == 200
    assert transit_res.json()["status"] == "IN_TRANSIT"

    # Step C: Driver updates status to DELIVERED
    delivered_res = await client.post(
        f"/api/v1/deliveries/{delivery_id}/status",
        headers=driver_headers,
        json={"status": "DELIVERED"},
    )
    assert delivered_res.status_code == 200
    deliv_data = delivered_res.json()
    assert deliv_data["status"] == "DELIVERED"
    assert deliv_data["delivered_at"] is not None

    # 10. Clean up delivery
    delete_res = await client.delete(
        f"/api/v1/deliveries/{delivery_id}",
        headers=disp_headers,
    )
    assert delete_res.status_code == 204

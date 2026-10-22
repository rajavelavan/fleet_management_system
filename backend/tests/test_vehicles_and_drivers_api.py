import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_vehicles_crud_and_assignment_flow(client: AsyncClient):
    suffix = uuid.uuid4().hex[:6].upper()
    unique_plate = f"TEST-{suffix}"
    unique_license = f"DL-{suffix}"
    unique_email = f"driver_{suffix.lower()}@fleet.local"

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

    # 3. Create a Driver User
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

    # 4. Create Driver Profile
    driver_create_res = await client.post(
        "/api/v1/drivers",
        headers=admin_headers,
        json={
            "user_id": driver_user_id,
            "license_number": unique_license,
            "license_expiry": "2030-12-31",
            "phone": "+1-555-0199",
            "is_active": True,
        },
    )
    assert driver_create_res.status_code == 201
    driver = driver_create_res.json()
    driver_id = driver["id"]
    assert driver["license_number"] == unique_license

    # 5. Create Vehicle
    vehicle_create_res = await client.post(
        "/api/v1/vehicles",
        headers=admin_headers,
        json={
            "plate_number": unique_plate,
            "make": "Ford",
            "model": "Transit 350",
            "year": 2024,
            "type": "VAN",
            "status": "IDLE",
            "fuel_capacity": 80.0,
            "current_fuel": 65.0,
            "last_lat": 37.7749,
            "last_lng": -122.4194,
            "last_speed": 45.2,
        },
    )
    assert vehicle_create_res.status_code == 201
    vehicle = vehicle_create_res.json()
    vehicle_id = vehicle["id"]
    assert vehicle["plate_number"] == unique_plate
    assert vehicle["type"] == "VAN"
    assert vehicle["status"] == "IDLE"
    assert vehicle["last_lat"] == 37.7749
    assert vehicle["last_lng"] == -122.4194

    # 6. List Vehicles with filtering
    list_res = await client.get(
        "/api/v1/vehicles?type=VAN&status=IDLE",
        headers=disp_headers,
    )
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    assert any(v["id"] == vehicle_id for v in data["items"])

    # 7. Get Vehicle by ID
    get_res = await client.get(f"/api/v1/vehicles/{vehicle_id}", headers=disp_headers)
    assert get_res.status_code == 200
    assert get_res.json()["current_driver"] is None

    # 8. Assign Driver to Vehicle
    assign_res = await client.post(
        f"/api/v1/vehicles/{vehicle_id}/assign-driver",
        headers=disp_headers,
        json={"driver_id": driver_id},
    )
    assert assign_res.status_code == 201
    asgn = assign_res.json()
    assert asgn["vehicle_id"] == vehicle_id
    assert asgn["driver_id"] == driver_id
    assert asgn["is_active"] is True

    # 9. Verify vehicle details show current driver and status changed to ACTIVE
    get_after_assign = await client.get(f"/api/v1/vehicles/{vehicle_id}", headers=disp_headers)
    assert get_after_assign.status_code == 200
    v_data = get_after_assign.json()
    assert v_data["status"] == "ACTIVE"
    assert v_data["current_driver"] is not None
    assert v_data["current_driver"]["id"] == driver_id

    # Verify driver details show assigned vehicle
    driver_after_assign = await client.get(f"/api/v1/drivers/{driver_id}", headers=disp_headers)
    assert driver_after_assign.status_code == 200
    d_data = driver_after_assign.json()
    assert d_data["current_vehicle"] is not None
    assert d_data["current_vehicle"]["id"] == vehicle_id

    # 10. Unassign Driver
    unassign_res = await client.delete(
        f"/api/v1/vehicles/{vehicle_id}/unassign-driver",
        headers=disp_headers,
    )
    assert unassign_res.status_code == 200

    # Verify vehicle is now IDLE and current_driver is None
    get_after_unassign = await client.get(f"/api/v1/vehicles/{vehicle_id}", headers=disp_headers)
    assert get_after_unassign.status_code == 200
    assert get_after_unassign.json()["status"] == "IDLE"
    assert get_after_unassign.json()["current_driver"] is None

    # 11. Update Vehicle
    update_res = await client.put(
        f"/api/v1/vehicles/{vehicle_id}",
        headers=admin_headers,
        json={"model": "Transit 350 HD", "current_fuel": 75.5},
    )
    assert update_res.status_code == 200
    assert update_res.json()["model"] == "Transit 350 HD"
    assert update_res.json()["current_fuel"] == 75.5

    # 12. Update Driver
    driver_update_res = await client.put(
        f"/api/v1/drivers/{driver_id}",
        headers=admin_headers,
        json={"phone": "+1-555-9999"},
    )
    assert driver_update_res.status_code == 200
    assert driver_update_res.json()["phone"] == "+1-555-9999"

    # 13. Soft delete Vehicle
    del_vehicle_res = await client.delete(f"/api/v1/vehicles/{vehicle_id}", headers=admin_headers)
    assert del_vehicle_res.status_code == 204

    # Verify vehicle is no longer returned in default list or get
    get_deleted = await client.get(f"/api/v1/vehicles/{vehicle_id}", headers=disp_headers)
    assert get_deleted.status_code == 404

    # 14. Delete Driver
    del_driver_res = await client.delete(f"/api/v1/drivers/{driver_id}", headers=admin_headers)
    assert del_driver_res.status_code == 204

    get_driver_del = await client.get(f"/api/v1/drivers/{driver_id}", headers=disp_headers)
    assert get_driver_del.status_code == 404

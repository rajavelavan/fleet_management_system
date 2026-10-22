import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleet.local", "password": "AdminPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900
    assert data["user"]["email"] == "admin@fleet.local"
    assert data["user"]["role"] == "ADMIN"

    # Check HttpOnly cookie
    cookie_header = response.headers.get("set-cookie")
    assert cookie_header is not None
    assert "refresh_token=" in cookie_header
    assert "HttpOnly" in cookie_header


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleet.local", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "dispatcher@fleet.local", "password": "DispatcherPassword123!"},
    )
    token = login_res.json()["access_token"]

    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["email"] == "dispatcher@fleet.local"
    assert user["role"] == "DISPATCHER"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "Authentication credentials were not provided" in res.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_endpoint(client: AsyncClient):
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "driver@fleet.local", "password": "DriverPassword123!"},
    )
    refresh_cookie = login_res.cookies.get("refresh_token")
    assert refresh_cookie is not None

    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_cookie},
    )
    assert refresh_res.status_code == 200
    new_token_data = refresh_res.json()
    assert "access_token" in new_token_data
    assert new_token_data["user"]["email"] == "driver@fleet.local"


@pytest.mark.asyncio
async def test_refresh_missing_cookie(client: AsyncClient):
    res = await client.post("/api/v1/auth/refresh")
    assert res.status_code == 401
    assert "missing" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_logout_endpoint(client: AsyncClient):
    res = await client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    cookie_header = res.headers.get("set-cookie", "")
    assert 'refresh_token=""' in cookie_header or "Max-Age=0" in cookie_header


@pytest.mark.asyncio
async def test_role_based_access_control(client: AsyncClient):
    # Driver login
    driver_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "driver@fleet.local", "password": "DriverPassword123!"},
    )
    driver_token = driver_login.json()["access_token"]

    # Driver cannot access admin endpoint
    res = await client.get(
        "/api/v1/auth/admin-only",
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert res.status_code == 403

    # Driver cannot access dispatcher endpoint
    res = await client.get(
        "/api/v1/auth/dispatcher-only",
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    assert res.status_code == 403

    # Dispatcher login
    dispatcher_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dispatcher@fleet.local", "password": "DispatcherPassword123!"},
    )
    dispatcher_token = dispatcher_login.json()["access_token"]

    # Dispatcher cannot access admin endpoint
    res = await client.get(
        "/api/v1/auth/admin-only",
        headers={"Authorization": f"Bearer {dispatcher_token}"},
    )
    assert res.status_code == 403

    # Dispatcher CAN access dispatcher endpoint
    res = await client.get(
        "/api/v1/auth/dispatcher-only",
        headers={"Authorization": f"Bearer {dispatcher_token}"},
    )
    assert res.status_code == 200

    # Admin login
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@fleet.local", "password": "AdminPassword123!"},
    )
    admin_token = admin_login.json()["access_token"]

    # Admin CAN access admin endpoint
    res = await client.get(
        "/api/v1/auth/admin-only",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200

    # Admin CAN access dispatcher endpoint
    res = await client.get(
        "/api/v1/auth/dispatcher-only",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200

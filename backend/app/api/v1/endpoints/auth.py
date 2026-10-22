import uuid
from typing import Annotated

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin, require_dispatcher
from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest,
    LogoutResponse,
    RefreshResponse,
    TokenResponse,
)
from app.schemas.user import UserCreate, UserResponse

router = APIRouter()


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User Login",
    description="Authenticate user with email and password. Returns a short-lived access token and sets an HttpOnly refresh token cookie.",
)
async def login(
    login_data: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    # Query user by email
    stmt = select(User).where(User.email == login_data.email.strip().lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_role_str = (
        user.role.value if isinstance(user.role, UserRole) else str(user.role)
    )
    token_claims = {"email": user.email, "role": user_role_str}

    # Generate short-lived access token (15 mins) & long-lived refresh token (7 days)
    access_token = create_access_token(subject=str(user.id), claims=token_claims)
    refresh_token = create_refresh_token(subject=str(user.id), claims=token_claims)

    # Set secure HttpOnly cookie for refresh token
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=refresh_max_age,
        expires=refresh_max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh Access Token",
    description="Reads the refresh token from the HttpOnly cookie and issues a new short-lived access token.",
)
async def refresh(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> RefreshResponse:
    # Fallback to reading raw cookie from request headers if Cookie parameter missed it
    token = refresh_token or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing from cookie",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except jwt.InvalidTokenError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for refresh",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    user = await db.get(User, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_role_str = (
        user.role.value if isinstance(user.role, UserRole) else str(user.role)
    )
    token_claims = {"email": user.email, "role": user_role_str}

    # Issue new access token
    new_access_token = create_access_token(subject=str(user.id), claims=token_claims)

    return RefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="User Logout",
    description="Clears the HttpOnly refresh token cookie.",
)
async def logout(response: Response) -> LogoutResponse:
    response.delete_cookie(
        key="refresh_token",
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    return LogoutResponse(message="Successfully logged out")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User Profile",
    description="Returns current authenticated user profile based on Bearer access token.",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register / Create User",
    description="Creates a new user with hashed password and specified role.",
)
async def register(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    email_clean = user_in.email.strip().lower()
    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    hashed_pw = get_password_hash(user_in.password)
    user = User(
        email=email_clean,
        hashed_password=hashed_pw,
        role=user_in.role,
        is_active=user_in.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# Protected role verification test endpoints
@router.get(
    "/admin-only",
    summary="Admin-Only Protected Resource",
    description="Accessible exclusively by users with ADMIN role.",
)
async def admin_only_test(
    current_user: Annotated[User, Depends(require_admin)],
):
    return {
        "message": "Welcome, Administrator. Access granted.",
        "user_id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
    }


@router.get(
    "/dispatcher-only",
    summary="Dispatcher-Protected Resource",
    description="Accessible by DISPATCHER and ADMIN roles.",
)
async def dispatcher_only_test(
    current_user: Annotated[User, Depends(require_dispatcher)],
):
    return {
        "message": "Welcome, Dispatcher. Access granted.",
        "user_id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
    }

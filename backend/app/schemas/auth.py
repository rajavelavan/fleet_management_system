from pydantic import BaseModel

from app.schemas.user import EmailType, UserResponse


class LoginRequest(BaseModel):
    email: EmailType
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes
    user: UserResponse


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900
    user: UserResponse


class LogoutResponse(BaseModel):
    message: str = "Successfully logged out"

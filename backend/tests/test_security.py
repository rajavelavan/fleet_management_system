from datetime import timedelta

import jwt
import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing():
    raw_password = "SecurePassword123!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert hashed.startswith("$2b$")  # bcrypt prefix
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_password_hashing_long_password():
    # Bcrypt maximum length is 72 bytes; our wrapper handles long strings gracefully
    raw_password = "A" * 100
    hashed = get_password_hash(raw_password)
    assert verify_password(raw_password, hashed) is True
    assert verify_password("B" * 100, hashed) is False


def test_access_token_creation_and_decoding():
    subject = "user-12345"
    claims = {"email": "test@fleet.local", "role": "ADMIN"}
    token = create_access_token(subject=subject, claims=claims)

    decoded = decode_token(token)
    assert decoded["sub"] == subject
    assert decoded["email"] == "test@fleet.local"
    assert decoded["role"] == "ADMIN"
    assert decoded["type"] == "access"
    assert "exp" in decoded
    assert "iat" in decoded


def test_refresh_token_creation_and_decoding():
    subject = "user-67890"
    claims = {"email": "driver@fleet.local", "role": "DRIVER"}
    token = create_refresh_token(subject=subject, claims=claims)

    decoded = decode_token(token)
    assert decoded["sub"] == subject
    assert decoded["role"] == "DRIVER"
    assert decoded["type"] == "refresh"


def test_expired_token_handling():
    subject = "user-expired"
    token = create_access_token(
        subject=subject,
        claims={"email": "expired@fleet.local"},
        expires_delta=timedelta(seconds=-10),  # expired 10s ago
    )

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(token)


def test_invalid_signature_token():
    valid_token = create_access_token("user-test")
    # Tamper with token
    tampered = valid_token[:-4] + "xxxx"

    with pytest.raises(jwt.InvalidTokenError):
        decode_token(tampered)

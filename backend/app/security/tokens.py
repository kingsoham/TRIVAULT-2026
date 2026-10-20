from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt
from app.config import get_settings


def create_access_token(
    subject: str | int,
    additional_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Generate an expiring JSON Web Token signed with HMAC-SHA256.
    The subject contains the unique user identifier.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
    }

    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token's signature, format, and expiration.
    Raises jwt.PyJWTError subclasses on invalid, expired, or tampered tokens.
    """
    settings = get_settings()
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM]
    )
    return payload

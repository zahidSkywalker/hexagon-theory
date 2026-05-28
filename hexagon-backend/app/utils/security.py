"""Security utilities — password hashing and JWT token management."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from bson import ObjectId
from jose import jwt
from passlib.context import CryptContext

from app.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return ``True`` when *plain* matches the bcrypt *hashed* value."""
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
def create_access_token(data: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token.

    Parameters
    ----------
    data:
        Payload dict — typically ``{"sub": "<user_id>"}``.
    expires_delta:
        Custom lifetime.  Falls back to ``settings.access_token_expire_minutes``.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)

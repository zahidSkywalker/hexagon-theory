"""Authentication dependencies for FastAPI route handlers."""

from __future__ import annotations

from typing import Optional

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings
from app.database import get_database
from app.utils.security import ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Decode the JWT access token and return the user document.

    Raises 401 if the token is invalid, expired, or the user no longer exists.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user_id = ObjectId(user_id_str)
    except Exception:
        raise credentials_exception

    db = get_database()
    user = await db.users.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user


async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Alias that guarantees the user is active (already checked above)."""
    return current_user


async def require_role(*roles: str):
    """Dependency factory — returns a dependency that checks role membership."""
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return _check


def serialize_user(user: dict) -> dict:
    """Convert a user MongoDB document into a JSON-safe dict."""
    if user is None:
        return {}
    result = dict(user)
    result["id"] = str(result.pop("_id"))
    return result

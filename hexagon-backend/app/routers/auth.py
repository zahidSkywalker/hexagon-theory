"""Authentication router — register, login, and current-user endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import get_database
from app.dependencies import get_current_user, serialize_user
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter()


def _user_to_response(user: Dict) -> UserResponse:
    """Convert a raw MongoDB user doc to a ``UserResponse``."""
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        full_name=user.get("full_name"),
        bio=user.get("bio"),
        avatar_url=user.get("avatar_url"),
        role=user.get("role", "user"),
        email_verified=user.get("email_verified", False),
        is_active=user.get("is_active", True),
        created_at=user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"]),
        updated_at=user["updated_at"].isoformat() if isinstance(user["updated_at"], datetime) else str(user["updated_at"]),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """Create a new user account and return a JWT access token."""
    db = get_database()

    # Check for existing username
    existing = await db.users.find_one({"username": payload.username})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already registered.",
        )

    # Check for existing email
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": payload.email.lower(),
        "username": payload.username,
        "password_hash": hash_password(payload.password),
        "full_name": payload.full_name,
        "bio": None,
        "avatar_url": None,
        "role": "user",
        "email_verified": False,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError as exc:
        # Race condition — another request created the same user
        field = "email" if "email" in str(exc.details) else "username"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{field.capitalize()} already registered.",
        ) from exc

    # Create JWT
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    """Authenticate with credentials and return a JWT access token."""
    db = get_database()

    user = await db.users.find_one({"username": payload.username})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    access_token = create_access_token(data={"sub": str(user["_id"])})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return _user_to_response(current_user)

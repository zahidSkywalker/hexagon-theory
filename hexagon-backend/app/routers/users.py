"""Users router — public profiles and self-profile updates."""

from __future__ import annotations

from datetime import datetime
from typing import Dict

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_database
from app.dependencies import get_current_user
from app.schemas.user import UserProfileResponse, UserUpdateRequest

router = APIRouter()


def _doc_to_profile(user: Dict) -> UserProfileResponse:
    """Convert a user MongoDB document to a ``UserProfileResponse``."""
    return UserProfileResponse(
        id=str(user["_id"]),
        username=user["username"],
        full_name=user.get("full_name"),
        bio=user.get("bio"),
        avatar_url=user.get("avatar_url"),
        role=user.get("role", "user"),
        created_at=user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"]),
    )


@router.get("/{username}", response_model=UserProfileResponse)
async def get_user_profile(username: str):
    """Return a public user profile by username."""
    db = get_database()
    user = await db.users.find_one({"username": username}, {"password_hash": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return _doc_to_profile(user)


@router.put("/me", response_model=UserProfileResponse)
async def update_own_profile(
    payload: UserUpdateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Update the authenticated user's own profile."""
    db = get_database()
    user_id = current_user["_id"]

    # Build update dict — only include fields that were explicitly provided
    update_fields: Dict = {"updated_at": datetime.now()}
    if payload.full_name is not None:
        update_fields["full_name"] = payload.full_name
    if payload.bio is not None:
        update_fields["bio"] = payload.bio
    if payload.avatar_url is not None:
        update_fields["avatar_url"] = payload.avatar_url

    await db.users.update_one({"_id": user_id}, {"$set": update_fields})

    updated = await db.users.find_one({"_id": user_id}, {"password_hash": 0})
    return _doc_to_profile(updated)

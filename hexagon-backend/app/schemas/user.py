"""Request / response schemas for user profile endpoints."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class UserUpdateRequest(BaseModel):
    """Fields a user may update on their own profile."""

    full_name: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=500)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class UserProfileResponse(BaseModel):
    """Public profile returned for any user."""

    id: str
    username: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    created_at: str

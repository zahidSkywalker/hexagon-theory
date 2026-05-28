"""Request / response schemas for authentication endpoints."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    """Payload for user login."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """JWT access token returned after login or registration."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Shared user representation returned by auth and user endpoints."""

    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    email_verified: bool
    is_active: bool
    created_at: str
    updated_at: str

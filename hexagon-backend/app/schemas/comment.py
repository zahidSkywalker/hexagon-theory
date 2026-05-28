"""Request / response schemas for comment endpoints."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class CommentCreateRequest(BaseModel):
    """Payload for creating a comment or reply."""

    content: str = Field(min_length=1, max_length=5000)
    parent_id: Optional[str] = Field(default=None, description="Parent comment ID for replies")
    is_suggestion: bool = False


class CommentUpdateRequest(BaseModel):
    """Payload for editing a comment."""

    content: str = Field(min_length=1, max_length=5000)


class CommentAuthorResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class CommentResponse(BaseModel):
    """A single comment with optional nested replies."""

    id: str
    user_id: str
    idea_id: str
    parent_id: Optional[str] = None
    content: str
    is_suggestion: bool
    is_edited: bool
    created_at: str
    updated_at: str
    author: Optional[CommentAuthorResponse] = None
    replies: List["CommentResponse"] = Field(default_factory=list)


class CommentListResponse(BaseModel):
    """Paginated list of top-level comments (each may have nested replies)."""

    items: List[CommentResponse]
    total: int

"""Request / response schemas for idea endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Embedded sub-schemas
# ---------------------------------------------------------------------------
class FileInfoResponse(BaseModel):
    file_name: str
    file_type: str
    file_path: str
    file_size: int
    uploaded_at: str


class VersionEntryResponse(BaseModel):
    version: int
    title: str
    description: str
    problem_statement: str
    changed_by: str
    change_summary: str
    created_at: str


# ---------------------------------------------------------------------------
# Create / Update
# ---------------------------------------------------------------------------
class IdeaCreateRequest(BaseModel):
    """Payload for creating a new idea."""

    title: str = Field(min_length=3, max_length=200)
    problem_statement: str = Field(min_length=10, max_length=5000)
    description: str = Field(min_length=10, max_length=20000)
    category: str = Field(default="Tech")
    target_region: Optional[str] = Field(default=None, max_length=200)
    target_community: Optional[str] = Field(default=None, max_length=200)
    expected_impact: Optional[str] = Field(default=None, max_length=5000)
    cost_benefit_summary: Optional[str] = Field(default=None, max_length=5000)
    video_url: Optional[str] = Field(default=None, max_length=500)
    status: str = Field(default="draft")


class IdeaUpdateRequest(BaseModel):
    """Payload for updating an existing idea."""

    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    problem_statement: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    description: Optional[str] = Field(default=None, min_length=10, max_length=20000)
    category: Optional[str] = Field(default=None)
    target_region: Optional[str] = Field(default=None, max_length=200)
    target_community: Optional[str] = Field(default=None, max_length=200)
    expected_impact: Optional[str] = Field(default=None, max_length=5000)
    cost_benefit_summary: Optional[str] = Field(default=None, max_length=5000)
    video_url: Optional[str] = Field(default=None, max_length=500)
    status: Optional[str] = Field(default=None)
    change_summary: Optional[str] = Field(default=None, max_length=1000)


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------
class IdeaAuthorResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class IdeaResponse(BaseModel):
    """Idea representation returned by list / detail endpoints."""

    id: str
    user_id: str
    author: Optional[IdeaAuthorResponse] = None
    title: str
    slug: str
    problem_statement: str
    description: str
    category: str
    target_region: Optional[str] = None
    target_community: Optional[str] = None
    expected_impact: Optional[str] = None
    cost_benefit_summary: Optional[str] = None
    status: str
    video_url: Optional[str] = None
    version: int
    view_count: int
    files: List[FileInfoResponse] = Field(default_factory=list)
    created_at: str
    updated_at: str
    published_at: Optional[str] = None


class IdeaDetailResponse(IdeaResponse):
    """Extended idea response including version history."""

    versions: List[VersionEntryResponse] = Field(default_factory=list)


class IdeaListResponse(BaseModel):
    """Paginated list of ideas."""

    items: List[IdeaResponse]
    total: int
    limit: int
    offset: int


class IdeaVersionResponse(BaseModel):
    """Version history for a single idea."""

    idea_id: str
    slug: str
    versions: List[VersionEntryResponse]

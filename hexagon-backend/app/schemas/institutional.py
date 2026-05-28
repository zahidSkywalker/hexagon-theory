"""Request / response schemas for institutional interest endpoints."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class InstitutionalInterestCreateRequest(BaseModel):
    """Payload for registering institutional interest in an idea."""

    status: str = Field(default="interested", pattern=r"^(interested|under_review|implemented)$")
    notes: Optional[str] = Field(default=None, max_length=2000)


class InstitutionalInterestUpdateRequest(BaseModel):
    """Payload for updating an existing institutional interest record."""

    status: Optional[str] = Field(default=None, pattern=r"^(interested|under_review|implemented)$")
    notes: Optional[str] = Field(default=None, max_length=2000)


class InstitutionalInterestResponse(BaseModel):
    """A single institutional interest record."""

    id: str
    institution_id: str
    idea_id: str
    status: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    institution_name: Optional[str] = None


class InstitutionalInterestListResponse(BaseModel):
    """List of institutional interests for a given idea."""

    items: List[InstitutionalInterestResponse]
    total: int


class DashboardStatsResponse(BaseModel):
    """Aggregated dashboard statistics for an institutional user."""

    total_interests: int
    interested: int
    under_review: int
    implemented: int
    recent_interests: List[InstitutionalInterestResponse]

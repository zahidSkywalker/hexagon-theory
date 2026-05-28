"""Request / response schemas for vote endpoints."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class VoteCreateRequest(BaseModel):
    """Payload for casting a vote."""

    vote_type: str = Field(pattern=r"^(upvote|downvote)$")


class VoteSummaryResponse(BaseModel):
    """Aggregated vote counts for an idea plus the current user's vote."""

    idea_id: str
    upvotes: int
    downvotes: int
    score: int
    current_user_vote: Optional[str] = None
